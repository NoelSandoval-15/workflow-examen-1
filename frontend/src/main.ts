import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// StompJS requires 'global' which is a Node.js variable — polyfill for browser
(window as any)['global'] = window;

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
