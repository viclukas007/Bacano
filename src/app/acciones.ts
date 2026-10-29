"use server";

export type EstadoSuscripcion = {
  ok: boolean;
  mensaje: string;
} | null;

// Validación deliberadamente laxa: solo descarta lo que claramente no es un
// correo. La confirmación real la da el mail de bienvenida.
//
// El tope de longitud va ANTES del regex y en el patrón ninguna parte se
// solapa con la siguiente (las etiquetas del dominio no llevan "."), así el
// costo es lineal: el patrón anterior se trababa con un campo largo y dejaba
// el proceso de Node bloqueado varios segundos por petición.
const MAX_CORREO = 254;
const CORREO = /^[^\s@]{1,64}@[^\s@.]+(?:\.[^\s@.]+)*\.[^\s@.]{2,}$/;

export async function suscribir(
  _previo: EstadoSuscripcion,
  formData: FormData,
): Promise<EstadoSuscripcion> {
  const valor = formData.get("correo");
  const correo = typeof valor === "string" ? valor.trim() : "";

  if (correo.length > MAX_CORREO || !CORREO.test(correo)) {
    return { ok: false, mensaje: "Revisa el correo, parece incompleto." };
  }

  // TODO(admin): guardar en la base y disparar el correo de bienvenida.
  // Por ahora solo queda registrado en el log del servidor.
  console.log("[bacano] alta de newsletter:", correo);

  return {
    ok: true,
    mensaje: "Listo. Te avisamos el día del relanzamiento.",
  };
}
