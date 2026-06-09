/**
 * userSearchService.mock.integration.test.js
 *
 * PRUEBAS DE INTEGRACIÓN CON MOCKS — Jest mocks (equivalente a Mockito del taller)
 *
 * Cuando no queremos depender del FakeRepository ni de datos reales,
 * simulamos el repositorio con jest.fn() para:
 *   - Controlar exactamente qué retorna cada método
 *   - Verificar que se llamen los métodos correctos (equivalente a verify() de Mockito)
 *   - Simular errores controlados (equivalente a thenThrow() de Mockito)
 *
 * Equivale a RegistryWithMockTest.java del taller.
 *
 * Patrón: AAA (Arrange – Act – Assert) + BDD (Given – When – Then)
 */

import { jest } from '@jest/globals';
import { UserSearchService } from '../../src/services/userSearchService.js';

// Helper: crear mock del repositorio (equivalente a mock(RegistryRepositoryPort.class))
function createMockRepo() {
  return {
    saveSearch: jest.fn().mockReturnValue(true),
    getSearchHistory: jest.fn().mockReturnValue([]),
    savePreferences: jest.fn().mockReturnValue(true),
    getPreferences: jest.fn().mockReturnValue(null),
    hasPreferences: jest.fn().mockReturnValue(false),
    clear: jest.fn(),
  };
}

