import { useState, useEffect, useCallback } from 'react';

// Configure API base URL based on environment
// In development: Vite proxy will handle /api requests to backend
// In production: Use full backend URL since frontend and backend are on different domains
const API_BASE_URL = import.meta.env.PROD 
  ? (import.meta.env.VITE_API_URL || 'https://gear-backend.onrender.com/api')
  : '/api';

export const useInventory = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (endpoint) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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

  const postData = useCallback(async (endpoint, data) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
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

  return {
    loading,
    error,
    getData: fetchData,
    postData,
    checkHealth,
  };
};

export const useCategories = (shouldSync = false) => {
  const [categories, setCategories] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { error, getData } = useInventory();

  const loadCategories = async (forceRefresh = false, syncFromSheets = false) => {
    if (hasLoaded && !forceRefresh) return; // Prevent multiple loads unless forced
    
    // Only show loading if we don't have cached data
    if (!hasLoaded) {
      setIsLoading(true);
    }
    
    try {
      const endpoint = syncFromSheets ? '/inventory/categories?sync=true' : '/inventory/categories';
      const data = await getData(endpoint);
      setCategories(data);
      setHasLoaded(true);
    } catch (err) {
      console.error('Failed to load categories:', err);
      // Fail fast - no fallback data
      setCategories([]);
      setHasLoaded(true);
      throw err; // Re-throw to let calling components handle the error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories(false, shouldSync);
  }, [getData, hasLoaded, shouldSync]);

  return { 
    categories, 
    loading: isLoading, // Only show loading when actually loading, not when using cache
    error, 
    refreshCategories: () => loadCategories(true, true) // Manual refresh always syncs
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
