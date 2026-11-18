/**
 * ArreglaloYa · Modelos orientados a objetos del prototipo académico.
 * Estos datos NO provienen de una API ni se almacenan en una base de datos.
 * Angular podrá reutilizar sus conceptos (clases/interfaces), pero no este
 * script global tal cual.
 */
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
    const zonaCorrecta = zona === 'Todas las zonas' || zona === this.zona;
    const oficioCorrecto = especialidad === 'Todas las especialidades' || especialidad === this.especialidad;
    return zonaCorrecta && oficioCorrecto;
  }
}

class CatalogoTrabajadores {
  private readonly trabajadores: Trabajador[] = [
    new Trabajador(1, 'Carlos Mendoza', 'Reparación de electrodomésticos', 'Cercado', 5, 4.8, 24, 'CM'),
    new Trabajador(2, 'María López', 'Albañilería', 'Sacaba', 6, 4.9, 18, 'ML'),
    new Trabajador(3, 'Jorge Rojas', 'Reparación de electrodomésticos', 'Tiquipaya', 3, 4.7, 12, 'JR')
  ];

  buscar(zona: string, especialidad: string): Trabajador[] {
    return this.trabajadores.filter(trabajador => trabajador.coincideCon(zona, especialidad));
  }

  buscarPorId(id: number): Trabajador | undefined {
    return this.trabajadores.find(trabajador => trabajador.id === id);
  }
}

class CuentaUsuario {
  constructor(public readonly tipo: string, public readonly rol: string) {}

  puedeRegistrarse(): boolean {
    return !(this.tipo.includes('Empresa') && this.rol !== 'cliente');
  }
}

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
      .every(valor => valor.trim().length > 0);
  }

  resumen(): string {
    return `${this.especialidad} en ${this.zona}`;
  }
}

class Postulacion {
  constructor(
    public readonly solicitud: string,
    public readonly monto: number,
    public readonly modalidad: string,
    public readonly costoVisita: number,
    public readonly incluyeMateriales: string
  ) {}

  esValida(): boolean {
    return this.solicitud.length > 0 && this.modalidad.length > 0
      && Number.isFinite(this.monto) && this.monto > 0
      && Number.isFinite(this.costoVisita) && this.costoVisita >= 0
      && (this.incluyeMateriales === 'si' || this.incluyeMateriales === 'no');
  }
}

class PagoDemostracion {
  constructor(public readonly monto: number, public readonly minimoTrabajador: number = 0) {}

  calcularAnticipo(): number {
    return Math.min(this.monto, Math.max(this.monto * 0.25, this.minimoTrabajador));
  }
}

class Calificacion {
  constructor(public readonly estrellas: number, public readonly comentario: string) {}

  esValida(): boolean {
    return Number.isInteger(this.estrellas) && this.estrellas >= 1 && this.estrellas <= 5;
  }
}
