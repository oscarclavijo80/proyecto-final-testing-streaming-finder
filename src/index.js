// src/index.js - CLI interactivo del buscador de streaming
import 'dotenv/config';
import readline from 'readline';
import { searchMovieByTitle, formatSearchResult } from './services/searchService.js';
import { getRecommendations, formatRecommendations } from './services/recommendationService.js';
import { executeMCPTool, getMCPTools } from './mcp/streamingMCP.js';
import { platformNames } from './data/moviesDatabase.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

let userPreferences = {
  genres: [], platforms: Object.keys(platformNames),
  country: process.env.DEFAULT_COUNTRY || 'CO',
  language: 'es', minRating: 0
};
let searchHistory = [];

const hasRealAPI = process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_KEY !== 'TU_API_KEY_AQUI';

function printBanner() {
  console.log('\n' + '='.repeat(62));
  console.log('🎬  STREAMING FINDER - Buscador de Películas');
  console.log('    Netflix | Disney+ | HBO Max | Amazon Prime');
  console.log('='.repeat(62));
  if (hasRealAPI) {
    console.log('🟢  Modo: API REAL (Streaming Availability API)');
  } else {
    console.log('🟡  Modo: DEMO local (configura RAPIDAPI_KEY en .env para datos reales)');
    console.log('    → Obtén tu key GRATIS en: https://rapidapi.com/');
  }
  console.log('='.repeat(62));
}

function printMenu() {
  console.log('\n📋 MENÚ:');
  console.log('  1. 🔍 Buscar película / serie');
  console.log('  2. ⭐ Recomendaciones personalizadas');
  console.log('  3. ⚙️  Configurar preferencias');
  console.log('  4. 📺 Ver catálogo por plataforma');
  console.log('  5. 🛠  Ejecutar herramienta MCP directamente');
  console.log('  6. ❌ Salir\n');
}

async function searchMovie() {
  const title = await question('🔍 Título de película o serie: ');
  if (!title.trim()) { console.log('⚠️  Ingresa un título válido.'); return; }

  const country = userPreferences.country.toLowerCase();
  console.log(`\n⏳ Buscando "${title}" en ${hasRealAPI ? 'API real' : 'base demo'}...\n`);

  const result = await executeMCPTool('search_movie', { title, country });

  if (!result.success) {
    console.log(`❌ Error: ${result.error}`);
    return;
  }

  if (result.found) {
    console.log(`✅ ${result.message}\n`);
    result.data.forEach(movie => {
      const platformText = movie.platforms?.map(p => p.name || p).join(', ') ||
                           movie.platformsText || 'N/D';
      console.log(`  🎬 ${movie.title} (${movie.year || 'N/A'})`);
      console.log(`     📺 Disponible en: ${platformText}`);
      if (movie.genre?.length) console.log(`     🎭 Géneros: ${movie.genre.join(', ')}`);
      if (movie.rating) console.log(`     ⭐ Rating: ${movie.rating}/10`);
      if (movie.description) console.log(`     📝 ${movie.description.slice(0, 120)}...`);
      if (movie.deepLinks?.length) {
        console.log('     🔗 Ver en:');
        movie.deepLinks.forEach(dl => console.log(`        • ${dl.platform}: ${dl.url}`));
      }
      console.log();
    });
    searchHistory.push(title);
  } else {
    console.log(`❌ ${result.message}`);
    console.log('\n💡 Buscando recomendaciones similares...\n');
    const recs = getRecommendations(userPreferences, searchHistory, 3);
    const fmt = formatRecommendations(recs, title);
    console.log(`🌟 ${fmt.message}\n`);
    fmt.recommendations.forEach(r => {
      console.log(`  ${r.rank}. 🎬 ${r.title} (${r.year}) → ${r.platforms.join(', ')}`);
      console.log(`     📊 ${r.reason} | ⭐ ${r.rating}/10\n`);
    });
  }
}

async function showRecommendations() {
  console.log('\n⭐ RECOMENDACIONES PERSONALIZADAS');
  const recs = getRecommendations(userPreferences, searchHistory, 5);
  const fmt = formatRecommendations(recs, null);
  console.log(`\n🌟 ${fmt.message}\n`);
  fmt.recommendations.forEach(r => {
    console.log(`  ${r.rank}. 🎬 ${r.title} (${r.year}) → ${r.platforms.join(', ')}`);
    console.log(`     🎭 ${r.genre} | ⭐ ${r.rating}/10 | 📊 ${r.reason}\n`);
  });
}

async function configurePreferences() {
  console.log('\n⚙️  CONFIGURAR PREFERENCIAS\n');
  const g = await question('🎭 Géneros favoritos (ej: drama,accion,terror): ');
  if (g.trim()) userPreferences.genres = g.split(',').map(x => x.trim().toLowerCase());
  const p = await question('📺 Plataformas disponibles (netflix,disney,hbo,amazon): ');
  if (p.trim()) userPreferences.platforms = p.split(',').map(x => x.trim().toLowerCase());
  const c = await question('🌎 País (CO, US, ES, MX): ');
  if (c.trim()) userPreferences.country = c.trim().toUpperCase();
  const l = await question('🗣  Idioma preferido (es, en): ');
  if (l.trim()) userPreferences.language = l.trim().toLowerCase();
  const r = await question('⭐ Rating mínimo (0-10): ');
  if (r.trim() && !isNaN(r)) userPreferences.minRating = parseFloat(r);
  console.log('\n✅ Preferencias guardadas!');
}

async function viewPlatformCatalog() {
  const platform = await question('\n📺 Plataforma (netflix, disney, hbo, amazon): ');
  const result = await executeMCPTool('get_platform_catalog', {
    platform: platform.trim().toLowerCase(),
    country: userPreferences.country.toLowerCase()
  });
  if (result.success) {
    console.log(`\n📋 Catálogo de ${result.platform} (${result.count} títulos):\n`);
    result.data.slice(0, 15).forEach((m, i) => {
      const rating = m.rating ? `⭐${m.rating}` : '';
      console.log(`  ${i + 1}. ${m.title} (${m.year || 'N/A'}) ${rating}`);
    });
  } else {
    console.log(`\n❌ ${result.error}`);
  }
}

async function executeMCPDirect() {
  console.log('\n🛠  HERRAMIENTAS MCP DISPONIBLES:\n');
  getMCPTools().forEach((t, i) => console.log(`  ${i + 1}. ${t.name} - ${t.description}`));
  const toolName = await question('\nNombre de la herramienta: ');
  const argsRaw = await question('Argumentos JSON (ej: {"title":"Narcos","country":"co"}): ');
  let args = {};
  try { if (argsRaw.trim()) args = JSON.parse(argsRaw); } catch { console.log('⚠️  JSON inválido.'); }
  const result = await executeMCPTool(toolName.trim(), args);
  console.log('\n📦 Resultado:\n' + JSON.stringify(result, null, 2));
}

async function main() {
  printBanner();
  let running = true;
  while (running) {
    printMenu();
    const choice = await question('Opción (1-6): ');
    switch (choice.trim()) {
      case '1': await searchMovie(); break;
      case '2': await showRecommendations(); break;
      case '3': await configurePreferences(); break;
      case '4': await viewPlatformCatalog(); break;
      case '5': await executeMCPDirect(); break;
      case '6': console.log('\n👋 ¡Hasta luego!\n'); running = false; break;
      default: console.log('⚠️  Opción no válida (1-6).');
    }
  }
  rl.close();
}

main().catch(console.error);
