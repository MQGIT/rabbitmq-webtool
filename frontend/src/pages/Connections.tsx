import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useConnection } from '../context/ConnectionContext';
import { connectionApi } from '../services/api';
import { RabbitMQConnectionCreate } from '../types';
import toast from 'react-hot-toast';
import { 
  Plus, 
  Edit, 
  Trash2, 
  TestTube, 
  CheckCircle, 
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';

const Connections: React.FC = () => {
  const { state, loadConnections, selectConnection } = useConnection();
  const [showForm, setShowForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState<number | null>(null);
  const [testingConnection, setTestingConnection] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RabbitMQConnectionCreate>({
    defaultValues: {
      name: '',
      host: '',
      port: 5672,
      management_port: 15672,
      username: '',
      password: '',
      virtual_host: '/',
      use_ssl: false,
      description: '',
    },
  });

  const onSubmit = async (data: RabbitMQConnectionCreate) => {
    try {
      if (editingConnection) {
        await connectionApi.updateConnection(editingConnection, data);
        toast.success('Connection updated successfully');
      } else {
        await connectionApi.createConnection(data);
        toast.success('Connection created successfully');
      }
      
      await loadConnections();
      setShowForm(false);
      setEditingConnection(null);
      reset();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to save connection';
      toast.error(errorMessage);
    }
  };

  const handleEdit = (connection: any) => {
    setEditingConnection(connection.id);
    reset({
      name: connection.name,
      host: connection.host,
      port: connection.port,
      management_port: connection.management_port,
      username: connection.username,
      password: '', // Don't populate password for security
      virtual_host: connection.virtual_host,
      use_ssl: connection.use_ssl,
      description: connection.description || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this connection?')) {
      return;
    }

    try {
      await connectionApi.deleteConnection(id);
      toast.success('Connection deleted successfully');
      await loadConnections();
      
      // If deleted connection was selected, clear selection
      if (state.selectedConnection?.id === id) {
        selectConnection(state.connections[0] || null);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete connection';
      toast.error(errorMessage);
    }
  };

  const handleTest = async (id: number) => {
    setTestingConnection(id);
    try {
      const result = await connectionApi.testConnection(id);
      if (result.success) {
        toast.success(`Connection test successful: ${result.message}`);
      } else {
        toast.error(`Connection test failed: ${result.message}`);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Connection test failed';
      toast.error(errorMessage);
    } finally {
      setTestingConnection(null);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingConnection(null);
    reset();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RabbitMQ Connections</h1>
          <p className="text-gray-600">Manage your RabbitMQ cluster connections</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Connection
        </button>
      </div>

      {/* Connection Form */}
      {showForm && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium">
              {editingConnection ? 'Edit Connection' : 'Add New Connection'}
            </h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Connection Name *
                  </label>
                  <input
                    {...register('name', { required: 'Connection name is required' })}
                    className="input"
                    placeholder="My RabbitMQ Cluster"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Host *
                  </label>
                  <input
                    {...register('host', { required: 'Host is required' })}
                    className="input"
                    placeholder="rmqkafka.rmq-kafka.svc"
                  />
                  {errors.host && (
                    <p className="text-red-500 text-sm mt-1">{errors.host.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    AMQP Port
                  </label>
                  <input
                    {...register('port', { 
                      required: 'Port is required',
                      valueAsNumber: true,
                      min: { value: 1, message: 'Port must be greater than 0' },
                      max: { value: 65535, message: 'Port must be less than 65536' }
                    })}
                    type="number"
                    className="input"
                  />
                  {errors.port && (
                    <p className="text-red-500 text-sm mt-1">{errors.port.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Management Port
                  </label>
                  <input
                    {...register('management_port', { 
                      required: 'Management port is required',
                      valueAsNumber: true,
                      min: { value: 1, message: 'Port must be greater than 0' },
                      max: { value: 65535, message: 'Port must be less than 65536' }
                    })}
                    type="number"
                    className="input"
                  />
                  {errors.management_port && (
                    <p className="text-red-500 text-sm mt-1">{errors.management_port.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username *
                  </label>
                  <input
                    {...register('username', { required: 'Username is required' })}
                    className="input"
                    placeholder="admin"
                  />
                  {errors.username && (
                    <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      {...register('password', { required: 'Password is required' })}
                      type={showPassword ? 'text' : 'password'}
                      className="input pr-10"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Virtual Host
                  </label>
                  <input
                    {...register('virtual_host')}
                    className="input"
                    placeholder="/"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      {...register('use_ssl')}
                      type="checkbox"
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Use SSL</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="textarea"
                  placeholder="Optional description for this connection"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingConnection ? 'Update Connection' : 'Create Connection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Connections List */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium">Saved Connections</h2>
        </div>
        <div className="card-body p-0">
          {state.connections.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No connections configured. Add your first connection to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Connection
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Host
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      VHost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {state.connections.map((connection) => (
                    <tr 
                      key={connection.id}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        state.selectedConnection?.id === connection.id ? 'bg-primary-50' : ''
                      }`}
                      onClick={() => selectConnection(connection)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {connection.name}
                          </div>
                          {connection.description && (
                            <div className="text-sm text-gray-500">
                              {connection.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {connection.host}:{connection.port}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {connection.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {connection.virtual_host}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {state.selectedConnection?.id === connection.id ? (
                          <span className="badge badge-success">Selected</span>
                        ) : (
                          <span className="badge badge-info">Available</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTest(connection.id);
                            }}
                            disabled={testingConnection === connection.id}
                            className="text-blue-600 hover:text-blue-900"
                            title="Test Connection"
                          >
                            {testingConnection === connection.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            ) : (
                              <TestTube className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(connection);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit Connection"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(connection.id);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Connection"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Connections;
