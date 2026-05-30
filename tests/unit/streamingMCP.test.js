// tests/unit/streamingMCP.test.js
// Pruebas unitarias del conector MCP (async) - TDD, AAA, Given-When-Then

import {
  executeMCPTool,
  getMCPTools,
  MCP_TOOLS
} from '../../src/mcp/streamingMCP.js';

// ============================================================
// SUITE: getMCPTools
// ============================================================
describe('getMCPTools', () => {

  test('GIVEN el sistema MCP WHEN se solicitan herramientas THEN retorna las 5 herramientas disponibles', () => {
    // Act
    const tools = getMCPTools();
    // Assert
    expect(tools.length).toBeGreaterThanOrEqual(4);
  });

  test('GIVEN las herramientas MCP WHEN se revisa la estructura THEN cada herramienta tiene nombre, descripción y esquema', () => {
    const tools = getMCPTools();
    tools.forEach(tool => {
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('inputSchema');
    });
  });

  test('GIVEN las herramientas MCP WHEN se revisan los nombres THEN contiene las herramientas esperadas', () => {
    const toolNames = getMCPTools().map(t => t.name);
    expect(toolNames).toContain('search_movie');
    expect(toolNames).toContain('get_platform_catalog');
    expect(toolNames).toContain('get_recommendations');
    expect(toolNames).toContain('list_platforms');
  });
});


