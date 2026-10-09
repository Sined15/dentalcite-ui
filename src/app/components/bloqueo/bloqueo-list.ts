import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/http/api-error';
import { Bloqueo } from '../../models';
import { AuthService } from '../../core/auth/auth.service';
import { BloqueoService } from '../../services/bloqueo.service';
import { OdontologoService } from '../../services/odontologo.service';
import { UsuarioService } from '../../services/usuario.service';
import { ConfirmarDatos, ConfirmarDialogo } from '../../shared/confirmar-dialogo';
import { miOdontologo } from '../../shared/mi-odontologo';

@Component({
  selector: 'app-bloqueo-list',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTableModule,
  ],
  template: `
    <header class="cabecera">
      <div class="dc-titular">
        <h1>Bloqueos de agenda</h1>
        <p class="dc-subtitulo">
          Cierra una franja de un odontólogo o de un consultorio: vacaciones, mantenimiento, una
          reunión. Las horas bloqueadas dejan de ofrecerse.
        </p>
      </div>
      <a mat-flat-button routerLink="/bloqueos/nuevo">
        <mat-icon>add</mat-icon>
        Nuevo bloqueo
      </a>
    </header>

    <mat-form-field appearance="outline" class="filtro">
      <mat-label>Filtrar por motivo, odontólogo o consultorio</mat-label>
      <input matInput #entrada [value]="filtro()" (input)="filtro.set(entrada.value)" />
      <mat-icon matSuffix>search</mat-icon>
    </mat-form-field>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando bloqueos" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    <div class="tabla-scroll tabla-apilable" tabindex="0" role="region" aria-label="Tabla de bloqueos de agenda">
      <table mat-table [dataSource]="pagina()">
        <ng-container matColumnDef="ambito">
          <th mat-header-cell *matHeaderCellDef>Ámbito</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Ámbito">
            @if (fila.odontologo) {
              <span class="ambito">
                <mat-icon class="icono" aria-hidden="true">person</mat-icon>
                {{ fila.odontologo }}
              </span>
            } @else if (fila.consultorio) {
              <span class="ambito">
                <mat-icon class="icono" aria-hidden="true">meeting_room</mat-icon>
                {{ fila.consultorio }}
              </span>
            } @else {
              —
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="motivo">
          <th mat-header-cell *matHeaderCellDef>Motivo</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Motivo">{{ fila.motivo }}</td>
        </ng-container>

        <ng-container matColumnDef="inicio">
          <th mat-header-cell *matHeaderCellDef>Desde</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Desde">{{ fila.fechaInicio | date: "EEEE d 'de' MMMM HH:mm" }}</td>
        </ng-container>

        <ng-container matColumnDef="fin">
          <th mat-header-cell *matHeaderCellDef>Hasta</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Hasta">{{ fila.fechaFin | date: "EEEE d 'de' MMMM HH:mm" }}</td>
        </ng-container>

        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef class="col-acciones">Acciones</th>
          <td mat-cell *matCellDef="let fila" class="col-acciones">
            @if (puedeGestionar(fila)) {
              <span class="dc-acciones">
                <button
                  mat-stroked-button
                  class="dc-accion"
                  type="button"
                  (click)="editar(fila)"
                  [attr.aria-label]="'Editar el bloqueo ' + fila.motivo"
                >
                  <mat-icon>edit</mat-icon>
                  Editar
                </button>
                <button
                  mat-stroked-button
                  class="dc-accion dc-accion--peligro"
                  type="button"
                  (click)="eliminar(fila)"
                  [attr.aria-label]="'Eliminar el bloqueo ' + fila.motivo"
                >
                  <mat-icon>delete</mat-icon>
                  Eliminar
                </button>
              </span>
            } @else {
              <span class="ajeno" aria-hidden="true">—</span>
            }
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columnas"></tr>
        <tr mat-row *matRowDef="let fila; columns: columnas"></tr>
      </table>
    </div>

    @if (!cargando() && filas().length === 0) {
      <p class="dc-vacio">
        <mat-icon aria-hidden="true">event_available</mat-icon>
        <span>
          {{
            filtro().trim()
              ? 'Ningún bloqueo coincide con esa búsqueda. Prueba con otra o bórrala.'
              : 'No hay bloqueos: toda la agenda se ofrece con normalidad.'
          }}
        </span>
      </p>
    }

    <mat-paginator
      [length]="filas().length"
      [pageSize]="tamano()"
      [pageIndex]="indice()"
      [pageSizeOptions]="[10, 20, 50]"
      (page)="cambiarPagina($event)"
      aria-label="Paginación de bloqueos"
    />
  `,
  styles: `
    .filtro {
      width: min(100%, 26rem);
      margin-bottom: var(--space-2);
    }
    table {
      width: 100%;
      min-width: 46rem;
    }
    .ambito {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      height: 1.75rem;
      padding: 0 var(--space-3);
      border-radius: var(--radius-pill);
      background: var(--surface-sunken);
      font: var(--text-label);
    }
    .icono {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }
    .col-acciones {
      width: 15rem;
      text-align: right;
    }
    .error {
      color: var(--danger-ink);
    }

    .ajeno {
      opacity: 0.5;
    }
  `,
})
export class BloqueoList {
  private readonly servicio = inject(BloqueoService);
  private readonly dialogo = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly odontologoService = inject(OdontologoService);

