import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import axios from 'axios';

const Publisher = () => {
  const [connections, setConnections] = useState([]);
  const [vhosts, setVhosts] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState('');
  const [selectedVhost, setSelectedVhost] = useState('');

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      vhost: '',
      exchange: '',
      directQueue: '',
      routingKey: '',
      message: '',
      properties: {
        contentType: 'text/plain',
        deliveryMode: 2,
        priority: 0
      }
    }
  });

  const watchedConnection = watch('connectionId');
  const watchedVhost = watch('vhost');
  const watchedDirectQueue = watch('directQueue');
  const watchedExchange = watch('exchange');

  useEffect(() => {
    fetchConnections();
  }, []);

  useEffect(() => {
    if (watchedConnection) {
      setSelectedConnection(watchedConnection);
      fetchVhosts(watchedConnection);
      // Reset vhost selection when connection changes
      setValue('vhost', '');
      setSelectedVhost('');
      setExchanges([]);
      setQueues([]);
    }
  }, [watchedConnection, setValue]);

  useEffect(() => {
    if (watchedVhost !== undefined) {
      setSelectedVhost(watchedVhost);
      if (selectedConnection) {
        fetchExchanges(selectedConnection, watchedVhost);
        fetchQueues(selectedConnection, watchedVhost);
      }
    }
  }, [watchedVhost, selectedConnection]);

  // Auto-populate routing key when direct queue is selected
  useEffect(() => {
    if (watchedDirectQueue) {
      setValue('routingKey', watchedDirectQueue);
      setValue('exchange', ''); // Clear exchange when queue is selected
    }
  }, [watchedDirectQueue, setValue]);

  // Clear direct queue when exchange is selected and suggest routing key
  useEffect(() => {
    if (watchedExchange) {
      setValue('directQueue', ''); // Clear queue when exchange is selected

      // Auto-suggest routing key based on exchange type
      const selectedExchange = exchanges.find(ex => ex.name === watchedExchange);
      if (selectedExchange) {
        let suggestedRoutingKey = '';
        switch (selectedExchange.type) {
          case 'direct':
            suggestedRoutingKey = 'direct.routing.key';
            break;
          case 'topic':
            suggestedRoutingKey = 'topic.*.routing.#';
            break;
          case 'fanout':
            suggestedRoutingKey = ''; // Fanout ignores routing key
            break;
          case 'headers':
            suggestedRoutingKey = 'headers.key';
            break;
          default:
            suggestedRoutingKey = 'routing.key';
        }
        setValue('routingKey', suggestedRoutingKey);
      }
    }
  }, [watchedExchange, setValue, exchanges]);

  const fetchConnections = async () => {
    try {
      const response = await axios.get('/api/connections/');
      setConnections(response.data);
    } catch (error) {
      toast.error('Failed to fetch connections');
      console.error('Error fetching connections:', error);
    }
  };

  const fetchVhosts = async (connectionId) => {
    try {
      const response = await axios.get(`/api/discovery/${connectionId}/vhosts`);
      setVhosts(response.data.vhosts || response.data);
    } catch (error) {
      toast.error('Failed to fetch vhosts');
      console.error('Error fetching vhosts:', error);
    }
  };

  const fetchExchanges = async (connectionId, vhost = '') => {
    try {
      const url = vhost
        ? `/api/discovery/${connectionId}/exchanges?vhost=${encodeURIComponent(vhost)}`
        : `/api/discovery/${connectionId}/exchanges`;
      const response = await axios.get(url);
      setExchanges(response.data.exchanges || response.data);
    } catch (error) {
      toast.error('Failed to fetch exchanges');
      console.error('Error fetching exchanges:', error);
    }
  };

  const fetchQueues = async (connectionId, vhost = '') => {
    try {
      const url = vhost
        ? `/api/discovery/${connectionId}/queues?vhost=${encodeURIComponent(vhost)}`
        : `/api/discovery/${connectionId}/queues`;
      const response = await axios.get(url);
      setQueues(response.data.queues || response.data);
    } catch (error) {
      toast.error('Failed to fetch queues');
      console.error('Error fetching queues:', error);
    }
  };

  const onSubmit = async (data) => {
    if (!data.connectionId) {
      toast.error('Please select a connection');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/publisher/publish', {
        connection_id: parseInt(data.connectionId),
        vhost: data.vhost,
        exchange: data.exchange || '',
        routing_key: data.routingKey,
        message: data.message, // Changed from message_body to message
        properties: {
          content_type: data.properties.contentType,
          delivery_mode: parseInt(data.properties.deliveryMode),
          priority: parseInt(data.properties.priority)
        }
      });

      toast.success('Message published successfully!');
      reset();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to publish message');
      console.error('Error publishing message:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h1 className="card-title">📤 Message Publisher</h1>
        <p className="card-description">
          Send messages to RabbitMQ exchanges and queues
        </p>
        <div className="mt-2 p-3" style={{ backgroundColor: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '0.375rem' }}>
          <p className="text-sm" style={{ color: '#0369a1' }}>
            💡 <strong>Smart Publishing Options:</strong><br/>
            • <strong>Exchange + Routing Key:</strong> Select an exchange and routing key will be auto-suggested based on exchange type<br/>
            • <strong>Direct to Queue:</strong> Select a queue for direct publishing (routing key will be auto-filled with queue name)<br/>
            • <strong>Auto-suggestions:</strong> Routing keys are automatically populated but can be customized as needed
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-2">
          <div className="form-group">
            <label className="form-label">Connection *</label>
            <select 
              {...register('connectionId', { required: 'Connection is required' })}
              className="form-select"
            >
              <option value="">Select a connection...</option>
              {connections.map(conn => (
                <option key={conn.id} value={conn.id}>
                  {conn.name} ({conn.host}:{conn.port})
                </option>
              ))}
            </select>
            {errors.connectionId && (
              <span className="text-red-500 text-sm">{errors.connectionId.message}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Virtual Host *</label>
            <select
              {...register('vhost', { required: 'Virtual host is required' })}
              className="form-select"
              disabled={!selectedConnection}
            >
              <option value="">Select a virtual host...</option>
              {vhosts.map(vhost => (
                <option key={vhost.name} value={vhost.name}>
                  {vhost.name}
                </option>
              ))}
            </select>
            {errors.vhost && (
              <span className="text-red-500 text-sm">{errors.vhost.message}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Exchange</label>
            <select
              {...register('exchange')}
              className="form-select"
              disabled={!selectedConnection || !selectedVhost}
            >
              <option value="">
                {selectedVhost ? `Select an exchange in ${selectedVhost} (optional)` : 'Select an exchange (optional)'}
              </option>
              {exchanges.map(exchange => (
                <option key={exchange.name} value={exchange.name}>
                  {exchange.name} ({exchange.type})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Queue (Direct Publishing)</label>
            <select
              {...register('directQueue')}
              className="form-select"
              disabled={!selectedConnection || !selectedVhost}
            >
              <option value="">
                {selectedVhost ? `Select a queue in ${selectedVhost} (optional)` : 'Select a queue (optional)'}
              </option>
              {queues.map(queue => (
                <option key={queue.name} value={queue.name}>
                  {queue.name} ({queue.messages} messages)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Routing Key *</label>
            <input
              {...register('routingKey', { required: 'Routing key is required' })}
              className="form-input"
              placeholder="Enter routing key (or queue name if no exchange selected)"
            />
            {errors.routingKey && (
              <span className="text-red-500 text-sm">{errors.routingKey.message}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Content Type</label>
            <select 
              {...register('properties.contentType')}
              className="form-select"
            >
              <option value="text/plain">text/plain</option>
              <option value="application/json">application/json</option>
              <option value="application/xml">application/xml</option>
              <option value="text/html">text/html</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Message *</label>
          <textarea
            {...register('message', { required: 'Message is required' })}
            className="form-input form-textarea"
            placeholder="Enter your message content here..."
            rows="6"
          />
          {errors.message && (
            <span className="text-red-500 text-sm">{errors.message.message}</span>
          )}
        </div>

        <div className="grid grid-3">
          <div className="form-group">
            <label className="form-label">Delivery Mode</label>
            <select 
              {...register('properties.deliveryMode')}
              className="form-select"
            >
              <option value={1}>Non-persistent</option>
              <option value={2}>Persistent</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Priority</label>
            <input
              {...register('properties.priority')}
              type="number"
              min="0"
              max="255"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">&nbsp;</label>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Publishing...
                </>
              ) : (
                <>
                  📤 Publish Message
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {connections.length === 0 && (
        <div className="card mt-4">
          <div className="text-center">
            <h3>No Connections Found</h3>
            <p>You need to add a RabbitMQ connection first.</p>
            <a href="/connections" className="btn btn-primary mt-4">
              🔗 Add Connection
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Publisher;
