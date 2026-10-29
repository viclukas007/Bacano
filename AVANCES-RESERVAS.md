# Avances: carrito de renta del estudio

## Estado actual: 2026-10-29

- Carrito, pedidos y pagos publicados en https://www.bacano.mx/#estudio, con Mercado Pago en producción (cobros reales desde el 28-oct-2026). Docker local en http://127.0.0.1:3001/#estudio.
- Precios vigentes en [PLAN-RESERVAS.md](PLAN-RESERVAS.md), cambiados el 28-oct-2026 (commit af007cb).
- 38 pruebas aprobadas: 22 de reglas y 16 de integración. PostgreSQL fue real; la API de Mercado Pago fue simulada.
- Incidente del 28-oct (ver abajo): el primer pago real (pedido 0177bae2) nunca se confirmó porque `MERCADOPAGO_COLLECTOR_ID` traía el ID de la aplicación. Variable corregida en EasyPanel el 29-oct; el checkout ahora se niega a cobrar si el vendedor no coincide.
- Auditoría de seguridad del 28-oct-2026 (ver más abajo): los dos hallazgos de severidad media quedaron arreglados en el commit 4c9992c; queda uno bajo y tres pendientes de validación que dependen de producción.
- af007cb ya está en producción (el pedido bc6b0d87 del 28-oct se creó con $1,100). Ese pedido no se pudo pagar como invitado: el correo del formulario era el de la cuenta vendedora ("Espacios Ejecutivos") y Mercado Pago deshabilita "Pagar" cuando quien paga es el mismo que cobra (`invalid_users`). Con otro correo, como invitado, el primer pago productivo se acreditó (pedido 0177bae2, operación 186607470750, $1,100): la tarjeta podía ser la misma, lo que bloqueaba era el correo.
- Pendientes: conciliar el pedido 0177bae2 (queda en `revision`) y recrear a mano su reserva del 29-oct 19:00–20:00, cron del mantenimiento, borrar la reserva de prueba del 11-nov-2026, políticas comerciales definitivas (cancelación, facturación, anticipos), el hallazgo bajo de la auditoría (la vista Pedidos solo muestra los 100 más nuevos) y las tres comprobaciones en producción que pide `NEEDS-VALIDATION.md`.
- Guía de activación: [PAGOS-MERCADOPAGO.md](PAGOS-MERCADOPAGO.md). Seguimiento: [PLAN-RESERVAS.md](PLAN-RESERVAS.md).

## 2026-10-29 — pago real sin confirmar por el ID del vendedor

- El primer pago real (pedido 0177bae2, operación 186607470750, $1,100, sesión 29-oct 19:00–20:00) quedó aprobado en Mercado Pago a las 18:08 del 28-oct, dentro del apartado (vencía 18:20), pero el sitio nunca lo confirmó: en los logs de EasyPanel hay 22 rechazos `[pagos] pago … rechazado para el pedido 0177bae2…: vendedor=61072532`, entre reintentos del webhook y clics en "Actualizar estado". Un segundo pago del mismo pedido (186606911078) se rechazó igual.
- Causa: `MERCADOPAGO_COLLECTOR_ID` en EasyPanel traía `1433857921998790`, el ID de la aplicación "Bacano Estudio", y no el User ID de la cuenta que cobra (`61072532`, el último bloque del Access Token). `validarPagoMP` compara el `collector_id` del pago con esa variable y rechazaba todos los pagos reales con 422; el checkout, en cambio, cobraba sin problema. A las 18:20 el apartado venció, el pedido pasó a `expirado` y la reserva desapareció del calendario; en `/admin/pedidos` el pedido salía sin ningún pago.
- Arreglo de configuración (29-oct): `MERCADOPAGO_COLLECTOR_ID=61072532` en EasyPanel y redespliegue del servicio web.
- Arreglo de código: `crearPreferencia` compara el `collector_id` que devuelve Mercado Pago al crear la preferencia con la variable y, si no coinciden, registra el error y responde 503 sin entregar el checkout (el apartado se conserva y vence solo). Así un error de configuración bloquea el cobro en vez de aceptar pagos que después se rechazan. Prueba de integración nueva: una preferencia de otro vendedor no deja `preferencia_id` ni `checkout_url`, y al corregir el vendedor el mismo pedido sí obtiene su checkout.
- Lo que queda del incidente: al conciliar el pedido (botón "Actualizar estado" de la página de pago, el mantenimiento o un reintento del webhook) pasa a `revision` con sus pagos, porque el apartado ya venció; la reserva del 29-oct 19:00–20:00 hay que crearla a mano en `/admin/estudio`. Revisar en Mercado Pago si 186606911078 también quedó aprobado (sería un cobro doble).

