import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { mensajeDeError } from '../../core/http/api-error';
import { Cita, CitaResumen } from '../../models';
import { CitaService } from '../../services/cita.service';
import { avisoDeResultado, ResultadoDialogo, ResultadoDialogoDatos } from './resultado-dialogo';

@Component({
  selector: 'app-pendientes-cierre',
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTableModule,
  ],
  template: `
    <div class="cabecera">
      <h1>Pendientes de cierre</h1>
      <p class="ayuda">
        Citas confirmadas cuya hora de fin ya pasó y todavía no tienen resultado. Las más antiguas,
        primero.
      </p>
    </div>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando las citas pendientes de cierre" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    <div
      class="tabla-scroll tabla-apilable"
      tabindex="0"
      role="region"
      aria-label="Tabla de citas pendientes de cierre"
    >
      <table mat-table [dataSource]="citas()">
        <ng-container matColumnDef="cuando">
          <th mat-header-cell *matHeaderCellDef>Cuándo</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Cuándo">
            {{ fila.fecha | date: 'd MMM y' }}
            <span class="dia">{{ fila.hora.slice(0, 5) }} · {{ fila.duracionMinutos }} min</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="paciente">
          <th mat-header-cell *matHeaderCellDef>Paciente</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Paciente">
            {{ fila.paciente.nombre }}
            <span class="dia">{{ fila.paciente.numeroHistoria }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="odontologo">
          <th mat-header-cell *matHeaderCellDef>Odontólogo</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Odontólogo">{{ fila.odontologo.nombre }}</td>
        </ng-container>

        <ng-container matColumnDef="tratamiento">
          <th mat-header-cell *matHeaderCellDef>Tratamiento</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Tratamiento">{{ fila.tratamiento.nombre }}</td>
        </ng-container>

        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef class="col-acciones">Acciones</th>
          <td mat-cell *matCellDef="let fila" class="col-acciones">
            <button
              mat-stroked-button
              type="button"
              (click)="registrar(fila)"
              [attr.aria-label]="'Registrar el resultado de ' + fila.codigo"
            >
              <mat-icon>fact_check</mat-icon>
              Registrar
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columnas"></tr>
        <tr mat-row *matRowDef="let fila; columns: columnas"></tr>
      </table>
    </div>

    @if (!cargando() && citas().length === 0 && !error()) {
      <p class="vacio">No queda ninguna cita pendiente de cierre.</p>
    }

    <mat-paginator
      [length]="total()"
      [pageSize]="tamano()"
      [pageIndex]="indice()"
      [pageSizeOptions]="[10, 20, 50]"
      (page)="cambiarPagina($event)"
      aria-label="Paginación de las citas pendientes de cierre"
    />
  `,
  styles: `
    .ayuda,
    .dia,
    .vacio {
      color: var(--ink-muted);
    }
    .ayuda {
      margin: 0.25rem 0 0;
      max-width: var(--layout-prose);
    }
    table {
      width: 100%;
      min-width: 46rem;
    }
    .dia {
      display: block;
      font-size: 0.8rem;
    }
    .col-acciones {
      width: 10rem;
      text-align: right;
    }
    .error {
      color: var(--danger-ink);
    }
    .vacio {
      padding: 1.5rem 0;
    }
  `,
})
export class PendientesCierre {
  private readonly servicio = inject(CitaService);
  private readonly dialogo = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly columnas = ['cuando', 'paciente', 'odontologo', 'tratamiento', 'acciones'];

  protected readonly citas = signal<CitaResumen[]>([]);
  protected readonly total = signal(0);
  protected readonly indice = signal(0);
  protected readonly tamano = signal(20);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.servicio.pendientesDeCierre({ page: this.indice(), size: this.tamano() }).subscribe({
      next: (pagina) => {
        this.citas.set(pagina.content);
        this.total.set(pagina.totalElements);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.citas.set([]);
        this.total.set(0);
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }

  protected cambiarPagina(evento: PageEvent): void {
    this.indice.set(evento.pageIndex);
    this.tamano.set(evento.pageSize);
    this.cargar();
  }

  protected registrar(cita: CitaResumen): void {
    const datos: ResultadoDialogoDatos = { cita };
    this.dialogo
      .open(ResultadoDialogo, { data: datos })
      .afterClosed()
      .subscribe((cerrada: Cita | false | undefined) => {
        if (!cerrada) {
          return;
        }
        this.snackBar.open(avisoDeResultado(cerrada), 'Cerrar', { duration: 6000 });
        this.cargar();
      });
  }
}
