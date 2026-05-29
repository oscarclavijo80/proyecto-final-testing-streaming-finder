// src/services/recommendationService.js
// Servicio de recomendaciones basado en preferencias del usuario (TDD)

import { moviesDatabase, platformNames } from '../data/moviesDatabase.js';
import { normalizeText } from './searchService.js';

/**
 * Perfil de preferencias del usuario
 * @typedef {Object} UserPreferences
 * @property {string[]} genres - Géneros favoritos
 * @property {string[]} platforms - Plataformas disponibles
 * @property {string} country - País del usuario
 * @property {string} language - Idioma preferido
 * @property {number} minRating - Rating mínimo aceptable
 */

/**
 * Calcula un puntaje de compatibilidad entre una película y las preferencias del usuario
 * Algoritmo basado en ponderación por categorías (0-100 puntos)
 *
 * @param {Object} movie - Película a evaluar
 * @param {UserPreferences} preferences - Preferencias del usuario
 * @returns {number} Puntaje de compatibilidad (0-100)
 */
export function calculateCompatibilityScore(movie, preferences) {
  if (!movie || !preferences) return 0;

  let score = 0;
  const weights = {
    genre: 40,      // 40% peso en género
    platform: 20,   // 20% peso en plataforma disponible
    country: 15,    // 15% peso en país de producción
    language: 15,   // 15% peso en idioma
    rating: 10      // 10% peso en calificación
  };

  // Puntuación por género
  if (preferences.genres && preferences.genres.length > 0) {
    const movieGenresNorm = movie.genre.map(g => normalizeText(g));
    const prefGenresNorm = preferences.genres.map(g => normalizeText(g));
    const genreMatches = prefGenresNorm.filter(g => movieGenresNorm.includes(g));
    const genreScore = (genreMatches.length / preferences.genres.length) * weights.genre;
    score += genreScore;
  } else {
    score += weights.genre * 0.5; // puntaje neutro si no hay preferencia
  }

  // Puntuación por plataforma disponible
  if (preferences.platforms && preferences.platforms.length > 0) {
    const platformMatch = movie.platforms.some(p =>
      preferences.platforms.map(pl => pl.toLowerCase()).includes(p.toLowerCase())
    );
    if (platformMatch) score += weights.platform;
  } else {
    score += weights.platform * 0.5;
  }

  // Puntuación por país
  if (preferences.country) {
    if (movie.country === preferences.country.toUpperCase()) {
      score += weights.country;
    }
  } else {
    score += weights.country * 0.5;
  }

  // Puntuación por idioma
  if (preferences.language) {
    if (movie.language === preferences.language.toLowerCase()) {
      score += weights.language;
    }
  } else {
    score += weights.language * 0.5;
  }

  // Puntuación por rating (normalizado sobre 10)
  const ratingScore = (movie.rating / 10) * weights.rating;
  score += ratingScore;

  return Math.round(score * 100) / 100;
}

/**
 * Obtiene recomendaciones de películas basadas en preferencias del usuario
 * Excluye películas ya vistas o buscadas
 *
 * @param {UserPreferences} preferences - Preferencias del usuario
 * @param {string[]} excludeTitles - Títulos a excluir (ya vistos/buscados)
 * @param {number} limit - Número máximo de recomendaciones
 * @returns {Array} Lista de películas recomendadas ordenadas por puntaje
 */
export function getRecommendations(preferences, excludeTitles = [], limit = 5) {
  if (!preferences) {
    return getDefaultRecommendations(limit);
  }

  const normalizedExclusions = (excludeTitles || []).map(t => normalizeText(t));

  const minRating = preferences.minRating || 0;

  const scoredMovies = moviesDatabase
    .filter(movie => {
      const titleNorm = normalizeText(movie.title);
      const isExcluded = normalizedExclusions.some(ex =>
        titleNorm.includes(ex) || ex.includes(titleNorm)
      );
      const meetsRating = movie.rating >= minRating;
      return !isExcluded && meetsRating;
    })
    .map(movie => ({
      ...movie,
      score: calculateCompatibilityScore(movie, preferences),
      platformNames: movie.platforms.map(p => platformNames[p] || p)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scoredMovies;
}

/**
 * Obtiene recomendaciones por defecto cuando no hay preferencias
 * @param {number} limit - Número de recomendaciones
 * @returns {Array} Películas mejor valoradas
 */
export function getDefaultRecommendations(limit = 5) {
  return moviesDatabase
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit)
    .map(movie => ({
      ...movie,
      score: movie.rating * 10,
      platformNames: movie.platforms.map(p => platformNames[p] || p),
      reason: 'Mejor valorada por la comunidad'
    }));
}

/**
 * Formatea las recomendaciones para presentarlas al usuario
 * @param {Array} recommendations - Lista de películas recomendadas
 * @param {string} searchedTitle - Título que el usuario buscó originalmente
 * @returns {Object} Objeto formateado con mensaje y recomendaciones
 */
export function formatRecommendations(recommendations, searchedTitle) {
  if (!recommendations || recommendations.length === 0) {
    return {
      message: 'No se encontraron recomendaciones con las preferencias actuales.',
      recommendations: []
    };
  }

  const introMessage = searchedTitle
    ? `No encontramos "${searchedTitle}", pero basándonos en tus preferencias te sugerimos:`
    : 'Basándonos en tus preferencias, te recomendamos:';

  return {
    message: introMessage,
    recommendations: recommendations.map((movie, index) => ({
      rank: index + 1,
      title: movie.title,
      platforms: movie.platformNames || movie.platforms,
      genre: movie.genre.join(', '),
      year: movie.year,
      rating: movie.rating,
      score: movie.score,
      description: movie.description,
      reason: movie.reason || `Compatibilidad: ${movie.score}%`
    }))
  };
}
