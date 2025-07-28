import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import axios from 'axios';

const Connections = () => {
  const [connections, setConnections] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState(null);
  const [testingConnection, setTestingConnection] = useState(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      host: 'localhost',
      port: 5672,
      username: 'guest',
      password: 'guest',
      vhost: '/',
      ssl: false
    }
  });

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await axios.get('/api/connections/');
      setConnections(response.data);
    } catch (error) {
      toast.error('Failed to fetch connections');
      console.error('Error fetching connections:', error);
    }
  };

  const onSubmit = async (data) => {
    try {
      // Transform data to match backend API
      const connectionData = {
        name: data.name,
        host: data.host,
        port: parseInt(data.port),
        management_port: 15672, // Default management port
        username: data.username,
        password: data.password,
        virtual_host: data.vhost || '/',
        use_ssl: data.ssl || false,
        description: `Connection to ${data.host}:${data.port}`
      };

      if (editingConnection) {
        await axios.put(`/api/connections/${editingConnection.id}`, connectionData);
        toast.success('Connection updated successfully');
      } else {
        await axios.post('/api/connections/', connectionData);
        toast.success('Connection added successfully');
      }

      fetchConnections();
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save connection');
      console.error('Error saving connection:', error);
    }
  };

  const testConnection = async (connection) => {
    setTestingConnection(connection.id);
    try {
      const response = await axios.post(`/api/connections/${connection.id}/test`);
      if (response.data.success) {
        toast.success('Connection test successful!');
      } else {
        toast.error('Connection test failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Connection test failed');
      console.error('Error testing connection:', error);
    } finally {
      setTestingConnection(null);
    }
  };

  const deleteConnection = async (id) => {
    if (!window.confirm('Are you sure you want to delete this connection?')) {
      return;
    }

    try {
      await axios.delete(`/api/connections/${id}`);
      toast.success('Connection deleted successfully');
      fetchConnections();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete connection');
      console.error('Error deleting connection:', error);
    }
  };

  const editConnection = (connection) => {
    setEditingConnection(connection);
    setValue('name', connection.name);
    setValue('host', connection.host);
    setValue('port', connection.port);
    setValue('username', connection.username);
    setValue('password', ''); // Don't pre-fill password for security
    setValue('vhost', connection.virtual_host);
    setValue('ssl', connection.use_ssl);
    setShowForm(true);
  };

  const resetForm = () => {
    reset();
    setShowForm(false);
    setEditingConnection(null);
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="card-title">🔗 RabbitMQ Connections</h1>
              <p className="card-description">
                Manage your RabbitMQ cluster connections
              </p>
            </div>
            <button 
              onClick={() => setShowForm(!showForm)}
              className="btn btn-primary"
            >
              {showForm ? '❌ Cancel' : '➕ Add Connection'}
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Connection Name *</label>
                <input
                  {...register('name', { required: 'Name is required' })}
                  className="form-input"
                  placeholder="My RabbitMQ Cluster"
                />
                {errors.name && (
                  <span className="text-red-500 text-sm">{errors.name.message}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Host *</label>
                <input
                  {...register('host', { required: 'Host is required' })}
                  className="form-input"
                  placeholder="localhost"
                />
                {errors.host && (
                  <span className="text-red-500 text-sm">{errors.host.message}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Port *</label>
                <input
                  {...register('port', { 
                    required: 'Port is required',
                    min: { value: 1, message: 'Port must be greater than 0' },
                    max: { value: 65535, message: 'Port must be less than 65536' }
                  })}
                  type="number"
                  className="form-input"
                  placeholder="5672"
                />
                {errors.port && (
                  <span className="text-red-500 text-sm">{errors.port.message}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Virtual Host</label>
                <input
                  {...register('vhost')}
                  className="form-input"
                  placeholder="/"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Username *</label>
                <input
                  {...register('username', { required: 'Username is required' })}
                  className="form-input"
                  placeholder="guest"
                />
                {errors.username && (
                  <span className="text-red-500 text-sm">{errors.username.message}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  {...register('password', { required: 'Password is required' })}
                  type="password"
                  className="form-input"
                  placeholder="Enter password"
                />
                {errors.password && (
                  <span className="text-red-500 text-sm">{errors.password.message}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <input
                  {...register('ssl')}
                  type="checkbox"
                  className="mr-2"
                />
                Use SSL/TLS
              </label>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                {editingConnection ? '💾 Update Connection' : '➕ Add Connection'}
              </button>
              <button type="button" onClick={resetForm} className="btn btn-secondary">
                ❌ Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="connections-grid">
        {connections.map(connection => (
          <div key={connection.id} className="connection-card">
            <div className="connection-header">
              <div className="connection-info">
                <h3 className="connection-name">{connection.name}</h3>
                <p className="connection-details">
                  {connection.host}:{connection.port}
                  {connection.virtual_host && connection.virtual_host !== '/' && ` (${connection.virtual_host})`}
                </p>
                <p className="connection-description">{connection.description}</p>
              </div>
              <div className="connection-actions">
                <button
                  onClick={() => testConnection(connection)}
                  disabled={testingConnection === connection.id}
                  className="btn btn-sm btn-success"
                  title="Test Connection"
                >
                  {testingConnection === connection.id ? (
                    <>
                      <span className="spinner"></span>
                      Testing...
                    </>
                  ) : (
                    '🔍 Test'
                  )}
                </button>
                <button
                  onClick={() => editConnection(connection)}
                  className="btn btn-sm btn-secondary"
                  title="Edit Connection"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => deleteConnection(connection.id)}
                  className="btn btn-sm btn-danger"
                  title="Delete Connection"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>

            <div className="connection-metadata">
              <div className="metadata-item">
                <strong>Username:</strong> {connection.username}
              </div>
              <div className="metadata-item">
                <strong>Management Port:</strong> {connection.management_port || 15672}
              </div>
              <div className="metadata-item">
                <strong>SSL:</strong> {connection.use_ssl ? '✅ Yes' : '❌ No'}
              </div>
              <div className="metadata-item">
                <strong>Created:</strong> {new Date(connection.created_at).toLocaleDateString()}
              </div>
            </div>

            <div className="connection-status">
              <span className={`status ${connection.status === 'connected' ? 'status-success' : 'status-info'}`}>
                {connection.status === 'connected' ? '✅ Connected' : '🔗 Ready to Connect'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {connections.length === 0 && !showForm && (
        <div className="card text-center">
          <h3>No Connections Found</h3>
          <p>Add your first RabbitMQ connection to get started.</p>
          <button 
            onClick={() => setShowForm(true)}
            className="btn btn-primary mt-4"
          >
            ➕ Add Your First Connection
          </button>
        </div>
      )}
    </div>
  );
};

export default Connections;
