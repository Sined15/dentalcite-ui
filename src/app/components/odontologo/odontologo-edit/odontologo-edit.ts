import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
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
import { PasswordGeneradaDialogo } from '../../usuario/password-generada-dialogo';

/**
 * Alta y edicion del odontologo.
 *
 * <p>El alta es de una sola pantalla a proposito. El profesional es el sujeto y
 * la cuenta es lo que se le cuelga, no al contrario: antes habia que empezar en
 * «Cuentas de acceso», crear alli una cuenta con documento y volver aqui a
 * elegir su ficha en un desplegable, de modo que nadie podia existir como
 * profesional hasta tener credenciales. Ahora este formulario recoge las dos
 * mitades y encadena las dos llamadas.
 *
 * <p>El orden no es negociable: primero la cuenta, porque el registro del
 * profesional exige que la ficha ya tenga una de rol odontologo y la rechaza si
 * no. Como son dos llamadas, no es atomico; el segundo modo de alta —el que
 * recibe una ficha ya creada— es lo que permite terminar el trabajo cuando el
 * segundo paso falla, y el listado de cuentas marca las que quedaron a medias.
 */
@Component({
  selector: 'app-odontologo-edit',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  template: `
    <h1>{{ titulo() }}</h1>

    <mat-card class="tarjeta">
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
            <!--
              La ficha queda fijada al registrar: es el vinculo por el que su
              cuenta resuelve a este registro, y repuntarla trasladaria su agenda
              a otra persona. El servidor lo rechaza, asi que aqui es de solo
              lectura.
            -->
            <mat-form-field appearance="outline">
              <mat-label>Ficha vinculada</mat-label>
              <input matInput [value]="formulario.controls.fichaId.value" disabled />
              <mat-hint>La ficha no se puede cambiar una vez registrado</mat-hint>
            </mat-form-field>
          } @else if (!modoCompletar()) {
            <!--
              La cuenta con la que entrara al sistema. El documento es lo que crea
              o vincula su ficha, y sin ficha su cuenta no resolveria a este
              registro: no podria declarar su horario, ver su agenda ni cerrar sus
              citas.
            -->
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
              <mat-hint>Si la dejas vacia, el sistema la genera y la muestra una sola vez</mat-hint>
              @if (formulario.controls.passwordProvisional.hasError('minlength')) {
                <mat-error>Debe tener al menos 8 caracteres</mat-error>
              }
            </mat-form-field>

            <h2 class="seccion">Registro profesional</h2>
          }

          <mat-form-field appearance="outline">
            <mat-label>Especialidades</mat-label>
            <mat-select formControlName="especialidadesIds" multiple>
              @for (esp of especialidades(); track esp.id) {
                <mat-option [value]="esp.id">{{ esp.nombre }}</mat-option>
              }
            </mat-select>
            <mat-hint>Determinan qué tratamientos se le pueden asignar</mat-hint>
            @if (formulario.controls.especialidadesIds.hasError('required')) {
              <mat-error>Debes asignar al menos una especialidad</mat-error>
            }
          </mat-form-field>

          <!--
            La imagen con la que se presenta al publico. Es una ruta, no una
            subida; las de demostracion viajan con este cliente.
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
    .seccion {
      font-size: 1rem;
      font-weight: 500;
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

  /**
   * La ficha que llega desde el listado de cuentas cuando se viene a terminar el
   * registro de una cuenta que quedo a medias. Su presencia es lo que distingue
   * los dos modos del alta.
   */
  private readonly fichaDada = (this.estado?.['fichaId'] as string | undefined) ?? null;

  protected readonly nombreDeLaCuenta = (this.estado?.['nombre'] as string | undefined) ?? '';

  protected readonly modoCompletar = computed(() => !this.esEdicion() && this.fichaDada !== null);

  protected readonly titulo = computed(() => {
    if (this.esEdicion()) {
      return 'Editar odontólogo';
    }
    return this.modoCompletar() ? 'Completar registro profesional' : 'Registrar odontólogo';
  });

  /** Las colegiaturas ya usadas, para no llegar a crear la cuenta de un COP repetido. */
  private readonly copsUsados = signal<ReadonlySet<string>>(new Set());

  /** Las fichas que ya tienen registro profesional: no admiten un segundo enlace. */
  private readonly fichasOcupadas = signal<ReadonlySet<string>>(new Set());

  /** La cuenta del primer paso, para mostrar su contraseña cuando todo acabe bien. */
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
      // El alta completa crea tambien la cuenta, y esos tres campos son los que
      // la componen.
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

    const valores = this.formulario.getRawValue();

    if (this.id) {
      this.cargando.set(true);
      this.error.set(null);
      this.guardarProfesional(this.id, valores.fichaId);
      return;
    }

    // La colegiatura repetida es la causa mas probable de que falle el registro,
    // y atajarla aqui evita crear una cuenta que se quedaria suelta.
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

    // Reintento despues de que fallara el segundo paso: la cuenta ya existe, y
    // volver a crearla con el mismo correo solo daria un conflicto. Sin esto,
    // pulsar Guardar otra vez —que es lo que cualquiera hace tras corregir el
    // COP— dejaba el alta atascada en un 409 que no explicaba nada.
    const yaCreada = this.cuentaCreada;
    if (yaCreada?.fichaId) {
      this.guardarProfesional(null, yaCreada.fichaId);
      return;
    }

    this.crearCuenta();
  }

  /**
   * Primer paso del alta: la cuenta con la que entrara al sistema. Su respuesta
   * trae la ficha, que es lo que el registro profesional necesita.
   */
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

  /**
   * Segundo paso del alta —o la edicion, que es una sola llamada—. Si esto falla
   * despues de haber creado la cuenta, el mensaje lo dice: la persona ya puede
   * entrar al sistema, pero todavia no es odontologo para el.
   */
  private guardarProfesional(id: string | null, fichaId: string): void {
    const valores = this.formulario.getRawValue();
    // El PUT reemplaza el recurso entero: mandar la imagen vacia la borraria, y
    // no mandarla, tambien.
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

  /**
   * El conflicto con enjundia del primer paso: la persona ya tiene cuenta, casi
   * siempre porque se registro antes como paciente. No se le puede crear otra, y
   * la salida es cambiarle el rol y volver a terminar el registro.
   */
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
