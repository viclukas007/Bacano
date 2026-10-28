# Pagos y reservas con Mercado Pago

## Estado

Integración implementada para Checkout Pro vía Preferences API. Usa PostgreSQL y las reservas existentes.

**Producción activa desde el 2026-10-28.** Aplicación "Bacano Estudio" (ID 1433857921998790) en la cuenta de Mercado Pago de Bacano; `APP_URL=https://www.bacano.mx`, `MERCADOPAGO_ENV=production`, webhook productivo en `https://www.bacano.mx/api/mercadopago/webhook` con el evento "Pagos (legacy)" (es el tópico `payment` que procesa el webhook). Antes de pasar a producción se validó el recorrido completo en el entorno de prueba: pago aprobado con tarjeta de prueba, webhook recibido, conciliación por mantenimiento y reserva confirmada visible en `/admin/pedidos` y en el calendario público.

Validación local del 2026-10-25: 32 pruebas aprobadas (19 de reglas y 13 de integración), ESLint, TypeScript, build y comprobación HTTP. La revisión visual/manual en móvil y escritorio sigue pendiente.

## Lecciones de la activación (2026-10-28)

- **El proxy de EasyPanel sustituye cualquier respuesta 502 por su propia página HTML** ("Not Found", sin encabezados ni cookies de la app). Por eso los fallos del proveedor y del mantenimiento se devuelven como 503, que sí llega intacto al navegador.
- Con las credenciales de prueba actuales el checkout de prueba corre en `www.mercadopago.com.mx`: hay que usar `init_point`; `sandbox_init_point` termina en "Algo salió mal".
- En modo de prueba el **comprador tiene que ser un usuario de prueba** (panel → Cuentas de prueba, iniciar sesión con él en una ventana de incógnito). Una cuenta real o pagar como invitado devuelve "Una de las partes con la que intentas hacer el pago es de prueba".
- Los pagos entre usuarios de prueba llegan con `live_mode: true`. `live_mode` solo se exige en producción.
- `APP_URL` debe ser exactamente el origen por el que entra la gente (con o sin `www`): si no coincide, el checkout responde 403 "Abre el formulario desde el sitio de Bacano".
- Si un webhook falla, Mercado Pago lo reintenta con esperas crecientes; el mantenimiento consulta el pago en la API y lo aplica sin esperar el reintento.
- Para comprobar la clave del webhook sin pagar: panel → Webhooks → "Simular notificación" con el evento Pagos y un ID cualquiera. Si el servidor responde 401, la clave en EasyPanel no coincide; si responde 503 (pago inexistente), la firma pasó.
- El dominio sin `www` debe redirigir al principal (regla de Redirects en EasyPanel); si ambos sirven el sitio, el que no coincide con `APP_URL` falla al pagar.

## Orden de activación

1. Confirmar políticas de cobro, cancelación, facturación y tratamiento de datos. Los valores actuales son cobro completo y hasta 15 minutos de apartado.
2. Preparar un dominio HTTPS accesible desde Internet y configurar `APP_URL` con su origen.
3. Cargar en el servidor las credenciales, vendedor y secreto de la aplicación del entorno de prueba. Mantener `MERCADOPAGO_ENV=test`.
4. Configurar el evento Pagos hacia el Webhook y el mantenimiento autenticado cada minuto, según las secciones siguientes.
5. Con la configuración completa, establecer `MERCADOPAGO_ENABLED=true` en el entorno de prueba y reiniciar/recrear el servicio web. En Docker local: `docker compose up -d web`.
6. Completar compras de prueba y verificar aprobación, rechazo, pendiente, retorno, firma, reintentos, vencimientos y calendario/administrador. Revisar el recorrido móvil y escritorio.
7. Para producción, usar el vendedor, credenciales y secreto correspondientes, `MERCADOPAGO_ENV=production`, dominio HTTPS y activación explícita; actualizar el servicio web.

Tener Docker levantado o la migración aplicada no habilita el cobro. Las variables de entorno se leen en el servicio web; los cambios requieren actualizar ese servicio. Nunca publicar los valores de los secretos en los Markdown.

## Configuración

