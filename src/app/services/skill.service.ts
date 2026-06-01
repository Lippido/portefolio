import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Skill {
    id: number;
    categoryId?: number;
    category: string;
    name: string;
    sortOrder: number;
}

@Injectable({
    providedIn: 'root'
})
export class SkillService {
    private apiUrl = 'http://localhost:3000/api/skills';
    private staticUrl = 'data/skills.json';
    private useLocalApi = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

    constructor(private http: HttpClient) { }

    getSkills(): Observable<Skill[]> {
        const sourceUrl = this.useLocalApi ? this.apiUrl : this.staticUrl;

        return this.http.get<Skill[]>(sourceUrl).pipe(
            catchError(this.handleError)
        );
    }

    private handleError(error: HttpErrorResponse) {
        console.error('API Error:', error);
        return throwError(() => new Error('Failed to fetch skills'));
    }
}