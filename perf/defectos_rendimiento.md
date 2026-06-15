# Registro de Defectos de Rendimiento – Streaming Finder

**Proyecto:** Streaming Finder (Node.js + MCP)
**Curso:** Testing y Validación de Software
**Maestría:** Ingeniería de Software – Universidad de La Sabana
**Fecha de ejecución:** 2025

---

## Defecto PERF-001

- **Caso de prueba:** Stress Test – 50 VUs concurrentes
- **Escenario:** stress
- **Entrada:** 50 usuarios virtuales realizando búsquedas y recomendaciones simultáneas
- **Resultado esperado:** p95 < 300 ms, tasa de error < 1%
- **Resultado obtenido:** p95 > 300 ms bajo carga de 50 VUs; el servidor single-thread de Node.js (`http.createServer`) no distribuye la carga eficientemente, acumulando cola de solicitudes en el event loop
- **Evidencia:**
  - Métrica p95 sube de ~18ms (baseline) a > 300ms con 50 VUs
  - La función `getRecommendations()` itera sobre toda la base de datos en cada request, con O(n) por búsqueda
  - CPU al 100% en el proceso Node.js (single-core)
- **Impacto:** SLO-1 (p95 < 300ms) se incumple bajo carga stress. En producción, un pico de usuarios degradaría la experiencia de búsqueda y recomendaciones.
- **Propuesta de mejora:**
  1. Implementar caché en memoria (e.g., `node-cache` o `Map` con TTL) para los resultados de búsqueda y recomendaciones frecuentes.
  2. Usar `cluster` de Node.js para aprovechar múltiples cores de CPU.
  3. Precalcular y cachear scores de compatibilidad al arrancar el servidor.
- **Estado:** Abierto

---

## Defecto PERF-002

- **Caso de prueba:** Spike Test – 100 VUs en 5 segundos
- **Escenario:** spike
- **Entrada:** Escalado abrupto de 5 a 100 usuarios virtuales en 5 segundos
- **Resultado esperado:** El sistema debe recuperarse en menos de 30 segundos y la tasa de error debe ser < 5% durante el pico
- **Resultado obtenido:** Durante los primeros 10-15 segundos del pico, la tasa de error supera el 5% (conexiones rechazadas/timeout). El servidor nativo HTTP de Node.js no tiene `backpressure` configurado; el límite de conexiones simultáneas por defecto (`maxConnections`) permite saturación.
- **Evidencia:**
  - Requests con `status: 0` (timeout o conexión rechazada) durante el pico máximo
  - `ECONNRESET` o `ETIMEDOUT` en el log del servidor durante el pico
  - Tiempo de recuperación > 20s después de bajar la carga
- **Impacto:** Usuarios reales ven errores 500 o tiempos de respuesta > 5s durante eventos de tráfico elevado (lanzamiento de nueva serie, trending en redes sociales).
- **Propuesta de mejora:**
  1. Configurar `server.maxConnections` y un queue de solicitudes pendientes.
  2. Implementar circuit breaker pattern para rechazar solicitudes cuando el sistema está saturado (respuesta 503 inmediata en lugar de timeout).
  3. Usar un balanceador de carga (nginx) frente al servidor Node.js.
- **Estado:** Abierto

---

## Defecto PERF-003

- **Caso de prueba:** Soak Test – 10 VUs durante 5 minutos
- **Escenario:** soak
- **Entrada:** 10 usuarios continuos durante 5 minutos
- **Resultado esperado:** Latencia estable durante toda la prueba (variación < 20%)
- **Resultado obtenido:** La latencia promedio del endpoint `/api/recommendations` aumenta progresivamente durante la prueba (de ~15ms en los primeros 30s a ~40ms al final de los 5 minutos), indicando acumulación de trabajo no liberado. El garbage collector de Node.js introduce pausas perceptibles (stop-the-world GC) a los 2-3 minutos.
- **Evidencia:**
  - Tendencia ascendente en las métricas de latencia promedio a lo largo del tiempo (observable en el reporte JSON con ventanas de tiempo)
  - Pausas ocasionales de 50-150ms en p99 que no ocurren en baseline
  - Uso de memoria del proceso Node.js crece de ~30MB a ~60MB durante la prueba
- **Impacto:** Degradación silenciosa del servicio en producción. Los SLA nocturnos (menor tráfico pero continuo) pueden verse afectados. Usuarios con sesiones largas (> 2 minutos) experimentan respuestas más lentas.
- **Propuesta de mejora:**
  1. Revisar referencias circulares o closures que retienen objetos en memoria en `recommendationService.js`.
  2. Implementar `--max-old-space-size` adecuado en el proceso Node.js.
  3. Usar `process.memoryUsage()` para exponer un endpoint de métricas internas y detectar fugas tempranamente.
  4. Considerar migrar la base de datos de películas a una estructura inmutable (`Object.freeze`) para evitar copias accidentales.
- **Estado:** En progreso

---

## Tabla de Resumen

| ID         | Escenario  | Entrada                   | Resultado Esperado               | Resultado Obtenido                          | Causa Probable                           | Estado      |
|------------|------------|---------------------------|----------------------------------|---------------------------------------------|------------------------------------------|-------------|
| PERF-001   | stress     | 50 VUs concurrentes       | p95 < 300ms, error < 1%          | p95 > 300ms, CPU 100% (single-thread)       | Sin caché, algoritmo O(n) en cada req    | Abierto     |
| PERF-002   | spike      | 100 VUs en 5s             | Error < 5% durante pico          | Error > 5%, timeouts y ECONNRESET           | Sin backpressure ni circuit breaker      | Abierto     |
| PERF-003   | soak       | 10 VUs durante 5min       | Latencia estable (< 20% variación) | Latencia crece +167% al final del soak     | Posible memory leak o presión de GC      | En progreso |

---

## Convenciones de Estado

- **Abierto** → El defecto aún no se corrige.
- **En progreso** → El defecto está siendo trabajado.
- **Resuelto** → El defecto fue corregido y validado con pruebas.
