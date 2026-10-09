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
      <div class="dc-titular">
        <h1>Pacientes</h1>
        <p class="dc-subtitulo">Busca por nombre, documento o número de historia.</p>
      </div>
      @if (puedeRegistrar()) {
        <a mat-flat-button routerLink="/pacientes/nuevo">
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

    <div class="tabla-scroll tabla-apilable" tabindex="0" role="region" aria-label="Tabla de pacientes">
      <table mat-table [dataSource]="pacientes()">
        <ng-container matColumnDef="paciente">
          <th mat-header-cell *matHeaderCellDef>Paciente</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Paciente">
            {{ fila.apellidos }}, {{ fila.nombres }}
            <span class="historia">{{ fila.numeroHistoria }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="documento">
          <th mat-header-cell *matHeaderCellDef>Documento</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Documento">{{ fila.tipoDocumento }} {{ fila.documento }}</td>
        </ng-container>

        <ng-container matColumnDef="telefono">
          <th mat-header-cell *matHeaderCellDef>Teléfono</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Teléfono">{{ fila.telefono || '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="cuenta">
          <th mat-header-cell *matHeaderCellDef>Cuenta</th>
          <td mat-cell *matCellDef="let fila" data-etiqueta="Cuenta">
            <span
              class="dc-estado"
              [class.dc-estado--ok]="fila.tieneCuenta"
              [class.sin-cuenta]="!fila.tieneCuenta"
            >
              <mat-icon aria-hidden="true">{{ fila.tieneCuenta ? 'check_circle' : 'person_off' }}</mat-icon>
              {{ fila.tieneCuenta ? 'Con cuenta' : 'Sin cuenta' }}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef class="col-acciones">Ficha</th>
          <td mat-cell *matCellDef="let fila" class="col-acciones" data-etiqueta="Ficha">
            <button
              mat-stroked-button
              class="dc-accion"
              type="button"
              (click)="abrirFicha(fila)"
              [attr.aria-label]="'Abrir la ficha de ' + fila.apellidos + ', ' + fila.nombres"
            >
              Ver ficha
              <mat-icon iconPositionEnd>chevron_right</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columnas"></tr>
        <tr mat-row *matRowDef="let fila; columns: columnas"></tr>
      </table>
    </div>

    @if (!cargando() && pacientes().length === 0) {
      <p class="dc-vacio">
        <mat-icon aria-hidden="true">search_off</mat-icon>
        <span>
          No hay pacientes que coincidan con la búsqueda. Prueba con otro nombre, documento o
          número de historia.
        </span>
      </p>
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
    .dc-accion {
      white-space: nowrap;
    }
    .buscador {
      width: 100%;
      max-width: 34rem;
    }
    table {
      width: 100%;
    }
    .historia {
      display: block;
      font: var(--text-code);
      color: var(--ink-muted);
    }
    .sin-cuenta {
      color: var(--ink-muted);
    }
    .col-acciones {
      width: 10rem;
      text-align: right;
    }
    .error {
      margin: 1rem 0;
    }
    .error {
      color: var(--danger-ink);
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

  protected puedeRegistrar(): boolean {
    const rol = this.auth.rol();
    return rol === 'RECEPCIONISTA' || rol === 'ADMINISTRADOR';
  }

  constructor() {
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
