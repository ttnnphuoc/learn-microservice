import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Modal, Descriptions, List, Typography, Space, message, Input } from 'antd';
import { EyeOutlined, ReloadOutlined, UserOutlined } from '@ant-design/icons';
import { orderService } from '../services/orderService';
import type { Order, OrderSummary, OrderStatusColors } from '../types/Order';

const { Search } = Input;
const { Title, Text } = Typography;

export const OrderTable: React.FC = () => {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await orderService.getAllOrders();
      setOrders(data);
    } catch (error) {
      message.error('Failed to fetch orders');
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = async (orderId: string) => {
    setModalLoading(true);
    setModalVisible(true);
    try {
      const order = await orderService.getOrder(orderId);
      setSelectedOrder(order);
    } catch (error) {
      message.error('Failed to fetch order details');
      console.error('Error fetching order details:', error);
    } finally {
      setModalLoading(false);
    }
  };

  const handleSearchByCustomer = async (customerId: string) => {
    if (!customerId.trim()) {
      fetchOrders();
      return;
    }

    setLoading(true);
    try {
      const data = await orderService.getCustomerOrders(customerId);
      setOrders(data);
    } catch (error) {
      message.error('Failed to fetch customer orders');
      console.error('Error fetching customer orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'orderId',
      key: 'orderId',
      render: (text: string) => (
        <Text code style={{ fontSize: '12px' }}>
          {text.substring(0, 8)}...
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={OrderStatusColors[status as keyof typeof OrderStatusColors] || 'default'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Items',
      dataIndex: 'itemCount',
      key: 'itemCount',
      render: (count: number) => (
        <Text>{count} item{count !== 1 ? 's' : ''}</Text>
      ),
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => (
        <Text strong>${amount.toFixed(2)}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: OrderSummary) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewOrder(record.orderId)}
          >
            View
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Orders</Title>
        <Space>
          <Search
            placeholder="Search by Customer ID"
            allowClear
            style={{ width: 250 }}
            onSearch={handleSearchByCustomer}
            enterButton={<UserOutlined />}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchOrders}
            loading={loading}
          >
            Refresh
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={orders}
        rowKey="orderId"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} orders`,
        }}
        scroll={{ x: 800 }}
      />

      <Modal
        title="Order Details"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
        loading={modalLoading}
      >
        {selectedOrder && (
          <div>
            <Descriptions
              title="Order Information"
              bordered
              column={2}
              style={{ marginBottom: '24px' }}
            >
              <Descriptions.Item label="Order ID" span={2}>
                <Text code>{selectedOrder.orderId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Customer ID">
                <Text code>{selectedOrder.customerId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={OrderStatusColors[selectedOrder.status as keyof typeof OrderStatusColors] || 'default'}>
                  {selectedOrder.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Created At">
                {new Date(selectedOrder.createdAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Total Amount">
                <Text strong style={{ fontSize: '16px' }}>
                  ${selectedOrder.totalAmount.toFixed(2)}
                </Text>
              </Descriptions.Item>
              {selectedOrder.notes && (
                <Descriptions.Item label="Notes" span={2}>
                  {selectedOrder.notes}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Title level={4}>Order Items</Title>
            <List
              itemLayout="horizontal"
              dataSource={selectedOrder.items}
              renderItem={(item, index) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong>{item.productName}</Text>
                        <Text strong>${item.totalPrice.toFixed(2)}</Text>
                      </div>
                    }
                    description={
                      <div>
                        <Text type="secondary">Product ID: </Text>
                        <Text code style={{ fontSize: '12px' }}>
                          {item.productId.substring(0, 8)}...
                        </Text>
                        <br />
                        <Text type="secondary">
                          Quantity: {item.quantity} × ${item.price.toFixed(2)} each
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};