// tests/unit/searchService.test.js
// Pruebas unitarias del servicio de búsqueda - TDD con patrón AAA y Given-When-Then

import {
  normalizeText,
  searchMovieByTitle,
  formatSearchResult,
  getMoviesByPlatform,
  getMoviesByGenre
} from '../../src/services/searchService.js';

// ============================================================
// SUITE: normalizeText
// ============================================================
describe('normalizeText', () => {

  // Given-When-Then: texto normal
  test('GIVEN un texto con mayúsculas y acentos WHEN se normaliza THEN retorna texto limpio en minúsculas', () => {
    // Arrange
    const input = 'Narración Épica';

    // Act
    const result = normalizeText(input);

    // Assert
    expect(result).toBe('narracion epica');
  });

  test('GIVEN un texto ya en minúsculas sin acentos WHEN se normaliza THEN retorna el mismo texto', () => {
    // Arrange
    const input = 'stranger things';

    // Act
    const result = normalizeText(input);

    // Assert
    expect(result).toBe('stranger things');
  });

  test('GIVEN un texto con espacios al inicio y fin WHEN se normaliza THEN los espacios son eliminados', () => {
    // Arrange
    const input = '   Narcos   ';

    // Act
    const result = normalizeText(input);

    // Assert
    expect(result).toBe('narcos');
  });

  test('GIVEN un valor null WHEN se normaliza THEN retorna cadena vacía', () => {
    // Arrange - Act
    const result = normalizeText(null);

    // Assert
    expect(result).toBe('');
  });

  test('GIVEN un valor undefined WHEN se normaliza THEN retorna cadena vacía', () => {
    expect(normalizeText(undefined)).toBe('');
  });

  test('GIVEN un número como argumento WHEN se normaliza THEN retorna cadena vacía', () => {
    expect(normalizeText(123)).toBe('');
  });

  test('GIVEN una cadena vacía WHEN se normaliza THEN retorna cadena vacía', () => {
    expect(normalizeText('')).toBe('');
  });

  test('GIVEN texto con acentos múltiples WHEN se normaliza THEN elimina todos los diacríticos', () => {
    // Arrange
    const input = 'ÁÉÍÓÚáéíóú';

    // Act
    const result = normalizeText(input);

    // Assert
    expect(result).toBe('aeiouaeiou');
  });
});


// ============================================================
// SUITE: searchMovieByTitle
// ============================================================
describe('searchMovieByTitle', () => {

  test('GIVEN un título exacto WHEN se busca THEN retorna la película con sus plataformas', () => {
    // Arrange
    const title = 'Narcos';

    // Act
    const results = searchMovieByTitle(title);

    // Assert
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Narcos');
    expect(results[0].platforms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'netflix', name: 'Netflix' })
      ])
    );
  });

  test('GIVEN un título parcial WHEN se busca THEN retorna las películas que coincidan', () => {
    // Arrange
    const title = 'avatar';

    // Act
    const results = searchMovieByTitle(title);

    // Assert
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toContain('Avatar');
  });

  test('GIVEN un título con diferentes mayúsculas WHEN se busca THEN retorna resultados sin importar el caso', () => {
    // Arrange
    const title = 'NARCOS';

    // Act
    const results = searchMovieByTitle(title);

    // Assert
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toBe('Narcos');
  });

  test('GIVEN un título inexistente WHEN se busca THEN retorna arreglo vacío', () => {
    // Arrange
    const title = 'PeliculaQueNoExisteXYZ';

    // Act
    const results = searchMovieByTitle(title);

    // Assert
    expect(results).toEqual([]);
    expect(results).toHaveLength(0);
  });

  test('GIVEN una cadena vacía WHEN se busca THEN retorna arreglo vacío', () => {
    expect(searchMovieByTitle('')).toEqual([]);
  });

  test('GIVEN null como título WHEN se busca THEN retorna arreglo vacío', () => {
    expect(searchMovieByTitle(null)).toEqual([]);
  });

  test('GIVEN solo espacios como título WHEN se busca THEN retorna arreglo vacío', () => {
    expect(searchMovieByTitle('   ')).toEqual([]);
  });

  test('GIVEN una película en múltiples plataformas WHEN se busca THEN retorna todas las plataformas', () => {
    // Arrange
    const title = 'Avatar';

    // Act
    const results = searchMovieByTitle(title);

    // Assert
    expect(results.length).toBeGreaterThan(0);
    const avatarMovie = results.find(r => r.title.includes('Avatar'));
    expect(avatarMovie).toBeDefined();
    expect(avatarMovie.platforms.length).toBeGreaterThanOrEqual(2);
  });

  test('GIVEN título con acentos WHEN se busca THEN funciona correctamente', () => {
    // Arrange - la BD tiene "Narcos" sin acento pero el usuario puede escribir "Nárcos"
    const results = searchMovieByTitle('Señor de los Anillos');

    // Assert
    expect(results.length).toBeGreaterThan(0);
  });

  test('GIVEN una búsqueda exitosa WHEN se retornan resultados THEN cada resultado tiene propiedades requeridas', () => {
    // Arrange
    const title = 'Succession';

    // Act
    const results = searchMovieByTitle(title);

    // Assert
    expect(results.length).toBeGreaterThan(0);
    results.forEach(result => {
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('platforms');
      expect(result).toHaveProperty('genre');
      expect(result).toHaveProperty('year');
      expect(result).toHaveProperty('rating');
      expect(result).toHaveProperty('description');
    });
  });
});


