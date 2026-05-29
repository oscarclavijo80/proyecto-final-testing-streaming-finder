// src/services/searchService.js
// Servicio principal de búsqueda de películas en plataformas de streaming

import { moviesDatabase, platformNames } from '../data/moviesDatabase.js';

/**
 * Normaliza un texto: minúsculas, sin acentos, sin caracteres especiales
 * @param {string} text - Texto a normalizar
 * @returns {string} Texto normalizado
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Busca una película por título exacto o parcial
 * @param {string} title - Título de la película a buscar
 * @returns {Array} Lista de películas encontradas con sus plataformas
 */
export function searchMovieByTitle(title) {
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return [];
  }

  const normalizedSearch = normalizeText(title);

  const results = moviesDatabase.filter(movie => {
    const normalizedTitle = normalizeText(movie.title);
    return (
      normalizedTitle.includes(normalizedSearch) ||
      normalizedSearch.includes(normalizedTitle)
    );
  });

  return results.map(movie => ({
    id: movie.id,
    title: movie.title,
    platforms: movie.platforms.map(p => ({
      id: p,
      name: platformNames[p] || p
    })),
    genre: movie.genre,
    year: movie.year,
    country: movie.country,
    rating: movie.rating,
    description: movie.description
  }));
}

/**
 * Formatea el resultado de búsqueda para mostrar al usuario
 * @param {Array} results - Resultados de búsqueda
 * @param {string} query - Término de búsqueda original
 * @returns {Object} Resultado formateado con mensaje y datos
 */
export function formatSearchResult(results, query) {
  if (!results || results.length === 0) {
    return {
      found: false,
      query,
      message: `No se encontró "${query}" en ninguna plataforma de streaming disponible.`,
      results: []
    };
  }

  const formattedResults = results.map(movie => {
    const platformList = movie.platforms.map(p => p.name).join(', ');
    return {
      ...movie,
      platformsText: platformList,
      message: `"${movie.title}" está disponible en: ${platformList}`
    };
  });

  return {
    found: true,
    query,
    message: `Se encontraron ${results.length} resultado(s) para "${query}"`,
    results: formattedResults
  };
}

/**
 * Busca películas por plataforma específica
 * @param {string} platformId - ID de la plataforma (netflix, disney, hbo, amazon)
 * @returns {Array} Películas disponibles en esa plataforma
 */
export function getMoviesByPlatform(platformId) {
  if (!platformId || typeof platformId !== 'string') return [];
  const normalizedPlatform = platformId.toLowerCase().trim();
  return moviesDatabase.filter(movie =>
    movie.platforms.includes(normalizedPlatform)
  );
}

/**
 * Busca películas por género
 * @param {string} genre - Género a buscar
 * @returns {Array} Películas del género especificado
 */
export function getMoviesByGenre(genre) {
  if (!genre || typeof genre !== 'string') return [];
  const normalizedGenre = normalizeText(genre);
  return moviesDatabase.filter(movie =>
    movie.genre.some(g => normalizeText(g).includes(normalizedGenre))
  );
}
