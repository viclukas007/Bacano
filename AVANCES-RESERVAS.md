# Avances: carrito de renta del estudio

## 2026-10-25

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
