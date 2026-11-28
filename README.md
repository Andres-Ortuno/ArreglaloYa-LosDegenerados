# ArreglaloYa
Plataforma web para pedir arreglos del hogar en Cochabamba.

## Tecnologías
Node.js 24 · Angular 22 · NestJS 12 · PostgreSQL 18 · TypeORM

## Estructura
- frontend/ (Angular)
- backend/ (NestJS)

## Cómo trabajar
1. git pull
2. Crear una rama: git switch -c feature/nombre-de-la-tarea
3. Hacer commits y subir la rama
4. Abrir un Pull Request en GitHub para unirla a main

## Seguimiento de pedidos – Punto 8

Esta rama incorpora el seguimiento de pedidos y el historial cronológico de cambios de estado, trabajando en el backend (NestJS), el frontend (Angular) y la bitácora de PostgreSQL.

### Funcionalidades

- Consulta de pedidos y detalle para el cliente y el trabajador asignado.
- Validación centralizada de las transiciones permitidas.
- Registro del estado inicial del pedido y de los cambios posteriores.
- Historial con estado anterior, estado nuevo, responsable y fecha/hora.
- Actualización de la interfaz después de las operaciones del backend.
- Registro de pagos simulados de anticipo y saldo.
- Finalización del pedido solo cuando no existe saldo pendiente.

### Flujo de estados

`Bajo revisión → Aprobado → En proceso → Finalizado`

También se permite cancelar antes de iniciar el trabajo, según las reglas del servicio. Los pedidos finalizados o cancelados no admiten nuevas transiciones.

### Archivos principales

**Backend**
- `backend/src/pedidos/pedidos.transiciones.ts`: matriz de transiciones permitidas.
- `backend/src/pedidos/pedidos.transiciones.spec.ts`: pruebas unitarias de las transiciones.
- `backend/src/pedidos/pedidos.service.ts`: validaciones y operaciones del pedido.
- `backend/src/pedidos/pedidos.controller.ts`: rutas HTTP del módulo.
- `backend/src/pedidos/pedidos.sql.ts`: consultas de detalle, pagos e historial.
- `backend/src/solicitudes/solicitudes.sql.ts` y `solicitudes.service.ts`: creación del pedido y registro de su estado inicial.

**Frontend**
- `frontend/src/app/models/backend.models.ts`: tipos `PedidoDetalle` y `HistorialEstadoPedido`.
- `frontend/src/app/services/backend/api-pedidos.ts`: comunicación HTTP con las rutas de pedidos.
- `frontend/src/app/pages/pedidos/pedidos.ts`: lógica de la pantalla y actualización de datos.
- `frontend/src/app/pages/pedidos/pedidos.html`: presentación del historial y acciones.
- `frontend/src/app/pages/pedidos/pedidos.css`: estilos de la línea de tiempo.

### Registro del historial

El historial se consulta desde la tabla `bitacora`, filtrando los registros de la entidad `pedido` y el campo `estado`. Se une con `cuenta` para obtener el nombre del responsable y se ordena por fecha e identificador.

La creación del pedido se registra explícitamente porque el primer estado se asigna al insertar el pedido. Los cambios posteriores se registran mediante los mecanismos de auditoría de la base de datos.

### Verificación funcional

Para verificar el flujo completo:

1. Crear una solicitud como cliente.
2. Enviar una propuesta como trabajador.
3. Elegir la propuesta y el horario como cliente; se crea el pedido en `bajo_revision`.
4. Pagar el anticipo simulado; pasa a `aprobado`.
5. Iniciar el trabajo como trabajador; pasa a `en_proceso`.
6. Pagar el saldo como cliente; el estado se mantiene.
7. Finalizar como trabajador; pasa a `finalizado`.
8. Consultar el historial y comprobar los responsables y las fechas.

Los pagos de esta versión son simulados. La finalización exige que el saldo pendiente sea cero.

