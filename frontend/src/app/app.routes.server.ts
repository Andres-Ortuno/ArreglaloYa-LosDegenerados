
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'buscar', renderMode: RenderMode.Prerender },
  { path: 'ingresar', renderMode: RenderMode.Prerender },
  { path: 'registro', renderMode: RenderMode.Prerender },
  { path: 'solicitar', renderMode: RenderMode.Prerender },
  {
  path: 'editar-perfil',
  renderMode: RenderMode.Prerender
},

{
  path: 'perfil-trabajador/:id',
  renderMode: RenderMode.Prerender,
  async getPrerenderParams() {
    return [
      { id: '1' },
      { id: '2' },
      { id: '3' }
    ];
  }
},
{
  path: 'panel-trabajador',
  renderMode: RenderMode.Prerender
},
{
  path: 'pedidos',
  renderMode: RenderMode.Prerender
},
{
  path: 'administracion',
  renderMode: RenderMode.Prerender
},
  { path: '**', renderMode: RenderMode.Client }
];
