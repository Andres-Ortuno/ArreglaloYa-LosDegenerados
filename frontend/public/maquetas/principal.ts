// APLICACIÓN: selecciona qué controlador corresponde al HTML abierto.
class AplicacionArreglaloYa {
  private readonly catalogo = new CatalogoTrabajadores();

  iniciar(): void {
    const archivo = window.location.pathname.split('/').pop() ?? 'index.html';
    let pagina: ControladorPagina;

    switch (archivo) {
      case 'ingresar.html': pagina = new ControladorIngreso(); break;
      case 'registro.html': pagina = new ControladorRegistro(); break;
      case 'buscar.html': pagina = new ControladorBusqueda(this.catalogo); break;
      case 'solicitar.html': pagina = new ControladorSolicitud(); break;
      case 'perfil-trabajador.html': pagina = new ControladorPerfilTrabajador(this.catalogo); break;
      case 'editar-perfil.html': pagina = new ControladorEditarPerfil(); break;
      default: pagina = new ControladorInicio();
    }

    pagina.iniciar();
  }
}

// Punto de entrada del programa.
document.addEventListener('DOMContentLoaded', () => {
  const aplicacion = new AplicacionArreglaloYa();
  aplicacion.iniciar();
});
