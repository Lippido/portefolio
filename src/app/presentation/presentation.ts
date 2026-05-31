import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-presentation',
    imports: [CommonModule],
    templateUrl: './presentation.html',
    styleUrl: './presentation.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Presentation { }