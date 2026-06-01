import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  isDarkMode = signal(true);

  constructor() {
    const saved = localStorage.getItem('theme');
    if (saved) {
      this.isDarkMode.set(saved === 'dark');
      this.applyTheme(saved === 'dark');
    } else {
      this.isDarkMode.set(true);
      this.applyTheme(true);
    }
  }

  toggleTheme() {
    this.isDarkMode.set(!this.isDarkMode());
    this.applyTheme(this.isDarkMode());
  }

  private applyTheme(isDark: boolean) {
    if (isDark) {
      document.documentElement.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }
}
