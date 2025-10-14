export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  category?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}