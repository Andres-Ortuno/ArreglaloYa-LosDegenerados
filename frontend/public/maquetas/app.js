"use strict";
/*
 * ArreglaloYa - Programación Orientada a Objetos con TypeScript
 * La vista sigue siendo HTML/CSS. Estas clases agregan comportamiento
 * local y de demostración; no existe conexión a una base de datos.
 */
// MODELO: un trabajador tiene datos y sabe si coincide con una búsqueda.
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
        const zonaValida = zona === 'Todas las zonas' || zona === this.zona;
        const especialidadValida = especialidad === 'Todas las especialidades' || especialidad === this.especialidad;
        return zonaValida && especialidadValida;
    }
}
// MODELO: los ejemplos están agrupados en un catálogo reutilizable.
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
    obtenerPorId(id) {
        return this.trabajadores.find(trabajador => trabajador.id === id);
    }
}
// MODELO: una cuenta empresa nunca puede activar el rol trabajador.
class CuentaUsuario {
    constructor(tipo, rol) {
        this.tipo = tipo;
        this.rol = rol;
    }
    puedeRegistrarse() {
        return !(this.tipo.includes('Empresa') && this.rol === 'trabajador');
    }
}
// MODELO: solicitud con sus datos obligatorios.
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
            .every(dato => dato.trim().length > 0);
    }
    resumen() {
        return `${this.especialidad} en ${this.zona}`;
    }
}
// HERENCIA: todos los controladores comparten la forma de mostrar avisos.
class ControladorPagina {
    mostrarMensaje(formulario, texto, esError = false) {
        let aviso = formulario.querySelector('.mensaje-interactivo');
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
    leer(id) {
        const campo = document.getElementById(id);
        return campo?.value.trim() ?? '';
    }
    boton(formulario) {
        return formulario.querySelector('button.btn');
    }
}
// CONTROLADOR: la portada no requiere operaciones todavía.
class ControladorInicio extends ControladorPagina {
    iniciar() {
        // La navegación de la portada utiliza enlaces HTML normales.
    }
}
// CONTROLADOR: valida campos, pero NO finge iniciar sesión.
class ControladorIngreso extends ControladorPagina {
    iniciar() {
        const formulario = document.querySelector('main form');
        if (!formulario)
            return;
        this.boton(formulario)?.addEventListener('click', () => {
            if (!formulario.reportValidity())
                return;
            this.mostrarMensaje(formulario, 'Los campos tienen un formato válido. El inicio de sesión se conectará al backend más adelante.');
        });
    }
}
// CONTROLADOR: aplica la regla de rol para empresas y comprueba contraseñas.
class ControladorRegistro extends ControladorPagina {
    iniciar() {
        const formulario = document.querySelector('main form');
        const tipo = document.getElementById('tipo-cuenta');
        const rolTrabajador = document.querySelector('input[name="rol"][value="trabajador"]');
        const rolCliente = document.querySelector('input[name="rol"][value="cliente"]');
        if (!formulario || !tipo || !rolTrabajador || !rolCliente)
            return;
        const actualizarRoles = () => {
            const esEmpresa = tipo.value.includes('Empresa');
            rolTrabajador.disabled = esEmpresa;
            if (esEmpresa)
                rolCliente.checked = true;
        };
        tipo.addEventListener('change', actualizarRoles);
        actualizarRoles();
        this.boton(formulario)?.addEventListener('click', () => {
            if (!formulario.reportValidity())
                return;
            const rol = formulario.querySelector('input[name="rol"]:checked')?.value ?? 'cliente';
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
    constructor(catalogo) {
        super();
        this.catalogo = catalogo;
    }
    iniciar() {
        const formulario = document.querySelector('form.search-tools');
        const tarjetas = document.querySelectorAll('.worker-card');
        const resumen = document.querySelector('.results-toolbar .tag');
        if (!formulario || !tarjetas.length)
            return;
        const filtrar = () => {
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
    iniciar() {
        const formulario = document.querySelector('main form.stack');
        if (!formulario)
            return;
        this.boton(formulario)?.addEventListener('click', () => {
            if (!formulario.reportValidity())
                return;
            const solicitud = new SolicitudTrabajo(this.leer('sol-especialidad'), this.leer('sol-descripcion'), this.leer('sol-zona'), this.leer('sol-ubicacion'), this.leer('sol-horario'));
            if (!solicitud.tieneDatosCompletos()) {
                this.mostrarMensaje(formulario, 'Completa todos los campos obligatorios.', true);
                return;
            }
            this.mostrarMensaje(formulario, `Vista previa validada: ${solicitud.resumen()}. No se publicó ningún trabajo; falta la API.`);
        });
    }
}
// CONTROLADOR: muestra el perfil ficticio que corresponde a cada tarjeta.
class ControladorPerfilTrabajador extends ControladorPagina {
    constructor(catalogo) {
        super();
        this.catalogo = catalogo;
    }
    iniciar() {
        const id = Number(new URLSearchParams(window.location.search).get('id') ?? '1');
        const trabajador = this.catalogo.obtenerPorId(id);
        if (!trabajador)
            return;
        const nombre = document.querySelector('.profile-title h1');
        const subtitulo = document.querySelector('.profile-title p');
        const avatar = document.querySelector('.profile-headline .avatar');
        const estadisticas = document.querySelectorAll('.profile-stats .stat strong');
        const zona = document.querySelector('.profile-block:nth-of-type(3) p');
        if (nombre)
            nombre.textContent = trabajador.nombre;
        if (subtitulo)
            subtitulo.textContent = `${trabajador.especialidad} · Cochabamba`;
        if (avatar)
            avatar.textContent = trabajador.iniciales;
        // Conservamos el elemento de la estrella y su estilo amarillo.
        if (estadisticas[0]?.firstChild)
            estadisticas[0].firstChild.textContent = `${trabajador.calificacion} `;
        if (estadisticas[1])
            estadisticas[1].textContent = String(trabajador.opiniones);
        if (estadisticas[2])
            estadisticas[2].textContent = `${trabajador.experiencia} años`;
        if (zona)
            zona.textContent = `⌖ ${trabajador.zona}, Cochabamba. Se muestra la zona, no la dirección particular.`;
        const puntuacionOpiniones = document.querySelector('.profile-block .rating');
        if (puntuacionOpiniones)
            puntuacionOpiniones.textContent = `★ ${trabajador.calificacion}*`;
        // Los ejemplos no son datos reales ni implican que alguien esté verificado.
        if (trabajador.id !== 1) {
            const sobreMi = document.querySelector('.profile-block:nth-of-type(1) p');
            const servicios = document.querySelector('.profile-block:nth-of-type(2) p');
            if (sobreMi)
                sobreMi.textContent = trabajador.id === 2
                    ? 'Realizo trabajos de albañilería y mantenimiento. Esta presentación es un ejemplo visual.'
                    : 'Trabajo en reparación de electrodomésticos y mantenimiento. Esta presentación es un ejemplo visual.';
            if (servicios)
                servicios.textContent = trabajador.id === 2
                    ? 'Paredes, revoques y mantenimiento del hogar.'
                    : 'Refrigeradores, secadoras y mantenimiento preventivo.';
        }
    }
}
// CONTROLADOR: ofrece una vista previa local sin almacenar documentos ni datos.
class ControladorEditarPerfil extends ControladorPagina {
    iniciar() {
        const formulario = document.querySelector('main form.stack');
        const textoPrevia = document.querySelector('.sidebar-card .row p');
        if (!formulario)
            return;
        const actualizarVistaPrevia = () => {
            const especialidad = this.leer('perfil-especialidad') || 'Especialidad';
            const zona = this.leer('perfil-zona') || 'Zona';
            if (textoPrevia)
                textoPrevia.textContent = `${especialidad} · ${zona}`;
        };
        formulario.addEventListener('input', actualizarVistaPrevia);
        formulario.addEventListener('change', actualizarVistaPrevia);
        this.boton(formulario)?.addEventListener('click', () => {
            if (!formulario.reportValidity())
                return;
            this.mostrarMensaje(formulario, 'Los datos están completos. Esta vista previa no guarda tu perfil ni envía documentos.');
        });
    }
}
// APLICACIÓN: selecciona qué controlador corresponde al HTML abierto.
class AplicacionArreglaloYa {
    constructor() {
        this.catalogo = new CatalogoTrabajadores();
    }
    iniciar() {
        const archivo = window.location.pathname.split('/').pop() ?? 'index.html';
        let pagina;
        switch (archivo) {
            case 'ingresar.html':
                pagina = new ControladorIngreso();
                break;
            case 'registro.html':
                pagina = new ControladorRegistro();
                break;
            case 'buscar.html':
                pagina = new ControladorBusqueda(this.catalogo);
                break;
            case 'solicitar.html':
                pagina = new ControladorSolicitud();
                break;
            case 'perfil-trabajador.html':
                pagina = new ControladorPerfilTrabajador(this.catalogo);
                break;
            case 'editar-perfil.html':
                pagina = new ControladorEditarPerfil();
                break;
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
