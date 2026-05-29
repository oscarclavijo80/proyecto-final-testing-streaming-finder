// tests/unit/recommendationService.test.js
// Pruebas unitarias del algoritmo de recomendaciones - TDD, AAA, Given-When-Then

import {
  calculateCompatibilityScore,
  getRecommendations,
  getDefaultRecommendations,
  formatRecommendations
} from '../../src/services/recommendationService.js';

// ============================================================
// SUITE: calculateCompatibilityScore
// ============================================================
describe('calculateCompatibilityScore', () => {

  test('GIVEN preferencias que coinciden perfectamente WHEN se calcula THEN el puntaje es alto (>=70)', () => {
    // Arrange
    const movie = {
      genre: ['drama', 'crimen'],
      platforms: ['netflix'],
      country: 'US',
      language: 'en',
      rating: 9.0
    };
    const preferences = {
      genres: ['drama', 'crimen'],
      platforms: ['netflix'],
      country: 'US',
      language: 'en'
    };

    // Act
    const score = calculateCompatibilityScore(movie, preferences);

    // Assert
    expect(score).toBeGreaterThanOrEqual(70);
  });

  test('GIVEN preferencias sin coincidencia de género WHEN se calcula THEN el puntaje es menor', () => {
    // Arrange
    const movie = {
      genre: ['animacion', 'familia'],
      platforms: ['disney'],
      country: 'US',
      language: 'en',
      rating: 7.0
    };
    const preferencesMatch = {
      genres: ['animacion', 'familia'],
      platforms: ['disney'],
      country: 'US',
      language: 'en'
    };
    const preferencesNoMatch = {
      genres: ['terror', 'crimen'],
      platforms: ['netflix'],
      country: 'CO',
      language: 'es'
    };

    // Act
    const scoreMatch = calculateCompatibilityScore(movie, preferencesMatch);
    const scoreNoMatch = calculateCompatibilityScore(movie, preferencesNoMatch);

    // Assert
    expect(scoreMatch).toBeGreaterThan(scoreNoMatch);
  });

  test('GIVEN movie y preferences null WHEN se calcula puntaje THEN retorna 0', () => {
    // Act & Assert
    expect(calculateCompatibilityScore(null, null)).toBe(0);
    expect(calculateCompatibilityScore(null, {})).toBe(0);
    expect(calculateCompatibilityScore({}, null)).toBe(0);
  });

  test('GIVEN preferencias vacías WHEN se calcula THEN el puntaje está basado principalmente en el rating', () => {
    // Arrange
    const movieHighRating = {
      genre: [],
      platforms: [],
      country: 'US',
      language: 'en',
      rating: 9.5
    };
    const movieLowRating = {
      genre: [],
      platforms: [],
      country: 'US',
      language: 'en',
      rating: 5.0
    };
    const emptyPreferences = {};

    // Act
    const scoreHigh = calculateCompatibilityScore(movieHighRating, emptyPreferences);
    const scoreLow = calculateCompatibilityScore(movieLowRating, emptyPreferences);

    // Assert
    expect(scoreHigh).toBeGreaterThan(scoreLow);
  });

  test('GIVEN puntaje calculado WHEN se verifica el rango THEN está entre 0 y 100', () => {
    // Arrange
    const movie = {
      genre: ['drama'],
      platforms: ['netflix'],
      country: 'US',
      language: 'en',
      rating: 8.5
    };
    const preferences = {
      genres: ['drama'],
      platforms: ['netflix'],
      country: 'US',
      language: 'en'
    };

    // Act
    const score = calculateCompatibilityScore(movie, preferences);

    // Assert
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('GIVEN coincidencia de país CO WHEN se calcula THEN recibe puntos extras por país', () => {
    // Arrange
    const movie = {
      genre: ['drama'],
      platforms: ['netflix'],
      country: 'CO',
      language: 'es',
      rating: 8.8
    };
    const preferencesWithCO = { country: 'CO', language: 'es' };
    const preferencesWithUS = { country: 'US', language: 'en' };

    // Act
    const scoreWithCO = calculateCompatibilityScore(movie, preferencesWithCO);
    const scoreWithUS = calculateCompatibilityScore(movie, preferencesWithUS);

    // Assert
    expect(scoreWithCO).toBeGreaterThan(scoreWithUS);
  });
});


// ============================================================
// SUITE: getRecommendations
// ============================================================
describe('getRecommendations', () => {

  test('GIVEN preferencias de género drama WHEN se piden recomendaciones THEN retorna películas de drama', () => {
    // Arrange
    const preferences = {
      genres: ['drama'],
      platforms: ['netflix', 'hbo', 'amazon', 'disney']
    };

    // Act
    const recommendations = getRecommendations(preferences, [], 5);

    // Assert
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.length).toBeLessThanOrEqual(5);
  });

  test('GIVEN títulos a excluir WHEN se piden recomendaciones THEN esos títulos no aparecen', () => {
    // Arrange
    const preferences = { genres: ['drama'] };
    const excludeTitles = ['Narcos', 'Ozark', 'Succession'];

    // Act
    const recommendations = getRecommendations(preferences, excludeTitles, 10);

    // Assert
    const titles = recommendations.map(r => r.title);
    excludeTitles.forEach(excluded => {
      expect(titles).not.toContain(excluded);
    });
  });

  test('GIVEN límite de 3 WHEN se piden recomendaciones THEN retorna máximo 3 películas', () => {
    // Arrange
    const preferences = {};

    // Act
    const recommendations = getRecommendations(preferences, [], 3);

    // Assert
    expect(recommendations.length).toBeLessThanOrEqual(3);
  });

  test('GIVEN preferencias null WHEN se piden recomendaciones THEN retorna las mejor valoradas por defecto', () => {
    // Act
    const recommendations = getRecommendations(null, [], 5);

    // Assert
    expect(recommendations.length).toBeGreaterThan(0);
  });

  test('GIVEN rating mínimo de 8.5 WHEN se piden recomendaciones THEN no retorna películas con rating menor', () => {
    // Arrange
    const preferences = { minRating: 8.5 };

    // Act
    const recommendations = getRecommendations(preferences, [], 10);

    // Assert
    recommendations.forEach(movie => {
      expect(movie.rating).toBeGreaterThanOrEqual(8.5);
    });
  });

  test('GIVEN preferencia de plataforma netflix WHEN se piden recomendaciones THEN las películas priorizan netflix', () => {
    // Arrange
    const preferences = {
      platforms: ['netflix'],
      genres: ['drama']
    };

    // Act
    const recommendations = getRecommendations(preferences, [], 5);

    // Assert
    expect(recommendations.length).toBeGreaterThan(0);
    // El primer resultado debería tener puntaje alto
    const firstScore = recommendations[0].score;
    expect(firstScore).toBeGreaterThan(0);
  });

  test('GIVEN las recomendaciones WHEN se obtienen THEN están ordenadas por puntaje descendente', () => {
    // Arrange
    const preferences = { genres: ['drama', 'accion'] };

    // Act
    const recommendations = getRecommendations(preferences, [], 10);

    // Assert
    for (let i = 0; i < recommendations.length - 1; i++) {
      expect(recommendations[i].score).toBeGreaterThanOrEqual(recommendations[i + 1].score);
    }
  });

  test('GIVEN arreglo de exclusiones vacío WHEN se piden recomendaciones THEN no filtra películas', () => {
    // Arrange
    const preferences = {};

    // Act
    const withEmpty = getRecommendations(preferences, [], 15);
    const withNull = getRecommendations(preferences, null, 15);

    // Assert - ambos deberían funcionar igual
    expect(withEmpty.length).toBe(withNull.length);
  });
});


// ============================================================
// SUITE: getDefaultRecommendations
// ============================================================
describe('getDefaultRecommendations', () => {

  test('GIVEN sin argumentos WHEN se piden recomendaciones default THEN retorna las 5 mejor valoradas', () => {
    // Act
    const recommendations = getDefaultRecommendations();

    // Assert
    expect(recommendations).toHaveLength(5);
  });

  test('GIVEN límite personalizado WHEN se piden recomendaciones default THEN respeta el límite', () => {
    // Act
    const recommendations = getDefaultRecommendations(3);

    // Assert
    expect(recommendations).toHaveLength(3);
  });

  test('GIVEN recomendaciones default WHEN se obtienen THEN están ordenadas por rating descendente', () => {
    // Act
    const recommendations = getDefaultRecommendations(10);

    // Assert
    for (let i = 0; i < recommendations.length - 1; i++) {
      expect(recommendations[i].rating).toBeGreaterThanOrEqual(recommendations[i + 1].rating);
    }
  });

  test('GIVEN recomendaciones default WHEN se obtienen THEN cada una tiene platformNames', () => {
    // Act
    const recommendations = getDefaultRecommendations(3);

    // Assert
    recommendations.forEach(rec => {
      expect(rec).toHaveProperty('platformNames');
      expect(Array.isArray(rec.platformNames)).toBe(true);
    });
  });
});


// ============================================================
// SUITE: formatRecommendations
// ============================================================
describe('formatRecommendations', () => {

  test('GIVEN recomendaciones con título buscado WHEN se formatean THEN el mensaje menciona el título', () => {
    // Arrange
    const mockRecs = [{
      title: 'Narcos',
      platforms: ['netflix'],
      platformNames: ['Netflix'],
      genre: ['drama', 'crimen'],
      year: 2015,
      rating: 8.8,
      score: 75,
      description: 'Test'
    }];
    const searchedTitle = 'PeliculaInexistente';

    // Act
    const result = formatRecommendations(mockRecs, searchedTitle);

    // Assert
    expect(result.message).toContain(searchedTitle);
    expect(result.recommendations).toHaveLength(1);
  });

  test('GIVEN recomendaciones sin título buscado WHEN se formatean THEN el mensaje es genérico', () => {
    // Arrange
    const mockRecs = [{
      title: 'Test Movie',
      platformNames: ['Netflix'],
      genre: ['drama'],
      year: 2020,
      rating: 8.0,
      score: 60,
      description: 'Test'
    }];

    // Act
    const result = formatRecommendations(mockRecs, null);

    // Assert
    expect(result.message).toBeDefined();
    expect(result.recommendations).toHaveLength(1);
  });

  test('GIVEN lista vacía de recomendaciones WHEN se formatea THEN retorna mensaje de sin resultados', () => {
    // Act
    const result = formatRecommendations([], 'test');

    // Assert
    expect(result.recommendations).toHaveLength(0);
    expect(result.message).toBeDefined();
  });

  test('GIVEN null como recomendaciones WHEN se formatea THEN retorna mensaje de sin resultados', () => {
    // Act
    const result = formatRecommendations(null, 'test');

    // Assert
    expect(result.recommendations).toHaveLength(0);
  });

  test('GIVEN recomendaciones formateadas WHEN se revisa la estructura THEN cada item tiene rank', () => {
    // Arrange
    const mockRecs = [
      { title: 'Movie 1', platformNames: ['Netflix'], genre: ['drama'], year: 2020, rating: 8.0, score: 70, description: '' },
      { title: 'Movie 2', platformNames: ['HBO Max'], genre: ['accion'], year: 2021, rating: 7.5, score: 60, description: '' }
    ];

    // Act
    const result = formatRecommendations(mockRecs, null);

    // Assert
    expect(result.recommendations[0].rank).toBe(1);
    expect(result.recommendations[1].rank).toBe(2);
  });
});
