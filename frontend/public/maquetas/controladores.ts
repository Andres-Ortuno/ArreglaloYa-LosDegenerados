// HERENCIA: todos los controladores comparten la forma de mostrar avisos.
abstract class ControladorPagina {
  abstract iniciar(): void;

  protected mostrarMensaje(formulario: HTMLFormElement, texto: string, esError = false): void {
    let aviso = formulario.querySelector<HTMLElement>('.mensaje-interactivo');
    if (!aviso) {
      aviso = document.createElement('p');
      aviso.className = 'mensaje-interactivo';
      aviso.setAttribute('role', 'status');
      aviso.setAttribute('aria-live', 'polite');
      formulario.appendChild(aviso);
    }
    aviso.textContent = texto;
    aviso.classList.toggle('mensaje-error', esError);
  }

  protected leer(id: string): string {
    const campo = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    return campo?.value.trim() ?? '';
  }

  protected boton(formulario: HTMLFormElement): HTMLButtonElement | null {
    return formulario.querySelector<HTMLButtonElement>('button.btn');
  }
}

// CONTROLADOR: la portada no requiere operaciones todavía.
class ControladorInicio extends ControladorPagina {
  iniciar(): void {
    // La navegación de la portada utiliza enlaces HTML normales.
  }
}

// CONTROLADOR: valida campos, pero NO finge iniciar sesión.
class ControladorIngreso extends ControladorPagina {
  iniciar(): void {
    const formulario = document.querySelector<HTMLFormElement>('main form');
    if (!formulario) return;

    this.boton(formulario)?.addEventListener('click', () => {
      if (!formulario.reportValidity()) return;
      this.mostrarMensaje(formulario, 'Los campos tienen un formato válido. El inicio de sesión se conectará al backend más adelante.');
    });
  }
}

// CONTROLADOR: aplica la regla de rol para empresas y comprueba contraseñas.
class ControladorRegistro extends ControladorPagina {
  iniciar(): void {
    const formulario = document.querySelector<HTMLFormElement>('main form');
    const tipo = document.getElementById('tipo-cuenta') as HTMLSelectElement | null;
    const rolTrabajador = document.querySelector<HTMLInputElement>('input[name="rol"][value="trabajador"]');
    const rolCliente = document.querySelector<HTMLInputElement>('input[name="rol"][value="cliente"]');
    if (!formulario || !tipo || !rolTrabajador || !rolCliente) return;

    const actualizarRoles = (): void => {
      const esEmpresa = tipo.value.includes('Empresa');
      rolTrabajador.disabled = esEmpresa;
      if (esEmpresa) rolCliente.checked = true;
    };

    tipo.addEventListener('change', actualizarRoles);
    actualizarRoles();

    this.boton(formulario)?.addEventListener('click', () => {
      if (!formulario.reportValidity()) return;

      const rol = formulario.querySelector<HTMLInputElement>('input[name="rol"]:checked')?.value ?? 'cliente';
      const cuenta = new CuentaUsuario(tipo.value, rol);
      if (!cuenta.puedeRegistrarse()) {
        this.mostrarMensaje(formulario, 'Las empresas solo pueden registrarse como clientes.', true);
        return;
      }
      if (this.leer('registro-clave') !== this.leer('registro-repetir')) {
        this.mostrarMensaje(formulario, 'Las contraseñas deben coincidir.', true);
        return;
      }
      this.mostrarMensaje(formulario, 'Formulario revisado correctamente. No se ha creado ninguna cuenta: falta conectar el backend.');
    });
  }
}

// CONTROLADOR: filtra las tarjetas existentes sin cambiar su diseño.
class ControladorBusqueda extends ControladorPagina {
  constructor(private readonly catalogo: CatalogoTrabajadores) {
    super();
  }

  iniciar(): void {
    const formulario = document.querySelector<HTMLFormElement>('form.search-tools');
    const tarjetas = document.querySelectorAll<HTMLElement>('.worker-card');
    const resumen = document.querySelector<HTMLElement>('.results-toolbar .tag');
    if (!formulario || !tarjetas.length) return;

    const filtrar = (): void => {
      const zona = this.leer('busca-zona');
      const especialidad = this.leer('busca-servicio');
      const encontrados = this.catalogo.buscar(zona, especialidad);
      tarjetas.forEach((tarjeta, indice) => {
        tarjeta.hidden = !encontrados.some(t => t.id === indice + 1);
      });
      if (resumen) {
        resumen.textContent = `${encontrados.length} resultado(s) de ejemplo`;
      }
      this.mostrarMensaje(formulario, encontrados.length
        ? 'Resultados filtrados localmente. Son perfiles de demostración.'
        : 'No hay perfiles de ejemplo para esos filtros. Prueba otra zona o especialidad.');
    };

    formulario.addEventListener('submit', evento => {
      evento.preventDefault();
      filtrar();
    });
  }
}

