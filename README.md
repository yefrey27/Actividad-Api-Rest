# ▶ ANIMEX — Anime Explorer PRO

> **Presentado por:** Yefrey Navarro · Roberto De La Hoz

![ANIMEX Banner](https://placehold.co/1200x400/07080c/e63946?text=ANIMEX+%E2%80%94+Anime+Explorer+PRO&font=oswald)

Una aplicación web de exploración de anime en tiempo real, construida con HTML, CSS y JavaScript vanilla, que consume la **API pública de Jikan (MyAnimeList v4)**.

---

## 📋 Tabla de Contenidos

- [Vista General](#-vista-general)
- [Screenshots](#-screenshots)
- [Características](#-características)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación y Uso](#-instalación-y-uso)
- [API Reference](#-api-reference)
- [Arquitectura del Código](#-arquitectura-del-código)
- [Funcionalidades Detalladas](#-funcionalidades-detalladas)
- [Autores](#-autores)

---

## 🌐 Vista General

ANIMEX es una SPA (Single Page Application) que permite a los usuarios:

- **Buscar** cualquier anime con filtros avanzados
- **Explorar** el ranking oficial Top Anime de MyAnimeList
- **Ver** la temporada actual en emisión
- **Analizar** estadísticas visuales con gráficas reales
- **Guardar** favoritos con persistencia local

La aplicación no requiere backend ni base de datos: todo funciona desde el navegador con la API gratuita de Jikan.

---

## 📸 Screenshots

### 🔎 Explorar — Búsqueda de Anime

> Pantalla principal con buscador inteligente (debounce), filtros por tipo, score mínimo y orden.

```
┌─────────────────────────────────────────────────────────────────┐
│  ▶ ANIMEX   [Explorar] [Top] [Temporada] [Stats] [Favoritos]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                   Descubre el universo anime                    │
│          ┌──────────────────────────────────────────┐           │
│          │ ⌕  Ej: Naruto, One Piece, Death Note…   │BUSCAR│     │
│          └──────────────────────────────────────────┘           │
│           [Tipo ▾] [Score mín. ▾] [Ordenar ▾] [✕ Limpiar]       │
│                                                                 │
│  "Naruto" — 1,234 resultados                                    │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│  │ img  │ │ img  │ │ img  │ │ img  │ │ img  │                   │
│  │      │ │      │ │      │ │      │ │      │                   │
│  │Naruto│ │Boruto│ │ ...  │ │ ...  │ │ ...  │                   │
│  │ 7.9  │ │ 5.8  │ │      │ │      │ │      │                   │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                   │
│                    [← Anterior]  Página 1  [Siguiente →]        │
└─────────────────────────────────────────────────────────────────┘
```

---

### 🏆 Top Anime — Ranking MAL

> Ranking oficial de MyAnimeList con paginación infinita y filtros de categoría.

```
┌─────────────────────────────────────────────────────────────────┐
│  Ranking oficial MyAnimeList                                    │
│  Top Anime                        [Por score ▾]                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ #1  🥇   │  │ #2       │  │ #3       │  │ #4       │         │
│  │  [img]   │  │  [img]   │  │  [img]   │  │  [img]   │         │
│  │ TV       │  │ Movie    │  │ TV       │  │ Movie    │         │
│  │Fullmetal │  │Steins;G. │  │ Gintama  │  │ Your N.  │         │
│  │   9.11   │  │  9.07    │  │  9.05    │  │  8.94    │         │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
│                                                                 │
│                        [Cargar más →]                           │
└─────────────────────────────────────────────────────────────────┘
```

---

### 📅 Temporada Actual

> Anime en emisión durante la temporada en curso, ordenado por score.

```
┌─────────────────────────────────────────────────────────────────┐
│  En emisión ahora                                               │
│  Temporada Actual                    Spring 2026                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│  │ img  │ │ img  │ │ img  │ │ img  │ │ img  │                   │
│  │ TV   │ │ TV   │ │ ONA  │ │ TV   │ │ TV   │                   │
│  │      │ │      │ │      │ │      │ │      │                   │
│  │ 8.7  │ │ 8.5  │ │ 8.3  │ │ 7.9  │ │ 7.7  │                   │
│  │● En  │ │● En  │ │● En  │ │● En  │ │● En  │                   │
│  │emis. │ │emis. │ │emis. │ │emis. │ │emis. │                   │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### 📊 Estadísticas

> Dashboard con KPIs y 6 gráficas interactivas basadas en los 50 mejores animes de MAL.

```
┌─────────────────────────────────────────────────────────────────┐
│  Datos reales — Top 50 MAL          [↺ Recargar]                │
│  Estadísticas                                                   │
├────────────┬────────────┬────────────┬────────────┬─────────────┤ 
│  8.94      │  9.11      │  46,230    │  458.6M    │    38       │
│Score prom. │Score máx.  │ Eps total  │  Miembros  │ Series TV   │
├────────────┴────────────┴────────────┴────────────┴─────────────┤
│  ┌──────────────────────────┐  ┌──────────────────┐             │
│  │  🏆 Top 15 — Score real  │  │ 📊 Por tipo     │              │
│  │  ████████████ 9.11       │  │    ┌───┐         │             │
│  │  ███████████  9.07       │  │  ╱     ╲         │             │
│  │  ██████████   9.05  ...  │  │ │  TV   │        │             │ 
│  └──────────────────────────┘  └──────────────────┘             │
│  ┌──────────────────────────────────────────────────┐           │
│  │  📺 Top 10 por episodios (barras horizontales)   │           │  
│  └──────────────────────────────────────────────────┘           │
│  ┌──────────────────────────┐  ┌──────────────────┐             │
│  │  👥 Top 10 — Miembros    │  │  ⭐ Favoritos     │           │
│  └──────────────────────────┘  └──────────────────┘             │
│  ┌──────────────────────────────────────────────────┐           │ 
│  │  📅 Score promedio por año de estreno (línea)    │           │
│  └──────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

---

### 📱 Modal de Detalle

> Vista detallada de un anime con tabs: Sinopsis, Información, Personajes, Staff, Trailer, Música y Relacionados.

```
┌─────────────────────────────────────────────────────────────────┐
│                        [banner imagen]                  [✕]    │
│  ┌────────┐  TV                                                 │
│  │ poster │  Fullmetal Alchemist: Brotherhood                  │
│  │  img   │  鋼の錬金術師 FULLMETAL ALCHEMIST                   │
│  │        │  ★ 9.11   #1 Rank   #3 Popular.   2.4M miembros   │
│  │        │  [Action] [Adventure] [Drama] [Fantasy] [Shounen]  │
│  └────────┘  [★ En Favoritos]  [Ver en MAL ↗]                 │
├─────────────────────────────────────────────────────────────────┤
│  [Sinopsis] [Información] [Personajes] [Staff] [Trailer][Música]│
├─────────────────────────────────────────────────────────────────┤
│  Following a failed alchemical ritual...                        │
│  (texto completo de sinopsis)                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### ❤️ Favoritos

> Colección personal guardada en localStorage con opción de limpiar todo.

```
┌─────────────────────────────────────────────────────────────────┐
│  Tu colección                        [🗑 Limpiar todo]           │
│  Favoritos                                                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐                                     │
│  │ img  │ │ img  │ │ img  │   (★ marcados)                      │
│  │  TV  │ │Movie │ │  TV  │                                     │
│  │ 9.11 │ │ 8.94 │ │ 8.60 │                                     │
│  └──────┘ └──────┘ └──────┘                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ Características

| Característica | Descripción |
|---|---|
| 🔎 **Búsqueda en tiempo real** | Debounce de 650ms con búsqueda automática al escribir |
| 🎛️ **Filtros avanzados** | Por tipo (TV/Película/OVA/ONA), score mínimo y orden |
| 📄 **Paginación** | Navegación entre páginas de resultados (20 por página) |
| 🏆 **Top Anime** | Ranking completo de MAL con carga infinita (25 por página) |
| 📅 **Temporada actual** | Detección automática de la temporada (Winter/Spring/Summer/Fall) |
| 📊 **Dashboard estadístico** | 6 gráficas con Chart.js usando datos reales del Top 50 |
| 🎬 **Modal detallado** | 7 tabs: Sinopsis, Info, Personajes, Staff, Trailer, Música, Relacionados |
| ❤️ **Sistema de favoritos** | Persistencia en localStorage, badge con contador en el nav |
| ⚡ **Caché en memoria** | TTL de 5 minutos para evitar peticiones repetidas |
| 🚦 **Rate limiting** | Respeto al límite de Jikan (~2.4 req/s) con retry automático en 429 |
| 🖱️ **Cursor personalizado** | Cursor custom animado con efecto hover |
| 📱 **Responsive** | Menú hamburguesa en móvil, grid adaptativo |
| 🎨 **Diseño dark editorial** | Tipografías Bebas Neue + Syne + JetBrains Mono |
| 🔔 **Sistema de toasts** | Notificaciones no bloqueantes para acciones del usuario |

---

## 🛠 Tecnologías Utilizadas

| Tecnología | Versión | Uso |
|---|---|---|
| **HTML5** | — | Estructura semántica de la SPA |
| **CSS3** | — | Diseño dark editorial, animaciones, responsive |
| **JavaScript ES2020** | — | Lógica de la aplicación (vanilla, sin frameworks) |
| **Jikan API** | v4 | Fuente de datos de MyAnimeList |
| **Chart.js** | 4.4.0 | Gráficas del dashboard de estadísticas |
| **Google Fonts** | — | Bebas Neue · Syne · JetBrains Mono |

> No se utilizan frameworks de JavaScript ni librerías de UI. Todo el DOM se manipula de forma nativa.

---

## 📁 Estructura del Proyecto

``` 
animex/
├── index.html          # Estructura HTML de la SPA (5 secciones + modal)
├── style.css           # Estilos: variables CSS, componentes, responsive
├── app.js              # Lógica completa: API, estado, renderizado, gráficas
└── README.md           # Esta documentación
```

### Secciones HTML (`index.html`)

```
<main>
  ├── #sec-search     → Buscador + filtros + grid de resultados + paginación
  ├── #sec-top        → Ranking top anime + carga infinita
  ├── #sec-season     → Temporada actual en emisión
  ├── #sec-stats      → KPIs + 6 gráficas Chart.js
  └── #sec-favs       → Colección personal de favoritos
</main>
<div#mov>             → Modal overlay con detalle completo
```

---

## 🚀 Instalación y Uso

### Opción 1 — Abrir directamente en el navegador

```bash
# Clonar el repositorio
git clone https://github.com/TU_USUARIO/animex.git
cd animex

# Abrir index.html en el navegador (doble clic o:)
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux
```

> ⚠️ Al abrir como `file://` puede haber restricciones CORS en algunos navegadores. Se recomienda usar un servidor local.

### Opción 2 — Servidor local (recomendado)

```bash
# Con Python 3
python -m http.server 3000

# Con Node.js (npx)
npx serve .

# Con VS Code + extensión Live Server
# Clic derecho en index.html → "Open with Live Server"
```

Luego abrir `http://localhost:3000` en el navegador.

### Opción 3 — GitHub Pages

El proyecto puede desplegarse directamente en **GitHub Pages** sin configuración adicional:

1. Ir a `Settings → Pages` en el repositorio
2. Seleccionar rama `main` y carpeta `/root`
3. Guardar — la app estará disponible en `https://TU_USUARIO.github.io/animex/`

---

## 🔌 API Reference

La aplicación utiliza la **API de Jikan v4** (`https://api.jikan.moe/v4`), que es un wrapper no oficial de MyAnimeList.

### Endpoints utilizados

| Endpoint | Descripción | Parámetros clave |
|---|---|---|
| `GET /anime` | Búsqueda de anime | `q`, `type`, `min_score`, `order_by`, `page`, `limit` |
| `GET /top/anime` | Ranking top MAL | `filter`, `page`, `limit` |
| `GET /seasons/now` | Temporada en curso | `limit` |
| `GET /anime/{id}/full` | Detalle completo de un anime | `id` |
| `GET /anime/{id}/characters` | Personajes del anime | `id` |
| `GET /anime/{id}/staff` | Staff del anime | `id` |
| `GET /top/anime?page=1&limit=25` | Primera página de top (stats) | — |
| `GET /top/anime?page=2&limit=25` | Segunda página de top (stats) | — |

### Campos consumidos por endpoint

```
/anime/{id}/full:
  title, title_japanese, type, score, rank, popularity, members,
  favorites, episodes, status, aired, year, season, duration,
  rating, source, synopsis, background, studios, producers,
  licensors, genres, themes, demographics, relations,
  streaming, external, trailer.youtube_id, theme.openings,
  theme.endings, images

/anime/{id}/characters:
  character { name, images }, role, voice_actors

/anime/{id}/staff:
  person { name, images }, positions
```

### Rate limiting

```javascript
const RATE_MS  = 420;   // ~2.4 req/s (límite seguro de Jikan)
const DEBOUNCE = 650;   // ms búsqueda en tiempo real
const TTL      = 5 * 60 * 1000; // caché en memoria 5 min
```

Si la API devuelve `HTTP 429`, la aplicación espera **1.2 segundos** y reintenta automáticamente.

---

## 🏗 Arquitectura del Código

### `app.js` — Módulos principales

```
app.js
├── CONFIG          → Constantes (API base URL, rate limit, debounce, TTL)
├── CACHÉ           → Map en memoria con TTL de 5 min por endpoint
├── api(path)       → Función central de fetch con rate limiting y caché
├── ESTADO (S)      → Objeto global con estado de cada sección
├── DOM (D)         → Referencias cacheadas a todos los elementos del DOM
├── CURSOR          → Cursor custom con efecto hover
├── NAV             → Navegación entre secciones con lazy loading
├── TOAST           → Sistema de notificaciones temporales
├── CARD            → Generador de tarjetas de anime reutilizable
├── BÚSQUEDA        → Debounce, filtros, paginación
├── TOP ANIME       → Carga inicial + paginación infinita
├── TEMPORADA       → Carga de /seasons/now
├── ESTADÍSTICAS    → KPIs animados + 6 gráficas Chart.js
├── MODAL           → Carga paralela (full + chars + staff) + 7 tabs
├── FAVORITOS       → CRUD en localStorage + renderizado
└── INIT            → DOMContentLoaded setup
```

### Patrón de estado

```javascript
const S = {
  sec:    'search',                          // sección activa
  search: { q, type, score, order, page,     // estado de búsqueda
            hasNext, total },
  top:    { filter, page, items,             // estado del top
            hasNext, busy },
  se ason: { done },                          // cargado una vez
  stats:  { done },                          // cargado una vez
  favs:   [],                                // array de objetos guardados
  charts: {},                                // instancias Chart.js activas
  dbt:    null,                              // timeout del debounce
};
```

### Caché de API

```javascript
// Cada petición se guarda con timestamp
_cache.set(path, { d: responseData, t: Date.now() });

// Se reutiliza si tiene menos de 5 minutos
if (Date.now() - h.t < TTL) return h.d;
```

---

## 🔍 Funcionalidades Detalladas

### Sistema de Búsqueda

- **Debounce inteligente**: espera 650ms tras el último carácter antes de buscar
- **Búsqueda inmediata**: al presionar Enter o el botón BUSCAR
- **Filtros combinables**: tipo de anime, score mínimo y criterio de orden
- **Paginación**: 20 resultados por página, contador total de resultados
- **Limpieza**: botón "✕ Limpiar" restablece filtros sin borrar la búsqueda

### Modal de Detalle — 7 Tabs

| Tab | Contenido |
|---|---|
| **Sinopsis** | Descripción del anime + trasfondo si existe |
| **Información** | Grid con todos los metadatos (tipo, eps, estado, fechas, estudio, etc.) |
| **Personajes** | Hasta 16 personajes con imagen, nombre, rol y seiyuu japonés |
| **Staff** | Hasta 12 personas del equipo con imagen, nombre y posición |
| **Trailer** | Iframe de YouTube con el trailer oficial |
| **Música** | Openings y endings listados |
| **Relacionados** | Anime relacionados (precuelas, secuelas, etc.) — clickables para abrir |

### Dashboard Estadístico — 6 Gráficas

| Gráfica | Tipo | Datos |
|---|---|---|
| Top 15 Score | Barras verticales | Scores reales del top 15 MAL |
| Distribución por tipo | Doughnut | TV vs Movie vs OVA etc. |
| Top 10 por episodios | Barras horizontales | Animes con más eps |
| Top 10 Miembros | Barras verticales | Usuarios MAL que lo tienen en lista |
| Top 10 Favoritos | Doughnut | Favoritos en MAL |
| Score por año | Línea + área | Score promedio agrupado por año de estreno |

### Persistencia de Favoritos

Los favoritos se guardan en `localStorage` bajo la clave `animex_favs` como un array JSON con los campos mínimos necesarios para renderizar la tarjeta sin hacer llamadas API adicionales:

```javascript
{
  mal_id, title, score, type, episodes, images, status, airing
}
```

---

## 👨‍💻 Autores

| Nombre                | Rol                 |
|                       |                     |
| **Yefrey Navarro**    | Desarrollo frontend | 
| **Roberto De La Hoz** | Desarrollo frontend |

---

## 📄 Licencia

Este proyecto fue desarrollado con fines académicos. Los datos son provistos por [Jikan API](https://jikan.moe/) (wrapper no oficial de [MyAnimeList](https://myanimelist.net/)).

---

<div align="center">
  <strong>▶ ANIMEX</strong> 
</div>
