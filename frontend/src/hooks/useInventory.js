import { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:3001/api';

export const useInventory = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async (endpoint) => {
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
  };

  const postData = async (endpoint, data) => {
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
  };

  return {
    loading,
    error,
    fetchData,
    postData,
  };
};

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const { loading, error, fetchData } = useInventory();

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchData('/inventory/categories');
        setCategories(data);
      } catch (err) {
        console.error('Failed to load categories:', err);
        // Fallback to mock data if API fails
        setCategories([
          { name: 'TENT', description: 'Tents', availableCount: 8, totalCount: 12 },
          { name: 'SLEEP', description: 'Sleeping Bags', availableCount: 15, totalCount: 20 },
          { name: 'COOK', description: 'Cooking Equipment', availableCount: 25, totalCount: 30 },
          { name: 'WATER', description: 'Water Treatment', availableCount: 10, totalCount: 12 },
          { name: 'NAV', description: 'Navigation', availableCount: 5, totalCount: 8 },
          { name: 'FIRST', description: 'First Aid', availableCount: 3, totalCount: 5 },
        ]);
      }
    };

    loadCategories();
  }, []);

  return { categories, loading, error };
};

export const useItems = (category) => {
  const [items, setItems] = useState([]);
  const { loading, error, fetchData } = useInventory();

  useEffect(() => {
    if (!category) return;

    const loadItems = async () => {
      try {
        const data = await fetchData(`/inventory/items/${category}`);
        setItems(data);
      } catch (err) {
        console.error('Failed to load items:', err);
        // Fallback to mock data if API fails
        setItems([
          { itemId: `${category}-001`, description: 'Sample Item 1', condition: 'Usable', status: 'Available' },
          { itemId: `${category}-002`, description: 'Sample Item 2', condition: 'Usable', status: 'Available' },
          { itemId: `${category}-003`, description: 'Sample Item 3', condition: 'Usable', status: 'Not available' },
        ]);
      }
    };

    loadItems();
  }, [category]);

  return { items, loading, error };
};
