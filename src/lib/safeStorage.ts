// Utilitario seguro para localStorage e sessionStorage com fallback em memoria
// Protege a aplicacao contra "Access to storage is not allowed from this context"
// causado por politicas de privacidade do navegador, iframes, modo anonimo ou extensoes de terceiros.

const memoryStorage: Record<string, string> = {};

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Contexto sem permissao de storage
    }
    return memoryStorage[key] ?? null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Contexto sem permissao de storage ou cota excedida
    }
    memoryStorage[key] = value;
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Contexto sem permissao de storage
    }
    delete memoryStorage[key];
  }
};

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && 'sessionStorage' in window) {
        return window.sessionStorage.getItem(key);
      }
    } catch {
      // Contexto sem permissao de storage
    }
    return memoryStorage[key] ?? null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && 'sessionStorage' in window) {
        window.sessionStorage.setItem(key, value);
      }
    } catch {
      // Contexto sem permissao de storage ou cota excedida
    }
    memoryStorage[key] = value;
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && 'sessionStorage' in window) {
        window.sessionStorage.removeItem(key);
      }
    } catch {
      // Contexto sem permissao de storage
    }
    delete memoryStorage[key];
  }
};
