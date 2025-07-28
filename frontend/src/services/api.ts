import axios from 'axios';
import {
  RabbitMQConnection,
  RabbitMQConnectionCreate,
  ConnectionTestResult,
  ClusterDiscovery,
  PublishMessage,
  PublishResult,
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const connectionApi = {
  // Get all connections
  getConnections: async (): Promise<RabbitMQConnection[]> => {
    const response = await api.get('/connections');
    return response.data;
  },

  // Get a specific connection
  getConnection: async (id: number): Promise<RabbitMQConnection> => {
    const response = await api.get(`/connections/${id}`);
    return response.data;
  },

  // Create a new connection
  createConnection: async (connection: RabbitMQConnectionCreate): Promise<RabbitMQConnection> => {
    const response = await api.post('/connections', connection);
    return response.data;
  },

  // Update a connection
  updateConnection: async (id: number, connection: Partial<RabbitMQConnectionCreate>): Promise<RabbitMQConnection> => {
    const response = await api.put(`/connections/${id}`, connection);
    return response.data;
  },

  // Delete a connection
  deleteConnection: async (id: number): Promise<void> => {
    await api.delete(`/connections/${id}`);
  },

  // Test a connection
  testConnection: async (id: number): Promise<ConnectionTestResult> => {
    const response = await api.post(`/connections/${id}/test`);
    return response.data;
  },
};

export const discoveryApi = {
  // Discover cluster objects
  discoverCluster: async (connectionId: number): Promise<ClusterDiscovery> => {
    const response = await api.get(`/discovery/${connectionId}/cluster`);
    return response.data;
  },

  // Get queues
  getQueues: async (connectionId: number, vhost?: string) => {
    const params = vhost ? { vhost } : {};
    const response = await api.get(`/discovery/${connectionId}/queues`, { params });
    return response.data;
  },

  // Get exchanges
  getExchanges: async (connectionId: number, vhost?: string) => {
    const params = vhost ? { vhost } : {};
    const response = await api.get(`/discovery/${connectionId}/exchanges`, { params });
    return response.data;
  },

  // Get vhosts
  getVHosts: async (connectionId: number) => {
    const response = await api.get(`/discovery/${connectionId}/vhosts`);
    return response.data;
  },

  // Get users
  getUsers: async (connectionId: number) => {
    const response = await api.get(`/discovery/${connectionId}/users`);
    return response.data;
  },
};

export const publisherApi = {
  // Publish a message
  publishMessage: async (message: PublishMessage): Promise<PublishResult> => {
    const response = await api.post('/publisher/publish', message);
    return response.data;
  },

  // Validate publish parameters
  validatePublishParams: async (message: PublishMessage) => {
    const response = await api.post('/publisher/validate', message);
    return response.data;
  },
};

export const consumerApi = {
  // Get active consumers
  getActiveConsumers: async () => {
    const response = await api.get('/consumer/active');
    return response.data;
  },

  // Stop a consumer
  stopConsumer: async (consumerId: string) => {
    const response = await api.post(`/consumer/stop/${consumerId}`);
    return response.data;
  },

  // Create WebSocket connection for consuming
  createConsumerWebSocket: (connectionId: number): WebSocket => {
    const wsUrl = API_BASE_URL.replace('http', 'ws').replace('/api', '');
    return new WebSocket(`${wsUrl}/api/consumer/consume/${connectionId}`);
  },
};

export default api;
