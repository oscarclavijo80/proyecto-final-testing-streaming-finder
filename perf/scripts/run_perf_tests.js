/**
 * Streaming Finder - Runner de Pruebas de Rendimiento (Node.js nativo)
 * ======================================================================
 * Ejecuta todos los escenarios de prueba contra la API REST local
 * y genera reportes de métricas en /perf/results/
 *
 * Uso: node perf/scripts/run_perf_tests.js [SCENARIO]
 *   node perf/scripts/run_perf_tests.js baseline
 *   node perf/scripts/run_perf_tests.js load
 *   node perf/scripts/run_perf_tests.js stress
 *   node perf/scripts/run_perf_tests.js spike
 *   node perf/scripts/run_perf_tests.js soak
 *   node perf/scripts/run_perf_tests.js all
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────
// CONFIGURACIÓN GLOBAL
// ─────────────────────────────────────────────
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const RESULTS_DIR = path.join(__dirname, '..', 'results');

// SLO definidos para el sistema
const SLO = {
  p95_ms:      300,  // Latencia p95 < 300 ms
  p99_ms:      500,  // Latencia p99 < 500 ms
  error_rate:  0.01, // Tasa de errores < 1%
  availability: 0.99, // Disponibilidad >= 99%
};

// Dataset de búsquedas
const SEARCH_DATASET = [
  { title: 'Narcos',            platform: 'netflix', genre: 'drama' },
  { title: 'Encanto',           platform: 'disney',  genre: 'animacion' },
  { title: 'Succession',        platform: 'hbo',     genre: 'drama' },
  { title: 'The Boys',          platform: 'amazon',  genre: 'accion' },
  { title: 'Stranger Things',   platform: 'netflix', genre: 'terror' },
  { title: 'Avatar',            platform: 'disney',  genre: 'accion' },
  { title: 'Ozark',             platform: 'netflix', genre: 'drama' },
  { title: 'PeliculaInexistente', platform: 'netflix', genre: 'drama' },
];

// ─────────────────────────────────────────────
// DEFINICIÓN DE ESCENARIOS
// ─────────────────────────────────────────────
const SCENARIOS = {
  baseline: {
    name: 'Baseline Test',
    description: 'Comportamiento base con 1 usuario virtual durante 30 segundos. Establece la línea de referencia para comparación.',
    vus: 1,
    durationSec: 30,
    rampUp: 0,
    rampDown: 0,
  },
  load: {
    name: 'Load Test',
    description: 'Carga esperada de producción: 10 usuarios virtuales concurrentes durante 2 minutos con warm-up/cool-down.',
    vus: 10,
    durationSec: 120,
    rampUp: 30,
    rampDown: 30,
  },
  stress: {
    name: 'Stress Test',
    description: 'Más allá de la capacidad diseñada: hasta 50 VUs de forma progresiva para encontrar el punto de quiebre.',
    vus: 50,
    durationSec: 180,
    rampUp: 60,
    rampDown: 30,
  },
  spike: {
    name: 'Spike Test',
    description: 'Pico repentino: de 5 a 100 VUs en 5 segundos para simular un evento viral o falla de caché.',
    vus: 100,
    durationSec: 60,
    rampUp: 5,
    rampDown: 15,
  },
  soak: {
    name: 'Soak Test',
    description: 'Resistencia: 10 VUs constantes durante 5 minutos para detectar degradación acumulada o memory leaks.',
    vus: 10,
    durationSec: 300,
    rampUp: 0,
    rampDown: 0,
  },
  regression: {
    name: 'Regression Test',
    description: 'Verificación post-cambio: valida que los SLO siguen cumpliéndose después de modificaciones al código.',
    vus: 10,
    durationSec: 60,
    rampUp: 15,
    rampDown: 15,
  },
};

// ─────────────────────────────────────────────
// CLIENTE HTTP SIMPLE
// ─────────────────────────────────────────────
function makeRequest(method, urlStr, body = null) {
  return new Promise((resolve) => {
    const start = Date.now();
    const parsedUrl = new URL(urlStr);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: data,
          duration: Date.now() - start,
          ok: res.statusCode >= 200 && res.statusCode < 400,
        });
      });
    });

    req.on('error', () => {
      resolve({ status: 0, body: '', duration: Date.now() - start, ok: false, error: true });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, body: '', duration: Date.now() - start, ok: false, timeout: true });
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─────────────────────────────────────────────
// SECUENCIA DE REQUESTS POR VU
// ─────────────────────────────────────────────
async function executeVU(vuId) {
  const item = SEARCH_DATASET[Math.floor(Math.random() * SEARCH_DATASET.length)];
  const results = [];

  // 1. Health check
  results.push({
    group: 'health',
    ...(await makeRequest('GET', `${BASE_URL}/health`)),
  });

  // 2. Búsqueda de película
  results.push({
    group: 'search',
    ...(await makeRequest('GET', `${BASE_URL}/api/movies/search?title=${encodeURIComponent(item.title)}`)),
  });

  // 3. Catálogo por plataforma
  results.push({
    group: 'platform',
    ...(await makeRequest('GET', `${BASE_URL}/api/movies/platform/${item.platform}`)),
  });

  // 4. Búsqueda por género
  results.push({
    group: 'genre',
    ...(await makeRequest('GET', `${BASE_URL}/api/movies/genre/${encodeURIComponent(item.genre)}`)),
  });

  // 5. Recomendaciones
  results.push({
    group: 'recommendations',
    ...(await makeRequest('POST', `${BASE_URL}/api/recommendations`, {
      genres: [item.genre, 'drama'],
      platforms: [item.platform, 'netflix'],
      country: 'CO',
      language: 'es',
      minRating: 7.5,
      limit: 5,
    })),
  });

  // 6. Lista de plataformas
  results.push({
    group: 'platforms_list',
    ...(await makeRequest('GET', `${BASE_URL}/api/platforms`)),
  });

  return results;
}

// ─────────────────────────────────────────────
// CÁLCULO DE PERCENTILES
// ─────────────────────────────────────────────
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function calcMetrics(durations) {
  if (durations.length === 0) return {};
  const sum = durations.reduce((a, b) => a + b, 0);
  return {
    count: durations.length,
    avg:   sum / durations.length,
    min:   Math.min(...durations),
    max:   Math.max(...durations),
    med:   percentile(durations, 50),
    p90:   percentile(durations, 90),
    p95:   percentile(durations, 95),
    p99:   percentile(durations, 99),
  };
}

// ─────────────────────────────────────────────
// EXECUTOR DE ESCENARIO
// ─────────────────────────────────────────────
async function runScenario(scenarioName) {
  const scenario = SCENARIOS[scenarioName];
  if (!scenario) {
    console.error(`❌ Escenario '${scenarioName}' no existe. Opciones: ${Object.keys(SCENARIOS).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  🚀 ${scenario.name}`);
  console.log(`  ${scenario.description}`);
  console.log(`  VUs máx: ${scenario.vus} | Duración: ${scenario.durationSec}s`);
  console.log(`${'═'.repeat(60)}\n`);

  const allDurations = [];
  const byGroup = {};
  let totalRequests = 0;
  let failedRequestsCount = 0;

  const startTime = Date.now();
  const endTime = startTime + scenario.durationSec * 1000;

  // Calcula VUs activos según tiempo transcurrido (ramping simplificado)
  function activeVUs(elapsed) {
    const total = scenario.durationSec * 1000;
    const rampUpMs = scenario.rampUp * 1000;
    const rampDownMs = scenario.rampDown * 1000;

    if (elapsed < rampUpMs) {
      return Math.max(1, Math.ceil((elapsed / rampUpMs) * scenario.vus));
    }
    if (elapsed > total - rampDownMs) {
      const remaining = total - elapsed;
      return Math.max(1, Math.ceil((remaining / rampDownMs) * scenario.vus));
    }
    return scenario.vus;
  }

  let iteration = 0;
  while (Date.now() < endTime) {
    const elapsed = Date.now() - startTime;
    const vus = activeVUs(elapsed);

    process.stdout.write(`\r  ⏳ ${Math.floor(elapsed / 1000)}s | VUs: ${vus} | Req: ${totalRequests} | Errores: ${failedRequestsCount}   `);

    const promises = Array.from({ length: Math.min(vus, 20) }, (_, i) => executeVU(i));
    const results = await Promise.all(promises);

    for (const vuResults of results) {
      for (const r of vuResults) {
        totalRequests++;
        allDurations.push(r.duration);

        if (!byGroup[r.group]) byGroup[r.group] = { durations: [], errors: 0 };
        byGroup[r.group].durations.push(r.duration);

        if (!r.ok) {
          failedRequestsCount++;
          byGroup[r.group].errors++;
        }
      }
    }

    iteration++;
    await new Promise(r => setTimeout(r, 200));
  }

  const elapsed = Date.now() - startTime;
  console.log(`\n\n  ✅ Escenario completado en ${(elapsed / 1000).toFixed(1)}s\n`);

  // ── Cálculo de métricas globales ───
  const globalMetrics = calcMetrics(allDurations);
  const errorRate = failedRequestsCount / totalRequests;
  const throughput = totalRequests / (elapsed / 1000);

  // ── Métricas por grupo ─────────────
  const groupMetrics = {};
  for (const [group, data] of Object.entries(byGroup)) {
    groupMetrics[group] = {
      ...calcMetrics(data.durations),
      errors: data.errors,
      errorRate: data.errors / data.durations.length,
    };
  }

  // ── Validación de SLO ──────────────
  const sloResults = {
    'SLO-1: p95 < 300ms':        { target: `p95 < ${SLO.p95_ms}ms`, value: `${globalMetrics.p95?.toFixed(1)}ms`, pass: globalMetrics.p95 < SLO.p95_ms },
    'SLO-2: Error rate < 1%':    { target: '< 1%', value: `${(errorRate * 100).toFixed(2)}%`, pass: errorRate < SLO.error_rate },
    'SLO-3: p99 < 500ms':        { target: `p99 < ${SLO.p99_ms}ms`, value: `${globalMetrics.p99?.toFixed(1)}ms`, pass: globalMetrics.p99 < SLO.p99_ms },
    'SLO-4: Disponibilidad >= 99%': { target: '>= 99%', value: `${((1 - errorRate) * 100).toFixed(2)}%`, pass: (1 - errorRate) >= SLO.availability },
  };

  // ── Resultado final ────────────────
  const report = {
    scenario: scenarioName,
    scenarioConfig: scenario,
    executedAt: new Date().toISOString(),
    durationActual: elapsed,
    summary: {
      totalRequests,
      failedRequests: failedRequestsCount,
      errorRate,
      throughput,
    },
    latency: globalMetrics,
    byGroup: groupMetrics,
    slo: sloResults,
    sloAllPassed: Object.values(sloResults).every(s => s.pass),
  };

  // ── Guardar reporte ────────────────
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const reportPath = path.join(RESULTS_DIR, `${scenarioName}_${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // ── Imprimir resumen ───────────────
  printReport(report);
  console.log(`  💾 Reporte guardado: ${reportPath}\n`);

  return report;
}

// ─────────────────────────────────────────────
// IMPRESIÓN DEL REPORTE
// ─────────────────────────────────────────────
function printReport(report) {
  const m = report.latency;
  const s = report.summary;
  const slo = report.slo;

  console.log(`${'─'.repeat(60)}`);
  console.log(`  📈 MÉTRICAS PRINCIPALES`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`  Total requests    : ${s.totalRequests}`);
  console.log(`  Throughput        : ${s.throughput.toFixed(2)} req/s`);
  console.log(`  Tasa de errores   : ${(s.errorRate * 100).toFixed(2)}%`);
  console.log('');
  console.log(`  ⏱  LATENCIA (ms)`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`  Promedio          : ${m.avg?.toFixed(2)} ms`);
  console.log(`  Mediana (p50)     : ${m.med?.toFixed(2)} ms`);
  console.log(`  p90               : ${m.p90?.toFixed(2)} ms`);
  console.log(`  p95               : ${m.p95?.toFixed(2)} ms`);
  console.log(`  p99               : ${m.p99?.toFixed(2)} ms`);
  console.log(`  Mínimo            : ${m.min} ms`);
  console.log(`  Máximo            : ${m.max} ms`);
  console.log('');
  console.log(`  🎯 VALIDACIÓN DE SLO`);
  console.log(`${'─'.repeat(60)}`);
  for (const [name, result] of Object.entries(slo)) {
    const icon = result.pass ? '✅' : '❌';
    console.log(`  ${icon} ${name}`);
    console.log(`     Target: ${result.target} | Valor: ${result.value}`);
  }
  console.log('');
  console.log(`  📊 MÉTRICAS POR ENDPOINT`);
  console.log(`${'─'.repeat(60)}`);
  for (const [group, metrics] of Object.entries(report.byGroup)) {
    const errPct = (metrics.errorRate * 100).toFixed(1);
    console.log(`  ${group.padEnd(20)} avg=${metrics.avg?.toFixed(0)}ms  p95=${metrics.p95?.toFixed(0)}ms  err=${errPct}%`);
  }
  console.log('');
  const allOk = report.sloAllPassed;
  console.log(`  ${allOk ? '🟢 TODOS LOS SLO CUMPLIDOS' : '🔴 ALGÚN SLO INCUMPLIDO – Revisar defectos'}`);
}

// ─────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────
async function main() {
  const scenario = process.argv[2] || 'load';

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  🎬 STREAMING FINDER – Pruebas de Carga y Rendimiento    ║');
  console.log('║  Tecnología: Node.js | Framework: http nativo             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  if (scenario === 'all') {
    const reports = [];
    for (const name of Object.keys(SCENARIOS)) {
      try {
        const r = await runScenario(name);
        reports.push(r);
      } catch (e) {
        console.error(`Error en escenario ${name}:`, e.message);
      }
      // Pausa entre escenarios
      await new Promise(r => setTimeout(r, 3000));
    }
    generateComparativeReport(reports);
  } else {
    await runScenario(scenario);
  }
}

function generateComparativeReport(reports) {
  console.log('\n' + '═'.repeat(60));
  console.log('  📊 REPORTE COMPARATIVO – TODOS LOS ESCENARIOS');
  console.log('═'.repeat(60));
  console.log('');
  console.log('  Escenario          | p95 (ms) | p99 (ms) | Err%  | req/s | SLOs');
  console.log('  ' + '─'.repeat(72));
  for (const r of reports) {
    const name   = r.scenario.padEnd(18);
    const p95    = r.latency.p95?.toFixed(0).padStart(8) ?? 'N/A';
    const p99    = r.latency.p99?.toFixed(0).padStart(8) ?? 'N/A';
    const err    = (r.summary.errorRate * 100).toFixed(2).padStart(5);
    const rps    = r.summary.throughput.toFixed(2).padStart(5);
    const slos   = r.sloAllPassed ? '✅' : '❌';
    console.log(`  ${name}| ${p95}  | ${p99}  | ${err}% | ${rps} | ${slos}`);
  }
  console.log('');

  const compPath = path.join(RESULTS_DIR, `comparative_${new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)}.json`);
  fs.writeFileSync(compPath, JSON.stringify(reports, null, 2));
  console.log(`  💾 Reporte comparativo guardado: ${compPath}`);
}

main().catch(console.error);
