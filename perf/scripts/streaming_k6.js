/**
 * Streaming Finder - Pruebas de Carga y Rendimiento con k6
 * =========================================================
 * Autor: Oscar Clavijo
 * Curso: Testing y Validación de Software
 * Maestría en Ingeniería de Software – Universidad de La Sabana
 *
 * Escenarios implementados:
 *   - baseline   → Comportamiento bajo carga mínima (1 VU, 30s)
 *   - load       → Carga esperada de producción (10 VUs, 2min)
 *   - stress     → Más allá de la capacidad diseñada (50 VUs, 3min)
 *   - spike      → Pico repentino de tráfico (0→100 VUs en segundos)
 *   - soak       → Carga sostenida en el tiempo (10 VUs, 5min)
 *   - regression → Verificación de SLO post-cambio (10 VUs, 1min)
 *
 * Uso:
 *   k6 run perf/scripts/streaming_k6.js --env SCENARIO=baseline
 *   k6 run perf/scripts/streaming_k6.js --env SCENARIO=load
 *   k6 run perf/scripts/streaming_k6.js --env SCENARIO=stress
 *   k6 run perf/scripts/streaming_k6.js --env SCENARIO=spike
 *   k6 run perf/scripts/streaming_k6.js --env SCENARIO=soak
 *   k6 run perf/scripts/streaming_k6.js --env SCENARIO=regression
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// ─────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3000';
const SCENARIO = __ENV.SCENARIO || 'load';

// Métricas personalizadas
const errorRate       = new Rate('custom_error_rate');
const searchDuration  = new Trend('search_duration_ms', true);
const recomDuration   = new Trend('recommendations_duration_ms', true);
const platformDuration= new Trend('platform_catalog_duration_ms', true);
const failedRequests  = new Counter('failed_requests_total');

// Dataset compartido
const searchDataset = new SharedArray('searchDataset', function () {
  return JSON.parse(open('../data/search_dataset.json'));
});

// ─────────────────────────────────────────────
// DEFINICIÓN DE ESCENARIOS
// ─────────────────────────────────────────────
const SCENARIOS = {
  baseline: {
    executor: 'constant-vus',
    vus: 1,
    duration: '30s',
  },

  load: {
    executor: 'ramping-vus',
    stages: [
      { duration: '30s', target: 10 }, // warm-up
      { duration: '1m',  target: 10 }, // carga sostenida
      { duration: '30s', target: 0  }, // cool-down
    ],
  },

  stress: {
    executor: 'ramping-vus',
    stages: [
      { duration: '30s', target: 10 },
      { duration: '30s', target: 25 },
      { duration: '30s', target: 50 },
      { duration: '1m',  target: 50 }, // carga pico sostenida
      { duration: '30s', target: 0  },
    ],
  },

  spike: {
    executor: 'ramping-vus',
    stages: [
      { duration: '10s', target: 5  },  // base
      { duration: '5s',  target: 100 }, // pico repentino
      { duration: '20s', target: 100 }, // mantener pico
      { duration: '10s', target: 5  },  // recuperación
      { duration: '15s', target: 0  },  // cierre
    ],
  },

  soak: {
    executor: 'constant-vus',
    vus: 10,
    duration: '5m',
  },

  regression: {
    executor: 'ramping-vus',
    stages: [
      { duration: '15s', target: 10 },
      { duration: '45s', target: 10 },
      { duration: '15s', target: 0  },
    ],
  },
};

// ─────────────────────────────────────────────
// SLO (Service Level Objectives)
// ─────────────────────────────────────────────
// SLO-1: p95 de latencia < 300ms
// SLO-2: Tasa de error < 1%
// SLO-3: p99 < 500ms
const THRESHOLDS = {
  http_req_duration:            ['p(95)<300', 'p(99)<500'],
  http_req_failed:              ['rate<0.01'],
  custom_error_rate:            ['rate<0.01'],
  search_duration_ms:           ['p(95)<300'],
  recommendations_duration_ms:  ['p(95)<400'],
  platform_catalog_duration_ms: ['p(95)<200'],
};

// ─────────────────────────────────────────────
// CONFIGURACIÓN EXPORTADA PARA k6
// ─────────────────────────────────────────────
export const options = {
  scenarios: {
    streaming_test: SCENARIOS[SCENARIO] || SCENARIOS.load,
  },
  thresholds: THRESHOLDS,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// ─────────────────────────────────────────────
// FUNCIONES AUXILIARES
// ─────────────────────────────────────────────
function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function recordMetric(trend, res) {
  trend.add(res.timings.duration);
  const isOk = res.status >= 200 && res.status < 400;
  errorRate.add(!isOk);
  if (!isOk) failedRequests.add(1);
  return isOk;
}

// ─────────────────────────────────────────────
// FUNCIÓN PRINCIPAL DE VU
// ─────────────────────────────────────────────
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  const item = randomFrom(searchDataset);

  // ── 1. Health check ─────────────────────────
  group('Health Check', function () {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      'health: status 200': (r) => r.status === 200,
      'health: body tiene status ok': (r) => {
        try { return JSON.parse(r.body).status === 'ok'; } catch { return false; }
      },
    });
  });

  sleep(0.1);

  // ── 2. Búsqueda de película ──────────────────
  group('Búsqueda de Película', function () {
    const res = http.get(`${BASE_URL}/api/movies/search?title=${encodeURIComponent(item.title)}`, { headers });
    const ok = recordMetric(searchDuration, res);
    check(res, {
      'search: status 200': (r) => r.status === 200,
      'search: tiene count': (r) => {
        try { return typeof JSON.parse(r.body).count === 'number'; } catch { return false; }
      },
      'search: tiene results': (r) => {
        try { return Array.isArray(JSON.parse(r.body).results); } catch { return false; }
      },
      'search: latencia < 300ms': (r) => r.timings.duration < 300,
    });
  });

  sleep(0.2);

  // ── 3. Catálogo por plataforma ───────────────
  group('Catálogo por Plataforma', function () {
    const res = http.get(`${BASE_URL}/api/movies/platform/${item.platform}`, { headers });
    recordMetric(platformDuration, res);
    check(res, {
      'platform: status 200 o 404': (r) => r.status === 200 || r.status === 404,
      'platform: latencia < 200ms': (r) => r.timings.duration < 200,
    });
  });

  sleep(0.1);

  // ── 4. Búsqueda por género ───────────────────
  group('Búsqueda por Género', function () {
    const res = http.get(`${BASE_URL}/api/movies/genre/${encodeURIComponent(item.genre)}`, { headers });
    check(res, {
      'genre: status 200': (r) => r.status === 200,
      'genre: tiene movies': (r) => {
        try { return Array.isArray(JSON.parse(r.body).movies); } catch { return false; }
      },
    });
  });

  sleep(0.2);

  // ── 5. Recomendaciones personalizadas ────────
  group('Recomendaciones Personalizadas', function () {
    const payload = JSON.stringify({
      genres: [item.genre, 'drama'],
      platforms: [item.platform, 'netflix'],
      country: 'CO',
      language: 'es',
      minRating: 7.5,
      excludeTitles: [],
      limit: 5,
    });
    const res = http.post(`${BASE_URL}/api/recommendations`, payload, { headers });
    recordMetric(recomDuration, res);
    check(res, {
      'recs: status 200': (r) => r.status === 200,
      'recs: tiene recommendations': (r) => {
        try { return Array.isArray(JSON.parse(r.body).recommendations); } catch { return false; }
      },
      'recs: latencia < 400ms': (r) => r.timings.duration < 400,
    });
  });

  sleep(0.3);

  // ── 6. Lista de plataformas ──────────────────
  group('Lista de Plataformas', function () {
    const res = http.get(`${BASE_URL}/api/platforms`, { headers });
    check(res, {
      'platforms: status 200': (r) => r.status === 200,
      'platforms: 4 plataformas': (r) => {
        try { return JSON.parse(r.body).platforms.length === 4; } catch { return false; }
      },
    });
  });

  sleep(0.5);
}

// ─────────────────────────────────────────────
// REPORTE FINAL PERSONALIZADO
// ─────────────────────────────────────────────
export function handleSummary(data) {
  const now = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `perf/results/${SCENARIO}_${now}.json`;

  return {
    [filename]: JSON.stringify(data, null, 2),
    stdout: buildTextSummary(data),
  };
}

function buildTextSummary(data) {
  const m = data.metrics;
  const dur = m.http_req_duration;
  const fails = m.http_req_failed;
  const reqs = m.http_reqs;

  const lines = [
    '',
    '═══════════════════════════════════════════════════════════',
    `  📊 STREAMING FINDER – Reporte de Rendimiento`,
    `  Escenario: ${SCENARIO.toUpperCase()}`,
    `  Fecha    : ${new Date().toISOString()}`,
    '═══════════════════════════════════════════════════════════',
    '',
    '  📈 MÉTRICAS PRINCIPALES',
    '  ─────────────────────────────────────────────',
    `  Total requests     : ${reqs ? reqs.values.count : 'N/A'}`,
    `  Throughput         : ${reqs ? reqs.values.rate.toFixed(2) : 'N/A'} req/s`,
    `  Tasa de errores    : ${fails ? (fails.values.rate * 100).toFixed(2) : 'N/A'}%`,
    '',
    '  ⏱  LATENCIA (ms)',
    '  ─────────────────────────────────────────────',
    `  Promedio           : ${dur ? dur.values.avg.toFixed(2) : 'N/A'} ms`,
    `  Mediana (p50)      : ${dur ? dur.values.med.toFixed(2) : 'N/A'} ms`,
    `  p90                : ${dur ? dur.values['p(90)'].toFixed(2) : 'N/A'} ms`,
    `  p95                : ${dur ? dur.values['p(95)'].toFixed(2) : 'N/A'} ms  ${dur && dur.values['p(95)'] < 300 ? '✅' : '❌'} (SLO: <300ms)`,
    `  p99                : ${dur ? dur.values['p(99)'].toFixed(2) : 'N/A'} ms  ${dur && dur.values['p(99)'] < 500 ? '✅' : '❌'} (SLO: <500ms)`,
    `  Máximo             : ${dur ? dur.values.max.toFixed(2) : 'N/A'} ms`,
    '',
    '  🎯 VALIDACIÓN DE SLO',
    '  ─────────────────────────────────────────────',
    `  SLO-1 p95 < 300ms  : ${dur && dur.values['p(95)'] < 300 ? '✅ CUMPLIDO' : '❌ INCUMPLIDO'}`,
    `  SLO-2 Error < 1%   : ${fails && fails.values.rate < 0.01 ? '✅ CUMPLIDO' : '❌ INCUMPLIDO'}`,
    `  SLO-3 p99 < 500ms  : ${dur && dur.values['p(99)'] < 500 ? '✅ CUMPLIDO' : '❌ INCUMPLIDO'}`,
    '',
    '═══════════════════════════════════════════════════════════',
    '',
  ];

  return lines.join('\n');
}
