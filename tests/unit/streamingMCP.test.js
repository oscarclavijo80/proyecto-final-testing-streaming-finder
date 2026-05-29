// tests/unit/streamingMCP.test.js
// Pruebas unitarias del conector MCP - TDD, AAA, Given-When-Then

import {
  executeMCPTool,
  getMCPTools,
  MCP_TOOLS
} from '../../src/mcp/streamingMCP.js';

// ============================================================
// SUITE: getMCPTools
// ============================================================
describe('getMCPTools', () => {

  test('GIVEN el sistema MCP WHEN se solicitan herramientas THEN retorna las 4 herramientas disponibles', () => {
    // Act
    const tools = getMCPTools();

    // Assert
    expect(tools).toHaveLength(4);
  });

  test('GIVEN las herramientas MCP WHEN se revisa la estructura THEN cada herramienta tiene nombre, descripción y esquema', () => {
    // Act
    const tools = getMCPTools();

    // Assert
    tools.forEach(tool => {
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('inputSchema');
      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
    });
  });

  test('GIVEN las herramientas MCP WHEN se revisan los nombres THEN contiene las herramientas esperadas', () => {
    // Act
    const tools = getMCPTools();
    const toolNames = tools.map(t => t.name);

    // Assert
    expect(toolNames).toContain('search_movie');
    expect(toolNames).toContain('get_platform_catalog');
    expect(toolNames).toContain('get_recommendations');
    expect(toolNames).toContain('list_platforms');
  });
});


// ============================================================
// SUITE: executeMCPTool - search_movie
// ============================================================
describe('executeMCPTool: search_movie', () => {

  test('GIVEN herramienta search_movie con título válido WHEN se ejecuta THEN retorna success=true con resultados', () => {
    // Arrange
    const toolName = 'search_movie';
    const args = { title: 'Narcos' };

    // Act
    const result = executeMCPTool(toolName, args);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.count).toBeGreaterThan(0);
  });

  test('GIVEN herramienta search_movie sin título WHEN se ejecuta THEN retorna success=false con error', () => {
    // Arrange
    const toolName = 'search_movie';
    const args = {};

    // Act
    const result = executeMCPTool(toolName, args);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('GIVEN título inexistente WHEN se busca con MCP THEN retorna success=true con count=0', () => {
    // Arrange
    const args = { title: 'PeliculaQueDefinitivamenteNoExiste' };

    // Act
    const result = executeMCPTool('search_movie', args);

    // Assert
    expect(result.success).toBe(true);
    expect(result.count).toBe(0);
  });

  test('GIVEN herramienta search_movie con película válida WHEN se ejecuta THEN el resultado contiene el tool name', () => {
    // Act
    const result = executeMCPTool('search_movie', { title: 'Loki' });

    // Assert
    expect(result.tool).toBe('search_movie');
  });
});


// ============================================================
// SUITE: executeMCPTool - get_platform_catalog
// ============================================================
describe('executeMCPTool: get_platform_catalog', () => {

  test('GIVEN plataforma netflix válida WHEN se consulta catálogo THEN retorna success=true con películas', () => {
    // Arrange
    const args = { platform: 'netflix' };

    // Act
    const result = executeMCPTool('get_platform_catalog', args);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.platform).toBe('Netflix');
  });

  test('GIVEN todas las plataformas WHEN se consultan catálogos THEN todas retornan éxito', () => {
    // Arrange
    const platforms = ['netflix', 'disney', 'hbo', 'amazon'];

    // Act & Assert
    platforms.forEach(platform => {
      const result = executeMCPTool('get_platform_catalog', { platform });
      expect(result.success).toBe(true);
      expect(result.count).toBeGreaterThan(0);
    });
  });

  test('GIVEN plataforma no válida WHEN se consulta catálogo THEN retorna success=false', () => {
    // Arrange
    const args = { platform: 'hulu' };

    // Act
    const result = executeMCPTool('get_platform_catalog', args);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('no válida');
  });

  test('GIVEN sin parámetro platform WHEN se consulta catálogo THEN retorna success=false', () => {
    // Act
    const result = executeMCPTool('get_platform_catalog', {});

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});


// ============================================================
// SUITE: executeMCPTool - get_recommendations
// ============================================================
describe('executeMCPTool: get_recommendations', () => {

  test('GIVEN preferencias de usuario WHEN se solicitan recomendaciones THEN retorna success=true con películas', () => {
    // Arrange
    const args = {
      genres: ['drama'],
      platforms: ['netflix'],
      country: 'CO',
      language: 'es'
    };

    // Act
    const result = executeMCPTool('get_recommendations', args);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
  });

  test('GIVEN args vacíos WHEN se solicitan recomendaciones THEN retorna recomendaciones por defecto', () => {
    // Act
    const result = executeMCPTool('get_recommendations', {});

    // Assert
    expect(result.success).toBe(true);
    expect(result.count).toBeGreaterThan(0);
  });

  test('GIVEN límite personalizado WHEN se solicitan recomendaciones THEN respeta el límite', () => {
    // Arrange
    const args = { limit: 2 };

    // Act
    const result = executeMCPTool('get_recommendations', args);

    // Assert
    expect(result.count).toBeLessThanOrEqual(2);
  });

  test('GIVEN películas a excluir WHEN se solicitan recomendaciones THEN no incluye los excluidos', () => {
    // Arrange
    const args = {
      excludeTitles: ['Narcos', 'Ozark', 'Stranger Things', 'Wednesday'],
      limit: 10
    };

    // Act
    const result = executeMCPTool('get_recommendations', args);
    const titles = result.data.map(m => m.title);

    // Assert
    args.excludeTitles.forEach(excluded => {
      expect(titles).not.toContain(excluded);
    });
  });
});


// ============================================================
// SUITE: executeMCPTool - list_platforms
// ============================================================
describe('executeMCPTool: list_platforms', () => {

  test('GIVEN herramienta list_platforms WHEN se ejecuta THEN retorna las 4 plataformas', () => {
    // Act
    const result = executeMCPTool('list_platforms', {});

    // Assert
    expect(result.success).toBe(true);
    expect(result.count).toBe(4);
  });

  test('GIVEN herramienta list_platforms WHEN se ejecuta THEN cada plataforma tiene id y nombre', () => {
    // Act
    const result = executeMCPTool('list_platforms', {});

    // Assert
    result.data.forEach(platform => {
      expect(platform).toHaveProperty('id');
      expect(platform).toHaveProperty('name');
    });
  });

  test('GIVEN herramienta list_platforms WHEN se ejecuta THEN incluye netflix, disney, hbo y amazon', () => {
    // Act
    const result = executeMCPTool('list_platforms', {});
    const ids = result.data.map(p => p.id);

    // Assert
    expect(ids).toContain('netflix');
    expect(ids).toContain('disney');
    expect(ids).toContain('hbo');
    expect(ids).toContain('amazon');
  });
});


// ============================================================
// SUITE: executeMCPTool - herramienta desconocida
// ============================================================
describe('executeMCPTool: manejo de errores', () => {

  test('GIVEN herramienta inexistente WHEN se ejecuta THEN retorna success=false con error descriptivo', () => {
    // Arrange
    const toolName = 'herramienta_que_no_existe';

    // Act
    const result = executeMCPTool(toolName, {});

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain(toolName);
  });

  test('GIVEN sin argumentos WHEN se ejecuta herramienta THEN usa args por defecto sin error de runtime', () => {
    // Act - no debe lanzar excepción
    expect(() => executeMCPTool('list_platforms')).not.toThrow();
  });
});
