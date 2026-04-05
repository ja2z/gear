import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiBaseUrl } from '../config/apiBaseUrl';

const API_BASE_URL = getApiBaseUrl();

// Request cache to prevent duplicate API calls
const requestCache = new Map();

// Module-level 401 handler — set by AuthProvider on mount.
let _onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { _onUnauthorized = fn; };

export const useInventory = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (endpoint, forceRefresh = false) => {
    setLoading(true);
    setError(null);
    
    try {
      // If force refresh is requested, clear cache for this endpoint
      if (forceRefresh) {
        requestCache.delete(endpoint);
      }
      
      // Check if this exact request is already in progress
      if (requestCache.has(endpoint)) {
        const cachedData = await requestCache.get(endpoint);
        return cachedData;
      }
      
      // Start new request and cache the promise
      const requestPromise = fetch(`${API_BASE_URL}${endpoint}`, {
        credentials: 'include',
      })
        .then(async (response) => {
          if (response.status === 401) {
            requestCache.clear();
            _onUnauthorized?.();
            throw new Error('Unauthorized');
          }
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          return data;
        });
      
      // Cache the promise immediately
      requestCache.set(endpoint, requestPromise);
      
      const data = await requestPromise;
      
      // Clean up cache immediately after successful completion
      requestCache.delete(endpoint);
      
      return data;
    } catch (err) {
      setError(err.message);
      // Clean up cache on error
      requestCache.delete(endpoint);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const postData = useCallback(async (endpoint, data) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (response.status === 401) {
        requestCache.clear();
        _onUnauthorized?.();
        throw new Error('Unauthorized');
      }
      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const patchData = useCallback(async (endpoint, data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        requestCache.clear();
        _onUnauthorized?.();
        throw new Error('Unauthorized');
      }
      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteData = useCallback(async (endpoint) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        requestCache.clear();
        _onUnauthorized?.();
        throw new Error('Unauthorized');
      }
      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCache = useCallback(() => {
    requestCache.clear();
  }, []);

  return {
    loading,
    error,
    getData: fetchData,
    postData,
    patchData,
    deleteData,
    checkHealth,
    clearCache,
  };
};

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const { error, getData } = useInventory();

  const loadCategories = async (forceRefresh = false) => {
    if (hasLoaded && !forceRefresh) return;
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;

    if (!hasLoaded) {
      setIsLoading(true);
    }

    try {
      const data = await getData('/inventory/categories');
      setCategories(data);
      setHasLoaded(true);
    } catch (err) {
      console.error('Failed to load categories:', err);
      setCategories([]);
      setHasLoaded(true);
      throw err;
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  return {
    categories,
    loading: isLoading,
    error,
    refreshCategories: () => loadCategories(true),
  };
};

export const useItems = (category) => {
  const [items, setItems] = useState([]);
  const [loadedCategory, setLoadedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { error, getData } = useInventory();

  useEffect(() => {
    if (!category) {
      setItems([]);
      setLoadedCategory(null);
      return;
    }

    // Only load if category changed
    if (loadedCategory === category) return;

    const loadItems = async () => {
      // Only show loading if we don't have cached data for this category
      if (loadedCategory !== category) {
        setIsLoading(true);
      }
      
      try {
        const data = await getData(`/inventory/items/${category}`);
        setItems(data);
        setLoadedCategory(category);
      } catch (err) {
        console.error('Failed to load items:', err);
        // Fail fast - no fallback data
        setItems([]);
        setLoadedCategory(category);
        throw err; // Re-throw to let calling components handle the error
      } finally {
        setIsLoading(false);
      }
    };

    loadItems();
  }, [category, getData, loadedCategory]);

  return { items, loading: isLoading, error };
};

export const useReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/reservations`, { credentials: 'include' });
      if (response.status === 401) { _onUnauthorized?.(); throw new Error('Unauthorized'); }
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setReservations(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReservationItems = useCallback(async (eventId) => {
    const response = await fetch(`${API_BASE_URL}/reservations/${eventId}`, { credentials: 'include' });
    if (response.status === 401) { _onUnauthorized?.(); throw new Error('Unauthorized'); }
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  }, []);

  const postReservation = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (response.status === 401) { _onUnauthorized?.(); throw new Error('Unauthorized'); }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { reservations, loading, error, fetchReservations, fetchReservationItems, postReservation };
};
