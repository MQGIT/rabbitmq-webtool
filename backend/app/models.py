from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class RabbitMQConnectionBase(BaseModel):
    name: str = Field(..., description="Connection name")
    host: str = Field(..., description="RabbitMQ host")
    port: int = Field(5672, description="RabbitMQ port")
    management_port: int = Field(15672, description="Management API port")
    username: str = Field(..., description="Username")
    password: str = Field(..., description="Password")
    virtual_host: str = Field("/", description="Virtual host")
    use_ssl: bool = Field(False, description="Use SSL connection")
    description: Optional[str] = Field(None, description="Connection description")


class RabbitMQConnectionCreate(RabbitMQConnectionBase):
    pass


class RabbitMQConnectionUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    management_port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    virtual_host: Optional[str] = None
    use_ssl: Optional[bool] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class RabbitMQConnection(RabbitMQConnectionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class ConnectionTestResult(BaseModel):
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None


class QueueInfo(BaseModel):
    name: str
    vhost: str
    durable: bool
    auto_delete: bool
    exclusive: bool
    messages: int
    consumers: int
    state: str


class ExchangeInfo(BaseModel):
    name: str
    vhost: str
    type: str
    durable: bool
    auto_delete: bool
    internal: bool


class VHostInfo(BaseModel):
    name: str
    description: Optional[str] = None
    tags: List[str] = []


class UserInfo(BaseModel):
    name: str
    tags: List[str] = []


class BindingInfo(BaseModel):
    source: str
    destination: str
    destination_type: str
    routing_key: str
    vhost: str


class ClusterDiscovery(BaseModel):
    queues: List[QueueInfo]
    exchanges: List[ExchangeInfo]
    vhosts: List[VHostInfo]
    users: List[UserInfo]
    bindings: List[BindingInfo]


class PublishMessage(BaseModel):
    connection_id: int
    vhost: str = "/"
    exchange: str = ""
    routing_key: str
    message: str
    properties: Optional[Dict[str, Any]] = None
    vhost: str = "/"


class PublishResult(BaseModel):
    success: bool
    message: str
    message_id: Optional[str] = None


class ConsumeRequest(BaseModel):
    connection_id: int
    queue: str
    vhost: str = "/"
    auto_ack: bool = True
    max_messages: Optional[int] = 10


class ConsumedMessage(BaseModel):
    body: str
    properties: Dict[str, Any]
    delivery_info: Dict[str, Any]
    timestamp: datetime
