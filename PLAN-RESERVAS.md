# Plan: reservas del estudio y pagos con Mercado Pago

## Estado actual: 2026-10-28

Frontend y backend implementados y validados en Docker local (32 pruebas: 19 de reglas y 13 de integración). El 2026-10-28 se probó el recorrido real en el entorno de prueba de Mercado Pago (pago aprobado, webhook, conciliación, reserva confirmada) y se activaron las credenciales de producción en https://www.bacano.mx. Los cobros son reales desde entonces.

Pendientes: cron del mantenimiento, borrar la reserva de prueba (pedido 7915293f, 11-nov-2026 15:00), revisión visual/manual y políticas comerciales definitivas. La redirección `bacano.mx` → `www.bacano.mx` y el webhook productivo quedaron configurados el mismo 2026-10-28.

## Alcance acordado

Primero frontend; después backend con Mercado Pago. Ambas implementaciones locales están completadas; la activación de pagos depende de las credenciales y las pruebas externas. Se conserva la base existente y no se borran reservas.

Horario: 08:00 a 21:00, hora de Mérida. Sesiones de horas completas desde una hora, sin terminar después de las 21:00. Se ofrecerán inicios cada hora en esta primera versión.

| Concepto | Precio MXN | Criterio |
| --- | ---: | --- |
| Renta del estudio | $1,100 | Primera hora, obligatorio |
| Hora extra de estudio | $700 | Cada hora después de la primera |
| Video multicámara | Incluido | Con la renta |
| Transmisión en vivo | $200 | Por sesión, opcional |
| Edición de programa de 40 a 60 minutos | $3,000 | Por programa |
| Paquete de 4 reels | $1,000 | Por paquete |

Precios vigentes desde el 28-oct-2026 (antes: $480/h de estudio, técnico $250/h, operador extra $150/h, transmisión $100/h, edición $1,500 y 10 clips por $1,000). La transmisión se cobra una vez por sesión; edición y reels por unidad, independientemente de las horas de estudio. Una hora con una unidad de cada servicio suma $5,300 MXN.

## Etapa 1: frontend

- [x] Centralizar catálogo, precios, cálculos y límites de horario.
- [x] Integrar configurador de fecha, inicio y duración con servicios y cantidades.
- [x] Agregar carrito de sesiones con edición, eliminación, desglose y total.
- [x] Conservar el carrito en el navegador sin almacenar datos personales.
- [x] Mostrar resumen, datos de contacto y paso previo a Mercado Pago.
- [x] Indicar que el pago está pendiente de habilitar y el carrito no aparta horarios.
- [x] Detectar cruces con la ocupación conocida y entre sesiones del carrito como ayuda visual; la validación definitiva ya se realiza en el servidor al iniciar el pedido.
- [x] Adaptar calendario público a 08:00–21:00.
- [x] Verificar cálculos, horario, lint, TypeScript y compilación de producción en Linux.
- [x] Verificar por HTTP la página, el cambio de semana y la entrega de JavaScript.
- [ ] Completar revisión visual móvil/escritorio y prueba manual del recorrido. La herramienta de navegador bloqueó la inspección al no poder verificar la URL de Edge.
- [x] Registrar ejecución y resultados en AVANCES-RESERVAS.md.

## Etapa 2: backend y Mercado Pago

### Implementación local completada: 2026-10-25

Se reutiliza PostgreSQL y la tabla `reservas` existentes. No se crea otra base para la aplicación ni se borran reservas. Las pruebas crean una base efímera independiente y la eliminan al terminar.

Orden de implementación ejecutado:

1. Migración aditiva: pedidos, sesiones con conceptos/precios congelados, pagos y vínculo con reservas.
2. Validación estricta del contacto y carrito en servidor; importes en centavos MXN y ventana de ocho semanas.
3. Apartados en la misma tabla de reservas para aprovechar su exclusión de traslapes; transacciones, vencimiento y limpieza bajo bloqueo del estudio.
4. Checkout Pro vía Preferences API: crear preferencia, referencia interna y URLs de retorno; credenciales solo en servidor.
5. Webhook HMAC: consultar pago en Mercado Pago, comprobar comercio/entorno/importe/moneda/referencia y procesar repetidos sin duplicar reservas.
6. Página de resultado que consulta el estado interno, calendario actualizado y vista de pedidos en administrador.
7. Pruebas de reglas y firma, integración sobre PostgreSQL aislado en Docker con pagos simulados, concurrencia y build de producción.

