import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { mensajeDeError } from '../../core/http/api-error';
import { Tratamiento } from '../../models';
import { TratamientoService } from '../../services/tratamiento.service';
import { cargarTodasLasPaginas } from '../../shared/buscar-en-paginas';
import { ConfirmarDatos, ConfirmarDialogo } from '../../shared/confirmar-dialogo';

@Component({
  selector: 'app-tratamiento-list',
  imports: [
    RouterLink,
    MatButtonModule,
    MatDialogModule,
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
      <div class="dc-titular">
        <h1>Tratamientos</h1>
        <p class="dc-subtitulo">
          Lo que la clínica ofrece y cuánto dura. La duración decide cuántas franjas ocupa cada
          reserva.
        </p>
      </div>
      @if (puedeEscribir()) {
        <a mat-flat-button routerLink="/tratamientos/nuevo">
          <mat-icon>add</mat-icon>
          Nuevo tratamiento
        </a>
      }
    </header>

    <form class="dc-filtros" role="search" aria-label="Filtros de tratamientos">
      <mat-form-field appearance="outline">
        <mat-label>Buscar por código o nombre</mat-label>
        <input matInput #entrada [value]="filtro()" (input)="filtro.set(entrada.value)" />
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Especialidad</mat-label>
        <mat-select [value]="especialidad()" (selectionChange)="especialidad.set($event.value)">
          <mat-option value="">Todas</mat-option>
          @for (nombre of especialidades(); track nombre) {
            <mat-option [value]="nombre">{{ nombre }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Estado</mat-label>
        <mat-select [value]="estado()" (selectionChange)="estado.set($event.value)">
          <mat-option value="">Todos</mat-option>
          <mat-option value="activo">Activo</mat-option>
          <mat-option value="baja">De baja</mat-option>
        </mat-select>
      </mat-form-field>
    </form>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando tratamientos" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    <div class="tabla-scroll tabla-apilable" tabindex="0" role="region" aria-label="Tabla de tratamientos">
      <table mat-table [dataSource]="pagina()">
        <ng-container matColumnDef="codigo">
          <th mat-header-cell *matHeaderCellDef>Código</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Código">{{ fila.codigo }}</td>
        </ng-container>

        <ng-container matColumnDef="nombre">
          <th mat-header-cell *matHeaderCellDef>Tratamiento</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Tratamiento">
            <span class="tratamiento">
              <b>{{ fila.nombre }}</b>
              @if (fila.descripcion) {
                <small>{{ fila.descripcion }}</small>
              }
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="duracion">
          <th mat-header-cell *matHeaderCellDef>Duración</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Duración">{{ fila.duracionMinutos }} minutos</td>
        </ng-container>

        <ng-container matColumnDef="especialidad">
          <th mat-header-cell *matHeaderCellDef>Especialidad</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Especialidad">{{ fila.especialidad?.nombre || '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="activo">
          <th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Estado"><span class="dc-estado" [class.dc-estado--ok]="fila.activo" [class.dc-estado--error]="!fila.activo"><mat-icon aria-hidden="true">{{ fila.activo ? 'check_circle' : 'block' }}</mat-icon>{{ fila.activo ? 'Activo' : 'De baja' }}</span></td>
        </ng-container>

        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef class="col-acciones">Acciones</th>
          <td mat-cell *matCellDef="let fila" class="col-acciones">
            @if (puedeEscribir()) {
              <span class="dc-acciones">
                <button
                  mat-stroked-button
                  class="dc-accion"
                  type="button"
                  (click)="editar(fila)"
                  [attr.aria-label]="'Editar ' + fila.nombre"
                >
                  <mat-icon>edit</mat-icon>
                  Editar
                </button>
                @if (fila.activo) {
                  <button
                    mat-stroked-button
                    class="dc-accion dc-accion--peligro"
                    type="button"
                    (click)="darDeBaja(fila)"
                    [attr.aria-label]="'Dar de baja ' + fila.nombre"
                  >
                    <mat-icon>do_not_disturb_on</mat-icon>
                    Dar de baja
                  </button>
                }
              </span>
            }
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columnas"></tr>
        <tr mat-row *matRowDef="let fila; columns: columnas"></tr>
      </table>
    </div>

    @if (!cargando() && filas().length === 0) {
      <p class="dc-vacio">
        <mat-icon aria-hidden="true">search_off</mat-icon>
        <span>
          {{
            hayFiltros()
              ? 'Ningún tratamiento coincide con esos filtros. Prueba con otros o quítalos.'
              : 'Aún no hay tratamientos.'
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
      aria-label="Paginación de tratamientos"
    />
  `,
  styles: `
    table {
      width: 100%;
      min-width: 52rem;
    }
    .col-acciones {
      width: 15rem;
      text-align: right;
    }
    .tratamiento b {
      display: block;
      font-weight: 500;
    }
    .tratamiento small {
      display: block;
      max-width: 28rem;
      font: var(--text-body-sm);
      color: var(--ink-muted);
    }
    .error {
      color: var(--danger-ink);
    }
  `,
})
export class TratamientoList {
  private readonly servicio = inject(TratamientoService);
  private readonly auth = inject(AuthService);
  private readonly dialogo = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly columnas = ['codigo', 'nombre', 'duracion', 'especialidad', 'activo', 'acciones'];

  protected readonly datos = signal<Tratamiento[]>([]);
  protected readonly indice = signal(0);
  protected readonly tamano = signal(20);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly filtro = signal('');
  protected readonly especialidad = signal('');
  protected readonly estado = signal<'' | 'activo' | 'baja'>('');

  protected readonly puedeEscribir = computed(() => this.auth.rol() === 'ADMINISTRADOR');

  /** Las especialidades que de verdad tienen tratamientos, para no ofrecer filtros vacíos. */
  protected readonly especialidades = computed(() =>
    [...new Set(this.datos().map((t) => t.especialidad?.nombre).filter(Boolean))].sort((a, b) =>
      (a as string).localeCompare(b as string),
    ) as string[],
  );

  protected readonly hayFiltros = computed(
    () => !!(this.filtro().trim() || this.especialidad() || this.estado()),
  );

  protected readonly filas = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    const especialidad = this.especialidad();
    const estado = this.estado();
    return [...this.datos()]
      .sort((a, b) => a.codigo.localeCompare(b.codigo))
      .filter(
        (f) =>
          (!texto ||
            f.nombre.toLowerCase().includes(texto) ||
            f.codigo.toLowerCase().includes(texto)) &&
          (!especialidad || f.especialidad?.nombre === especialidad) &&
          (!estado || f.activo === (estado === 'activo')),
      );
  });

  protected readonly pagina = computed(() => {
    const desde = this.indice() * this.tamano();
    return this.filas().slice(desde, desde + this.tamano());
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    cargarTodasLasPaginas((pagina) => this.servicio.listar({ page: pagina, size: 100, sort: 'codigo,asc' })).subscribe({
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

  protected editar(fila: Tratamiento): void {
    void this.router.navigate(['/tratamientos/editar', fila.id], { state: { fila } });
  }

  protected darDeBaja(fila: Tratamiento): void {
    const datos: ConfirmarDatos = {
      titulo: 'Dar de baja el tratamiento',
      mensaje: `«${fila.nombre}» dejará de estar disponible para reservar. Es una baja lógica: el registro se conserva.`,
      confirmar: 'Dar de baja',
      destructivo: true,
      resumen: {
        nombre: fila.nombre,
        detalle: `${fila.especialidad.nombre} · ${fila.duracionMinutos} minutos`,
      },
    };

    this.dialogo
      .open(ConfirmarDialogo, { data: datos })
      .afterClosed()
      .subscribe((confirmado) => {
        if (!confirmado) {
          return;
        }
        this.servicio.darDeBaja(fila.id).subscribe({
          next: () => {
            this.snackBar.open('Tratamiento dado de baja.', 'Cerrar', { duration: 4000 });
            this.cargar();
          },
          error: (err: unknown) =>
            this.snackBar.open(mensajeDeError(err), 'Cerrar', { duration: 8000 }),
        });
      });
  }
}
