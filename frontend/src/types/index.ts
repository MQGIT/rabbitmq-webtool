export interface RabbitMQConnection {
  id: number;
  name: string;
  host: string;
  port: number;
  management_port: number;
  username: string;
  password: string;
  virtual_host: string;
  use_ssl: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface RabbitMQConnectionCreate {
  name: string;
  host: string;
  port: number;
  management_port: number;
  username: string;
  password: string;
  virtual_host: string;
  use_ssl: boolean;
  description?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface QueueInfo {
  name: string;
  vhost: string;
  durable: boolean;
  auto_delete: boolean;
  exclusive: boolean;
  messages: number;
  consumers: number;
  state: string;
}

export interface ExchangeInfo {
  name: string;
  vhost: string;
  type: string;
  durable: boolean;
  auto_delete: boolean;
  internal: boolean;
}

export interface VHostInfo {
  name: string;
  description?: string;
  tags: string[];
}

export interface UserInfo {
  name: string;
  tags: string[];
}

export interface BindingInfo {
  source: string;
  destination: string;
  destination_type: string;
  routing_key: string;
  vhost: string;
}

export interface ClusterDiscovery {
  queues: QueueInfo[];
  exchanges: ExchangeInfo[];
  vhosts: VHostInfo[];
  users: UserInfo[];
  bindings: BindingInfo[];
}

export interface PublishMessage {
  connection_id: number;
  exchange: string;
  routing_key: string;
  message: string;
  properties?: Record<string, any>;
  vhost: string;
}

export interface PublishResult {
  success: boolean;
  message: string;
  message_id?: string;
}

export interface ConsumeRequest {
  connection_id: number;
  queue: string;
  vhost: string;
  auto_ack: boolean;
}

export interface ConsumedMessage {
  type: 'message' | 'ready' | 'error';
  body?: string;
  properties?: Record<string, any>;
  delivery_info?: Record<string, any>;
  timestamp?: string;
  message?: string;
}

export interface ConnectionState {
  selectedConnection: RabbitMQConnection | null;
  connections: RabbitMQConnection[];
  discovery: ClusterDiscovery | null;
  isLoading: boolean;
  error: string | null;
}
