export interface Order {
  orderId: string;
  customerId: string;
  status: OrderStatus;
  createdAt: string;
  totalAmount: number;
  notes?: string;
  items: OrderItem[];
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

export interface OrderSummary {
  orderId: string;
  status: string;
  createdAt: string;
  totalAmount: number;
  itemCount: number;
}

export interface CreateOrderRequest {
  customerId: string;
  items: CreateOrderItemRequest[];
  notes?: string;
}

export interface CreateOrderItemRequest {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface CreateOrderResponse {
  orderId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

export enum OrderStatus {
  Pending = 'Pending',
  Confirmed = 'Confirmed', 
  Cancelled = 'Cancelled',
  Shipped = 'Shipped',
  Delivered = 'Delivered'
}

export const OrderStatusColors = {
  [OrderStatus.Pending]: 'orange',
  [OrderStatus.Confirmed]: 'green',
  [OrderStatus.Cancelled]: 'red',
  [OrderStatus.Shipped]: 'blue',
  [OrderStatus.Delivered]: 'purple'
};