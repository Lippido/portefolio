const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'portfolio.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      gitLink TEXT,
      screenshotLink TEXT,
      technologies TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('Projects table ready');
      ensureProjectsTechnologiesColumn(() => {
        migrateProjectTechnologiesSchema(() => {
          seedDatabase();
        });
      });
    }
  });

  migrateSkillsSchema(() => {
    seedSkills();
  });
}

function ensureProjectsTechnologiesColumn(callback) {
  db.all(`PRAGMA table_info(projects)`, (err, columns) => {
    if (err) {
      console.error('Error inspecting projects table:', err);
      callback();
      return;
    }

    const hasTechnologiesColumn = columns.some(column => column.name === 'technologies');
    if (hasTechnologiesColumn) {
      callback();
      return;
    }

    db.run(`ALTER TABLE projects ADD COLUMN technologies TEXT`, (alterErr) => {
      if (alterErr) {
        console.error('Error adding technologies column:', alterErr);
      } else {
        console.log('Technologies column added to projects table');
      }

      callback();
    });
  });
}

function migrateProjectTechnologiesSchema(callback) {
  db.get(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'technologies'`, (err, technologiesRow) => {
    if (err) {
      console.error('Error checking project technologies schema:', err);
      callback();
      return;
    }

    db.get(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'project_technologies'`, (relationErr, relationRow) => {
      if (relationErr) {
        console.error('Error checking project technologies relation schema:', relationErr);
        callback();
        return;
      }

      if (technologiesRow && relationRow) {
        console.log('Project technologies tables ready');
        callback();
        return;
      }

      db.serialize(() => {
        db.run(`
          CREATE TABLE IF NOT EXISTS technologies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
          )
        `, (createTechnologiesErr) => {
          if (createTechnologiesErr) {
            console.error('Error creating technologies table:', createTechnologiesErr);
            callback();
            return;
          }

          db.run(`
            CREATE TABLE IF NOT EXISTS project_technologies (
              projectId INTEGER NOT NULL,
              technologyId INTEGER NOT NULL,
              sortOrder INTEGER NOT NULL DEFAULT 0,
              PRIMARY KEY (projectId, technologyId),
              FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
              FOREIGN KEY (technologyId) REFERENCES technologies(id) ON DELETE CASCADE
            )
          `, (createRelationErr) => {
            if (createRelationErr) {
              console.error('Error creating project technologies relation table:', createRelationErr);
              callback();
              return;
            }

            db.all(`SELECT id, technologies FROM projects`, (projectsErr, projectsRows) => {
              if (projectsErr) {
                console.error('Error reading projects for technologies migration:', projectsErr);
                callback();
                return;
              }

              const technologyIds = new Map();
              const insertTechnology = db.prepare(`INSERT OR IGNORE INTO technologies (name) VALUES (?)`);
              const insertRelation = db.prepare(`INSERT OR REPLACE INTO project_technologies (projectId, technologyId, sortOrder) VALUES (?, ?, ?)`);

              const collectRelations = () => {
                db.all(`SELECT id, name FROM technologies`, (technologiesErr, technologyRows) => {
                  if (technologiesErr) {
                    console.error('Error loading technologies for migration:', technologiesErr);
                    callback();
                    return;
                  }

                  technologyRows.forEach(technology => {
                    technologyIds.set(technology.name, technology.id);
                  });

                  projectsRows.forEach(project => {
                    const projectTechnologies = parseTechnologies(project.technologies);
                    projectTechnologies.forEach((technologyName, index) => {
                      const technologyId = technologyIds.get(technologyName);
                      if (!technologyId) {
                        return;
                      }

                      insertRelation.run([project.id, technologyId, index + 1]);
                    });
                  });

                  insertRelation.finalize(() => {
                    console.log('Project technologies migration complete');
                    callback();
                  });
                });
              };

              if (projectsRows.length === 0) {
                insertTechnology.finalize(() => {
                  collectRelations();
                });
                return;
              }

              const uniqueTechnologies = new Set();
              projectsRows.forEach(project => {
                parseTechnologies(project.technologies).forEach(technologyName => {
                  uniqueTechnologies.add(technologyName);
                });
              });

              uniqueTechnologies.forEach(technologyName => {
                insertTechnology.run([technologyName]);
              });

              insertTechnology.finalize(() => {
                collectRelations();
              });
            });
          });
        });
      });
    });
  });
}

