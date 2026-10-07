# Recordatorios

## Impulso

Web instalable en iPhone para registrar tareas por materia, llevar una racha y recibir un recordatorio diario al finalizar las clases. Interfaz en español, adaptada a móvil.

## Funciones

- Crear tareas con título, materia, descripción y fecha opcional; filtrar, completar y eliminar.
- 25 XP por tarea completada. La racha suma un día cuando completas al menos una tarea; puedes continuar la racha de ayer. Desmarcar o eliminar una tarea revierte su progreso.
- Horario transcrito de la imagen proporcionada. Zona horaria fija: `America/Bogota`.
- Avisos: lunes 17:00, martes 18:00, miércoles 18:00, jueves 17:00, viernes 13:00, sábados y domingos 10:00. Solo si hay tareas pendientes y se han autorizado notificaciones.
- Web Push funciona aunque la interfaz esté cerrada, siempre que el servidor permanezca activo. El planificador revisa cada minuto. Si se reinicia, puede recuperar un aviso durante la primera hora después del horario indicado. El sistema operativo y la conexión pueden retrasar la entrega.

## Desarrollo

Necesitas Node.js 22.13 o posterior (probado con 24.19).

```sh
cd /workspace/Recordatorios
npm ci --cache /workspace/.npm-cache
npm run check
npm test
npm start
```

Servidor en el puerto `3000`; `PORT` permite cambiarlo. La base de datos SQLite y las claves VAPID se generan en `data/`, una carpeta ignorada por Git. `DATA_DIR` permite indicar otra ubicación persistente. No borres ni publiques esa carpeta: contiene tareas y claves privadas. No hace falta una API de pago para enviar Web Push.

Las pruebas automatizadas verifican creación/completado/eliminación, separación entre dispositivos, horarios y rachas. El flujo de interfaz se comprobó con Chromium en una ventana móvil de 390 × 844. La entrega real a iOS requiere validación en un iPhone después de publicar.

## Publicación para usarlo en iPhone

Se necesita un servidor Node con **HTTPS público**, proceso siempre activo y almacenamiento persistente. Un sitio estático por sí solo no ejecuta los recordatorios. No está publicado desde este entorno.

1. Despliega el proyecto en un servicio que permita procesos Node permanentes y un disco persistente (un VPS o un servicio equivalente). Instalación: `npm ci`; inicio: `npm start`.
2. Configura `DATA_DIR` en el disco persistente y `VAPID_SUBJECT` con una URL HTTPS de contacto de tu sitio o `mailto:tu-correo`. El valor de desarrollo es `https://example.com`.
3. Usa una sola instancia; el planificador y SQLite están pensados para un proceso. Conserva copias seguras de los datos y claves VAPID.
4. Permite conexiones HTTPS salientes hacia los servicios de notificaciones, incluido `web.push.apple.com` para iPhone. El endpoint exacto depende de la suscripción.
5. En un iPhone con iOS 16.4 o posterior, abre la URL HTTPS en Safari. Compartir → Añadir a pantalla de inicio. Abre **Impulso** desde ese icono y pulsa **Activar recordatorios**; acepta el permiso.
6. Crea una tarea pendiente y comprueba la recepción al horario programado. El botón de prueba respeta las clases y la franja 08:00–21:00.

## Datos y límites actuales

No hay cuentas ni sincronización entre dispositivos. Cada instalación se identifica con una clave aleatoria almacenada en el navegador; sus tareas se guardan en el servidor. Si borras los datos del navegador, pierdes el acceso a esa identidad. Safari y la app instalada pueden tener almacenamientos separados: añade la app a inicio antes de empezar a registrar tus tareas.

Requiere conexión para gestionar tareas; no incluye modo sin conexión. El horario no se edita en la interfaz. Los festivos siguen la planificación semanal. No se han enviado notificaciones reales a un iPhone ni probado restauración en una máquina nueva.
