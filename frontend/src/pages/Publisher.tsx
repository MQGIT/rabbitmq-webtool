import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useConnection } from '../context/ConnectionContext';
import { publisherApi } from '../services/api';
import { PublishMessage } from '../types';
import toast from 'react-hot-toast';
import { Send, Settings, AlertCircle, CheckCircle } from 'lucide-react';

interface PublishForm {
  exchange: string;
  routing_key: string;
  message: string;
  vhost: string;
  delivery_mode: string;
  content_type: string;
  priority: string;
  expiration: string;
  headers: string;
}

const Publisher: React.FC = () => {
  const { state } = useConnection();
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastPublishResult, setLastPublishResult] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PublishForm>({
    defaultValues: {
      exchange: '',
      routing_key: '',
      message: '',
      vhost: '/',
      delivery_mode: '2',
      content_type: 'text/plain',
      priority: '',
      expiration: '',
      headers: '{}',
    },
  });

  const selectedVHost = watch('vhost');

  // Filter exchanges and queues by selected vhost
  const filteredExchanges = state.discovery?.exchanges.filter(
    (exchange) => exchange.vhost === selectedVHost
  ) || [];

  const filteredQueues = state.discovery?.queues.filter(
    (queue) => queue.vhost === selectedVHost
  ) || [];

  const onSubmit = async (data: PublishForm) => {
    if (!state.selectedConnection) {
      toast.error('Please select a connection first');
      return;
    }

    setIsPublishing(true);
    try {
      // Parse headers
      let headers = {};
      if (data.headers.trim()) {
        try {
          headers = JSON.parse(data.headers);
        } catch (e) {
          toast.error('Invalid JSON in headers');
          setIsPublishing(false);
          return;
        }
      }

      // Prepare properties
      const properties: any = {
        delivery_mode: parseInt(data.delivery_mode),
        content_type: data.content_type,
      };

      if (data.priority) properties.priority = parseInt(data.priority);
      if (data.expiration) properties.expiration = data.expiration;
      if (Object.keys(headers).length > 0) properties.headers = headers;

      const publishMessage: PublishMessage = {
        connection_id: state.selectedConnection.id,
        exchange: data.exchange,
        routing_key: data.routing_key,
        message: data.message,
        vhost: data.vhost,
        properties,
      };

      const result = await publisherApi.publishMessage(publishMessage);
      setLastPublishResult(result);

      if (result.success) {
        toast.success(`Message published successfully! ID: ${result.message_id}`);
      } else {
        toast.error(`Failed to publish: ${result.message}`);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to publish message';
      toast.error(errorMessage);
      setLastPublishResult({ success: false, message: errorMessage });
    } finally {
      setIsPublishing(false);
    }
  };

  // Auto-select first vhost when discovery loads
  useEffect(() => {
    if (state.discovery?.vhosts.length && !selectedVHost) {
      setValue('vhost', state.discovery.vhosts[0].name);
    }
  }, [state.discovery, selectedVHost, setValue]);

  if (!state.selectedConnection) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Connection Selected</h3>
        <p className="text-gray-500">Please select a RabbitMQ connection to start publishing messages.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Message Publisher</h1>
          <p className="text-gray-600">
            Connected to: <span className="font-medium">{state.selectedConnection.name}</span>
          </p>
        </div>
        {lastPublishResult && (
          <div className={`flex items-center px-3 py-2 rounded-md ${
            lastPublishResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {lastPublishResult.success ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <AlertCircle className="h-4 w-4 mr-2" />
            )}
            <span className="text-sm">{lastPublishResult.message}</span>
          </div>
        )}
      </div>

      {/* Publisher Form */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium">Publish Message</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Connection Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                {errors.vhost && (
                  <p className="text-red-500 text-sm mt-1">{errors.vhost.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exchange
                </label>
                <select {...register('exchange')} className="select">
                  <option value="">Default Exchange</option>
                  {filteredExchanges.map((exchange) => (
                    <option key={`${exchange.name}-${exchange.vhost}`} value={exchange.name}>
                      {exchange.name} ({exchange.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Routing Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Routing Key / Queue Name
              </label>
              <input
                {...register('routing_key', { required: 'Routing key is required' })}
                className="input"
                placeholder="Enter routing key or queue name"
              />
              {errors.routing_key && (
                <p className="text-red-500 text-sm mt-1">{errors.routing_key.message}</p>
              )}
              {/* Queue suggestions */}
              {filteredQueues.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 mb-1">Available queues:</p>
                  <div className="flex flex-wrap gap-2">
                    {filteredQueues.slice(0, 5).map((queue) => (
                      <button
                        key={`${queue.name}-${queue.vhost}`}
                        type="button"
                        onClick={() => setValue('routing_key', queue.name)}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        {queue.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Message Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message Content
              </label>
              <textarea
                {...register('message', { required: 'Message content is required' })}
                rows={6}
                className="textarea"
                placeholder="Enter your message content here..."
              />
              {errors.message && (
                <p className="text-red-500 text-sm mt-1">{errors.message.message}</p>
              )}
            </div>

            {/* Advanced Options */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center text-sm text-primary-600 hover:text-primary-700"
              >
                <Settings className="h-4 w-4 mr-1" />
                Advanced Options
              </button>

              {showAdvanced && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content Type
                    </label>
                    <input {...register('content_type')} className="input" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Mode
                    </label>
                    <select {...register('delivery_mode')} className="select">
                      <option value="1">Non-persistent</option>
                      <option value="2">Persistent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority (0-255)
                    </label>
                    <input
                      {...register('priority')}
                      type="number"
                      min="0"
                      max="255"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiration (ms)
                    </label>
                    <input {...register('expiration')} className="input" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Headers (JSON)
                    </label>
                    <textarea
                      {...register('headers')}
                      rows={3}
                      className="textarea"
                      placeholder='{"key": "value"}'
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPublishing || !state.selectedConnection}
                className="btn btn-primary flex items-center"
              >
                {isPublishing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Publish Message
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Publisher;
