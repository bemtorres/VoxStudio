# Voice Character Editor - Especificación

## 1. Project Overview

- **Project name**: Voice Character Editor
- **Type**: Web Application (Next.js)
- **Core functionality**: Editor para crear y gestionar personajes con identidades y voces personalizadas, almacenados en SQLite
- **Target users**: Creadores de contenido, desarrolladores de chatbots, VTubers

## 2. UI/UX Specification

### Layout Structure

- **Sidebar**: Lista de personajes (200px width)
- **Main Area**: Editor de personaje seleccionado
- **Header**: Título de la app + acciones globales

### Responsive Breakpoints
- Mobile: < 768px (sidebar colapsable)
- Desktop: >= 768px

### Visual Design

**Color Palette**
- Background: `#0f0f0f`
- Surface: `#1a1a1a`
- Surface Elevated: `#252525`
- Border: `#333333`
- Primary: `#8b5cf6` (violeta)
- Primary Hover: `#a78bfa`
- Text Primary: `#f5f5f5`
- Text Secondary: `#a1a1aa`
- Accent Green: `#22c55e`
- Accent Red: `#ef4444`

**Typography**
- Font Family: `Inter, system-ui, sans-serif`
- Headings: 24px (h1), 20px (h2), 16px (h3)
- Body: 14px
- Small: 12px

**Spacing**
- Base unit: 4px
- Padding: 16px (cards), 24px (sections)
- Gap: 12px (elements), 24px (sections)

### Components

- **CharacterCard**: Avatar + nombre + preview de voz
- **CharacterForm**: Inputs para nombre, edad, personalidad, trasfondo
- **VoiceSelector**: Dropdown con voces de OpenRouter (gratuitas/pagas)
- **AudioPlayer**: Reproductor de audio generado
- **Button**: Primary, Secondary, Ghost variants

## 3. Functionality Specification

### Core Features

1. **Gestión de Personajes (CRUD)**
   - Crear nuevo personaje
   - Editar personaje existente
   - Eliminar personaje
   - Listar todos los personajes

2. **Identidad del Personaje**
   - Nombre
   - Edad
   - Género
   - Personalidad (texto libre)
   - Trasfondo/Historia
   - Descripción física
   - Tags/Categorías

3. **Sistema de Voces OpenRouter**
   - Listar voces disponibles de OpenRouter
   - Filtrar por: precio (gratis/pagas), idioma, género
   - Asignar voz a personaje
   - Guardar configuración de voz

4. **Almacenamiento SQLite**
   - Tabla: characters (id, name, age, gender, personality, background, description, tags, voice_id, voice_provider, created_at, updated_at)
   - Tabla: voice_configs (id, character_id, voice_id, voice_settings, created_at)

### User Flows

1. **Crear personaje**: Click "Nuevo" → Formulario → Guardar → Aparece en sidebar
2. **Editar personaje**: Click en personaje → Modificar campos → Auto-save
3. **Seleccionar voz**: En sección de voz → Filtrar → Seleccionar → Guardar

### Edge Cases
- Validar campos requeridos (nombre mínimo)
- Manejar error de conexión a OpenRouter
- Confirmar eliminación de personaje

## 4. Technical Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite con better-sqlite3
- **API**: OpenRouter para voces (TTS)
- **Styling**: CSS Modules o Tailwind

## 5. Acceptance Criteria

- [ ] Puedo crear un personaje con todos los campos de identidad
- [ ] Puedo ver la lista de personajes en sidebar
- [ ] Puedo editar y eliminar personajes
- [ ] Las voces de OpenRouter se cargan y muestran correctamente
- [ ] Puedo filtrar voces por precio (gratis/pagas)
- [ ] Los datos persisten en SQLite
- [ ] La UI es responsiva y sigue el diseño especificado
