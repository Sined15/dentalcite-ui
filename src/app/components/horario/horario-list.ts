import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { mensajeDeError } from '../../core/http/api-error';
import { DIAS_SEMANA, Horario } from '../../models';
import { HorarioService } from '../../services/horario.service';
import { ConfirmarDatos, ConfirmarDialogo } from '../../shared/confirmar-dialogo';
import { HorarioEditDialogo, HorarioDialogoDatos } from './horario-edit-dialogo';

@Component({
  selector: 'app-horario-list',
  imports: [RouterLink, MatButtonModule, MatDialogModule, MatIconModule, MatProgressBarModule],
  template: `
    <header class="cabecera">
      <div>
        @if (puedeVolverALaLista) {
          <a mat-button routerLink="/odontologos">
            <mat-icon>arrow_back</mat-icon>
            Odontólogos
          </a>
        }
        <h1>Horario de atención</h1>
        <p class="ayuda">
          Los días y horas en que atiende. Lo que ven los pacientes al pedir cita sale de aquí.
        </p>
      </div>
      <button mat-flat-button type="button" (click)="abrirFormulario(null)">
        <mat-icon>add</mat-icon>
        Nuevo tramo
      </button>
    </header>

    <p class="aviso">
      <mat-icon aria-hidden="true">info</mat-icon>
      <span>
        Los horarios se escriben en la hora de la clínica. Los cambios se reflejan en la
        disponibilidad de inmediato.
      </span>
    </p>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando horario" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    <ul class="semana" aria-label="Horario semanal">
      @for (dia of semana(); track dia.valor) {
        <li class="dia">
          <h2>{{ dia.nombre }}</h2>
          <div class="tramos">
            @for (fila of dia.tramos; track fila.id) {
              <span class="tramo">
                <span class="hora">{{ fila.horaInicio }} – {{ fila.horaFin }}</span>
                <button
                  mat-icon-button
                  type="button"
                  (click)="abrirFormulario(fila)"
                  [attr.aria-label]="
                    'Editar el tramo del ' + dia.nombre + ' de ' + fila.horaInicio + ' a ' + fila.horaFin
                  "
                >
                  <mat-icon>edit</mat-icon>
                </button>
                <button
                  mat-icon-button
                  type="button"
                  class="eliminar"
                  (click)="eliminar(fila)"
                  [attr.aria-label]="
                    'Eliminar el tramo del ' + dia.nombre + ' de ' + fila.horaInicio + ' a ' + fila.horaFin
                  "
                >
                  <mat-icon>delete</mat-icon>
                </button>
              </span>
            } @empty {
              <span class="sin-tramos">
                <mat-icon aria-hidden="true">bedtime</mat-icon>
                No atiende este día
              </span>
            }
          </div>
        </li>
      }
    </ul>

    @if (!cargando() && filas().length === 0 && !error()) {
      <p class="vacio">Este odontólogo aún no tiene tramos de horario declarados.</p>
    }
  `,
  styles: `
    .cabecera {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .cabecera h1 {
      margin: 0.5rem 0 0;
    }
    .ayuda {
      margin: var(--space-1) 0 0;
      max-width: var(--layout-prose);
      color: var(--ink-muted);
    }
    .aviso {
      display: flex;
      gap: var(--space-3);
      align-items: flex-start;
      margin: 0 0 var(--space-5);
      padding: var(--space-3) var(--space-4);
      background: var(--accent-soft);
      border-radius: var(--radius-md);
      font: var(--text-body-sm);
    }
    .aviso mat-icon {
      flex: none;
      color: var(--accent-ink);
    }
    .semana {
      list-style: none;
      margin: 0;
      padding: 0;
      max-width: 60rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .dia {
      display: grid;
      grid-template-columns: 9rem minmax(0, 1fr);
      gap: var(--space-4);
      align-items: center;
      padding: var(--space-3) var(--space-5);
      border-bottom: 1px solid var(--border);
    }
    .dia:last-child {
      border-bottom: none;
    }
    .dia h2 {
      margin: 0;
      font: var(--text-title-sm);
    }
    .tramos {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      align-items: center;
    }
    .tramo {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding-left: var(--space-4);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-pill);
      background: var(--surface);
    }
    .hora {
      font: var(--text-time);
      font-variant-numeric: tabular-nums;
    }
    .eliminar {
      --mat-icon-button-icon-color: var(--danger-ink);
    }
    .sin-tramos {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 3rem;
      font: var(--text-body-sm);
      color: var(--ink-muted);
    }
    .sin-tramos mat-icon {
      width: 1.125rem;
      height: 1.125rem;
      font-size: 1.125rem;
    }
    .error {
      color: var(--danger-ink);
    }
    .vacio {
      padding: 1.5rem 0;
      color: var(--ink-muted);
    }
    @media (max-width: 45rem) {
      .dia {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--space-2);
        padding: var(--space-4);
      }
      .tramo {
        width: 100%;
        justify-content: space-between;
        min-height: 3rem;
      }
      .hora {
        margin-right: auto;
      }
    }
  `,
})
export class HorarioList {
  private readonly servicio = inject(HorarioService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly dialogo = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  private readonly odontologoId = this.ruta.snapshot.paramMap.get('odontologoId') as string;

  /** El odontólogo llega a su propio horario y no tiene la lista de odontólogos a la que volver. */
  protected readonly puedeVolverALaLista = inject(AuthService).rol() === 'ADMINISTRADOR';

  private readonly datos = signal<Horario[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly filas = computed(() =>
    [...this.datos()].sort(
      (a, b) => a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio),
    ),
  );

  /** Los siete días, también los vacíos: «no atiende» es información, no un hueco. */
  protected readonly semana = computed(() =>
    DIAS_SEMANA.map((dia) => ({
      ...dia,
      tramos: this.filas().filter((f) => f.diaSemana === dia.valor),
    })),
  );

  constructor() {
    this.cargar();
  }

  protected nombreDia(valor: number): string {
    return DIAS_SEMANA.find((d) => d.valor === valor)?.nombre ?? String(valor);
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.listar(this.odontologoId).subscribe({
      next: (lista) => {
        // La API devuelve «09:00:00»; el horario se declara y se lee sin segundos.
        this.datos.set(
          lista.map((h) => ({
            ...h,
            horaInicio: h.horaInicio.slice(0, 5),
            horaFin: h.horaFin.slice(0, 5),
          })),
        );
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }

  protected abrirFormulario(horario: Horario | null): void {
    const datos: HorarioDialogoDatos = { odontologoId: this.odontologoId, horario };
    this.dialogo
      .open(HorarioEditDialogo, { data: datos })
      .afterClosed()
      .subscribe((guardado) => {
        if (guardado) {
          this.snackBar.open('Horario actualizado.', 'Cerrar', { duration: 4000 });
          this.cargar();
        }
      });
  }

  protected eliminar(fila: Horario): void {
    const datos: ConfirmarDatos = {
      titulo: 'Eliminar el tramo',
      mensaje: `Se eliminará el tramo del ${this.nombreDia(fila.diaSemana)} de ${fila.horaInicio} a ${fila.horaFin}.`,
      confirmar: 'Eliminar',
      destructivo: true,
      icono: 'delete',
    };

    this.dialogo
      .open(ConfirmarDialogo, { data: datos })
      .afterClosed()
      .subscribe((confirmado) => {
        if (!confirmado) {
          return;
        }
        this.servicio.eliminar(this.odontologoId, fila.id).subscribe({
          next: () => {
            this.snackBar.open('Tramo eliminado.', 'Cerrar', { duration: 4000 });
            this.cargar();
          },
          error: (err: unknown) =>
            this.snackBar.open(mensajeDeError(err), 'Cerrar', { duration: 8000 }),
        });
      });
  }
}
