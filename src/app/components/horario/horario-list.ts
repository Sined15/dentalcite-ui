import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/http/api-error';
import { DIAS_SEMANA, Horario } from '../../models';
import { HorarioService } from '../../services/horario.service';
import { ConfirmarDatos, ConfirmarDialogo } from '../../shared/confirmar-dialogo';
import { HorarioEditDialogo, HorarioDialogoDatos } from './horario-edit-dialogo';

@Component({
  selector: 'app-horario-list',
  imports: [
    RouterLink,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
  ],
  template: `
    <header class="cabecera">
      <div>
        <a mat-button routerLink="/odontologos">
          <mat-icon>arrow_back</mat-icon>
          Odontologos
        </a>
        <h1>Horario de atencion</h1>
      </div>
      <button mat-flat-button color="primary" type="button" (click)="abrirFormulario(null)">
        <mat-icon>add</mat-icon>
        Nuevo tramo
      </button>
    </header>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando horario" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    <div class="tabla-scroll" tabindex="0" role="region" aria-label="Tabla de tramos de horario">
      <table mat-table [dataSource]="filas()">
        <ng-container matColumnDef="dia">
          <th mat-header-cell *matHeaderCellDef>Dia</th>
          <td mat-cell *matCellDef="let fila">{{ nombreDia(fila.diaSemana) }}</td>
        </ng-container>

        <ng-container matColumnDef="inicio">
          <th mat-header-cell *matHeaderCellDef>Desde</th>
          <td mat-cell *matCellDef="let fila">{{ fila.horaInicio }}</td>
        </ng-container>

        <ng-container matColumnDef="fin">
          <th mat-header-cell *matHeaderCellDef>Hasta</th>
          <td mat-cell *matCellDef="let fila">{{ fila.horaFin }}</td>
        </ng-container>

        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef class="col-acciones">Acciones</th>
          <td mat-cell *matCellDef="let fila" class="col-acciones">
            <button
              mat-icon-button
              type="button"
              (click)="abrirFormulario(fila)"
              [attr.aria-label]="'Editar el tramo del ' + nombreDia(fila.diaSemana)"
            >
              <mat-icon>edit</mat-icon>
            </button>
            <button
              mat-icon-button
              type="button"
              color="warn"
              (click)="eliminar(fila)"
              [attr.aria-label]="'Eliminar el tramo del ' + nombreDia(fila.diaSemana)"
            >
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columnas"></tr>
        <tr mat-row *matRowDef="let fila; columns: columnas"></tr>
      </table>
    </div>

    @if (!cargando() && filas().length === 0) {
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
    h1 {
      font-size: 1.5rem;
      margin: 0.5rem 0 0;
    }
    .tabla-scroll {
      overflow-x: auto;
    }
    table {
      width: 100%;
      min-width: 32rem;
    }
    .col-acciones {
      width: 7rem;
      text-align: right;
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
    }
    .vacio {
      padding: 1.5rem 0;
      opacity: 0.7;
    }
  `,
})
export class HorarioList {
  private readonly servicio = inject(HorarioService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly dialogo = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  private readonly odontologoId = this.ruta.snapshot.paramMap.get('odontologoId') as string;

  protected readonly columnas = ['dia', 'inicio', 'fin', 'acciones'];

  private readonly datos = signal<Horario[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Listado plano: se ordena en cliente por dia y hora. */
  protected readonly filas = computed(() =>
    [...this.datos()].sort(
      (a, b) => a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio),
    ),
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
        this.datos.set(lista);
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

  /** Aqui el borrado es real: este recurso si expone DELETE. */
  protected eliminar(fila: Horario): void {
    const datos: ConfirmarDatos = {
      titulo: 'Eliminar el tramo',
      mensaje: `Se eliminara el tramo del ${this.nombreDia(fila.diaSemana)} de ${fila.horaInicio} a ${fila.horaFin}.`,
      confirmar: 'Eliminar',
      destructivo: true,
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
