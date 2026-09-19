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
    MatTableModule,
  ],
  template: `
    <header class="cabecera">
      <h1>Tratamientos</h1>
      @if (puedeEscribir()) {
        <a mat-flat-button color="primary" routerLink="/tratamientos/nuevo">
          <mat-icon>add</mat-icon>
          Nuevo tratamiento
        </a>
      }
    </header>

    <mat-form-field appearance="outline" class="filtro">
      <mat-label>Filtrar por código o nombre</mat-label>
      <input matInput #entrada [value]="filtro()" (input)="filtro.set(entrada.value)" />
      <mat-icon matSuffix>search</mat-icon>
    </mat-form-field>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando tratamientos" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    <div class="tabla-scroll" tabindex="0" role="region" aria-label="Tabla de tratamientos">
      <table mat-table [dataSource]="pagina()">
        <ng-container matColumnDef="codigo">
          <th mat-header-cell *matHeaderCellDef>Código</th>
          <td mat-cell *matCellDef="let fila">{{ fila.codigo }}</td>
        </ng-container>

        <ng-container matColumnDef="nombre">
          <th mat-header-cell *matHeaderCellDef>Nombre</th>
          <td mat-cell *matCellDef="let fila">{{ fila.nombre }}</td>
        </ng-container>

        <ng-container matColumnDef="duracion">
          <th mat-header-cell *matHeaderCellDef>Duración</th>
          <td mat-cell *matCellDef="let fila">{{ fila.duracionMinutos }} min</td>
        </ng-container>

        <ng-container matColumnDef="especialidad">
          <th mat-header-cell *matHeaderCellDef>Especialidad</th>
          <td mat-cell *matCellDef="let fila">{{ fila.especialidad?.nombre || '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="activo">
          <th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let fila">{{ fila.activo ? 'Activo' : 'De baja' }}</td>
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
      <p class="vacio">No hay tratamientos que mostrar.</p>
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
    .filtro {
      width: min(100%, 22rem);
    }
    table {
      width: 100%;
      min-width: 44rem;
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

  protected readonly puedeEscribir = computed(() => this.auth.rol() === 'ADMINISTRADOR');

  protected readonly filas = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    const filas = [...this.datos()].sort((a, b) => a.codigo.localeCompare(b.codigo));
    return texto
      ? filas.filter(
          (f) =>
            f.nombre.toLowerCase().includes(texto) || f.codigo.toLowerCase().includes(texto),
        )
      : filas;
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
            this.snackBar.open('Tratamiento dado de baja.', 'Cerrar', { duration: 4000 });
            this.cargar();
          },
          // Un 409 significa que hay una cita CONFIRMADA no vencida (RN-09).
          error: (err: unknown) =>
            this.snackBar.open(mensajeDeError(err), 'Cerrar', { duration: 8000 }),
        });
      });
  }
}
