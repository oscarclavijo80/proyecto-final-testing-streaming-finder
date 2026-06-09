# 🐛 Registro de Defectos — Streaming Finder
## Pruebas de Integración y Sistema

---

## Defecto #001

| Campo             | Descripción |
|-------------------|-------------|
| **ID**            | DEF-001 |
| **Tipo**          | Integración (Servicio + Repositorio) |
| **Detectado por** | Prueba: `GIVEN query vacía WHEN busca THEN saveSearch NUNCA se invoca` |
| **Archivo**       | `tests/integration/userSearchService.mock.integration.test.js` |
| **Estado**        | ✅ Cerrado |

### Caso probado
Verificar que `userSearchService.searchAndSave()` no persista en el repositorio cuando la consulta del usuario es una cadena vacía o solo espacios.

### Resultado esperado
`saveSearch` del repositorio **no debe ser invocado** cuando el query está vacío. El sistema debe retornar `found: false` de forma silenciosa.

### Resultado obtenido (antes de corregir)
El servicio llamaba a `saveSearch` aun con un query de solo espacios `"   "`, guardando una entrada vacía en el historial. El `trim()` se hacía **después** de la validación de nulidad pero **antes** del guard de cadena vacía.

```js
// ❌ Código con defecto (orden incorrecto):
if (!query || typeof query !== 'string') { ... }
const results = searchMovieByTitle(query); // ← aquí query podía ser "   "
this._repo.saveSearch(userId, query, results); // se persiste aunque no debería
```

### Causa probable
Condición de validación incompleta: se verificaba `!query` pero no `!query.trim()`, permitiendo que cadenas de solo espacios pasaran el guard.

### Corrección aplicada
```js
// ✅ Código corregido:
if (!query || typeof query !== 'string' || !query.trim()) {
  return { found: false, movies: [], message: 'Consulta vacía' };
}
```

### Evidencia
```
FAIL tests/integration/userSearchService.mock.integration.test.js
  ✕ GIVEN query vacía WHEN busca THEN saveSearch NUNCA se invoca

  expect(jest.fn()).not.toHaveBeenCalled()
  Expected number of calls: 0
  Received number of calls: 1
```

---

## Defecto #002

| Campo             | Descripción |
|-------------------|-------------|
| **ID**            | DEF-002 |
| **Tipo**          | Sistema (HTTP / caja negra) |
| **Detectado por** | Prueba: `GIVEN userId como número WHEN hace POST /search THEN retorna 400` |
| **Archivo**       | `tests/system/streamingApp.system.test.js` |
| **Estado**        | ✅ Cerrado |

### Caso probado
Enviar un `userId` de tipo numérico (ej: `12345`) en el body del `POST /search` y esperar un error 400.

### Resultado esperado
El endpoint debe retornar **HTTP 400** con un mensaje de error claro cuando `userId` no es un string.

### Resultado obtenido (antes de corregir)
El controlador no validaba el tipo de `userId`, lo aceptaba como válido y lo pasaba directamente al servicio que luego fallaba con un error 500 no controlado.

```js
// ❌ Controlador sin validación de tipo:
const { userId, query } = req.body;
if (!userId) { return res.status(400)... } // solo verifica falsiness, no tipo
```

### Causa probable
La validación en el controlador usaba `!userId` que es truthy para el número `12345`, sin verificar `typeof userId !== 'string'`.

### Corrección aplicada
```js
// ✅ Controlador corregido:
if (!userId || typeof userId !== 'string') {
  return res.status(400).json({ error: 'userId es requerido y debe ser string' });
}
```

### Evidencia
```
FAIL tests/system/streamingApp.system.test.js
  ✕ GIVEN userId como número WHEN hace POST /search THEN retorna 400

  expect(received).toBe(expected)
  Expected: 400
  Received: 500
```

---

## Defecto #003 (Defecto histórico — documentado del taller de pruebas unitarias)

| Campo             | Descripción |
|-------------------|-------------|
| **ID**            | DEF-003 |
| **Tipo**          | Integración (MCP + Servicio de recomendación) |
| **Detectado por** | Prueba unitaria: `GIVEN películas a excluir WHEN se solicitan recomendaciones THEN no incluye los excluidos` |
| **Archivo**       | `tests/unit/streamingMCP.test.js` (sprint anterior) |
| **Estado**        | ✅ Cerrado |

### Caso probado
Pasar `excludeTitles` al conector MCP y verificar que las recomendaciones retornadas no incluyan los títulos excluidos.

### Resultado esperado
`get_recommendations` en el MCP debe pasar `excludeTitles` al `recommendationService` correctamente.

### Resultado obtenido (antes de corregir)
El conector MCP no desestructuraba correctamente el parámetro `excludeTitles` del objeto `args`, lo pasaba como `undefined` al servicio, y por tanto los títulos que debían excluirse aparecían en las recomendaciones.

### Causa probable
Error en la desestructuración del objeto `args`:
```js
// ❌ Antes:
const { genres, platforms, limit } = args; // excludeTitles olvidado
getRecommendations({ genres, platforms, limit }); // excludeTitles = undefined
```

### Corrección aplicada
```js
// ✅ Después:
const { genres, platforms, country, language, minRating, excludeTitles, limit } = args;
getRecommendations({ genres, platforms, country, language, minRating, excludeTitles, limit });
```

### Ciclo TDD aplicado
```
🔴 RED     → Prueba "GIVEN películas a excluir..." falló
🟢 GREEN   → Se corrigió la desestructuración en streamingMCP.js
🔵 REFACTOR → Se simplificó la lógica eliminando bifurcación innecesaria
```

---

## Matriz de Defectos

| ID      | Tipo         | Detectado en          | Estado   | Impacto |
|---------|--------------|-----------------------|----------|---------|
| DEF-001 | Integración  | Mock Integration Test | ✅ Cerrado | Medio — historial inválido en BD |
| DEF-002 | Sistema HTTP | System Test (caja negra) | ✅ Cerrado | Alto — endpoint retornaba 500 |
| DEF-003 | Integración  | Unit Test (sprint anterior) | ✅ Cerrado | Alto — recomendaciones incorrectas |
