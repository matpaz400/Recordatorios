# Recordatorios · Impulso

Web gratuita para iPhone con tareas por materia, descripción, fecha de entrega, horario semanal, racha diaria y 25 XP por tarea completada. **Sin notificaciones automáticas ni cuentas de Cloudflare.**

Los archivos publicables están en `docs/`. GitHub Pages puede servirlos directamente sin servidor, base de datos ni dependencias.

## Usarla en iPhone

Después de activar GitHub Pages, abre la URL que GitHub muestre en Safari. Compartir → Añadir a pantalla de inicio. Abre la app instalada antes de empezar a registrar tus tareas. Safari y la app instalada pueden guardar datos por separado.

Las tareas se guardan únicamente en ese navegador, no en GitHub. No se sincronizan entre dispositivos. Exporta una copia JSON con **Exportar mis tareas** y guárdala en Archivos; puedes importarla en otro dispositivo. La importación conserva tareas existentes y añade las nuevas. Borrar los datos del navegador puede borrar tus tareas y tu progreso.

La app puede abrirse sin conexión después de una primera visita con conexión y de completar la instalación de su caché. El almacenamiento depende del navegador; las copias siguen siendo importantes.

## Publicar gratis

Consulta [DESPLIEGUE.md](DESPLIEGUE.md). Configura Settings → Pages → Deploy from a branch → `main` → `/docs`. No necesitas un dominio propio ni tokens de Cloudflare.

## Desarrollo

Con Node.js 22 o posterior:

```sh
npm ci
npm run check
npm start
```

El servidor local sirve también `/Recordatorios/` para probar la misma ruta que GitHub Pages. No ejecuta avisos ni almacena datos del usuario en el servidor.

El horario está transcrito en `docs/data.js` y usa hora de Colombia. Lunes y jueves terminas a las 17:00; martes y miércoles a las 18:00; viernes a las 13:00. La racha suma días con al menos una tarea completada. Desmarcar o eliminar tareas revierte su aporte a XP y racha.
