import React, { useState, useEffect } from 'react';
import { Card, Table, Spin, Alert, Typography, Descriptions } from 'antd';
import { API_BASE_URL } from '../../config';

const { Title } = Typography;

/**
 * SimulationDetails component to display detailed information about a simulation
 */
const SimulationDetails = ({ simulationId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState(null);

  useEffect(() => {
    if (simulationId) {
      fetchSimulationDetails();
    }
  }, [simulationId]);

  const fetchSimulationDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/simulations/${simulationId}/details`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch simulation details: ${response.statusText}`);
      }
      
      const data = await response.json();
      setDetails(data);
    } catch (error) {
      console.error('Error fetching simulation details:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin />
          <div style={{ marginTop: '10px' }}>Loading simulation details...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
        />
      </Card>
    );
  }

  if (!details) {
    return (
      <Card>
        <Alert
          message="No details available"
          description="Select a simulation to view its details"
          type="info"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card>
      <Title level={4}>Simulation Details</Title>
      
      <Descriptions bordered column={2}>
        <Descriptions.Item label="Simulation ID">{simulationId}</Descriptions.Item>
        <Descriptions.Item label="Status">{details.status}</Descriptions.Item>
        <Descriptions.Item label="Created At">{new Date(details.created_at).toLocaleString()}</Descriptions.Item>
        <Descriptions.Item label="Completed At">{details.completed_at ? new Date(details.completed_at).toLocaleString() : 'N/A'}</Descriptions.Item>
        <Descriptions.Item label="Runtime">{details.runtime ? `${details.runtime.toFixed(2)} seconds` : 'N/A'}</Descriptions.Item>
        <Descriptions.Item label="Material">{details.material}</Descriptions.Item>
        <Descriptions.Item label="Temperature">{details.temperature} K</Descriptions.Item>
        <Descriptions.Item label="Pressure">{details.pressure} Pa</Descriptions.Item>
      </Descriptions>
      
      {details.physics_parameters && (
        <>
          <Title level={4} style={{ marginTop: '20px' }}>Physics Parameters</Title>
          <Descriptions bordered column={2}>
            {Object.entries(details.physics_parameters).map(([key, value]) => (
              <Descriptions.Item key={key} label={key.replace(/_/g, ' ')}>
                {typeof value === 'number' ? value.toExponential(4) : JSON.stringify(value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </>
      )}
      
      {details.events && (
        <>
          <Title level={4} style={{ marginTop: '20px' }}>Event Log</Title>
          <Table
            dataSource={details.events.map((event, index) => ({ ...event, key: index }))}
            columns={[
              {
                title: 'Timestamp',
                dataIndex: 'timestamp',
                key: 'timestamp',
                render: (text) => new Date(text).toLocaleString()
              },
              {
                title: 'Event Type',
                dataIndex: 'type',
                key: 'type',
              },
              {
                title: 'Message',
                dataIndex: 'message',
                key: 'message',
              }
            ]}
            pagination={{ pageSize: 10 }}
          />
        </>
      )}
    </Card>
  );
};

export default SimulationDetails; 