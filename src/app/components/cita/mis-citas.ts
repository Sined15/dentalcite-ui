import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/http/api-error';
import { CitaResumen } from '../../models';
import { CitaService } from '../../services/cita.service';
import { CancelarDialogo, CancelarDialogoDatos } from './cancelar-dialogo';

/**
 * Las citas del propio paciente (HU-15 · RF-18, RF-19).
 *
 * <p>No reutiliza `Agenda`: aquella es una tabla de recepción, con filtros por
 * odontólogo, columna de paciente y bitácora, y aquí nada de eso tiene sentido
 * —el paciente es uno, la bitácora es interna y el volumen es de unas pocas
 * filas—. Lo que sí se reutiliza es el diálogo de cancelación, que es donde
 * está la parte con reglas.
 *
 * <p>Las futuras y las pasadas se separan aquí y no en el servidor, igual que en
 * la ficha del paciente: allí habría que fijar qué es «ahora» para toda la
 * clínica, y el cliente ya tiene la fecha y la hora locales de cada cita.
 *
 * <p><strong>El botón de cancelar lo decide el servidor</strong>, mediante
 * `cancelablePorPaciente`. La ventana de RN-06 tiene una excepción —la cita que
 * el propio paciente reservó con poca antelación— que depende de quién la creó y
 * de cuándo; rehacer esa cuenta aquí sería tener la regla en dos sitios y con
 * dos relojes.
 */
