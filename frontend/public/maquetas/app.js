"use strict";
/**
 * ArreglaloYa · Modelos orientados a objetos del prototipo académico.
 * Estos datos NO provienen de una API ni se almacenan en una base de datos.
 * Angular podrá reutilizar sus conceptos (clases/interfaces), pero no este
 * script global tal cual.
 */
class Trabajador {
    constructor(id, nombre, especialidad, zona, experiencia, calificacion, opiniones, iniciales) {
        this.id = id;
        this.nombre = nombre;
        this.especialidad = especialidad;
        this.zona = zona;
        this.experiencia = experiencia;
        this.calificacion = calificacion;
        this.opiniones = opiniones;
        this.iniciales = iniciales;
    }
    coincideCon(zona, especialidad) {
        const zonaCorrecta = zona === 'Todas las zonas' || zona === this.zona;
        const oficioCorrecto = especialidad === 'Todas las especialidades' || especialidad === this.especialidad;
        return zonaCorrecta && oficioCorrecto;
    }
}
class CatalogoTrabajadores {
    constructor() {
        this.trabajadores = [
            new Trabajador(1, 'Carlos Mendoza', 'Reparación de electrodomésticos', 'Cercado', 5, 4.8, 24, 'CM'),
            new Trabajador(2, 'María López', 'Albañilería', 'Sacaba', 6, 4.9, 18, 'ML'),
            new Trabajador(3, 'Jorge Rojas', 'Reparación de electrodomésticos', 'Tiquipaya', 3, 4.7, 12, 'JR')
        ];
    }
    buscar(zona, especialidad) {
        return this.trabajadores.filter(trabajador => trabajador.coincideCon(zona, especialidad));
    }
    buscarPorId(id) {
        return this.trabajadores.find(trabajador => trabajador.id === id);
    }
}
class CuentaUsuario {
    constructor(tipo, rol) {
        this.tipo = tipo;
        this.rol = rol;
    }
    puedeRegistrarse() {
        return !(this.tipo.includes('Empresa') && this.rol !== 'cliente');
    }
}
class SolicitudTrabajo {
    constructor(especialidad, descripcion, zona, ubicacion, horario) {
        this.especialidad = especialidad;
        this.descripcion = descripcion;
        this.zona = zona;
        this.ubicacion = ubicacion;
        this.horario = horario;
    }
    tieneDatosCompletos() {
        return [this.especialidad, this.descripcion, this.zona, this.ubicacion, this.horario]
            .every(valor => valor.trim().length > 0);
    }
    resumen() {
        return `${this.especialidad} en ${this.zona}`;
    }
}
class Postulacion {
    constructor(solicitud, monto, modalidad, costoVisita, incluyeMateriales) {
        this.solicitud = solicitud;
        this.monto = monto;
        this.modalidad = modalidad;
        this.costoVisita = costoVisita;
        this.incluyeMateriales = incluyeMateriales;
    }
    esValida() {
        return this.solicitud.length > 0 && this.modalidad.length > 0
            && Number.isFinite(this.monto) && this.monto > 0
            && Number.isFinite(this.costoVisita) && this.costoVisita >= 0
            && (this.incluyeMateriales === 'si' || this.incluyeMateriales === 'no');
    }
}
class PagoDemostracion {
    constructor(monto, minimoTrabajador = 0) {
        this.monto = monto;
        this.minimoTrabajador = minimoTrabajador;
    }
    calcularAnticipo() {
        return Math.min(this.monto, Math.max(this.monto * 0.25, this.minimoTrabajador));
    }
}
class Calificacion {
    constructor(estrellas, comentario) {
        this.estrellas = estrellas;
        this.comentario = comentario;
    }
    esValida() {
        return Number.isInteger(this.estrellas) && this.estrellas >= 1 && this.estrellas <= 5;
    }
}
/**
 * Controladores: coordinan las interfaces HTML y las clases de modelos.ts.
 * No se envían datos a servidores, no se realiza autenticación y no hay pagos.
 */
