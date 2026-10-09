import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, forkJoin, switchMap, tap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { mensajeDeError } from '../../core/http/api-error';
import {
  CalendarioPublico,
  Cita,
  DIAS_MAXIMOS,
  DisponibilidadResponse,
  OdontologoPublico,
  Paciente,
  TratamientoPublico,
} from '../../models';
import { DisponibilidadService } from '../../services/disponibilidad.service';
import { PacienteService } from '../../services/paciente.service';
import { PublicoService } from '../../services/publico.service';
import { filtroDeDias, seAtiende } from '../../shared/dias-de-atencion';
import { BloqueAgrupado, DiaAgrupado, agruparFranjas } from './agrupar-franjas';
import { CitaReservadaDialogo } from './cita-reservada-dialogo';
import { IdentificarseDialogo, IdentificarseDialogoDatos } from './identificarse-dialogo';
import { ReservarDialogo, ReservarDialogoDatos, ReservarResultado } from './reservar-dialogo';

@Component({
  selector: 'app-disponibilidad',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <header class="encabezado">
      <h1>Pedir cita</h1>
      <p class="sub">
        Elige un tratamiento y mira qué horas hay libres.
        @if (visitante()) {
          Puedes consultar sin cuenta; la necesitarás al reservar.
        }
      </p>
    </header>

    <div class="disposicion">
    <mat-card class="tarjeta" appearance="outlined">
      <mat-card-content>
        <form [formGroup]="formulario" (ngSubmit)="consultar()">
          @if (reservaParaOtro()) {
            <mat-form-field appearance="outline">
              <mat-label>Paciente</mat-label>
              <input
                matInput
                formControlName="paciente"
                [matAutocomplete]="autoPaciente"
                placeholder="Documento, apellidos o número de historia"
                autocomplete="off"
              />
              <mat-autocomplete
                #autoPaciente="matAutocomplete"
                [displayWith]="mostrarPaciente"
                (optionSelected)="elegirPaciente($event.option.value)"
              >
                @for (p of pacientes(); track p.id) {
                  <mat-option [value]="p">
                    {{ p.apellidos }}, {{ p.nombres }} · {{ p.numeroHistoria }}
                  </mat-option>
                }
              </mat-autocomplete>
              @if (pacienteElegido(); as elegido) {
                <mat-hint>Reservando para {{ elegido.numeroHistoria }}</mat-hint>
              } @else {
                <mat-hint>Busca al paciente antes de elegir la franja.</mat-hint>
              }
            </mat-form-field>
          }

          <mat-form-field appearance="outline">
            <mat-label>Tratamiento</mat-label>
            <mat-select formControlName="tratamientoId">
              @for (tra of tratamientos(); track tra.id) {
                <mat-option [value]="tra.id">
                  {{ tra.nombre }} · {{ tra.duracionMinutos }} min
                </mat-option>
              }
            </mat-select>
            @if (formulario.controls.tratamientoId.hasError('required')) {
              <mat-error>Debes elegir un tratamiento</mat-error>
            }
          </mat-form-field>
          <p class="duracion">
            <mat-icon aria-hidden="true">schedule</mat-icon>
            @if (duracionElegida(); as minutos) {
              {{ minutos }} minutos por sesión
            } @else {
              La duración de la cita es la del tratamiento.
            }
          </p>

          <mat-form-field appearance="outline">
            <mat-label>Odontólogo</mat-label>
            <mat-select formControlName="odontologoId">
              <mat-option value="">Cualquier odontólogo</mat-option>
              @for (odo of odontologosAptos(); track odo.id) {
                <mat-option [value]="odo.id">{{ odo.nombres }} {{ odo.apellidos }}</mat-option>
              }
            </mat-select>
            @if (tratamientoElegido() && odontologosAptos().length === 0) {
              <mat-hint
                >Ningún odontólogo tiene la especialidad que exige este tratamiento.</mat-hint
              >
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Día en el que quieres venir</mat-label>
            <input
              matInput
              readonly
              [matDatepicker]="calendario"
              [min]="minimoConsultable"
              [max]="maximoConsultable"
              [matDatepickerFilter]="soloDiasConAtencion()"
              formControlName="dia"
              (click)="calendario.open()"
            />
            <mat-datepicker-toggle matIconSuffix [for]="calendario" />
            <mat-datepicker #calendario />
            @if (formulario.controls.dia.hasError('required')) {
              <mat-error>Marca el día en el calendario</mat-error>
            }
          </mat-form-field>

          <p class="nota">
            <mat-icon aria-hidden="true">info</mat-icon>
            <span>
              Las citas se reservan con al menos dos horas de antelación, así que las franjas más
              inmediatas no aparecen.
            </span>
          </p>
          @if (visitante()) {
            <p class="nota">
              <mat-icon aria-hidden="true">info</mat-icon>
              <span>
                Puedes consultar sin cuenta. Para reservar la franja que elijas te pediremos
                iniciar sesión o registrarte, y volverás a ella sin repetir la búsqueda.
              </span>
            </p>
          }

          <div class="acciones">
            <button
              mat-flat-button
              type="submit"
              [disabled]="formulario.invalid || cargando()"
            >
              <mat-icon>search</mat-icon>
              Consultar
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>

    <div class="derecha">
    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Buscando franjas disponibles" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    @if (ultimaReserva(); as cita) {
      <div class="reservada" role="status">
        <mat-icon aria-hidden="true">event_available</mat-icon>
        <div>
          <strong>Cita reservada · {{ cita.codigo }}</strong>
          <span>
            {{ cita.fecha | date: "EEEE d 'de' MMMM" }}, {{ cita.hora.slice(0, 5) }} ·
            {{ cita.odontologo.nombre }} · {{ cita.consultorio.nombre }}
          </span>
        </div>
      </div>
    }

    @if (consultado() && !cargando() && !error()) {
      <section class="resultados">
        <div class="resumen">
          <p role="status">{{ resumen() }}</p>
        </div>

        @for (dia of dias(); track dia.fecha) {
          <section class="dia">
            <h2>{{ dia.fecha | date: "EEEE d 'de' MMMM" }}</h2>
            <p class="cuenta">
              {{ dia.bloques.length }} {{ dia.bloques.length === 1 ? 'franja' : 'franjas' }}
            </p>
            <ul class="franjas">
              @for (bloque of dia.bloques; track bloque.inicio) {
                <li>
                  @if (puedeReservar()) {
                    <button
                      type="button"
                      class="franja pulsable"
                      (click)="abrirReserva(dia, bloque)"
                      [attr.aria-label]="etiquetaAccesible(dia, bloque)"
                    >
                      <span class="hora">{{ bloque.inicio }}</span>
                      <span class="quien">{{ etiqueta(bloque) }}</span>
                    </button>
                  } @else {
                    <div class="franja">
                      <span class="hora">{{ bloque.inicio }}</span>
                      <span class="quien" [attr.title]="nombres(bloque)">{{
                        etiqueta(bloque)
                      }}</span>
                    </div>
                  }
                </li>
              }
            </ul>
          </section>
        } @empty {
          <p class="vacio">
            <mat-icon aria-hidden="true">event_busy</mat-icon>
            No hay franjas disponibles para ese tratamiento en el rango elegido. Prueba con otras
            fechas o con otro odontólogo.
          </p>
        }
      </section>
    }
    </div>
    </div>
  `,
  styles: `
    .encabezado {
      margin-bottom: var(--space-6);
    }
    h1 {
      font: var(--text-display-md);
      letter-spacing: -0.015em;
      margin: 0;
    }
    .sub {
      margin: var(--space-2) 0 0;
      max-width: var(--layout-prose);
      color: var(--ink-muted);
    }
    .disposicion {
      display: grid;
      grid-template-columns: minmax(0, 20rem) minmax(0, 1fr);
      gap: var(--space-8);
      align-items: start;
    }
    .tarjeta {
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: none;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }
    .duracion {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      margin: 0 0 var(--space-3);
      font: var(--text-label);
      color: var(--ink-muted);
    }
    .duracion mat-icon {
      width: 1rem;
      height: 1rem;
      font-size: 1rem;
    }
    .nota {
      display: flex;
      gap: var(--space-3);
      align-items: flex-start;
      margin: var(--space-2) 0 0;
      padding: var(--space-3) var(--space-4);
      background: var(--accent-soft);
      border-radius: var(--radius-md);
      font: var(--text-body-sm);
    }
    .nota mat-icon {
      flex: none;
      color: var(--accent-ink);
    }
    .acciones {
      display: flex;
      margin-top: var(--space-4);
    }
    .acciones button {
      width: 100%;
    }
    .derecha {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      min-width: 0;
    }
    .resultados {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
      padding: var(--space-6);
      background: var(--surface-sunken);
      border-radius: var(--radius-lg);
    }
    .resumen p {
      margin: 0;
      font: var(--text-body-sm);
      color: var(--ink-muted);
    }
    .dia h2 {
      font: var(--text-title-md);
      margin: 0;
    }
    .dia h2::first-letter {
      text-transform: uppercase;
    }
    .cuenta {
      margin: 2px 0 0;
      font: var(--text-body-sm);
      color: var(--ink-muted);
    }
    .franjas {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
      gap: var(--space-3);
      list-style: none;
      margin: var(--space-4) 0 0;
      padding: 0;
    }
    .franja {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      width: 100%;
      min-height: 3.5rem;
      padding: var(--space-3) var(--space-4);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      background: var(--surface);
      text-align: left;
    }
    .pulsable {
      color: var(--ink);
      font: inherit;
      cursor: pointer;
    }
    .pulsable:hover {
      border-color: var(--brand);
      background: var(--brand-soft);
    }
    .reservada {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      background: var(--brand-soft);
      color: var(--on-brand-soft);
    }
    .reservada div {
      display: flex;
      flex-direction: column;
    }
    .reservada span {
      font: var(--text-body-sm);
    }
    .hora {
      font: var(--text-time);
      font-variant-numeric: tabular-nums;
    }
    .quien {
      font: 400 0.75rem/1rem var(--font-sans);
      color: var(--ink-muted);
    }
    .error {
      color: var(--danger-ink);
      font: var(--text-body-sm);
    }
    .vacio {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-2);
      margin: 0;
      padding: var(--space-5);
      background: var(--surface);
      border: 1px dashed var(--border-strong);
      border-radius: var(--radius-md);
      color: var(--ink-muted);
    }
    .vacio mat-icon {
      width: 1.75rem;
      height: 1.75rem;
      font-size: 1.75rem;
      color: var(--ink-faint);
    }
    @media (max-width: 60rem) {
      .disposicion {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--space-6);
      }
    }
    @media (max-width: 40rem) {
      h1 {
        font-size: 1.75rem;
        line-height: 1.18;
      }
      .resultados {
        padding: var(--space-4);
      }
      .franjas {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `,
})
export class Disponibilidad {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(DisponibilidadService);
  private readonly pacienteService = inject(PacienteService);
  private readonly publicoService = inject(PublicoService);
  private readonly dialogo = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly auth = inject(AuthService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly visitante = computed(() => !this.auth.estaAutenticado());

  private franjaPendiente: string | null = null;

  protected readonly reservaParaOtro = computed(() => {
    const rol = this.auth.rol();
    return rol === 'RECEPCIONISTA' || rol === 'ADMINISTRADOR';
  });

  protected readonly pacientes = signal<Paciente[]>([]);
  protected readonly pacienteElegido = signal<Paciente | null>(null);

  protected readonly puedeReservar = computed(() => {
    if (this.visitante() || this.auth.rol() === 'PACIENTE') {
      return true;
    }
    return this.reservaParaOtro() && this.pacienteElegido() !== null;
  });
  protected readonly ultimaReserva = signal<Cita | null>(null);

  protected readonly tratamientos = signal<TratamientoPublico[]>([]);
  protected readonly odontologos = signal<OdontologoPublico[]>([]);
  protected readonly respuesta = signal<DisponibilidadResponse | null>(null);
  protected readonly consultado = signal(false);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly minimoConsultable = hoy();
  protected readonly maximoConsultable = sumarDias(hoy(), DIAS_MAXIMOS - 1);

  protected readonly formulario = this.fb.nonNullable.group({
    paciente: [null as Paciente | string | null],
    tratamientoId: ['', [Validators.required]],
    odontologoId: [''],
    dia: [this.minimoConsultable as Date | null, [Validators.required]],
  });

  protected readonly diasAbiertos = signal<CalendarioPublico | null>(null);

  protected readonly odontologoElegido = toSignal(
    this.formulario.controls.odontologoId.valueChanges,
    { initialValue: '' },
  );

  protected readonly soloDiasConAtencion = computed(() =>
    filtroDeDias(this.diasAbiertos(), this.odontologoElegido() || null),
  );

  protected readonly tratamientoElegido = toSignal(
    this.formulario.controls.tratamientoId.valueChanges,
    { initialValue: '' },
  );

  protected readonly odontologosAptos = computed<OdontologoPublico[]>(() => {
    const tratamiento = this.tratamientos().find((t) => t.id === this.tratamientoElegido());
    if (!tratamiento) {
      return [];
    }
    return this.odontologos().filter((o) =>
      o.especialidadIds.includes(tratamiento.especialidadId),
    );
  });

  protected readonly duracionElegida = computed(
    () => this.tratamientos().find((t) => t.id === this.tratamientoElegido())?.duracionMinutos ?? null,
  );

  protected readonly dias = computed(() => agruparFranjas(this.respuesta()));

  protected readonly resumen = computed(() => {
    const dias = this.dias();
    if (dias.length === 0) {
      return 'Sin franjas disponibles.';
    }
    const franjas = dias.reduce((total, dia) => total + dia.bloques.length, 0);
    return `${franjas} ${franjas === 1 ? 'franja' : 'franjas'} en ${dias.length} ${
      dias.length === 1 ? 'día' : 'días'
    }.`;
  });

  constructor() {
    forkJoin({
      tratamientos: this.publicoService.tratamientos(),
      odontologos: this.publicoService.odontologos(),
    }).subscribe({
      next: ({ tratamientos, odontologos }) => {
        this.tratamientos.set(tratamientos);
        this.odontologos.set(odontologos);
        this.restaurarBusquedaDeLaUrl(tratamientos, odontologos);
      },
      error: (err: unknown) => this.error.set(mensajeDeError(err)),
    });

    this.publicoService.calendario().subscribe({
      next: (dias) => this.diasAbiertos.set(dias),
      error: () => this.diasAbiertos.set(null),
    });

    effect(() => {
      const dias = this.diasAbiertos();
      const odontologo = this.odontologoElegido();
      const elegido = this.formulario.controls.dia.value;
      if (elegido && !seAtiende(dias, elegido, odontologo || null)) {
        this.formulario.controls.dia.setValue(null);
      }
    });

    effect(() => {
      const aptos = this.odontologosAptos();
      const elegido = this.formulario.controls.odontologoId.value;
      if (elegido && !aptos.some((o) => o.id === elegido)) {
        this.formulario.controls.odontologoId.setValue('');
      }
    });

    if (this.reservaParaOtro()) {
      this.prepararBusquedaDePacientes();
      this.precargarPacienteDeLaUrl();
    }
  }

  private prepararBusquedaDePacientes(): void {
    this.formulario.controls.paciente.valueChanges
      .pipe(
        tap((valor) => {
          if (typeof valor === 'string') {
            this.pacienteElegido.set(null);
          }
        }),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((valor) => {
          const termino = typeof valor === 'string' ? valor.trim() : '';
          if (termino.length < 2) {
            this.pacientes.set([]);
            return [];
          }
          return this.pacienteService.buscar(termino, { size: 10 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (pagina) => this.pacientes.set(pagina.content),
        error: (err: unknown) => this.error.set(mensajeDeError(err)),
      });
  }

  private restaurarBusquedaDeLaUrl(
    tratamientos: TratamientoPublico[],
    odontologos: OdontologoPublico[],
  ): void {
    const query = this.ruta.snapshot.queryParamMap;
    const id = query.get('tratamientoId');
    if (!id || !tratamientos.some((t) => t.id === id)) {
      return;
    }
    this.formulario.controls.tratamientoId.setValue(id);

    const odontologoId = query.get('odontologoId');
    if (odontologoId && odontologos.some((o) => o.id === odontologoId)) {
      this.formulario.controls.odontologoId.setValue(odontologoId);
    }

    const dia = deIso(query.get('dia'));
    if (!dia || dia < this.minimoConsultable || dia > this.maximoConsultable) {
      return;
    }
    this.formulario.controls.dia.setValue(dia);
    this.franjaPendiente = query.get('inicio');
    this.consultar();
  }

  private reabrirFranjaPendiente(): void {
    const inicio = this.franjaPendiente;
    this.franjaPendiente = null;
    if (!inicio) {
      return;
    }

    const fecha = this.formulario.controls.dia.value;
    const dia = this.dias().find((d) => fecha && d.fecha === aIso(fecha));
    const bloque = dia?.bloques.find((b) => b.inicio === inicio);

    if (!dia || !bloque) {
      this.snackBar.open(
        'La franja que elegiste ya no está disponible. Elige otra de la lista.',
        'Cerrar',
        { duration: 8000 },
      );
    } else if (!this.visitante() && !this.reservaParaOtro()) {
      this.abrirReserva(dia, bloque);
    }

    const url = this.router.parseUrl(this.router.url);
    delete url.queryParams['inicio'];
    void this.router.navigateByUrl(url, { replaceUrl: true });
  }

  private precargarPacienteDeLaUrl(): void {
    const id = this.ruta.snapshot.queryParamMap.get('pacienteId');
    if (!id) {
      return;
    }
    this.pacienteService.obtener(id).subscribe({
      next: (detalle) => {
        this.pacienteElegido.set(detalle);
        this.formulario.controls.paciente.setValue(detalle, { emitEvent: false });
      },
      error: (err: unknown) => this.error.set(mensajeDeError(err)),
    });
  }

  protected mostrarPaciente(paciente: Paciente | string | null): string {
    if (!paciente || typeof paciente === 'string') {
      return typeof paciente === 'string' ? paciente : '';
    }
    return `${paciente.apellidos}, ${paciente.nombres} · ${paciente.numeroHistoria}`;
  }

  protected elegirPaciente(paciente: Paciente): void {
    this.pacienteElegido.set(paciente);
  }

  protected consultar(): void {
    if (this.formulario.invalid || this.cargando()) {
      return;
    }
    const valores = this.formulario.getRawValue();
    if (!valores.dia) {
      return;
    }
    const dia = aIso(valores.dia);

    this.cargando.set(true);
    this.error.set(null);

    this.servicio
      .consultar({
        tratamientoId: valores.tratamientoId,
        odontologoId: valores.odontologoId || undefined,
        desde: dia,
        hasta: dia,
      })
      .subscribe({
        next: (respuesta) => {
          this.respuesta.set(respuesta);
          this.consultado.set(true);
          this.cargando.set(false);
          this.reabrirFranjaPendiente();
        },
        error: (err: unknown) => {
          this.franjaPendiente = null;
          this.respuesta.set(null);
          this.consultado.set(true);
          this.cargando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }

  protected abrirReserva(dia: DiaAgrupado, bloque: BloqueAgrupado): void {
    const tratamiento = this.tratamientos().find((t) => t.id === this.tratamientoElegido());
    if (!tratamiento) {
      return;
    }

    if (this.visitante()) {
      this.pedirIdentificacion(dia, bloque);
      return;
    }

    const paciente = this.pacienteElegido();
    const datos: ReservarDialogoDatos = {
      tratamientoId: tratamiento.id,
      tratamientoNombre: tratamiento.nombre,
      duracionMinutos: tratamiento.duracionMinutos,
      fecha: dia.fecha,
      bloque,
      paciente:
        this.reservaParaOtro() && paciente
          ? {
              id: paciente.id,
              nombre: `${paciente.apellidos}, ${paciente.nombres}`,
              numeroHistoria: paciente.numeroHistoria,
            }
          : undefined,
    };

    this.dialogo
      .open(ReservarDialogo, { data: datos })
      .afterClosed()
      .subscribe((resultado: ReservarResultado | null | undefined) => {
        if (!resultado) {
          return;
        }

        if (resultado.cita) {
          this.ultimaReserva.set(resultado.cita);
          this.dialogo.open(CitaReservadaDialogo, { data: resultado.cita });
          this.consultar();
          return;
        }

        if (resultado.recargar) {
          this.snackBar.open(resultado.recargar, 'Cerrar', { duration: 8000 });
          this.consultar();
        }
      });
  }

  private pedirIdentificacion(dia: DiaAgrupado, bloque: BloqueAgrupado): void {
    const valores = this.formulario.getRawValue();
    const returnUrl = this.router
      .createUrlTree(['/disponibilidad'], {
        queryParams: {
          tratamientoId: valores.tratamientoId,
          odontologoId: valores.odontologoId || undefined,
          dia: dia.fecha,
          inicio: bloque.inicio,
        },
      })
      .toString();
    const tratamiento = this.tratamientos().find((t) => t.id === valores.tratamientoId);
    const datos: IdentificarseDialogoDatos = {
      returnUrl,
      franja: tratamiento
        ? {
            tratamiento: tratamiento.nombre,
            fecha: dia.fecha,
            hora: bloque.inicio,
            odontologo: this.etiqueta(bloque),
          }
        : undefined,
    };
    this.dialogo.open(IdentificarseDialogo, { data: datos });
  }

  protected etiquetaAccesible(dia: DiaAgrupado, bloque: BloqueAgrupado): string {
    return `Reservar el ${dia.fecha} a las ${bloque.inicio} con ${this.nombres(bloque)}`;
  }

  protected etiqueta(bloque: BloqueAgrupado): string {
    if (bloque.odontologos.length === 1) {
      return bloque.odontologos[0].nombre;
    }
    return `${bloque.odontologos.length} odontólogos`;
  }

  protected nombres(bloque: BloqueAgrupado): string {
    return bloque.odontologos.map((o) => o.nombre).join(', ');
  }
}

function hoy(): Date {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);
}

function aIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function deIso(texto: string | null): Date | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto ?? '');
  if (!partes) {
    return null;
  }
  const fecha = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  return aIso(fecha) === texto ? fecha : null;
}
