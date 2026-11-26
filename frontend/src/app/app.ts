import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Encabezado } from './layout/encabezado/encabezado';

@Component({
  imports: [RouterOutlet, Encabezado],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('frontend');
}
