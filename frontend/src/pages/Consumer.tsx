import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useConnection } from '../context/ConnectionContext';
import { consumerApi } from '../services/api';
import { ConsumedMessage } from '../types';
import toast from 'react-hot-toast';
import { 
  Play, 
  Square, 
  Download, 
  Search, 
  Filter, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface ConsumeForm {
  queue: string;
  vhost: string;
  auto_ack: boolean;
}

const Consumer: React.FC = () => {
  const { state } = useConnection();
  const [isConsuming, setIsConsuming] = useState(false);
  const [messages, setMessages] = useState<ConsumedMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<ConsumedMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'message' | 'error'>('all');
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ConsumeForm>({
    defaultValues: {
      queue: '',
      vhost: '/',
      auto_ack: true,
    },
  });

  const selectedVHost = watch('vhost');

  // Filter queues by selected vhost
  const filteredQueues = state.discovery?.queues.filter(
    (queue) => queue.vhost === selectedVHost
  ) || [];

  // Filter messages based on search and type
  useEffect(() => {
    let filtered = messages;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(msg => msg.type === filterType);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(msg => 
        msg.body?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.message?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredMessages(filtered);
  }, [messages, searchTerm, filterType]);

  // Auto scroll to bottom
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredMessages, autoScroll]);

  // Auto-select first vhost when discovery loads
  useEffect(() => {
    if (state.discovery?.vhosts.length && !selectedVHost) {
      setValue('vhost', state.discovery.vhosts[0].name);
    }
  }, [state.discovery, selectedVHost, setValue]);

  const startConsuming = async (data: ConsumeForm) => {
    if (!state.selectedConnection) {
      toast.error('Please select a connection first');
      return;
    }

    try {
      // Create WebSocket connection
      const ws = consumerApi.createConsumerWebSocket(state.selectedConnection.id);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        // Send consume request
        ws.send(JSON.stringify({
          queue: data.queue,
          vhost: data.vhost,
          auto_ack: data.auto_ack,
        }));
        setIsConsuming(true);
        setWsConnection(ws);
        toast.success('Started consuming messages');
      };

      ws.onmessage = (event) => {
        const message: ConsumedMessage = JSON.parse(event.data);
        setMessages(prev => [...prev, { ...message, timestamp: new Date().toISOString() }]);
        
        if (message.type === 'error') {
          toast.error(message.message || 'Consumer error');
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConsuming(false);
        setWsConnection(null);
        toast.info('Stopped consuming messages');
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('WebSocket connection error');
        setIsConsuming(false);
        setWsConnection(null);
      };

    } catch (error: any) {
      toast.error('Failed to start consuming: ' + error.message);
    }
  };

  const stopConsuming = () => {
    if (wsConnection) {
      wsConnection.send(JSON.stringify({ action: 'stop' }));
      wsConnection.close();
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setFilteredMessages([]);
  };

  const exportMessages = () => {
    const dataStr = JSON.stringify(filteredMessages, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rabbitmq-messages-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <Download className="h-4 w-4 text-blue-500" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!state.selectedConnection) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Connection Selected</h3>
        <p className="text-gray-500">Please select a RabbitMQ connection to start consuming messages.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Message Consumer</h1>
          <p className="text-gray-600">
            Connected to: <span className="font-medium">{state.selectedConnection.name}</span>
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isConsuming ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {isConsuming ? 'Consuming' : 'Stopped'}
          </span>
          <span className="text-sm text-gray-600">
            Messages: {filteredMessages.length}
          </span>
        </div>
      </div>

      {/* Consumer Controls */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium">Consumer Configuration</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit(startConsuming)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Virtual Host
                </label>
                <select {...register('vhost', { required: 'Virtual host is required' })} className="select">
                  {state.discovery?.vhosts.map((vhost) => (
                    <option key={vhost.name} value={vhost.name}>
                      {vhost.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Queue
                </label>
                <select {...register('queue', { required: 'Queue is required' })} className="select">
                  <option value="">Select a queue</option>
                  {filteredQueues.map((queue) => (
                    <option key={`${queue.name}-${queue.vhost}`} value={queue.name}>
                      {queue.name} ({queue.messages} msgs)
                    </option>
                  ))}
                </select>
                {errors.queue && (
                  <p className="text-red-500 text-sm mt-1">{errors.queue.message}</p>
                )}
              </div>

              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    {...register('auto_ack')}
                    type="checkbox"
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto Acknowledge</span>
                </label>
              </div>
            </div>

            <div className="flex justify-between">
              <div className="flex space-x-2">
                {!isConsuming ? (
                  <button
                    type="submit"
                    disabled={!state.selectedConnection}
                    className="btn btn-primary flex items-center"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Consuming
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopConsuming}
                    className="btn btn-error flex items-center"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop Consuming
                  </button>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={exportMessages}
                  disabled={filteredMessages.length === 0}
                  className="btn btn-secondary flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
                <button
                  type="button"
                  onClick={clearMessages}
                  disabled={messages.length === 0}
                  className="btn btn-secondary flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Message Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="select"
              >
                <option value="all">All Messages</option>
                <option value="message">Messages Only</option>
                <option value="error">Errors Only</option>
              </select>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">Auto Scroll</span>
            </label>
          </div>
        </div>
      </div>

      {/* Messages Display */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium">Consumed Messages</h2>
        </div>
        <div className="card-body p-0">
          <div className="max-h-96 overflow-y-auto">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {messages.length === 0 ? 'No messages consumed yet' : 'No messages match your filters'}
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {filteredMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-md border ${
                      message.type === 'error' 
                        ? 'bg-red-50 border-red-200' 
                        : message.type === 'ready'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        {getMessageTypeIcon(message.type)}
                        <span className="text-sm font-medium">
                          {message.type === 'message' ? 'Message' : 
                           message.type === 'ready' ? 'Ready' : 'Error'}
                        </span>
                        {message.timestamp && (
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(message.timestamp)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {message.body && (
                      <div className="mt-2">
                        <pre className="text-sm bg-white p-2 rounded border overflow-x-auto">
                          {message.body}
                        </pre>
                      </div>
                    )}
                    
                    {message.message && (
                      <div className="mt-2 text-sm">
                        {message.message}
                      </div>
                    )}
                    
                    {message.properties && Object.keys(message.properties).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-600 cursor-pointer">Properties</summary>
                        <pre className="text-xs bg-white p-2 rounded border mt-1 overflow-x-auto">
                          {JSON.stringify(message.properties, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Consumer;
