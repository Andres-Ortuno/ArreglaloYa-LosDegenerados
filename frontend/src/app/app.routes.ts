import { Routes } from '@angular/router';

import { Inicio } from './pages/inicio/inicio';
import { Buscar } from './pages/buscar/buscar';
import { Ingresar } from './pages/ingresar/ingresar';
import { Registro } from './pages/registro/registro';
import { Solicitar } from './pages/solicitar/solicitar';
import { PerfilTrabajador } from './pages/perfil-trabajador/perfil-trabajador';
import { PanelTrabajador } from './pages/panel-trabajador/panel-trabajador';
import { EditarPerfil } from './pages/editar-perfil/editar-perfil';
import { Pedidos } from './pages/pedidos/pedidos';
import { Administracion } from './pages/administracion/administracion';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: '', component: Inicio },
  { path: 'buscar', component: Buscar },
  { path: 'ingresar', component: Ingresar },
  { path: 'registro', component: Registro },
  { path: 'perfil-trabajador/:id', component: PerfilTrabajador },

  // Rutas que necesitan sesión (y, si se indica, un rol)
  { path: 'solicitar', component: Solicitar, canActivate: [authGuard], data: { roles: ['cliente'] } },
  { path: 'panel-trabajador', component: PanelTrabajador, canActivate: [authGuard], data: { roles: ['trabajador'] } },
  { path: 'editar-perfil', component: EditarPerfil, canActivate: [authGuard], data: { roles: ['trabajador'] } },
  { path: 'pedidos', component: Pedidos, canActivate: [authGuard] },
  { path: 'administracion', component: Administracion, canActivate: [authGuard], data: { roles: ['administrador'] } }
];