Copiar los nombres de `.env.example` al entorno local o al servicio web de EasyPanel. En producción se cargan en EasyPanel, no en el navegador ni en el repositorio.

| Variable | Valor |
| --- | --- |
| `APP_URL` | Origen público exacto por el que entra la gente, sin rutas: `https://www.bacano.mx` |
| `MERCADOPAGO_ENABLED` | `false` inicialmente; `true` al terminar configuración y pruebas |
| `MERCADOPAGO_ENV` | `test` o `production`; se compara contra `live_mode` del pago |
| `MERCADOPAGO_ACCESS_TOKEN` | Access Token del vendedor y entorno elegidos; secreto de servidor |
| `MERCADOPAGO_COLLECTOR_ID` | ID numérico del vendedor que recibe el pago |
| `MERCADOPAGO_WEBHOOK_SECRET` | Clave secreta de Webhooks de esa aplicación |
| `ESTUDIO_APARTADO_MINUTOS` | `15` inicialmente; entero entre 5 y 60 |
| `ESTUDIO_CRON_SECRET` | Secreto aleatorio de al menos 32 caracteres para mantenimiento |

La integración redirige al checkout alojado: no usa Public Key ni captura tarjetas en Bacano. El token privado nunca se entrega al cliente. `APP_URL` debe usar HTTPS; se permite HTTP exclusivamente en `test` sobre `localhost` o `127.0.0.1`. Para que Mercado Pago notifique una prueba local, usar un dominio HTTPS accesible desde Internet.

En Developers, seleccionar la aplicación y configurar el evento **Pagos** hacia:

`https://tu-dominio.mx/api/mercadopago/webhook`

Las URLs de retorno se crean automáticamente como `/estudio/pago?pedido=<uuid>`. Los parámetros de resultado enviados por el checkout no confirman la reserva. La página lee el estado del servidor y exige la cookie HttpOnly del navegador que inició el pedido. No muestra datos de contacto.

Esta versión procesa un pago completo en MXN. Se excluyen ticket, cajero y transferencia para reducir aprobaciones fuera del apartado. No habilitar pagos divididos en dos medios: requerirían conciliación adicional de la orden comercial. Las políticas comerciales de anticipos, impuestos, facturación y cancelaciones siguen pendientes de definición.

## Estados y vencimiento

- `creando`: apartado creado; preferencia en preparación o reintentable tras fallo externo.
- `pendiente`: checkout creado o pago aún sin aprobación.
- `rechazado`: intento rechazado/cancelado; conserva el apartado hasta su vencimiento para reintentar.
- `aprobado`: pago consultado en la API, validado y todas las sesiones confirmadas en una transacción.
- `expirado`: apartado vencido; horarios disponibles.
- `revision`: pago tardío, pago duplicado aprobado, devolución o contracargo. No realiza reembolsos ni cambia automáticamente reservas confirmadas.

El apartado vence a los minutos configurados o al inicio de la primera sesión, lo que ocurra antes. El calendario ignora apartados vencidos al leer la base. Antes de nuevas operaciones se eliminan sus filas de `reservas` y se actualiza el pedido, bajo bloqueo transaccional. Las reservas confirmadas no se eliminan en esa limpieza.

Un pago aprobado con un apartado ya vencido siempre va a revisión, aunque el horario siga libre. Esto evita adjudicar un horario que pudo ofrecerse a otra persona. Si hubo un segundo pago, el primero conserva la reserva y el pedido aparece para revisión en `/admin/pedidos`.

## Rutas implementadas

| Ruta | Método | Función y acceso |
| --- | --- | --- |
| `/api/estudio/checkout` | POST | Valida el carrito y crea/recupera pedido y checkout; exige origen del sitio y configuración completa |
| `/api/mercadopago/webhook` | POST | Verifica firma, consulta el pago y actualiza el pedido |
| `/api/estudio/pedidos/[id]` | GET | Devuelve estado y sesiones; exige la cookie del navegador que creó el pedido y responde sin caché |
| `/api/estudio/mantenimiento` | POST | Libera apartados y concilia; exige Bearer con `ESTUDIO_CRON_SECRET` |
| `/estudio/pago?pedido=<uuid>` | Página | Muestra el estado interno; no confía en parámetros de aprobación del retorno |
| `/admin/pedidos` | Página | Muestra contacto, conceptos y pagos; exige sesión de administrador |

