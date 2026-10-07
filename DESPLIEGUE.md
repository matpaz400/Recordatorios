# Publicar gratis para el iPhone

La opción preparada es **Cloudflare Workers Free + D1 Free**, con una dirección HTTPS `workers.dev`. No hay que comprar un dominio ni mantener un servidor encendido. Los Cron Triggers ejecutan los avisos cada minuto aunque cierres la aplicación. Mantén la cuenta en el plan gratuito; no actives Workers Paid.

El plan gratuito tiene cuotas. Para el uso personal previsto, el tráfico y los datos son pequeños. Si se alcanza una cuota gratuita, el servicio puede fallar o dejar de enviar avisos; no se configura una actualización automática a un plan de pago. Revisa las condiciones vigentes de Cloudflare al crear la cuenta.

## Para que Codex termine la publicación

1. Crea o usa una [cuenta gratuita de Cloudflare](https://dash.cloudflare.com/sign-up).
2. En [API Tokens](https://dash.cloudflare.com/profile/api-tokens), crea un token personalizado limitado a la cuenta elegida, con permisos de cuenta **Workers Scripts: Edit**, **D1: Edit** y **Account Settings: Read**. No hace falta compartir tu contraseña ni la clave API global.
3. Añade el token **solo en los ajustes seguros del entorno**, en el requisito `CLOUDFLARE_API_TOKEN`. Añade también `CLOUDFLARE_ACCOUNT_ID` con el identificador de tu cuenta. No pegues el token en el chat ni lo subas a GitHub.
4. Guarda esos cambios y avisa que el acceso está configurado. Codex podrá crear la base D1, aplicar la migración y publicar la web y los avisos.

El entorno necesita acceso HTTPS a `api.cloudflare.com`, guardado en el borrador. Después de publicar se necesita permitir también el hostname concreto `workers.dev` de la aplicación para verificarla desde este entorno. Los avisos se enviarán desde Cloudflare a Apple, no desde el entorno de Codex.

## Alternativa desde tu computador

Con Node.js 22.13 o posterior, desde una terminal:

```sh
git clone https://github.com/matpaz400/Recordatorios.git
cd Recordatorios
npm ci
npx wrangler login
npm run deploy:cloud
```

Wrangler abre el navegador para autorizar tu cuenta. Si tienes varias cuentas, define `CLOUDFLARE_ACCOUNT_ID` con la que está en el plan gratuito. El script busca o crea la base `impulso`, guarda su vínculo en `.wrangler/deploy.json` (ignorado por Git), aplica las migraciones y despliega. Al repetirlo reutiliza la misma base, sin borrar las tareas ni las claves. Si ya tienes una base llamada `impulso` para otro proyecto, cambia el nombre en el script y en `wrangler.jsonc` antes de publicar.

La URL pública aparecerá en la salida del despliegue. Comprueba que `/healthz` devuelve `{"ok":true}` y que la web abre por HTTPS. La configuración del cron puede tardar hasta 15 minutos en propagarse.

## En el iPhone

1. Abre la URL pública en Safari (iOS 16.4 o posterior).
2. Compartir → **Añadir a pantalla de inicio**.
3. Abre **Impulso** desde su icono antes de crear tareas.
4. Pulsa **Activar recordatorios** y permite las notificaciones.
5. Crea una tarea pendiente. Prueba el aviso en una hora libre o comprueba el siguiente aviso programado.

Los horarios de Colombia son: lunes/jueves 17:00, martes/miércoles 18:00, viernes 13:00 y fines de semana 10:00. Solo se avisa con tareas pendientes. La entrega depende también de la conexión y de los ajustes de notificaciones de iOS.

## Qué está verificado

Se verificaron la API, las tareas, las rachas, la base D1 local, la generación y persistencia de claves VAPID, el cifrado Web Push y el cron con un receptor simulado dentro del motor workerd. También se comprobó la interfaz móvil. La autenticación, el despliegue público y la recepción real en un iPhone requieren los pasos de cuenta anteriores.

La versión de Cloudflare usa D1. La versión `npm start` conserva SQLite local y sirve para desarrollo o un servidor propio; son bases separadas y no se copian automáticamente entre ellas.