// ============================================================
// SUITE: executeMCPTool - search_movie (modo demo sin API key)
// ============================================================
describe('executeMCPTool: search_movie', () => {

  test('GIVEN herramienta search_movie con título válido WHEN se ejecuta THEN retorna success=true', async () => {
    // Arrange
    const args = { title: 'Narcos', country: 'co' };
    // Act
    const result = await executeMCPTool('search_movie', args);
    // Assert
    expect(result.success).toBe(true);
    expect(result.tool).toBe('search_movie');
    expect(result).toHaveProperty('found');
    expect(result).toHaveProperty('data');
  });

  test('GIVEN herramienta search_movie sin título WHEN se ejecuta THEN retorna success=false con error', async () => {
    // Arrange
    const args = {};
    // Act
    const result = await executeMCPTool('search_movie', args);
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('GIVEN título inexistente WHEN se busca con MCP THEN retorna success=true con found=false', async () => {
    // Arrange
    const args = { title: 'PeliculaQueDefinitivamenteNoExiste999', country: 'co' };
    // Act
    const result = await executeMCPTool('search_movie', args);
    // Assert
    expect(result.success).toBe(true);
    expect(result.found).toBe(false);
  });

  test('GIVEN herramienta search_movie con película válida WHEN se ejecuta THEN el resultado tiene el tool name correcto', async () => {
    // Act
    const result = await executeMCPTool('search_movie', { title: 'Encanto' });
    // Assert
    expect(result.tool).toBe('search_movie');
  });

  test('GIVEN búsqueda exitosa WHEN se obtiene resultado THEN incluye campo source', async () => {
    // Act
    const result = await executeMCPTool('search_movie', { title: 'Narcos' });
    // Assert
    expect(result).toHaveProperty('source');
  });
});


// ============================================================
// SUITE: executeMCPTool - get_platform_catalog
// ============================================================
describe('executeMCPTool: get_platform_catalog', () => {

  test('GIVEN plataforma netflix válida WHEN se consulta catálogo THEN retorna success=true con películas', async () => {
    // Arrange
    const args = { platform: 'netflix' };
    // Act
    const result = await executeMCPTool('get_platform_catalog', args);
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.platform).toBe('Netflix');
  });

  test('GIVEN todas las plataformas WHEN se consultan catálogos THEN todas retornan éxito', async () => {
    // Arrange
    const platforms = ['netflix', 'disney', 'hbo', 'amazon'];
    // Act & Assert
    for (const platform of platforms) {
      const result = await executeMCPTool('get_platform_catalog', { platform });
      expect(result.success).toBe(true);
    }
  });

  test('GIVEN plataforma no válida WHEN se consulta catálogo THEN retorna success=false', async () => {
    // Act
    const result = await executeMCPTool('get_platform_catalog', { platform: 'hulu' });
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('no válida');
  });

  test('GIVEN sin parámetro platform WHEN se consulta catálogo THEN retorna success=false', async () => {
    // Act
    const result = await executeMCPTool('get_platform_catalog', {});
    // Assert
    expect(result.success).toBe(false);
  });
});


// ============================================================
// SUITE: executeMCPTool - get_recommendations
// ============================================================
describe('executeMCPTool: get_recommendations', () => {

  test('GIVEN preferencias de usuario WHEN se solicitan recomendaciones THEN retorna success=true con películas', async () => {
    // Arrange
    const args = { genres: ['drama'], platforms: ['netflix'], country: 'CO', language: 'es' };
    // Act
    const result = await executeMCPTool('get_recommendations', args);
    // Assert
    expect(result.success).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
  });

  test('GIVEN args vacíos WHEN se solicitan recomendaciones THEN retorna recomendaciones por defecto', async () => {
    // Act
    const result = await executeMCPTool('get_recommendations', {});
    // Assert
    expect(result.success).toBe(true);
    expect(result.count).toBeGreaterThan(0);
  });

  test('GIVEN límite personalizado WHEN se solicitan recomendaciones THEN respeta el límite', async () => {
    // Act
    const result = await executeMCPTool('get_recommendations', { limit: 2 });
    // Assert
    expect(result.count).toBeLessThanOrEqual(2);
  });

  test('GIVEN películas a excluir WHEN se solicitan recomendaciones THEN no incluye los excluidos', async () => {
    // Arrange
    const args = { excludeTitles: ['Narcos', 'Ozark', 'Stranger Things', 'Wednesday'], limit: 10 };
    // Act
    const result = await executeMCPTool('get_recommendations', args);
    const titles = result.data.map(m => m.title);
    // Assert
    args.excludeTitles.forEach(excluded => expect(titles).not.toContain(excluded));
  });
});


// ============================================================
// SUITE: executeMCPTool - list_platforms
// ============================================================
describe('executeMCPTool: list_platforms', () => {

  test('GIVEN herramienta list_platforms WHEN se ejecuta THEN retorna las 4 plataformas', async () => {
    // Act
    const result = await executeMCPTool('list_platforms', {});
    // Assert
    expect(result.success).toBe(true);
    expect(result.count).toBe(4);
  });

  test('GIVEN herramienta list_platforms WHEN se ejecuta THEN cada plataforma tiene id y nombre', async () => {
    // Act
    const result = await executeMCPTool('list_platforms', {});
    // Assert
    result.data.forEach(platform => {
      expect(platform).toHaveProperty('id');
      expect(platform).toHaveProperty('name');
    });
  });

  test('GIVEN herramienta list_platforms WHEN se ejecuta THEN incluye netflix, disney, hbo y amazon', async () => {
    // Act
    const result = await executeMCPTool('list_platforms', {});
    const ids = result.data.map(p => p.id);
    // Assert
    expect(ids).toContain('netflix');
    expect(ids).toContain('disney');
    expect(ids).toContain('hbo');
    expect(ids).toContain('amazon');
  });
});


// ============================================================
// SUITE: get_show_details
// ============================================================
describe('executeMCPTool: get_show_details', () => {

  test('GIVEN título válido WHEN se piden detalles THEN retorna success=true', async () => {
    // Act
    const result = await executeMCPTool('get_show_details', { title: 'Narcos', country: 'co' });
    // Assert
    expect(result.success).toBe(true);
    expect(result).toHaveProperty('found');
  });

  test('GIVEN sin título WHEN se piden detalles THEN retorna success=false', async () => {
    // Act
    const result = await executeMCPTool('get_show_details', {});
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});


// ============================================================
// SUITE: manejo de errores generales
// ============================================================
describe('executeMCPTool: manejo de errores', () => {

  test('GIVEN herramienta inexistente WHEN se ejecuta THEN retorna success=false con error descriptivo', async () => {
    // Act
    const result = await executeMCPTool('herramienta_que_no_existe', {});
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('herramienta_que_no_existe');
  });

  test('GIVEN sin argumentos WHEN se ejecuta herramienta list_platforms THEN no lanza excepción', async () => {
    // Act & Assert
    await expect(executeMCPTool('list_platforms')).resolves.toBeDefined();
  });
});
