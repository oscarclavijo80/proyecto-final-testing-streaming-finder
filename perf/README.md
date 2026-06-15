# 📊 Módulo de Pruebas de Carga y Rendimiento

**Proyecto:** Streaming Finder
**Tecnología base:** Node.js (sin framework externo)
**Herramienta principal:** Runner propio compatible con k6 + scripts k6 nativos
**Curso:** Testing y Validación de Software – Maestría en Ingeniería de Software

---

## 🏗 Arquitectura del módulo

```
perf/
├── scripts/
│   ├── streaming_k6.js       # Script k6 con todos los escenarios (requiere k6 instalado)
│   └── run_perf_tests.js     # Runner nativo Node.js (sin dependencias externas)
├── data/
│   └── search_dataset.json   # Dataset de búsquedas para los VUs
├── results/                  # Reportes JSON generados automáticamente
│   └── <scenario>_<date>.json
├── ci/
│   └── github-actions.yml    # Workflow CI/CD para GitHub Actions
└── defectos_rendimiento.md   # Registro oficial de defectos encontrados
```

El servidor HTTP que expone la API REST está en `src/server/app.js`.

---

## 🎯 SLO – Service Level Objectives

Los siguientes objetivos de nivel de servicio fueron definidos para este sistema, basados en el tipo de uso (búsquedas de entretenimiento, no crítico):

| SLO   | Descripción                     | Target   | Justificación |
|-------|---------------------------------|----------|---------------|
| SLO-1 | Latencia p95                    | < 300 ms | Estándar web moderno; Google recomienda < 200ms para Good CWV |
| SLO-2 | Tasa de errores HTTP            | < 1%     | Nivel de calidad mínimo aceptable para servicios de búsqueda |
| SLO-3 | Latencia p99                    | < 500 ms | Cubre casos outliers; usuarios lentos no deben esperar > 0.5s |
| SLO-4 | Disponibilidad                  | ≥ 99%    | Para una app de entretenimiento, es el mínimo esperado |

---

## 🧪 Tipos de Pruebas

### 1. Baseline Test
Establece la línea de referencia del sistema bajo mínima carga (1 VU, 30s).
Permite comparar el rendimiento "puro" contra escenarios de carga real.

### 2. Load Test
Simula la carga esperada en producción (10 VUs, 2min) con warm-up y cool-down progresivos.

### 3. Stress Test
Lleva el sistema más allá de su capacidad (hasta 50 VUs de forma incremental) para encontrar el punto de quiebre y determinar cuándo se empiezan a incumplir los SLO.

### 4. Spike Test
Simula un pico repentino de tráfico (de 5 a 100 VUs en 5 segundos), como ocurriría con una película trending o un evento mediático.

### 5. Soak Test
Carga sostenida (10 VUs, 5 minutos) para detectar degradación gradual, memory leaks o comportamiento anómalo en operación continua.

### 6. Regression Test
Verifica que los SLO se mantienen después de cambios en el código. Se ejecuta automáticamente en cada Pull Request.

---

## 🚀 Ejecución

### Prerrequisito: Levantar el servidor API

```bash
node src/server/app.js
# El servidor queda en http://127.0.0.1:3000
# Verificar: curl http://127.0.0.1:3000/health
```

### Opción A: Runner nativo Node.js (recomendado, sin dependencias)

```bash
# Escenario individual
node perf/scripts/run_perf_tests.js baseline
node perf/scripts/run_perf_tests.js load
node perf/scripts/run_perf_tests.js stress
node perf/scripts/run_perf_tests.js spike
node perf/scripts/run_perf_tests.js soak
node perf/scripts/run_perf_tests.js regression

# Todos los escenarios en secuencia
node perf/scripts/run_perf_tests.js all
```

### Opción B: k6 (requiere instalación de k6)

