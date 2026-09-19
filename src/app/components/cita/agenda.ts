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

/** Hoy a medianoche local: el calendario trabaja con fechas, no con instantes. */
function hoy(): Date {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

/**
 * El dia como lo espera la API: "YYYY-MM-DD" en hora local.
 *
 * No sirve `toISOString()`: pasa por UTC, y en Lima una fecha a medianoche
 * retrocederia al dia anterior.
 */
function aIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
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
      <!--
        El campo es de solo lectura y abre el calendario al pulsarlo: la fecha
        se marca, no se teclea. Escribirla a mano admite dias que no existen y
        formatos que el servidor rechaza con un 400 que no explica nada.
      -->
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

      <!--
        Al odontologo no se le pinta: el servidor le devuelve las suyas y
        descarta el filtro, asi que el desplegable prometeria algo que no puede
        cumplir. Lo mismo vale para la columna del odontologo en la tabla.
      -->
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
            <!--
              HU-16: solo cuando la cita esta pendiente de cierre. El servidor
              responde 409 a una que aun no ha terminado, asi que ofrecer el boton
              antes seria mandar a pulsar algo que no puede funcionar.
            -->
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
  private readonly publicoService = inject(PublicoService);
  private readonly auth = inject(AuthService);
  private readonly dialogo = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  /**
   * El odontologo ve la misma pantalla, con el ambito fijado por el servidor a
   * partir del token. Aqui solo se quita lo que para el no significa nada.
   */
  protected readonly esOdontologo = this.auth.rol() === 'ODONTOLOGO';

  /**
   * Aqui los dias sin atencion se atenuan pero **se pueden marcar**: son los
   * extremos de un rango, y consultar «del sabado al domingo» o hasta fin de mes
   * es legitimo aunque esos dias no se atienda.
   */
  protected readonly diasAbiertos = signal<CalendarioPublico | null>(null);
  protected readonly diasCerrados = computed(() => claseDeDias(this.diasAbiertos()));

  protected readonly estados = ESTADOS_CITA;
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
      // El servidor tambien lo rechaza con un 400; comprobarlo aqui ahorra el
      // viaje y explica el limite antes de pulsar.
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
    // Sin desplegable no hay nada que llenar: traer el listado entero para no
    // pintarlo seria una consulta por cada visita del odontologo a su agenda.
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
      // Sin el dato el calendario no atenua nada, que es como estaba antes.
      error: () => this.diasAbiertos.set(null),
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

  /**
   * HU-16: una cita esta pendiente de cierre cuando sigue CONFIRMADA y su hora
   * de fin ya paso (RN-09). Se calcula aqui y no viene del servidor porque la
   * agenda ya trae la fecha, la hora y la duracion, y el servidor tendria que
   * fijar un «ahora» para toda la clinica en cada fila.
   */
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
        // La fila cambio de estado y la agenda que hay delante ya no vale.
        this.cargar();
      });
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

/**
 * El instante en que termina la cita, en hora local. Se construye a partir de
 * las cadenas sin pasar por UTC: `new Date(cita.fecha)` interpretaria
 * "2026-09-14" como medianoche UTC y desplazaria el dia al huso del navegador.
 */
function finLocal(cita: CitaResumen): number {
  const [a, m, d] = cita.fecha.split('-').map(Number);
  const [hh, mm] = cita.hora.split(':').map(Number);
  return new Date(a, m - 1, d, hh, mm + cita.duracionMinutos).getTime();
}
