import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Ingresar } from './ingresar';

describe('Ingresar', () => {
  let component: Ingresar;
  let fixture: ComponentFixture<Ingresar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ingresar],
    }).compileComponents();

    fixture = TestBed.createComponent(Ingresar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
