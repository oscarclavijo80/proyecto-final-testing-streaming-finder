/**
 * UserSearchService
 *
 * Caso de uso que orquesta la búsqueda de películas con persistencia de historial
 * y gestión de preferencias. Equivale al "Registry" del taller del profesor:
 * conecta la lógica de negocio (searchService, recommendationService)
 * con el repositorio de persistencia.
 *
 * Esta capa es la que se prueba en las pruebas de INTEGRACIÓN:
 * verifica que searchService + recommendationService + repository trabajen juntos.
 */

import { searchMovieByTitle, formatSearchResult, getMoviesByPlatform } from './searchService.js';
import { getRecommendations, formatRecommendations } from './recommendationService.js';

export class UserSearchService {
  /**
   * @param {Object} repository - Repositorio de persistencia (real o fake/mock)
   */
  constructor(repository) {
    if (!repository) throw new Error('Se requiere un repositorio');
    this._repo = repository;
  }

  /**
   * Busca una película y persiste el historial del usuario.
   *
   * @param {string} userId - Identificador del usuario
   * @param {string} query  - Título a buscar
   * @returns {Object} resultado con found, movies y mensaje
   */
  searchAndSave(userId, query) {
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new Error('userId es requerido y debe ser un string no vacío');
    }
    if (!query || typeof query !== 'string' || !query.trim()) {
      return { found: false, movies: [], message: 'Consulta vacía' };
    }

    const results = searchMovieByTitle(query);
    const formatted = formatSearchResult(results, query);

    // Integración: persiste el resultado en el repositorio
    this._repo.saveSearch(userId, query.trim(), results);

    return formatted;
  }

  /**
   * Obtiene el historial de búsquedas del usuario con enriquecimiento de datos.
   *
   * @param {string} userId
   * @returns {Object[]}
   */
  getEnrichedHistory(userId) {
    if (!userId) return [];

    const history = this._repo.getSearchHistory(userId);

    // Integración: enriquece cada entrada con info adicional del catálogo
    return history.map(entry => ({
      ...entry,
      platformCount: entry.results ? entry.results.length : 0,
      platforms: entry.results
        ? [...new Set(entry.results.flatMap(r => r.platforms.map(p => p.name)))]
        : [],
    }));
  }

  /**
   * Guarda las preferencias del usuario y retorna recomendaciones personalizadas.
   *
   * @param {string} userId
   * @param {Object} preferences - { genres, platforms, country, language, minRating }
   * @returns {Object} recomendaciones formateadas
   */
  savePreferencesAndRecommend(userId, preferences) {
    if (!userId) throw new Error('userId es requerido');
    if (!preferences || typeof preferences !== 'object') {
      throw new Error('preferences debe ser un objeto válido');
    }

    // Integración: persiste preferencias en repositorio
    this._repo.savePreferences(userId, preferences);

    // Integración: usa recommendationService con las preferencias guardadas
    const savedPrefs = this._repo.getPreferences(userId);
    const recommendations = getRecommendations(savedPrefs);
    return formatRecommendations(recommendations, null);
  }

  /**
   * Retorna catálogo de plataforma + verifica si el usuario ya configuró preferencias.
   *
   * @param {string} userId
   * @param {string} platform
   * @returns {Object}
   */
  getCatalogWithUserContext(userId, platform) {
    const movies = getMoviesByPlatform(platform);
    const hasPrefs = userId ? this._repo.hasPreferences(userId) : false;

    return {
      platform,
      movies,
      count: movies.length,
      userHasPreferences: hasPrefs,
      message: hasPrefs
        ? `Catálogo de ${platform} (tienes preferencias configuradas)`
        : `Catálogo de ${platform} (configura tus preferencias para recomendaciones personalizadas)`,
    };
  }
}
