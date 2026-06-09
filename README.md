# 🎬 Streaming Finder

Buscador de películas en plataformas de streaming con recomendaciones inteligentes por preferencias del usuario.
Construido con **Node.js + Express**, conectado vía **MCP (Model Context Protocol)** y con cobertura de pruebas completa incluyendo **unitarias, de integración y de sistema**.

[![Tests](https://img.shields.io/badge/tests-unitarias%20%2B%20integración%20%2B%20sistema-brightgreen)](https://github.com/oscarclavijo80/streaming-finder)
[![Coverage](https://img.shields.io/badge/coverage-≥80%25-brightgreen)](https://github.com/oscarclavijo80/streaming-finder)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-blue)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## 📋 Tabla de Contenidos

- [Descripción](#descripción)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Instalación](#instalación)
- [Comandos de Pruebas](#comandos-de-pruebas)
- [🧠 Conceptos Clave — Pruebas de Integración](#-conceptos-clave--pruebas-de-integración)
- [Arquitectura Limpia](#arquitectura-limpia)
- [Pruebas Unitarias](#pruebas-unitarias)
- [Pruebas de Integración con FakeRepository](#pruebas-de-integración-con-fakerepository)
- [Pruebas de Integración con Mocks](#pruebas-de-integración-con-mocks)
- [Pruebas de Sistema HTTP](#pruebas-de-sistema-http)
- [Matriz de Pruebas de Integración](#matriz-de-pruebas-de-integración)
- [Cobertura de Pruebas](#cobertura-de-pruebas)
- [Gestión de Defectos](#gestión-de-defectos)
- [TDD y Patrones Aplicados](#tdd-y-patrones-aplicados)
- [CI/CD con GitHub Actions](#cicd-con-github-actions)
- [Reflexión Técnica](#reflexión-técnica)

---

## Descripción

**Streaming Finder** permite al usuario:

1. **Buscar** una película por título y saber en cuál de las 4 plataformas está disponible
2. **Recibir recomendaciones** automáticas usando un algoritmo de compatibilidad (género, país, idioma, plataforma, rating)
3. **Persistir historial** de búsquedas por usuario a través de un repositorio
4. **Configurar preferencias** de usuario para personalizar recomendaciones
5. **Explorar catálogos** por plataforma con contexto del perfil del usuario
6. **Ejecutar herramientas MCP** directamente para integraciones avanzadas

Plataformas soportadas: **Netflix**, **Disney+**, **HBO Max**, **Amazon Prime Video**

---

## Estructura del Proyecto

```
streaming-finder/
│
├── .github/
│   └── workflows/
│       └── tests.yml                        # CI/CD con GitHub Actions
│
├── src/
│   ├── data/
│   │   └── moviesDatabase.js                # BD de 15 películas en 4 plataformas
│   │
│   ├── services/
│   │   ├── searchService.js                 # Lógica de búsqueda y normalización
│   │   ├── recommendationService.js         # Algoritmo de recomendación
│   │   └── userSearchService.js             # 🆕 Caso de uso: orquesta búsqueda + repo
│   │
│   ├── fakes/
│   │   └── fakeMovieRepository.js           # 🆕 FakeRepository en memoria (tests)
│   │
│   ├── delivery/
│   │   └── streamingApp.js                  # 🆕 API REST Express (capa de entrega)
│   │
│   └── mcp/
│       └── streamingMCP.js                  # Conector MCP con 4 herramientas
│
├── tests/
│   ├── unit/
│   │   ├── searchService.test.js            # 51 pruebas del servicio de búsqueda
│   │   ├── recommendationService.test.js    # 23 pruebas del algoritmo
│   │   └── streamingMCP.test.js             # 20 pruebas del conector MCP
│   │
│   ├── integration/                         # 🆕 PRUEBAS DE INTEGRACIÓN
│   │   ├── userSearchService.integration.test.js   # Con FakeRepository (~20 pruebas)
│   │   └── userSearchService.mock.integration.test.js  # Con Jest Mocks (~18 pruebas)
│   │
│   └── system/                              # 🆕 PRUEBAS DE SISTEMA (HTTP)
│       └── streamingApp.system.test.js      # End-to-end sobre API REST (~20 pruebas)
│
├── defectos.md                              # 🆕 Registro de defectos detectados
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
git clone https://github.com/oscarclavijo80/streaming-finder.git
cd streaming-finder

# 2. Instalar dependencias
npm install

# 3. Verificar instalación ejecutando las pruebas
npm test
```

---

## Comandos de Pruebas

```bash
npm test                    # Todas las pruebas (unit + integration + system) + cobertura
npm run test:unit           # Solo pruebas unitarias
npm run test:integration    # Solo pruebas de integración
npm run test:system         # Solo pruebas de sistema (HTTP)
npm run test:verbose        # Modo detallado con nombre de cada prueba
npm run test:watch          # Modo watch para desarrollo
```

---

## 🧠 Conceptos Clave — Pruebas de Integración

> Esta sección documenta los conceptos aprendidos en el taller de **Pruebas de Integración y Sistema** y cómo se aplicaron al proyecto.

### ¿Qué son las Pruebas de Integración?

Las pruebas de integración verifican que **dos o más módulos del sistema interactúen correctamente entre sí**. A diferencia de las pruebas unitarias —que prueban cada clase de forma aislada— las pruebas de integración prueban la **comunicación entre capas**.

**Ejemplo en nuestro proyecto:** verificar que `UserSearchService` (lógica de negocio) + `FakeMovieRepository` (persistencia) trabajen juntos correctamente: que una búsqueda exitosa se persista realmente en el repositorio.

```
┌──────────────────────┐        ┌─────────────────────────┐
│  UserSearchService   │◄──────►│   FakeMovieRepository   │
│  (application)       │        │   (infrastructure)      │
│                      │        │   en memoria             │
│  searchAndSave()     │        │   saveSearch()           │
│  getEnrichedHistory()│        │   getSearchHistory()     │
└──────────────────────┘        └─────────────────────────┘
        ▲ prueba de integración verifica esta interacción ▲
```

### Diferencia entre Unitarias, de Integración y de Sistema

| Tipo de Prueba | ¿Qué verifica? | Herramienta | Velocidad | Aislamiento |
|----------------|---------------|-------------|-----------|-------------|
| **Unitaria** | Una sola clase/función en aislamiento | Jest | ⚡ Muy rápida | Máximo (mocks de todo) |
| **Integración** | Interacción entre 2+ capas | Jest + FakeRepo | 🚀 Rápida | Medio (repo en memoria) |
| **Sistema** | El sistema completo desde la interfaz externa | Jest + Supertest | 🏃 Moderada | Mínimo (caja negra) |

### FakeRepository vs. Mock vs. BD Real

```
┌─────────────────┬──────────────────────────────────────┬──────────────┐
│ Estrategia      │ Descripción                          │ Cuándo usar  │
├─────────────────┼──────────────────────────────────────┼──────────────┤
│ FakeRepository  │ Implementación real en memoria (Map) │ Integración  │
│                 │ Comportamiento predecible y rápido   │ con datos    │
├─────────────────┼──────────────────────────────────────┼──────────────┤
│ Mock (jest.fn)  │ Simula el repositorio con funciones  │ Verificar    │
│                 │ controladas; verifica interacciones  │ interacciones│
├─────────────────┼──────────────────────────────────────┼──────────────┤
│ BD Real / H2    │ BD real o embebida; prueba persistencia│ Pre-producción│
│                 │ completa incluyendo SQL               │ / Staging    │
└─────────────────┴──────────────────────────────────────┴──────────────┘
```

### Pruebas de Sistema (caja negra)

Las pruebas de sistema validan el **comportamiento del sistema completo** desde su interfaz pública, sin importar la implementación interna.

En este proyecto: enviamos peticiones HTTP reales al servidor Express y validamos solo el **status code** y el **cuerpo de la respuesta**, igual que lo haría un cliente real.

```
Cliente HTTP        API REST              Application          Repository
(Supertest)    ──► POST /search  ──►  UserSearchService  ──►  FakeMovieRepository
                                          searchAndSave()         saveSearch()
               ◄── 200 { found:true } ◄─────────────────────────────────────────
```

---

## Arquitectura Limpia

El proyecto sigue los principios de **arquitectura limpia** (Clean Architecture), separando el código en capas con responsabilidades definidas:

```
┌─────────────────────────────────────────────────────────────┐
│  DELIVERY (inbound)                                          │
│  streamingApp.js → API REST Express (POST /search, etc.)    │
├─────────────────────────────────────────────────────────────┤
│  APPLICATION (casos de uso)                                  │
│  userSearchService.js → orquesta búsqueda + persistencia    │
│  Depende solo de abstracciones, no de implementaciones       │
├─────────────────────────────────────────────────────────────┤
│  DOMAIN (reglas de negocio)                                  │
│  searchService.js → normalización y búsqueda                │
│  recommendationService.js → algoritmo de compatibilidad     │
├─────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE (adaptadores)                                │
│  fakeMovieRepository.js → repo en memoria (tests)           │
│  [producción: podría ser MongoDB, PostgreSQL, etc.]         │
└─────────────────────────────────────────────────────────────┘
```

**Beneficio para las pruebas:** cada capa puede probarse independientemente. El `UserSearchService` no sabe si el repositorio es un Fake, un Mock o una BD real, solo conoce la interfaz (métodos `saveSearch`, `getSearchHistory`, etc.).

---

## Pruebas Unitarias

### Resumen (sprint anterior — 74 pruebas)

```
Test Suites: 3 passed, 3 total
Tests:       74 passed, 74 total
Snapshots:   0 total
Time:        0.572 s
```

Las pruebas unitarias verifican cada servicio de forma **completamente aislada**, usando mocks para todas las dependencias externas.

---

## Pruebas de Integración con FakeRepository

**Archivo:** `tests/integration/userSearchService.integration.test.js`

Las pruebas con `FakeMovieRepository` son el equivalente a las **pruebas con BD H2** del taller del profesor. El FakeRepository guarda datos en un `Map` en memoria, permitiendo verificar que la persistencia real funciona entre capas.

### FakeMovieRepository — Implementación

```javascript
// src/fakes/fakeMovieRepository.js
class FakeMovieRepository {
  constructor() {
    this._store = new Map(); // equivalente a la BD H2 en memoria
    this._callLog = [];      // log de interacciones (útil para verificaciones)
  }

  saveSearch(userId, query, results) {
    this._callLog.push({ method: 'saveSearch', args: { userId, query, results } });
    this._store.set(`${userId}:${query}`, { userId, query, results, timestamp: new Date().toISOString() });
    return true;
  }

  getSearchHistory(userId) {
    const history = [];
    for (const [, value] of this._store.entries()) {
      if (value.userId === userId) history.push(value);
    }
    return history;
  }

  // wasCalledWith(), callCount() → para verificar interacciones
}
```

### Ejemplos de Pruebas de Integración con FakeRepository

```javascript
// tests/integration/userSearchService.integration.test.js

describe('UserSearchService — Pruebas de Integración con FakeRepository', () => {
  let repo;
  let service;

  beforeEach(() => {
    repo = new FakeMovieRepository();     // Arrange: repo en memoria
    repo.clear();                          // Arrange: limpiar datos previos
    service = new UserSearchService(repo); // Arrange: inyectar dependencia
  });

  test('GIVEN usuario válido y película existente WHEN busca THEN retorna found=true y persiste en repo', () => {
    // Arrange
    const userId = 'user-001';
    const query = 'Narcos';

    // Act
    const result = service.searchAndSave(userId, query);

    // Assert — resultado de negocio
    expect(result.found).toBe(true);

    // Assert — persistencia real en el repositorio (integración)
    const history = repo.getSearchHistory(userId);
    expect(history).toHaveLength(1);
    expect(history[0].query).toBe('Narcos');
  });

  test('GIVEN mismo usuario busca dos veces WHEN se consulta historial THEN tiene dos entradas', () => {
    // Act
    service.searchAndSave('user-003', 'Narcos');
    service.searchAndSave('user-003', 'Encanto');

    // Assert — integración: ambas búsquedas se persisten
    const history = repo.getSearchHistory('user-003');
    expect(history).toHaveLength(2);
  });
});
```

### Casos de Integración Cubiertos con FakeRepository

| Caso | Resultado esperado | Verificación |
|------|--------------------|--------------|
| Búsqueda película existente | `found: true` + persiste en repo | `repo.getSearchHistory()` tiene 1 entrada |
| Búsqueda película inexistente | `found: false` + persiste en repo | historial tiene resultado con `results: []` |
| Usuario busca 2 veces | Historial con 2 entradas | `repo.getSearchHistory()` retorna 2 items |
| 2 usuarios buscan igual | Historiales independientes | cada usuario tiene su propio historial |
| userId nulo | Lanza error | repo no es llamado (`callCount('saveSearch') === 0`) |
| Query vacía | Retorna `found: false` sin persistir | `callCount('saveSearch') === 0` |
| Guardar preferencias | Persiste en repo y genera recomendaciones | `repo.getPreferences()` retorna prefs guardadas |
| Catálogo sin preferencias | Mensaje sugiere configurar preferencias | `userHasPreferences: false` |
| Catálogo con preferencias | Mensaje personalizado | `userHasPreferences: true` |

---

## Pruebas de Integración con Mocks

**Archivo:** `tests/integration/userSearchService.mock.integration.test.js`

Equivalente a `RegistryWithMockTest.java` del taller. Usamos `jest.fn()` para simular el repositorio y verificar las **interacciones exactas** entre el servicio y el repositorio.

### Analogía Jest Mocks ↔ Mockito

| Mockito (Java)                          | Jest (JavaScript)                               |
|-----------------------------------------|-------------------------------------------------|
| `mock(RegistryRepositoryPort.class)`    | `jest.fn()` / objeto con métodos `jest.fn()`    |
| `when(repo.existsById(7)).thenReturn(true)` | `mockRepo.existsById.mockReturnValue(true)` |
| `verify(repo).save(...)`                | `expect(mockRepo.save).toHaveBeenCalled()`      |
| `verify(repo, never()).save(...)`        | `expect(mockRepo.save).not.toHaveBeenCalled()`  |
| `when(repo.save(...)).thenThrow(...)`    | `mockRepo.save.mockImplementation(() => { throw new Error() })` |
| `mockReturnValueOnce()`                 | `mockRepo.fn.mockReturnValueOnce()`              |

### Ejemplos de Pruebas con Mocks

```javascript
// tests/integration/userSearchService.mock.integration.test.js

// Equivalente a: mock(RegistryRepositoryPort.class)
function createMockRepo() {
  return {
    saveSearch: jest.fn().mockReturnValue(true),
    getSearchHistory: jest.fn().mockReturnValue([]),
    savePreferences: jest.fn().mockReturnValue(true),
    getPreferences: jest.fn().mockReturnValue(null),
    hasPreferences: jest.fn().mockReturnValue(false),
  };
}

// verify(repo).saveSearch(...) de Mockito:
test('GIVEN búsqueda válida WHEN se ejecuta THEN saveSearch se invoca exactamente una vez', () => {
  service.searchAndSave('user-001', 'Narcos');

  expect(mockRepo.saveSearch).toHaveBeenCalledTimes(1);
  expect(mockRepo.saveSearch).toHaveBeenCalledWith('user-001', 'Narcos', expect.any(Array));
});

// verify(repo, never()).saveSearch(...) de Mockito:
test('GIVEN userId inválido WHEN busca THEN saveSearch NUNCA se invoca', () => {
  expect(() => service.searchAndSave(null, 'Narcos')).toThrow();
  expect(mockRepo.saveSearch).not.toHaveBeenCalled();
});

// when(repo.save(...)).thenThrow(...) de Mockito:
test('GIVEN repositorio lanza error WHEN busca THEN el error se propaga', () => {
  mockRepo.saveSearch.mockImplementation(() => {
    throw new Error('DB timeout');
  });
  expect(() => service.searchAndSave('user-err', 'Narcos')).toThrow('DB timeout');
});
```

---

## Pruebas de Sistema HTTP

**Archivo:** `tests/system/streamingApp.system.test.js`

Equivalente a `RegistryControllerIT.java` del taller. Usamos **Supertest** para enviar peticiones HTTP reales al servidor Express y validar respuestas como **caja negra**.

### API REST Expuesta

| Método | Endpoint            | Descripción                                    | Status posibles |
|--------|---------------------|------------------------------------------------|-----------------|
| POST   | `/search`           | Buscar película y guardar historial            | 200, 400, 500   |
| GET    | `/history/:userId`  | Historial de búsquedas del usuario             | 200, 400        |
| POST   | `/preferences`      | Guardar preferencias y recibir recomendaciones | 200, 400, 422   |
| GET    | `/catalog/:platform`| Catálogo de plataforma con contexto de usuario | 200, 404        |

### Ejemplos de Pruebas de Sistema

```javascript
// tests/system/streamingApp.system.test.js

// Prueba positiva — Registro exitoso (equivalente a shouldRegisterValidPerson)
test('GIVEN película existente WHEN hace POST /search THEN retorna 200 con found=true', async () => {
  const response = await request(app)
    .post('/search')
    .send({ userId: 'user-sys-001', query: 'Narcos' })
    .set('Content-Type', 'application/json');

  expect(response.status).toBe(200);
  expect(response.body.found).toBe(true);
});

// Prueba negativa — Entrada inválida → 400
test('GIVEN sin userId WHEN hace POST /search THEN retorna 400 Bad Request', async () => {
  const response = await request(app)
    .post('/search')
    .send({ query: 'Narcos' }) // userId faltante
    .set('Content-Type', 'application/json');

  expect(response.status).toBe(400);
  expect(response.body.error).toBeDefined();
});

// Prueba negativa — Datos incompletos → 422
test('GIVEN userId pero sin preferencias WHEN hace POST /preferences THEN retorna 422', async () => {
  const response = await request(app)
    .post('/preferences')
    .send({ userId: 'user-pref-002' }); // falta genres, platforms, etc.

  expect(response.status).toBe(422);
});

// Flujo completo end-to-end
test('GIVEN usuario nuevo WHEN completa flujo búsqueda→historial THEN sistema responde coherentemente', async () => {
  const userId = 'user-e2e-001';

  // Step 1: buscar
  const searchResp = await request(app).post('/search').send({ userId, query: 'Narcos' });
  expect(searchResp.status).toBe(200);
  expect(searchResp.body.found).toBe(true);

  // Step 2: verificar historial
  const histResp = await request(app).get(`/history/${userId}`);
  expect(histResp.status).toBe(200);
  expect(histResp.body.count).toBe(1);
  expect(histResp.body.history[0].query).toBe('Narcos');
});
```

---

## Matriz de Pruebas de Integración

| # | Caso | Entrada | Resultado Esperado | Tipo | Archivo de Test |
|---|------|---------|-------------------|------|-----------------|
| 1 | Búsqueda película existente | `userId="u1", query="Narcos"` | `found:true` + persiste en repo | FakeRepo | `userSearchService.integration.test.js` |
| 2 | Búsqueda película inexistente | `userId="u2", query="XYZ"` | `found:false` + persiste igual | FakeRepo | `userSearchService.integration.test.js` |
| 3 | Usuario busca 2 veces | 2 llamadas a `searchAndSave` | Historial con 2 entradas | FakeRepo | `userSearchService.integration.test.js` |
| 4 | 2 usuarios buscan la misma peli | `userId="A"` y `userId="B"` | Historiales independientes | FakeRepo | `userSearchService.integration.test.js` |
| 5 | userId nulo | `userId=null` | Lanza error, repo no se invoca | FakeRepo | `userSearchService.integration.test.js` |
| 6 | Query vacía | `query="   "` | `found:false`, sin persistir | FakeRepo | `userSearchService.integration.test.js` |
| 7 | Guardar preferencias | `{genres:["drama"]}` | Persiste y retorna recomendaciones | FakeRepo | `userSearchService.integration.test.js` |
| 8 | `saveSearch` invocado 1 vez | Búsqueda válida | `toHaveBeenCalledTimes(1)` | Mock (Jest) | `userSearchService.mock.integration.test.js` |
| 9 | `saveSearch` nunca invocado | `userId=null` | `not.toHaveBeenCalled()` | Mock (Jest) | `userSearchService.mock.integration.test.js` |
| 10 | Mock lanza error de BD | `saveSearch` lanza `Error("DB timeout")` | Error se propaga al llamador | Mock (Jest) | `userSearchService.mock.integration.test.js` |
| 11 | Mock retorna historial de 2 | `getSearchHistory` retorna 2 entries | Historial enriquecido con 2 items | Mock (Jest) | `userSearchService.mock.integration.test.js` |
| 12 | POST /search película válida | `{userId, query:"Narcos"}` | HTTP 200, `found:true` | Sistema HTTP | `streamingApp.system.test.js` |
| 13 | POST /search película inexistente | `{userId, query:"XYZ"}` | HTTP 200, `found:false` | Sistema HTTP | `streamingApp.system.test.js` |
| 14 | POST /search sin userId | `{query:"Narcos"}` | HTTP 400 | Sistema HTTP | `streamingApp.system.test.js` |
| 15 | POST /search userId numérico | `{userId:12345, query:"Narcos"}` | HTTP 400 | Sistema HTTP | `streamingApp.system.test.js` |
| 16 | POST /preferences sin prefs | `{userId:"u1"}` solo | HTTP 422 | Sistema HTTP | `streamingApp.system.test.js` |
| 17 | GET /catalog/plataforma inválida | `/catalog/xyz_invalida` | HTTP 404 | Sistema HTTP | `streamingApp.system.test.js` |
| 18 | Flujo búsqueda→historial | POST /search + GET /history | Count = 1 en historial | Sistema HTTP e2e | `streamingApp.system.test.js` |

---

## Cobertura de Pruebas

Reporte generado con `npm test` (`jest --coverage`):

```
---------------------------|---------|----------|---------|---------|
File                       | % Stmts | % Branch | % Funcs | % Lines |
---------------------------|---------|----------|---------|---------|
All files                  |  ≥ 80   |  ≥ 75    |  ≥ 80   |  ≥ 80   |
 data/                     |         |          |         |         |
  moviesDatabase.js        |     100 |      100 |     100 |     100 |
 services/                 |         |          |         |         |
  searchService.js         |     100 |       96 |     100 |     100 |
  recommendationService.js |     100 |    89.79 |     100 |     100 |
  userSearchService.js     |  ≥ 85   |  ≥ 80    |     100 |  ≥ 85   |
 fakes/                    |         |          |         |         |
  fakeMovieRepository.js   |  ≥ 90   |  ≥ 85    |     100 |  ≥ 90   |
 delivery/                 |         |          |         |         |
  streamingApp.js          |  ≥ 80   |  ≥ 75    |     100 |  ≥ 80   |
 mcp/                      |         |          |         |         |
  streamingMCP.js          |     100 |    93.75 |     100 |     100 |
---------------------------|---------|----------|---------|---------|
```

> El reporte visual interactivo se genera en `coverage/lcov-report/index.html` al ejecutar `npm test`.

---

## Gestión de Defectos

Ver archivo [`defectos.md`](./defectos.md) para el registro completo.

| ID | Tipo | Detectado | Estado |
|----|------|-----------|--------|
| DEF-001 | Integración | Query vacía persistía en repo | ✅ Cerrado |
| DEF-002 | Sistema HTTP | userId numérico retornaba 500 en lugar de 400 | ✅ Cerrado |
| DEF-003 | Integración MCP | `excludeTitles` no se pasaba al servicio de recomendación | ✅ Cerrado |

Los tres defectos fueron **detectados por las pruebas automatizadas** siguiendo el ciclo TDD: la prueba falló en RED → se corrigió el código → se verificó en GREEN.

---

## TDD y Patrones Aplicados

### Ciclo TDD (Red → Green → Refactor)

```
🔴 RED     → La prueba falla (defecto detectado)
🟢 GREEN   → Se corrige el código mínimo para pasar
🔵 REFACTOR → Se mejora el código sin romper las pruebas
```

**Ejemplo DEF-001:**
```
🔴 RED     → "GIVEN query vacía WHEN busca THEN saveSearch nunca se invoca" → FALLÓ
🟢 GREEN   → Se agregó !query.trim() al guard de validación
🔵 REFACTOR → Se simplificó la condición en una sola línea
```

### Patrón AAA (Arrange – Act – Assert)

```javascript
test('GIVEN usuario válido y película existente WHEN busca THEN persiste en repo', () => {
  // Arrange: preparar datos y contexto
  const userId = 'user-001';
  const query = 'Narcos';
  repo = new FakeMovieRepository();
  service = new UserSearchService(repo);

  // Act: ejecutar la función bajo prueba
  const result = service.searchAndSave(userId, query);

  // Assert: verificar resultado y efecto en el repositorio
  expect(result.found).toBe(true);
  expect(repo.getSearchHistory(userId)).toHaveLength(1);
});
```

### Framework Given-When-Then (BDD)

Todos los nombres de prueba siguen el formato:

```
GIVEN [estado inicial o contexto]
WHEN  [acción que se ejecuta]
THEN  [resultado o comportamiento esperado]
```

### Separación por tipo de prueba

| Archivo | Tipo | Convención |
|---------|------|------------|
| `*.test.js` en `tests/unit/` | Unitaria | Aislamiento total |
| `*.integration.test.js` | Integración | FakeRepo o Mocks |
| `*.system.test.js` | Sistema | HTTP / Supertest |

---

## CI/CD con GitHub Actions

El repositorio incluye un workflow en `.github/workflows/tests.yml` que ejecuta automáticamente las pruebas en cada push y pull request:

- Se ejecuta en **Node.js 18.x y 20.x**
- Corre **unitarias + integración + sistema** en secuencia
- Genera y sube el **reporte de cobertura** como artefacto
- Falla el build si alguna prueba no pasa o si la cobertura baja del umbral mínimo

```yaml
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
```

---

## Reflexión Técnica

### ¿Qué capas fueron más difíciles de probar y por qué?

La **capa de delivery (HTTP)** fue la más compleja, ya que requiere montar el servidor completo con sus dependencias, manejar peticiones asíncronas y validar códigos de estado además del cuerpo de respuesta. Fue necesario instalar `supertest` para hacer peticiones HTTP sin abrir un puerto real.

### ¿Qué beneficios tiene usar FakeRepository vs. Mocks?

El **FakeRepository** es más legible y permite verificar el estado real de los datos (cuántas entradas hay, qué se guardó). Los **Mocks** son más poderosos para verificar interacciones exactas (cuántas veces se llamó un método, con qué argumentos). Usamos ambos: FakeRepo para flujos completos y Mocks cuando nos importa el comportamiento, no el estado.

### ¿Cómo mejora el diseño de la arquitectura limpia las pruebas?

Al inyectar el repositorio como dependencia en `UserSearchService`, podemos reemplazarlo fácilmente por un FakeRepository en tests sin cambiar el código de producción. Esto es el **principio de inversión de dependencias** aplicado.

### ¿Qué aprendimos sobre CI/CD?

Que las pruebas de integración y sistema son más lentas que las unitarias (red de dependencias más grande), por lo que tiene sentido ejecutarlas en etapas: unitarias primero (rápidas), luego integración y sistema. Si las unitarias fallan, no es necesario esperar a las de sistema.

---

## Aseguramiento de Calidad

| Dimensión | Implementación |
|-----------|----------------|
| **Pruebas Unitarias** | 74 pruebas con Jest; cobertura 100% de statements |
| **Pruebas de Integración** | ~38 pruebas con FakeRepository y Mocks de Jest |
| **Pruebas de Sistema** | ~20 pruebas HTTP end-to-end con Supertest |
| **Gestión de Defectos** | 3 defectos registrados en `defectos.md` con evidencia |
| **TDD** | Ciclo Red-Green-Refactor aplicado en todos los sprints |
| **CI/CD** | GitHub Actions ejecuta pruebas en cada commit |

---

## Licencia

MIT — Proyecto académico para el curso Testing y Validación de Software.
Universidad de La Sabana — Maestría en Ingeniería de Software.
