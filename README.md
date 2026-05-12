# Prysma

Aplicacion local de apoyo al trabajo diario para centralizar conocimiento operativo: entornos, accesos, procedimientos, comandos, plantillas y documentacion tecnica en Markdown.

Su objetivo es ofrecer una base de conocimiento practica, editable y persistente, pensada para consulta rapida y uso cotidiano en Windows.

## Vision general

El proyecto combina:

- un frontend `React + Vite`
- un backend local `Express`
- una variante de escritorio con `Electron`
- scripts de arranque y cierre para uso diario

La aplicacion puede usarse de tres maneras:

1. desarrollo web con recarga en caliente
2. modo web compilado en el navegador predeterminado
3. modo escritorio con `Electron`

## Tecnologias usadas

- `React 18`
- `TypeScript`
- `Vite`
- `Tailwind CSS`
- `Express`
- `Electron`
- `multer`
- `react-markdown`
- `remark-gfm`
- `rehype-highlight`
- `highlight.js`
- `jspdf`
- `html2canvas`

## Estructura principal

- [src/App.tsx](src/App.tsx): logica principal de la aplicacion
- [src/main.tsx](src/main.tsx): bootstrap del frontend y captura de errores de render
- [src/components](src/components): componentes y paneles
- [src/hooks/useSearch.ts](src/hooks/useSearch.ts): busqueda, prefijos y filtros
- [src/types/index.ts](src/types/index.ts): tipos del dominio
- [src/data/manual.json](src/data/manual.json): manual base inicial
- [server.js](server.js): persistencia, backups, subida de imagenes y comprobaciones
- [electron/main.mjs](electron/main.mjs): arranque de la variante Electron
- [scripts/start-app.ps1](scripts/start-app.ps1): arranque del modo web compilado
- [scripts/start-electron.ps1](scripts/start-electron.ps1): arranque del modo Electron
- [scripts/stop-app.ps1](scripts/stop-app.ps1): cierre de servidores e instancias locales

## Requisitos

Para desarrollo:

- `Node.js` 18 o superior
- `npm`
- Windows con PowerShell

Para uso diario:

- Windows
- dependencias instaladas con `npm install`
- frontend compilado con `npm run build` si vas a usar el modo web compilado o Electron local

## Instalacion

### Primera vez

1. Clona el repositorio.
2. Entra en la carpeta del proyecto.
3. Ejecuta:

```powershell
npm install
```

4. Compila el frontend:

```powershell
npm run build
```

Con eso ya puedes usar cualquiera de los modos de arranque.

## Formas de arrancar la aplicacion

### 1. Desarrollo web

```powershell
npm run dev
```

Que hace:

- levanta Vite en `http://localhost:5173`
- levanta el backend en `http://127.0.0.1:3001`

Uso recomendado:

- desarrollo diario
- cambios de frontend o backend
- depuracion

Como cerrar:

- `Ctrl + C` en la terminal

### 2. Web compilada en navegador

Arranque recomendado para uso diario en navegador:

- [Abrir Prysma.vbs](Abrir%20Prysma.vbs)
- [Abrir Prysma.cmd](Abrir%20Prysma.cmd)

Que hace:

- comprueba que exista `dist/index.html`
- arranca el backend en segundo plano en `3001`
- espera a que la app responda
- abre `http://127.0.0.1:3001` en el navegador predeterminado

Como cerrar correctamente:

- [Cerrar Prysma.vbs](Cerrar%20Prysma.vbs)
- [Cerrar Prysma.cmd](Cerrar%20Prysma.cmd)

Importante:

- si cierras solo la ventana o la pestana del navegador, el backend puede quedarse vivo
- para evitar puertos ocupados o instancias antiguas, usa siempre los scripts de cierre

### 3. Electron local

Para pruebas tecnicas puedes lanzarlo con:

```powershell
npm run desktop
```

Pero para uso normal en Windows se recomienda:

- [Abrir Prysma Electron.vbs](Abrir%20Prysma%20Electron.vbs)
- [Abrir Prysma Electron.cmd](Abrir%20Prysma%20Electron.cmd)

Que hace:

- limpia restos de instancias previas
- arranca Electron contra la build local
- usa un servidor embebido en `http://127.0.0.1:3002`

Como cerrar correctamente:

- [Cerrar Prysma Electron.vbs](Cerrar%20Prysma%20Electron.vbs)
- [Cerrar Prysma Electron.cmd](Cerrar%20Prysma%20Electron.cmd)

Importante:

- no mezcles el modo navegador y Electron a la vez
- el modo navegador usa `3001`
- Electron usa `3002`

### 4. Electron usando Vite en desarrollo

Si quieres probar Electron contra el frontend en caliente:

