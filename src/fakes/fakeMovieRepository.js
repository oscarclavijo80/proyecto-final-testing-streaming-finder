/**
 * FakeMovieRepository
 *
 * Repositorio falso que simula persistencia usando un Map en memoria.
 * Equivalente al patrón "FakeRepository" del taller (alternativa a Mockito/H2).
 *
 * Útil para pruebas de integración rápidas sin dependencias externas.
 */
export class FakeMovieRepository {
  constructor() {
    /** @type {Map<string, Object>} almacenamiento en memoria */
    this._store = new Map();
    /** @type {Array} log de operaciones para verificar interacciones */
    this._callLog = [];
  }

  saveSearch(userId, query, results) {
    this._callLog.push({ method: 'saveSearch', args: { userId, query, results } });
    const key = `${userId}:${query}`;
    this._store.set(key, { userId, query, results, timestamp: new Date().toISOString() });
    return true;
  }

  getSearchHistory(userId) {
    this._callLog.push({ method: 'getSearchHistory', args: { userId } });
    const history = [];
    for (const [, value] of this._store.entries()) {
      if (value.userId === userId) history.push(value);
    }
    return history;
  }

  savePreferences(userId, preferences) {
    this._callLog.push({ method: 'savePreferences', args: { userId, preferences } });
    this._store.set(`prefs:${userId}`, { userId, preferences });
    return true;
  }

  getPreferences(userId) {
    this._callLog.push({ method: 'getPreferences', args: { userId } });
    const entry = this._store.get(`prefs:${userId}`);
    return entry ? entry.preferences : null;
  }

  hasPreferences(userId) {
    this._callLog.push({ method: 'hasPreferences', args: { userId } });
    return this._store.has(`prefs:${userId}`);
  }

  clear() {
    this._store.clear();
    this._callLog = [];
  }

  getCallLog() {
    return [...this._callLog];
  }

  wasCalledWith(method, matcher = () => true) {
    return this._callLog.some(entry => entry.method === method && matcher(entry.args));
  }

  callCount(method) {
    return this._callLog.filter(e => e.method === method).length;
  }
}
