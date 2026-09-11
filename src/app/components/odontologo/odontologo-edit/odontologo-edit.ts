import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { mensajeDeError } from '../../../core/http/api-error';
import { Especialidad, Odontologo, Usuario } from '../../../models';
import { EspecialidadService } from '../../../services/especialidad.service';
import { OdontologoService } from '../../../services/odontologo.service';
import { UsuarioService } from '../../../services/usuario.service';
import { buscarEnPaginas, cargarTodasLasPaginas } from '../../../shared/buscar-en-paginas';

@Component({
  selector: 'app-odontologo-edit',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  template: `
    <h1>{{ esEdicion() ? 'Editar odontólogo' : 'Registrar odontólogo' }}</h1>

    <mat-card class="tarjeta">
      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" aria-label="Guardando" />
      }
      <mat-card-content>
        <form [formGroup]="formulario" (ngSubmit)="enviar()">
          <div class="fila">
            <mat-form-field appearance="outline">
              <mat-label>COP (colegiatura)</mat-label>
              <input matInput formControlName="cop" />
              @if (formulario.controls.cop.hasError('required')) {
                <mat-error>El COP es obligatorio</mat-error>
              }
            </mat-form-field>
          </div>

          <div class="fila">
            <mat-form-field appearance="outline">
              <mat-label>Nombres</mat-label>
              <input matInput formControlName="nombres" />
              @if (formulario.controls.nombres.hasError('required')) {
                <mat-error>Los nombres son obligatorios</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Apellidos</mat-label>
              <input matInput formControlName="apellidos" />
              @if (formulario.controls.apellidos.hasError('required')) {
                <mat-error>Los apellidos son obligatorios</mat-error>
              }
            </mat-form-field>
          </div>

          @if (esEdicion()) {
            <!--
              La ficha queda fijada al registrar (RN-11): intentar cambiarla
              devuelve 409, asi que en edicion es de solo lectura.
            -->
            <mat-form-field appearance="outline">
              <mat-label>Ficha vinculada</mat-label>
              <input matInput [value]="formulario.controls.fichaId.value" disabled />
              <mat-hint>La ficha no se puede cambiar una vez registrado (RN-11)</mat-hint>
            </mat-form-field>
          } @else {
            <mat-form-field appearance="outline">
              <mat-label>Cuenta de odontólogo</mat-label>
              <mat-select formControlName="fichaId">
                @for (cuenta of cuentasDisponibles(); track cuenta.id) {
                  <mat-option [value]="cuenta.fichaId">
                    {{ cuenta.nombre }} — {{ cuenta.correo }}
                  </mat-option>
                } @empty {
                  <mat-option [value]="''" disabled>
                    No hay cuentas de rol ODONTOLOGO con ficha
                  </mat-option>
                }
              </mat-select>
              <mat-hint>
                Se registra sobre la ficha de una cuenta con rol ODONTOLOGO ya creada
              </mat-hint>
              @if (formulario.controls.fichaId.hasError('required')) {
                <mat-error>Debes elegir la cuenta del odontólogo</mat-error>
              }
            </mat-form-field>

            @if (cuentasDisponibles().length === 0 && !cargando()) {
              <p class="aviso">
                Primero crea una cuenta con rol ODONTOLOGO, indicando su tipo y numero de
                documento: de ahi sale la ficha que este registro necesita.
                <a routerLink="/usuarios/nuevo">Crear cuenta</a>
              </p>
            }
          }

          <mat-form-field appearance="outline">
            <mat-label>Especialidades</mat-label>
            <mat-select formControlName="especialidadesIds" multiple>
              @for (esp of especialidades(); track esp.id) {
                <mat-option [value]="esp.id">{{ esp.nombre }}</mat-option>
              }
            </mat-select>
            <mat-hint>RN-08: determinan que tratamientos se le pueden asignar</mat-hint>
            @if (formulario.controls.especialidadesIds.hasError('required')) {
              <mat-error>Debes asignar al menos una especialidad</mat-error>
            }
          </mat-form-field>

          <!--
            RF-10 (v4): la imagen de la ficha con que se presenta al publico. Es
            una ruta, no una subida; las de demostracion viajan con este cliente.
          -->
          <mat-form-field appearance="outline">
            <mat-label>Imagen (opcional)</mat-label>
            <input matInput formControlName="imagenUrl" placeholder="/img/catalogo/ejemplo.svg" />
            <mat-hint>Ruta o URL de la imagen que se ve en «Nuestro equipo»</mat-hint>
          </mat-form-field>

          @if (error(); as mensaje) {
            <p class="error" role="alert">{{ mensaje }}</p>
          }

          <div class="acciones">
            <button mat-button type="button" (click)="cancelar()">Cancelar</button>
            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="formulario.invalid || cargando()"
            >
              Guardar
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    h1 {
      font-size: 1.5rem;
      margin: 0 0 1rem;
    }
    .tarjeta {
      max-width: 42rem;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .fila {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .fila mat-form-field {
      flex: 1 1 14rem;
    }
    .acciones {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    .error {
      color: var(--mat-sys-error, #b3261e);
      font-size: 0.875rem;
    }
    .aviso {
      background: var(--mat-sys-surface-container, #eee);
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
    }
  `,
})
export class OdontologoEdit {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(OdontologoService);
  private readonly especialidadService = inject(EspecialidadService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  private readonly id = this.ruta.snapshot.paramMap.get('id');

  protected readonly esEdicion = signal(this.id !== null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly especialidades = signal<Especialidad[]>([]);
  private readonly cuentas = signal<Usuario[]>([]);
  private readonly fichasOcupadas = signal<ReadonlySet<string>>(new Set());

  /**
   * Solo cuentas de rol ODONTOLOGO, con ficha y aun sin odontologo asociado:
   * RN-11 no admite un segundo enlace, y ofrecer una ficha ya usada solo
   * produciria un 409.
   */
  protected readonly cuentasDisponibles = computed(() => {
    const ocupadas = this.fichasOcupadas();
    return this.cuentas().filter(
      (u) => u.rol === 'ODONTOLOGO' && u.fichaId !== null && !ocupadas.has(u.fichaId),
    );
  });

  protected readonly formulario = this.fb.nonNullable.group({
    cop: ['', [Validators.required]],
    nombres: ['', [Validators.required]],
    apellidos: ['', [Validators.required]],
    fichaId: ['', [Validators.required]],
    especialidadesIds: [[] as string[], [Validators.required]],
    imagenUrl: [''],
  });

  constructor() {
    cargarTodasLasPaginas((pagina) =>
      this.especialidadService.listar({ page: pagina, size: 100, sort: 'nombre,asc' }),
    ).subscribe({
      next: (lista) => this.especialidades.set(lista.filter((e) => e.activo)),
      error: (err: unknown) => this.error.set(mensajeDeError(err)),
    });

    if (this.id) {
      this.cargarParaEdicion();
      return;
    }

    // En alta hay que saber que fichas siguen libres.
    cargarTodasLasPaginas((pagina) => this.servicio.listar({ page: pagina, size: 100 })).subscribe({
      next: (lista) => this.fichasOcupadas.set(new Set(lista.map((o) => o.fichaId))),
      error: () => this.fichasOcupadas.set(new Set()),
    });

    cargarTodasLasPaginas((pagina) =>
      this.usuarioService.listar({ page: pagina, size: 100 }),
    ).subscribe({
      next: (lista) => this.cuentas.set(lista),
      error: (err: unknown) => this.error.set(mensajeDeError(err)),
    });
  }

  private cargarParaEdicion(): void {
    const fila = this.router.getCurrentNavigation()?.extras.state?.['fila'] as
      | Odontologo
      | undefined;

    if (fila) {
      this.rellenar(fila);
      return;
    }

    this.cargando.set(true);
    buscarEnPaginas(
      (pagina) => this.servicio.listar({ page: pagina, size: 50 }),
      this.id as string,
    ).subscribe({
      next: (encontrado) => {
        this.cargando.set(false);
        if (encontrado) {
          this.rellenar(encontrado);
        } else {
          this.error.set('No se encontró el odontólogo indicado.');
        }
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  /** Se leen `especialidades` anidadas y se escriben `especialidadesIds`. */
  private rellenar(fila: Odontologo): void {
    this.formulario.patchValue({
      cop: fila.cop,
      nombres: fila.nombres,
      apellidos: fila.apellidos,
      fichaId: fila.fichaId,
      especialidadesIds: fila.especialidades.map((e) => e.id),
      imagenUrl: fila.imagenUrl ?? '',
    });
  }

  protected enviar(): void {
    if (this.formulario.invalid || this.cargando()) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);

    const valores = this.formulario.getRawValue();
    // PUT reemplaza el recurso entero: mandar la imagen vacia la borraria, y no
    // mandarla tambien.
    const cuerpo = { ...valores, imagenUrl: valores.imagenUrl || undefined };

    const peticion = this.id
      ? this.servicio.reemplazar(this.id, cuerpo)
      : this.servicio.crear(cuerpo);

    peticion.subscribe({
      next: () => {
        this.cargando.set(false);
        this.snackBar.open(this.id ? 'Odontólogo actualizado.' : 'Odontólogo registrado.', 'Cerrar', {
          duration: 4000,
        });
        void this.router.navigate(['/odontologos']);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  protected cancelar(): void {
    void this.router.navigate(['/odontologos']);
  }
}
