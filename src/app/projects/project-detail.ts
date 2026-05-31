import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProjectService, Project } from '../services/project.service';
import { Observable, catchError, map, startWith, switchMap } from 'rxjs';
import { of } from 'rxjs';

interface ProjectState {
  loading: boolean;
  error: string | null;
  project: Project | null;
}

@Component({
  selector: 'app-project-detail',
  imports: [CommonModule, RouterLink],
  templateUrl: './project-detail.html',
  styleUrl: './project-detail.scss',
})
export class ProjectDetail implements OnInit {
  state$: Observable<ProjectState> | null = null;

  constructor(
    private route: ActivatedRoute,
    private projectService: ProjectService
  ) { }

  ngOnInit() {
    this.state$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (!id) {
          return of({ loading: false, error: 'ID invalide', project: null });
        }
        return this.projectService.getProjectById(+id).pipe(
          map(project => ({ loading: false, error: null, project })),
          catchError(err => {
            console.error('Error loading project:', err);
            return of({ loading: false, error: 'Projet non trouvé', project: null });
          }),
          startWith({ loading: true, error: null, project: null })
        );
      })
    );
  }
}

