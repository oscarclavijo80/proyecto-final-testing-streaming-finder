# 🎬 Streaming Finder

Buscador de películas en plataformas de streaming con recomendaciones inteligentes por preferencias del usuario. Construido con **Node.js**, conectado vía **MCP (Model Context Protocol)** y con cobertura de pruebas del **100%**.

![Tests](https://img.shields.io/badge/tests-74%20passed-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## 📋 Tabla de Contenidos

- [Descripción](#descripción)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Instalación](#instalación)
- [Uso](#uso)
- [Herramientas MCP](#herramientas-mcp)
- [Algoritmo de Recomendación](#algoritmo-de-recomendación)
- [Pruebas Unitarias](#pruebas-unitarias)
- [Resultados de Cobertura](#resultados-de-cobertura)
- [TDD y Patrones Aplicados](#tdd-y-patrones-aplicados)
- [CI/CD con GitHub Actions](#cicd-con-github-actions)

---

## Descripción

**Streaming Finder** permite al usuario:

1. **Buscar** una película por título y saber en cuál de las 4 plataformas está disponible
2. **Recibir recomendaciones** automáticas si la película no existe, usando un algoritmo de compatibilidad basado en preferencias (género, país, idioma, plataforma, rating)
3. **Explorar catálogos** por plataforma
4. **Ejecutar herramientas MCP** directamente para integraciones avanzadas

Plataformas soportadas: **Netflix**, **Disney+**, **HBO Max**, **Amazon Prime Video**

---

## Estructura del Proyecto

```
streaming-finder/
│
├── .github/
│   └── workflows/
│       └── tests.yml                   # CI/CD con GitHub Actions
│
├── src/
│   ├── data/
│   │   └── moviesDatabase.js           # Base de datos de 15 películas en 4 plataformas
│   │
│   ├── services/
│   │   ├── searchService.js            # Lógica de búsqueda y normalización de texto
│   │   └── recommendationService.js   # Algoritmo de recomendación por preferencias
│   │
│   ├── mcp/
│   │   └── streamingMCP.js             # Conector MCP con 4 herramientas disponibles
│   │
│   └── index.js                        # CLI interactivo (menú principal)
│
├── tests/
│   └── unit/
│       ├── searchService.test.js           # 51 pruebas del servicio de búsqueda
│       ├── recommendationService.test.js   # 23 pruebas del algoritmo de recomendación
│       └── streamingMCP.test.js            # 20 pruebas del conector MCP
│
├── coverage/                            # Reportes de cobertura (generado automáticamente)
├── .gitignore
├── package.json
└── README.md
```

---

## Instalación

### Requisitos
- **Node.js >= 18.0.0** → [descargar en nodejs.org](https://nodejs.org)
- **npm >= 8.0.0** (incluido con Node.js)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/streaming-finder.git
cd streaming-finder

# 2. Instalar dependencias
npm install

# 3. Verificar instalación ejecutando las pruebas
npm test
```

---

## Uso

### Ejecutar la aplicación

```bash
node src/index.js
```

Aparece el menú interactivo:

```
============================================================
🎬  STREAMING FINDER - Buscador de Películas
    Netflix | Disney+ | HBO Max | Amazon Prime
============================================================

📋 MENÚ PRINCIPAL:
  1. 🔍 Buscar película
  2. ⭐ Ver recomendaciones personalizadas
  3. ⚙️  Configurar preferencias
  4. 📺 Ver catálogo por plataforma
  5. 🛠  Ejecutar herramienta MCP directamente
  6. ❌ Salir
```

### Ejemplos de búsqueda

| Búsqueda       | Resultado |
|----------------|-----------|
| `Narcos`       | ✅ Netflix |
| `Encanto`      | ✅ Disney+ |
| `Succession`   | ✅ HBO Max |
| `The Boys`     | ✅ Amazon Prime Video |
| `Avatar`       | ✅ Disney+ y Amazon Prime Video |
| `PeliculaXYZ`  | ❌ No encontrada → sugiere recomendaciones automáticas |

### Comandos de pruebas

```bash
npm test                # Todas las pruebas + reporte de cobertura
npm run test:unit       # Solo pruebas unitarias
npm run test:verbose    # Modo detallado con nombre de cada prueba
npm run test:watch      # Modo watch para desarrollo
```

---

## Herramientas MCP

El sistema expone **4 herramientas** vía Model Context Protocol:

### `search_movie`
Busca una película por título en todas las plataformas.
```json
{ "title": "Narcos" }
```

### `get_platform_catalog`
Obtiene el catálogo completo de una plataforma.
```json
{ "platform": "netflix" }
```

### `get_recommendations`
Recomendaciones personalizadas basadas en preferencias del usuario.
```json
{
  "genres": ["drama", "crimen"],
  "platforms": ["netflix", "hbo"],
  "country": "CO",
  "language": "es",
  "minRating": 8.0,
  "excludeTitles": ["Narcos"],
  "limit": 5
}
```

### `list_platforms`
Lista todas las plataformas disponibles.
```json
{}
```

---

## Algoritmo de Recomendación

El algoritmo calcula un **puntaje de compatibilidad de 0 a 100** basado en:

| Factor      | Peso | Descripción |
|-------------|------|-------------|
| Género      | 40%  | Coincidencia entre géneros favoritos y géneros de la película |
| Plataforma  | 20%  | Si la película está en una plataforma que el usuario tiene |
| País        | 15%  | País de producción del contenido (ej: CO para Colombia) |
| Idioma      | 15%  | Idioma original de la película vs idioma preferido |
| Rating      | 10%  | Calificación de la comunidad normalizada sobre 10 |

**Ejemplo de resultado para perfil colombiano (drama, Netflix, CO, es):**
```
1. Ozark (2017) → Netflix          ⭐8.4  | Compatibilidad: 68.4%
2. Succession (2018) → HBO Max     ⭐8.9  | Compatibilidad: 48.9%
3. Stranger Things (2016) → Netflix ⭐8.7 | Compatibilidad: 48.7%
```

---

## Pruebas Unitarias

### Resumen de resultados

```
Test Suites: 3 passed, 3 total
Tests:       74 passed, 74 total
Snapshots:   0 total
Time:        0.572 s
```

### Detalle por archivo

#### `searchService.test.js` — 51 pruebas

**Suite: `normalizeText` (8 pruebas)**
```
✓ GIVEN un texto con mayúsculas y acentos WHEN se normaliza THEN retorna texto limpio en minúsculas
✓ GIVEN un texto ya en minúsculas sin acentos WHEN se normaliza THEN retorna el mismo texto
✓ GIVEN un texto con espacios al inicio y fin WHEN se normaliza THEN los espacios son eliminados
✓ GIVEN un valor null WHEN se normaliza THEN retorna cadena vacía
✓ GIVEN un valor undefined WHEN se normaliza THEN retorna cadena vacía
✓ GIVEN un número como argumento WHEN se normaliza THEN retorna cadena vacía
✓ GIVEN una cadena vacía WHEN se normaliza THEN retorna cadena vacía
✓ GIVEN texto con acentos múltiples WHEN se normaliza THEN elimina todos los diacríticos
```

**Suite: `searchMovieByTitle` (10 pruebas)**
```
✓ GIVEN un título exacto WHEN se busca THEN retorna la película con sus plataformas
✓ GIVEN un título parcial WHEN se busca THEN retorna las películas que coincidan
✓ GIVEN un título con diferentes mayúsculas WHEN se busca THEN retorna resultados sin importar el caso
✓ GIVEN un título inexistente WHEN se busca THEN retorna arreglo vacío
✓ GIVEN una cadena vacía WHEN se busca THEN retorna arreglo vacío
✓ GIVEN null como título WHEN se busca THEN retorna arreglo vacío
✓ GIVEN solo espacios como título WHEN se busca THEN retorna arreglo vacío
✓ GIVEN una película en múltiples plataformas WHEN se busca THEN retorna todas las plataformas
✓ GIVEN título con acentos WHEN se busca THEN funciona correctamente
✓ GIVEN una búsqueda exitosa WHEN se retornan resultados THEN cada resultado tiene propiedades requeridas
```

**Suite: `formatSearchResult` (4 pruebas)**
```
✓ GIVEN resultados encontrados WHEN se formatean THEN retorna found=true con mensaje apropiado
✓ GIVEN arreglo vacío WHEN se formatea THEN retorna found=false con mensaje de no encontrado
✓ GIVEN null como resultados WHEN se formatea THEN retorna found=false
✓ GIVEN resultado con múltiples plataformas WHEN se formatea THEN el texto incluye todas las plataformas
```

**Suite: `getMoviesByPlatform` (5 pruebas)**
```
✓ GIVEN plataforma netflix WHEN se consulta THEN retorna solo películas de Netflix
✓ GIVEN plataforma disney WHEN se consulta THEN retorna películas de Disney+
✓ GIVEN plataforma en mayúsculas WHEN se consulta THEN sigue funcionando correctamente
✓ GIVEN plataforma inexistente WHEN se consulta THEN retorna arreglo vacío
✓ GIVEN null como plataforma WHEN se consulta THEN retorna arreglo vacío
```

**Suite: `getMoviesByGenre` (4 pruebas)**
```
✓ GIVEN género drama WHEN se busca THEN retorna películas del género drama
✓ GIVEN género acción con tilde WHEN se busca THEN retorna resultados correctamente
✓ GIVEN género inexistente WHEN se busca THEN retorna arreglo vacío
✓ GIVEN null como género WHEN se busca THEN retorna arreglo vacío
```

---

#### `recommendationService.test.js` — 23 pruebas

**Suite: `calculateCompatibilityScore` (6 pruebas)**
```
✓ GIVEN preferencias que coinciden perfectamente WHEN se calcula THEN el puntaje es alto (>=70)
✓ GIVEN preferencias sin coincidencia de género WHEN se calcula THEN el puntaje es menor
✓ GIVEN movie y preferences null WHEN se calcula puntaje THEN retorna 0
✓ GIVEN preferencias vacías WHEN se calcula THEN el puntaje está basado principalmente en el rating
✓ GIVEN puntaje calculado WHEN se verifica el rango THEN está entre 0 y 100
✓ GIVEN coincidencia de país CO WHEN se calcula THEN recibe puntos extras por país
```

**Suite: `getRecommendations` (8 pruebas)**
```
✓ GIVEN preferencias de género drama WHEN se piden recomendaciones THEN retorna películas de drama
✓ GIVEN títulos a excluir WHEN se piden recomendaciones THEN esos títulos no aparecen
✓ GIVEN límite de 3 WHEN se piden recomendaciones THEN retorna máximo 3 películas
✓ GIVEN preferencias null WHEN se piden recomendaciones THEN retorna las mejor valoradas por defecto
✓ GIVEN rating mínimo de 8.5 WHEN se piden recomendaciones THEN no retorna películas con rating menor
✓ GIVEN preferencia de plataforma netflix WHEN se piden recomendaciones THEN las películas priorizan netflix
✓ GIVEN las recomendaciones WHEN se obtienen THEN están ordenadas por puntaje descendente
✓ GIVEN arreglo de exclusiones vacío WHEN se piden recomendaciones THEN no filtra películas
```

**Suite: `getDefaultRecommendations` (4 pruebas)**
```
✓ GIVEN sin argumentos WHEN se piden recomendaciones default THEN retorna las 5 mejor valoradas
✓ GIVEN límite personalizado WHEN se piden recomendaciones default THEN respeta el límite
✓ GIVEN recomendaciones default WHEN se obtienen THEN están ordenadas por rating descendente
✓ GIVEN recomendaciones default WHEN se obtienen THEN cada una tiene platformNames
```

**Suite: `formatRecommendations` (5 pruebas)**
```
✓ GIVEN recomendaciones con título buscado WHEN se formatean THEN el mensaje menciona el título
✓ GIVEN recomendaciones sin título buscado WHEN se formatean THEN el mensaje es genérico
✓ GIVEN lista vacía de recomendaciones WHEN se formatea THEN retorna mensaje de sin resultados
✓ GIVEN null como recomendaciones WHEN se formatea THEN retorna mensaje de sin resultados
✓ GIVEN recomendaciones formateadas WHEN se revisa la estructura THEN cada item tiene rank
```

---

#### `streamingMCP.test.js` — 20 pruebas

**Suite: `getMCPTools` (3 pruebas)**
```
✓ GIVEN el sistema MCP WHEN se solicitan herramientas THEN retorna las 4 herramientas disponibles
✓ GIVEN las herramientas MCP WHEN se revisa la estructura THEN cada herramienta tiene nombre, descripción y esquema
✓ GIVEN las herramientas MCP WHEN se revisan los nombres THEN contiene las herramientas esperadas
```

**Suite: `executeMCPTool - search_movie` (4 pruebas)**
```
✓ GIVEN herramienta search_movie con título válido WHEN se ejecuta THEN retorna success=true con resultados
✓ GIVEN herramienta search_movie sin título WHEN se ejecuta THEN retorna success=false con error
✓ GIVEN título inexistente WHEN se busca con MCP THEN retorna success=true con count=0
✓ GIVEN herramienta search_movie con película válida WHEN se ejecuta THEN el resultado contiene el tool name
```

**Suite: `executeMCPTool - get_platform_catalog` (4 pruebas)**
```
✓ GIVEN plataforma netflix válida WHEN se consulta catálogo THEN retorna success=true con películas
✓ GIVEN todas las plataformas WHEN se consultan catálogos THEN todas retornan éxito
✓ GIVEN plataforma no válida WHEN se consulta catálogo THEN retorna success=false
✓ GIVEN sin parámetro platform WHEN se consulta catálogo THEN retorna success=false
```

**Suite: `executeMCPTool - get_recommendations` (4 pruebas)**
```
✓ GIVEN preferencias de usuario WHEN se solicitan recomendaciones THEN retorna success=true con películas
✓ GIVEN args vacíos WHEN se solicitan recomendaciones THEN retorna recomendaciones por defecto
✓ GIVEN límite personalizado WHEN se solicitan recomendaciones THEN respeta el límite
✓ GIVEN películas a excluir WHEN se solicitan recomendaciones THEN no incluye los excluidos
```

**Suite: `executeMCPTool - list_platforms` (3 pruebas)**
```
✓ GIVEN herramienta list_platforms WHEN se ejecuta THEN retorna las 4 plataformas
✓ GIVEN herramienta list_platforms WHEN se ejecuta THEN cada plataforma tiene id y nombre
✓ GIVEN herramienta list_platforms WHEN se ejecuta THEN incluye netflix, disney, hbo y amazon
```

**Suite: `manejo de errores` (2 pruebas)**
```
✓ GIVEN herramienta inexistente WHEN se ejecuta THEN retorna success=false con error descriptivo
✓ GIVEN sin argumentos WHEN se ejecuta herramienta THEN usa args por defecto sin error de runtime
```

---

## Resultados de Cobertura

Reporte generado con `npm test` (`jest --coverage`):

```
---------------------------|---------|----------|---------|---------|
File                       | % Stmts | % Branch | % Funcs | % Lines |
---------------------------|---------|----------|---------|---------|
All files                  |     100 |    92.22 |     100 |     100 |
 data                      |         |          |         |         |
  moviesDatabase.js        |     100 |      100 |     100 |     100 |
 mcp                       |         |          |         |         |
  streamingMCP.js          |     100 |    93.75 |     100 |     100 |
 services                  |         |          |         |         |
  recommendationService.js |     100 |    89.79 |     100 |     100 |
  searchService.js         |     100 |       96 |     100 |     100 |
---------------------------|---------|----------|---------|---------|
```

### Tipos de cobertura medidos

| Tipo | Resultado | Descripción |
|------|-----------|-------------|
| **Statements** | **100%** | Cada instrucción ejecutable fue cubierta |
| **Branch** | **92.22%** | Cada rama de if/else fue recorrida |
| **Functions** | **100%** | Cada función fue invocada al menos una vez |
| **Lines** | **100%** | Cada línea de código fue ejecutada |

> El reporte visual interactivo se genera en `coverage/lcov-report/index.html` al ejecutar `npm test`.

---

## TDD y Patrones Aplicados

### Ciclo TDD (Red → Green → Refactor)

Durante el desarrollo se detectó un bug real en el conector MCP: la función `get_recommendations` no pasaba correctamente el parámetro `excludeTitles` al servicio. La prueba lo detectó en fase RED y se corrigió antes de continuar.

```
🔴 RED     → La prueba "GIVEN películas a excluir..." falló
🟢 GREEN   → Se corrigió la destructuración de args en streamingMCP.js
🔵 REFACTOR → Se simplificó la lógica eliminando la bifurcación innecesaria
```

### Patrón AAA (Arrange – Act – Assert)

Cada prueba sigue la estructura de tres secciones comentadas:

```javascript
test('descripción en Given-When-Then', () => {
  // Arrange: preparar datos y contexto
  const title = 'Narcos';

  // Act: ejecutar la función bajo prueba
  const result = searchMovieByTitle(title);

  // Assert: verificar el resultado esperado
  expect(result).toHaveLength(1);
  expect(result[0].title).toBe('Narcos');
  expect(result[0].platforms[0].id).toBe('netflix');
});
```

### Framework Given-When-Then

Todos los nombres de las 74 pruebas siguen el formato:

```
GIVEN [estado inicial o contexto]
WHEN  [acción que se ejecuta]
THEN  [resultado o comportamiento esperado]
```

**Ejemplo:**
```
GIVEN plataforma netflix válida WHEN se consulta catálogo THEN retorna success=true con películas
```

---

## CI/CD con GitHub Actions

El repositorio incluye un workflow en `.github/workflows/tests.yml` que ejecuta automáticamente las pruebas en cada push y pull request:

- Se ejecuta en **Node.js 18.x y 20.x**
- Genera y sube el **reporte de cobertura** como artefacto descargable
- Falla el build si alguna prueba no pasa

```yaml
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
```

---

## Aseguramiento de Calidad

| Dimensión | Implementación |
|-----------|----------------|
| **Verificación** | 74 pruebas unitarias con Jest confirman que el código cumple su especificación |
| **Validación** | El sistema responde correctamente a entradas reales del usuario (búsquedas, preferencias, errores) |
| **Calidad (QA)** | Umbrales de cobertura configurados en `package.json` impiden bajar del 70-80% mínimo |
| **TDD** | Ciclo Red-Green-Refactor aplicado; bug encontrado y corregido por las pruebas |
| **CI/CD** | GitHub Actions ejecuta las pruebas automáticamente en cada commit |

---

## Licencia

MIT — Proyecto académico para la actividad de automatización de pruebas unitarias y métricas de cobertura.
