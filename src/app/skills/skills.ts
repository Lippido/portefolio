import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Observable, catchError, map, of, startWith } from 'rxjs';
import { Skill, SkillService } from '../services/skill.service';

interface SkillCategory {
  category: string;
  items: Skill[];
}

interface SkillsState {
  loading: boolean;
  error: string | null;
  categories: SkillCategory[];
}

@Component({
  selector: 'app-skills',
  imports: [CommonModule],
  templateUrl: './skills.html',
  styleUrl: './skills.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Skills implements OnInit {
  state$: Observable<SkillsState> | null = null;

  constructor(private skillService: SkillService) { }

  ngOnInit() {
    this.state$ = this.skillService.getSkills().pipe(
      map(skills => {
        const groupedSkills = new Map<string, Skill[]>();

        skills.forEach(skill => {
          const categorySkills = groupedSkills.get(skill.category) ?? [];
          groupedSkills.set(skill.category, [...categorySkills, skill]);
        });

        return {
          loading: false,
          error: null,
          categories: Array.from(groupedSkills, ([category, items]) => ({
            category,
            items: items.sort((left, right) => left.sortOrder - right.sortOrder)
          }))
        };
      }),
      catchError(err => {
        console.error('Error loading skills:', err);
        return of({ loading: false, error: 'Erreur lors du chargement des compétences', categories: [] });
      }),
      startWith({ loading: true, error: null, categories: [] })
    );
  }
}
