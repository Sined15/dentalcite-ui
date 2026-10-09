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
import { AuthService } from '../../core/auth/auth.service';
import { mensajeDeError } from '../../core/http/api-error';
import { Especialidad } from '../../models';
import { EspecialidadService } from '../../services/especialidad.service';
import { cargarTodasLasPaginas } from '../../shared/buscar-en-paginas';
import { ConfirmarDatos, ConfirmarDialogo } from '../../shared/confirmar-dialogo';
import { visualDeEspecialidad } from '../../shared/especialidad-visual';

@Component({
  selector: 'app-especialidad-list',
  imports: [
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
        <h1>Especialidades</h1>
        <p class="dc-subtitulo">
          Las áreas en que se organiza la clínica. Cada tratamiento y cada odontólogo cuelga de
          una o varias.
        </p>
      </div>
      @if (puedeEscribir()) {
        <a mat-flat-button routerLink="/especialidades/nuevo">
          <mat-icon>add</mat-icon>
          Nueva especialidad
        </a>
      }
    </header>

    <p class="dc-aviso">
      <mat-icon aria-hidden="true">info</mat-icon>
      <span>
        El color y el icono de cada especialidad son fijos en toda la aplicación, para que se
        reconozcan antes de leer. No se eligen aquí.
      </span>
    </p>

    <mat-form-field appearance="outline" class="filtro">
      <mat-label>Filtrar por nombre</mat-label>
      <input matInput #entrada [value]="filtro()" (input)="filtro.set(entrada.value)" placeholder="Ortodoncia..." />
      <mat-icon matSuffix>search</mat-icon>
    </mat-form-field>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando especialidades" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    <div class="tabla-scroll tabla-apilable" tabindex="0" role="region" aria-label="Tabla de especialidades">
      <table mat-table [dataSource]="pagina()">
        <ng-container matColumnDef="nombre">
          <th mat-header-cell *matHeaderCellDef>Nombre</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Nombre">
            <span class="especialidad" [attr.data-spec]="visual(fila).clave">
              <span class="dc-spec-tile" aria-hidden="true">
                <mat-icon>{{ visual(fila).icono }}</mat-icon>
              </span>
              {{ fila.nombre }}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="descripcion">
          <th mat-header-cell *matHeaderCellDef>Descripción</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Descripción">{{ fila.descripcion || '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="activo">
          <th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Estado"><span class="dc-estado" [class.dc-estado--ok]="fila.activo" [class.dc-estado--error]="!fila.activo"><mat-icon aria-hidden="true">{{ fila.activo ? 'check_circle' : 'block' }}</mat-icon>{{ fila.activo ? 'Activa' : 'De baja' }}</span></td>
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
            filtro().trim()
              ? 'Ninguna especialidad coincide con ese nombre. Prueba con otro o borra el filtro.'
              : 'Aún no hay especialidades.'
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
      aria-label="Paginación de especialidades"
    />
  `,
  styles: `
    .filtro {
      width: min(100%, 22rem);
    }
    table {
      width: 100%;
      min-width: 34rem;
    }
    .col-acciones {
      width: 15rem;
      text-align: right;
    }
    .especialidad {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3);
      font-weight: 500;
    }
    .especialidad .dc-spec-tile {
      width: 2.5rem;
      height: 2.5rem;
    }
    .dc-aviso {
      margin: 0 0 var(--space-5);
    }
    .error {
      color: var(--danger-ink);
    }
  `,
})
export class EspecialidadList {
  private readonly servicio = inject(EspecialidadService);
  private readonly auth = inject(AuthService);
  private readonly dialogo = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly columnas = ['nombre', 'descripcion', 'activo', 'acciones'];
  protected readonly visual = (e: Especialidad) => visualDeEspecialidad(e.nombre);

  protected readonly datos = signal<Especialidad[]>([]);
  protected readonly indice = signal(0);
  protected readonly tamano = signal(20);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly filtro = signal('');

  protected readonly puedeEscribir = computed(() => this.auth.rol() === 'ADMINISTRADOR');

  protected readonly filas = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    const filas = [...this.datos()].sort((a, b) => a.nombre.localeCompare(b.nombre));
    return texto ? filas.filter((f) => f.nombre.toLowerCase().includes(texto)) : filas;
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
    cargarTodasLasPaginas((pagina) =>
      this.servicio.listar({ page: pagina, size: 100, sort: 'nombre,asc' }),
    ).subscribe({
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

  protected editar(fila: Especialidad): void {
    void this.router.navigate(['/especialidades/editar', fila.id], { state: { fila } });
  }

  protected darDeBaja(fila: Especialidad): void {
    const datos: ConfirmarDatos = {
      titulo: 'Dar de baja la especialidad',
      mensaje: `«${fila.nombre}» dejará de estar disponible. Es una baja lógica: el registro se conserva.`,
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
            this.snackBar.open('Especialidad dada de baja.', 'Cerrar', { duration: 4000 });
            this.cargar();
          },
          error: (err: unknown) =>
            this.snackBar.open(mensajeDeError(err), 'Cerrar', { duration: 8000 }),
        });
      });
  }
}
