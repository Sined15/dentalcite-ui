import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { mensajeDeError } from '../../core/http/api-error';
import { Cita } from '../../models';
import { CitaService } from '../../services/cita.service';
import { BloqueAgrupado } from './agrupar-franjas';

/**
 * Lo que devuelve el dialogo al cerrarse.
 *
 * RF-16 pide que, cuando la franja se ocupa entre la consulta y la confirmacion,
 * el sistema informe «y recalcule la disponibilidad». Informar es del servidor;
 * recalcular es del portal, y para eso el dialogo tiene que decir si lo que fallo
 * invalida la lista de franjas que hay detras.
 */
export interface ReservarResultado {
  /** La cita creada, cuando la reserva prospero. */
  cita?: Cita;
  /** El aviso a mostrar cuando la franja dejo de estar disponible (409). */
  recargar?: string;
}

/** A quien pertenece la cita cuando no la reserva el propio paciente (HU-14). */
export interface ReservarPara {
  /** Identificador de la ficha, que es lo que viaja como `pacienteId`. */
  id: string;
  nombre: string;
  numeroHistoria: string;
}

export interface ReservarDialogoDatos {
  tratamientoId: string;
  tratamientoNombre: string;
  duracionMinutos: number;
  /** "YYYY-MM-DD". */
  fecha: string;
  bloque: BloqueAgrupado;
  /**
   * Ausente cuando reserva el propio paciente (HU-09). Presente cuando reserva
   * recepcion (HU-14): entonces se muestra de quien es la cita, porque quien
   * confirma no es quien va a venir.
   */
  paciente?: ReservarPara;
}

/**
 * Confirmacion de la reserva (HU-09 · RF-15, HU-14 · RF-17).
 *
 * RF-15 concede al paciente «reservar eligiendo tratamiento, odontologo y
 * franja», asi que el bloque no se reserva a ciegas: se ofrecen los odontologos
 * libres en el y las horas exactas de cada uno. Es para lo que
 * {@code agruparFranjas} conserva los inicios en vez de descartarlos al agrupar
 * de treinta en treinta. Cuando solo hay una opcion de cada, viene elegida.
 */
@Component({
  selector: 'app-reservar-dialogo',
  imports: [DatePipe, FormsModule, MatButtonModule, MatDialogModule, MatRadioModule],
  template: `
    <h2 mat-dialog-title>Reservar cita</h2>
    <mat-dialog-content>
      <p class="resumen">
        <strong>{{ datos.tratamientoNombre }}</strong> · {{ datos.duracionMinutos }} min<br />
        {{ datos.fecha | date: "EEEE d 'de' MMMM" }}
      </p>

      <!--
        Recepcion confirma citas de otras personas una detras de otra: de quien
        es esta tiene que estar delante al pulsar, no dos pantallas atras.
      -->
      @if (datos.paciente; as paciente) {
        <p class="para">
          Para <strong>{{ paciente.nombre }}</strong>
          <span class="historia">Historia clínica {{ paciente.numeroHistoria }}</span>
        </p>
      }

      @if (odontologos.length > 1) {
        <fieldset>
          <legend>Odontólogo</legend>
          <mat-radio-group [(ngModel)]="odontologoElegido" (ngModelChange)="cambiarOdontologo()">
            @for (odo of odontologos; track odo.id) {
              <mat-radio-button [value]="odo.id">{{ odo.nombre }}</mat-radio-button>
            }
          </mat-radio-group>
        </fieldset>
      } @else {
        <p class="unico">
          Con <strong>{{ odontologos[0].nombre }}</strong>
        </p>
      }

      @if (horasDisponibles().length > 1) {
        <fieldset>
          <legend>Hora</legend>
          <mat-radio-group [(ngModel)]="horaElegida">
            @for (hora of horasDisponibles(); track hora) {
              <mat-radio-button [value]="hora">{{ hora }}</mat-radio-button>
            }
          </mat-radio-group>
        </fieldset>
      } @else {
        <p class="unico">
          A las <strong>{{ horasDisponibles()[0] }}</strong>
        </p>
      }

      <p class="nota">El consultorio se asigna automáticamente al confirmar.</p>

      @if (error(); as mensaje) {
        <p class="error" role="alert">{{ mensaje }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close(null)">Cancelar</button>
      <button
        mat-flat-button
        color="primary"
        type="button"
        [disabled]="enviando()"
        (click)="confirmar()"
      >
        Confirmar reserva
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .resumen {
      margin: 0 0 1rem;
    }
    fieldset {
      border: none;
      padding: 0;
      margin: 0 0 1rem;
    }
    legend {
      font-size: 0.875rem;
      opacity: 0.8;
      margin-bottom: 0.5rem;
    }
    mat-radio-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    /* Las horas caben en fila; a 360 px se reparten en varias. */
    .horas mat-radio-group {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .unico {
      margin: 0 0 0.75rem;
    }
    .para {
      margin: 0 0 1rem;
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      background: var(--mat-sys-surface-container-highest, #e2e2e6);
      display: flex;
      flex-direction: column;
    }
    .historia {
      font-size: 0.8125rem;
      color: var(--mat-sys-on-surface-variant, #45464f);
    }
    /* Color propio en vez de opacidad: al 75 % el contraste caia a 4.45:1
       sobre el fondo del dialogo, por debajo del 4.5:1 que exige RNF-08. */
    .nota {
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant, #45464f);
      margin: 0.5rem 0 0;
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
      font-size: 0.875rem;
      margin: 0.75rem 0 0;
    }
  `,
})
export class ReservarDialogo {
  private readonly servicio = inject(CitaService);

