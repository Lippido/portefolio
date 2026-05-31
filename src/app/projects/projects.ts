import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProjectService, Project } from '../services/project.service';
import { Observable, catchError, startWith, map } from 'rxjs';
import { of } from 'rxjs';

interface ProjectState {
  loading: boolean;
  error: string | null;
  projects: Project[];
}

@Component({
  selector: 'app-projects',
  imports: [CommonModule, RouterLink],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
})
export class Projects implements OnInit {
  state$: Observable<ProjectState> | null = null;

  constructor(private projectService: ProjectService) { }

  ngOnInit() {
    this.state$ = this.projectService.getAllProjects().pipe(
      map(projects => ({ loading: false, error: null, projects })),
      catchError(err => {
        console.error('Error loading projects:', err);
        return of({ loading: false, error: 'Erreur lors du chargement des projets', projects: [] });
      }),
      startWith({ loading: true, error: null, projects: [] })
    );
  }
}



