import React, { useEffect, useState } from 'react';
import { Table, Typography, message, Card, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Location } from '../types/Location';
import { locationService } from '../services/locationService';

const { Title } = Typography;

const LocationTable: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const data = await locationService.getLocations();
      setLocations(data);
    } catch (error) {
      message.error('Failed to fetch locations');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = () => {
    message.info('Add Location functionality coming soon!');
  };

  const columns: ColumnsType<Location> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (description: string) => description || 'No description',
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Locations</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAddLocation}
        >
          Add Location
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={locations}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} items`,
        }}
        scroll={{ x: 'max-content' }}
      />
    </Card>
  );
};

export default LocationTable;