  protected readonly dialogRef =
    inject<MatDialogRef<ReservarDialogo, ReservarResultado | null>>(MatDialogRef);
  protected readonly datos = inject<ReservarDialogoDatos>(MAT_DIALOG_DATA);

  protected readonly odontologos = this.datos.bloque.odontologos;
  protected odontologoElegido = this.odontologos[0].id;
  protected horaElegida = this.odontologos[0].inicios[0];

  private readonly odontologoActual = signal(this.odontologos[0].id);

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Cada odontólogo tiene sus propios huecos dentro del bloque. */
  protected readonly horasDisponibles = computed<string[]>(() => {
    const id = this.odontologoActual();
    return this.odontologos.find((o) => o.id === id)?.inicios ?? [];
  });

  protected cambiarOdontologo(): void {
    this.odontologoActual.set(this.odontologoElegido);
    // La hora elegida puede no existir en la agenda del nuevo odontólogo.
    const horas = this.horasDisponibles();
    if (!horas.includes(this.horaElegida)) {
      this.horaElegida = horas[0];
    }
  }

  protected confirmar(): void {
    if (this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.error.set(null);

    const paciente = this.datos.paciente;
    this.servicio
      .reservar({
        tratamientoId: this.datos.tratamientoId,
        odontologoId: this.odontologoElegido,
        fecha: this.datos.fecha,
        hora: this.horaElegida,
        // Ausente, no vacio: cuando reserva el propio paciente la clave no
        // viaja siquiera. El servidor responde 403 a un PACIENTE que la mande,
        // aunque sea su propia ficha, asi que mandarla con `undefined` seria
        // fiarlo todo a que JSON.stringify la descarte.
        ...(paciente ? { pacienteId: paciente.id } : {}),
      })
      .subscribe({
        next: (cita) => {
          this.enviando.set(false);
          this.dialogRef.close({ cita });
        },
        error: (err: unknown) => {
          this.enviando.set(false);
          const mensaje = mensajeDeError(err);

          // Un 409 significa que el mundo cambio debajo: la franja se ocupo, o la
          // cuota se agoto. Seguir mirando la lista vieja es peor que refrescarla,
          // asi que se cierra y la pantalla recalcula (RF-16).
          if (err instanceof HttpErrorResponse && err.status === 409) {
            this.dialogRef.close({ recargar: mensaje });
            return;
          }

          // El 422 de RN-05 no invalida nada: la franja sigue ahi y el paciente
          // puede elegir otra hora sin rehacer la seleccion.
          this.error.set(mensaje);
        },
      });
  }
}
