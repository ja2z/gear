import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = 'http://localhost:3001/api';

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

  return {
    loading,
    error,
    getData: fetchData,
    postData,
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
      // Fallback to mock data if API fails - only set once
      if (!hasLoaded) {
        setCategories([
          { name: 'TENT', description: 'Tents', availableCount: 8, totalCount: 12 },
          { name: 'SLEEP', description: 'Sleeping Bags', availableCount: 15, totalCount: 20 },
          { name: 'COOK', description: 'Cooking Equipment', availableCount: 25, totalCount: 30 },
          { name: 'WATER', description: 'Water Treatment', availableCount: 10, totalCount: 12 },
          { name: 'NAV', description: 'Navigation', availableCount: 5, totalCount: 8 },
          { name: 'FIRST', description: 'First Aid', availableCount: 3, totalCount: 5 },
        ]);
        setHasLoaded(true);
      }
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
        // Fallback to mock data if API fails
        setItems([
          { itemId: `${category}-001`, description: 'Sample Item 1', condition: 'Usable', status: 'Available' },
          { itemId: `${category}-002`, description: 'Sample Item 2', condition: 'Usable', status: 'Available' },
          { itemId: `${category}-003`, description: 'Sample Item 3', condition: 'Usable', status: 'Not available' },
        ]);
        setLoadedCategory(category);
      } finally {
        setIsLoading(false);
      }
    };

    loadItems();
  }, [category, getData, loadedCategory]);

  return { items, loading: isLoading, error };
};
