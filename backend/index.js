const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

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

function groupProjectsWithTechnologies(rows) {
  const projectsById = new Map();

  rows.forEach(row => {
    const existingProject = projectsById.get(row.id);
    if (!existingProject) {
      projectsById.set(row.id, {
        id: row.id,
        title: row.title,
        description: row.description,
        gitLink: row.gitLink,
        screenshotLink: row.screenshotLink,
        technologies: [],
        createdAt: row.createdAt
      });
    }

    if (row.technologyName) {
      const project = projectsById.get(row.id);
      project.technologies.push({
        id: row.technologyId,
        name: row.technologyName,
        sortOrder: row.technologySortOrder
      });
    }
  });

  return Array.from(projectsById.values()).map(project => ({
    ...project,
    technologies: project.technologies
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(technology => technology.name)
  }));
}

function syncProjectTechnologies(projectId, technologies, callback) {
  const uniqueTechnologies = Array.from(new Set(Array.isArray(technologies) ? technologies : []));

  db.run('DELETE FROM project_technologies WHERE projectId = ?', [projectId], (deleteErr) => {
    if (deleteErr) {
      callback(deleteErr);
      return;
    }

    if (uniqueTechnologies.length === 0) {
      callback(null);
      return;
    }

    const insertTechnology = db.prepare('INSERT OR IGNORE INTO technologies (name) VALUES (?)');

    uniqueTechnologies.forEach(technologyName => {
      insertTechnology.run([technologyName]);
    });

    insertTechnology.finalize(() => {
      db.all(
        `SELECT id, name FROM technologies WHERE name IN (${uniqueTechnologies.map(() => '?').join(', ')})`,
        uniqueTechnologies,
        (selectErr, technologyRows) => {
          if (selectErr) {
            callback(selectErr);
            return;
          }

          const technologyIdByName = new Map(technologyRows.map(technology => [technology.name, technology.id]));
          const insertRelation = db.prepare(`
            INSERT OR REPLACE INTO project_technologies (projectId, technologyId, sortOrder)
            VALUES (?, ?, ?)
          `);

          uniqueTechnologies.forEach((technologyName, index) => {
            const technologyId = technologyIdByName.get(technologyName);
            if (!technologyId) {
              return;
            }

            insertRelation.run([projectId, technologyId, index + 1]);
          });

          insertRelation.finalize(() => callback(null));
        }
      );
    });
  });
}

app.get('/api/projects', (req, res) => {
  db.all(
    `SELECT
      p.id,
      p.title,
      p.description,
      p.gitLink,
      p.screenshotLink,
      p.createdAt,
      t.id AS technologyId,
      t.name AS technologyName,
      pt.sortOrder AS technologySortOrder
    FROM projects p
    LEFT JOIN project_technologies pt ON pt.projectId = p.id
    LEFT JOIN technologies t ON t.id = pt.technologyId
    ORDER BY p.id DESC, pt.sortOrder ASC, t.name ASC`,
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      res.json(groupProjectsWithTechnologies(rows));
    }
  );
});

app.get('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  db.all(
    `SELECT
      p.id,
      p.title,
      p.description,
      p.gitLink,
      p.screenshotLink,
      p.createdAt,
      t.id AS technologyId,
      t.name AS technologyName,
      pt.sortOrder AS technologySortOrder
    FROM projects p
    LEFT JOIN project_technologies pt ON pt.projectId = p.id
    LEFT JOIN technologies t ON t.id = pt.technologyId
    WHERE p.id = ?
    ORDER BY pt.sortOrder ASC, t.name ASC`,
    [id],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (rows.length === 0) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      res.json(groupProjectsWithTechnologies(rows)[0]);
    }
  );
});

app.get('/api/skills', (req, res) => {
  db.all(
    `SELECT
      skills.id,
      skill_categories.name AS category,
      skills.name,
      skills.sortOrder
    FROM skills
    INNER JOIN skill_categories ON skills.categoryId = skill_categories.id
    ORDER BY skill_categories.sortOrder ASC, skills.sortOrder ASC, skills.id ASC`,
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      res.json(rows);
    }
  );
});

app.post('/api/projects', (req, res) => {
  const { title, description, gitLink, screenshotLink, technologies } = req.body;
  db.run(
    'INSERT INTO projects (title, description, gitLink, screenshotLink, technologies) VALUES (?, ?, ?, ?, NULL)',
    [title, description, gitLink, screenshotLink],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      syncProjectTechnologies(this.lastID, technologies, syncErr => {
        if (syncErr) {
          res.status(500).json({ error: syncErr.message });
          return;
        }

        res.json({ id: this.lastID, title, description, gitLink, screenshotLink, technologies: Array.isArray(technologies) ? technologies : [] });
      });
    }
  );
});

app.put('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, gitLink, screenshotLink, technologies } = req.body;
  db.run(
    'UPDATE projects SET title = ?, description = ?, gitLink = ?, screenshotLink = ? WHERE id = ?',
    [title, description, gitLink, screenshotLink, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      syncProjectTechnologies(Number(id), technologies, syncErr => {
        if (syncErr) {
          res.status(500).json({ error: syncErr.message });
          return;
        }

        res.json({ changes: this.changes, id, title, description, gitLink, screenshotLink, technologies: Array.isArray(technologies) ? technologies : [] });
      });
    }
  );
});

app.delete('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM projects WHERE id = ?', [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
