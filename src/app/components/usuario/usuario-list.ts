import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/http/api-error';
import { ROLES, Rol, Usuario } from '../../models';
import { OdontologoService } from '../../services/odontologo.service';
import { UsuarioService } from '../../services/usuario.service';
import { cargarTodasLasPaginas } from '../../shared/buscar-en-paginas';
import { ConfirmarDatos, ConfirmarDialogo } from '../../shared/confirmar-dialogo';
import { PasswordProvisionalDialogo } from './password-provisional-dialogo';

const ETIQUETA_ROL: Record<Rol, string> = {
  ADMINISTRADOR: 'Administración',
  RECEPCIONISTA: 'Recepción',
  ODONTOLOGO: 'Odontología',
  PACIENTE: 'Paciente',
};

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
    MatSelectModule,
    MatTableModule,
  ],
  template: `
    <header class="cabecera">
      <div class="dc-titular">
        <h1>Cuentas de acceso</h1>
        <p class="dc-subtitulo">Quién puede entrar al sistema y con qué rol.</p>
      </div>
      <a mat-flat-button routerLink="/usuarios/nuevo">
        <mat-icon>person_add</mat-icon>
        Nueva cuenta
      </a>
    </header>

    <form class="dc-filtros" role="search" aria-label="Filtros de cuentas">
      <mat-form-field appearance="outline">
        <mat-label>Buscar por nombre o correo</mat-label>
        <input matInput #entrada [value]="filtro()" (input)="filtro.set(entrada.value)" />
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Rol</mat-label>
        <mat-select [value]="rol()" (valueChange)="rol.set($event)">
          <mat-option value="">Todos</mat-option>
          @for (r of roles; track r) {
            <mat-option [value]="r">{{ etiquetaRol(r) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Estado</mat-label>
        <mat-select [value]="estado()" (valueChange)="estado.set($event)">
          <mat-option value="">Todos</mat-option>
          <mat-option value="activa">Activa</mat-option>
          <mat-option value="desactivada">Desactivada</mat-option>
        </mat-select>
      </mat-form-field>
    </form>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando cuentas" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    <div class="tabla-scroll tabla-apilable" tabindex="0" role="region" aria-label="Tabla de cuentas">
      <table mat-table [dataSource]="pagina()">
        <ng-container matColumnDef="nombre">
          <th mat-header-cell *matHeaderCellDef>Persona</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Persona">
            <span class="persona">
              <b>{{ fila.nombre }}</b>
              <small>{{ fila.correo }}</small>
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="rol">
          <th mat-header-cell *matHeaderCellDef>Rol</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Rol">
            <span class="rol">{{ etiquetaRol(fila.rol) }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="ficha">
          <th mat-header-cell *matHeaderCellDef>Ficha</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Ficha">
            @if (fila.fichaId && fila.rol === 'PACIENTE') {
              <a
                [routerLink]="['/pacientes', fila.fichaId]"
                [attr.aria-label]="'Ver la ficha clínica de ' + fila.nombre"
                >Ver ficha</a
              >
            } @else {
              <span class="sin-ficha" aria-hidden="true">—</span>
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="estado">
          <th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Estado">
            <span
              class="dc-estado"
              [class.dc-estado--ok]="fila.activo"
              [class.dc-estado--error]="!fila.activo"
            >
              <mat-icon aria-hidden="true">{{ fila.activo ? 'check_circle' : 'block' }}</mat-icon>
              {{ fila.activo ? 'Activa' : 'Desactivada' }}
            </span>
            @if (fila.requiereCambioPassword) {
              <span class="marca">Contraseña provisional</span>
            }
            @if (leFaltaRegistro(fila)) {
              <span class="marca alerta">Sin registro profesional</span>
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef class="col-acciones">Acciones</th>
          <td mat-cell *matCellDef="let fila" class="col-acciones">
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
              <button
                mat-icon-button
                type="button"
                [matMenuTriggerFor]="menu"
                [attr.aria-label]="'Más acciones sobre ' + fila.nombre"
              >
                <mat-icon>more_vert</mat-icon>
              </button>
            </span>
            <mat-menu #menu="matMenu">
              <button mat-menu-item type="button" (click)="asignarPassword(fila)">
                <mat-icon>key</mat-icon>
                <span>Contraseña provisional</span>
              </button>
              @if (leFaltaRegistro(fila) && fila.fichaId) {
                <button mat-menu-item type="button" (click)="completarRegistro(fila)">
                  <mat-icon>medical_information</mat-icon>
                  <span>Completar registro profesional</span>
                </button>
              }
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
      <p class="dc-vacio">
        <mat-icon aria-hidden="true">search_off</mat-icon>
        <span>
          {{
            hayFiltros()
              ? 'Ninguna cuenta coincide con esos filtros. Prueba con otros o quítalos.'
              : 'Aún no hay cuentas.'
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
      aria-label="Paginación de cuentas"
    />
  `,
  styles: `
    table {
      width: 100%;
      min-width: 46rem;
    }
    .col-acciones {
      width: 11rem;
      text-align: right;
    }
    .dc-acciones {
      flex-wrap: nowrap;
    }
    .persona b {
      display: block;
      font-weight: 500;
    }
    .persona small {
      display: block;
      font: var(--text-body-sm);
      color: var(--ink-muted);
    }
    .rol {
      display: inline-flex;
      align-items: center;
      height: 1.75rem;
      padding: 0 var(--space-3);
      border-radius: var(--radius-pill);
      background: var(--surface-sunken);
      font: var(--text-label);
    }
    .marca {
      display: inline-block;
      margin-left: 0.5rem;
      padding: 0.1rem 0.5rem;
      border-radius: var(--radius-pill);
      font: var(--text-label);
      background: var(--surface-sunken);
      color: var(--ink);
    }
    .alerta {
      background: var(--surface);
      border: 1px solid var(--warning);
      color: var(--warning-ink);
    }
    .sin-ficha {
      opacity: 0.55;
    }
    .error {
      color: var(--danger-ink);
    }
  `,

})
export class UsuarioList {
  private readonly servicio = inject(UsuarioService);
  private readonly odontologoService = inject(OdontologoService);
  private readonly dialogo = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly columnas = ['nombre', 'rol', 'ficha', 'estado', 'acciones'];