## 2026-10-28 — auditoría de seguridad y arreglos de severidad media

- Auditoría completa del commit af007cb con la skill `security-audit` (Cloudflare), perfil estándar: 28 agentes, 27 unidades de cobertura en dos oleadas, cada hallazgo validado por un agente distinto del que lo encontró y un revisor más sobre el registro final. Todo corrió en un sandbox de Docker sin internet y con valores ficticios; nunca se tocó producción, Mercado Pago ni la base local. Reportes en `~/security-audit-skill/bacano-web/run-1/` (`REPORT.md`, `FINDINGS-DETAIL.md`, `NEEDS-VALIDATION.md`).
- Lo que resistió: precios recalculados en el servidor, firma y monto exacto en el webhook, bloqueo contra doble reserva, pedidos ajenos inaccesibles, SQL parametrizado, sesión del admin revisada en cada acción, pagos tardíos/duplicados/reembolsados a revisión. Ningún hallazgo compromete dinero, datos de clientes ni la cuenta admin.
- **Medio, arreglado (4c9992c):** dos peticiones anónimas sin pagar apartaban el calendario completo (50 sesiones de 13 h por pedido, 60 días, 780 h) y lo renovaban cada 15 minutos, porque el tope de 3 pedidos abiertos contaba solo por la cookie `bacano_estudio`, que el servidor fabrica nueva si la petición la omite; los apartados quedaban aunque Mercado Pago fallara y el admin no podía liberarlos. Ahora: máximo 6 sesiones y 26 horas por pedido (`MAX_SESIONES_PEDIDO`, `MAX_HORAS_PEDIDO` en `src/lib/carrito-estudio.ts`, mismo tope en el carrito y en `validarPedido`); el tope de 3 abiertos cuenta también por dirección del cliente (`estudio_pedidos.cliente_hash`, último salto de `X-Forwarded-For`, que es el que agrega el proxy de EasyPanel; sin proxy no hay dirección y solo cuenta la cookie); y en `/admin/pedidos` hay un botón "Liberar apartado" (`admin.liberarPedido`) que vence el pedido y borra sus apartados, con lo que un pago posterior cae en revisión.
- **Medio, arreglado (4c9992c):** la acción pública `suscribir` validaba el correo con un regex de retroceso cuadrático y sin tope de longitud: un campo de 64 KB bloqueaba el único proceso de Node 4.9 s (checkout y webhook incluidos) y Next aceptaba campos de 1 MB. Ahora el tope de 254 caracteres va antes del patrón, el patrón es lineal (`^[^\s@]{1,64}@[^\s@.]+(?:\.[^\s@.]+)*\.[^\s@.]{2,}$`), el input lleva `maxLength`, y `experimental.serverActions.bodySizeLimit` baja a 64 KB (los formularios del admin son solo texto). Prueba de regresión en `tests/newsletter.test.cjs`: un correo de 1 MB se rechaza en menos de 50 ms.
- **Bajo, sin arreglar:** `/admin/pedidos` lista solo los 100 pedidos más nuevos; con 100 checkouts anónimos los pedidos en `revision` salen de la vista aunque sigan en la base. El reporte propone listar siempre los de revisión y buscar por id.
- **Pendientes de validación** (dependen de producción; `NEEDS-VALIDATION.md` trae los pasos de observación, sin mandar tráfico): si `SESSION_SECRET`/`ADMIN_PASSWORD` de producción siguen siendo los de `.env.example` y nunca se cambió la clave en `/admin/clave`, cualquiera entra al admin; el optimizador de imágenes (`/_next/image`) puede llenar el disco con alias del logo (arreglo robusto: `images.unoptimized: true`); la conciliación con Mercado Pago desde `GET /api/estudio/pedidos/[id]` no tiene presupuesto por cliente ni por antigüedad.
- Pruebas tras los arreglos: 22 de reglas y 15 de integración en Docker; ESLint y TypeScript limpios; Docker local reconstruido con la migración `cliente_hash`.

