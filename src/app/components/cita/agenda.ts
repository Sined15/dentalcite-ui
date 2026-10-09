import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../core/auth/auth.service';
import { mensajeDeError } from '../../core/http/api-error';
import {
  CalendarioPublico,
  Cita,
  CitaResumen,
  ESTADOS_CITA,
  EstadoCita,
  Odontologo,
} from '../../models';
import { CitaService } from '../../services/cita.service';
import { PublicoService } from '../../services/publico.service';
import { OdontologoService } from '../../services/odontologo.service';
import { cargarTodasLasPaginas } from '../../shared/buscar-en-paginas';
import { claseDeDias } from '../../shared/dias-de-atencion';
import { CancelarDialogo, CancelarDialogoDatos } from './cancelar-dialogo';
import { avisoDeResultado, ResultadoDialogo, ResultadoDialogoDatos } from './resultado-dialogo';
import { HistorialDialogo, HistorialDialogoDatos } from './historial-dialogo';

function hoy(): Date {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

function aIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

@Component({
  selector: 'app-agenda',
  providers: [provideNativeDateAdapter()],
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
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
      <h1>{{ esOdontologo ? 'Mi agenda' : 'Agenda' }}</h1>
    </header>

    <form [formGroup]="formulario" (ngSubmit)="consultar()" class="filtros">
      <mat-form-field appearance="outline">
        <mat-label>Desde</mat-label>
        <input
          matInput
          readonly
          [matDatepicker]="calendarioDesde"
          formControlName="desde"
          (click)="calendarioDesde.open()"
        />
        <mat-datepicker-toggle matIconSuffix [for]="calendarioDesde" />
        <mat-datepicker #calendarioDesde [dateClass]="diasCerrados()" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Hasta</mat-label>
        <input
          matInput
          readonly
          [matDatepicker]="calendarioHasta"
          [min]="formulario.controls.desde.value"
          formControlName="hasta"
          (click)="calendarioHasta.open()"
        />
        <mat-datepicker-toggle matIconSuffix [for]="calendarioHasta" />
        <mat-datepicker #calendarioHasta [dateClass]="diasCerrados()" />
      </mat-form-field>

      @if (!esOdontologo) {
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
      }

      <mat-form-field appearance="outline">
        <mat-label>Estado</mat-label>
        <mat-select formControlName="estado">
          <mat-option value="">Todos</mat-option>
          @for (estado of estados; track estado) {
            <mat-option [value]="estado">{{ etiquetaEstado(estado) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <button mat-flat-button type="submit" [disabled]="formulario.invalid">
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

    @if (!cargando() && citas().length > 0) {
      <p class="resumen">
        <strong>{{ total() }} {{ total() === 1 ? 'cita' : 'citas' }}</strong>
        @for (grupo of conteo(); track grupo.estado) {
          <span [class]="'dc-estado dc-estado--' + tonoEstado(grupo.estado)">
            <mat-icon aria-hidden="true">{{ iconoEstado(grupo.estado) }}</mat-icon>
            {{ grupo.n }} {{ etiquetaConteo(grupo.estado, grupo.n) }}
          </span>
        }
      </p>
    }

    <div class="tabla-scroll tabla-apilable" tabindex="0" role="region" aria-label="Tabla de citas">
      <table mat-table [dataSource]="citas()">
        <ng-container matColumnDef="hora">
          <th mat-header-cell *matHeaderCellDef>Hora</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Hora">
            <span class="valor">
              <strong class="hora">{{ fila.hora.slice(0, 5) }}</strong>
              <span class="dia">{{ fila.fecha | date: 'd MMM' }}</span>
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="paciente">
          <th mat-header-cell *matHeaderCellDef>Paciente</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Paciente">
            <span class="valor">
              {{ fila.paciente.nombre }}
              <span class="historia">{{ fila.paciente.numeroHistoria }}</span>
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="odontologo">
          <th mat-header-cell *matHeaderCellDef>Odontólogo</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Odontólogo">{{ fila.odontologo.nombre }}</td>
        </ng-container>

        <ng-container matColumnDef="tratamiento">
          <th mat-header-cell *matHeaderCellDef>Tratamiento</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Tratamiento">
            <span class="valor">
              {{ fila.tratamiento.nombre }}
              <span class="dia">{{ fila.duracionMinutos }} min</span>
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="consultorio">
          <th mat-header-cell *matHeaderCellDef>Consultorio</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Consultorio">{{ fila.consultorio.nombre }}</td>
        </ng-container>

        <ng-container matColumnDef="estado">
          <th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Estado">
            <span class="valor">
              <span [class]="'dc-estado dc-estado--' + tonoEstado(fila.estado)">
                <mat-icon aria-hidden="true">{{ iconoEstado(fila.estado) }}</mat-icon>
                {{ etiquetaEstado(fila.estado) }}
              </span>
              @if (fila.motivoCancelacion) {
                <span class="dia">{{ fila.motivoCancelacion }}</span>
              }
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef class="col-acciones">Acciones</th>
          <td mat-cell *matCellDef="let fila" class="col-acciones">
            @if (!esOdontologo) {
              <button
                mat-icon-button
                type="button"
                (click)="verHistorial(fila)"
                [attr.aria-label]="'Ver el historial de ' + fila.codigo"
              >
                <mat-icon>history</mat-icon>
              </button>
            }
            @if (pendienteDeCierre(fila)) {
              <button
                mat-icon-button
                type="button"
                (click)="registrarResultado(fila)"
                [attr.aria-label]="'Registrar el resultado de ' + fila.codigo"
              >
                <mat-icon>fact_check</mat-icon>
              </button>
            }
            @if (!esOdontologo) {
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
            }
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
    .filtros {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: flex-start;
      margin-bottom: 1.25rem;
      padding: var(--space-5) var(--space-5) var(--space-2);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
    }
    .filtros mat-form-field {
      width: min(100%, 14rem);
    }
    .filtros button {
      margin-top: 0.5rem;
    }
    .resumen {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      margin: 0 0 var(--space-4);
      font: var(--text-body-sm);
      color: var(--ink-muted);
    }
    .resumen strong {
      color: var(--ink);
    }
    table {
      width: 100%;
      min-width: 52rem;
    }
    .hora {
      font: var(--text-time);
      font-variant-numeric: tabular-nums;
    }
    .historia {
      font: var(--text-code);
    }
    .valor {
      min-width: 0;
    }
    .dia,
    .historia {
      display: block;
      font-size: 0.8rem;
      opacity: 0.7;
    }
    .col-acciones {
      width: 7rem;
      text-align: right;
    }
    .error {
      color: var(--danger-ink);
    }
    .vacio {
      padding: 1.5rem 0;
      opacity: 0.7;
    }

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
  private readonly publicoService = inject(PublicoService);
  private readonly auth = inject(AuthService);
  private readonly dialogo = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  protected readonly esOdontologo = this.auth.rol() === 'ODONTOLOGO';

  protected readonly diasAbiertos = signal<CalendarioPublico | null>(null);
  protected readonly diasCerrados = computed(() => claseDeDias(this.diasAbiertos()));

  protected readonly estados = ESTADOS_CITA;

  /** Cuántas citas de la página hay en cada estado; los estados vacíos no se muestran. */
  protected readonly conteo = computed(() =>
    ESTADOS_CITA.map((estado) => ({
      estado,
      n: this.citas().filter((cita) => cita.estado === estado).length,
    })).filter((grupo) => grupo.n > 0),
  );

  protected etiquetaConteo(estado: EstadoCita, n: number): string {
    const plural = n !== 1;
    switch (estado) {
      case 'CONFIRMADA':
        return plural ? 'confirmadas' : 'confirmada';
      case 'ATENDIDA':
        return plural ? 'atendidas' : 'atendida';
      case 'NO_ASISTIO':
        return 'no asistió';
      default:
        return plural ? 'canceladas' : 'cancelada';
    }
  }
  protected readonly columnas = [
    'hora',
    'paciente',
    ...(this.esOdontologo ? [] : ['odontologo']),
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
      validators: (grupo) => {
        const desde = grupo.get('desde')?.value as Date | null;
        const hasta = grupo.get('hasta')?.value as Date | null;
        if (!desde || !hasta) {
          return null;
        }
        return desde.getTime() > hasta.getTime() ? { rangoInvertido: true } : null;
      },
    },
  );

  constructor() {
    if (!this.esOdontologo) {
      cargarTodasLasPaginas((pagina) =>
        this.odontologoService.listar({ page: pagina, size: 100 }),
      ).subscribe({
        next: (lista) => this.odontologos.set(lista.filter((o) => o.activo)),
        error: (err: unknown) => this.error.set(mensajeDeError(err)),
      });
    }

    this.publicoService.calendario().subscribe({
      next: (dias) => this.diasAbiertos.set(dias),
      error: () => this.diasAbiertos.set(null),
    });

    this.consultar();
  }

  protected etiquetaEstado(estado: EstadoCita): string {
    return estado === 'NO_ASISTIO' ? 'No asistió' : estado.charAt(0) + estado.slice(1).toLowerCase();
  }

  protected tonoEstado(estado: EstadoCita): 'info' | 'ok' | 'aviso' | 'error' {
    switch (estado) {
      case 'CONFIRMADA':
        return 'info';
      case 'ATENDIDA':
        return 'ok';
      case 'NO_ASISTIO':
        return 'aviso';
      default:
        return 'error';
    }
  }

  protected iconoEstado(estado: EstadoCita): string {
    switch (estado) {
      case 'CONFIRMADA':
        return 'schedule';
      case 'ATENDIDA':
        return 'check_circle';
      case 'NO_ASISTIO':
        return 'warning';
      default:
        return 'cancel';
    }
  }

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
          desde: aIso(valores.desde),
          hasta: aIso(valores.hasta),
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

  protected pendienteDeCierre(cita: CitaResumen): boolean {
    if (cita.estado !== 'CONFIRMADA') {
      return false;
    }
    return finLocal(cita) < Date.now();
  }

  protected registrarResultado(cita: CitaResumen): void {
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

  protected cancelar(cita: CitaResumen): void {
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
        this.cargar();
      });
  }
}

function finLocal(cita: CitaResumen): number {
  const [a, m, d] = cita.fecha.split('-').map(Number);
  const [hh, mm] = cita.hora.split(':').map(Number);
  return new Date(a, m - 1, d, hh, mm + cita.duracionMinutos).getTime();
}
