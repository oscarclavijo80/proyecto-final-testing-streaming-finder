// src/mcp/streamingMCP.js
// Conector MCP (Model Context Protocol) para plataformas de streaming
// Simula la integración con APIs reales de Netflix, Disney+, HBO Max y Amazon Prime

import { searchMovieByTitle, getMoviesByPlatform } from '../services/searchService.js';
import { getRecommendations } from '../services/recommendationService.js';
import { platformNames, availablePlatforms } from '../data/moviesDatabase.js';

/**
 * Definición de herramientas MCP disponibles
 * Cada herramienta representa una capacidad del sistema
 */
export const MCP_TOOLS = [
  {
    name: 'search_movie',
    description: 'Busca una película en todas las plataformas de streaming disponibles',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Título de la película a buscar'
        }
      },
      required: ['title']
    }
  },
  {
    name: 'get_platform_catalog',
    description: 'Obtiene el catálogo de una plataforma específica',
    inputSchema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          enum: ['netflix', 'disney', 'hbo', 'amazon'],
          description: 'Plataforma de streaming'
        }
      },
      required: ['platform']
    }
  },
  {
    name: 'get_recommendations',
    description: 'Obtiene recomendaciones personalizadas basadas en preferencias',
    inputSchema: {
      type: 'object',
      properties: {
        genres: {
          type: 'array',
          items: { type: 'string' },
          description: 'Géneros favoritos del usuario'
        },
        platforms: {
          type: 'array',
          items: { type: 'string' },
          description: 'Plataformas disponibles del usuario'
        },
        country: {
          type: 'string',
          description: 'País del usuario (ej: CO, US)'
        },
        language: {
          type: 'string',
          description: 'Idioma preferido (ej: es, en)'
        },
        minRating: {
          type: 'number',
          description: 'Calificación mínima (0-10)'
        },
        excludeTitles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Títulos a excluir de recomendaciones'
        },
        limit: {
          type: 'number',
          description: 'Número máximo de recomendaciones'
        }
      }
    }
  },
  {
    name: 'list_platforms',
    description: 'Lista todas las plataformas de streaming disponibles',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

/**
 * Ejecuta una herramienta MCP según el nombre y argumentos proporcionados
 * @param {string} toolName - Nombre de la herramienta
 * @param {Object} args - Argumentos de la herramienta
 * @returns {Object} Resultado de la ejecución
 */
export function executeMCPTool(toolName, args = {}) {
  switch (toolName) {
    case 'search_movie': {
      if (!args.title) {
        return {
          success: false,
          error: 'El parámetro "title" es requerido'
        };
      }
      const results = searchMovieByTitle(args.title);
      return {
        success: true,
        tool: toolName,
        data: results,
        count: results.length
      };
    }

    case 'get_platform_catalog': {
      if (!args.platform) {
        return {
          success: false,
          error: 'El parámetro "platform" es requerido'
        };
      }
      if (!availablePlatforms.includes(args.platform.toLowerCase())) {
        return {
          success: false,
          error: `Plataforma no válida. Opciones: ${availablePlatforms.join(', ')}`
        };
      }
      const catalog = getMoviesByPlatform(args.platform);
      return {
        success: true,
        tool: toolName,
        platform: platformNames[args.platform],
        data: catalog,
        count: catalog.length
      };
    }

    case 'get_recommendations': {
      const { excludeTitles = [], limit = 5, ...preferences } = args || {};
      const recommendations = getRecommendations(preferences, excludeTitles, limit);
      return {
        success: true,
        tool: toolName,
        data: recommendations,
        count: recommendations.length
      };
    }

    case 'list_platforms': {
      const platforms = availablePlatforms.map(id => ({
        id,
        name: platformNames[id]
      }));
      return {
        success: true,
        tool: toolName,
        data: platforms,
        count: platforms.length
      };
    }

    default:
      return {
        success: false,
        error: `Herramienta desconocida: "${toolName}". Herramientas disponibles: ${MCP_TOOLS.map(t => t.name).join(', ')}`
      };
  }
}

/**
 * Retorna la lista de herramientas MCP disponibles
 * @returns {Array} Lista de herramientas
 */
export function getMCPTools() {
  return MCP_TOOLS;
}