function parseTechnologies(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function serializeProject(row) {
  if (!row) {
    return row;
  }

  return {
    ...row,
    technologies: parseTechnologies(row.technologies)
  };
}

function projectTechnologiesByTitle(title) {
  const technologiesMap = {
    'Application Web de Gestion': ['Angular', 'TypeScript', 'Node.js', 'Express', 'SQLite'],
    'Jeu Vidéo 2D': ['JavaScript', 'Canvas', 'Game Loop', 'Animation', 'UI Design'],
    'Site Vitrine E-commerce': ['HTML5', 'CSS3', 'JavaScript', 'Responsive Design', 'UX']
  };

  return technologiesMap[title] || [];
}

function migrateSkillsSchema(callback) {
  db.get(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'skill_categories'`, (err, categoryRow) => {
    if (err) {
      console.error('Error checking skills schema:', err);
      callback();
      return;
    }

    db.all(`PRAGMA table_info(skills)`, (tableInfoErr, columns) => {
      if (tableInfoErr) {
        console.error('Error inspecting skills table:', tableInfoErr);
        callback();
        return;
      }

      const hasNormalizedSkillsTable = Boolean(categoryRow) && columns.some(column => column.name === 'categoryId');
      if (hasNormalizedSkillsTable) {
        console.log('Skills tables ready');
        callback();
        return;
      }

      db.all(`SELECT id, category, name, sortOrder FROM skills ORDER BY id ASC`, (selectErr, legacySkills) => {
        if (selectErr) {
          console.error('Error reading legacy skills table:', selectErr);
          legacySkills = [];
        }

        db.serialize(() => {
          db.run(`ALTER TABLE skills RENAME TO skills_legacy`, (renameErr) => {
            if (renameErr && !String(renameErr.message || '').includes('no such table')) {
              console.error('Error renaming legacy skills table:', renameErr);
            }
          });

          db.run(`
          CREATE TABLE IF NOT EXISTS skill_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            sortOrder INTEGER NOT NULL DEFAULT 0
          )
        `, (createCategoriesErr) => {
            if (createCategoriesErr) {
              console.error('Error creating skill categories table:', createCategoriesErr);
              callback();
              return;
            }

            db.run(`
            CREATE TABLE IF NOT EXISTS skills (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              categoryId INTEGER NOT NULL,
              name TEXT NOT NULL,
              sortOrder INTEGER NOT NULL DEFAULT 0,
              FOREIGN KEY (categoryId) REFERENCES skill_categories(id)
            )
          `, (createSkillsErr) => {
              if (createSkillsErr) {
                console.error('Error creating normalized skills table:', createSkillsErr);
                callback();
                return;
              }

              const sourceSkills = legacySkills.length > 0 ? legacySkills : [
                { category: 'Langages de Programmation', name: 'Java / C#', sortOrder: 1 },
                { category: 'Langages de Programmation', name: 'JavaScript / TypeScript', sortOrder: 2 },
                { category: 'Langages de Programmation', name: 'Python', sortOrder: 3 },
                { category: 'Langages de Programmation', name: 'HTML5 / CSS3', sortOrder: 4 },
                { category: 'Frameworks & Bibliothèques', name: 'Angular / React', sortOrder: 1 },
                { category: 'Frameworks & Bibliothèques', name: 'Spring Boot', sortOrder: 2 },
                { category: 'Frameworks & Bibliothèques', name: 'Node.js / Express', sortOrder: 3 },
                { category: 'Bases de données & Outils', name: 'MySQL / PostgreSQL', sortOrder: 1 },
                { category: 'Bases de données & Outils', name: 'MongoDB', sortOrder: 2 },
                { category: 'Bases de données & Outils', name: 'Git / GitHub / GitLab', sortOrder: 3 },
                { category: 'Bases de données & Outils', name: 'Docker', sortOrder: 4 }
              ];

              const categoryOrder = [];
              const categorySet = new Set();

              sourceSkills.forEach(skill => {
                if (!categorySet.has(skill.category)) {
                  categorySet.add(skill.category);
                  categoryOrder.push(skill.category);
                }
              });

              const categoryIdByName = new Map();
              const insertCategory = db.prepare(`
              INSERT INTO skill_categories (name, sortOrder)
              VALUES (?, ?)
            `);

              categoryOrder.forEach((categoryName, index) => {
                insertCategory.run([categoryName, index + 1], function (categoryErr) {
                  if (categoryErr) {
                    console.error('Error seeding skill category:', categoryErr);
                    return;
                  }

                  categoryIdByName.set(categoryName, this.lastID);
                });
              });

              insertCategory.finalize(() => {
                const insertSkill = db.prepare(`
                INSERT INTO skills (categoryId, name, sortOrder)
                VALUES (?, ?, ?)
              `);

                sourceSkills.forEach(skill => {
                  const categoryId = categoryIdByName.get(skill.category);
                  if (!categoryId) {
                    return;
                  }

                  insertSkill.run([categoryId, skill.name, skill.sortOrder]);
                });

                insertSkill.finalize(() => {
                  db.run(`DROP TABLE IF EXISTS skills_legacy`, (dropErr) => {
                    if (dropErr) {
                      console.error('Error dropping legacy skills table:', dropErr);
                    } else {
                      console.log('Legacy skills table removed');
                    }

                    console.log('Skills tables ready');
                    callback();
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

function seedSkills() {
  const checkCount = `SELECT COUNT(*) as count FROM skills`;

  db.get(checkCount, (err, row) => {
    if (err) {
      console.error('Error checking skills database:', err);
      return;
    }

    if (row.count > 0) {
      return;
    }

    const sampleSkillCategories = [
      { name: 'Langages de Programmation', sortOrder: 1 },
      { name: 'Frameworks & Bibliothèques', sortOrder: 2 },
      { name: 'Bases de données & Outils', sortOrder: 3 }
    ];

    const sampleSkills = [
      { category: 'Langages de Programmation', name: 'Java / C#', sortOrder: 1 },
      { category: 'Langages de Programmation', name: 'JavaScript / TypeScript', sortOrder: 2 },
      { category: 'Langages de Programmation', name: 'Python', sortOrder: 3 },
      { category: 'Langages de Programmation', name: 'HTML5 / CSS3', sortOrder: 4 },
      { category: 'Frameworks & Bibliothèques', name: 'Angular / React', sortOrder: 1 },
      { category: 'Frameworks & Bibliothèques', name: 'Spring Boot', sortOrder: 2 },
      { category: 'Frameworks & Bibliothèques', name: 'Node.js / Express', sortOrder: 3 },
      { category: 'Bases de données & Outils', name: 'MySQL / PostgreSQL', sortOrder: 1 },
      { category: 'Bases de données & Outils', name: 'MongoDB', sortOrder: 2 },
      { category: 'Bases de données & Outils', name: 'Git / GitHub / GitLab', sortOrder: 3 },
      { category: 'Bases de données & Outils', name: 'Docker', sortOrder: 4 }
    ];

    const insertCategory = db.prepare(`
      INSERT INTO skill_categories (name, sortOrder)
      VALUES (?, ?)
    `);

    sampleSkillCategories.forEach(category => {
      insertCategory.run([category.name, category.sortOrder]);
    });

    insertCategory.finalize(() => {
      db.all(`SELECT id, name FROM skill_categories`, (categoryErr, categories) => {
        if (categoryErr) {
          console.error('Error loading skill categories:', categoryErr);
          return;
        }

        const categoryIdByName = new Map(categories.map(category => [category.name, category.id]));
        const stmt = db.prepare(`
          INSERT INTO skills (categoryId, name, sortOrder)
          VALUES (?, ?, ?)
        `);

        sampleSkills.forEach(skill => {
          const categoryId = categoryIdByName.get(skill.category);
          if (!categoryId) {
            return;
          }

          stmt.run([categoryId, skill.name, skill.sortOrder]);
        });

        stmt.finalize(() => {
          console.log('Database seeded with sample skills');
        });
      });
    });
  });
}

function seedDatabase() {
  const checkCount = `SELECT COUNT(*) as count FROM projects`;

  db.get(checkCount, (err, row) => {
    if (err) {
      console.error('Error checking database:', err);
      return;
    }

    if (row.count === 0) {
      const sampleProjects = [
        {
          title: 'Jeu Sérieux de Serre Connectée',
          description: 'Développement d\'un jeu sérieux en Godot utilisant C#. Création et modélisation des environnements 3D avec Blender en utilisant les Geometry Nodes pour optimiser les assets.',
          gitLink: null,
          screenshotLink: 'https://via.placeholder.com/400x300?text=Jeu+Serre'
        },
        {
          title: 'Refonte du Site BUT Project',
          description: 'Refonte d\'une plateforme de gestion de projets étudiants. Migration d\'une application Django vers une architecture Django REST API pour améliorer la scalabilité et la maintenabilité.',
          gitLink: 'https://github.com/lippido/but-project',
          screenshotLink: 'https://via.placeholder.com/400x300?text=BUT+Project'
        },
        {
          title: 'Site de Paris Sportif et Jeux en Ligne',
          description: 'Développement d\'une plateforme de paris sportif et jeux en ligne utilisant le framework Symfony. Gestion des utilisateurs, des paris et intégration avec des APIs de sports.',
          gitLink: 'https://github.com/lippido/sports-betting',
          screenshotLink: 'https://via.placeholder.com/400x300?text=Paris+Sportif'
        }
      ];

      const stmt = db.prepare(`
        INSERT INTO projects (title, description, gitLink, screenshotLink, technologies)
        VALUES (?, ?, ?, ?, NULL)
      `);

      sampleProjects.forEach(project => {
        stmt.run([
          project.title,
          project.description,
          project.gitLink,
          project.screenshotLink
        ]);
      });

      stmt.finalize(() => {
        console.log('Database seeded with sample projects');
      });
      return;
    }
  });
}

module.exports = db;
