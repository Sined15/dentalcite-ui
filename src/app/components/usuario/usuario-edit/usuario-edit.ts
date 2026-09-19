import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { mensajeDeError } from '../../../core/http/api-error';
import {
  ROLES,
  ROLES_DEL_ALTA_DE_CUENTA,
  Rol,
  TIPOS_DOCUMENTO,
  TipoDocumento,
  Usuario,
} from '../../../models';
import { PacienteService } from '../../../services/paciente.service';
import { UsuarioService } from '../../../services/usuario.service';
import { PasswordGeneradaDialogo } from '../password-generada-dialogo';

@Component({
  selector: 'app-usuario-edit',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  template: `
    <h1>{{ esEdicion() ? 'Editar cuenta' : 'Nueva cuenta' }}</h1>

    <mat-card class="tarjeta">
      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" aria-label="Guardando" />
      }
      <mat-card-content>
        <form [formGroup]="formulario" (ngSubmit)="enviar()">
          @if (!esEdicion()) {
            <!--
              Esta pantalla reparte credenciales; no da de alta personas. Quien
              tiene expediente clinico nace donde se recogen los datos que su rol
              exige, y su cuenta sale de ahi.
            -->
            <p class="aviso">
              Aquí se reparten credenciales. Al odontólogo se le registra en
              <a routerLink="/odontologos/nuevo">Odontólogos</a>, con su colegiatura y sus
              especialidades, y su cuenta se crea ahí mismo. Al paciente se le da de alta en
              <a routerLink="/pacientes/nuevo">Pacientes</a>, con su consentimiento; su cuenta
              se crea aquí, después, para que pueda entrar al portal.
            </p>
          }

          <mat-form-field appearance="outline">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="nombre" />
            @if (formulario.controls.nombre.hasError('required')) {
              <mat-error>El nombre es obligatorio</mat-error>
            }
          </mat-form-field>

          @if (!esEdicion()) {
            <mat-form-field appearance="outline">
              <mat-label>Correo</mat-label>
              <input matInput type="email" formControlName="correo" />
              <mat-hint>El correo no se puede cambiar despues del alta</mat-hint>
              @if (formulario.controls.correo.hasError('required')) {
                <mat-error>El correo es obligatorio</mat-error>
              } @else if (formulario.controls.correo.hasError('email')) {
                <mat-error>El formato del correo es inválido</mat-error>
              }
            </mat-form-field>
          }

          <!--
            En alta faltan los odontologos, que se dan de alta con su registro
            profesional en su propio menu. En edicion estan los cuatro, porque
            cambiar el rol de una cuenta que ya existe es cosa del administrador, y
            es lo que permite ascender a odontologo a quien ya tenia cuenta.
          -->
          <mat-form-field appearance="outline">
            <mat-label>Rol</mat-label>
            <mat-select formControlName="rol">
              @for (rol of rolesOfrecidos; track rol) {
                <mat-option [value]="rol">{{ rol }}</mat-option>
              }
            </mat-select>
            @if (formulario.controls.rol.hasError('required')) {
              <mat-error>El rol es obligatorio</mat-error>
            }
          </mat-form-field>

          @if (esAltaDePaciente()) {
            <!--
              La cuenta del paciente se levanta sobre la ficha que ya tiene, y el
              documento es lo que la encuentra. Sin ficha la cuenta no puede
              reservar —el servidor responde 403—, que es lo unico que el paciente
              iba a hacer con ella.
            -->
            <p class="nota">
              Da acceso al portal a un paciente que ya está registrado. Si todavía no lo está,
              regístralo primero en <a routerLink="/pacientes/nuevo">Pacientes</a>, con su
              consentimiento.
            </p>

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
                <mat-hint>El del paciente al que se le da la cuenta</mat-hint>
                @if (formulario.controls.documento.hasError('required')) {
                  <mat-error>El documento es obligatorio</mat-error>
                }
              </mat-form-field>
            </div>
          }

          @if (!esEdicion()) {
            <mat-form-field appearance="outline">
              <mat-label>Contraseña provisional (opcional)</mat-label>
              <input
                matInput
                type="text"
                formControlName="passwordProvisional"
                autocomplete="off"
              />
              <mat-hint>Si la dejas vacia, el sistema la genera y la muestra una sola vez</mat-hint>
              @if (formulario.controls.passwordProvisional.hasError('minlength')) {
                <mat-error>Debe tener al menos 8 caracteres</mat-error>
              }
            </mat-form-field>
          } @else {
            <mat-checkbox formControlName="activo">Cuenta activa</mat-checkbox>
            <p class="nota">
              Desactivarla le impide iniciar sesion (RN-12) e invalida sus tokens vigentes.
            </p>
          }

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
      max-width: 40rem;
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
      flex: 1 1 12rem;
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
      margin: 0 0 1rem;
    }
    .nota {
      font-size: 0.8125rem;
      opacity: 0.75;
      margin: 0.25rem 0 0;
    }
  `,
})
export class UsuarioEdit {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(UsuarioService);
  private readonly pacienteService = inject(PacienteService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogo = inject(MatDialog);

  private readonly id = this.ruta.snapshot.paramMap.get('id');

  protected readonly rolesOfrecidos = this.id === null ? ROLES_DEL_ALTA_DE_CUENTA : ROLES;
  protected readonly tiposDocumento = TIPOS_DOCUMENTO;

  protected readonly esEdicion = signal(this.id !== null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    correo: ['', [Validators.required, Validators.email]],
    rol: ['RECEPCIONISTA' as Rol, [Validators.required]],
    tipoDocumento: ['DNI' as TipoDocumento],
    documento: [''],
    passwordProvisional: ['', [Validators.minLength(8)]],
    activo: [true],
  });

