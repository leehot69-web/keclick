import { useState, useEffect, useCallback } from 'react';

/**
 * useSessionStorage
 * Almacena datos SOLO en la pestaña actual (SessionStorage).
 * NO comparte datos con otras pestañas ni persiste al cerrar el navegador.
 * Ideal para sesiones de usuario concurrentes (Mesero en una pestaña, Cocina en otra).
 */
export function useSessionStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
    // 1. Inicializar estado desde sessionStorage si existe
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.sessionStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn('Error reading sessionStorage key:', key, error);
            return initialValue;
        }
    });

    // 2. Función para actualizar el valor (Memorizada)
    const setValue = useCallback((value: T | ((val: T) => T)) => {
        try {
            setStoredValue(prev => {
                const valueToStore = value instanceof Function ? value(prev) : value;

                // Guardar en sessionStorage
                if (typeof window !== 'undefined') {
                    window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
                }

                return valueToStore;
            });
        } catch (error) {
            console.warn('Error saving to sessionStorage key:', key, error);
        }
    }, [key]);

    return [storedValue, setValue];
}