class ControladorPagina {
    mostrarMensaje(formulario, texto, esError = false) {
        let elemento = formulario.querySelector('.mensaje-interactivo');
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
    leer(id) {
        const campo = document.getElementById(id);
        return campo?.value.trim() ?? '';
    }
    formularioPrincipal() {
        return document.querySelector('main form.stack');
    }
    botonPrincipal(formulario) {
        return formulario.querySelector('button.btn');
    }
}
class ControladorInicio extends ControladorPagina {
    iniciar() {
        // Portada: los enlaces HTML proporcionan la navegación.
    }
}
class ControladorIngreso extends ControladorPagina {
    iniciar() {
        const form = this.formularioPrincipal();
        if (!form)
            return;
        this.botonPrincipal(form)?.addEventListener('click', () => {
            if (!form.reportValidity())
                return;
            this.mostrarMensaje(form, 'Campos revisados. El acceso real se implementará en Angular con la API de autenticación.');
        });
    }
}
class ControladorRegistro extends ControladorPagina {
    iniciar() {
        const form = this.formularioPrincipal();
        const tipo = document.getElementById('tipo-cuenta');
        const roles = document.querySelectorAll('input[name="rol"]');
        if (!form || !tipo || !roles.length)
            return;
        const actualizarRol = () => {
            const empresa = tipo.value.includes('Empresa');
            roles.forEach(rol => { rol.disabled = empresa && rol.value !== 'cliente'; });
            if (empresa) {
                const cliente = form.querySelector('input[name="rol"][value="cliente"]');
                if (cliente)
                    cliente.checked = true;
            }
        };
        tipo.addEventListener('change', actualizarRol);
        actualizarRol();
        this.botonPrincipal(form)?.addEventListener('click', () => {
            if (!form.reportValidity())
                return;
            const rol = form.querySelector('input[name="rol"]:checked')?.value ?? 'cliente';
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
    iniciar() {
        const form = this.formularioPrincipal();
        if (!form)
            return;
        this.botonPrincipal(form)?.addEventListener('click', () => {
            if (!form.reportValidity())
                return;
            const solicitud = new SolicitudTrabajo(this.leer('sol-especialidad'), this.leer('sol-descripcion'), this.leer('sol-zona'), this.leer('sol-ubicacion'), this.leer('sol-horario'));
            this.mostrarMensaje(form, solicitud.tieneDatosCompletos()
                ? `Formulario completo: ${solicitud.resumen()}. No se ha publicado; falta conectar la API.`
                : 'Completa la especialidad, descripción, zona, ubicación y horario.', !solicitud.tieneDatosCompletos());
        });
    }
}
class ControladorBusqueda extends ControladorPagina {
    constructor(catalogo) {
        super();
        this.catalogo = catalogo;
    }
    iniciar() {
        const form = document.querySelector('form.search-tools');
        if (!form)
            return;
        const tarjetas = document.querySelectorAll('.worker-card');
        const contador = document.querySelector('.results-toolbar .tag');
        form.addEventListener('submit', evento => {
            evento.preventDefault();
            const trabajadores = this.catalogo.buscar(this.leer('busca-zona'), this.leer('busca-servicio'));
            const ids = new Set(trabajadores.map(trabajador => String(trabajador.id)));
            tarjetas.forEach(tarjeta => { tarjeta.hidden = !ids.has(tarjeta.dataset.workerId ?? ''); });
            if (contador)
                contador.textContent = `${trabajadores.length} resultado(s) de ejemplo`;
            this.mostrarMensaje(form, trabajadores.length
                ? 'Perfiles filtrados localmente. La búsqueda real se conectará a la API.'
                : 'No hay resultados de ejemplo con esos filtros. Prueba otra zona o especialidad.');
        });
    }
}
class ControladorPerfilTrabajador extends ControladorPagina {
    constructor(catalogo) {
        super();
        this.catalogo = catalogo;
    }
    iniciar() {
        const id = Number(new URLSearchParams(window.location.search).get('id') ?? '1');
        const trabajador = this.catalogo.buscarPorId(id);
        if (!trabajador)
            return;
        const nombre = document.querySelector('.profile-title h1');
        const subtitulo = document.querySelector('.profile-title p');
        const avatar = document.querySelector('.profile-headline .avatar');
        const stats = document.querySelectorAll('.profile-stats .stat strong');
        const bloques = document.querySelectorAll('.profile-block');
        if (nombre)
            nombre.textContent = trabajador.nombre;
        if (subtitulo)
            subtitulo.textContent = `${trabajador.especialidad} · Cochabamba`;
        if (avatar)
            avatar.textContent = trabajador.iniciales;
        if (stats[0])
            stats[0].textContent = `★ ${trabajador.calificacion}`;
        if (stats[1])
            stats[1].textContent = String(trabajador.opiniones);
        if (stats[2])
            stats[2].textContent = `${trabajador.experiencia} años`;
        const zona = bloques[2]?.querySelector('p');
        if (zona)
            zona.textContent = `${trabajador.zona}, Cochabamba. Se muestra la zona, nunca la dirección particular.`;
        if (trabajador.id !== 1) {
            const sobreMi = bloques[0]?.querySelector('p');
            const servicios = bloques[1]?.querySelector('p');
            if (sobreMi)
                sobreMi.textContent = `Perfil ilustrativo de ${trabajador.nombre}, especialista en ${trabajador.especialidad.toLowerCase()}.`;
            if (servicios)
                servicios.textContent = `Trabajos de ${trabajador.especialidad.toLowerCase()} en ${trabajador.zona}.`;
            const opiniones = bloques[3]?.querySelectorAll('.review');
            opiniones?.forEach(opinion => { opinion.hidden = true; });
            const aviso = document.createElement('p');
            aviso.textContent = 'Las opiniones de este perfil son datos ilustrativos del prototipo.';
            bloques[3]?.appendChild(aviso);
        }
    }
}
class ControladorPanelTrabajador extends ControladorPagina {
    iniciar() {
        const perfil = this.formularioPrincipal();
        const vista = document.getElementById('vista-perfil');
        if (perfil) {
            const previsualizar = () => {
                if (vista)
                    vista.textContent = `${this.leer('perfil-especialidad') || 'Especialidad'} · ${this.leer('perfil-zona') || 'Zona'}`;
            };
            perfil.addEventListener('input', previsualizar);
            perfil.addEventListener('change', previsualizar);
            this.botonPrincipal(perfil)?.addEventListener('click', () => {
                if (!perfil.reportValidity())
                    return;
                this.mostrarMensaje(perfil, 'Perfil de ejemplo revisado. No se han guardado datos personales.');
            });
        }
        const documentos = document.getElementById('form-documentos');
        documentos?.addEventListener('submit', evento => {
            evento.preventDefault();
            if (!documentos.reportValidity())
                return;
            this.mostrarMensaje(documentos, 'Seleccionaste los tres archivos requeridos. No se subió ni almacenó ninguno.');
        });
        document.querySelectorAll('[data-elegir-solicitud]').forEach(boton => {
            boton.addEventListener('click', () => {
                const campo = document.getElementById('post-solicitud');
                if (campo)
                    campo.value = boton.dataset.elegirSolicitud ?? '';
                document.getElementById('form-postulacion')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                campo?.focus({ preventScroll: true });
            });
        });
        const post = document.getElementById('form-postulacion');
        post?.addEventListener('submit', evento => {
            evento.preventDefault();
            if (!post.reportValidity())
                return;
            const oferta = new Postulacion(this.leer('post-solicitud'), Number(this.leer('post-monto')), this.leer('post-tipo'), Number(this.leer('post-visita')), this.leer('post-materiales'));
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
    iniciar() {
        const anticipo = document.getElementById('form-anticipo');
        anticipo?.addEventListener('submit', evento => {
            evento.preventDefault();
            if (!anticipo.reportValidity())
                return;
            const pago = new PagoDemostracion(200, 30);
            this.mostrarMensaje(anticipo, `Ejemplo: el 25 % de Bs 200 equivale a Bs ${pago.calcularAnticipo().toFixed(2)}. No se ha cobrado ni retenido dinero.`);
        });
        const cancelar = document.getElementById('simular-cancelacion');
        cancelar?.addEventListener('click', () => {
            const contenedor = cancelar.parentElement;
            if (contenedor)
                this.mostrarMensaje(contenedor, 'En la V1 solo se puede cancelar antes de «En proceso». Los reembolsos requieren reglas del backend; no se ejecutó ninguna operación.');
        });
        const calificar = document.getElementById('form-calificacion');
        calificar?.addEventListener('submit', evento => {
            evento.preventDefault();
            if (!calificar.reportValidity())
                return;
            const opinion = new Calificacion(Number(this.leer('calificar-estrellas')), this.leer('calificar-comentario'));
            if (!opinion.esValida()) {
                this.mostrarMensaje(calificar, 'La calificación debe estar entre 1 y 5 estrellas.', true);
                return;
            }
            const reporte = document.getElementById('calificar-reporte')?.checked;
            this.mostrarMensaje(calificar, `Calificación ilustrativa: ${opinion.estrellas} estrella(s)${reporte ? ' con un reporte de ejemplo' : ''}. No se registró en el sistema.`);
        });
    }
}
class ControladorAdministracion extends ControladorPagina {
    iniciar() {
        document.querySelectorAll('[data-admin-accion]').forEach(boton => {
            boton.addEventListener('click', () => {
                const fila = boton.closest('tr[data-candidato]');
                const estado = fila?.querySelector('[data-estado]');
                const aviso = document.getElementById('mensaje-admin');
                const aprobado = boton.dataset.adminAccion === 'aprobar';
                const nombre = fila?.dataset.candidato ?? 'Trabajador';
                const motivo = document.getElementById('admin-motivo')?.value.trim() ?? '';
                if (!aprobado && motivo.length === 0) {
                    if (aviso)
                        aviso.textContent = 'Para simular un rechazo, escribe antes un motivo en el campo indicado.';
                    return;
                }
                if (estado) {
                    estado.textContent = aprobado ? 'Activo (demo)' : 'En revisión (rechazado demo)';
                    estado.className = `status ${aprobado ? 'status-green' : 'status-gray'}`;
                }
                if (aviso)
                    aviso.textContent = `${nombre}: ${aprobado ? 'aprobación simulada' : 'rechazo simulado por: ' + motivo}. La decisión no se guarda.`;
            });
        });
    }
}
/**
 * Arranque del prototipo. Cada HTML tiene su propio controlador orientado
 * a objetos. Cuando se migre a Angular, esta selección se sustituirá por
 * componentes y rutas de Angular.
 */
class AplicacionArreglaloYa {
    constructor() {
        this.catalogo = new CatalogoTrabajadores();
    }
    iniciar() {
        const archivo = window.location.pathname.split('/').pop() || 'index.html';
        let controlador;
        switch (archivo) {
            case 'ingresar.html':
                controlador = new ControladorIngreso();
                break;
            case 'registro.html':
                controlador = new ControladorRegistro();
                break;
            case 'solicitar.html':
                controlador = new ControladorSolicitud();
                break;
            case 'buscar.html':
                controlador = new ControladorBusqueda(this.catalogo);
                break;
            case 'perfil-trabajador.html':
                controlador = new ControladorPerfilTrabajador(this.catalogo);
                break;
            case 'panel-trabajador.html':
                controlador = new ControladorPanelTrabajador();
                break;
            case 'pedidos.html':
                controlador = new ControladorPedidos();
                break;
            case 'administracion.html':
                controlador = new ControladorAdministracion();
                break;
            default:
                controlador = new ControladorInicio();
                break;
        }
        controlador.iniciar();
    }
}
document.addEventListener('DOMContentLoaded', () => new AplicacionArreglaloYa().iniciar());
