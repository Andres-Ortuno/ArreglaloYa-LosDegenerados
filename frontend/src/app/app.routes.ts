
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

export const routes: Routes = [
  {
    path: '',
    component: Inicio
  },
  {
    path: 'buscar',
    component: Buscar
  },
  {
    path: 'ingresar',
    component: Ingresar
  },
  {
    path: 'registro',
    component: Registro
  },
  {
    path: 'solicitar',
    component: Solicitar
  },
  {
    path: 'perfil-trabajador/:id',
    component: PerfilTrabajador
  },
  {
    path: 'panel-trabajador',
    component: PanelTrabajador
  },
  {
    path: 'editar-perfil',
    component: EditarPerfil
  },
  {
    path: 'pedidos',
    component: Pedidos
  },
  {
    path: 'administracion',
    component: Administracion
  }
];
