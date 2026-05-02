import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/root/app';
import './app/ag-grid.setup';
bootstrapApplication(App, appConfig).catch((err) => console.error(err));
