# Bacano Web

Sitio de Bacano Media con programas, episodios, calendario y renta del estudio. Usa Next.js 16.4.3, React y PostgreSQL. El despliegue del VPS se administra desde EasyPanel; Docker Compose reproduce el entorno en local.

## Estado actual: 2026-10-29

El carrito y el backend de reservas/pagos están implementados. Se reutiliza la base PostgreSQL existente y su tabla `reservas`, con una migración aditiva para pedidos, sesiones, conceptos y pagos.

**Mercado Pago está activo en producción** en https://www.bacano.mx desde el 2026-10-28. El recorrido completo se validó primero en el entorno de prueba de Mercado Pago (pago aprobado, webhook, conciliación y reserva confirmada) y después se cambiaron las credenciales a producción. Ver [PAGOS-MERCADOPAGO.md](PAGOS-MERCADOPAGO.md). El primer pago real (28-oct) no se confirmó porque `MERCADOPAGO_COLLECTOR_ID` traía el ID de la aplicación en vez del User ID de la cuenta que cobra; la variable se corrigió el 29-oct y, desde entonces, el checkout se niega a cobrar si el vendedor de la preferencia no coincide con esa variable (detalle en [AVANCES-RESERVAS.md](AVANCES-RESERVAS.md)).

La validación local aprobó 32 pruebas (19 de reglas y 13 de integración), ESLint, TypeScript, build de producción y comprobaciones HTTP. Las pruebas de integración usan PostgreSQL real en una base temporal y simulan la API de Mercado Pago. Dominios en EasyPanel: `www.bacano.mx` es el principal y `bacano.mx` redirige a él (301). Pendientes: cron del mantenimiento en EasyPanel, borrar la reserva de prueba del 11-nov-2026 y la revisión visual/manual en móvil y escritorio.

## Ejecutar en local

En la primera instalación, copiar `.env.example` a `.env` si todavía no existe y configurar las claves de administrador, sesión y PostgreSQL. Las variables de Mercado Pago pueden quedar vacías y `MERCADOPAGO_ENABLED=false`.

```powershell
docker compose up -d --build web
```

- Sitio y carrito: http://127.0.0.1:3001/#estudio.
- Administrador: http://127.0.0.1:3001/admin.
- Pedidos: http://127.0.0.1:3001/admin/pedidos (requiere sesión).

El PostgreSQL local conserva sus datos en el volumen `bacano-db`. No eliminar el volumen al actualizar el sitio. En EasyPanel, cargar las variables de entorno en el servicio web y usar la conexión al PostgreSQL existente.

Para desarrollar fuera de Docker, ejecutar `npm ci` y `npm run dev` con `DATABASE_URL` y las demás variables configuradas; el servidor de desarrollo usa http://localhost:3000. La compilación sobre la unidad E: presentó limitaciones de archivos/junctions en Windows, por lo que el build de referencia se verifica en Docker/Linux.

## Reservas y pagos

El visitante configura sesiones entre las 08:00 y las 21:00, hora de Mérida, añade servicios y revisa sus datos y el total. El carrito se conserva en el navegador (`localStorage`, clave `bacano:carrito-estudio:v2`) sin guardar los datos de contacto; al cargarlo se descartan las sesiones cuya hora ya pasó y, cuando un pago se aprueba, se quitan las sesiones pagadas. Los precios están en `TARIFAS` de `src/lib/carrito-estudio.ts` y se documentan en [PLAN-RESERVAS.md](PLAN-RESERVAS.md).

Con el pago habilitado, el servidor valida el carrito, recalcula precios y crea un pedido con apartado temporal. El valor inicial es cobro completo y hasta 15 minutos de apartado, sujeto a la política comercial definitiva. Un pedido en línea lleva como máximo 6 sesiones y 26 horas; el tope de 3 pedidos abiertos cuenta por cookie y por dirección del cliente (último salto de `X-Forwarded-For`), y desde `/admin/pedidos` se pueden liberar los apartados de un pedido que nadie pagó. Solo un pago consultado y verificado en Mercado Pago confirma las reservas. Los pagos tardíos o duplicados, reembolsos y contracargos requieren revisión administrativa.

| Parte | Archivo o ruta |
| --- | --- |
| Catálogo y cálculos | `src/lib/carrito-estudio.ts` |
| Configurador y carrito | `src/components/carrito-estudio.tsx` |
| Validación del servidor y firma | `src/lib/pagos-estudio-reglas.ts` |
| Pedidos, apartados y confirmación | `src/lib/pagos-estudio.ts` |
| Cliente de Mercado Pago | `src/lib/mercado-pago.ts` |
| Esquema aditivo de pagos | `src/lib/pagos-estudio-esquema.ts` |
| Resultado del pedido | `/estudio/pago?pedido=<uuid>` |
| Administración de pedidos | `/admin/pedidos` |

## Validación

```powershell
docker compose --profile test run --build --rm pruebas
docker compose build web
docker compose up -d web
node scripts/verificar-pagos.mjs
```

El servicio `pruebas` crea y elimina una base temporal: no prueba escenarios sobre los datos del sitio. `verificar-pagos.mjs` comprueba el servidor local con el cobro deshabilitado y no crea pedidos. Para ejecutar lint con las dependencias locales actualizadas: `npm run lint`; para las 19 pruebas de reglas: `npm run test:estudio`.

## Documentación

- [Plan de reservas, implementación y pendientes](PLAN-RESERVAS.md).
- [Bitácora y resultados de validación](AVANCES-RESERVAS.md).
- [Configuración y activación de Mercado Pago](PAGOS-MERCADOPAGO.md).