1. En una terminal:

```powershell
npm run vite-dev
```

2. En otra terminal:

```powershell
$env:ELECTRON_START_URL="http://localhost:5173"
npm run desktop
```

### 5. Base preparada para Android con Capacitor

La base del proyecto ya esta preparada para evolucionar a una APK manteniendo el frontend `React + Vite`.

Flujo previsto:

1. instalar dependencias del proyecto
2. generar la build web con `npm run mobile:build`
3. crear la carpeta nativa con `npm run mobile:android:add`
4. sincronizar cambios web con `npm run mobile:android:sync`
5. abrir Android Studio con `npm run mobile:android:open`

Archivos clave para esta via:

- [capacitor.config.ts](capacitor.config.ts)
- [src/services/manualStorage.mobile.ts](src/services/manualStorage.mobile.ts)
- [src/services/runtimeBridge.mobile.ts](src/services/runtimeBridge.mobile.ts)

Notas:

- `manualStorage.mobile` esta preparado para usar `Capacitor Filesystem` cuando la shell nativa lo exponga
- `runtimeBridge.mobile` ya contempla almacenamiento de imagenes con Filesystem y fallback a `data URL`
- mientras Capacitor no este instalado y sincronizado, el proyecto seguira funcionando en web/escritorio como hasta ahora

## Flujo recomendado de uso

### Uso diario en navegador

1. Ejecuta [Abrir Prysma.vbs](Abrir%20Prysma.vbs)
2. Trabaja normalmente
3. Cierra con [Cerrar Prysma.vbs](Cerrar%20Prysma.vbs)

### Uso diario en escritorio

1. Ejecuta [Abrir Prysma Electron.vbs](Abrir%20Prysma%20Electron.vbs)
2. Trabaja normalmente
3. Cierra con [Cerrar Prysma Electron.vbs](Cerrar%20Prysma%20Electron.vbs)

### Cuando cambies codigo

1. Usa `npm run dev`
2. Cuando quieras volver a modo compilado, ejecuta `npm run build`
3. Reabre con el lanzador que corresponda

## Arquitectura

### Frontend

El frontend mantiene un `ManualData` completo con:

- `categories`
- `entries`
- `templates`
- `trash`
- `settings`
- `deletedCategories`

Responsabilidades principales:

- busqueda
- filtros y vistas rapidas
- edicion de fichas, secciones y plantillas
- importacion y exportacion
- papelera
- estados de guardado
- diagnostico visual

### Backend

El backend local en [server.js](server.js) se encarga de:

- leer el manual desde disco
- guardar el manual completo
- crear backups previos al guardado
- servir imagenes subidas
- validar endpoints
- detectar conflictos de guardado entre instancias

### Persistencia

La persistencia sigue este esquema:

1. la fuente principal es el manual gestionado por el servidor
2. `localStorage` actua como apoyo local
3. si el servidor falla, la app puede seguir temporalmente en local

Estados habituales en la UI:

- `Cargado desde disco`
- `Recuperado desde guardado local`
- `Cambios aun no sincronizados`
- `Conflicto de guardado`

### Electron

La variante Electron:

- crea una `BrowserWindow`
- arranca un servidor embebido local
- guarda su runtime en `.runtime/electron-userdata`
- sirve la build de `dist`
- usa el puerto `3002`

## Endpoints principales

- `GET /health`
- `GET /manual`
- `POST /save-manual`
- `GET /check-endpoint`
- `POST /upload`

## Funcionalidades principales

### Inicio y navegacion

- hero principal
- buscador operativo
- secciones
- tarjetas resumen
- accesos rapidos
- utilidades laterales

### Secciones

- crear secciones
- editar nombre, color y descripcion
- borrar secciones
- restaurar secciones desde la papelera

### Fichas

Cada ficha puede incluir:

- titulo
- categoria
- contenido Markdown
- pasos
- comandos
- tags
- fecha de actualizacion
- anclado

Acciones disponibles:

- crear
- editar
- anclar
- borrar a papelera
- exportar a PDF

### Plantillas

- crear plantillas
- editarlas
- usarlas para crear nuevas fichas ya preconfiguradas

### Busqueda y filtros

Soporta:

- texto libre
- filtro por seccion
- filtro por multiples tags
- solo ancladas
- orden por fecha o titulo

Prefijos:

- `/cmd`
- `/env`
- `/db`
- `/uml`
- `/task`

Vistas rapidas:

- `Entorno`
- `Credenciales`
- `Incidencias`
- `Ancladas`

### Papelera

- restaurar fichas
- restaurar una seccion completa
- vaciar la papelera con confirmacion

### Importacion y exportacion

Exportaciones:

- backup JSON completo
- `manual.json`
- PDF por ficha

