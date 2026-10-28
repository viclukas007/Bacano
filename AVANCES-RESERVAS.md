# Avances: carrito de renta del estudio

## Estado actual: 2026-10-25

- Frontend y backend de pedidos/pagos implementados; Docker local actualizado en http://127.0.0.1:3001/#estudio.
- PostgreSQL existente reutilizado y migración aditiva aplicada. La comprobación de cantidad y huella de reservas no mostró cambios en los datos previos.
- 32 pruebas aprobadas: 19 de reglas y 13 de integración. PostgreSQL fue real; la API de Mercado Pago fue simulada.
- ESLint, TypeScript, build de producción, auditoría de dependencias y comprobación HTTP aprobados con Next.js 16.4.3.
- Cobros deshabilitados. Pendientes: credenciales/vendedor, HTTPS, Webhook, cron, pruebas externas, revisión visual/manual y decisiones comerciales definitivas.
- Guía de activación: [PAGOS-MERCADOPAGO.md](PAGOS-MERCADOPAGO.md). Seguimiento: [PLAN-RESERVAS.md](PLAN-RESERVAS.md).

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
