/**
 * Controladores: coordinan las interfaces HTML y las clases de modelos.ts.
 * No se envían datos a servidores, no se realiza autenticación y no hay pagos.
 */
abstract class ControladorPagina {
  abstract iniciar(): void;

  protected mostrarMensaje(formulario: HTMLElement, texto: string, esError = false): void {
    let elemento = formulario.querySelector<HTMLElement>('.mensaje-interactivo');
    if (!elemento) {
      elemento = document.createElement('p');
      elemento.className = 'mensaje-interactivo';
      elemento.setAttribute('role', 'status');
      elemento.setAttribute('aria-live', 'polite');
      formulario.appendChild(elemento);
    }
    elemento.textContent = texto;
    elemento.classList.toggle('mensaje-error', esError);
  }

  protected leer(id: string): string {
    const campo = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    return campo?.value.trim() ?? '';
  }

  protected formularioPrincipal(): HTMLFormElement | null {
    return document.querySelector<HTMLFormElement>('main form.stack');
  }

  protected botonPrincipal(formulario: HTMLFormElement): HTMLButtonElement | null {
    return formulario.querySelector<HTMLButtonElement>('button.btn');
  }
}

class ControladorInicio extends ControladorPagina {
  iniciar(): void {
    // Portada: los enlaces HTML proporcionan la navegación.
  }
}

class ControladorIngreso extends ControladorPagina {
  iniciar(): void {
    const form = this.formularioPrincipal();
    if (!form) return;
    this.botonPrincipal(form)?.addEventListener('click', () => {
      if (!form.reportValidity()) return;
      this.mostrarMensaje(form, 'Campos revisados. El acceso real se implementará en Angular con la API de autenticación.');
    });
  }
}

class ControladorRegistro extends ControladorPagina {
  iniciar(): void {
    const form = this.formularioPrincipal();
    const tipo = document.getElementById('tipo-cuenta') as HTMLSelectElement | null;
    const roles = document.querySelectorAll<HTMLInputElement>('input[name="rol"]');
    if (!form || !tipo || !roles.length) return;

    const actualizarRol = (): void => {
      const empresa = tipo.value.includes('Empresa');
      roles.forEach(rol => { rol.disabled = empresa && rol.value !== 'cliente'; });
      if (empresa) {
        const cliente = form.querySelector<HTMLInputElement>('input[name="rol"][value="cliente"]');
        if (cliente) cliente.checked = true;
      }
    };
    tipo.addEventListener('change', actualizarRol);
    actualizarRol();

    this.botonPrincipal(form)?.addEventListener('click', () => {
      if (!form.reportValidity()) return;
      const rol = form.querySelector<HTMLInputElement>('input[name="rol"]:checked')?.value ?? 'cliente';
      const cuenta = new CuentaUsuario(tipo.value, rol);
      if (!cuenta.puedeRegistrarse()) {
        this.mostrarMensaje(form, 'Las empresas solamente pueden tener el rol de cliente.', true);
        return;
      }
      if (this.leer('registro-clave') !== this.leer('registro-repetir')) {
        this.mostrarMensaje(form, 'Las dos contraseñas deben coincidir.', true);
        return;
      }
      this.mostrarMensaje(form, `Registro de demostración válido para el rol «${rol}». No se ha creado una cuenta real.`);
    });
  }
}

class ControladorSolicitud extends ControladorPagina {
  iniciar(): void {
    const form = this.formularioPrincipal();
    if (!form) return;
    this.botonPrincipal(form)?.addEventListener('click', () => {
      if (!form.reportValidity()) return;
      const solicitud = new SolicitudTrabajo(
        this.leer('sol-especialidad'), this.leer('sol-descripcion'),
        this.leer('sol-zona'), this.leer('sol-ubicacion'), this.leer('sol-horario')
      );
      this.mostrarMensaje(form, solicitud.tieneDatosCompletos()
        ? `Formulario completo: ${solicitud.resumen()}. No se ha publicado; falta conectar la API.`
        : 'Completa la especialidad, descripción, zona, ubicación y horario.', !solicitud.tieneDatosCompletos());
    });
  }
}

class ControladorBusqueda extends ControladorPagina {
  constructor(private readonly catalogo: CatalogoTrabajadores) { super(); }