  protected readonly datos = signal<Usuario[]>([]);
  protected readonly indice = signal(0);
  protected readonly tamano = signal(20);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly filtro = signal('');

  protected readonly roles = ROLES;

  protected readonly rol = signal<Rol | ''>('');
  protected readonly estado = signal<'' | 'activa' | 'desactivada'>('');

  protected readonly hayFiltros = computed(
    () => !!(this.filtro().trim() || this.rol() || this.estado()),
  );

  protected etiquetaRol(rol: Rol): string {
    return ETIQUETA_ROL[rol] ?? rol;
  }

  private readonly fichasConRegistro = signal<ReadonlySet<string>>(new Set());

  protected readonly filas = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    const rol = this.rol();
    const estado = this.estado();
    let filas = [...this.datos()].sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (rol) {
      filas = filas.filter((f) => f.rol === rol);
    }
    if (estado) {
      filas = filas.filter((f) => f.activo === (estado === 'activa'));
    }
    return texto
      ? filas.filter(
          (f) =>
            f.nombre.toLowerCase().includes(texto) || f.correo.toLowerCase().includes(texto),
        )
      : filas;
  });

  protected readonly pagina = computed(() => {
    const desde = this.indice() * this.tamano();
    return this.filas().slice(desde, desde + this.tamano());
  });

  constructor() {
    this.cargar();

    cargarTodasLasPaginas((pagina) =>
      this.odontologoService.listar({ page: pagina, size: 100 }),
    ).subscribe({
      next: (lista) => this.fichasConRegistro.set(new Set(lista.map((o) => o.fichaId))),
      error: () => this.fichasConRegistro.set(new Set()),
    });
  }

  protected leFaltaRegistro(fila: Usuario): boolean {
    if (fila.rol !== 'ODONTOLOGO') {
      return false;
    }
    return !fila.fichaId || !this.fichasConRegistro().has(fila.fichaId);
  }

  protected completarRegistro(fila: Usuario): void {
    void this.router.navigate(['/odontologos/nuevo'], {
      state: { fichaId: fila.fichaId, nombre: fila.nombre },
    });
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

  protected darDeBaja(fila: Usuario): void {
    const datos: ConfirmarDatos = {
      titulo: 'Desactivar la cuenta',
      mensaje: `${fila.nombre} no podrá iniciar sesión y sus sesiones activas se cerrarán. El registro se conserva.`,
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
