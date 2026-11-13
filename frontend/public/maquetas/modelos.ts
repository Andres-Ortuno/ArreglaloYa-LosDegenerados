/*
 * ArreglaloYa - Programación Orientada a Objetos con TypeScript
 * La vista sigue siendo HTML/CSS. Estas clases agregan comportamiento
 * local y de demostración; no existe conexión a una base de datos.
 */

// MODELO: un trabajador tiene datos y sabe si coincide con una búsqueda.
class Trabajador {
  constructor(
    public readonly id: number,
    public readonly nombre: string,
    public readonly especialidad: string,
    public readonly zona: string,
    public readonly experiencia: number,
    public readonly calificacion: number,
    public readonly opiniones: number,
    public readonly iniciales: string
  ) {}

  coincideCon(zona: string, especialidad: string): boolean {
    const zonaValida = zona === 'Todas las zonas' || zona === this.zona;
    const especialidadValida = especialidad === 'Todas las especialidades' || especialidad === this.especialidad;
    return zonaValida && especialidadValida;
  }
}

// MODELO: los ejemplos están agrupados en un catálogo reutilizable.
class CatalogoTrabajadores {
  private readonly trabajadores: Trabajador[] = [
    new Trabajador(1, 'Carlos Mendoza', 'Reparación de electrodomésticos', 'Cercado', 5, 4.8, 24, 'CM'),
    new Trabajador(2, 'María López', 'Albañilería', 'Sacaba', 6, 4.9, 18, 'ML'),
    new Trabajador(3, 'Jorge Rojas', 'Reparación de electrodomésticos', 'Tiquipaya', 3, 4.7, 12, 'JR')
  ];

  buscar(zona: string, especialidad: string): Trabajador[] {
    return this.trabajadores.filter(trabajador => trabajador.coincideCon(zona, especialidad));
  }

  obtenerPorId(id: number): Trabajador | undefined {
    return this.trabajadores.find(trabajador => trabajador.id === id);
  }
}

// MODELO: una cuenta empresa nunca puede activar el rol trabajador.
class CuentaUsuario {
  constructor(public readonly tipo: string, public readonly rol: string) {}

  puedeRegistrarse(): boolean {
    return !(this.tipo.includes('Empresa') && this.rol === 'trabajador');
  }
}

// MODELO: solicitud con sus datos obligatorios.
class SolicitudTrabajo {
  constructor(
    public readonly especialidad: string,
    public readonly descripcion: string,
    public readonly zona: string,
    public readonly ubicacion: string,
    public readonly horario: string
  ) {}

  tieneDatosCompletos(): boolean {
    return [this.especialidad, this.descripcion, this.zona, this.ubicacion, this.horario]
      .every(dato => dato.trim().length > 0);
  }

  resumen(): string {
    return `${this.especialidad} en ${this.zona}`;
  }
}