describe('UserSearchService — Pruebas de Integración con Mocks (Jest / Mockito)', () => {
  let mockRepo;
  let service;

  beforeEach(() => {
    mockRepo = createMockRepo();
    service = new UserSearchService(mockRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // MOCKS: verificar que saveSearch se invoca correctamente
  // Equivalente a: verify(repo).save(...) de Mockito
  // ─────────────────────────────────────────────────────────────────────────

  describe('Verificación de interacciones con el repositorio (verify)', () => {

    test('GIVEN búsqueda válida WHEN se ejecuta THEN saveSearch se invoca exactamente una vez', () => {
      // Act
      service.searchAndSave('user-mock-001', 'Narcos');

      // Assert — verify(repo).saveSearch(...) de Mockito
      expect(mockRepo.saveSearch).toHaveBeenCalledTimes(1);
      expect(mockRepo.saveSearch).toHaveBeenCalledWith(
        'user-mock-001',
        'Narcos',
        expect.any(Array)
      );
    });

    test('GIVEN userId inválido WHEN busca THEN saveSearch NUNCA se invoca', () => {
      // Act & Assert
      expect(() => service.searchAndSave(null, 'Narcos')).toThrow();

      // Assert — verify(repo, never()).saveSearch(...) de Mockito
      expect(mockRepo.saveSearch).not.toHaveBeenCalled();
    });

    test('GIVEN query vacía WHEN busca THEN saveSearch NUNCA se invoca', () => {
      service.searchAndSave('user-mock-002', '');
      expect(mockRepo.saveSearch).not.toHaveBeenCalled();
    });

    test('GIVEN usuario busca tres veces WHEN se revisa el repo THEN saveSearch se invocó tres veces', () => {
      service.searchAndSave('user-mock-003', 'Narcos');
      service.searchAndSave('user-mock-003', 'Encanto');
      service.searchAndSave('user-mock-003', 'Succession');

      expect(mockRepo.saveSearch).toHaveBeenCalledTimes(3);
    });

  });

  // ─────────────────────────────────────────────────────────────────────────
  // MOCKS: controlar lo que retorna el repositorio (when...thenReturn de Mockito)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Control del comportamiento del mock (when/thenReturn)', () => {

    test('GIVEN mock retorna historial con 2 entradas WHEN pide historial enriquecido THEN retorna 2 items', () => {
      // Arrange — when(repo.getSearchHistory(...)).thenReturn(...)
      mockRepo.getSearchHistory.mockReturnValue([
        { userId: 'u1', query: 'Narcos',  results: [{ title: 'Narcos', platforms: [{ name: 'Netflix' }] }] },
        { userId: 'u1', query: 'Encanto', results: [{ title: 'Encanto', platforms: [{ name: 'Disney+' }] }] },
      ]);

      const history = service.getEnrichedHistory('u1');

      expect(history).toHaveLength(2);
      expect(history[0].platforms).toContain('Netflix');
      expect(history[1].platforms).toContain('Disney+');
    });

    test('GIVEN mock indica que usuario ya tiene preferencias WHEN pide catálogo THEN mensaje es personalizado', () => {
      // Arrange — when(repo.hasPreferences(...)).thenReturn(true)
      mockRepo.hasPreferences.mockReturnValue(true);

      const result = service.getCatalogWithUserContext('user-X', 'netflix');

      expect(result.userHasPreferences).toBe(true);
      expect(result.message).toContain('tienes preferencias configuradas');
    });

    test('GIVEN mock retorna preferencias guardadas WHEN guarda y recomienda THEN usa las preferencias del mock', () => {
      // Arrange — when(repo.getPreferences(...)).thenReturn({...})
      mockRepo.getPreferences.mockReturnValue({ genres: ['drama'], platforms: ['netflix'] });

      const result = service.savePreferencesAndRecommend('user-Y', { genres: ['drama'] });

      expect(mockRepo.savePreferences).toHaveBeenCalledWith('user-Y', { genres: ['drama'] });
      expect(mockRepo.getPreferences).toHaveBeenCalledWith('user-Y');
      expect(result).toBeDefined();
    });

  });

  // ─────────────────────────────────────────────────────────────────────────
  // MOCKS: simular excepciones (when...thenThrow de Mockito)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Manejo de errores del repositorio (thenThrow)', () => {

    test('GIVEN repositorio lanza error en saveSearch WHEN busca THEN el error se propaga correctamente', () => {
      // Arrange — when(repo.saveSearch(...)).thenThrow(...)
      mockRepo.saveSearch.mockImplementation(() => {
        throw new Error('DB timeout: no se pudo conectar al repositorio');
      });

      expect(() => service.searchAndSave('user-err', 'Narcos')).toThrow('DB timeout');
    });

    test('GIVEN repositorio lanza error en getSearchHistory WHEN pide historial THEN lanza error', () => {
      mockRepo.getSearchHistory.mockImplementation(() => {
        throw new Error('Error de lectura en repositorio');
      });

      expect(() => service.getEnrichedHistory('user-err')).toThrow('Error de lectura');
    });

    test('GIVEN repositorio lanza error en savePreferences WHEN guarda preferencias THEN lanza error', () => {
      mockRepo.savePreferences.mockImplementation(() => {
        throw new Error('Repositorio lleno: límite de almacenamiento excedido');
      });

      expect(() =>
        service.savePreferencesAndRecommend('user-err', { genres: ['drama'] })
      ).toThrow('Repositorio lleno');
    });

  });

  // ─────────────────────────────────────────────────────────────────────────
  // MOCKS: secuencia de llamadas
  // ─────────────────────────────────────────────────────────────────────────

  describe('Secuencias de comportamiento del mock', () => {

    test('GIVEN mock con comportamiento secuencial WHEN busca dos veces THEN primera ok, segunda falla', () => {
      mockRepo.saveSearch
        .mockReturnValueOnce(true)
        .mockImplementationOnce(() => { throw new Error('Fallo intermitente'); });

      const firstResult = service.searchAndSave('user-seq', 'Narcos');
      expect(firstResult.found).toBeDefined();

      expect(() => service.searchAndSave('user-seq', 'Encanto')).toThrow('Fallo intermitente');
      expect(mockRepo.saveSearch).toHaveBeenCalledTimes(2);
    });

  });

  // ─────────────────────────────────────────────────────────────────────────
  // MOCKS: verificar que el servicio NO llama métodos que no debe (never)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Verificación de no-interacciones (never)', () => {

    test('GIVEN preferencias inválidas WHEN intenta guardar THEN savePreferences nunca se invoca', () => {
      expect(() => service.savePreferencesAndRecommend('user-never', null)).toThrow();
      expect(mockRepo.savePreferences).not.toHaveBeenCalled();
    });

    test('GIVEN userId nulo WHEN cualquier operación THEN repositorio no recibe ninguna llamada', () => {
      expect(() => service.searchAndSave(null, 'Narcos')).toThrow();

      expect(mockRepo.saveSearch).not.toHaveBeenCalled();
      expect(mockRepo.getSearchHistory).not.toHaveBeenCalled();
      expect(mockRepo.savePreferences).not.toHaveBeenCalled();
    });

  });

});
