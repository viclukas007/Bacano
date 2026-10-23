import { FormularioClave } from "./formulario";

export default function Clave() {
  return (
    <>
      <h1 className="display mb-2 text-[2.5rem] text-white">Clave del admin</h1>
      <p className="mb-6 max-w-[560px] text-[14px] text-gris">
        Al cambiarla se cierran todas las sesiones abiertas, esta incluida, y
        hay que volver a entrar con la nueva. La variable{" "}
        <code className="text-white">ADMIN_PASSWORD</code> del servidor deja de
        valer en cuanto haya una clave guardada aquí.
      </p>
      <FormularioClave />
    </>
  );
}
