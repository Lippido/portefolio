import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  displayedText = '';
  fullText = 'Mathis';
  isTypewriterDone = false;

  parcours = [
    {
      year: '2023',
      end: 'Présent',
      title: 'BUT Informatique',
      location: 'IUT informatique lyon 1 site de bourg en bresse',
      icon: '🎓'
    },
    {
      year: '2020',
      end: '2023',
      title: 'Lycée général spécialité informatique et mathématiques',
      location: 'Lycée de la plaine de l\'ain',
      icon: '📚'
    }
  ];

  ngOnInit() {
    this.animateTypewriter();
  }

  private animateTypewriter() {
    let index = 0;
    const interval = setInterval(() => {
      if (index < this.fullText.length) {
        this.displayedText += this.fullText[index];
        index++;
      } else {
        clearInterval(interval);
        this.isTypewriterDone = true;
      }
    }, 100);
  }
}
