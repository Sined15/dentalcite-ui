import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { mensajeDeError } from '../../core/http/api-error';
import { CitaResumen, ESTADOS_CITA, EstadoCita, Odontologo } from '../../models';
import { CitaService } from '../../services/cita.service';
import { OdontologoService } from '../../services/odontologo.service';
import { cargarTodasLasPaginas } from '../../shared/buscar-en-paginas';
import { CancelarDialogo, CancelarDialogoDatos } from './cancelar-dialogo';
import { HistorialDialogo, HistorialDialogoDatos } from './historial-dialogo';

/** Hoy en formato "YYYY-MM-DD", sin pasar por UTC. */
function hoy(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

/**
 * La agenda de la clinica (HU-11 · RF-18, RF-20, RF-21).
 *
 * Solo RECEPCIONISTA y ADMINISTRADOR: expone las citas de todos los pacientes.
 * Que el paciente vea y cancele las suyas es HU-15, con la ventana de RN-06.
 *
 * Arranca en el dia de hoy porque «las citas del dia» es el caso que la historia
 * nombra; el rango se ensancha desde ahi.
 *
 * La paginacion es del **servidor**, no como en los catalogos: una agenda crece
 * sin techo con el tiempo, asi que traerla entera para cortarla en el navegador
 * dejaria de funcionar justo cuando la clinica llevara tiempo operando.
 */
@Component({
  selector: 'app-agenda',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule,
  ],
  template: `
    <header class="cabecera">
      <h1>Agenda</h1>
    </header>

    <form [formGroup]="formulario" (ngSubmit)="consultar()" class="filtros">
      <mat-form-field appearance="outline">
        <mat-label>Desde</mat-label>
        <input matInput type="date" formControlName="desde" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Hasta</mat-label>
        <input matInput type="date" formControlName="hasta" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Odontólogo</mat-label>
        <mat-select formControlName="odontologoId">
          <mat-option value="">Todos</mat-option>
          @for (odontologo of odontologos(); track odontologo.id) {
            <mat-option [value]="odontologo.id">
              {{ odontologo.nombres }} {{ odontologo.apellidos }}
            </mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Estado</mat-label>
        <mat-select formControlName="estado">
          <mat-option value="">Todos</mat-option>
          @for (estado of estados; track estado) {
            <mat-option [value]="estado">{{ etiquetaEstado(estado) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <button mat-flat-button color="primary" type="submit" [disabled]="formulario.invalid">
        <mat-icon>search</mat-icon>
        Consultar
      </button>
    </form>

    @if (formulario.hasError('rangoInvertido')) {
      <p class="error" role="alert">La fecha «desde» no puede ser posterior a «hasta».</p>
    }

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando la agenda" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    <div class="tabla-scroll" tabindex="0" role="region" aria-label="Tabla de citas">
      <table mat-table [dataSource]="citas()">
        <ng-container matColumnDef="hora">
          <th mat-header-cell *matHeaderCellDef>Hora</th>
          <td mat-cell *matCellDef="let fila">
            <strong>{{ fila.hora.slice(0, 5) }}</strong>
            <span class="dia">{{ fila.fecha | date: 'd MMM' }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="paciente">
          <th mat-header-cell *matHeaderCellDef>Paciente</th>
          <td mat-cell *matCellDef="let fila">
            {{ fila.paciente.nombre }}
            <span class="historia">{{ fila.paciente.numeroHistoria }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="odontologo">
          <th mat-header-cell *matHeaderCellDef>Odontólogo</th>
          <td mat-cell *matCellDef="let fila">{{ fila.odontologo.nombre }}</td>
        </ng-container>

        <ng-container matColumnDef="tratamiento">
          <th mat-header-cell *matHeaderCellDef>Tratamiento</th>
          <td mat-cell *matCellDef="let fila">
            {{ fila.tratamiento.nombre }}
            <span class="dia">{{ fila.duracionMinutos }} min</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="consultorio">
          <th mat-header-cell *matHeaderCellDef>Consultorio</th>
          <td mat-cell *matCellDef="let fila">{{ fila.consultorio.nombre }}</td>
        </ng-container>

        <ng-container matColumnDef="estado">
          <th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let fila">
            <span class="estado" [class.cancelada]="fila.estado === 'CANCELADA'">
              {{ etiquetaEstado(fila.estado) }}
            </span>
            @if (fila.motivoCancelacion) {
              <span class="dia">{{ fila.motivoCancelacion }}</span>
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef class="col-acciones">Acciones</th>
          <td mat-cell *matCellDef="let fila" class="col-acciones">
            <button
              mat-icon-button
              type="button"
              (click)="verHistorial(fila)"
              [attr.aria-label]="'Ver el historial de ' + fila.codigo"
            >
              <mat-icon>history</mat-icon>
            </button>
            <button
              mat-icon-button
              type="button"
              color="warn"
              [disabled]="fila.estado !== 'CONFIRMADA'"
              (click)="cancelar(fila)"
              [attr.aria-label]="'Cancelar la cita ' + fila.codigo"
            >
              <mat-icon>event_busy</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columnas"></tr>
        <tr mat-row *matRowDef="let fila; columns: columnas"></tr>
      </table>
    </div>

    @if (!cargando() && citas().length === 0) {
      <p class="vacio">No hay citas en ese rango.</p>
    }

    <mat-paginator
      [length]="total()"
      [pageSize]="tamano()"
      [pageIndex]="indice()"
      [pageSizeOptions]="[10, 20, 50]"
      (page)="cambiarPagina($event)"
      aria-label="Paginación de la agenda"
    />
  `,
  styles: `
    .cabecera {
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      margin: 0;
    }
    .filtros {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    .filtros mat-form-field {
      width: min(100%, 14rem);
    }
    .filtros button {
      margin-top: 0.5rem;
    }
    .tabla-scroll {
      overflow-x: auto;
    }
    table {
      width: 100%;
      min-width: 52rem;
    }
    .dia,
    .historia {
      display: block;
      font-size: 0.8rem;
      opacity: 0.7;
    }
    .estado.cancelada {
      text-decoration: line-through;
      opacity: 0.7;
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

    /* RNF-09: a 360px la tabla sigue leyendose desplazandola en horizontal, y
       los filtros pasan a una columna en vez de apretarse. */
    @media (max-width: 480px) {
      .filtros mat-form-field {
        width: 100%;
      }
      .filtros button {
        width: 100%;
      }
    }
  `,
})
export class Agenda {
  private readonly servicio = inject(CitaService);
  private readonly odontologoService = inject(OdontologoService);
  private readonly dialogo = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  protected readonly estados = ESTADOS_CITA;
  protected readonly columnas = [
    'hora',
    'paciente',
    'odontologo',
    'tratamiento',
    'consultorio',
    'estado',
    'acciones',
  ];

