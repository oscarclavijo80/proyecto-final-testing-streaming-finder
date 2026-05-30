// src/mcp/streamingMCP.js
// Conector MCP real con Streaming Availability API (movieofthenight via RapidAPI)
// Cubre: Netflix, Disney+, HBO Max (Max), Amazon Prime Video
// Docs: https://docs.movieofthenight.com/
// API Key gratuita en: https://rapidapi.com/movie-of-the-night-movie-of-the-night-default/api/streaming-availability

import { searchMovieByTitle, formatSearchResult } from '../services/searchService.js';
import { getRecommendations } from '../services/recommendationService.js';
import { platformNames, availablePlatforms } from '../data/moviesDatabase.js';

// IDs de plataformas en la Streaming Availability API
const PLATFORM_IDS = {
  netflix: 'netflix',
  disney: 'disney',
  hbo: 'hbo',        // Max (antes HBO Max)
  amazon: 'prime'    // Amazon Prime Video
};

// Mapeo de IDs de retorno a nombres amigables
const API_PLATFORM_NAMES = {
  netflix: 'Netflix',
  disney: 'Disney+',
  hbo: 'HBO Max',
  prime: 'Amazon Prime Video',
  max: 'HBO Max',
  amazon: 'Amazon Prime Video'
};

/**
 * Llama a la Streaming Availability API real
 * @param {string} endpoint - Ruta del endpoint (ej: '/shows/search/title')
 * @param {Object} params - Query params
 * @returns {Object} Respuesta de la API
 */
