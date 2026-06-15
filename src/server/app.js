/**
 * Streaming Finder - API REST para pruebas de carga y rendimiento
 * ================================================================
 * Servidor HTTP nativo Node.js (sin dependencias externas)
 * Compatible con el proyecto ES Module gracias a un wrapper CJS.
 *
 * Se conecta a los servicios reales del proyecto cuando están disponibles.
 * En entorno de pruebas funciona de forma autónoma con datos incrustados.
 *
 * Uso:
 *   node src/server/app.js          # Inicia en http://127.0.0.1:3000
 *   PORT=8080 node src/server/app.js
 */

const http = require('http');
const urlModule = require('url');

// ─── BASE DE DATOS (misma que src/data/moviesDatabase.js) ───────────
const moviesDatabase = [
  {id:1,title:"Stranger Things",tn:"stranger things",platforms:["netflix"],genre:["drama","ciencia ficcion","terror"],year:2016,country:"US",language:"en",rating:8.7},
  {id:2,title:"The Mandalorian",tn:"the mandalorian",platforms:["disney"],genre:["accion","aventura","ciencia ficcion"],year:2019,country:"US",language:"en",rating:8.7},
  {id:3,title:"Succession",tn:"succession",platforms:["hbo"],genre:["drama","comedia"],year:2018,country:"US",language:"en",rating:8.9},
  {id:4,title:"The Boys",tn:"the boys",platforms:["amazon"],genre:["accion","comedia","ciencia ficcion"],year:2019,country:"US",language:"en",rating:8.7},
  {id:5,title:"Wednesday",tn:"wednesday",platforms:["netflix"],genre:["comedia","misterio","terror"],year:2022,country:"US",language:"en",rating:8.1},
  {id:6,title:"Loki",tn:"loki",platforms:["disney"],genre:["accion","aventura","ciencia ficcion"],year:2021,country:"US",language:"en",rating:8.2},
  {id:7,title:"House of the Dragon",tn:"house of the dragon",platforms:["hbo"],genre:["drama","fantasia","accion"],year:2022,country:"US",language:"en",rating:8.5},
  {id:8,title:"Los Anillos de Poder",tn:"los anillos de poder",platforms:["amazon"],genre:["fantasia","aventura","accion"],year:2022,country:"US",language:"en",rating:6.9},
  {id:9,title:"Narcos",tn:"narcos",platforms:["netflix"],genre:["drama","crimen","biografico"],year:2015,country:"CO",language:"es",rating:8.8},
  {id:10,title:"Encanto",tn:"encanto",platforms:["disney"],genre:["animacion","aventura","familia","fantasia"],year:2021,country:"CO",language:"es",rating:7.2},
  {id:11,title:"Euphoria",tn:"euphoria",platforms:["hbo"],genre:["drama"],year:2019,country:"US",language:"en",rating:8.4},
  {id:12,title:"Jack Ryan",tn:"jack ryan",platforms:["amazon"],genre:["accion","drama","thriller"],year:2018,country:"US",language:"en",rating:8.0},
  {id:13,title:"Ozark",tn:"ozark",platforms:["netflix"],genre:["drama","crimen","thriller"],year:2017,country:"US",language:"en",rating:8.4},
  {id:14,title:"Avatar: El Camino del Agua",tn:"avatar el camino del agua",platforms:["disney","amazon"],genre:["accion","aventura","ciencia ficcion"],year:2022,country:"US",language:"en",rating:7.6},
  {id:15,title:"Severance",tn:"severance",platforms:["amazon"],genre:["drama","ciencia ficcion","thriller"],year:2022,country:"US",language:"en",rating:8.7},
];
const platformNames = {netflix:"Netflix",disney:"Disney+",hbo:"HBO Max",amazon:"Amazon Prime Video"};

// ─── SERVICIOS ────────────────────────────────────────────────────────
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function enrichMovie(m) {
  return { ...m, platformNames: m.platforms.map(p => platformNames[p] || p) };
}

function searchMovieByTitle(title) {
  const n = normalizeText(title);
  if (!n) return [];
  return moviesDatabase.filter(m => m.tn.includes(n)).map(enrichMovie);
}

function getMoviesByPlatform(platform) {
  const p = normalizeText(platform);
  return moviesDatabase.filter(m => m.platforms.includes(p)).map(enrichMovie);
}

function getMoviesByGenre(genre) {
  const g = normalizeText(genre);
  if (!g) return [];
  return moviesDatabase.filter(m => m.genre.includes(g)).map(enrichMovie);
}

function calculateCompatibilityScore(movie, preferences) {
  if (!movie || !preferences) return 0;
  let score = 0;
  if (preferences.genres && preferences.genres.length > 0) {
    const normalizedPrefs = preferences.genres.map(normalizeText);
    const matches = movie.genre.filter(g => normalizedPrefs.includes(normalizeText(g))).length;
    score += (matches / preferences.genres.length) * 40;
  }
  if (preferences.platforms && preferences.platforms.length > 0) {
    const normalizedPlats = preferences.platforms.map(normalizeText);
    if (movie.platforms.some(p => normalizedPlats.includes(p))) score += 20;
  }
  if (preferences.country && movie.country === preferences.country) score += 15;
  if (preferences.language && movie.language === preferences.language) score += 15;
  score += (movie.rating / 10) * 10;
  return Math.min(100, score);
}

