import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

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

  constructor(private http: HttpClient) { }

  getAllProjects(): Observable<Project[]> {
    console.log('Fetching projects from:', this.apiUrl);
    return this.http.get<Project[]>(this.apiUrl).pipe(
      tap(data => console.log('Projects loaded:', data)),
      catchError(this.handleError)
    );
  }

  getProjectById(id: number): Observable<Project> {
    console.log('Fetching project:', id);
    return this.http.get<Project>(`${this.apiUrl}/${id}`).pipe(
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