// CONTROLADOR: valida la solicitud sin guardar ni inventar pagos.
class ControladorSolicitud extends ControladorPagina {
  iniciar(): void {
    const formulario = document.querySelector<HTMLFormElement>('main form.stack');
    if (!formulario) return;

    this.boton(formulario)?.addEventListener('click', () => {
      if (!formulario.reportValidity()) return;

      const solicitud = new SolicitudTrabajo(
        this.leer('sol-especialidad'),
        this.leer('sol-descripcion'),
        this.leer('sol-zona'),
        this.leer('sol-ubicacion'),
        this.leer('sol-horario')
      );

      if (!solicitud.tieneDatosCompletos()) {
        this.mostrarMensaje(formulario, 'Completa todos los campos obligatorios.', true);
        return;
      }
      this.mostrarMensaje(formulario,
        `Vista previa validada: ${solicitud.resumen()}. No se publicó ningún trabajo; falta la API.`);
    });
  }
}

// CONTROLADOR: muestra el perfil ficticio que corresponde a cada tarjeta.
class ControladorPerfilTrabajador extends ControladorPagina {
  constructor(private readonly catalogo: CatalogoTrabajadores) {
    super();
  }

  iniciar(): void {
    const id = Number(new URLSearchParams(window.location.search).get('id') ?? '1');
    const trabajador = this.catalogo.obtenerPorId(id);
    if (!trabajador) return;

    const nombre = document.querySelector<HTMLElement>('.profile-title h1');
    const subtitulo = document.querySelector<HTMLElement>('.profile-title p');
    const avatar = document.querySelector<HTMLElement>('.profile-headline .avatar');
    const estadisticas = document.querySelectorAll<HTMLElement>('.profile-stats .stat strong');
    const zona = document.querySelector<HTMLElement>('.profile-block:nth-of-type(3) p');

    if (nombre) nombre.textContent = trabajador.nombre;
    if (subtitulo) subtitulo.textContent = `${trabajador.especialidad} · Cochabamba`;
    if (avatar) avatar.textContent = trabajador.iniciales;
    // Conservamos el elemento de la estrella y su estilo amarillo.
    if (estadisticas[0]?.firstChild) estadisticas[0].firstChild.textContent = `${trabajador.calificacion} `;
    if (estadisticas[1]) estadisticas[1].textContent = String(trabajador.opiniones);
    if (estadisticas[2]) estadisticas[2].textContent = `${trabajador.experiencia} años`;
    if (zona) zona.textContent = `⌖ ${trabajador.zona}, Cochabamba. Se muestra la zona, no la dirección particular.`;
    const puntuacionOpiniones = document.querySelector<HTMLElement>('.profile-block .rating');
    if (puntuacionOpiniones) puntuacionOpiniones.textContent = `★ ${trabajador.calificacion}*`;
    // Los ejemplos no son datos reales ni implican que alguien esté verificado.
    if (trabajador.id !== 1) {
      const sobreMi = document.querySelector<HTMLElement>('.profile-block:nth-of-type(1) p');
      const servicios = document.querySelector<HTMLElement>('.profile-block:nth-of-type(2) p');
      if (sobreMi) sobreMi.textContent = trabajador.id === 2
        ? 'Realizo trabajos de albañilería y mantenimiento. Esta presentación es un ejemplo visual.'
        : 'Trabajo en reparación de electrodomésticos y mantenimiento. Esta presentación es un ejemplo visual.';
      if (servicios) servicios.textContent = trabajador.id === 2
        ? 'Paredes, revoques y mantenimiento del hogar.'
        : 'Refrigeradores, secadoras y mantenimiento preventivo.';
    }
  }
}

// CONTROLADOR: ofrece una vista previa local sin almacenar documentos ni datos.
class ControladorEditarPerfil extends ControladorPagina {
  iniciar(): void {
    const formulario = document.querySelector<HTMLFormElement>('main form.stack');
    const textoPrevia = document.querySelector<HTMLElement>('.sidebar-card .row p');
    if (!formulario) return;

    const actualizarVistaPrevia = (): void => {
      const especialidad = this.leer('perfil-especialidad') || 'Especialidad';
      const zona = this.leer('perfil-zona') || 'Zona';
      if (textoPrevia) textoPrevia.textContent = `${especialidad} · ${zona}`;
    };

    formulario.addEventListener('input', actualizarVistaPrevia);
    formulario.addEventListener('change', actualizarVistaPrevia);

    this.boton(formulario)?.addEventListener('click', () => {
      if (!formulario.reportValidity()) return;
      this.mostrarMensaje(formulario,
        'Los datos están completos. Esta vista previa no guarda tu perfil ni envía documentos.');
    });
  }
}

