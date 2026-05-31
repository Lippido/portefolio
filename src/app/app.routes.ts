import { Routes } from '@angular/router';
import { Presentation } from './presentation/presentation';
import { Projects } from './projects/projects';
import { ProjectDetail } from './projects/project-detail';
import { Skills } from './skills/skills';

export const routes: Routes = [
  { path: '', redirectTo: '/presentation', pathMatch: 'full' },
  { path: 'home', redirectTo: '/presentation', pathMatch: 'full' },
  { path: 'presentation', component: Presentation },
  { path: 'projects', component: Projects },
  { path: 'projects/:id', component: ProjectDetail },
  { path: 'skills', component: Skills },
  { path: '**', redirectTo: '/presentation' }
];
