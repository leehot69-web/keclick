
import { useState, useEffect, useRef, useCallback } from 'react';

// Nombre de la base de datos y almacén
const DB_NAME = 'SistemaPedidosDB';
const STORE_NAME = 'kv_store';
const DB_VERSION = 1;

/**
 * Gestor de IndexedDB (Referenciado por el usuario como "dijn")
 * Proporciona una interfaz simple de llave-valor sobre IndexedDB.
 */
class IndexedDBManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async get(key: string): Promise<any> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async set(key: string, value: any): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

const dbManager = new IndexedDBManager();

/**
 * useLocalStorage (Ahora usa IndexedDB internamente)
 * Mantenemos el nombre para evitar romper la estructura actual del proyecto.
 * Implementa una estrategia de "Caché en Memoria + Persistencia en DB" para 
 * mantener la fluidez de la UI sin cambios en el diseño.
 */
export function useLocalStorage<T>(key: string, initialValue: T | (() => T)): [T, (value: T | ((val: T) => T)) => void] {
  // Inicializamos con el valor inicial o lo que haya en localStorage (como caché rápido)
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        if (parsed !== null && parsed !== undefined) return parsed;
      }
      return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
    } catch (error) {
      return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
    }
  });

  // Cargar desde IndexedDB al montar el componente
  useEffect(() => {
    let isMounted = true;
    dbManager.get(key).then((value) => {
      if (isMounted && value !== undefined && value !== null) {
        setStoredValue(value);
        // Sincronizar caché de localStorage
        try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { }
      }
    }).catch(err => console.warn('Error cargando de DB:', err));

    return () => { isMounted = false; };
  }, [key]);

  // Función para actualizar el valor (Memorizada para evitar bucles infinitos)
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      setStoredValue(prev => {
        const valueToStore = value instanceof Function ? value(prev) : value;

        // 2. Persistir en localStorage (Caché rápido)
        try { window.localStorage.setItem(key, JSON.stringify(valueToStore)); } catch (e) { }

        // 3. Persistir en IndexedDB ("Dijn")
        dbManager.set(key, valueToStore).catch(err => console.error('Error guardando en DB:', err));

        return valueToStore;
      });
    } catch (error) {
      console.error('Error en setValue:', error);
    }
  }, [key]);

  // Escuchar cambios desde otras pestañas/ventanas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed !== null && parsed !== undefined) setStoredValue(parsed);
        } catch (e) { }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}
