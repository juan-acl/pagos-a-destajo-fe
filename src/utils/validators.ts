// Validadores reutilizables para todos los módulos

const SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/;
const CODIGO_REGEX = /^[a-zA-Z0-9\-_]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOMBRE_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ0-9\s\-_.]+$/;

const HOY = new Date();
HOY.setHours(0, 0, 0, 0);
const MIN_FECHA = new Date("2000-01-01");

export type Errors = Record<string, string>;

// ── Empleado ────────────────────────────────────────────
export type EmpleadoFormData = {
  primerNombre: string;
  segundoNombre?: string | null;
  primerApellido: string;
  segundoApellido?: string | null;
  email: string;
  password: string;
  codigoEmpleado?: string | null;
  pstPuesto?: number | null;
  estado: string;
};

export function validateEmpleado(form: EmpleadoFormData, isEdit: boolean): Errors {
  const e: Errors = {};

  // Primer nombre
  if (!form.primerNombre.trim())
    e.primerNombre = "El primer nombre es obligatorio.";
  else if (form.primerNombre.trim().length < 2)
    e.primerNombre = "Mínimo 2 caracteres.";
  else if (form.primerNombre.trim().length > 50)
    e.primerNombre = "El nombre no puede superar 50 caracteres.";
  else if (!SOLO_LETRAS.test(form.primerNombre.trim()))
    e.primerNombre = "Solo se permiten letras y espacios.";

  // Segundo nombre (opcional)
  if (form.segundoNombre?.trim()) {
    if (form.segundoNombre.trim().length > 50)
      e.segundoNombre = "El nombre no puede superar 50 caracteres.";
    else if (!SOLO_LETRAS.test(form.segundoNombre.trim()))
      e.segundoNombre = "Solo se permiten letras y espacios.";
  }

  // Primer apellido
  if (!form.primerApellido.trim())
    e.primerApellido = "El primer apellido es obligatorio.";
  else if (form.primerApellido.trim().length < 2)
    e.primerApellido = "Mínimo 2 caracteres.";
  else if (form.primerApellido.trim().length > 50)
    e.primerApellido = "El apellido no puede superar 50 caracteres.";
  else if (!SOLO_LETRAS.test(form.primerApellido.trim()))
    e.primerApellido = "Solo se permiten letras y espacios.";

  // Segundo apellido (opcional)
  if (form.segundoApellido?.trim()) {
    if (form.segundoApellido.trim().length > 50)
      e.segundoApellido = "El apellido no puede superar 50 caracteres.";
    else if (!SOLO_LETRAS.test(form.segundoApellido.trim()))
      e.segundoApellido = "Solo se permiten letras y espacios.";
  }

  // Email
  if (!form.email.trim())
    e.email = "El correo electrónico es obligatorio.";
  else if (!EMAIL_REGEX.test(form.email.trim()))
    e.email = "Ingresa un correo electrónico válido. Ej: nombre@correo.com";

  // Contraseña
  if (!isEdit) {
    if (!form.password.trim())
      e.password = "La contraseña es obligatoria.";
    else if (form.password.trim().length < 6)
      e.password = "La contraseña debe tener al menos 6 caracteres.";
  } else if (form.password.trim() && form.password.trim().length < 6) {
    e.password = "La contraseña debe tener al menos 6 caracteres.";
  }

  // Código (opcional)
  if (form.codigoEmpleado?.trim()) {
    if (form.codigoEmpleado.trim().length > 20)
      e.codigoEmpleado = "El código no puede superar 20 caracteres.";
    else if (!CODIGO_REGEX.test(form.codigoEmpleado.trim()))
      e.codigoEmpleado = "El código solo puede tener letras, números y guiones.";
  }

  return e;
}

// ── Cuadrilla ────────────────────────────────────────────
export type CuadrillaFormData = {
  nombre: string;
  codigoCuadrilla?: string | null;
  areaId?: number | null;
  estado: string;
};

export function validateCuadrilla(form: CuadrillaFormData): Errors {
  const e: Errors = {};

  if (!form.nombre.trim())
    e.nombre = "El nombre de la cuadrilla es obligatorio.";
  else if (form.nombre.trim().length < 2)
    e.nombre = "Mínimo 2 caracteres.";
  else if (form.nombre.trim().length > 80)
    e.nombre = "El nombre no puede superar 80 caracteres.";
  else if (!NOMBRE_REGEX.test(form.nombre.trim()))
    e.nombre = "Solo se permiten letras, números, espacios, guiones y puntos.";

  if (form.codigoCuadrilla?.trim()) {
    if (form.codigoCuadrilla.trim().length > 20)
      e.codigoCuadrilla = "El código no puede superar 20 caracteres.";
    else if (!CODIGO_REGEX.test(form.codigoCuadrilla.trim()))
      e.codigoCuadrilla = "El código solo puede tener letras, números y guiones.";
  }

  return e;
}

// ── Miembro Cuadrilla ────────────────────────────────────
export type MiembroFormData = {
  empleadoId: number;
  cuadrillaId: number;
  fechaIngreso: string;
  estado: string;
};

export function validateMiembro(form: MiembroFormData): Errors {
  const e: Errors = {};

  if (!form.empleadoId || form.empleadoId === 0)
    e.empleadoId = "Debes seleccionar un empleado.";

  if (!form.cuadrillaId || form.cuadrillaId === 0)
    e.cuadrillaId = "Debes seleccionar una cuadrilla.";

  if (form.fechaIngreso) {
    const fecha = new Date(form.fechaIngreso + "T12:00:00");
    if (isNaN(fecha.getTime()))
      e.fechaIngreso = "La fecha ingresada no es válida.";
    else if (fecha > HOY)
      e.fechaIngreso = "La fecha de ingreso no puede ser futura.";
    else if (fecha < MIN_FECHA)
      e.fechaIngreso = "La fecha de ingreso no puede ser anterior al año 2000.";
  }

  return e;
}

// ── Helper: ¿hay errores? ─────────────────────────────────
export const hasErrors = (errors: Errors) => Object.keys(errors).length > 0;