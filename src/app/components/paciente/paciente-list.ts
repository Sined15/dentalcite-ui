import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { mensajeDeError } from '../../core/http/api-error';
import { Paciente } from '../../models';
import { PacienteService } from '../../services/paciente.service';

/**
 * HU-13 · RF-07: la búsqueda de pacientes, para el personal.
 *
 * La paginación es del **servidor**, no como en los catálogos: el padrón de
 * pacientes crece sin techo, y traerlo entero para filtrar en cliente —lo que
 * hace `cargarTodasLasPaginas`— es justo el atajo que RNF-02 mide y descarta.
 *
 * El odontólogo ve esta misma pantalla, pero el servidor le devuelve solo a las
 * personas a las que ha atendido (RNF-06); aquí no hay nada que filtrar.
 */
@Component({
  selector: 'app-paciente-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTableModule,
  ],
  template: `
    <div class="cabecera">
      <h1>Pacientes</h1>
      @if (puedeRegistrar()) {
        <a mat-flat-button color="primary" routerLink="/pacientes/nuevo">
          <mat-icon>person_add</mat-icon>
          Registrar paciente
        </a>
      }
    </div>

    <form [formGroup]="formulario">
      <mat-form-field appearance="outline" class="buscador">
        <mat-label>Buscar por documento, apellidos o número de historia</mat-label>
        <input matInput formControlName="q" type="search" />
        <mat-icon matSuffix aria-hidden="true">search</mat-icon>
      </mat-form-field>
    </form>

    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Buscando pacientes" />
    }

    @if (error(); as mensaje) {
      <p class="error" role="alert">{{ mensaje }}</p>
    }

    <div class="tabla-scroll" tabindex="0" role="region" aria-label="Tabla de pacientes">
      <table mat-table [dataSource]="pacientes()">
        <ng-container matColumnDef="paciente">
          <th mat-header-cell *matHeaderCellDef>Paciente</th>
          <td mat-cell *matCellDef="let fila">
            {{ fila.apellidos }}, {{ fila.nombres }}
            <span class="historia">{{ fila.numeroHistoria }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="documento">
          <th mat-header-cell *matHeaderCellDef>Documento</th>
          <td mat-cell *matCellDef="let fila">{{ fila.tipoDocumento }} {{ fila.documento }}</td>
        </ng-container>

        <ng-container matColumnDef="telefono">
          <th mat-header-cell *matHeaderCellDef>Teléfono</th>
          <td mat-cell *matCellDef="let fila">{{ fila.telefono || '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="cuenta">
          <th mat-header-cell *matHeaderCellDef>Cuenta</th>
          <td mat-cell *matCellDef="let fila">
            {{ fila.tieneCuenta ? 'Sí' : 'No' }}
          </td>
        </ng-container>

        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef class="col-acciones">Ficha</th>
          <td mat-cell *matCellDef="let fila" class="col-acciones">
            <button
              mat-icon-button
              type="button"
              (click)="abrirFicha(fila)"
              [attr.aria-label]="'Abrir la ficha de ' + fila.apellidos + ', ' + fila.nombres"
            >
              <mat-icon>folder_shared</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columnas"></tr>
        <tr mat-row *matRowDef="let fila; columns: columnas"></tr>
      </table>
    </div>

    @if (!cargando() && pacientes().length === 0) {
      <p class="vacio">No hay pacientes que coincidan con la búsqueda.</p>
    }

    <mat-paginator
      [length]="total()"
      [pageSize]="tamano()"
      [pageIndex]="indice()"
      [pageSizeOptions]="[10, 20, 50]"
      (page)="cambiarPagina($event)"
      aria-label="Paginación de pacientes"
    />
  `,
  styles: `
    .cabecera {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      margin: 0;
    }
    .buscador {
      width: 100%;
      max-width: 34rem;
    }
    .tabla-scroll {
      overflow-x: auto;
    }
    table {
      width: 100%;
    }
    .historia {
      display: block;
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant, #49454f);
    }
    .col-acciones {
      width: 5rem;
      text-align: right;
    }
    .vacio,
    .error {
      margin: 1rem 0;
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
    }
  `,
})
export class PacienteList {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(PacienteService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly columnas = ['paciente', 'documento', 'telefono', 'cuenta', 'acciones'];
  protected readonly pacientes = signal<Paciente[]>([]);
  protected readonly total = signal(0);
  protected readonly indice = signal(0);
  protected readonly tamano = signal(20);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({ q: [''] });

  /** El alta es de recepción y administración (RF-06); el odontólogo solo busca. */
  protected puedeRegistrar(): boolean {
    const rol = this.auth.rol();
    return rol === 'RECEPCIONISTA' || rol === 'ADMINISTRADOR';
  }

  constructor() {
    // Cada tecla es una consulta al servidor: sin la espera, escribir un
    // apellido de ocho letras lanza ocho busquedas y solo importa la ultima.
    this.formulario.controls.q.valueChanges.pipe(debounceTime(300)).subscribe(() => {
      this.indice.set(0);
      this.cargar();
    });
    this.cargar();
  }

  protected cambiarPagina(evento: PageEvent): void {
    this.indice.set(evento.pageIndex);
    this.tamano.set(evento.pageSize);
    this.cargar();
  }

  protected abrirFicha(fila: Paciente): void {
    void this.router.navigate(['/pacientes', fila.id]);
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio
      .buscar(this.formulario.controls.q.value, { page: this.indice(), size: this.tamano() })
      .subscribe({
        next: (pagina) => {
          this.cargando.set(false);
          this.pacientes.set(pagina.content);
          this.total.set(pagina.totalElements);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.pacientes.set([]);
          this.total.set(0);
          this.error.set(mensajeDeError(err));
        },
      });
  }
}
