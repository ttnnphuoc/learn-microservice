import type { Location } from '../types/Location';

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const locationService = {
  async getLocations(): Promise<Location[]> {
    try {
      const response = await fetch(`${API_BASE_URL}locations/all`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }
  }
};