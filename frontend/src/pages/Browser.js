import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import axios from 'axios';

const Browser = () => {
  const [connections, setConnections] = useState([]);
  const [vhosts, setVhosts] = useState([]);
  const [queues, setQueues] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState('');
  const [selectedVhost, setSelectedVhost] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      vhost: '',
      maxMessages: 10
    }
  });

  const watchedConnection = watch('connectionId');
  const watchedVhost = watch('vhost');

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
      setQueues([]);
    }
  }, [watchedConnection, setValue]);

  useEffect(() => {
    if (watchedVhost !== undefined) {
      setSelectedVhost(watchedVhost);
      if (selectedConnection) {
        fetchQueues(selectedConnection, watchedVhost);
      }
    }
  }, [watchedVhost, selectedConnection]);

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
    if (!data.connectionId || !data.vhost || !data.queue) {
      toast.error('Please select connection, vhost, and queue');
      return;
    }

    setIsBrowsing(true);
    try {
      const response = await axios.post('/api/consumer/browse', {
        connection_id: parseInt(data.connectionId),
        queue: data.queue,
        vhost: data.vhost,
        max_messages: parseInt(data.maxMessages) || 10
      });

      if (response.data.messages && response.data.messages.length > 0) {
        setMessages(response.data.messages);
        setSelectedMessage(0); // Auto-select first message
        toast.success(`Browsed ${response.data.messages.length} messages (not consumed)`);
      } else {
        setMessages([]);
        setSelectedMessage(null);
        toast.info('No messages available in the queue');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to browse messages');
      console.error('Error browsing messages:', error);
    } finally {
      setIsBrowsing(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setSelectedMessage(null);
    toast.success('Messages cleared');
  };

  const exportMessages = () => {
    const dataStr = JSON.stringify(messages, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `rabbitmq-messages-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Messages exported successfully');
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">👁️ Message Browser</h1>
          <p className="card-description">
            Browse messages in RabbitMQ queues without consuming them
          </p>
          
          <div className="mt-2 p-3" style={{ backgroundColor: '#dbeafe', border: '1px solid #3b82f6', borderRadius: '0.375rem' }}>
            <p className="text-sm" style={{ color: '#1e40af' }}>
              👁️ <strong>Browse Mode:</strong> Messages will be viewed but remain in the queue. This is a safe, non-destructive operation.
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
              <label className="form-label">Queue *</label>
              <select 
                {...register('queue', { required: 'Queue is required' })}
                className="form-select"
                disabled={!selectedConnection || !selectedVhost}
              >
                <option value="">
                  {selectedVhost ? `Select a queue in ${selectedVhost}...` : 'Select a queue...'}
                </option>
                {queues.map(queue => (
                  <option key={queue.name} value={queue.name}>
                    {queue.name} ({queue.messages} messages)
                  </option>
                ))}
              </select>
              {errors.queue && (
                <span className="text-red-500 text-sm">{errors.queue.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Max Messages</label>
              <input
                {...register('maxMessages')}
                type="number"
                min="1"
                max="100"
                className="form-input"
                placeholder="10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isBrowsing}
            >
              {isBrowsing ? (
                <>
                  <span className="spinner"></span>
                  Browsing...
                </>
              ) : (
                <>
                  👁️ Browse Messages
                </>
              )}
            </button>

            {messages.length > 0 && (
              <>
                <button 
                  type="button" 
                  onClick={clearMessages}
                  className="btn btn-secondary"
                >
                  🗑️ Clear
                </button>
                <button 
                  type="button" 
                  onClick={exportMessages}
                  className="btn btn-success"
                >
                  💾 Export JSON
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {/* Message Browser */}
      {messages.length > 0 ? (
        <div className="card mt-4">
          <div className="card-header">
            <h2 className="card-title">Browsed Messages ({messages.length})</h2>
            <p className="card-description">
              Click on a message to view its details
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Message List Panel */}
            <div>
              <h4 className="font-medium mb-2">Message List</h4>
              <div style={{ maxHeight: '500px', overflowY: 'auto' }} className="border rounded">
                {messages.map((message, index) => (
                  <div 
                    key={index} 
                    className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                      selectedMessage === index ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => setSelectedMessage(index)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Message #{index + 1}</span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Queue: {message.queue || 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {message.body ? message.body.substring(0, 50) + '...' : 'No content'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Message Detail Panel */}
            <div>
              <h4 className="font-medium mb-2">Message Details</h4>
              {selectedMessage !== null ? (
                <div className="border rounded p-4" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Message Body</label>
                      <pre className="mt-1 p-3 bg-gray-100 rounded text-sm overflow-x-auto">
                        {messages[selectedMessage].body || 'No content'}
                      </pre>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Properties</label>
                      <pre className="mt-1 p-3 bg-gray-100 rounded text-sm overflow-x-auto">
                        {JSON.stringify(messages[selectedMessage].properties || {}, null, 2)}
                      </pre>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Metadata</label>
                      <div className="mt-1 space-y-1 text-sm">
                        <div><strong>Queue:</strong> {messages[selectedMessage].queue || 'Unknown'}</div>
                        <div><strong>Timestamp:</strong> {formatTimestamp(messages[selectedMessage].timestamp)}</div>
                        <div><strong>Routing Key:</strong> {messages[selectedMessage].routing_key || 'N/A'}</div>
                        <div><strong>Exchange:</strong> {messages[selectedMessage].exchange || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border rounded p-4 text-center text-gray-500">
                  Select a message from the list to view details
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card mt-4">
          <div className="text-center py-8 text-gray-500">
            <p>📭 No messages to display</p>
            <p className="text-sm">Select a connection and queue, then click "Browse Messages" to view messages</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Browser;