  protected readonly odontologos = signal<Odontologo[]>([]);
  protected readonly citas = signal<CitaResumen[]>([]);
  protected readonly total = signal(0);
  protected readonly indice = signal(0);
  protected readonly tamano = signal(20);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = this.fb.nonNullable.group(
    {
      desde: [hoy(), Validators.required],
      hasta: [hoy(), Validators.required],
      odontologoId: [''],
      estado: ['' as EstadoCita | ''],
    },
    {
      // El servidor tambien lo rechaza con un 400; comprobarlo aqui ahorra el
      // viaje y explica el limite antes de pulsar.
      validators: (grupo) => {
        const desde = grupo.get('desde')?.value as string;
        const hasta = grupo.get('hasta')?.value as string;
        if (!desde || !hasta) {
          return null;
        }
        return desde > hasta ? { rangoInvertido: true } : null;
      },
    },
  );

  constructor() {
    cargarTodasLasPaginas((pagina) =>
      this.odontologoService.listar({ page: pagina, size: 100 }),
    ).subscribe({
      next: (lista) => this.odontologos.set(lista.filter((o) => o.activo)),
      error: (err: unknown) => this.error.set(mensajeDeError(err)),
    });

    this.consultar();
  }

  protected etiquetaEstado(estado: EstadoCita): string {
    return estado === 'NO_ASISTIO' ? 'No asistió' : estado.charAt(0) + estado.slice(1).toLowerCase();
  }

  /** Consultar reinicia la paginacion: la pagina 3 de otra busqueda no significa nada. */
  protected consultar(): void {
    this.indice.set(0);
    this.cargar();
  }

  protected cargar(): void {
    if (this.formulario.invalid || this.cargando()) {
      return;
    }
    const valores = this.formulario.getRawValue();

    this.cargando.set(true);
    this.error.set(null);

    this.servicio
      .listar(
        {
          desde: valores.desde,
          hasta: valores.hasta,
          odontologoId: valores.odontologoId || undefined,
          estado: valores.estado || undefined,
        },
        { page: this.indice(), size: this.tamano() },
      )
      .subscribe({
        next: (pagina) => {
          this.citas.set(pagina.content);
          this.total.set(pagina.totalElements);
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.error.set(mensajeDeError(err));
          this.citas.set([]);
          this.total.set(0);
          this.cargando.set(false);
        },
      });
  }

  protected cambiarPagina(evento: PageEvent): void {
    this.indice.set(evento.pageIndex);
    this.tamano.set(evento.pageSize);
    this.cargar();
  }

  protected verHistorial(cita: CitaResumen): void {
    const datos: HistorialDialogoDatos = { cita };
    this.dialogo.open(HistorialDialogo, { data: datos });
  }

  protected cancelar(cita: CitaResumen): void {
    // Recepcion atiende citas de terceros: de quien es tiene que verse.
    const datos: CancelarDialogoDatos = { cita, mostrarPaciente: true };
    this.dialogo
      .open(CancelarDialogo, { data: datos })
      .afterClosed()
      .subscribe((cancelada) => {
        if (!cancelada) {
          return;
        }
        this.snackBar.open(`Cita ${cita.codigo} cancelada. Su franja vuelve a ofrecerse.`, 'Cerrar', {
          duration: 6000,
        });
        // La fila cambio de estado y la agenda que hay delante ya no vale.
        this.cargar();
      });
  }
}