async function callStreamingAPI(endpoint, params = {}) {
  const apiKey = process.env.RAPIDAPI_KEY;

  if (!apiKey || apiKey === 'TU_API_KEY_AQUI') {
    // Modo demo: retorna datos locales si no hay API key
    return { _demo: true };
  }

  const url = new URL(`https://streaming-availability.p.rapidapi.com${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.append(k, v);
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Busca película en la API real de streaming
 * @param {string} title - Título a buscar
 * @param {string} country - Código de país (co, us, es...)
 * @returns {Object} Resultado de búsqueda con plataformas
 */
async function searchInRealAPI(title, country = 'co') {
  const data = await callStreamingAPI('/shows/search/title', {
    title,
    country,
    show_type: 'all',
    output_language: 'en'
  });

  // Modo demo: usa base de datos local
  if (data._demo) {
    const localResults = searchMovieByTitle(title);
    return { source: 'local_demo', results: localResults };
  }

  // Procesa respuesta real de la API
  const shows = Array.isArray(data) ? data : (data.shows || []);
  const results = shows.slice(0, 5).map(show => {
    const streamingOptions = show.streamingOptions?.[country] || [];
    const platforms = [...new Set(
      streamingOptions.map(opt => {
        const svc = opt.service?.id || '';
        return { id: svc, name: API_PLATFORM_NAMES[svc] || svc };
      }).filter(p => p.name)
    )];

    return {
      id: show.tmdbId || show.imdbId,
      title: show.title,
      platforms,
      genre: (show.genres || []).map(g => g.name || g),
      year: show.releaseYear || show.firstAirYear,
      rating: show.rating ? show.rating / 10 : null,
      description: show.overview,
      deepLinks: streamingOptions.map(opt => ({
        platform: API_PLATFORM_NAMES[opt.service?.id] || opt.service?.id,
        url: opt.link
      }))
    };
  });

  return { source: 'streaming_api', results };
}

// ============================================================
// DEFINICIÓN DE HERRAMIENTAS MCP
// ============================================================
export const MCP_TOOLS = [
  {
    name: 'search_movie',
    description: 'Busca una película o serie en Netflix, Disney+, HBO Max y Amazon Prime. Retorna en qué plataformas está disponible y enlaces directos.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título de la película o serie a buscar' },
        country: { type: 'string', description: 'Código de país (co, us, es, mx...). Por defecto: co', default: 'co' }
      },
      required: ['title']
    }
  },
  {
    name: 'get_platform_catalog',
    description: 'Obtiene el catálogo de una plataforma de streaming específica filtrado por género y país.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['netflix', 'disney', 'hbo', 'amazon'], description: 'Plataforma de streaming' },
        genre: { type: 'string', description: 'Género a filtrar (opcional)' },
        country: { type: 'string', description: 'Código de país. Por defecto: co', default: 'co' }
      },
      required: ['platform']
    }
  },
  {
    name: 'get_recommendations',
    description: 'Recomendaciones personalizadas basadas en géneros, plataformas disponibles, país e idioma preferido.',
    inputSchema: {
      type: 'object',
      properties: {
        genres: { type: 'array', items: { type: 'string' }, description: 'Géneros favoritos' },
        platforms: { type: 'array', items: { type: 'string' }, description: 'Plataformas disponibles' },
        country: { type: 'string', description: 'País del usuario (ej: CO, US)' },
        language: { type: 'string', description: 'Idioma preferido (es, en)' },
        minRating: { type: 'number', description: 'Rating mínimo 0-10' },
        excludeTitles: { type: 'array', items: { type: 'string' }, description: 'Títulos a excluir' },
        limit: { type: 'number', description: 'Máximo de resultados', default: 5 }
      }
    }
  },
  {
    name: 'list_platforms',
    description: 'Lista todas las plataformas de streaming soportadas.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'get_show_details',
    description: 'Obtiene detalles completos de una película o serie por su título, incluyendo reparto, géneros y disponibilidad por país.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título exacto de la película o serie' },
        country: { type: 'string', description: 'País para verificar disponibilidad', default: 'co' }
      },
      required: ['title']
    }
  }
];

// ============================================================
// DISPATCHER DE HERRAMIENTAS
// ============================================================
export async function executeMCPTool(toolName, args = {}) {
  try {
    switch (toolName) {

      case 'search_movie': {
        if (!args.title) return { success: false, error: 'El parámetro "title" es requerido' };
        const country = (args.country || process.env.DEFAULT_COUNTRY || 'co').toLowerCase();

        const { source, results } = await searchInRealAPI(args.title, country);
        const formatted = formatSearchResult(results, args.title);

        return {
          success: true,
          tool: toolName,
          source,
          country,
          found: formatted.found,
          message: formatted.message,
          data: formatted.results,
          count: results.length
        };
      }

      case 'get_platform_catalog': {
        if (!args.platform) return { success: false, error: 'El parámetro "platform" es requerido' };
        const platformKey = args.platform.toLowerCase();
        if (!availablePlatforms.includes(platformKey)) {
          return { success: false, error: `Plataforma no válida. Opciones: ${availablePlatforms.join(', ')}` };
        }
        const country = (args.country || process.env.DEFAULT_COUNTRY || 'co').toLowerCase();
        const apiKey = process.env.RAPIDAPI_KEY;

        if (!apiKey || apiKey === 'TU_API_KEY_AQUI') {
          // Modo demo con datos locales
          const { getMoviesByPlatform } = await import('../services/searchService.js');
          const catalog = getMoviesByPlatform(platformKey);
          return {
            success: true, tool: toolName, source: 'local_demo',
            platform: platformNames[platformKey], data: catalog, count: catalog.length
          };
        }

        // API real: busca top contenido de la plataforma
        const data = await callStreamingAPI('/shows/search/filters', {
          country,
          catalogs: PLATFORM_IDS[platformKey],
          order_by: 'rating',
          desc: true,
          output_language: 'en',
          ...(args.genre ? { genres: args.genre } : {})
        });

        const shows = data.shows || [];
        return {
          success: true, tool: toolName, source: 'streaming_api',
          platform: platformNames[platformKey], country,
          data: shows.slice(0, 20).map(s => ({
            title: s.title, year: s.releaseYear || s.firstAirYear,
            rating: s.rating ? s.rating / 10 : null,
            genre: (s.genres || []).map(g => g.name || g)
          })),
          count: shows.length
        };
      }

      case 'get_recommendations': {
        const { excludeTitles = [], limit = 5, ...preferences } = args || {};
        const recommendations = getRecommendations(preferences, excludeTitles, limit);
        return { success: true, tool: toolName, data: recommendations, count: recommendations.length };
      }

      case 'list_platforms': {
        return {
          success: true, tool: toolName,
          data: availablePlatforms.map(id => ({ id, name: platformNames[id] })),
          count: availablePlatforms.length
        };
      }

      case 'get_show_details': {
        if (!args.title) return { success: false, error: 'El parámetro "title" es requerido' };
        const country = (args.country || 'co').toLowerCase();
        const { source, results } = await searchInRealAPI(args.title, country);
        const show = results[0] || null;
        return {
          success: true, tool: toolName, source, country,
          data: show,
          found: !!show
        };
      }

      default:
        return {
          success: false,
          error: `Herramienta desconocida: "${toolName}". Disponibles: ${MCP_TOOLS.map(t => t.name).join(', ')}`
        };
    }
  } catch (error) {
    return { success: false, tool: toolName, error: error.message };
  }
}

export function getMCPTools() { return MCP_TOOLS; }