## 2026-10-28 — precios nuevos y carrito sin sesiones vencidas

- En producción el carrito mostraba $830 sin que el usuario hubiera elegido nada: el navegador conservaba una sesión de prueba del 26-oct (estudio $480 + técnico $250 + transmisión $100). El carrito vivía en localStorage sin caducar y el diseño conservaba a propósito las sesiones vencidas para editarlas. No hubo cobro: el servidor rechaza sesiones pasadas y el botón de continuar quedaba bloqueado.
- Al leer el carrito se descartan las sesiones cuya hora de inicio ya pasó (`leerCarrito(texto, ahora)`).
- Al aprobarse un pago, `/estudio/pago` quita del carrito las sesiones pagadas.
- Precios nuevos: renta $1,100 la primera hora y $700 cada hora extra, transmisión en vivo $200 por sesión, edición de programa $3,000 y paquete de 4 reels $1,000. Se quitaron técnico/operador y operador extra. El catálogo (`TARIFAS`) sigue siendo uno solo para la página y el servidor.
- Los campos de la sesión cambiaron (`transmision`, `ediciones`, `paquetesReels`), por lo que la clave del carrito pasó a `bacano:carrito-estudio:v2`: los carritos v1 guardados en navegadores ya no se cargan. Los pedidos creados antes conservan sus conceptos y precios congelados.
- Los errores de TypeScript en `.next/types/validator.ts` eran tipos de rutas generados el 25-oct; se regeneran con `npx next typegen` y no afectan el build de Docker.
- Pruebas: 19 de reglas y 13 de integración en Docker aprobadas; ESLint y TypeScript limpios. Revisado en Docker local con un carrito v1 y una sesión vencida: ambos se descartan y una sesión de 3 h con transmisión, 1 edición y 2 paquetes de reels suma $7,700.

## 2026-10-28 — activación de Mercado Pago

- Aplicación "Bacano Estudio" creada en Mercado Pago Developers (Checkout Pro, API de Preferences); credenciales de prueba activadas y webhook de prueba configurado con el evento "Pagos (legacy)".
- Etapa 2 subida a GitHub y desplegada en EasyPanel; dominio nuevo `bacano.mx` y después `www.bacano.mx` como principal.
- Primer intento de pago: el navegador recibía HTML en vez de JSON. Causa doble: las variables se habían pegado con el texto de ejemplo en lugar de los valores, y el proxy de EasyPanel sustituye las respuestas 502 por su página HTML. Los fallos del proveedor pasan a 503 y se registra el código y tipo de error de Mercado Pago.
- El checkout de prueba por `sandbox_init_point` terminaba en "Algo salió mal": se usa siempre `init_point`.
- El pago de prueba requiere un comprador de prueba con sesión iniciada (ni cuenta real ni invitado).
- El primer pago aprobado llegó por webhook y el servidor respondió 422 porque los pagos de prueba traen `live_mode: true`; `live_mode` solo se exige en producción y ahora se registra qué campo falla. El mantenimiento concilió el pago contra la API y confirmó la reserva (pedido 7915293f, 11-nov-2026 15:00), visible en `/admin/pedidos` y en el calendario público.
- Pruebas: 19 de reglas y 13 de integración en Docker aprobadas con los cambios; ESLint limpio.
- Credenciales de producción activadas y cargadas en EasyPanel con `MERCADOPAGO_ENV=production`; el checkout de producción crea preferencias correctamente (vendedor 61072532).
- Dominios: `www.bacano.mx` quedó como principal en EasyPanel y `bacano.mx` redirige con 301 (regla de Redirects `^https?://bacano\.mx/(.*)` → `https://www.bacano.mx/${1}`). Sin la redirección, quien entraba por el dominio sin www recibía 403 al pagar porque `APP_URL` no coincidía. Se corrigió además una entrada de dominio con el esquema duplicado.
- Webhook productivo corregido con la ruta completa `https://www.bacano.mx/api/mercadopago/webhook` y el evento "Pagos (legacy)". El simulador del panel respondió 503 (pago inexistente), lo que confirma que la firma pasa con la clave cargada en EasyPanel; un 401 habría indicado clave incorrecta.
- Pendientes: cron del mantenimiento en EasyPanel y borrado de la reserva de prueba del 11-nov-2026.

