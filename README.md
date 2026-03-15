# VoxStudio

<p align="center">
  <img src="public/VoxStudio.png" alt="VoxStudio" width="320" />
</p>

VoxStudio es una plataforma para crear personajes con voces generadas por inteligencia artificial. Permite diseñar identidades únicas, definir personalidad, estilo y emoción, y convertir texto en audio realista utilizando síntesis de voz avanzada.

Pensado para creadores, desarrolladores y storytellers, VoxStudio combina gestión de personajes, generación de voces y herramientas de producción de audio en un entorno simple y potente.

Desde narraciones y podcasts hasta chatbots y VTubers, VoxStudio convierte ideas en voces.

## Identidad visual

| Color | Hex | Uso |
|-------|-----|-----|
| Oscuro (Vox) | `#373D48` | Texto principal, elementos oscuros |
| Turquesa (Studio) | `#29B6B6` | Acento principal, CTAs |
| Morado/Violeta | `#6B2D8C` | Inicio del degradado |
| Azul Real | `#3B59AB` | Tono medio del degradado |

<p align="center">
  <img src="public/VoxStudioLogo.png" alt="Logo VoxStudio" width="120" />
</p>

## Características

- **Gestión de personajes**: CRUD completo con nombre, edad, género, personalidad, trasfondo y descripción
- **Voces personalizadas**: 13 voces de OpenAI (`gpt-4o-mini-tts`) con instrucciones para tono, emoción y ritmo
- **Vibes predefinidos**: Dramático, Taxista NYC, Calmado, Profesor paciente, etc.
- **Generación con IA**: Instrucciones de voz generadas automáticamente desde la personalidad del personaje
- **Idiomas**: Español, inglés, francés, alemán, italiano, portugués y japonés
- **Almacenamiento**: SQLite para metadatos + archivos MP3 en disco
- **Reproductor global**: Barra fija inferior que mantiene el audio al cambiar de personaje
- **Interfaz tipo SUNO**: 4 paneles (Nav, Personajes, Audios, Drawer de detalle)

## Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **Base de datos**: SQLite (`better-sqlite3`)
- **TTS**: OpenAI `gpt-4o-mini-tts`
- **Instrucciones de voz**: OpenAI `gpt-4o-mini` (opcional)

## Requisitos

- Node.js 18+
- Cuenta de OpenAI con API key

## Instalación

```bash
git clone <repo>
cd voces
npm install
```

## Configuración

Crea un archivo `.env` en la raíz:

```env
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

| Variable | Descripción |
|----------|-------------|
| `OPENAI_API_KEY` | Requerida para generar audio (TTS) y opcionalmente instrucciones de voz |
| `NEXT_PUBLIC_APP_URL` | URL base de la app (por defecto `http://localhost:3000`) |

## Uso

```bash
npm run dev   # Desarrollo (puerto 3000)
npm run build # Producción
npm start     # Servidor de producción
```

## Estructura de la app

```
Panel 1 (Nav)     → Personajes | Podcast (próximamente)
Panel 2           → Listado de personajes
Panel 3           → Workspace: audios del personaje seleccionado
Panel 4 (Drawer)  → Detalle del audio (texto, idioma, voz, cualidades)
```

## Rutas API

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/characters` | GET, POST | Listar y crear personajes |
| `/api/characters/[id]` | GET, PUT, DELETE | Obtener, actualizar y eliminar personaje |
| `/api/voices` | GET | Listar voces disponibles |
| `/api/voices/generate` | POST | Generar audio (TTS) |
| `/api/voices/generate-instructions` | POST | Generar instrucciones de voz con IA |
| `/api/audios` | GET, POST | Listar y guardar audios |
| `/api/audios/[id]` | DELETE | Eliminar audio |

## Base de datos

- **characters**: `id`, `name`, `age`, `gender`, `personality`, `background`, `description`, `tags`, `voice_id`, `voice_instructions`, etc.
- **audios**: `id`, `character_id`, `text`, `voice_id`, `file_path`, `language`, `qualities`, `characters_used`, `cost_usd`, etc.

Los archivos MP3 se guardan en `public/audios/{character_id}/{id}.mp3`.

## Admin

Ruta `/admin` para gestión avanzada (dashboard de voces y configuración).

## Roadmap

- [ ] **Podcast**: Módulo para crear y gestionar podcasts
- [ ] Conversaciones entre personajes
- [ ] Editor de conversación
- [ ] Exportación avanzada

---

Desarrollado para creadores de contenido, chatbots y VTubers.
