# Letterboxd Plus

[![CI](https://github.com/NemoKing1210/letterboxd-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/NemoKing1210/letterboxd-plus/actions/workflows/ci.yml)
[![Instalar userscript](https://img.shields.io/badge/Install-userscript-00e054?style=for-the-badge&labelColor=14181c)](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/letterboxd-plus.user.js)
[![Licencia: MIT](https://img.shields.io/badge/License-MIT-40bcf4?style=for-the-badge&labelColor=14181c)](https://github.com/NemoKing1210/letterboxd-plus/blob/main/LICENSE)

[English](https://github.com/NemoKing1210/letterboxd-plus/blob/main/README.md) · [Русский](https://github.com/NemoKing1210/letterboxd-plus/blob/main/README.ru.md) · **Español** · [Português (Brasil)](https://github.com/NemoKing1210/letterboxd-plus/blob/main/README.pt-BR.md) · [Deutsch](https://github.com/NemoKing1210/letterboxd-plus/blob/main/README.de.md) · [Français](https://github.com/NemoKing1210/letterboxd-plus/blob/main/README.fr.md) · [简体中文](https://github.com/NemoKing1210/letterboxd-plus/blob/main/README.zh-CN.md)

Un userscript ligero que amplía [Letterboxd](https://letterboxd.com/) con
valoraciones externas, listas de reparto y equipo más completas, mini tarjetas
al pasar el cursor y traducción en la propia página, manteniendo la esencia del
sitio.

Letterboxd Plus añade valoraciones de Rotten Tomatoes y Metacritic a las
páginas de películas, enriquece Reparto y Equipo con retratos, muestra mini
tarjetas detalladas de películas y miembros, traduce sinopsis, reseñas y
comentarios, y ofrece un panel de ajustes con el aspecto nativo del sitio. No
necesita clave de API y funciona por completo en tu navegador.

Compatible con [Tampermonkey](https://www.tampermonkey.net/),
[Violentmonkey](https://violentmonkey.github.io/),
[Greasemonkey](https://www.greasespot.net/),
[ScriptCat](https://scriptcat.org/) y otros gestores que admiten el bloque de
metadatos `// ==UserScript==`.

> **Estado:** `0.23.1`. Incluye valoraciones, Reparto y Equipo mejorados, mini
> tarjetas de películas y miembros, traducción, control de caché e interfaz en
> siete idiomas. Se pueden añadir más mejoras de Letterboxd como módulos
> independientes.

> `@updateURL` / `@downloadURL` apuntan a la rama `main` de GitHub: la URL
> directa de instalación de abajo siempre ofrece la compilación más reciente.

## Capturas

El userscript real en páginas activas de Letterboxd.

![Panel de ajustes de Letterboxd Plus con las pestañas General, Película, Tarjeta de usuario, Traducción, Caché y Acerca de](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/docs/screenshots/settings-panel.png)

| | |
|---|---|
| ![Secciones de Rotten Tomatoes, Metacritic y valoración media en la barra lateral de la película](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/docs/screenshots/ratings.png)<br>**Valoraciones externas** — Tomatometer, Popcornmeter, Metascore, User Score y una media combinada | ![Lista de reparto con retratos y papeles](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/docs/screenshots/enhanced-cast.png)<br>**Reparto mejorado** — retratos, nombres y papeles, cargados a medida que las tarjetas se acercan a la vista |
| ![Página de equipo con retratos de dirección, producción y guion](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/docs/screenshots/crew.png)<br>**Equipo mejorado** — el mismo tratamiento para dirección, producción, guion y el resto del equipo | ![Mini tarjeta de película al pasar el cursor por un póster: valoraciones, reparto, géneros y sinopsis](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/docs/screenshots/film-mini-card.png)<br>**Mini tarjetas de películas** — valoraciones, reparto, géneros, duración, sinopsis, enlaces rápidos y botón de traducción al pasar el cursor |
| ![Mini tarjeta de miembro con nivel, estadísticas, ubicación, películas favoritas y actividad reciente](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/docs/screenshots/user-mini-card.png)<br>**Mini tarjetas de miembros** — nivel y progreso, estadísticas, ubicación, favoritos y actividad reciente | ![Sinopsis de una película con la traducción al español debajo del original](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/docs/screenshots/translation.png)<br>**Traducción** — sinopsis, reseñas y comentarios, debajo del original o sustituyéndolo |

## Instalación rápida

1. Instala un gestor de userscripts. Se recomiendan Tampermonkey, Violentmonkey
   o ScriptCat.
2. Abre la URL directa del userscript que aparece abajo.
3. Confirma la instalación en tu gestor.

**Última compilación de GitHub:**

```text
https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/letterboxd-plus.user.js
```

[![Instalar Letterboxd Plus](https://img.shields.io/badge/⬇_Install-Letterboxd_Plus-14181c?style=for-the-badge&labelColor=00e054)](https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main/letterboxd-plus.user.js)

### Instalar desde el panel de un gestor

| Gestor | Ruta de instalación |
|--------|---------------------|
| Tampermonkey | Dashboard → **Utilities** → **Install from URL** |
| Violentmonkey | Dashboard → **+** → **Install from URL** |
| Greasemonkey | Menú del complemento → **New User Script** → pega el script |
| ScriptCat | Dashboard → instalar por URL y pegar el enlace directo de GitHub |

### Instalación manual

1. Abre
   [`letterboxd-plus.user.js`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/letterboxd-plus.user.js)
   en el repositorio (o ejecuta `npm run build` después de clonarlo).
2. Copia el archivo completo.
3. Crea un script nuevo en tu gestor de userscripts.
4. Pega el archivo, guárdalo y recarga Letterboxd.

## Funciones

### Valoraciones externas

En las páginas de películas, el script añade secciones compactas a la barra
lateral nativa:

- **Rotten Tomatoes** — puntuación de la crítica Tomatometer, estado Certified
  Fresh cuando existe, puntuación opcional del público Popcornmeter, número de
  reseñas y valoraciones y enlace directo a la página de la película
  encontrada.
- **Metacritic** — Metascore con número de reseñas de la crítica, User Score
  opcional con número de valoraciones, acentos por franja de puntuación y
  enlace directo a la película encontrada.
- **Valoración media** — combina la nota de Letterboxd con todas las
  valoraciones externas activas y disponibles. Los valores se normalizan a la
  escala de cinco puntos de Letterboxd y se promedian por igual; las
  valoraciones no disponibles se omiten.

Ambas fuentes usan el título y el año de estreno para desambiguar los
resultados, y el identificador TMDB de Letterboxd sirve como clave de caché
local. Los esqueletos de carga y los estados no bloqueantes de vacío y error
mantienen la página utilizable si una fuente tarda o falla.

### Reparto y equipo mejorados

La sección Reparto puede mostrar tarjetas compactas con el retrato, el nombre y
el papel de cada actor. La página de Equipo recibe el mismo tratamiento para
dirección, producción, guion y otros miembros del equipo.

Los retratos se leen de páginas públicas de personas de Letterboxd solo cuando
las tarjetas se acercan a la vista, con un límite de solicitudes. Primero se
muestran diez miembros del reparto; el resto queda sin cargar hasta pulsar
**Show All** y que sus tarjetas se acerquen a la vista. Los resultados se
guardan solo en memoria.

### Mini tarjetas de películas

Al pasar el cursor por un póster en listas, catálogo, diario, watchlist,
búsqueda y cuadrículas de películas similares se abre una mini tarjeta con:

- póster, título, año, nota de la comunidad de Letterboxd y tu estado (vista,
  me gusta, watchlist, valoración);
- dirección, reparto, géneros, eslogan, duración y una sinopsis breve;
- distintivos de Tomatometer y Metascore cuando esas fuentes están activas;
- indicaciones de nivel de valoración, enlaces rápidos y un enlace directo a la
  película;
- un botón **Traducir** para la sinopsis.

El póster principal de la página de la película queda excluido. La carga es
progresiva y no bloqueante, con precarga opcional al entrar en pantalla. La
tarjeta puede abrirse al pasar el cursor o con el botón derecho, según tu
preferencia.

### Mini tarjetas de miembros

Al pasar el cursor por el avatar o el enlace de perfil de un miembro en
cualquier parte de Letterboxd se abre una mini tarjeta con:

- nombre visible, nombre de usuario, avatar y enlace al perfil completo;
- **nivel y rango** — barra de progreso con puntos y el siguiente rango;
- estadísticas de películas, películas este año, listas, seguidos y
  seguidores;
- biografía, ubicación, películas favoritas y actividad reciente cuando el
  perfil las publica.

La tarjeta se omite en la cabecera del sitio y dentro de otras mini tarjetas.
Como las de películas, puede abrirse al pasar el cursor o con el botón derecho
y precargarse cuando los avatares se acercan a la vista.

### Traducción

La traducción integrada puede traducir:

- **sinopsis de películas** en las páginas de películas y en las mini tarjetas;
- **reseñas** en tarjetas de reseña y páginas de reseña independientes;
- **comentarios** bajo las reseñas.

El destino es uno de los siete idiomas de la interfaz o el mismo idioma de la
interfaz. Elige si el texto traducido **sustituye** al original (con un botón
para volver) o aparece **debajo**. Las reseñas también pueden traducirse
automáticamente al entrar en pantalla; está desactivado por defecto.

La traducción usa el endpoint gratuito de Google, sin clave de API. Cada bloque
tiene su botón Traducir y cada ámbito se puede desactivar en los ajustes.

### Ajustes

Abre **Letterboxd Plus** desde:

- el menú desplegable de la cuenta de Letterboxd, justo después del elemento
  nativo **Settings** (resaltado en el verde de la marca);
- el menú del gestor de userscripts mediante **Letterboxd Plus settings**.

El panel accesible con pestañas sigue el lenguaje visual de Letterboxd e
incluye:

- **General** — idioma de la interfaz y posición de los avisos;
- **Película** — visibilidad de las fuentes de valoración, Reparto y Equipo
  mejorados, y comportamiento y contenido de las mini tarjetas de películas;
- **Tarjeta de usuario** — comportamiento y contenido de las mini tarjetas de
  miembros;
- **Traducción** — idioma de destino, modo de visualización y ámbitos de
  traducción;
- **Caché** — medidor de almacenamiento, estadísticas por tipo, retención,
  interruptores de caché por fuente y limpieza manual;
- **Acerca de** — descripción del proyecto, versión, licencia, repositorio y
  autor.

El diálogo admite navegación por pestañas con teclado, flechas, cierre con
Escape, foco visible, diseños móviles y preferencias de movimiento reducido.

### Idiomas de la interfaz

La interfaz está disponible en siete idiomas:

- English;
- Русский;
- Español;
- Português (Brasil);
- Deutsch;
- Français;
- 简体中文.

El modo **Auto** predeterminado consulta la lista de idiomas preferidos del
navegador y elige el primero compatible. Las variantes regionales como `es-MX`,
`pt-PT` y `zh-Hans` se asignan a la traducción disponible correspondiente. Los
idiomas del navegador no compatibles o ausentes vuelven al inglés. Puedes fijar
un idioma en **Settings → General → Interface language**.

### Caché y resistencia

- Las respuestas correctas de Rotten Tomatoes y Metacritic se guardan en el
  almacenamiento del userscript con claves separadas por fuente.
- Las mini tarjetas de películas y miembros y las traducciones usan sus propias
  claves de caché, y cada tipo se puede desactivar en la pestaña Caché.
- La duración de la caché se configura entre `0` y `168` horas.
- Con `0` siempre se solicitan datos nuevos.
- La pestaña Caché muestra el uso actual frente a un presupuesto orientativo y
  conservador de 5 MB.
- Las entradas activas y caducadas se miden por separado y se pueden borrar por
  tipo sin restablecer los ajustes.
- Las solicitudes tienen un tiempo de espera fijo y los errores nunca impiden
  que Letterboxd cargue.
- Las solicitudes fallidas y las coincidencias inexistentes no se guardan como
  valoraciones válidas.

## Páginas compatibles

| Sitio | Patrón de URL | Comportamiento |
|-------|---------------|----------------|
| Letterboxd | `https://letterboxd.com/*` | Entrada de ajustes en la navegación, valoraciones, reparto y equipo, mini tarjetas y traducción |
| Letterboxd (`www`) | `https://www.letterboxd.com/*` | El mismo comportamiento en el host alternativo |

Las valoraciones solo se montan cuando la página expone metadatos de película
mediante `body[data-type="film"][data-tmdb-id]`.

## Cómo funciona

```text
Página de película de Letterboxd
        │
        ├── leer título, año y TMDB ID de los metadatos de la página
        │
        ├── comprobar la caché de GM
        │
        ├── búsqueda y ficha de Rotten Tomatoes
        │
        └── búsqueda JSON y ficha de Metacritic
                    │
                    ├── coincidencia estricta de título y año
                    ├── leer puntuaciones de crítica y público
                    └── guardar cada fuente por separado
                                      │
                                      ▼
                            renderizar en la barra lateral
```

Las mini tarjetas solicitan la página pública de la película o del miembro a
través de peticiones del navegador del mismo origen y leen los datos que ya
están allí. El escáner de página es idempotente y observa los cambios dinámicos
del DOM, por lo que la navegación de React restaura la entrada del menú de
cuenta y los montajes sin crear duplicados.

## Fuentes de datos y limitaciones

Rotten Tomatoes y Metacritic no ofrecen API públicas compatibles para este caso
de uso. Letterboxd Plus lee páginas públicas de Rotten Tomatoes y los endpoints
JSON que usa el propio sitio de Metacritic mediante `GM_xmlhttpRequest`.

Reparto y Equipo mejorados leen páginas públicas de personas de Letterboxd con
peticiones del navegador del mismo origen y muestran la URL del retrato que ya
figura allí. Los resultados se guardan solo en memoria; no se persisten
biografías ni retratos.

La traducción envía el texto seleccionado al endpoint público de Google. El
texto traducido se guarda localmente en el almacenamiento del userscript salvo
que la caché de traducciones esté desactivada.

Esto tiene varias consecuencias prácticas:

- los cambios de marcado o del esquema JSON de las fuentes pueden romper
  temporalmente la extracción de puntuaciones;
- algunos títulos nuevos, poco conocidos o no estrenados pueden no tener una
  página coincidente;
- un título puede existir sin puntuaciones de crítica o público;
- la disponibilidad puede variar según la red o la región.

Estos casos se tratan como funcionalidad reducida, no como fallos de la página
de Letterboxd. El script no envía valoraciones, no modifica datos de Rotten
Tomatoes ni de Metacritic y no requiere credenciales de cuenta.

## Actualizaciones

Los metadatos del userscript incluyen `@updateURL` y `@downloadURL` que apuntan
al artefacto directo de GitHub en `main`. Los gestores compatibles pueden
buscar nuevas versiones automáticamente.

Para publicar una versión:

1. Elige el incremento de Versionado Semántico:
   - **major** para cambios incompatibles o que requieran migración;
   - **minor** para funciones compatibles;
   - **patch** para correcciones, estilos, documentación y mantenimiento.
2. Sincroniza la versión en `package.json` y `package-lock.json`.
3. Ejecuta `npm run ci` para recompilar y verificar los artefactos raíz.
4. Sube el código actualizado y los archivos generados.

## Estructura del repositorio

```text
letterboxd-plus/
├── src/
│   ├── main.js                       # Arranque y observador del DOM
│   ├── core/                         # Constantes, caché y ajustes
│   ├── api/                          # Letterboxd, RT, Metacritic y traducción
│   ├── features/                     # Valoraciones, reparto, equipo, tarjetas,
│   │                                 # ajustes, traducción y avisos
│   ├── i18n/                         # Locales y ayudantes de traducción
│   ├── utils/                        # Debounce, escape HTML, nombres de usuario
│   └── styles/tokens.css             # Tokens de diseño compartidos
├── docs/
│   ├── letterboxd-dom/               # Selectores estables y mapas de datos
│   └── screenshots/                  # Capturas para el README
├── scripts/                          # Copia y verificación de artefactos
├── .github/workflows/ci.yml          # Compilación y verificación
├── letterboxd-plus.user.js           # Userscript instalable generado
├── letterboxd-plus.meta.js           # Metadatos generados para actualizaciones
├── vite.config.js                    # Compilación y metadatos del userscript
├── package.json                      # Versión, dependencias y scripts npm
├── AGENTS.md / DESIGN.md / CLAUDE.md # Documentación para colaboradores y agentes
├── SECURITY.md                       # Política de seguridad
├── README.md / README.*.md           # README en varios idiomas
└── LICENSE                           # Licencia MIT
```

| Ruta | Propósito |
|------|-----------|
| `src/` | Fuente legible; los cambios de producto se hacen aquí |
| `dist/` | Salida local de Vite; generada e ignorada por git |
| `letterboxd-plus.user.js` | Artefacto completo de instalación y actualización |
| `letterboxd-plus.meta.js` | Metadatos ligeros para comprobar actualizaciones |
| `vite.config.js` | `@match`, `@connect`, nombres, URL y configuración de compilación |

## Metadatos y permisos del script

| Campo | Valor |
|-------|-------|
| `@namespace` | `https://github.com/NemoKing1210/letterboxd-plus` |
| `@match` | Hosts principal y `www` de Letterboxd |
| `@connect` | Hosts de Rotten Tomatoes, `backend.metacritic.com` y `translate.googleapis.com` |
| `@run-at` | `document-idle` |
| `@license` | MIT |
| `@updateURL` / `@downloadURL` | Userscript directo de GitHub en `main` |

| Permiso | Propósito |
|---------|-----------|
| `GM_xmlhttpRequest` | Solicitar fuentes externas de valoración y el endpoint de traducción |
| `GM_getValue` / `GM_setValue` | Guardar ajustes, caché de valoraciones y traducciones |
| `GM_listValues` / `GM_deleteValue` | Medir y borrar entradas de caché |
| `GM_addStyle` | Inyectar los estilos de la interfaz |
| `GM_registerMenuCommand` | Abrir los ajustes desde el gestor de userscripts |

No se almacenan tokens de acceso, claves de API, contraseñas ni datos de sesión
de Letterboxd.

## Desarrollo

Requiere [Node.js 22](https://nodejs.org/), como indica
[`.nvmrc`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/.nvmrc).

```bash
npm install
npm run dev                # Sirve un userscript "dev:" instalable
npm run build              # Compila dist/ y actualiza los artefactos raíz
npm run verify:artifacts   # Comprueba que dist y la raíz coinciden
npm run ci                 # Compila y ejecuta todas las comprobaciones
```

Edita los archivos de `src/`. Los metadatos del userscript se definen en
[`vite.config.js`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/vite.config.js)
y la versión procede de
[`package.json`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/package.json).

Después de cada cambio:

1. actualiza la versión con Versionado Semántico;
2. ejecuta `npm run ci`;
3. incluye los artefactos regenerados `.user.js` y `.meta.js`.

No edites directamente los artefactos minificados ni hagas commit de URL
temporales de localhost.

Consulta también:

- [`AGENTS.md`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/AGENTS.md) — arquitectura para agentes de IA
- [`DESIGN.md`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/DESIGN.md) — lenguaje visual y tokens de Letterboxd
- [`docs/letterboxd-dom/`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/docs/letterboxd-dom/README.md) — selectores estables y mapas de datos
- [`SECURITY.md`](https://github.com/NemoKing1210/letterboxd-plus/blob/main/SECURITY.md) — cómo informar de una vulnerabilidad

## Afiliación

Letterboxd Plus es un proyecto comunitario independiente. **No está afiliado ni
respaldado por Letterboxd, Rotten Tomatoes, Metacritic, Fandango, Google ni sus
propietarios**. Todos los nombres de productos y marcas pertenecen a sus
respectivos propietarios.

## Licencia

[MIT](https://github.com/NemoKing1210/letterboxd-plus/blob/main/LICENSE) —
Copyright © 2026 NemoKing