  protected readonly columnas = ['ambito', 'motivo', 'inicio', 'fin', 'acciones'];

  private readonly miOdontologoId = signal<string | null>(null);

  private readonly datos = signal<Bloqueo[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly filtro = signal('');
  protected readonly indice = signal(0);
  protected readonly tamano = signal(20);

  protected readonly filas = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    const filas = [...this.datos()].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));
    if (!texto) {
      return filas;
    }
    return filas.filter((f) =>
      [f.motivo, f.odontologo ?? '', f.consultorio ?? ''].some((campo) =>
        campo.toLowerCase().includes(texto),
      ),
    );
  });

  protected readonly pagina = computed(() => {
    const desde = this.indice() * this.tamano();
    return this.filas().slice(desde, desde + this.tamano());
  });

  constructor() {
    this.cargar();
    if (this.auth.rol() === 'ODONTOLOGO') {
      miOdontologo(this.usuarioService, this.odontologoService).subscribe((mio) =>
        this.miOdontologoId.set(mio?.id ?? null),
      );
    }
  }

  protected puedeGestionar(fila: Bloqueo): boolean {
    if (this.auth.rol() !== 'ODONTOLOGO') {
      return true;
    }
    const mio = this.miOdontologoId();
    return mio !== null && fila.odontologoId === mio;
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.listar().subscribe({
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

  protected cambiarPagina(evento: PageEvent): void {
    this.indice.set(evento.pageIndex);
    this.tamano.set(evento.pageSize);
  }

  protected editar(fila: Bloqueo): void {
    void this.router.navigate(['/bloqueos/editar', fila.id], { state: { fila } });
  }

  protected eliminar(fila: Bloqueo): void {
    const datos: ConfirmarDatos = {
      titulo: 'Eliminar el bloqueo',
      mensaje: `Se eliminará el bloqueo «${fila.motivo}». La agenda volverá a estar disponible en ese rango y los pacientes podrán reservar esas horas.`,
      confirmar: 'Eliminar',
      destructivo: true,
      icono: 'delete',
      resumen: {
        nombre: fila.motivo,
        detalle: [fila.consultorio ?? fila.odontologo, `${fila.fechaInicio} – ${fila.fechaFin}`]
          .filter(Boolean)
          .join(' · '),
      },
    };

    this.dialogo
      .open(ConfirmarDialogo, { data: datos })
      .afterClosed()
      .subscribe((confirmado) => {
        if (!confirmado) {
          return;
        }
        this.servicio.eliminar(fila.id).subscribe({
          next: () => {
            this.snackBar.open('Bloqueo eliminado.', 'Cerrar', { duration: 4000 });
            this.cargar();
          },
          error: (err: unknown) =>
            this.snackBar.open(mensajeDeError(err), 'Cerrar', { duration: 8000 }),
        });
      });
  }
}
