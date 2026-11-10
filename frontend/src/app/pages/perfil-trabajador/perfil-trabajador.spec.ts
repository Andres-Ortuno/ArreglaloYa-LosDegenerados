import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PerfilTrabajador } from './perfil-trabajador';

describe('PerfilTrabajador', () => {
  let component: PerfilTrabajador;
  let fixture: ComponentFixture<PerfilTrabajador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilTrabajador],
    }).compileComponents();

    fixture = TestBed.createComponent(PerfilTrabajador);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
