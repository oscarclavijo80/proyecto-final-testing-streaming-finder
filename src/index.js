// src/index.js
// Punto de entrada principal - CLI interactivo del buscador de streaming

import readline from 'readline';
import { searchMovieByTitle, formatSearchResult } from './services/searchService.js';
import { getRecommendations, formatRecommendations } from './services/recommendationService.js';
import { executeMCPTool, getMCPTools } from './mcp/streamingMCP.js';
import { platformNames } from './data/moviesDatabase.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

// Estado de preferencias del usuario en sesión
let userPreferences = {
  genres: [],
  platforms: Object.keys(platformNames),
  country: 'CO',
  language: 'es',
  minRating: 0
};

let searchHistory = [];

function printBanner() {
  console.log('\n' + '='.repeat(60));
  console.log('🎬  STREAMING FINDER - Buscador de Películas');
  console.log('    Netflix | Disney+ | HBO Max | Amazon Prime');
  console.log('='.repeat(60));
}

function printMenu() {
  console.log('\n📋 MENÚ PRINCIPAL:');
  console.log('  1. 🔍 Buscar película');
  console.log('  2. ⭐ Ver recomendaciones personalizadas');
  console.log('  3. ⚙️  Configurar preferencias');
  console.log('  4. 📺 Ver catálogo por plataforma');
  console.log('  5. 🛠  Ejecutar herramienta MCP directamente');
  console.log('  6. ❌ Salir\n');
}

async function searchMovie() {
  const title = await question('🔍 Ingresa el título de la película: ');
  if (!title.trim()) {
    console.log('⚠️  Por favor ingresa un título válido.');
    return;
  }

  console.log(`\n⏳ Buscando "${title}" en todas las plataformas...\n`);

  const results = searchMovieByTitle(title);
  const formatted = formatSearchResult(results, title);

  if (formatted.found) {
    console.log(`✅ ${formatted.message}\n`);
    formatted.results.forEach(movie => {
      console.log(`  🎬 ${movie.title} (${movie.year})`);
      console.log(`     📺 Disponible en: ${movie.platformsText}`);
      console.log(`     🎭 Géneros: ${movie.genre.join(', ')}`);
      console.log(`     ⭐ Rating: ${movie.rating}/10`);
      console.log(`     📝 ${movie.description}\n`);
    });
    searchHistory.push(title);
  } else {
    console.log(`❌ ${formatted.message}`);
    console.log('\n💡 Generando recomendaciones similares...\n');
    const recs = getRecommendations(userPreferences, searchHistory, 3);
    const formattedRecs = formatRecommendations(recs, title);
    console.log(`🌟 ${formattedRecs.message}\n`);
    formattedRecs.recommendations.forEach(rec => {
      console.log(`  ${rec.rank}. 🎬 ${rec.title} (${rec.year})`);
      console.log(`     📺 En: ${rec.platforms.join(', ')}`);
      console.log(`     🎭 ${rec.genre} | ⭐ ${rec.rating}/10`);
      console.log(`     📊 ${rec.reason}\n`);
    });
  }
}

async function showRecommendations() {
  console.log('\n⭐ RECOMENDACIONES PERSONALIZADAS\n');
  console.log('Preferencias actuales:');
  console.log(`  Géneros: ${userPreferences.genres.length > 0 ? userPreferences.genres.join(', ') : 'Todos'}`);
  console.log(`  Plataformas: ${userPreferences.platforms.join(', ')}`);
  console.log(`  País: ${userPreferences.country} | Idioma: ${userPreferences.language}`);
  console.log(`  Rating mínimo: ${userPreferences.minRating}/10\n`);

  const recs = getRecommendations(userPreferences, searchHistory, 5);
  const formatted = formatRecommendations(recs, null);

  console.log(`🌟 ${formatted.message}\n`);
  formatted.recommendations.forEach(rec => {
    console.log(`  ${rec.rank}. 🎬 ${rec.title} (${rec.year})`);
    console.log(`     📺 En: ${rec.platforms.join(', ')}`);
    console.log(`     🎭 ${rec.genre} | ⭐ ${rec.rating}/10`);
    console.log(`     📊 ${rec.reason}\n`);
  });
}

async function configurePreferences() {
  console.log('\n⚙️  CONFIGURAR PREFERENCIAS\n');

  const genresInput = await question('🎭 Géneros favoritos (separados por coma, ej: drama,accion): ');
  if (genresInput.trim()) {
    userPreferences.genres = genresInput.split(',').map(g => g.trim().toLowerCase());
  }

  const platformsInput = await question('📺 Plataformas disponibles (netflix,disney,hbo,amazon): ');
  if (platformsInput.trim()) {
    userPreferences.platforms = platformsInput.split(',').map(p => p.trim().toLowerCase());
  }

  const country = await question('🌎 Tu país (ej: CO, US, ES): ');
  if (country.trim()) userPreferences.country = country.trim().toUpperCase();

  const language = await question('🗣  Idioma preferido (es, en): ');
  if (language.trim()) userPreferences.language = language.trim().toLowerCase();

  const minRating = await question('⭐ Rating mínimo (0-10): ');
  if (minRating.trim() && !isNaN(minRating)) {
    userPreferences.minRating = parseFloat(minRating);
  }

  console.log('\n✅ Preferencias guardadas correctamente!');
}

async function viewPlatformCatalog() {
  console.log('\n📺 VER CATÁLOGO POR PLATAFORMA');
  console.log('Plataformas disponibles: netflix, disney, hbo, amazon\n');
  const platform = await question('Ingresa la plataforma: ');

  const result = executeMCPTool('get_platform_catalog', { platform: platform.trim().toLowerCase() });

  if (result.success) {
    console.log(`\n📋 Catálogo de ${result.platform} (${result.count} títulos):\n`);
    result.data.forEach((movie, i) => {
      console.log(`  ${i + 1}. ${movie.title} (${movie.year}) - ⭐ ${movie.rating}`);
    });
  } else {
    console.log(`\n❌ Error: ${result.error}`);
  }
}

async function executeMCPDirect() {
  console.log('\n🛠  EJECUTAR HERRAMIENTA MCP\n');
  const tools = getMCPTools();
  tools.forEach((tool, i) => {
    console.log(`  ${i + 1}. ${tool.name} - ${tool.description}`);
  });

  const toolName = await question('\nIngresa el nombre de la herramienta: ');
  const argsRaw = await question('Ingresa los argumentos (JSON, ej: {"title":"Narcos"}): ');

  let args = {};
  try {
    if (argsRaw.trim()) args = JSON.parse(argsRaw);
  } catch {
    console.log('⚠️  JSON inválido, usando argumentos vacíos.');
  }

  const result = executeMCPTool(toolName.trim(), args);
  console.log('\n📦 Resultado MCP:');
  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  printBanner();

  let running = true;
  while (running) {
    printMenu();
    const choice = await question('Selecciona una opción (1-6): ');

    switch (choice.trim()) {
      case '1': await searchMovie(); break;
      case '2': await showRecommendations(); break;
      case '3': await configurePreferences(); break;
      case '4': await viewPlatformCatalog(); break;
      case '5': await executeMCPDirect(); break;
      case '6':
        console.log('\n👋 ¡Hasta luego! Gracias por usar Streaming Finder.\n');
        running = false;
        break;
      default:
        console.log('⚠️  Opción no válida. Por favor elige entre 1 y 6.');
    }
  }

  rl.close();
}

main().catch(console.error);
