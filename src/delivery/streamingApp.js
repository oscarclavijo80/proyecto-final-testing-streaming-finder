/**
 * streamingApp.js
 *
 * Servidor Express que expone la API REST del Streaming Finder.
 * Equivale al RegistryController del taller: esta capa (delivery/REST)
 * es la que se prueba en las PRUEBAS DE SISTEMA (caja negra).
 *
 * El módulo exporta la app sin hacer app.listen() para que los tests
 * de integración HTTP puedan montarla sin conflictos de puertos.
 */

import express from 'express';
import { UserSearchService } from '../services/userSearchService.js';
import { FakeMovieRepository } from '../fakes/fakeMovieRepository.js';

export function createApp(repository) {
  const app = express();
  app.use(express.json());

  // Inyección de dependencia: usa el repositorio provisto o uno fake por defecto
  const repo = repository || new FakeMovieRepository();
  const userSearchService = new UserSearchService(repo);

  /**
   * POST /search
   * Body: { userId: string, query: string }
   */
  app.post('/search', (req, res) => {
    const { userId, query } = req.body || {};

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId es requerido y debe ser string' });
    }

    try {
      const result = userSearchService.searchAndSave(userId, query);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /history/:userId
   */
  app.get('/history/:userId', (req, res) => {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: 'userId requerido' });

    const history = userSearchService.getEnrichedHistory(userId);
    return res.status(200).json({ userId, history, count: history.length });
  });

  /**
   * POST /preferences
   * Body: { userId, genres, platforms, country, language, minRating }
   */
  app.post('/preferences', (req, res) => {
    const { userId, ...preferences } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: 'userId es requerido' });
    }
    if (!preferences || Object.keys(preferences).length === 0) {
      return res.status(422).json({ error: 'Se requiere al menos una preferencia (genres, platforms, etc.)' });
    }

    try {
      const result = userSearchService.savePreferencesAndRecommend(userId, preferences);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /catalog/:platform
   * Query: ?userId=string (opcional)
   */
  app.get('/catalog/:platform', (req, res) => {
    const { platform } = req.params;
    const { userId } = req.query;

    const result = userSearchService.getCatalogWithUserContext(userId || null, platform);

    if (result.count === 0 && !['netflix', 'disney', 'hbo', 'amazon'].includes(platform)) {
      return res.status(404).json({ error: `Plataforma '${platform}' no encontrada` });
    }

    return res.status(200).json(result);
  });

  return app;
}
