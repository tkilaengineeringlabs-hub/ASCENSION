# ASCENSION 0.1 — Personal Evolution OS

PWA React + TypeScript, servidor Express y almacenamiento en Google Sheets. **Sin OpenAI API**.

## Inicio rápido: demo local

Requisitos: Node.js 20.19+ y npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Abre http://localhost:5173. En modo demo, las misiones se guardan en `server/data/local.json` (no se suben a Google). El servidor lee `.env` desde la raíz al ejecutar desde el monorepo.

## Activar Google Sheets con OAuth

1. Crea un proyecto en Google Cloud Console. Habilita **Google Sheets API**.
2. Configura OAuth consent screen y añade tu usuario como usuario de prueba si la app está en modo Testing.
3. Crea credenciales **OAuth Client ID → Web application**. Añade `http://localhost:3001/auth/google/callback` a los redirect URIs autorizados.
4. Crea una hoja de cálculo nueva en tu Google Drive y copia su ID de la URL.
5. Completa `.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_SPREADSHEET_ID`, `SESSION_SECRET` (cadena aleatoria larga). Reinicia `npm run dev`.
6. Pulsa **Iniciar sesión con Google**. ASCENSION creará las pestañas `missions`, `goals`, `skills` en la hoja y leerá/escribirá sus filas.

**Importante:** En Google Sheets nuevo, el Command Center inicia vacío: añade misiones desde Missions. Puedes rellenar `goals` y `skills` manualmente con los encabezados documentados abajo. El acceso OAuth solicita el alcance de Sheets, no permisos completos de Drive: Drive sirve para alojar el archivo, pero la app todavía no sube evidencias ni crea archivos en Drive.

## Esquema de datos

- `missions`: `id`, `title`, `area`, `priority`, `xp`, `done`, `createdAt`
- `goals`: `id`, `title`, `area`, `status`
- `skills`: `id`, `name`, `level`, `progress`

## Qué funciona

- Command Center con misiones y métricas calculadas.
- Crear misiones y marcarlas completadas; persistencia local o Sheets.
- OAuth Google para acceso a una hoja configurada, mediante servidor.
- Skill Tree y evolución leyendo datos reales; Lab con prompts copiables.
- PWA instalable en navegadores compatibles. En producción se necesita HTTPS.

## Qué queda pendiente

- Persistencia de experimentos y evidencias en Drive, y CRUD completo de objetivos/habilidades.
- Protección CSRF, almacenamiento de sesiones duradero y cifrado de tokens en reposo, validación más estricta, separación multiusuario, rate limiting y controles de acceso por hoja antes de un despliegue público.
- Sesiones actuales en MemoryStore de Express, apropiadas solo para desarrollo local. **No publiques este backend en internet tal como está.**
- PWA: el shell puede funcionar offline tras instalación, pero las acciones y datos requieren servidor.

## Colaboración con ChatGPT sin API

ChatGPT puede trabajar con la misma hoja mediante el conector de Google Drive/Sheets cuando esté conectado y autorizado. **La aplicación no tiene acceso directo a la memoria privada de ChatGPT**. Usa registros explícitos de misiones, objetivos y evaluaciones como fuente de verdad compartida.

## Seguridad

No subas `.env`, tokens OAuth, sesiones ni `server/data` a GitHub. Mantén el proyecto local durante la fase alpha.
