import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

const redirect = new URLSearchParams(window.location.search).get('redirect');

if (redirect) {
  window.history.replaceState(null, '', redirect);
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
