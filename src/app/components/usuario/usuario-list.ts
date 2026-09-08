import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/http/api-error';
import { Usuario } from '../../models';
import { UsuarioService } from '../../services/usuario.service';
import { cargarTodasLasPaginas } from '../../shared/buscar-en-paginas';
import { ConfirmarDatos, ConfirmarDialogo } from '../../shared/confirmar-dialogo';
import { PasswordProvisionalDialogo } from './password-provisional-dialogo';

@Component({
  selector: 'app-usuario-list',
  imports: [
    RouterLink,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTableModule,
  ],
  template: `
    <header class="cabecera">
      <h1>Cuentas</h1>
      <a mat-flat-button color="primary" routerLink="/usuarios/nuevo">
        <mat-icon>person_add</mat-icon>
        Nueva cuenta
      </a>
    </header>

    <mat-form-field appearance="outline" class="filtro">
      <mat-label>Filtrar por nombre o correo</mat-label>
      <input matInput #entrada [value]="filtro()" (input)="filtro.set(entrada.value)" />
      <mat-icon matSuffix>search</mat-icon>
    </mat-form-field>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando cuentas" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    <div class="tabla-scroll" tabindex="0" role="region" aria-label="Tabla de cuentas">
      <table mat-table [dataSource]="pagina()">
        <ng-container matColumnDef="nombre">
          <th mat-header-cell *matHeaderCellDef>Nombre</th>
          <td mat-cell *matCellDef="let fila">{{ fila.nombre }}</td>
        </ng-container>

        <ng-container matColumnDef="correo">
          <th mat-header-cell *matHeaderCellDef>Correo</th>
          <td mat-cell *matCellDef="let fila">{{ fila.correo }}</td>
        </ng-container>

        <ng-container matColumnDef="rol">
          <th mat-header-cell *matHeaderCellDef>Rol</th>
          <td mat-cell *matCellDef="let fila">{{ fila.rol }}</td>
        </ng-container>

        <ng-container matColumnDef="estado">
          <th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let fila">
            {{ fila.activo ? 'Activa' : 'Desactivada' }}
            @if (fila.requiereCambioPassword) {
              <span class="marca">Contraseña provisional</span>
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef class="col-acciones">Acciones</th>
          <td mat-cell *matCellDef="let fila" class="col-acciones">
            <button
              mat-icon-button
              type="button"
              [matMenuTriggerFor]="menu"
              [attr.aria-label]="'Acciones sobre ' + fila.nombre"
            >
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #menu="matMenu">
              <button mat-menu-item type="button" (click)="editar(fila)">
                <mat-icon>edit</mat-icon>
                <span>Editar</span>
              </button>
              <button mat-menu-item type="button" (click)="asignarPassword(fila)">
                <mat-icon>key</mat-icon>
                <span>Contraseña provisional</span>
              </button>
              <button
                mat-menu-item
                type="button"
                [disabled]="!fila.activo"
                (click)="darDeBaja(fila)"
              >
                <mat-icon>block</mat-icon>
                <span>Desactivar</span>
              </button>
            </mat-menu>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columnas"></tr>
        <tr mat-row *matRowDef="let fila; columns: columnas"></tr>
      </table>
    </div>

    @if (!cargando() && filas().length === 0) {
      <p class="vacio">No hay cuentas que mostrar.</p>
    }

    <mat-paginator
      [length]="filas().length"
      [pageSize]="tamano()"
      [pageIndex]="indice()"
      [pageSizeOptions]="[10, 20, 50]"
      (page)="cambiarPagina($event)"
      aria-label="Paginación de cuentas"
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
      min-width: 46rem;
    }
    .col-acciones {
      width: 5rem;
      text-align: right;
    }
    .marca {
      display: inline-block;
      margin-left: 0.5rem;
      padding: 0.1rem 0.5rem;
      border-radius: 1rem;
      font-size: 0.7rem;
      background: var(--mat-sys-surface-container-highest, #e2e2e6);
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
export class UsuarioList {
  private readonly servicio = inject(UsuarioService);
  private readonly dialogo = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly columnas = ['nombre', 'correo', 'rol', 'estado', 'acciones'];

  protected readonly datos = signal<Usuario[]>([]);
  protected readonly indice = signal(0);
  protected readonly tamano = signal(20);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly filtro = signal('');

  protected readonly filas = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    const filas = [...this.datos()].sort((a, b) => a.nombre.localeCompare(b.nombre));
    return texto
      ? filas.filter(
          (f) =>
            f.nombre.toLowerCase().includes(texto) || f.correo.toLowerCase().includes(texto),
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

  protected editar(fila: Usuario): void {
    void this.router.navigate(['/usuarios/editar', fila.id], { state: { fila } });
  }

  /** Baja logica: el backend no expone DELETE de usuarios. */
  protected darDeBaja(fila: Usuario): void {
    const datos: ConfirmarDatos = {
      titulo: 'Desactivar la cuenta',
      mensaje: `${fila.nombre} no podra iniciar sesion y sus sesiones activas se cerraran (RN-12). El registro se conserva.`,
      confirmar: 'Desactivar',
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
            this.snackBar.open('Cuenta desactivada.', 'Cerrar', { duration: 4000 });
            this.cargar();
          },
          error: (err: unknown) =>
            this.snackBar.open(mensajeDeError(err), 'Cerrar', { duration: 8000 }),
        });
      });
  }

  protected asignarPassword(fila: Usuario): void {
    this.dialogo
      .open(PasswordProvisionalDialogo, { data: { usuario: fila }, width: '26rem' })
      .afterClosed()
      .subscribe((asignada) => {
        if (asignada) {
          this.cargar();
        }
      });
  }
}