@Component({
  selector: 'app-mis-citas',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="cabecera">
      <h1>Mis citas</h1>
      <a mat-flat-button color="primary" routerLink="/disponibilidad">
        <mat-icon>event_available</mat-icon>
        Reservar una cita
      </a>
    </div>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando mis citas" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    @if (!cargando() && citas().length === 0 && !error()) {
      <p class="vacio">Todavía no tienes ninguna cita.</p>
    }

    @if (futuras().length > 0) {
      <section>
        <h2>Próximas</h2>
        <ul class="citas">
          @for (cita of futuras(); track cita.id) {
            <li>
              <mat-card class="cita">
                <mat-card-content>
                  <div class="datos">
                    <p class="cuando">
                      {{ cita.fecha | date: "EEEE d 'de' MMMM" }} ·
                      <strong>{{ cita.hora.slice(0, 5) }}</strong>
                    </p>
                    <p class="que">
                      {{ cita.tratamiento.nombre }} · {{ cita.duracionMinutos }} min
                    </p>
                    <p class="quien">
                      {{ cita.odontologo.nombre }} · {{ cita.consultorio.nombre }}
                    </p>
                    <p class="codigo">
                      {{ cita.codigo }} ·
                      <span class="estado">{{ etiquetaEstado(cita.estado) }}</span>
                    </p>
                  </div>

                  <div class="acciones">
                    @if (cita.cancelablePorPaciente) {
                      <button
                        mat-stroked-button
                        color="warn"
                        type="button"
                        (click)="cancelar(cita)"
                        [attr.aria-label]="'Cancelar la cita ' + cita.codigo"
                      >
                        Cancelar
                      </button>
                    } @else if (cita.estado === 'CONFIRMADA') {
                      <!--
                        RN-06: pasada la ventana, la cancelacion es de recepcion.
                        Se dice por que en vez de pintar un boton deshabilitado sin
                        explicacion, que es lo que obliga a llamar para averiguarlo.
                      -->
                      <p class="fuera-de-plazo">
                        Ya no puedes cancelarla por aquí. Llama a la recepción de la clínica.
                      </p>
                    }
                  </div>
                </mat-card-content>
              </mat-card>
            </li>
          }
        </ul>
      </section>
    }

    @if (pasadas().length > 0) {
      <section>
        <h2>Anteriores</h2>
        <ul class="citas">
          @for (cita of pasadas(); track cita.id) {
            <li>
              <mat-card class="cita pasada">
                <mat-card-content>
                  <div class="datos">
                    <p class="cuando">
                      {{ cita.fecha | date: "d 'de' MMMM 'de' y" }} ·
                      {{ cita.hora.slice(0, 5) }}
                    </p>
                    <p class="que">{{ cita.tratamiento.nombre }}</p>
                    <p class="quien">{{ cita.odontologo.nombre }}</p>
                    <p class="codigo">
                      {{ cita.codigo }} ·
                      <span class="estado">{{ etiquetaEstado(cita.estado) }}</span>
                    </p>
                    @if (cita.motivoCancelacion) {
                      <p class="motivo">Motivo: {{ cita.motivoCancelacion }}</p>
                    }
                  </div>
                </mat-card-content>
              </mat-card>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    .cabecera {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      margin: 0;
    }
    h2 {
      font-size: 1.125rem;
      margin: 1.5rem 0 0.75rem;
    }
    .citas {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .cita mat-card-content {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      justify-content: space-between;
    }
    .datos {
      min-width: 0;
    }
    .datos p {
      margin: 0 0 0.125rem;
    }
    /* es-PE escribe el dia de la semana en minuscula; capitalizar la frase
       entera daria «Lunes 14 De Septiembre». */
    .cuando::first-letter {
      text-transform: uppercase;
    }
    .que,
    .quien {
      font-size: 0.9375rem;
    }
    /* Color propio en vez de opacidad: al 70 % el contraste caia por debajo del
       4.5:1 que exige RNF-08. */
    .codigo,
    .motivo,
    .fuera-de-plazo {
      font-size: 0.8125rem;
      color: var(--mat-sys-on-surface-variant, #45464f);
    }
    .estado {
      font-weight: 600;
    }
    .pasada .estado {
      font-weight: 500;
    }
    .acciones {
      display: flex;
      align-items: center;
    }
    .fuera-de-plazo {
      margin: 0;
      max-width: 16rem;
      text-align: right;
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
    }
    .vacio {
      padding: 1.5rem 0;
      color: var(--mat-sys-on-surface-variant, #45464f);
    }

    /* RNF-09: a 360px la tarjeta pasa a una columna y el aviso deja de ir
       alineado a la derecha, donde quedaria en un hilo de dos palabras. */
    @media (max-width: 480px) {
      .cita mat-card-content {
        flex-direction: column;
        align-items: stretch;
      }
      .acciones button {
        width: 100%;
      }
      .fuera-de-plazo {
        max-width: none;
        text-align: left;
      }
    }
  `,
})
export class MisCitas {
  private readonly servicio = inject(CitaService);
  private readonly dialogo = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly citas = signal<CitaResumen[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly futuras = computed(() => this.reparto().futuras);
  protected readonly pasadas = computed(() => this.reparto().pasadas);

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    // Sin rango: el criterio pide ver las futuras y las pasadas. El tamaño es
    // holgado porque un paciente no acumula cientos de citas, y paginar una
    // lista que se lee de un vistazo estorbaría más de lo que ayuda.
    this.servicio.mias({}, { size: 100 }).subscribe({
      next: (pagina) => {
        this.citas.set(pagina.content);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.citas.set([]);
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }

  protected cancelar(cita: CitaResumen): void {
    // Sin nombrar al paciente: es quien está mirando.
    const datos: CancelarDialogoDatos = { cita, mostrarPaciente: false };
    this.dialogo
      .open(CancelarDialogo, { data: datos })
      .afterClosed()
      .subscribe((cancelada) => {
        if (!cancelada) {
          return;
        }
        this.snackBar.open(`Cita ${cita.codigo} cancelada.`, 'Cerrar', { duration: 6000 });
        // La fila cambió de estado y, con ella, si las demás se pueden cancelar.
        this.cargar();
      });
  }

  protected etiquetaEstado(estado: string): string {
    switch (estado) {
      case 'CONFIRMADA':
        return 'Confirmada';
      case 'ATENDIDA':
        return 'Atendida';
      case 'NO_ASISTIO':
        return 'No asististe';
      case 'CANCELADA':
        return 'Cancelada';
      default:
        return estado;
    }
  }

  /**
   * Futura es la que todavía no ha empezado. Se compara construyendo la fecha
   * local a partir de las cadenas, sin pasar por UTC: `new Date(cita.fecha)`
   * interpretaría "2026-09-14" como medianoche UTC y desplazaría el día entero
   * al huso del navegador.
   */
  private reparto(): { futuras: CitaResumen[]; pasadas: CitaResumen[] } {
    const ahora = Date.now();
    const futuras: CitaResumen[] = [];
    const pasadas: CitaResumen[] = [];

    for (const cita of this.citas()) {
      if (instanteLocal(cita.fecha, cita.hora) >= ahora) {
        futuras.push(cita);
      } else {
        pasadas.push(cita);
      }
    }
    // Las próximas, de la más cercana a la más lejana: la de mañana primero.
    futuras.reverse();
    return { futuras, pasadas };
  }
}

function instanteLocal(fecha: string, hora: string): number {
  const [a, m, d] = fecha.split('-').map(Number);
  const [hh, mm] = hora.split(':').map(Number);
  return new Date(a, m - 1, d, hh, mm).getTime();
}