## 2026-10-25 — bitácora cronológica

Las notas siguientes conservan el estado de cada etapa cuando se ejecutó. Las referencias iniciales a backend pendiente o datos de contacto solo en memoria describen la primera entrega; la implementación posterior del backend se registra en «Etapa 2».

- Revisados AGENTS.md, CLAUDE.md, README.md y documentación local de Next.js sobre componentes y formularios.
- Revisados la sección Estudio, el calendario público y el administrador de reservas existente.
- Documentados alcance frontend, precios recibidos y horario 08:00–21:00 de Mérida.
- Backend y cobros con Mercado Pago quedan para la segunda etapa.
- Implementación y validaciones: en curso.

### Implementación del frontend

- Creado src/lib/carrito-estudio.ts: catálogo, conceptos, totales, horario, validación visual de cruces y lectura segura del carrito local.
- Creado src/components/carrito-estudio.tsx: configurador, carrito de varias sesiones, edición/eliminación, persistencia local, contacto y revisión de pago.
- Integrado el carrito en RentaEstudio con la identidad visual existente.
- Ajustado el calendario público a 08:00–21:00, incluyendo recorte de ocupaciones que cruzan esos límites.
- La interfaz muestra Mercado Pago como pasarela pendiente y mantiene deshabilitado el cobro.
- No se han modificado el backend, la base de datos ni el administrador.
- Validaciones técnicas y visuales: pendientes de ejecutar.

### Primeras validaciones

- 12 pruebas de reglas del carrito aprobadas: importes, cargos por hora/unidad, apertura/cierre, fechas, ocupación conocida, cruces, edición y recuperación de datos locales.
- Se corrigió la recuperación en navegadores que permiten leer localStorage pero rechazan escrituras.
- Se detectaron limitaciones del sistema de archivos de E: al compilar Next.js en Windows: Turbopack falla creando junctions y Webpack devuelve EISDIR al consultar favicon.ico.
- La validación de producción continuará en el contenedor Linux configurado por el proyecto.

- ESLint aprobado sin errores ni advertencias.
- Corregida la codificación de los archivos guardados por PowerShell para usar UTF-8 sin BOM; package.json vuelve a ser compatible con Turbopack en Linux.
- La herramienta de navegador bloqueó la inspección visual al no poder verificar la URL activa de Edge. No se completó revisión visual ni prueba manual de interacción; queda registrada como pendiente.

### Resultado de la etapa frontend

- Compilación de producción aprobada en Docker/Linux: Next.js compiló, verificó TypeScript y generó todas las rutas.
- Contenedor web local reconstruido y actualizado mediante docker compose; disponible en http://127.0.0.1:3001/#estudio.
- Verificación HTTP aprobada para / y /?semana=2026-11-02: ambas responden 200, contienen el configurador/carrito y entregan JavaScript con respuesta 200.
- Se añadió compatibilidad para generar IDs locales también en pruebas por HTTP en red local, donde crypto.randomUUID puede no estar disponible.
- Plan actualizado con tareas ejecutadas, límites de la interfaz y pendientes.
- Pendiente: revisión visual y prueba manual de agregar/editar/eliminar, persistencia y navegación hasta el paso de pago. La herramienta de navegador no pudo verificar la URL de Edge y detuvo la inspección.
- Pendiente para etapa 2: backend, disponibilidad definitiva, pedidos, bloqueos temporales, integración Mercado Pago, webhooks y confirmación de reservas.
- El frontend no crea reservas ni realiza cobros; los datos de contacto solo viven en memoria de la página.

### Acceso desde el menú principal

- La entrada Estudio ahora se muestra como Renta de estudio y enlaza a #estudio, donde está el configurador y el carrito.
- La configuración se comparte entre el menú de escritorio y el menú móvil.

### Etapa 2: pedidos, apartados y pagos