Importacion:

- fusionar
- reemplazar
- resumen previo de impacto

### Guardado, conflictos y seguridad de sesion

- guardado en disco
- soporte local temporal
- deteccion de conflictos entre instancias
- recarga manual desde disco
- deshacer
- rehacer

### Diagnostico y personalizacion

Desde Ajustes puedes cambiar:

- nombre de la aplicacion
- titulo y descripcion principal
- recordatorio principal
- textos laterales
- icono
- enlaces externos

Tambien incluye diagnostico rapido con:

- estado del servidor
- estado del guardado
- origen de datos
- revision activa
- volumen del manual
- profundidad de deshacer y rehacer

## Pantallas principales

### Home

- hero
- buscador
- secciones
- plantillas
- estadisticas

### Resultados

- listado filtrado
- chips de filtros activos
- ordenacion
- vistas rapidas

### Modal de ficha

- datos basicos
- editor Markdown
- pasos
- comandos
- vista previa

### Modal de seccion

- nombre
- color
- descripcion
- borrado de seccion

### Modal de plantilla

- nombre
- seccion sugerida
- titulo sugerido
- tags
- pasos
- contenido
- comandos sugeridos

### Ajustes

- personalizacion
- branding
- enlaces laterales
- icono
- diagnostico

### Lateral

- herramientas rapidas
- backups
- papelera

## Comandos utiles

```powershell
# instalar dependencias
npm install

# desarrollo web
npm run dev

# compilar frontend
npm run build

# vista previa de build
npm run preview

# electron local
npm run desktop

# build de escritorio
npm run desktop:build

# build portable
npm run desktop:portable

# build base para mobile
npm run mobile:build

# crear proyecto android
npm run mobile:android:add

# sincronizar web + android
npm run mobile:android:sync

# abrir android studio
npm run mobile:android:open
```

## Logs utiles

Si algo falla, revisa:

- [launcher.log](.runtime/logs/launcher.log)
- [electron-launcher.log](.runtime/logs/electron-launcher.log)
- [server.stdout.log](.runtime/logs/server.stdout.log)
- [server.stderr.log](.runtime/logs/server.stderr.log)
- [desktop-runtime.log](.runtime/electron-userdata/desktop-runtime.log)

## Solucion de problemas

### La app abre en blanco

Las causas mas comunes son:

- error de render del frontend
- build antigua en `dist`
- estado local inconsistente

Prueba:

1. cierra la app con el script de cierre correspondiente
2. ejecuta `npm run build`
3. vuelve a abrir

Nota:

- [src/main.tsx](src/main.tsx) incluye una captura de errores de render para evitar pantallas completamente mudas

### El modo navegador no abre la interfaz

Comprueba:

- que exista `dist/index.html`
- que `npm run build` se haya ejecutado
- que el backend responda en `3001`
- el contenido de [launcher.log](.runtime/logs/launcher.log)

### Electron no muestra la ventana

Comprueba:

- que `dist` este actualizado
- que no haya otra instancia previa
- el contenido de [electron-launcher.log](.runtime/logs/electron-launcher.log)
- el contenido de [desktop-runtime.log](.runtime/electron-userdata/desktop-runtime.log)

### El guardado falla

Revisa:

- si el servidor esta `online`
- si hay conflicto de guardado
- si estas en modo local temporal

Si hay conflicto:

- usa `Recargar desde disco`
- o exporta/importa antes de continuar

### El push a GitHub falla

No subas:

- `dist/`
- `release/`
- `release-fixed/`
- `release-icon/`
- `.runtime/`
- `backups/`
- `public/images/`
- manuales o backups con credenciales reales

## Carpetas que no deben versionarse

- `dist/`
- `release/`
- `release-fixed/`
- `release-icon/`
- `.runtime/`
- `backups/`
- `tmp-userdata/`
- `public/images/`

Eso ya esta cubierto por [.gitignore](.gitignore).

## Seguridad

Recomendaciones:

- no subas credenciales reales a [src/data/manual.json](src/data/manual.json)
- no subas backups locales
- no subas imagenes operativas temporales
- usa copias privadas si el contenido incluye accesos reales

## Estado actual

El proyecto ya incluye:

- persistencia unificada
- guardado completo del manual
- papelera con restauracion de fichas y secciones
- deshacer y rehacer
- conflictos entre instancias
- importacion con fusion o reemplazo
- validacion fiable de endpoints
- diagnostico de sesion
- personalizacion visual
- lanzadores para modo navegador y modo Electron

## Posibles mejoras futuras

- optimizacion del bundle
- tests automaticos de interfaz
- sanitizacion mas avanzada de secretos
- sincronizacion multiusuario real
- exportaciones mas ricas