  iniciar(): void {
    const form = document.querySelector<HTMLFormElement>('form.search-tools');
    if (!form) return;
    const tarjetas = document.querySelectorAll<HTMLElement>('.worker-card');
    const contador = document.querySelector<HTMLElement>('.results-toolbar .tag');
    form.addEventListener('submit', evento => {
      evento.preventDefault();
      const trabajadores = this.catalogo.buscar(this.leer('busca-zona'), this.leer('busca-servicio'));
      const ids = new Set(trabajadores.map(trabajador => String(trabajador.id)));
      tarjetas.forEach(tarjeta => { tarjeta.hidden = !ids.has(tarjeta.dataset.workerId ?? ''); });
      if (contador) contador.textContent = `${trabajadores.length} resultado(s) de ejemplo`;
      this.mostrarMensaje(form, trabajadores.length
        ? 'Perfiles filtrados localmente. La búsqueda real se conectará a la API.'
        : 'No hay resultados de ejemplo con esos filtros. Prueba otra zona o especialidad.');
    });
  }
}

class ControladorPerfilTrabajador extends ControladorPagina {
  constructor(private readonly catalogo: CatalogoTrabajadores) { super(); }

  iniciar(): void {
    const id = Number(new URLSearchParams(window.location.search).get('id') ?? '1');
    const trabajador = this.catalogo.buscarPorId(id);
    if (!trabajador) return;
    const nombre = document.querySelector<HTMLElement>('.profile-title h1');
    const subtitulo = document.querySelector<HTMLElement>('.profile-title p');
    const avatar = document.querySelector<HTMLElement>('.profile-headline .avatar');
    const stats = document.querySelectorAll<HTMLElement>('.profile-stats .stat strong');
    const bloques = document.querySelectorAll<HTMLElement>('.profile-block');
    if (nombre) nombre.textContent = trabajador.nombre;
    if (subtitulo) subtitulo.textContent = `${trabajador.especialidad} · Cochabamba`;
    if (avatar) avatar.textContent = trabajador.iniciales;
    if (stats[0]) stats[0].textContent = `★ ${trabajador.calificacion}`;
    if (stats[1]) stats[1].textContent = String(trabajador.opiniones);
    if (stats[2]) stats[2].textContent = `${trabajador.experiencia} años`;
    const zona = bloques[2]?.querySelector('p');
    if (zona) zona.textContent = `${trabajador.zona}, Cochabamba. Se muestra la zona, nunca la dirección particular.`;
    if (trabajador.id !== 1) {
      const sobreMi = bloques[0]?.querySelector('p');
      const servicios = bloques[1]?.querySelector('p');
      if (sobreMi) sobreMi.textContent = `Perfil ilustrativo de ${trabajador.nombre}, especialista en ${trabajador.especialidad.toLowerCase()}.`;
      if (servicios) servicios.textContent = `Trabajos de ${trabajador.especialidad.toLowerCase()} en ${trabajador.zona}.`;
      const opiniones = bloques[3]?.querySelectorAll<HTMLElement>('.review');
      opiniones?.forEach(opinion => { opinion.hidden = true; });
      const aviso = document.createElement('p');
      aviso.textContent = 'Las opiniones de este perfil son datos ilustrativos del prototipo.';
      bloques[3]?.appendChild(aviso);
    }
  }
}