// ============================================================
// SUITE: formatSearchResult
// ============================================================
describe('formatSearchResult', () => {

  test('GIVEN resultados encontrados WHEN se formatean THEN retorna found=true con mensaje apropiado', () => {
    // Arrange
    const mockResults = [{
      id: 1,
      title: 'Narcos',
      platforms: [{ id: 'netflix', name: 'Netflix' }],
      genre: ['drama'],
      year: 2015,
      rating: 8.8,
      description: 'Descripción test'
    }];
    const query = 'Narcos';

    // Act
    const result = formatSearchResult(mockResults, query);

    // Assert
    expect(result.found).toBe(true);
    expect(result.query).toBe(query);
    expect(result.results).toHaveLength(1);
    expect(result.message).toContain('Narcos');
  });

  test('GIVEN arreglo vacío WHEN se formatea THEN retorna found=false con mensaje de no encontrado', () => {
    // Arrange
    const results = [];
    const query = 'PeliculaInexistente';

    // Act
    const formatted = formatSearchResult(results, query);

    // Assert
    expect(formatted.found).toBe(false);
    expect(formatted.results).toHaveLength(0);
    expect(formatted.message).toContain(query);
  });

  test('GIVEN null como resultados WHEN se formatea THEN retorna found=false', () => {
    // Act
    const result = formatSearchResult(null, 'test');

    // Assert
    expect(result.found).toBe(false);
  });

  test('GIVEN resultado con múltiples plataformas WHEN se formatea THEN el texto incluye todas las plataformas', () => {
    // Arrange
    const mockResults = [{
      id: 14,
      title: 'Avatar',
      platforms: [
        { id: 'disney', name: 'Disney+' },
        { id: 'amazon', name: 'Amazon Prime Video' }
      ],
      genre: ['accion'],
      year: 2022,
      rating: 7.6,
      description: 'Test'
    }];

    // Act
    const result = formatSearchResult(mockResults, 'Avatar');

    // Assert
    expect(result.results[0].platformsText).toContain('Disney+');
    expect(result.results[0].platformsText).toContain('Amazon Prime Video');
  });
});


// ============================================================
// SUITE: getMoviesByPlatform
// ============================================================
describe('getMoviesByPlatform', () => {

  test('GIVEN plataforma netflix WHEN se consulta THEN retorna solo películas de Netflix', () => {
    // Act
    const results = getMoviesByPlatform('netflix');

    // Assert
    expect(results.length).toBeGreaterThan(0);
    results.forEach(movie => {
      expect(movie.platforms).toContain('netflix');
    });
  });

  test('GIVEN plataforma disney WHEN se consulta THEN retorna películas de Disney+', () => {
    const results = getMoviesByPlatform('disney');
    expect(results.length).toBeGreaterThan(0);
    results.forEach(movie => {
      expect(movie.platforms).toContain('disney');
    });
  });

  test('GIVEN plataforma en mayúsculas WHEN se consulta THEN sigue funcionando correctamente', () => {
    const resultsLower = getMoviesByPlatform('netflix');
    const resultsUpper = getMoviesByPlatform('NETFLIX');
    // Ambas deberían funcionar - comparamos longitudes
    expect(resultsUpper.length).toBe(resultsLower.length);
  });

  test('GIVEN plataforma inexistente WHEN se consulta THEN retorna arreglo vacío', () => {
    const results = getMoviesByPlatform('hulu');
    expect(results).toEqual([]);
  });

  test('GIVEN null como plataforma WHEN se consulta THEN retorna arreglo vacío', () => {
    expect(getMoviesByPlatform(null)).toEqual([]);
  });
});


// ============================================================
// SUITE: getMoviesByGenre
// ============================================================
describe('getMoviesByGenre', () => {

  test('GIVEN género drama WHEN se busca THEN retorna películas del género drama', () => {
    // Act
    const results = getMoviesByGenre('drama');

    // Assert
    expect(results.length).toBeGreaterThan(0);
    results.forEach(movie => {
      const hasGenre = movie.genre.some(g => g.toLowerCase().includes('drama'));
      expect(hasGenre).toBe(true);
    });
  });

  test('GIVEN género acción con tilde WHEN se busca THEN retorna resultados correctamente', () => {
    const results = getMoviesByGenre('acción');
    expect(results.length).toBeGreaterThan(0);
  });

  test('GIVEN género inexistente WHEN se busca THEN retorna arreglo vacío', () => {
    const results = getMoviesByGenre('generoquenoexiste');
    expect(results).toEqual([]);
  });

  test('GIVEN null como género WHEN se busca THEN retorna arreglo vacío', () => {
    expect(getMoviesByGenre(null)).toEqual([]);
  });
});
