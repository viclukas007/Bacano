/** Migración aditiva, ejecutada bajo el bloqueo de inicialización de db.ts. */
export const ESQUEMA_PAGOS = `
  CREATE TABLE IF NOT EXISTS estudio_pedidos (
    id uuid PRIMARY KEY,
    propietario_hash text NOT NULL,
    clave_idempotencia uuid NOT NULL,
    huella text NOT NULL,
    nombre text NOT NULL,
    correo text NOT NULL,
    telefono text NOT NULL,
    notas text NOT NULL DEFAULT '',
    moneda text NOT NULL DEFAULT 'MXN' CHECK (moneda = 'MXN'),
    total_centavos integer NOT NULL CHECK (total_centavos > 0),
    estado text NOT NULL DEFAULT 'creando' CHECK (estado IN ('creando','pendiente','rechazado','aprobado','expirado','revision')),
    motivo_revision text,
    preferencia_id text UNIQUE,
    checkout_url text,
    checkout_en_proceso_hasta timestamptz,
    pago_aprobado_id text UNIQUE,
    expira_en timestamptz NOT NULL,
    creado_en timestamptz NOT NULL DEFAULT now(),
    actualizado_en timestamptz NOT NULL DEFAULT now(),
    conciliado_en timestamptz,
    UNIQUE (propietario_hash, clave_idempotencia)
  );
  CREATE INDEX IF NOT EXISTS estudio_pedidos_pendientes ON estudio_pedidos (expira_en) WHERE estado IN ('creando','pendiente','rechazado');
  CREATE TABLE IF NOT EXISTS estudio_pedido_sesiones (
    pedido_id uuid NOT NULL REFERENCES estudio_pedidos(id),
    indice integer NOT NULL,
    desde timestamp NOT NULL,
    hasta timestamp NOT NULL CHECK (hasta > desde),
    configuracion jsonb NOT NULL,
    conceptos jsonb NOT NULL,
    total_centavos integer NOT NULL CHECK (total_centavos > 0),
    PRIMARY KEY (pedido_id, indice)
  );
  CREATE TABLE IF NOT EXISTS estudio_pagos (
    id text PRIMARY KEY,
    pedido_id uuid NOT NULL REFERENCES estudio_pedidos(id),
    estado text NOT NULL,
    detalle text NOT NULL DEFAULT '',
    importe_centavos integer NOT NULL,
    reembolsado_centavos integer NOT NULL DEFAULT 0,
    actualizado_mp timestamptz NOT NULL,
    actualizado_en timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS estudio_pagos_pedido ON estudio_pagos (pedido_id);
  ALTER TABLE reservas ADD COLUMN IF NOT EXISTS pedido_id uuid REFERENCES estudio_pedidos(id);
  ALTER TABLE reservas ADD COLUMN IF NOT EXISTS sesion_indice integer;
  ALTER TABLE reservas ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'confirmada' CHECK (estado IN ('confirmada','apartado'));
  ALTER TABLE reservas ADD COLUMN IF NOT EXISTS expira_en timestamptz;
  CREATE UNIQUE INDEX IF NOT EXISTS reservas_pedido_sesion ON reservas(pedido_id, sesion_indice) WHERE pedido_id IS NOT NULL;
`;
