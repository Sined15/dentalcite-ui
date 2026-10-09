import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { mensajeDeError } from '../../core/http/api-error';
import { Odontologo } from '../../models';
import { OdontologoService } from '../../services/odontologo.service';
import { cargarTodasLasPaginas } from '../../shared/buscar-en-paginas';
import { ConfirmarDatos, ConfirmarDialogo } from '../../shared/confirmar-dialogo';
import { visualDeEspecialidad } from '../../shared/especialidad-visual';

@Component({
  selector: 'app-odontologo-list',
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
        <h1>Odontólogos</h1>
        <p class="dc-subtitulo">
          El equipo clínico: su registro profesional y las especialidades que ejerce.
        </p>
      </div>
      @if (puedeEscribir()) {
        <a mat-flat-button routerLink="/odontologos/nuevo">
          <mat-icon>add</mat-icon>
          Registrar odontólogo
        </a>
      }
    </header>

    <form class="dc-filtros" role="search" aria-label="Filtros de odontólogos">
      <mat-form-field appearance="outline">
        <mat-label>Buscar por nombre o COP</mat-label>
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
      <mat-progress-bar mode="indeterminate" aria-label="Cargando odontólogos" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    <div class="tabla-scroll tabla-apilable" tabindex="0" role="region" aria-label="Tabla de odontólogos">
      <table mat-table [dataSource]="pagina()">
        <ng-container matColumnDef="nombre">
          <th mat-header-cell *matHeaderCellDef>Odontólogo</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Odontólogo">
            <span class="dc-persona" [attr.data-spec]="principal(fila)">
              <span class="dc-avatar" aria-hidden="true">{{ iniciales(fila) }}</span>
              <span>
                <b>{{ fila.nombres }} {{ fila.apellidos }}</b>
                <small class="cop">{{ fila.cop }}</small>
              </span>
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="especialidades">
          <th mat-header-cell *matHeaderCellDef>Especialidades</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Especialidades">
            <span class="dc-etiquetas">
              @for (esp of fila.especialidades; track esp.id) {
                <span class="dc-etiqueta" [attr.data-spec]="visual(esp.nombre).clave">{{
                  esp.nombre
                }}</span>
              } @empty {
                <span>—</span>
              }
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="activo">
          <th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Estado"><span class="dc-estado" [class.dc-estado--ok]="fila.activo" [class.dc-estado--error]="!fila.activo"><mat-icon aria-hidden="true">{{ fila.activo ? 'check_circle' : 'block' }}</mat-icon>{{ fila.activo ? 'Activo' : 'De baja' }}</span></td>
        </ng-container>

        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef class="col-acciones">Acciones</th>
          <td mat-cell *matCellDef="let fila" class="col-acciones">
            <span class="dc-acciones">
              <a
                mat-stroked-button
                class="dc-accion"
                [routerLink]="['/odontologos', fila.id, 'horarios']"
                [attr.aria-label]="'Horario de ' + fila.nombres"
              >
                <mat-icon>schedule</mat-icon>
                Horario
              </a>
              @if (puedeEscribir()) {
                <button
                  mat-stroked-button
                  class="dc-accion"
                  type="button"
                  (click)="editar(fila)"
                  [attr.aria-label]="'Editar ' + fila.nombres"
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
                    [attr.aria-label]="'Dar de baja ' + fila.nombres"
                  >
                    <mat-icon>do_not_disturb_on</mat-icon>
                    Dar de baja
                  </button>
                }
              }
            </span>
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
              ? 'Ningún odontólogo coincide con esos filtros. Prueba con otros o quítalos.'
              : 'Aún no hay odontólogos registrados.'
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
      aria-label="Paginación de odontólogos"
    />
  `,
  styles: `
    table {
      width: 100%;
      min-width: 56rem;
    }
    .col-acciones {
      width: 22rem;
      text-align: right;
    }
    .cop {
      font: var(--text-code);
    }
    .error {
      color: var(--danger-ink);
    }
  `,
})
export class OdontologoList {
  private readonly servicio = inject(OdontologoService);
  private readonly auth = inject(AuthService);
  private readonly dialogo = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly columnas = ['nombre', 'especialidades', 'activo', 'acciones'];

  protected readonly datos = signal<Odontologo[]>([]);
  protected readonly indice = signal(0);
  protected readonly tamano = signal(20);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly filtro = signal('');
  protected readonly especialidad = signal('');
  protected readonly estado = signal<'' | 'activo' | 'baja'>('');

  protected readonly visual = visualDeEspecialidad;

  protected readonly puedeEscribir = computed(() => this.auth.rol() === 'ADMINISTRADOR');

  protected readonly especialidades = computed(() =>
    [...new Set(this.datos().flatMap((o) => o.especialidades.map((e) => e.nombre)))].sort((a, b) =>
      a.localeCompare(b),
    ),
  );

  protected readonly hayFiltros = computed(
    () => !!(this.filtro().trim() || this.especialidad() || this.estado()),
  );

  protected readonly filas = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    const especialidad = this.especialidad();
    const estado = this.estado();
    return [...this.datos()]
      .sort((a, b) => a.apellidos.localeCompare(b.apellidos))
      .filter(
        (f) =>
          (!texto ||
            `${f.nombres} ${f.apellidos}`.toLowerCase().includes(texto) ||
            f.cop.toLowerCase().includes(texto)) &&
          (!especialidad || f.especialidades.some((e) => e.nombre === especialidad)) &&
          (!estado || f.activo === (estado === 'activo')),
      );
  });

  protected iniciales(o: Odontologo): string {
    return (o.nombres.charAt(0) + o.apellidos.charAt(0)).toUpperCase();
  }

  /** El color del avatar es el de la primera especialidad que ejerce. */
  protected principal(o: Odontologo): string | null {
    return visualDeEspecialidad(o.especialidades[0]?.nombre).clave;
  }

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
    cargarTodasLasPaginas((pagina) => this.servicio.listar({ page: pagina, size: 100 })).subscribe({
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

  protected editar(fila: Odontologo): void {
    void this.router.navigate(['/odontologos/editar', fila.id], { state: { fila } });
  }

  protected darDeBaja(fila: Odontologo): void {
    const datos: ConfirmarDatos = {
      titulo: 'Dar de baja al odontólogo',
      mensaje: `${fila.nombres} ${fila.apellidos} dejará de estar disponible para reservar. Es una baja lógica: el registro se conserva.`,
      confirmar: 'Dar de baja',
      destructivo: true,
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
            this.snackBar.open('Odontólogo dado de baja.', 'Cerrar', { duration: 4000 });
            this.cargar();
          },
          error: (err: unknown) =>
            this.snackBar.open(mensajeDeError(err), 'Cerrar', { duration: 8000 }),
        });
      });
  }
}
