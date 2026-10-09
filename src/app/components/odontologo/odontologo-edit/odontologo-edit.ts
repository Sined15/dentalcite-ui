import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { mensajeDeError } from '../../../core/http/api-error';
import { Especialidad, Odontologo, TIPOS_DOCUMENTO, TipoDocumento, Usuario } from '../../../models';
import { EspecialidadService } from '../../../services/especialidad.service';
import { OdontologoService } from '../../../services/odontologo.service';
import { UsuarioService } from '../../../services/usuario.service';
import { buscarEnPaginas, cargarTodasLasPaginas } from '../../../shared/buscar-en-paginas';
import { visualDeEspecialidad } from '../../../shared/especialidad-visual';
import { PasswordGeneradaDialogo } from '../../usuario/password-generada-dialogo';

@Component({
  selector: 'app-odontologo-edit',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatIconModule,
    MatSelectModule,
  ],
  template: `
    <h1>{{ titulo() }}</h1>

    <mat-card class="tarjeta" appearance="outlined">
      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" aria-label="Guardando" />
      }
      <mat-card-content>
        <form [formGroup]="formulario" (ngSubmit)="enviar()">
          @if (modoCompletar()) {
            <p class="aviso">
              Se completa el registro profesional de una cuenta que ya existe
              @if (nombreDeLaCuenta) {
                , la de <strong>{{ nombreDeLaCuenta }}</strong>
              }
              . No se crea ninguna credencial nueva.
            </p>
          }

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
            <mat-form-field appearance="outline">
              <mat-label>Ficha vinculada</mat-label>
              <input matInput [value]="formulario.controls.fichaId.value" disabled />
              <mat-hint>La ficha no se puede cambiar una vez registrado</mat-hint>
            </mat-form-field>
          } @else if (!modoCompletar()) {
            <h2 class="seccion">Cuenta de acceso</h2>

            <mat-form-field appearance="outline">
              <mat-label>Correo</mat-label>
              <input matInput type="email" formControlName="correo" />
              <mat-hint>Con este correo iniciará sesión; no se puede cambiar después</mat-hint>
              @if (formulario.controls.correo.hasError('required')) {
                <mat-error>El correo es obligatorio</mat-error>
              } @else if (formulario.controls.correo.hasError('email')) {
                <mat-error>El formato del correo es inválido</mat-error>
              }
            </mat-form-field>

            <div class="fila">
              <mat-form-field appearance="outline">
                <mat-label>Tipo de documento</mat-label>
                <mat-select formControlName="tipoDocumento">
                  @for (tipo of tiposDocumento; track tipo) {
                    <mat-option [value]="tipo">{{ tipo }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Número de documento</mat-label>
                <input matInput formControlName="documento" />
                @if (formulario.controls.documento.hasError('required')) {
                  <mat-error>El documento es obligatorio</mat-error>
                }
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline">
              <mat-label>Contraseña provisional (opcional)</mat-label>
              <input
                matInput
                type="text"
                formControlName="passwordProvisional"
                autocomplete="off"
              />
              <mat-hint>Si la dejas vacía, el sistema la genera y la muestra una sola vez</mat-hint>
              @if (formulario.controls.passwordProvisional.hasError('minlength')) {
                <mat-error>Debe tener al menos 8 caracteres</mat-error>
              }
            </mat-form-field>

            <h2 class="seccion">Registro profesional</h2>
          }

          <fieldset class="especialidades" aria-describedby="ayuda-especialidades">
            <legend>Especialidades</legend>
            <div class="opciones">
              @for (esp of especialidades(); track esp.id) {
                <button
                  type="button"
                  class="opcion"
                  [class.elegida]="estaElegida(esp.id)"
                  [attr.data-spec]="visual(esp).clave"
                  [attr.aria-pressed]="estaElegida(esp.id)"
                  (click)="alternarEspecialidad(esp.id)"
                >
                  <span class="dc-spec-tile" aria-hidden="true">
                    <mat-icon>{{ visual(esp).icono }}</mat-icon>
                  </span>
                  <span class="nombre-opcion">{{ esp.nombre }}</span>
                  <span class="marca-elegida" aria-hidden="true">
                    <mat-icon>check</mat-icon>
                  </span>
                </button>
              }
            </div>
            <p class="ayuda-especialidades" id="ayuda-especialidades">
              Determinan qué tratamientos se le pueden asignar.
            </p>
            @if (
              formulario.controls.especialidadesIds.touched &&
              formulario.controls.especialidadesIds.hasError('required')
            ) {
              <p class="error" role="alert">Debes asignar al menos una especialidad</p>
            }
          </fieldset>

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
      font: var(--text-display-sm);
      letter-spacing: -0.01em;
      margin: 0 0 var(--space-5);
    }
    .seccion {
      font: var(--text-title-md);
      margin: 1rem 0 0.5rem;
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
    @media (max-width: 30rem) {
      .acciones {
        flex-direction: column-reverse;
      }
      .acciones button {
        width: 100%;
      }
    }
    .error {
      color: var(--danger-ink);
      font: var(--text-body-sm);
    }
    .aviso {
      background: var(--accent-soft);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      font: var(--text-body-sm);
      margin: 0 0 1rem;
    }
    .especialidades {
      border: none;
      margin: 0 0 var(--space-4);
      padding: 0;
    }
    .especialidades legend {
      font: var(--text-label);
      margin-bottom: var(--space-2);
      padding: 0;
    }
    .opciones {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr));
      gap: var(--space-3);
    }
    .opcion {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      min-height: 3.5rem;
      padding: var(--space-2) var(--space-3) var(--space-2) var(--space-2);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      background: var(--surface);
      color: var(--ink);
      font: 500 0.875rem/1.2 var(--font-sans);
      text-align: left;
      cursor: pointer;
    }
    .opcion.elegida {
      border-color: var(--brand);
      background: var(--brand-soft);
    }
    .nombre-opcion {
      flex: 1;
    }
    .marca-elegida {
      width: 1.375rem;
      height: 1.375rem;
      display: grid;
      place-items: center;
      border: 2px solid var(--border-strong);
      border-radius: var(--radius-xs);
      color: transparent;
    }
    .marca-elegida mat-icon {
      width: 1rem;
      height: 1rem;
      font-size: 1rem;
    }
    .elegida .marca-elegida {
      background: var(--brand);
      border-color: var(--brand);
      color: var(--on-brand);
    }
    .ayuda-especialidades {
      margin: var(--space-2) 0 0;
      font: var(--text-body-sm);
      color: var(--ink-muted);
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
  private readonly dialogo = inject(MatDialog);

  private readonly id = this.ruta.snapshot.paramMap.get('id');
  private readonly estado = this.router.getCurrentNavigation()?.extras.state;

  protected readonly tiposDocumento = TIPOS_DOCUMENTO;

  protected readonly esEdicion = signal(this.id !== null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly especialidades = signal<Especialidad[]>([]);

  protected visual(especialidad: Especialidad) {
    return visualDeEspecialidad(especialidad.nombre);
  }

  protected estaElegida(id: string): boolean {
    return this.formulario.controls.especialidadesIds.value.includes(id);
  }

  protected alternarEspecialidad(id: string): void {
    const control = this.formulario.controls.especialidadesIds;
    const actuales = control.value;
    control.setValue(actuales.includes(id) ? actuales.filter((e) => e !== id) : [...actuales, id]);
    control.markAsTouched();
    control.markAsDirty();
  }

  private readonly fichaDada = (this.estado?.['fichaId'] as string | undefined) ?? null;

  protected readonly nombreDeLaCuenta = (this.estado?.['nombre'] as string | undefined) ?? '';

  protected readonly modoCompletar = computed(() => !this.esEdicion() && this.fichaDada !== null);

  protected readonly titulo = computed(() => {
    if (this.esEdicion()) {
      return 'Editar odontólogo';
    }
    return this.modoCompletar() ? 'Completar registro profesional' : 'Registrar odontólogo';
  });

  private readonly copsUsados = signal<ReadonlySet<string>>(new Set());

  private readonly fichasOcupadas = signal<ReadonlySet<string>>(new Set());

  private cuentaCreada: Usuario | null = null;

  protected readonly formulario = this.fb.nonNullable.group({
    cop: ['', [Validators.required]],
    nombres: ['', [Validators.required]],
    apellidos: ['', [Validators.required]],
    fichaId: [''],
    especialidadesIds: [[] as string[], [Validators.required]],
    imagenUrl: [''],
    correo: [''],
    tipoDocumento: ['DNI' as TipoDocumento],
    documento: [''],
    passwordProvisional: ['', [Validators.minLength(8)]],
  });

  constructor() {
    cargarTodasLasPaginas((pagina) =>
      this.especialidadService.listar({ page: pagina, size: 100, sort: 'nombre,asc' }),
    ).subscribe({
      next: (lista) => this.especialidades.set(lista.filter((e) => e.activo)),
      error: (err: unknown) => this.error.set(mensajeDeError(err)),
    });

    if (this.id) {
      this.formulario.controls.fichaId.addValidators(Validators.required);
      this.cargarParaEdicion();
      return;
    }

    if (this.fichaDada) {
      this.formulario.controls.fichaId.setValue(this.fichaDada);
      this.formulario.controls.fichaId.addValidators(Validators.required);
    } else {
      this.formulario.controls.correo.addValidators([Validators.required, Validators.email]);
      this.formulario.controls.documento.addValidators(Validators.required);
      this.formulario.controls.tipoDocumento.addValidators(Validators.required);
    }

    cargarTodasLasPaginas((pagina) => this.servicio.listar({ page: pagina, size: 100 })).subscribe({
      next: (lista) => {
        this.copsUsados.set(new Set(lista.map((o) => o.cop)));
        this.fichasOcupadas.set(new Set(lista.map((o) => o.fichaId)));
        if (this.fichaDada && this.fichasOcupadas().has(this.fichaDada)) {
          this.error.set('Esa cuenta ya tiene su registro profesional; no hay nada que completar.');
        }
      },
      error: () => {
        this.copsUsados.set(new Set());
        this.fichasOcupadas.set(new Set());
      },
    });
  }

  private cargarParaEdicion(): void {
    const fila = this.estado?.['fila'] as Odontologo | undefined;

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

    const valores = this.formulario.getRawValue();

    if (this.id) {
      this.cargando.set(true);
      this.error.set(null);
      this.guardarProfesional(this.id, valores.fichaId);
      return;
    }

    if (this.copsUsados().has(valores.cop.trim())) {
      this.error.set('Ya existe un odontólogo con ese COP.');
      return;
    }

    this.cargando.set(true);
    this.error.set(null);

    if (this.fichaDada) {
      this.guardarProfesional(null, this.fichaDada);
      return;
    }

    const yaCreada = this.cuentaCreada;
    if (yaCreada?.fichaId) {
      this.guardarProfesional(null, yaCreada.fichaId);
      return;
    }

    this.crearCuenta();
  }

  private crearCuenta(): void {
    const valores = this.formulario.getRawValue();

    this.usuarioService
      .crear({
        nombre: `${valores.nombres.trim()} ${valores.apellidos.trim()}`,
        correo: valores.correo,
        rol: 'ODONTOLOGO',
        tipoDocumento: valores.tipoDocumento,
        documento: valores.documento,
        passwordProvisional: valores.passwordProvisional || undefined,
      })
      .subscribe({
        next: (cuenta) => {
          if (!cuenta.fichaId) {
            this.cargando.set(false);
            this.error.set(
              'La cuenta se creó, pero sin ficha, así que no se puede registrar el profesional' +
                ' sobre ella. Revísala en Cuentas de acceso.',
            );
            return;
          }
          this.cuentaCreada = cuenta;
          this.guardarProfesional(null, cuenta.fichaId);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(this.mensajeDelAltaDeCuenta(err));
        },
      });
  }

  private guardarProfesional(id: string | null, fichaId: string): void {
    const valores = this.formulario.getRawValue();
    const cuerpo = {
      cop: valores.cop,
      nombres: valores.nombres,
      apellidos: valores.apellidos,
      fichaId,
      especialidadesIds: valores.especialidadesIds,
      imagenUrl: valores.imagenUrl || undefined,
    };

    const peticion = id ? this.servicio.reemplazar(id, cuerpo) : this.servicio.crear(cuerpo);

    peticion.subscribe({
      next: () => {
        this.cargando.set(false);
        const cuenta = this.cuentaCreada;
        if (cuenta?.passwordProvisional) {
          this.dialogo.open(PasswordGeneradaDialogo, {
            data: { nombre: cuenta.nombre, password: cuenta.passwordProvisional },
            width: '28rem',
            disableClose: true,
          });
        } else {
          const aviso = id ? 'Odontólogo actualizado.' : 'Odontólogo registrado.';
          this.snackBar.open(aviso, 'Cerrar', { duration: 4000 });
        }
        void this.router.navigate(['/odontologos']);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        const base = mensajeDeError(err);
        this.error.set(
          this.cuentaCreada
            ? `${base} La cuenta de ${this.cuentaCreada.nombre} sí quedó creada; su registro` +
                ' profesional, no. Corrige lo que sobre y vuelve a guardar, que reintentará solo' +
                ' el registro; si te vas de aquí, lo terminas desde Cuentas de acceso con la' +
                ' acción «Completar registro profesional».'
            : base,
        );
      },
    });
  }

  private mensajeDelAltaDeCuenta(err: unknown): string {
    const base = mensajeDeError(err);
    if (err instanceof HttpErrorResponse && err.status === 409) {
      return (
        `${base} Si esa persona ya tiene cuenta, cámbiale el rol a ODONTOLOGO en Cuentas de` +
        ' acceso y vuelve aquí con la acción «Completar registro profesional».'
      );
    }
    return base;
  }

  protected cancelar(): void {
    void this.router.navigate(['/odontologos']);
  }
}