- Plan de ejecución añadido en PLAN-RESERVAS.md; configuración y operación documentadas en PAGOS-MERCADOPAGO.md.
- Reutilizada la base PostgreSQL existente. Migración aditiva con estudio_pedidos, estudio_pedido_sesiones y estudio_pagos; reservas añade vínculo al pedido, estado y expiración. Inicialización y semilla protegidas por bloqueo transaccional.
- Implementada validación estricta del servidor: contacto, fechas y horario de Mérida, ventana de ocho semanas, límites de cantidades, cruces y recálculo de importes en centavos. Los precios enviados por el cliente se ignoran.
- Apartados de 15 minutos configurables, limitados por el inicio de la sesión. La exclusión de traslapes de reservas protege tanto apartados como reservas manuales; un carrito con conflicto se revierte completo.
- Checkout Pro con preferencia creada desde servidor, referencia al pedido, URLs de retorno, expiración e intento idempotente. Se recupera un pedido existente al repetir o recargar el mismo carrito.
- Webhook HMAC que consulta el pago y comprueba referencia, importe, moneda, vendedor y entorno antes de confirmar. Repetidos no duplican reservas; aprobaciones tardías, segundo pago, reembolsos y contracargos aparecen en revisión.
- Página /estudio/pago con estado interno, consulta protegida por cookie HttpOnly, actualización y conciliación del pago. La redirección nunca confirma por sí sola.
- Vista /admin/pedidos con contacto, conceptos, preferencias y pagos. Calendario actualizado; se distinguen apartados y no se permite modificar/eliminar reservas vinculadas a pagos desde los formularios manuales.
- Mantenimiento autenticado para cron: expirar apartados y conciliar pedidos. Añadidas variables de entorno con cobro deshabilitado por defecto.
- Actualizado Next.js y eslint-config-next de 16.3.5 a 16.4.3 tras detectar avisos de seguridad en dependencias existentes. Actualizadas dependencias transitivas compatibles y package-lock.json. npm ci y npm audit --omit=dev terminan sin vulnerabilidades reportadas. Referencias: https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw y https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r.

### Validación de etapa 2 en Docker/Linux

- ESLint aprobado con las dependencias actualizadas.
- 19 pruebas de reglas aprobadas (12 de carrito y 7 de pagos).
- 13 pruebas de integración aprobadas con PostgreSQL real en una base efímera, módulos/rutas reales y API de Mercado Pago simulada. Cubren migración de reservas previas, cobro cerrado, origen ajeno, precios manipulados, recuperación/idempotencia, aprobación, pendiente, rechazo, firma y datos de pago incorrectos, concurrencia, reversión de todo el carrito, reservas manuales, expiración, pagos tardíos/duplicados, reembolso, timeout, protección del admin y conciliación sin webhook.
- La base efímera de pruebas fue eliminada; no quedan bases con prefijo bacano_pagos_test_.
- Build de producción aprobado con Next.js 16.4.3, incluida verificación TypeScript.
- Contenedor web local actualizado en http://127.0.0.1:3001. La migración se ejecutó correctamente y se comprobó que la cantidad y huella de reservas existentes no cambió.
- Prueba HTTP aprobada: home y página de resultado responden; un retorno con status=approved no confirma; pedido ajeno devuelve 404 sin caché; mantenimiento sin secreto devuelve 401; administrador sin sesión redirige; checkout y webhook devuelven 503 mientras falten credenciales/activación.
- Comprobación HTTP reproducible: node scripts/verificar-pagos.mjs (requiere cobro local deshabilitado).
- Pendientes externos: credenciales, ID del vendedor, dominio HTTPS, secreto Webhook, cron y compras/notificaciones en el entorno real de prueba de Mercado Pago. No se realizaron cobros ni se activó producción.
- Pendientes de producto: políticas definitivas de cancelación/facturación/anticipos y recorrido visual/manual en móvil y escritorio. El cobro completo y los 15 minutos son valores iniciales documentados.

### Cierre de documentación

- README.md actualizado con el estado real del proyecto, ejecución en Docker/EasyPanel, rutas y comandos de verificación.
- PLAN-RESERVAS.md actualizado para distinguir implementación local completada de activación comercial pendiente.
- PAGOS-MERCADOPAGO.md ampliado con orden de activación y mapa de endpoints.
- Se mantiene explícita la diferencia entre pruebas locales con proveedor simulado y pruebas pendientes con Mercado Pago. No se activaron cobros con esta actualización de documentación.
