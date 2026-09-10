import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { mensajeDeError } from '../../../core/http/api-error';
import { CitaResumen, PacienteDetalle } from '../../../models';
import { PacienteService } from '../../../services/paciente.service';

/**
 * HU-13 · RF-08: «la ficha con datos, alergias y citas pasadas y futuras, y
 * editar los datos de contacto».
 *
 * El formulario de edición solo se pinta para RECEPCIONISTA y ADMINISTRADOR,
 * que son quienes RF-08 autoriza. Ocultarlo no es la defensa —esa es el 403 del
 * servidor, que se comprueba en su prueba de integración— sino no ofrecer al
 * odontólogo un botón que va a fallar.
 */
@Component({
  selector: 'app-paciente-ficha',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  template: `
    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando la ficha" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    @if (ficha(); as p) {
      <h1>{{ p.apellidos }}, {{ p.nombres }}</h1>
      <p class="ayuda">
        Historia clínica {{ p.numeroHistoria }} · {{ p.tipoDocumento }} {{ p.documento }}
      </p>

      <div class="columnas">
        <mat-card class="tarjeta">
          <mat-card-header><mat-card-title>Datos y alergias</mat-card-title></mat-card-header>
          <mat-card-content>
            @if (puedeEditar()) {
              <form [formGroup]="formulario" (ngSubmit)="guardar()">
                <div class="fila">
                  <mat-form-field appearance="outline">
                    <mat-label>Nombres</mat-label>
                    <input matInput formControlName="nombres" />
                    @if (formulario.controls.nombres.hasError('required')) {
                      <mat-error>Los nombres son obligatorios</mat-error>
                    }
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Apellidos</mat-label>
                    <input matInput formControlName="apellidos" />
                    @if (formulario.controls.apellidos.hasError('required')) {
                      <mat-error>Los apellidos son obligatorios</mat-error>
                    }
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline">
                  <mat-label>Teléfono</mat-label>
                  <input matInput formControlName="telefono" />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Alergias</mat-label>
                  <textarea matInput rows="3" formControlName="alergias"></textarea>
                </mat-form-field>

                <div class="acciones">
                  <button
                    mat-flat-button
                    color="primary"
                    type="submit"
                    [disabled]="formulario.invalid || guardando()"
                  >
                    Guardar cambios
                  </button>
                </div>
              </form>
            } @else {
              <dl>
                <dt>Teléfono</dt>
                <dd>{{ p.telefono || '—' }}</dd>
                <dt>Alergias</dt>
                <dd>{{ p.alergias || 'Sin alergias registradas' }}</dd>
              </dl>
            }
          </mat-card-content>
        </mat-card>

        <mat-card class="tarjeta">
          <mat-card-header><mat-card-title>Citas</mat-card-title></mat-card-header>
          <mat-card-content>
            <h2>Futuras</h2>
            @if (futuras().length === 0) {
              <p class="vacio">No tiene citas futuras.</p>
            } @else {
              <ul class="citas">
                @for (cita of futuras(); track cita.id) {
                  <li>
                    <strong>{{ cita.fecha | date: 'd MMM y' }} · {{ cita.hora.slice(0, 5) }}</strong>
                    <span>{{ cita.tratamiento.nombre }} — {{ cita.odontologo.nombre }}</span>
                    <span class="estado">{{ cita.estado }}</span>
                  </li>
                }
              </ul>
            }

            <h2>Pasadas</h2>
            @if (pasadas().length === 0) {
              <p class="vacio">No tiene citas anteriores.</p>
            } @else {
              <ul class="citas">
                @for (cita of pasadas(); track cita.id) {
                  <li>
                    <strong>{{ cita.fecha | date: 'd MMM y' }} · {{ cita.hora.slice(0, 5) }}</strong>
                    <span>{{ cita.tratamiento.nombre }} — {{ cita.odontologo.nombre }}</span>
                    <span class="estado">{{ cita.estado }}</span>
                  </li>
                }
              </ul>
            }
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
  styles: `
    h1 {
      font-size: 1.5rem;
      margin: 0 0 0.25rem;
    }
    h2 {
      font-size: 1rem;
      margin: 1rem 0 0.5rem;
    }
    .ayuda {
      margin: 0 0 1rem;
      color: var(--mat-sys-on-surface-variant, #49454f);
    }
    .columnas {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      align-items: flex-start;
    }
    .tarjeta {
      flex: 1 1 24rem;
      min-width: 0;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .fila {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .fila mat-form-field {
      flex: 1 1 10rem;
    }
    .acciones {
      display: flex;
      justify-content: flex-end;
    }
    dl {
      margin: 0;
    }
    dt {
      font-weight: 600;
      margin-top: 0.75rem;
    }
    dd {
      margin: 0.25rem 0 0;
    }
    .citas {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .citas li {
      display: flex;
      flex-direction: column;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant, #cac4d0);
    }
    .estado,
    .vacio {
      font-size: 0.8125rem;
      color: var(--mat-sys-on-surface-variant, #49454f);
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
    }
  `,
})
export class PacienteFicha {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(PacienteService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  private readonly id = this.ruta.snapshot.paramMap.get('id') ?? '';

  protected readonly ficha = signal<PacienteDetalle | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({
    nombres: ['', [Validators.required]],
    apellidos: ['', [Validators.required]],
    telefono: [''],
    alergias: [''],
  });

  /**
   * Pasadas y futuras se separan aquí y no en el servidor: allí habría que fijar
   * qué es «ahora» para toda la clínica, y el cliente ya tiene la fecha y la
   * hora locales de cada cita.
   */
  protected readonly futuras = computed(() => this.reparto().futuras);
  protected readonly pasadas = computed(() => this.reparto().pasadas);

  protected puedeEditar(): boolean {
    const rol = this.auth.rol();
    return rol === 'RECEPCIONISTA' || rol === 'ADMINISTRADOR';
  }

  constructor() {
    this.cargar();
  }

  protected guardar(): void {
    if (this.formulario.invalid || this.guardando()) {
      return;
    }
    this.guardando.set(true);
    this.error.set(null);

    const valores = this.formulario.getRawValue();
    this.servicio
      .actualizar(this.id, {
        nombres: valores.nombres,
        apellidos: valores.apellidos,
        // Ausente, no vacio: es un PUT y el servidor borra lo que no llega.
        telefono: valores.telefono || undefined,
        alergias: valores.alergias || undefined,
      })
      .subscribe({
        next: (detalle) => {
          this.guardando.set(false);
          this.ficha.set(detalle);
          this.snackBar.open('Ficha actualizada.', 'Cerrar', { duration: 4000 });
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.obtener(this.id).subscribe({
      next: (detalle) => {
        this.cargando.set(false);
        this.ficha.set(detalle);
        this.formulario.patchValue({
          nombres: detalle.nombres ?? '',
          apellidos: detalle.apellidos ?? '',
          telefono: detalle.telefono ?? '',
          alergias: detalle.alergias ?? '',
        });
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  private reparto(): { futuras: CitaResumen[]; pasadas: CitaResumen[] } {
    const citas = this.ficha()?.citas ?? [];
    // `fecha` y `hora` son cadenas en hora local de la clinica: se comparan como
    // texto ISO, sin convertirlas a Date, que las desplazaria al huso del navegador.
    const ahora = new Date();
    const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(
      ahora.getDate(),
    ).padStart(2, '0')}`;
    const hora = ahora.toTimeString().slice(0, 8);

    const futuras: CitaResumen[] = [];
    const pasadas: CitaResumen[] = [];
    for (const cita of citas) {
      const esFutura = cita.fecha > hoy || (cita.fecha === hoy && cita.hora >= hora);
      (esFutura ? futuras : pasadas).push(cita);
    }
    // El servidor las manda de la mas reciente a la mas antigua; las futuras se
    // leen mejor al reves, empezando por la mas proxima.
    return { futuras: futuras.slice().reverse(), pasadas };
  }
}
