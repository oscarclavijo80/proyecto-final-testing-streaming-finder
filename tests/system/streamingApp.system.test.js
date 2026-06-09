/**
 * streamingApp.system.test.js
 *
 * PRUEBAS DE SISTEMA — caja negra sobre endpoints HTTP
 *
 * Verifican el comportamiento completo del sistema desde la interfaz REST,
 * sin importar la implementación interna. El test solo sabe de:
 *   - URL del endpoint
 *   - Body JSON enviado
 *   - Status HTTP y cuerpo de respuesta esperados
 *
 * Equivale a RegistryControllerIT.java del taller.
 * Usa supertest para lanzar peticiones HTTP sin abrir un puerto real.
 *
 * Patrón: AAA (Arrange – Act – Assert)
 */

import request from 'supertest';
import { createApp } from '../../src/delivery/streamingApp.js';
import { FakeMovieRepository } from '../../src/fakes/fakeMovieRepository.js';

describe('Streaming Finder API — Pruebas de Sistema (HTTP / caja negra)', () => {
  let app;
  let repo;

  /**
   * Arrange: levantar la app con un repositorio limpio antes de cada test.
   * Equivalente a @SpringBootTest(webEnvironment = RANDOM_PORT) del taller.
   */
  beforeEach(() => {
    repo = new FakeMovieRepository();
    app = createApp(repo);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /search — búsqueda de películas
  // ──────────────────────────────────────────────────────────────────────────

  describe('POST /search', () => {

    test('GIVEN película existente WHEN hace POST /search THEN retorna 200 con found=true', async () => {
      // Arrange
      const body = { userId: 'user-sys-001', query: 'Narcos' };

      // Act
      const response = await request(app)
        .post('/search')
        .send(body)
        .set('Content-Type', 'application/json');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.found).toBe(true);
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    test('GIVEN película inexistente WHEN hace POST /search THEN retorna 200 con found=false', async () => {
      const response = await request(app)
        .post('/search')
        .send({ userId: 'user-sys-002', query: 'PeliculaNoExiste_XYZ_999' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.found).toBe(false);
    });

    test('GIVEN sin userId WHEN hace POST /search THEN retorna 400 Bad Request', async () => {
      const response = await request(app)
        .post('/search')
        .send({ query: 'Narcos' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('GIVEN userId como número WHEN hace POST /search THEN retorna 400', async () => {
      const response = await request(app)
        .post('/search')
        .send({ userId: 12345, query: 'Narcos' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });

    test('GIVEN body vacío WHEN hace POST /search THEN retorna 400', async () => {
      const response = await request(app)
        .post('/search')
        .send({})
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });

    test('GIVEN búsqueda válida WHEN el sistema responde THEN el body tiene estructura correcta', async () => {
      const response = await request(app)
        .post('/search')
        .send({ userId: 'user-sys-006', query: 'Avatar' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('found');
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('message');
    });

  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /history/:userId — historial de búsquedas
  // ──────────────────────────────────────────────────────────────────────────

  describe('GET /history/:userId', () => {

    test('GIVEN usuario con búsquedas previas WHEN hace GET /history THEN retorna 200 con historial', async () => {
      // Arrange — primero hacemos una búsqueda
      await request(app).post('/search').send({ userId: 'user-hist-001', query: 'Narcos' });

      // Act
      const response = await request(app).get('/history/user-hist-001');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.userId).toBe('user-hist-001');
      expect(response.body.count).toBe(1);
    });

    test('GIVEN usuario sin búsquedas WHEN hace GET /history THEN retorna 200 con historial vacío', async () => {
      const response = await request(app).get('/history/usuario-nuevo-sin-historial');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(0);
      expect(response.body.history).toHaveLength(0);
    });

    test('GIVEN múltiples búsquedas WHEN hace GET /history THEN retorna todas', async () => {
      await request(app).post('/search').send({ userId: 'user-hist-002', query: 'Narcos' });
      await request(app).post('/search').send({ userId: 'user-hist-002', query: 'Encanto' });
      await request(app).post('/search').send({ userId: 'user-hist-002', query: 'Succession' });

      const response = await request(app).get('/history/user-hist-002');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(3);
    });

  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /preferences — guardar preferencias y obtener recomendaciones
  // ──────────────────────────────────────────────────────────────────────────

  describe('POST /preferences', () => {

    test('GIVEN preferencias válidas WHEN hace POST /preferences THEN retorna 200 con recomendaciones', async () => {
      const response = await request(app)
        .post('/preferences')
        .send({ userId: 'user-pref-001', genres: ['drama'], platforms: ['netflix'], country: 'CO', language: 'es' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    test('GIVEN sin userId WHEN hace POST /preferences THEN retorna 400', async () => {
      const response = await request(app)
        .post('/preferences')
        .send({ genres: ['drama'] })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('GIVEN userId pero sin preferencias WHEN hace POST /preferences THEN retorna 422', async () => {
      const response = await request(app)
        .post('/preferences')
        .send({ userId: 'user-pref-002' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(422);
    });

  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /catalog/:platform — catálogo por plataforma
  // ──────────────────────────────────────────────────────────────────────────

  describe('GET /catalog/:platform', () => {

    test('GIVEN plataforma netflix válida WHEN hace GET /catalog/netflix THEN retorna 200 con películas', async () => {
      const response = await request(app).get('/catalog/netflix');

      expect(response.status).toBe(200);
      expect(response.body.platform).toBe('netflix');
      expect(response.body.count).toBeGreaterThan(0);
    });

    test('GIVEN plataforma disney WHEN hace GET /catalog/disney THEN retorna 200', async () => {
      const response = await request(app).get('/catalog/disney');
      expect(response.status).toBe(200);
      expect(response.body.count).toBeGreaterThan(0);
    });

    test('GIVEN plataforma inexistente WHEN hace GET /catalog THEN retorna 404', async () => {
      const response = await request(app).get('/catalog/plataforma_que_no_existe');
      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });

    test('GIVEN usuario con preferencias y plataforma WHEN pide catálogo THEN mensaje indica preferencias', async () => {
      // Arrange — guardar preferencias primero
      await request(app)
        .post('/preferences')
        .send({ userId: 'user-cat-001', genres: ['drama'] });

      // Act
      const response = await request(app).get('/catalog/netflix?userId=user-cat-001');

      // Assert — end-to-end: preferencias → catálogo personalizado
      expect(response.status).toBe(200);
      expect(response.body.userHasPreferences).toBe(true);
    });

  });

  // ──────────────────────────────────────────────────────────────────────────
  // FLUJOS COMPLETOS — end-to-end
  // ──────────────────────────────────────────────────────────────────────────

  describe('Flujos completos de usuario (end-to-end)', () => {

    test('GIVEN usuario nuevo WHEN completa flujo búsqueda→historial THEN sistema responde coherentemente', async () => {
      const userId = 'user-e2e-001';

      // Step 1: buscar
      const searchResp = await request(app).post('/search').send({ userId, query: 'Narcos' });
      expect(searchResp.status).toBe(200);
      expect(searchResp.body.found).toBe(true);

      // Step 2: verificar historial
      const histResp = await request(app).get(`/history/${userId}`);
      expect(histResp.status).toBe(200);
      expect(histResp.body.count).toBe(1);
      expect(histResp.body.history[0].query).toBe('Narcos');
    });

    test('GIVEN usuario configura preferencias WHEN pide catálogo THEN el sistema muestra estado personalizado', async () => {
      const userId = 'user-e2e-002';

      // Step 1: guardar preferencias
      const prefResp = await request(app)
        .post('/preferences')
        .send({ userId, genres: ['drama'], platforms: ['netflix'] });
      expect(prefResp.status).toBe(200);

      // Step 2: pedir catálogo con userId
      const catResp = await request(app).get(`/catalog/netflix?userId=${userId}`);
      expect(catResp.status).toBe(200);
      expect(catResp.body.userHasPreferences).toBe(true);
    });

  });

});
