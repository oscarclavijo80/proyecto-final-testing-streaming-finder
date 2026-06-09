/**
 * userSearchService.integration.test.js
 *
 * PRUEBAS DE INTEGRACIÓN — con FakeRepository (equivalente a H2 del taller)
 *
 * Verifican que las capas application + infrastructure (repositorio) trabajen
 * correctamente juntas: no prueban módulos aislados, sino la INTERACCIÓN real
 * entre UserSearchService y FakeMovieRepository.
 *
 * Equivale a RegistryTest.java del taller (pruebas con BD H2 en memoria).
 *
 * Patrón: AAA (Arrange – Act – Assert)
 * Nomenclatura: GIVEN [contexto] WHEN [acción] THEN [resultado]
 */

import { UserSearchService } from '../../src/services/userSearchService.js';
import { FakeMovieRepository } from '../../src/fakes/fakeMovieRepository.js';

describe('UserSearchService — Pruebas de Integración con FakeRepository', () => {
  let repo;
  let service;

  /**
   * Arrange común: inicializar repositorio limpio y servicio antes de cada test.
   * Equivalente al @Before setup() del taller con H2 + repo.initSchema() + repo.deleteAll()
   */
  beforeEach(() => {
    repo = new FakeMovieRepository();      // Arrange: repositorio en memoria
    repo.clear();                           // Arrange: limpiar datos previos
    service = new UserSearchService(repo);  // Arrange: inyectar dependencia
  });

  // ─────────────────────────────────────────────────────────────────────────
  // INTEGRACIÓN: searchAndSave — búsqueda + persistencia
  // ─────────────────────────────────────────────────────────────────────────

  describe('searchAndSave — búsqueda integrada con persistencia', () => {

    test('GIVEN usuario válido y película existente WHEN busca THEN retorna found=true y persiste en repo', () => {
      // Arrange
      const userId = 'user-001';
      const query = 'Narcos';

      // Act
      const result = service.searchAndSave(userId, query);

      // Assert — resultado de negocio
      expect(result.found).toBe(true);
      expect(result.results).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);

      // Assert — persistencia real en el repositorio (integración)
      const history = repo.getSearchHistory(userId);
      expect(history).toHaveLength(1);
      expect(history[0].query).toBe('Narcos');
      expect(history[0].userId).toBe('user-001');
    });

    test('GIVEN usuario válido y película inexistente WHEN busca THEN retorna found=false y TAMBIÉN persiste', () => {
      // Arrange
      const userId = 'user-002';
      const query = 'PeliculaQueNoExiste_XYZ';

      // Act
      const result = service.searchAndSave(userId, query);

      // Assert — resultado de negocio
      expect(result.found).toBe(false);

      // Assert — integración: persiste incluso búsquedas sin resultado
      const history = repo.getSearchHistory(userId);
      expect(history).toHaveLength(1);
      expect(history[0].results).toHaveLength(0);
    });

    test('GIVEN mismo usuario busca dos veces WHEN se consulta historial THEN tiene dos entradas distintas', () => {
      // Arrange
      const userId = 'user-003';

      // Act
      service.searchAndSave(userId, 'Narcos');
      service.searchAndSave(userId, 'Encanto');

      // Assert — integración: ambas búsquedas se persisten
      const history = repo.getSearchHistory(userId);
      expect(history).toHaveLength(2);
      const queries = history.map(h => h.query);
      expect(queries).toContain('Narcos');
      expect(queries).toContain('Encanto');
    });

    test('GIVEN dos usuarios distintos WHEN buscan la misma película THEN sus historiales son independientes', () => {
      // Arrange
      const userId1 = 'user-A';
      const userId2 = 'user-B';

      // Act
      service.searchAndSave(userId1, 'Narcos');
      service.searchAndSave(userId2, 'Narcos');

      // Assert — integración: historiales aislados por usuario
      const historyA = repo.getSearchHistory(userId1);
      const historyB = repo.getSearchHistory(userId2);
      expect(historyA).toHaveLength(1);
      expect(historyB).toHaveLength(1);
      expect(historyA[0].userId).toBe('user-A');
      expect(historyB[0].userId).toBe('user-B');
    });

    test('GIVEN userId nulo WHEN busca THEN lanza error sin tocar el repositorio', () => {
      // Act & Assert
      expect(() => service.searchAndSave(null, 'Narcos')).toThrow('userId es requerido');

      // Assert — integración: el repositorio no fue llamado
      expect(repo.callCount('saveSearch')).toBe(0);
    });

    test('GIVEN query vacía WHEN busca THEN retorna found=false sin persistir', () => {
      // Act
      const result = service.searchAndSave('user-005', '   ');

      // Assert
      expect(result.found).toBe(false);
      // Assert — integración: no persiste consultas vacías
      expect(repo.callCount('saveSearch')).toBe(0);
    });

  });

  // ─────────────────────────────────────────────────────────────────────────
  // INTEGRACIÓN: getEnrichedHistory — historial enriquecido
  // ─────────────────────────────────────────────────────────────────────────

  describe('getEnrichedHistory — enriquecimiento de datos integrado', () => {

    test('GIVEN usuario con búsquedas previas WHEN pide historial THEN retorna entradas enriquecidas con plataformas', () => {
      // Arrange
      service.searchAndSave('user-010', 'Narcos');

      // Act
      const history = service.getEnrichedHistory('user-010');

      // Assert — integración: los datos del repo se enriquecen con info del catálogo
      expect(history).toHaveLength(1);
      expect(history[0]).toHaveProperty('platformCount');
      expect(history[0]).toHaveProperty('platforms');
      expect(Array.isArray(history[0].platforms)).toBe(true);
    });

    test('GIVEN usuario sin búsquedas WHEN pide historial THEN retorna arreglo vacío', () => {
      const history = service.getEnrichedHistory('usuario-nuevo');
      expect(history).toHaveLength(0);
    });

    test('GIVEN userId undefined WHEN pide historial THEN retorna arreglo vacío sin error', () => {
      const history = service.getEnrichedHistory(undefined);
      expect(history).toHaveLength(0);
    });

  });

  // ─────────────────────────────────────────────────────────────────────────
  // INTEGRACIÓN: savePreferencesAndRecommend — preferencias + recomendaciones
  // ─────────────────────────────────────────────────────────────────────────

  describe('savePreferencesAndRecommend — preferencias integradas con recomendaciones', () => {

    test('GIVEN usuario y preferencias válidas WHEN guarda preferencias THEN persiste y retorna recomendaciones', () => {
      // Arrange
      const userId = 'user-020';
      const preferences = { genres: ['drama'], platforms: ['netflix'], country: 'CO', language: 'es' };

      // Act
      const result = service.savePreferencesAndRecommend(userId, preferences);

      // Assert — integración: preferencias persisten en repositorio
      expect(repo.hasPreferences(userId)).toBe(true);
      const savedPrefs = repo.getPreferences(userId);
      expect(savedPrefs.genres).toEqual(['drama']);

      // Assert — integración: recomendaciones se generan desde las preferencias guardadas
      expect(result).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    test('GIVEN usuario guarda preferencias dos veces WHEN pide prefs THEN retorna las más recientes', () => {
      // Arrange
      const userId = 'user-021';
      service.savePreferencesAndRecommend(userId, { genres: ['comedia'] });

      // Act
      service.savePreferencesAndRecommend(userId, { genres: ['terror'] });

      // Assert — integración: el repositorio guarda el último estado
      const prefs = repo.getPreferences(userId);
      expect(prefs.genres).toEqual(['terror']);
    });

    test('GIVEN preferencias nulas WHEN intenta guardar THEN lanza error', () => {
      expect(() => service.savePreferencesAndRecommend('user-022', null)).toThrow();
    });

    test('GIVEN userId vacío WHEN intenta guardar preferencias THEN lanza error', () => {
      expect(() => service.savePreferencesAndRecommend('', { genres: ['drama'] })).toThrow('userId es requerido');
    });

  });

  // ─────────────────────────────────────────────────────────────────────────
  // INTEGRACIÓN: getCatalogWithUserContext — catálogo con contexto de usuario
  // ─────────────────────────────────────────────────────────────────────────

  describe('getCatalogWithUserContext — catálogo integrado con perfil de usuario', () => {

    test('GIVEN usuario sin preferencias WHEN pide catálogo THEN indica que no tiene preferencias', () => {
      const result = service.getCatalogWithUserContext('user-030', 'netflix');
      expect(result.userHasPreferences).toBe(false);
      expect(result.message).toContain('configura tus preferencias');
    });

    test('GIVEN usuario con preferencias WHEN pide catálogo THEN mensaje indica que tiene preferencias', () => {
      // Arrange
      const userId = 'user-031';
      service.savePreferencesAndRecommend(userId, { genres: ['drama'] });

      // Act
      const result = service.getCatalogWithUserContext(userId, 'netflix');

      // Assert — integración: el repo confirma que tiene preferencias
      expect(result.userHasPreferences).toBe(true);
      expect(result.message).toContain('tienes preferencias configuradas');
    });

    test('GIVEN plataforma válida WHEN pide catálogo THEN retorna películas de esa plataforma', () => {
      const result = service.getCatalogWithUserContext(null, 'disney');
      expect(result.platform).toBe('disney');
      expect(result.movies).toBeDefined();
      expect(result.count).toBeGreaterThan(0);
    });

  });

});