Criterios de esta implementación: cobro completo del total mostrado, sin cargos adicionales; apartado inicial de 15 minutos configurable. Son parámetros técnicos iniciales, sujetos a la política comercial definitiva. Un pago aprobado después de vencer el apartado, un segundo pago aprobado o un reembolso/contracargo queda en revisión administrativa; no confirma horarios liberados ni devuelve dinero automáticamente. No se prometen políticas de cancelación o facturación todavía.

Activación externa pendiente: credenciales, ID del vendedor, modo prueba/producción, dominio HTTPS y secreto Webhook. Sin configuración completa el cobro permanece deshabilitado. Las pruebas con simulador no sustituyen compras reales en el entorno de prueba de Mercado Pago.

La liberación es lógica al vencer y se materializa antes de cada operación de reservas/pagos. Se incluye mantenimiento autenticado para ejecutar desde un cron cada minuto y conciliar pagos pendientes.

- [ ] Confirmar cancelaciones, impuestos/facturación, anticipos y expiración del bloqueo temporal.
- [x] Modelar pedidos, contacto, conceptos con precios congelados, sesiones y estados de pago.
- [x] Recalcular importes y validar horario, fechas, cantidades y disponibilidad en el servidor.
- [x] Bloquear horarios de forma atómica y expirar pedidos no pagados.
- [x] Implementar creación de preferencia desde servidor con credenciales privadas y referencia interna; validada con simulador.
- [x] Crear retornos de pago aprobado, pendiente y rechazado, sin confirmar por la redirección.
- [x] Implementar webhooks verificados e idempotentes y consultar el pago antes de confirmar; validado con simulador.
- [x] Confirmar reservas de pagos aprobados y actualizar calendario y administrador.
- [x] Probar aprobación, rechazo, pendiente, duplicados, concurrencia, expiración y conciliación con PostgreSQL real y API de Mercado Pago simulada.
- [x] Probar el checkout y las notificaciones en el entorno de prueba real de Mercado Pago, con credenciales y URL pública (2026-10-28).
- [x] Configurar secretos, vendedor y HTTPS en EasyPanel; cobros activados en producción (2026-10-28).
- [ ] Configurar el cron del mantenimiento en EasyPanel.

Configuración y operación: [PAGOS-MERCADOPAGO.md](PAGOS-MERCADOPAGO.md).

## Entrega del frontend

El visitante puede armar su carrito y revisar contacto y total, con la identidad visual de Bacano. Mientras el cobro esté deshabilitado, el botón indica la integración pendiente. Al habilitarlo con configuración completa, conecta con el checkout implementado; la reserva depende de la verificación del servidor.

## Decisiones de esta entrega

- El carrito admite hasta 6 sesiones y 26 horas por pedido (desde el 28-oct-2026; antes 50 sesiones sin tope de horas); las cantidades de ediciones y paquetes de reels se limitan a 20 por sesión. Para más horas se atiende por WhatsApp.
- El calendario consultado aporta únicamente la ocupación de la semana visible; fuera de ella se indica que hay que cambiar de semana para consultar. El frontend no garantiza disponibilidad.
- Todos los precios y cantidades se validan en el backend antes de crear un pedido o iniciar un pago.
- La compilación en Windows sobre E: encontró limitaciones del sistema de archivos; se verificó la producción mediante el Dockerfile existente en Linux.

## Pendientes para abrir cobros

- [ ] Confirmar pago completo/anticipo, duración del apartado, impuestos, facturación y política de cancelación/reembolso.
- [x] Configurar la aplicación, el vendedor y las credenciales del entorno de prueba en las variables del servidor.
- [x] Disponer de un dominio HTTPS público y registrar el evento Pagos en `/api/mercadopago/webhook`, con su secreto.
- [ ] Configurar el cron autenticado de `/api/estudio/mantenimiento` y supervisar sus respuestas.
- [x] Habilitar el checkout en modo `test` y probar un pago aprobado con webhook y conciliación reales (rechazo y pendiente quedaron cubiertos solo por las pruebas automáticas).
- [ ] Completar el recorrido manual y la revisión móvil/escritorio, incluido el tratamiento de datos de contacto.
- [x] Cambiar al vendedor/credenciales/secreto de producción con `MERCADOPAGO_ENV=production` (2026-10-28).
- [ ] Borrar de la base la reserva de prueba del 11-nov-2026 (pedido 7915293f).
- [x] Redirigir `bacano.mx` a `www.bacano.mx` (redirección permanente en EasyPanel, 2026-10-28).
- [x] Webhook productivo en `https://www.bacano.mx/api/mercadopago/webhook`, firma verificada con el simulador del panel (2026-10-28).
