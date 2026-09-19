import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/http/api-error';
import { Plan, sesionesPorCerrar } from '../../models';
import { OdontologoService } from '../../services/odontologo.service';
import { PlanService } from '../../services/plan.service';
import { UsuarioService } from '../../services/usuario.service';
import { miOdontologo } from '../../shared/mi-odontologo';

/**
 * Los tratamientos que sigue el odontólogo: los planes que firmó y los de los
 * pacientes que tienen alguna cita con él, los firme quien los firme.
 *
 * <p>Quién entra en la lista lo decide el servidor desde el token; aquí no hay
 * ningún parámetro que lo amplíe. Lo único que se elige es si ver también los
 * suspendidos.
 *
 * <p>«Tuyo» se resuelve con `miOdontologo`, el mismo camino que recorre el
 * servidor para saber quién firmó. Si no se puede resolver, simplemente no se
 * marca ninguno: la lista sigue siendo correcta.
 */
@Component({
  selector: 'app-seguimiento-planes',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSlideToggleModule,
  ],
  template: `
    <div class="cabecera">
      <h1>Seguimiento de tratamientos</h1>
      <p class="ayuda">
        Los planes que has firmado y los de los pacientes que tienen alguna cita contigo. Los que
        siguen en curso, primero.
      </p>
      <mat-slide-toggle [checked]="!soloActivos()" (change)="alternarSuspendidos($event.checked)">
        Incluir planes suspendidos
      </mat-slide-toggle>
    </div>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando los planes de tus pacientes" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    @if (!cargando() && !error() && planes().length === 0) {
      <p class="vacio">Ninguno de tus pacientes tiene un plan de tratamiento.</p>
    }

    @if (planes().length > 0) {
      <ul class="lista">
        @for (plan of planes(); track plan.id) {
          <li>
            <mat-card [class.suspendido]="!plan.activo">
              <mat-card-content>
                <h2>{{ plan.tratamiento.nombre }}</h2>
                <p class="dato">
                  <a [routerLink]="['/pacientes', plan.paciente.id]">{{ plan.paciente.nombre }}</a>
                </p>
                <p class="dato">
                  @if (plan.odontologo.id === miId()) {
                    <strong>Tuyo</strong>
                  } @else {
                    Firmado por {{ plan.odontologo.nombre }}
                  }
                  · {{ plan.activo ? 'En curso' : 'Suspendido' }}
                </p>
                <p class="cifra">
                  <strong>{{ plan.avance.completadas }} de {{ plan.sesionesPrevistas }}</strong>
                  {{ plan.sesionesPrevistas === 1 ? 'sesión completada' : 'sesiones completadas' }}
                </p>
                @if (porCerrar(plan) > 0) {
                  <p class="aviso">
                    <mat-icon aria-hidden="true">pending_actions</mat-icon>
                    {{ porCerrar(plan) }} por cerrar
                  </p>
                }
              </mat-card-content>
              <mat-card-actions>
                <a
                  mat-button
                  [routerLink]="['/planes', plan.id]"
                  [attr.aria-label]="
                    'Ver el avance de ' + plan.tratamiento.nombre + ' de ' + plan.paciente.nombre
                  "
                >
                  Ver avance
                </a>
              </mat-card-actions>
            </mat-card>
          </li>
        }
      </ul>
    }

    <mat-paginator
      [length]="total()"
      [pageSize]="tamano()"
      [pageIndex]="indice()"
      [pageSizeOptions]="[10, 20, 50]"
      (page)="cambiarPagina($event)"
      aria-label="Paginación de los planes de tus pacientes"
    />
  `,
  styles: `
    .cabecera {
      margin-bottom: 1rem;
    }
    .ayuda {
      margin: 0.25rem 0 0.75rem;
    }
    .lista {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
      gap: 0.75rem;
    }
    h2 {
      margin: 0 0 0.35rem;
      font-size: 1.0625rem;
    }
    /* Color propio en vez de opacidad, para no bajar del 4.5:1 de contraste. */
    .ayuda,
    .dato,
    .vacio {
      color: var(--mat-sys-on-surface-variant, #45464f);
    }
    .dato {
      margin: 0 0 0.25rem;
      font-size: 0.875rem;
      overflow-wrap: anywhere;
    }
    .cifra {
      margin: 0.5rem 0 0.25rem;
    }
    .aviso {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin: 0;
      font-size: 0.875rem;
      color: var(--mat-sys-tertiary, #6b5778);
      font-weight: 600;
    }
    .aviso mat-icon {
      font-size: 1.125rem;
      width: 1.125rem;
      height: 1.125rem;
    }
    /* Un borde discontinuo además del texto: suspendido no se dice solo con color. */
    .suspendido {
      border: 1px dashed var(--mat-sys-outline, #74777f);
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
    }
    .vacio {
      padding: 1.5rem 0;
    }
  `,
})
export class SeguimientoPlanes {
  private readonly servicio = inject(PlanService);

  protected readonly planes = signal<Plan[]>([]);
  protected readonly total = signal(0);
  protected readonly indice = signal(0);
  protected readonly tamano = signal(20);
  protected readonly soloActivos = signal(true);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly miId = signal<string | null>(null);

  protected readonly porCerrar = sesionesPorCerrar;

  constructor() {
    miOdontologo(inject(UsuarioService), inject(OdontologoService)).subscribe((yo) =>
      this.miId.set(yo?.id ?? null),
    );
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.servicio
      .seguimiento(this.soloActivos(), { page: this.indice(), size: this.tamano() })
      .subscribe({
        next: (pagina) => {
          this.planes.set(pagina.content);
          this.total.set(pagina.totalElements);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.planes.set([]);
          this.total.set(0);
          this.error.set(mensajeDeError(err));
          this.cargando.set(false);
        },
      });
  }

  protected alternarSuspendidos(incluir: boolean): void {
    this.soloActivos.set(!incluir);
    this.indice.set(0);
    this.cargar();
  }

  protected cambiarPagina(evento: PageEvent): void {
    this.indice.set(evento.pageIndex);
    this.tamano.set(evento.pageSize);
    this.cargar();
  }
}
