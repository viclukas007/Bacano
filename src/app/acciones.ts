"use server";

export type EstadoSuscripcion = {
  ok: boolean;
  mensaje: string;
} | null;

// Validación deliberadamente laxa: solo descarta lo que claramente no es un
// correo. La confirmación real la da el mail de bienvenida.
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function suscribir(
  _previo: EstadoSuscripcion,
  formData: FormData,
): Promise<EstadoSuscripcion> {
  const correo = String(formData.get("correo") ?? "").trim();

  if (!CORREO.test(correo)) {
    return { ok: false, mensaje: "Revisá el correo, parece incompleto." };
  }

  // TODO(admin): guardar en la base y disparar el correo de bienvenida.
  // Por ahora solo queda registrado en el log del servidor.
  console.log("[bacano] alta de newsletter:", correo);

  return {
    ok: true,
    mensaje: "Listo. Te avisamos el día del relanzamiento.",
  };
}
