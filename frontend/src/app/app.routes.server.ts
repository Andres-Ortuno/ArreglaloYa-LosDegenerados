import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Con datos reales y sesión, estas pantallas dependen del usuario y de la base:
 * no se pueden generar de antemano. Se dibujan en el navegador.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client }
];