  private readonly rolSeleccionado = toSignal(this.formulario.controls.rol.valueChanges, {
    initialValue: this.formulario.controls.rol.value,
  });

  protected readonly esAltaDePaciente = computed(
    () => !this.esEdicion() && this.rolSeleccionado() === 'PACIENTE',
  );

  constructor() {
    // El documento solo se pide —y solo se exige— para la cuenta del paciente:
    // recepcion y administracion no tienen expediente clinico, y crearles una
    // ficha dejaba en el padron un paciente sin nombre.
    effect(() => {
      const doc = this.formulario.controls.documento;
      if (this.esAltaDePaciente()) {
        doc.addValidators(Validators.required);
      } else {
        doc.removeValidators(Validators.required);
      }
      doc.updateValueAndValidity({ emitEvent: false });
    });

    if (this.id) {
      // En edicion el correo no se envia: el PUT solo reemplaza nombre, rol y
      // estado.
      this.formulario.controls.correo.disable();
      this.formulario.controls.tipoDocumento.disable();
      this.formulario.controls.documento.disable();
      this.formulario.controls.passwordProvisional.disable();
      this.cargarParaEdicion();
    } else {
      this.formulario.controls.activo.disable();
    }
  }

  private cargarParaEdicion(): void {
    const fila = this.router.getCurrentNavigation()?.extras.state?.['fila'] as Usuario | undefined;

    if (fila) {
      this.rellenar(fila);
      return;
    }

    // A diferencia del catalogo, usuarios si expone GET /{id}.
    this.cargando.set(true);
    this.servicio.obtener(this.id as string).subscribe({
      next: (usuario) => {
        this.cargando.set(false);
        this.rellenar(usuario);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  private rellenar(fila: Usuario): void {
    this.formulario.patchValue({
      nombre: fila.nombre,
      correo: fila.correo,
      rol: fila.rol,
      activo: fila.activo,
    });
  }

  protected enviar(): void {
    if (this.formulario.invalid || this.cargando()) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);

    const valores = this.formulario.getRawValue();

    if (this.id) {
      // PUT: reemplazo total, los tres campos obligatorios.
      this.servicio
        .reemplazar(this.id, {
          nombre: valores.nombre,
          rol: valores.rol,
          activo: valores.activo,
        })
        .subscribe({
          next: () => {
            this.cargando.set(false);
            this.snackBar.open('Cuenta actualizada.', 'Cerrar', { duration: 4000 });
            void this.router.navigate(['/usuarios']);
          },
          error: (err: unknown) => {
            this.cargando.set(false);
            this.error.set(mensajeDeError(err));
          },
        });
      return;
    }

    if (this.esAltaDePaciente()) {
      this.crearCuentaDePaciente();
      return;
    }

    // Recepcion y administracion van sin documento: nada en el sistema las
    // resuelve por su ficha, y la que se creaba nacia sin nombres y se colaba en
    // el padron como un paciente identificado solo por su numero de historia.
    this.crearCuenta();
  }

  /**
   * La cuenta del paciente se comprueba contra el padron antes de crearla.
   *
   * <p>El administrador la crea para que el paciente entre al portal, y para eso
   * la cuenta necesita ficha: sin ella no puede reservar. Mandar el documento a
   * ciegas tambien sirve —el servidor vincula la ficha si existe—, pero cuando no
   * existe la crea sin nombres ni consentimiento, y entonces la cuenta es de
   * alguien que no esta registrado como paciente. Buscarlo primero convierte ese
   * caso en un aviso que dice donde registrarlo.
   */
  private crearCuentaDePaciente(): void {
    const valores = this.formulario.getRawValue();
    const documento = valores.documento.trim();

    this.pacienteService.buscar(documento, { page: 0, size: 5 }).subscribe({
      next: (respuesta) => {
        const ficha = respuesta.content.find((p) => p.documento === documento);

        if (!ficha) {
          this.cargando.set(false);
          this.error.set(
            'No hay ningún paciente con ese documento. Regístralo primero en Pacientes, con su' +
              ' consentimiento, y vuelve a crear su cuenta.',
          );
          return;
        }
        if (ficha.tieneCuenta) {
          this.cargando.set(false);
          const quien = `${ficha.apellidos ?? ''}, ${ficha.nombres ?? ''}`.trim();
          this.error.set(`${quien} ya tiene cuenta; una ficha no admite dos.`);
          return;
        }

        this.crearCuenta();
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  /**
   * El alta en si. El documento viaja solo en la cuenta del paciente, que es la
   * unica que se levanta sobre una ficha.
   */
  private crearCuenta(): void {
    const valores = this.formulario.getRawValue();
    const deUnPaciente = this.esAltaDePaciente();

    this.servicio
      .crear({
        nombre: valores.nombre,
        correo: valores.correo,
        rol: valores.rol,
        tipoDocumento: deUnPaciente ? valores.tipoDocumento : undefined,
        documento: deUnPaciente ? valores.documento.trim() : undefined,
        passwordProvisional: valores.passwordProvisional || undefined,
      })
      .subscribe({
        next: (creado) => {
          this.cargando.set(false);
          // El backend solo devuelve la contraseña si la genero el.
          if (creado.passwordProvisional) {
            this.dialogo.open(PasswordGeneradaDialogo, {
              data: { nombre: creado.nombre, password: creado.passwordProvisional },
              width: '28rem',
              disableClose: true,
            });
          } else {
            this.snackBar.open('Cuenta creada.', 'Cerrar', { duration: 4000 });
          }
          void this.router.navigate(['/usuarios']);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }

  protected cancelar(): void {
    void this.router.navigate(['/usuarios']);
  }
}