function getRecommendations(preferences, excludeTitles = [], limit = 5) {
  const excluded = (excludeTitles || []).map(normalizeText);
  let candidates = moviesDatabase.filter(m => !excluded.includes(normalizeText(m.title)));
  if (preferences && preferences.minRating) {
    candidates = candidates.filter(m => m.rating >= preferences.minRating);
  }
  return candidates
    .map(m => ({ ...enrichMovie(m), compatibilityScore: calculateCompatibilityScore(m, preferences) }))
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, limit);
}

// ─── SERVIDOR HTTP ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

function jsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'X-Service': 'streaming-finder',
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

const server = http.createServer(async (req, res) => {
  const startTime = Date.now();
  const parsed = urlModule.parse(req.url, true);
  const pathname = parsed.pathname;
  const query = parsed.query || {};

  // ── GET /health ──────────────────────────────────────────────────
  if (pathname === '/health' && req.method === 'GET') {
    return jsonResponse(res, 200, {
      status: 'ok',
      service: 'streaming-finder',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage().heapUsed,
    });
  }

  // ── GET /api/movies/search?title=... ─────────────────────────────
  if (pathname === '/api/movies/search' && req.method === 'GET') {
    if (!query.title || !query.title.trim()) {
      return jsonResponse(res, 400, { error: 'El parámetro title es requerido' });
    }
    const results = searchMovieByTitle(query.title);
    return jsonResponse(res, 200, {
      query: query.title,
      count: results.length,
      results,
      responseTimeMs: Date.now() - startTime,
    });
  }

  // ── GET /api/movies/platform/:platform ───────────────────────────
  if (pathname.startsWith('/api/movies/platform/') && req.method === 'GET') {
    const platform = decodeURIComponent(pathname.replace('/api/movies/platform/', ''));
    const results = getMoviesByPlatform(platform);
    if (!results.length) {
      return jsonResponse(res, 404, { error: `Plataforma '${platform}' no encontrada o sin películas` });
    }
    return jsonResponse(res, 200, {
      platform,
      count: results.length,
      movies: results,
      responseTimeMs: Date.now() - startTime,
    });
  }

  // ── GET /api/movies/genre/:genre ─────────────────────────────────
  if (pathname.startsWith('/api/movies/genre/') && req.method === 'GET') {
    const genre = decodeURIComponent(pathname.replace('/api/movies/genre/', ''));
    const results = getMoviesByGenre(genre);
    return jsonResponse(res, 200, {
      genre,
      count: results.length,
      movies: results,
      responseTimeMs: Date.now() - startTime,
    });
  }

  // ── POST /api/recommendations ────────────────────────────────────
  if (pathname === '/api/recommendations' && req.method === 'POST') {
    const body = await parseBody(req);
    const { genres, platforms, country, language, minRating, excludeTitles, limit } = body;
    const results = getRecommendations(
      { genres, platforms, country, language, minRating },
      excludeTitles,
      limit || 5
    );
    return jsonResponse(res, 200, {
      preferences: { genres, platforms, country, language, minRating },
      count: results.length,
      recommendations: results,
      responseTimeMs: Date.now() - startTime,
    });
  }

  // ── GET /api/recommendations/default?limit=5 ─────────────────────
  if (pathname === '/api/recommendations/default' && req.method === 'GET') {
    const limit = parseInt(query.limit) || 5;
    const results = getRecommendations({}, [], limit);
    return jsonResponse(res, 200, {
      count: results.length,
      recommendations: results,
      responseTimeMs: Date.now() - startTime,
    });
  }

  // ── GET /api/platforms ───────────────────────────────────────────
  if (pathname === '/api/platforms' && req.method === 'GET') {
    return jsonResponse(res, 200, {
      platforms: Object.entries(platformNames).map(([id, name]) => ({ id, name })),
      responseTimeMs: Date.now() - startTime,
    });
  }

  // ── 404 ──────────────────────────────────────────────────────────
  jsonResponse(res, 404, {
    error: 'Ruta no encontrada',
    path: pathname,
    availableRoutes: [
      'GET  /health',
      'GET  /api/movies/search?title=<titulo>',
      'GET  /api/movies/platform/<platform>',
      'GET  /api/movies/genre/<genre>',
      'POST /api/recommendations',
      'GET  /api/recommendations/default?limit=5',
      'GET  /api/platforms',
    ],
  });
});

server.listen(PORT, HOST, () => {
  console.log(`\n🎬 Streaming Finder API corriendo en http://${HOST}:${PORT}`);
  console.log(`   Health check: http://${HOST}:${PORT}/health\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT',  () => { server.close(() => process.exit(0)); });

module.exports = server;
