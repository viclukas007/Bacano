import type { ComponentProps, ReactNode } from "react";

/**
 * Piezas de formulario del admin, con la misma paleta que el sitio.
 */

const ENTRADA =
  "w-full border-2 border-borde bg-humo px-3.5 py-3 text-[15px] text-white placeholder:text-gris-tenue focus:border-cian focus:outline-none disabled:opacity-60";

export function Campo({
  etiqueta,
  ayuda,
  children,
}: {
  etiqueta: string;
  ayuda?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="display mb-1.5 block text-[13px] tracking-[0.14em] text-cian">
        {etiqueta}
      </span>
      {children}
      {ayuda && <span className="mt-1.5 block text-[13px] text-gris-suave">{ayuda}</span>}
    </label>
  );
}

export function Entrada(props: ComponentProps<"input">) {
  return <input {...props} className={`${ENTRADA} ${props.className ?? ""}`} />;
}

export function Area(props: ComponentProps<"textarea">) {
  return (
    <textarea
      rows={3}
      {...props}
      className={`${ENTRADA} ${props.className ?? ""}`}
    />
  );
}

export function Selector(props: ComponentProps<"select">) {
  return <select {...props} className={`${ENTRADA} ${props.className ?? ""}`} />;
}

export function Casilla({
  etiqueta,
  ...props
}: ComponentProps<"input"> & { etiqueta: string }) {
  return (
    <label className="flex items-center gap-2.5 text-[15px] text-white">
      <input type="checkbox" {...props} className="size-4 accent-cian" />
      {etiqueta}
    </label>
  );
}

export function Boton({
  variante = "principal",
  ...props
}: ComponentProps<"button"> & { variante?: "principal" | "secundario" | "peligro" }) {
  const estilos = {
    principal: "bg-cian text-tinta hover:bg-white",
    secundario: "border-2 border-white text-white hover:bg-white hover:text-tinta",
    peligro: "border-2 border-vivo text-vivo hover:bg-vivo hover:text-white",
  }[variante];
  return (
    <button
      type="submit"
      {...props}
      className={`display px-5 py-3 text-[16px] tracking-[0.06em] transition-colors disabled:opacity-60 ${estilos} ${props.className ?? ""}`}
    />
  );
}

export function Aviso({ tipo, children }: { tipo: "error" | "ok"; children: ReactNode }) {
  return (
    <p
      role="status"
      className={`border-2 px-4 py-3 text-[14px] ${
        tipo === "error" ? "border-vivo text-vivo" : "border-cian text-cian"
      }`}
    >
      {children}
    </p>
  );
}
