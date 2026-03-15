# Propuesta: Imágenes de Personajes en VoxStudio

## Objetivo

Permitir que cada personaje tenga una imagen/avatar asociada, reemplazando o complementando el avatar actual basado en la inicial del nombre.

---

## 1. Modelo de datos

### Base de datos (SQLite)

Añadir columna a la tabla `characters`:

| Campo        | Tipo   | Descripción                                      |
|-------------|--------|--------------------------------------------------|
| `avatar_path` | TEXT   | Ruta relativa al archivo (ej. `characters/42/avatar.webp`) |

- **Nullable**: Sí. Si está vacío, se usa la inicial del nombre (comportamiento actual).
- **Migración**: `ALTER TABLE characters ADD COLUMN avatar_path TEXT DEFAULT ''`

### Almacenamiento en disco

Estructura similar a audios:

```
public/
  characters/
    {character_id}/
      avatar.webp   (o avatar.jpg, avatar.png)
```

- **Formato recomendado**: WebP (buen balance calidad/tamaño) con fallback a JPG/PNG.
- **Tamaño máximo sugerido**: 2 MB por imagen.
- **Dimensiones recomendadas**: 512×512 px (cuadrado, para avatares).

---

## 2. API

### Opción A: Endpoint dedicado (recomendado)

```
POST /api/characters/[id]/avatar
Content-Type: multipart/form-data
Body: file (imagen)

Response: { avatar_path: "characters/42/avatar.webp" }
```

**Ventajas**: Manejo nativo de archivos, streaming, sin límites de tamaño por JSON.

### Opción B: Incluir en PUT del personaje

```
PUT /api/characters/[id]
Content-Type: application/json
Body: { ..., avatar_base64: "data:image/webp;base64,..." }
```

**Ventajas**: Una sola llamada para actualizar todo.  
**Desventajas**: Payloads grandes en JSON, límites de request body.

**Recomendación**: Opción A.

### Eliminación

Al eliminar un personaje (`DELETE /api/characters/[id]`), borrar también:
- `public/characters/{id}/avatar.*`
- La carpeta `public/characters/{id}/` si queda vacía.

---

## 3. Flujo de subida

1. Usuario hace clic en el avatar (o en el ícono de cámara) en el formulario de personaje.
2. Se abre un `<input type="file" accept="image/*" />`.
3. Validaciones en cliente:
   - Formatos: JPEG, PNG, WebP.
   - Tamaño máximo: 2 MB.
   - Opcional: redimensionar a 512×512 antes de enviar (canvas).
4. `FormData` con el archivo → `POST /api/characters/[id]/avatar`.
5. Servidor:
   - Crea `public/characters/{id}/` si no existe.
   - Guarda el archivo como `avatar.{ext}` (o convierte a WebP).
   - Actualiza `characters.avatar_path` en la BD.
   - Elimina el avatar anterior si existía (para permitir reemplazo).
6. Respuesta con `avatar_path` → la UI actualiza la vista.

---

## 4. Cambios en la UI

### Lugares donde mostrar el avatar

| Ubicación              | Comportamiento actual              | Con imagen                          |
|------------------------|------------------------------------|-------------------------------------|
| Lista de personajes    | Inicial en círculo con gradiente   | `<img src={avatar_path} />` o inicial |
| Formulario de edición  | Inicial + ícono cámara            | Imagen + botón "Cambiar" / "Quitar" |
| Panel de detalle       | —                                  | Avatar en header si aplica          |

### Componente de avatar

Crear `CharacterAvatar` reutilizable:

```tsx
interface CharacterAvatarProps {
  character: { name: string; avatar_path?: string };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
// Si avatar_path existe → <img />
// Si no → div con inicial (actual)
```

### Formulario de personaje

- Reemplazar el div con inicial por `CharacterAvatar` + overlay de subida.
- Al hacer clic: abrir file input.
- Botón "Quitar imagen" si hay avatar (vuelve a inicial).

---

## 5. Seguridad y validación

- **Tipos MIME**: Aceptar solo `image/jpeg`, `image/png`, `image/webp`.
- **Extensiones**: Validar que la extensión coincida con el tipo.
- **Tamaño**: Rechazar archivos > 2 MB.
- **Sanitización**: No confiar en el nombre original del archivo; usar `avatar.{ext}` fijo.
- **Path traversal**: Asegurar que `character_id` sea numérico y corresponda al personaje.

---

## 6. Plan de implementación

| Fase | Tareas |
|------|--------|
| **1. Backend** | Migración BD, endpoint `POST /api/characters/[id]/avatar`, actualizar `deleteCharacter` para borrar avatar |
| **2. Tipos** | Añadir `avatar_path` a `Character` en `types/index.ts` |
| **3. Componente** | Crear `CharacterAvatar` |
| **4. Formulario** | Integrar subida en `CharacterForm`, reemplazar avatar actual |
| **5. Listas** | Usar `CharacterAvatar` en lista de personajes y admin |

---

## 7. Consideraciones futuras

- **Generación con IA**: Endpoint para generar avatar desde la descripción del personaje (DALL·E, etc.).
- **Múltiples imágenes**: Galería de referencias (no solo avatar).
- **CDN/externo**: Si se escala, mover imágenes a S3 o similar.
- **Optimización**: Servir WebP con fallback, lazy loading en listas.

---

## 8. Resumen

| Aspecto        | Decisión                                      |
|----------------|-----------------------------------------------|
| Almacenamiento | Disco: `public/characters/{id}/avatar.{ext}` |
| BD             | Columna `avatar_path` (TEXT)                  |
| API            | `POST /api/characters/[id]/avatar` (multipart)|
| Formatos       | JPEG, PNG, WebP (max 2 MB)                    |
| Fallback       | Inicial del nombre si no hay imagen           |
