import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

export interface Project {
  id: number;
  title: string;
  description: string;
  gitLink: string;
  screenshotLink: string;
  technologies?: string[];
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = 'http://localhost:3000/api/projects';
  private staticUrl = 'data/projects.json';
  private useLocalApi = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

  constructor(private http: HttpClient) { }

  getAllProjects(): Observable<Project[]> {
    const sourceUrl = this.useLocalApi ? this.apiUrl : this.staticUrl;

    console.log('Fetching projects from:', sourceUrl);
    return this.http.get<Project[]>(sourceUrl).pipe(
      tap(data => console.log('Projects loaded:', data)),
      catchError(this.handleError)
    );
  }

  getProjectById(id: number): Observable<Project> {
    console.log('Fetching project:', id);
    return this.getAllProjects().pipe(
      map(projects => {
        const project = projects.find(item => item.id === id);

        if (!project) {
          throw new Error('Project not found');
        }

        return project;
      }),
      tap(data => console.log('Project loaded:', data)),
      catchError(this.handleError)
    );
  }

  createProject(project: Omit<Project, 'id' | 'createdAt'>): Observable<Project> {
    return this.http.post<Project>(this.apiUrl, project).pipe(
      catchError(this.handleError)
    );
  }

  updateProject(id: number, project: Omit<Project, 'id' | 'createdAt'>): Observable<Project> {
    return this.http.put<Project>(`${this.apiUrl}/${id}`, project).pipe(
      catchError(this.handleError)
    );
  }

  deleteProject(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    console.error('API Error:', error);
    return throwError(() => new Error('Failed to fetch projects'));
  }
}