class ControladorPanelTrabajador extends ControladorPagina {
  iniciar(): void {
    const perfil = this.formularioPrincipal();
    const vista = document.getElementById('vista-perfil');
    if (perfil) {
      const previsualizar = (): void => {
        if (vista) vista.textContent = `${this.leer('perfil-especialidad') || 'Especialidad'} · ${this.leer('perfil-zona') || 'Zona'}`;
      };
      perfil.addEventListener('input', previsualizar);
      perfil.addEventListener('change', previsualizar);
      this.botonPrincipal(perfil)?.addEventListener('click', () => {
        if (!perfil.reportValidity()) return;
        this.mostrarMensaje(perfil, 'Perfil de ejemplo revisado. No se han guardado datos personales.');
      });
    }
    const documentos = document.getElementById('form-documentos') as HTMLFormElement | null;
    documentos?.addEventListener('submit', evento => {
      evento.preventDefault();
      if (!documentos.reportValidity()) return;
      this.mostrarMensaje(documentos, 'Seleccionaste los tres archivos requeridos. No se subió ni almacenó ninguno.');
    });
    document.querySelectorAll<HTMLButtonElement>('[data-elegir-solicitud]').forEach(boton => {
      boton.addEventListener('click', () => {
        const campo = document.getElementById('post-solicitud') as HTMLSelectElement | null;
        if (campo) campo.value = boton.dataset.elegirSolicitud ?? '';
        document.getElementById('form-postulacion')?.scrollIntoView({behavior:'smooth',block:'start'});
        campo?.focus({preventScroll:true});
      });
    });
    const post = document.getElementById('form-postulacion') as HTMLFormElement | null;
    post?.addEventListener('submit', evento => {
      evento.preventDefault();
      if (!post.reportValidity()) return;
      const oferta = new Postulacion(
        this.leer('post-solicitud'), Number(this.leer('post-monto')),
        this.leer('post-tipo'), Number(this.leer('post-visita')), this.leer('post-materiales')
      );
      if (!oferta.esValida()) {
        this.mostrarMensaje(post, 'Revisa los datos de monto, modalidad, costo de visita y materiales.', true);
        return;
      }
      const dinero = oferta.monto.toFixed(2);
      this.mostrarMensaje(post, `Propuesta revisada: ${oferta.solicitud}, Bs ${dinero}. No se ha enviado al cliente.`);
    });
  }
}

class ControladorPedidos extends ControladorPagina {
  iniciar(): void {
    const anticipo = document.getElementById('form-anticipo') as HTMLFormElement | null;
    anticipo?.addEventListener('submit', evento => {
      evento.preventDefault();
      if (!anticipo.reportValidity()) return;
      const pago = new PagoDemostracion(200, 30);
      this.mostrarMensaje(anticipo, `Ejemplo: el 25 % de Bs 200 equivale a Bs ${pago.calcularAnticipo().toFixed(2)}. No se ha cobrado ni retenido dinero.`);
    });
    const cancelar = document.getElementById('simular-cancelacion');
    cancelar?.addEventListener('click', () => {
      const contenedor = cancelar.parentElement;
      if (contenedor) this.mostrarMensaje(contenedor, 'En la V1 solo se puede cancelar antes de «En proceso». Los reembolsos requieren reglas del backend; no se ejecutó ninguna operación.');
    });
    const calificar = document.getElementById('form-calificacion') as HTMLFormElement | null;
    calificar?.addEventListener('submit', evento => {
      evento.preventDefault();
      if (!calificar.reportValidity()) return;
      const opinion = new Calificacion(Number(this.leer('calificar-estrellas')), this.leer('calificar-comentario'));
      if (!opinion.esValida()) {
        this.mostrarMensaje(calificar, 'La calificación debe estar entre 1 y 5 estrellas.', true);
        return;
      }
      const reporte = (document.getElementById('calificar-reporte') as HTMLInputElement | null)?.checked;
      this.mostrarMensaje(calificar, `Calificación ilustrativa: ${opinion.estrellas} estrella(s)${reporte ? ' con un reporte de ejemplo' : ''}. No se registró en el sistema.`);
    });
  }
}

class ControladorAdministracion extends ControladorPagina {
  iniciar(): void {
    document.querySelectorAll<HTMLButtonElement>('[data-admin-accion]').forEach(boton => {
      boton.addEventListener('click', () => {
        const fila = boton.closest<HTMLTableRowElement>('tr[data-candidato]');
        const estado = fila?.querySelector<HTMLElement>('[data-estado]');
        const aviso = document.getElementById('mensaje-admin');
        const aprobado = boton.dataset.adminAccion === 'aprobar';
        const nombre = fila?.dataset.candidato ?? 'Trabajador';
        const motivo = (document.getElementById('admin-motivo') as HTMLInputElement | null)?.value.trim() ?? '';
        if (!aprobado && motivo.length === 0) {
          if (aviso) aviso.textContent = 'Para simular un rechazo, escribe antes un motivo en el campo indicado.';
          return;
        }
        if (estado) {
          estado.textContent = aprobado ? 'Activo (demo)' : 'En revisión (rechazado demo)';
          estado.className = `status ${aprobado ? 'status-green' : 'status-gray'}`;
        }
        if (aviso) aviso.textContent = `${nombre}: ${aprobado ? 'aprobación simulada' : 'rechazo simulado por: ' + motivo}. La decisión no se guarda.`;
      });
    });
  }
}
