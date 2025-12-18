import type { Order, OrderSummary, CreateOrderRequest, CreateOrderResponse } from '../types/Order';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5108';

export const orderService = {
  async createOrder(orderRequest: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderRequest),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  async getOrder(orderId: string): Promise<Order> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  },

  async getCustomerOrders(customerId: string): Promise<OrderSummary[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/customer/${customerId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      throw error;
    }
  },

  async getAllOrders(): Promise<OrderSummary[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching all orders:', error);
      throw error;
    }
  }
};