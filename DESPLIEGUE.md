# Publicar con GitHub Pages (gratis)

La aplicación ahora es estática y no envía notificaciones. No se necesitan Cloudflare, bases de datos ni credenciales adicionales.

1. Abre [Settings → Pages](https://github.com/matpaz400/Recordatorios/settings/pages).
2. En **Build and deployment**, elige **Deploy from a branch**.
3. Selecciona la rama **main** y la carpeta **/docs**. Pulsa **Save**.
4. Espera a que GitHub complete la publicación. La misma página mostrará la URL y **Visit site**.
5. Abre esa URL desde Safari en el iPhone y añade la aplicación a la pantalla de inicio.

La dirección esperada con la configuración predeterminada es `https://matpaz400.github.io/Recordatorios/`. Usa el enlace que muestre GitHub como confirmación de la publicación.

Los archivos y enlaces relativos están preparados para esa subcarpeta. `docs/.nojekyll` evita procesamientos innecesarios. El servicio worker conserva una copia local para uso sin conexión tras la primera visita.

Los datos se guardan en el dispositivo. Usa la exportación de tareas para hacer copias. Si habías probado una versión previa con servidor, sus datos no se migran automáticamente; no se han eliminado los datos locales antiguos del entorno.

Si quedaron requisitos de Cloudflare en los ajustes del entorno de Codex, ya no se utilizan. Puedes retirar `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` allí; no hace falta completarlos.
