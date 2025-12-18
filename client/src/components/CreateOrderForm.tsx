import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  Space, 
  InputNumber, 
  Select, 
  message, 
  Table, 
  Typography,
  Divider,
  Row,
  Col
} from 'antd';
import { PlusOutlined, DeleteOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import type { CreateOrderRequest, CreateOrderItemRequest } from '../types/Order';
import type { Product } from '../types/Product';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export const CreateOrderForm: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<CreateOrderItemRequest[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const data = await productService.getProducts();
      setProducts(data);
    } catch (error) {
      message.error('Failed to fetch products');
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const addOrderItem = () => {
    setOrderItems([...orderItems, {
      productId: '',
      productName: '',
      quantity: 1,
      price: 0
    }]);
  };

  const removeOrderItem = (index: number) => {
    const newItems = orderItems.filter((_, i) => i !== index);
    setOrderItems(newItems);
  };

  const updateOrderItem = (index: number, field: keyof CreateOrderItemRequest, value: any) => {
    const newItems = [...orderItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-fill product name and price when product is selected
    if (field === 'productId' && value) {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct) {
        newItems[index].productName = selectedProduct.name;
        newItems[index].price = selectedProduct.price;
      }
    }
    
    setOrderItems(newItems);
  };

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => total + (item.quantity * item.price), 0);
  };

  const handleSubmit = async (values: any) => {
    if (orderItems.length === 0) {
      message.error('Please add at least one item to the order');
      return;
    }

    // Validate all items are complete
    const incompleteItems = orderItems.some(item => 
      !item.productId || !item.productName || item.quantity <= 0 || item.price <= 0
    );

    if (incompleteItems) {
      message.error('Please complete all order items');
      return;
    }

    setLoading(true);
    try {
      const orderRequest: CreateOrderRequest = {
        customerId: values.customerId,
        items: orderItems,
        notes: values.notes
      };

      const response = await orderService.createOrder(orderRequest);
      message.success(`Order created successfully! Order ID: ${response.orderId.substring(0, 8)}...`);
      
      // Reset form
      form.resetFields();
      setOrderItems([]);
    } catch (error) {
      message.error('Failed to create order');
      console.error('Error creating order:', error);
    } finally {
      setLoading(false);
    }
  };

  const itemColumns = [
    {
      title: 'Product',
      dataIndex: 'productId',
      key: 'productId',
      render: (_: any, record: CreateOrderItemRequest, index: number) => (
        <Select
          style={{ width: '100%' }}
          placeholder="Select product"
          value={record.productId || undefined}
          onChange={(value) => updateOrderItem(index, 'productId', value)}
          loading={productsLoading}
          showSearch
          optionFilterProp="children"
        >
          {products.map(product => (
            <Option key={product.id} value={product.id}>
              {product.name} - ${product.price.toFixed(2)}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      render: (_: any, record: CreateOrderItemRequest, index: number) => (
        <InputNumber
          min={1}
          value={record.quantity}
          onChange={(value) => updateOrderItem(index, 'quantity', value || 1)}
        />
      ),
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (_: any, record: CreateOrderItemRequest) => (
        <Text>${record.price.toFixed(2)}</Text>
      ),
    },
    {
      title: 'Total',
      key: 'total',
      width: 120,
      render: (_: any, record: CreateOrderItemRequest) => (
        <Text strong>${(record.quantity * record.price).toFixed(2)}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_: any, record: CreateOrderItemRequest, index: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeOrderItem(index)}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={3} style={{ marginBottom: '24px', textAlign: 'center' }}>
          <ShoppingCartOutlined /> Create New Order
        </Title>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="Customer ID"
                name="customerId"
                rules={[
                  { required: true, message: 'Please enter customer ID' },
                  { 
                    pattern: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, 
                    message: 'Please enter a valid UUID' 
                  }
                ]}
              >
                <Input placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Notes (Optional)"
                name="notes"
              >
                <TextArea placeholder="Order notes..." rows={2} />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>Order Items</Title>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={addOrderItem}
            >
              Add Item
            </Button>
          </div>

          <Table
            dataSource={orderItems}
            columns={itemColumns}
            pagination={false}
            rowKey={(_, index) => index?.toString() || '0'}
            locale={{ emptyText: 'No items added yet. Click "Add Item" to start.' }}
            style={{ marginBottom: '24px' }}
          />

          {orderItems.length > 0 && (
            <div style={{ textAlign: 'right', marginBottom: '24px' }}>
              <Space>
                <Text>Total Amount:</Text>
                <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                  ${calculateTotal().toFixed(2)}
                </Text>
              </Space>
            </div>
          )}

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'center' }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                disabled={orderItems.length === 0}
                icon={<ShoppingCartOutlined />}
              >
                Create Order
              </Button>
              <Button
                size="large"
                onClick={() => {
                  form.resetFields();
                  setOrderItems([]);
                }}
              >
                Reset
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};