```bash
# Instalar k6: https://grafana.com/docs/k6/latest/set-up/install-k6/

k6 run perf/scripts/streaming_k6.js --env SCENARIO=baseline
k6 run perf/scripts/streaming_k6.js --env SCENARIO=load
k6 run perf/scripts/streaming_k6.js --env SCENARIO=stress
k6 run perf/scripts/streaming_k6.js --env SCENARIO=spike
k6 run perf/scripts/streaming_k6.js --env SCENARIO=soak
k6 run perf/scripts/streaming_k6.js --env SCENARIO=regression

# Con URL personalizada
k6 run perf/scripts/streaming_k6.js --env SCENARIO=load --env BASE_URL=http://mi-servidor:3000
```

---

## 📈 Métricas reportadas en cada escenario

| Métrica           | Descripción                                    |
|-------------------|------------------------------------------------|
| `avg`             | Latencia promedio                              |
| `med`             | Mediana (p50)                                  |
| `p90`             | Percentil 90                                   |
| `p95`             | Percentil 95 ← **principal métrica de SLO**    |
| `p99`             | Percentil 99                                   |
| `max`             | Máxima latencia observada                      |
| `throughput`      | Requests por segundo                           |
| `error_rate`      | Porcentaje de requests fallidos                |

Las métricas se desglosan también por grupo/endpoint:
- `health` – GET /health
- `search` – GET /api/movies/search
- `platform` – GET /api/movies/platform/:id
- `genre` – GET /api/movies/genre/:genre
- `recommendations` – POST /api/recommendations
- `platforms_list` – GET /api/platforms

---

## 🐛 Defectos de Rendimiento

Ver [`perf/defectos_rendimiento.md`](./defectos_rendimiento.md) para el registro completo.

Resumen de defectos identificados:

| ID       | Escenario | Descripción breve                            | Estado      |
|----------|-----------|----------------------------------------------|-------------|
| PERF-001 | stress    | p95 > 300ms bajo 50 VUs (sin caché)          | Abierto     |
| PERF-002 | spike     | Timeouts y errores durante pico de 100 VUs   | Abierto     |
| PERF-003 | soak      | Latencia crece +167% al final del soak test  | En progreso |

---

## 🔄 Integración CI/CD

El archivo `perf/ci/github-actions.yml` debe copiarse a `.github/workflows/perf-tests.yml` para activar:

- **En cada Push/PR**: Regression Test automático para verificar SLO
- **Manual**: Selección de cualquier escenario mediante `workflow_dispatch`
- **Artefactos**: Reportes JSON se guardan 30 días como artefactos del workflow

```bash
cp perf/ci/github-actions.yml .github/workflows/perf-tests.yml
```

---

## 📊 Interpretación de Resultados

### Escenario Baseline – Valores de referencia esperados
- Latencia avg: < 20ms (operaciones en memoria)
- p95: < 50ms
- Error rate: 0%

### Escenario Load – Valores aceptables
- Latencia avg: < 100ms
- p95: < 300ms ✅
- Error rate: < 1% ✅

### Cuellos de botella identificados
1. `recommendationService.getRecommendations()` – O(n) sin caché en cada request
2. Servidor HTTP single-thread – sin distribución de carga entre cores
3. Sin límite de conexiones concurrentes – riesgo de saturación en spike

### Propuestas de mejora
1. **Caché en memoria**: Cachear resultados de búsquedas frecuentes (TTL 5 min)
2. **Node.js Cluster**: Distribuir carga entre los cores disponibles del servidor
3. **Rate limiting**: Limitar requests por IP para proteger contra picos abusivos
4. **Precálculo de recomendaciones**: Calcular scores al iniciar, no en cada request

---

## 📚 Referencias

- [Grafana k6 Documentation](https://grafana.com/docs/k6/latest/)
- [Google SRE Book – Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [ISO/IEC 25010 – Performance Efficiency](https://iso25000.com/index.php/en/iso-25000-standards/iso-25010)
- [Web Vitals – Core Performance Metrics](https://web.dev/vitals/)
