# Plan: carrito de renta del estudio

## Alcance acordado

Primero frontend; después backend con Mercado Pago. Esta primera etapa no realiza cobros ni confirma reservas.

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
- [x] Detectar cruces con la ocupación conocida y entre sesiones del carrito como ayuda visual; la validación definitiva será del servidor.
- [x] Adaptar calendario público a 08:00–21:00.
- [x] Verificar cálculos, horario, lint, TypeScript y compilación de producción en Linux.
- [x] Verificar por HTTP la página, el cambio de semana y la entrega de JavaScript.
- [ ] Completar revisión visual móvil/escritorio y prueba manual del recorrido. La herramienta de navegador bloqueó la inspección al no poder verificar la URL de Edge.
- [x] Registrar ejecución y resultados en AVANCES-RESERVAS.md.

## Etapa 2: backend y Mercado Pago

- [ ] Confirmar cancelaciones, impuestos/facturación, anticipos y expiración del bloqueo temporal.
- [ ] Modelar pedidos, contacto, conceptos con precios congelados, sesiones y estados de pago.
- [ ] Recalcular importes y validar horario, fechas, cantidades y disponibilidad en el servidor.
- [ ] Bloquear horarios de forma atómica y expirar pedidos no pagados.
- [ ] Crear preferencia de Mercado Pago desde el servidor con credenciales privadas y referencia interna.
- [ ] Crear retornos de pago aprobado, pendiente y rechazado, sin confirmar por la redirección.
- [ ] Procesar webhooks verificados e idempotentes y consultar el pago antes de confirmar.
- [ ] Confirmar reservas de pagos aprobados y actualizar calendario y administrador.
- [ ] Probar sandbox: aprobación, rechazo, pendiente, duplicados y concurrencia.

## Entrega del frontend

El visitante puede armar su carrito y revisar contacto y total, con la identidad visual de Bacano. El botón de Mercado Pago muestra la integración pendiente y no simula una confirmación.

## Decisiones de esta entrega

- El carrito admite hasta 50 sesiones; las cantidades de operadores extra, ediciones y paquetes se limitan a 20 por sesión.
- El calendario consultado aporta únicamente la ocupación de la semana visible; fuera de ella se indica que hay que cambiar de semana para consultar. El frontend no garantiza disponibilidad.
- Todos los precios y cantidades se volverán a validar en el backend antes de crear un pedido o iniciar un pago.
- La compilación en Windows sobre E: encontró limitaciones del sistema de archivos; se verificó la producción mediante el Dockerfile existente en Linux.
