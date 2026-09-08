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
      <h1>Especialidades</h1>
      @if (puedeEscribir()) {
        <a mat-flat-button color="primary" routerLink="/especialidades/nuevo">
          <mat-icon>add</mat-icon>
          Nueva especialidad
        </a>
      }
    </header>

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

    <div class="tabla-scroll" tabindex="0" role="region" aria-label="Tabla de especialidades">
      <table mat-table [dataSource]="pagina()">
        <ng-container matColumnDef="nombre">
          <th mat-header-cell *matHeaderCellDef>Nombre</th>
          <td mat-cell *matCellDef="let fila">{{ fila.nombre }}</td>
        </ng-container>

        <ng-container matColumnDef="descripcion">
          <th mat-header-cell *matHeaderCellDef>Descripcion</th>
          <td mat-cell *matCellDef="let fila">{{ fila.descripcion || '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="activo">
          <th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let fila">{{ fila.activo ? 'Activa' : 'De baja' }}</td>
        </ng-container>

        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef class="col-acciones">Acciones</th>
          <td mat-cell *matCellDef="let fila" class="col-acciones">
            @if (puedeEscribir()) {
              <button
                mat-icon-button
                type="button"
                (click)="editar(fila)"
                [attr.aria-label]="'Editar ' + fila.nombre"
              >
                <mat-icon>edit</mat-icon>
              </button>
              <button
                mat-icon-button
                type="button"
                color="warn"
                [disabled]="!fila.activo"
                (click)="darDeBaja(fila)"
                [attr.aria-label]="'Dar de baja ' + fila.nombre"
              >
                <mat-icon>block</mat-icon>
              </button>
            }
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columnas"></tr>
        <tr mat-row *matRowDef="let fila; columns: columnas"></tr>
      </table>
    </div>

    @if (!cargando() && filas().length === 0) {
      <p class="vacio">No hay especialidades que mostrar.</p>
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
    .cabecera {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      margin: 0;
    }
    .filtro {
      width: min(100%, 22rem);
    }
    .tabla-scroll {
      overflow-x: auto;
    }
    table {
      width: 100%;
      min-width: 34rem;
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
  `,
})
export class EspecialidadList {
  private readonly servicio = inject(EspecialidadService);
  private readonly auth = inject(AuthService);
  private readonly dialogo = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly columnas = ['nombre', 'descripcion', 'activo', 'acciones'];

  protected readonly datos = signal<Especialidad[]>([]);
  protected readonly indice = signal(0);
  protected readonly tamano = signal(20);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly filtro = signal('');

  protected readonly puedeEscribir = computed(() => this.auth.rol() === 'ADMINISTRADOR');

  /**
   * El filtro se aplica sobre la pagina cargada, no sobre el total: el endpoint
   * no acepta un parametro de busqueda, y traer todas las paginas para filtrar
   * en cliente anularia la paginacion en servidor.
   */
  protected readonly filas = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    const filas = [...this.datos()].sort((a, b) => a.nombre.localeCompare(b.nombre));
    return texto ? filas.filter((f) => f.nombre.toLowerCase().includes(texto)) : filas;
  });

  /** Corte de la pagina actual sobre el conjunto ya filtrado. */
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

  /** Se pasa la fila por estado: no hay `GET /{id}` para este recurso. */
  protected editar(fila: Especialidad): void {
    void this.router.navigate(['/especialidades/editar', fila.id], { state: { fila } });
  }

  protected darDeBaja(fila: Especialidad): void {
    const datos: ConfirmarDatos = {
      titulo: 'Dar de baja la especialidad',
      mensaje: `«${fila.nombre}» dejara de estar disponible. Es una baja logica: el registro se conserva.`,
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
          // Un 409 aqui significa que quedan tratamientos activos que la
          // exigen (RN-08). El mensaje del backend lo explica.
          error: (err: unknown) =>
            this.snackBar.open(mensajeDeError(err), 'Cerrar', { duration: 8000 }),
        });
      });
  }
}
