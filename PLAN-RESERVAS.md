# Plan: reservas del estudio y pagos con Mercado Pago

## Estado actual: 2026-10-25

Frontend y backend implementados y validados en Docker local. Hay 32 pruebas aprobadas: 19 de reglas y 13 de integración con PostgreSQL real y Mercado Pago simulado. ESLint, TypeScript, build y comprobación HTTP aprobados. Docker local actualizado con Next.js 16.4.3.

El cobro continúa deshabilitado; faltan configuración externa, pruebas reales en el entorno de prueba de Mercado Pago, revisión visual/manual y políticas comerciales definitivas. Los apartados y pagos no se activan solamente por tener el contenedor levantado.

## Alcance acordado

Primero frontend; después backend con Mercado Pago. Ambas implementaciones locales están completadas; la activación de pagos depende de las credenciales y las pruebas externas. Se conserva la base existente y no se borran reservas.

Horario: 08:00 a 21:00, hora de Mérida. Sesiones de horas completas desde una hora, sin terminar después de las 21:00. Se ofrecerán inicios cada hora en esta primera versión.

| Concepto | Precio MXN | Criterio |
| --- | ---: | --- |
| Renta del estudio | $480 | Por hora, obligatorio |
| Técnico/operador | $250 | Por hora, opcional |
| Video multicámara | Incluido | Con la renta |
| Transmisión en vivo | $100 | Por hora, opcional |
| Operador extra | $150 | Por hora y operador |
| Edición de episodio de 40 a 60 minutos | $1,500 | Por episodio |
| Paquete de 10 clips | $1,000 | Por paquete |

La transmisión se considera por hora; edición y clips por unidad, independientemente de las horas de estudio. Una hora con una unidad de cada servicio suma $3,480 MXN.

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
- [ ] Probar el checkout y las notificaciones en el entorno de prueba real de Mercado Pago, con credenciales y URL pública.
- [ ] Configurar secretos, vendedor, HTTPS y cron en EasyPanel; activar cobros después de la validación externa.

Configuración y operación: [PAGOS-MERCADOPAGO.md](PAGOS-MERCADOPAGO.md).

## Entrega del frontend

El visitante puede armar su carrito y revisar contacto y total, con la identidad visual de Bacano. Mientras el cobro esté deshabilitado, el botón indica la integración pendiente. Al habilitarlo con configuración completa, conecta con el checkout implementado; la reserva depende de la verificación del servidor.

## Decisiones de esta entrega

- El carrito admite hasta 50 sesiones; las cantidades de operadores extra, ediciones y paquetes se limitan a 20 por sesión.
- El calendario consultado aporta únicamente la ocupación de la semana visible; fuera de ella se indica que hay que cambiar de semana para consultar. El frontend no garantiza disponibilidad.
- Todos los precios y cantidades se validan en el backend antes de crear un pedido o iniciar un pago.
- La compilación en Windows sobre E: encontró limitaciones del sistema de archivos; se verificó la producción mediante el Dockerfile existente en Linux.

## Pendientes para abrir cobros

- [ ] Confirmar pago completo/anticipo, duración del apartado, impuestos, facturación y política de cancelación/reembolso.
- [ ] Configurar la aplicación, el vendedor y las credenciales del entorno de prueba en las variables del servidor.
- [ ] Disponer de un dominio HTTPS público y registrar el evento Pagos en `/api/mercadopago/webhook`, con su secreto.
- [ ] Configurar el cron autenticado de `/api/estudio/mantenimiento` y supervisar sus respuestas.
- [ ] Habilitar el checkout en modo `test` para probar aprobación, rechazo, pendiente, retorno, Webhooks y reintentos reales.
- [ ] Completar el recorrido manual y la revisión móvil/escritorio, incluido el tratamiento de datos de contacto.
- [ ] Cambiar al vendedor/credenciales/secreto correspondientes a producción, configurar `MERCADOPAGO_ENV=production` y activar `MERCADOPAGO_ENABLED=true` cuando la validación esté terminada.