## Mantenimiento

Programar cada minuto una petición **POST** a:

`https://tu-dominio.mx/api/estudio/mantenimiento`

Con encabezado `Authorization: Bearer <ESTUDIO_CRON_SECRET>`. Guardar el secreto en el gestor de tareas del servidor, evitando incluirlo en registros públicos. El endpoint libera apartados vencidos y concilia hasta diez pedidos abiertos o vencidos de los últimos siete días por ejecución. Los Webhooks atienden también notificaciones posteriores a ese periodo. Un fallo temporal devuelve error para poder supervisar/reintentar el cron.

La página de resultado también intenta conciliar el pedido, con límite de frecuencia. Los reembolsos/contracargos de pedidos ya aprobados dependen de sus Webhooks; supervisar la entrega de notificaciones en Developers. No hay conciliación exhaustiva histórica ni devoluciones automáticas.

## Datos y concurrencia

- Tablas nuevas: `estudio_pedidos`, `estudio_pedido_sesiones`, `estudio_pagos`.
- Migración aditiva en `prepararBase()`: añade vínculo al pedido, índice de sesión, estado y vencimiento a `reservas`. Las reservas previas quedan como `confirmada`.
- El servidor selecciona y valida los campos del carrito y calcula importes usando su catálogo; ignora totales/precios enviados por el navegador. Guarda conceptos y precios en centavos por sesión.
- La exclusión GiST existente impide traslapes entre apartados y reservas. Un conflicto revierte el pedido completo.
- Una clave de intento y la huella del carrito permiten reintentar y recuperar el pedido sin duplicar apartados. Un timeout externo conserva el apartado; pueden existir preferencias remotas repetidas si el proveedor no deduplica, pero nunca se confirma dos veces el mismo pedido.
- La confirmación comprueba referencia, importe, moneda, vendedor y entorno; la firma HMAC cubre el ID de la URL antes de consultar `/v1/payments/{id}`.
- El administrador distingue apartados de reservas y muestra contacto, conceptos, preferencias y pagos. Los formularios de reservas manuales no pueden editar/eliminar reservas vinculadas a pedidos.

## Validación

Ejecutar desde la raíz:

```powershell
npm run lint
docker compose --profile test run --build --rm pruebas
docker compose build web
docker compose up -d web
node scripts/verificar-pagos.mjs
```

El servicio `pruebas` crea una base efímera con prefijo `bacano_pagos_test_` dentro del PostgreSQL local y la elimina al finalizar. No ejecuta escenarios en las tablas del sitio. Usa los módulos reales y sus rutas HTTP; únicamente simula la API de Mercado Pago y la invalidación de caché de Next. En las pruebas de administrador se sustituye la sesión para probar las reglas de reservas, no la autenticación.

Validado el 2026-10-25: 19 pruebas de reglas, 13 de integración, ESLint y build de producción aprobados. Docker local actualizado con Next.js 16.4.3 y auditoría sin vulnerabilidades reportadas. La prueba HTTP requiere el cobro deshabilitado y no crea pedidos. Las dependencias de Windows pueden actualizarse por separado con `npm ci` si se desarrolla fuera de Docker.

Antes de activar cobros, completar compras en el entorno de prueba de Mercado Pago con aprobación, rechazo, pendiente, retorno sin parámetros confiables y notificaciones/reintentos reales. Verificar desde móvil y escritorio. Después cambiar al vendedor, token, secreto y modo de producción correspondientes. Revisar las políticas comerciales y publicar el tratamiento de datos de contacto antes de abrir la operación comercial.

## Referencias oficiales

- [Crear preferencia](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro-preferences/create-payment-preference)
- [Notificaciones y validación](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro-preferences/payment-notifications)
- [Vigencia de preferencias](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro-preferences/additional-settings/term-of-preference)
- [Salida a producción](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro-preferences/go-to-production)
