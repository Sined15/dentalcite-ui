import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { mensajeDeError } from '../../core/http/api-error';
import { Odontologo } from '../../models';
import { OdontologoService } from '../../services/odontologo.service';
import { cargarTodasLasPaginas } from '../../shared/buscar-en-paginas';
import { ConfirmarDatos, ConfirmarDialogo } from '../../shared/confirmar-dialogo';

@Component({
  selector: 'app-odontologo-list',
  imports: [
    RouterLink,
    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTableModule,
    MatTooltipModule,
  ],
  template: `
    <header class="cabecera">
      <h1>Odontólogos</h1>
      @if (puedeEscribir()) {
        <a mat-flat-button color="primary" routerLink="/odontologos/nuevo">
          <mat-icon>add</mat-icon>
          Registrar odontologo
        </a>
      }
    </header>

    <mat-form-field appearance="outline" class="filtro">
      <mat-label>Filtrar por nombre o COP</mat-label>
      <input matInput #entrada [value]="filtro()" (input)="filtro.set(entrada.value)" />
      <mat-icon matSuffix>search</mat-icon>
    </mat-form-field>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando odontólogos" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    <div class="tabla-scroll" tabindex="0" role="region" aria-label="Tabla de odontólogos">
      <table mat-table [dataSource]="pagina()">
        <ng-container matColumnDef="cop">
          <th mat-header-cell *matHeaderCellDef>COP</th>
          <td mat-cell *matCellDef="let fila">{{ fila.cop }}</td>
        </ng-container>

        <ng-container matColumnDef="nombre">
          <th mat-header-cell *matHeaderCellDef>Nombre</th>
          <td mat-cell *matCellDef="let fila">{{ fila.nombres }} {{ fila.apellidos }}</td>
        </ng-container>

        <ng-container matColumnDef="especialidades">
          <th mat-header-cell *matHeaderCellDef>Especialidades</th>
          <td mat-cell *matCellDef="let fila">
            <mat-chip-set>
              @for (esp of fila.especialidades; track esp.id) {
                <mat-chip>{{ esp.nombre }}</mat-chip>
              } @empty {
                <span>—</span>
              }
            </mat-chip-set>
          </td>
        </ng-container>

        <ng-container matColumnDef="activo">
          <th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let fila">{{ fila.activo ? 'Activo' : 'De baja' }}</td>
        </ng-container>

        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef class="col-acciones">Acciones</th>
          <td mat-cell *matCellDef="let fila" class="col-acciones">
            <a
              mat-icon-button
              [routerLink]="['/odontologos', fila.id, 'horarios']"
              matTooltip="Horario de atencion"
              [attr.aria-label]="'Horario de ' + fila.nombres"
            >
              <mat-icon>schedule</mat-icon>
            </a>
            @if (puedeEscribir()) {
              <button
                mat-icon-button
                type="button"
                (click)="editar(fila)"
                [attr.aria-label]="'Editar ' + fila.nombres"
              >
                <mat-icon>edit</mat-icon>
              </button>
              <button
                mat-icon-button
                type="button"
                color="warn"
                [disabled]="!fila.activo"
                (click)="darDeBaja(fila)"
                [attr.aria-label]="'Dar de baja ' + fila.nombres"
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
      <p class="vacio">No hay odontólogos que mostrar.</p>
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
    .filtro {
      width: min(100%, 22rem);
    }
    table {
      width: 100%;
      min-width: 46rem;
    }
    .col-acciones {
      width: 10rem;
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
export class OdontologoList {
  private readonly servicio = inject(OdontologoService);
  private readonly auth = inject(AuthService);
  private readonly dialogo = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly columnas = ['cop', 'nombre', 'especialidades', 'activo', 'acciones'];

  protected readonly datos = signal<Odontologo[]>([]);
  protected readonly indice = signal(0);
  protected readonly tamano = signal(20);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly filtro = signal('');

  protected readonly puedeEscribir = computed(() => this.auth.rol() === 'ADMINISTRADOR');

  protected readonly filas = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    const filas = [...this.datos()].sort((a, b) => a.apellidos.localeCompare(b.apellidos));
    return texto
      ? filas.filter(
          (f) =>
            `${f.nombres} ${f.apellidos}`.toLowerCase().includes(texto) ||
            f.cop.toLowerCase().includes(texto),
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

  protected editar(fila: Odontologo): void {
    void this.router.navigate(['/odontologos/editar', fila.id], { state: { fila } });
  }

  protected darDeBaja(fila: Odontologo): void {
    const datos: ConfirmarDatos = {
      titulo: 'Dar de baja al odontólogo',
      mensaje: `${fila.nombres} ${fila.apellidos} dejara de estar disponible. Es una baja logica: el registro se conserva.`,
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
          // Un 409 significa que tiene citas CONFIRMADAS no vencidas (RN-09).
          error: (err: unknown) =>
            this.snackBar.open(mensajeDeError(err), 'Cerrar', { duration: 8000 }),
        });
      });
  }
}
