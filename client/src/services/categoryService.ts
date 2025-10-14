import type { Category } from '../types/Category';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:7001/api';

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }
};