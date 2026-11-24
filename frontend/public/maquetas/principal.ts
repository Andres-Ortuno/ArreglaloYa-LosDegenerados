/**
 * Arranque del prototipo. Cada HTML tiene su propio controlador orientado
 * a objetos. Cuando se migre a Angular, esta selección se sustituirá por
 * componentes y rutas de Angular.
 */
class AplicacionArreglaloYa {
  private readonly catalogo: CatalogoTrabajadores = new CatalogoTrabajadores();

  iniciar(): void {
    const archivo = window.location.pathname.split('/').pop() || 'index.html';
    let controlador: ControladorPagina;
    switch (archivo) {
      case 'ingresar.html': controlador = new ControladorIngreso(); break;
      case 'registro.html': controlador = new ControladorRegistro(); break;
      case 'solicitar.html': controlador = new ControladorSolicitud(); break;
      case 'buscar.html': controlador = new ControladorBusqueda(this.catalogo); break;
      case 'perfil-trabajador.html': controlador = new ControladorPerfilTrabajador(this.catalogo); break;
      case 'panel-trabajador.html': controlador = new ControladorPanelTrabajador(); break;
      case 'pedidos.html': controlador = new ControladorPedidos(); break;
      case 'administracion.html': controlador = new ControladorAdministracion(); break;
      default: controlador = new ControladorInicio(); break;
    }
    controlador.iniciar();
  }
}

document.addEventListener('DOMContentLoaded', () => new AplicacionArreglaloYa().iniciar());
