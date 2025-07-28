import pika
import requests
import json
from typing import List, Dict, Any, Optional
from requests.auth import HTTPBasicAuth
from datetime import datetime
from app.models import (
    QueueInfo, ExchangeInfo, VHostInfo, UserInfo, BindingInfo, 
    ClusterDiscovery, ConnectionTestResult
)
from app.database import RabbitMQConnection
from app.services.encryption import encryption_service


class RabbitMQService:
    def __init__(self, connection: RabbitMQConnection):
        self.connection = connection
        self.host = connection.host
        self.port = connection.port
        self.management_port = connection.management_port
        self.username = connection.username
        self.password = encryption_service.decrypt(connection.password_encrypted)
        self.vhost = connection.virtual_host
        self.use_ssl = connection.use_ssl
        
        # Management API base URL
        protocol = "https" if self.use_ssl else "http"
        self.management_url = f"{protocol}://{self.host}:{self.management_port}/api"
        self.auth = HTTPBasicAuth(self.username, self.password)
    
    def test_connection(self) -> ConnectionTestResult:
        """Test both AMQP and Management API connections"""
        try:
            # Test AMQP connection
            credentials = pika.PlainCredentials(self.username, self.password)
            connection_params = pika.ConnectionParameters(
                host=self.host,
                port=self.port,
                virtual_host=self.vhost,
                credentials=credentials
            )
            
            connection = pika.BlockingConnection(connection_params)
            connection.close()
            
            # Test Management API
            response = requests.get(
                f"{self.management_url}/overview",
                auth=self.auth,
                timeout=10
            )
            response.raise_for_status()
            
            overview = response.json()
            return ConnectionTestResult(
                success=True,
                message="Connection successful",
                details={
                    "rabbitmq_version": overview.get("rabbitmq_version"),
                    "erlang_version": overview.get("erlang_version"),
                    "cluster_name": overview.get("cluster_name")
                }
            )
            
        except Exception as e:
            return ConnectionTestResult(
                success=False,
                message=f"Connection failed: {str(e)}"
            )
    
    def discover_cluster(self) -> ClusterDiscovery:
        """Discover all objects in the RabbitMQ cluster"""
        try:
            queues = self._get_queues()
            exchanges = self._get_exchanges()
            vhosts = self._get_vhosts()
            users = self._get_users()
            bindings = self._get_bindings()
            
            return ClusterDiscovery(
                queues=queues,
                exchanges=exchanges,
                vhosts=vhosts,
                users=users,
                bindings=bindings
            )
        except Exception as e:
            raise Exception(f"Failed to discover cluster: {str(e)}")
    
    def _get_queues(self) -> List[QueueInfo]:
        """Get all queues from the cluster"""
        response = requests.get(f"{self.management_url}/queues", auth=self.auth)
        response.raise_for_status()
        
        queues = []
        for queue_data in response.json():
            queues.append(QueueInfo(
                name=queue_data["name"],
                vhost=queue_data["vhost"],
                durable=queue_data.get("durable", False),
                auto_delete=queue_data.get("auto_delete", False),
                exclusive=queue_data.get("exclusive", False),
                messages=queue_data.get("messages", 0),
                consumers=queue_data.get("consumers", 0),
                state=queue_data.get("state", "running")
            ))
        
        return queues
    
    def _get_exchanges(self) -> List[ExchangeInfo]:
        """Get all exchanges from the cluster"""
        response = requests.get(f"{self.management_url}/exchanges", auth=self.auth)
        response.raise_for_status()
        
        exchanges = []
        for exchange_data in response.json():
            exchanges.append(ExchangeInfo(
                name=exchange_data["name"],
                vhost=exchange_data["vhost"],
                type=exchange_data.get("type", "direct"),
                durable=exchange_data.get("durable", False),
                auto_delete=exchange_data.get("auto_delete", False),
                internal=exchange_data.get("internal", False)
            ))
        
        return exchanges
    
    def _get_vhosts(self) -> List[VHostInfo]:
        """Get all virtual hosts from the cluster"""
        response = requests.get(f"{self.management_url}/vhosts", auth=self.auth)
        response.raise_for_status()
        
        vhosts = []
        for vhost_data in response.json():
            vhosts.append(VHostInfo(
                name=vhost_data["name"],
                description=vhost_data.get("description"),
                tags=vhost_data.get("tags", [])
            ))
        
        return vhosts
    
    def _get_users(self) -> List[UserInfo]:
        """Get all users from the cluster"""
        response = requests.get(f"{self.management_url}/users", auth=self.auth)
        response.raise_for_status()
        
        users = []
        for user_data in response.json():
            users.append(UserInfo(
                name=user_data["name"],
                tags=user_data.get("tags", [])
            ))
        
        return users
    
    def _get_bindings(self) -> List[BindingInfo]:
        """Get all bindings from the cluster"""
        response = requests.get(f"{self.management_url}/bindings", auth=self.auth)
        response.raise_for_status()
        
        bindings = []
        for binding_data in response.json():
            bindings.append(BindingInfo(
                source=binding_data.get("source", ""),
                destination=binding_data["destination"],
                destination_type=binding_data["destination_type"],
                routing_key=binding_data.get("routing_key", ""),
                vhost=binding_data["vhost"]
            ))
        
        return bindings
    
    def publish_message(self, exchange: str, routing_key: str, message: str,
                       properties: Optional[Dict[str, Any]] = None, vhost: str = None) -> bool:
        """Publish a message to RabbitMQ"""
        try:
            credentials = pika.PlainCredentials(self.username, self.password)
            connection_params = pika.ConnectionParameters(
                host=self.host,
                port=self.port,
                virtual_host=vhost or self.vhost,
                credentials=credentials
            )
            
            connection = pika.BlockingConnection(connection_params)
            channel = connection.channel()

            # Convert properties to pika BasicProperties
            basic_properties = None
            if properties:
                basic_properties = pika.BasicProperties(**properties)

            channel.basic_publish(
                exchange=exchange,
                routing_key=routing_key,
                body=message.encode('utf-8'),
                properties=basic_properties
            )
            
            connection.close()
            return True
            
        except Exception as e:
            raise Exception(f"Failed to publish message: {str(e)}")
    
    def get_connection_params(self) -> pika.ConnectionParameters:
        """Get pika connection parameters"""
        credentials = pika.PlainCredentials(self.username, self.password)
        return pika.ConnectionParameters(
            host=self.host,
            port=self.port,
            virtual_host=self.vhost,
            credentials=credentials
        )

    def consume_messages(self, queue_name: str, max_messages: int = 10, auto_ack: bool = True, vhost: str = None) -> List[Dict[str, Any]]:
        """Consume messages from a queue (removes them from queue)"""
        try:
            credentials = pika.PlainCredentials(self.username, self.password)
            connection_params = pika.ConnectionParameters(
                host=self.host,
                port=self.port,
                virtual_host=vhost or self.vhost,
                credentials=credentials
            )

            connection = pika.BlockingConnection(connection_params)
            channel = connection.channel()

            messages = []

            # Use basic_get with proper error handling
            for _ in range(max_messages):
                try:
                    method_frame, header_frame, body = channel.basic_get(
                        queue=queue_name,
                        auto_ack=auto_ack
                    )

                    if method_frame is None:
                        break  # No more messages

                    # If auto_ack is False, we need to manually acknowledge
                    if not auto_ack and method_frame:
                        channel.basic_ack(delivery_tag=method_frame.delivery_tag)

                    message = {
                        "body": body.decode('utf-8') if body else None,
                        "properties": {
                            "content_type": header_frame.content_type,
                            "delivery_mode": header_frame.delivery_mode,
                            "priority": header_frame.priority,
                            "correlation_id": header_frame.correlation_id,
                            "reply_to": header_frame.reply_to,
                            "expiration": header_frame.expiration,
                            "message_id": header_frame.message_id,
                            "timestamp": header_frame.timestamp,
                            "type": header_frame.type,
                            "user_id": header_frame.user_id,
                            "app_id": header_frame.app_id,
                            "headers": header_frame.headers
                        },
                        "routing_key": method_frame.routing_key,
                        "exchange": method_frame.exchange,
                        "queue": queue_name,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    messages.append(message)

                except Exception as msg_error:
                    print(f"Error processing individual message: {msg_error}")
                    continue

            connection.close()
            return messages

        except Exception as e:
            raise Exception(f"Failed to consume messages: {str(e)}")

    def browse_messages(self, queue_name: str, max_messages: int = 10, vhost: str = None) -> List[Dict[str, Any]]:
        """Browse messages in a queue (messages remain in queue)"""
        try:
            credentials = pika.PlainCredentials(self.username, self.password)
            connection_params = pika.ConnectionParameters(
                host=self.host,
                port=self.port,
                virtual_host=vhost or self.vhost,
                credentials=credentials
            )

            connection = pika.BlockingConnection(connection_params)
            channel = connection.channel()

            messages = []
            temp_messages = []

            # Get messages without acknowledging them
            for _ in range(max_messages):
                method_frame, header_frame, body = channel.basic_get(
                    queue=queue_name,
                    auto_ack=False
                )

                if method_frame is None:
                    break  # No more messages

                # Store delivery tag for later rejection
                temp_messages.append(method_frame.delivery_tag)

                message = {
                    "body": body.decode('utf-8') if body else None,
                    "properties": {
                        "content_type": header_frame.content_type,
                        "delivery_mode": header_frame.delivery_mode,
                        "priority": header_frame.priority,
                        "correlation_id": header_frame.correlation_id,
                        "reply_to": header_frame.reply_to,
                        "expiration": header_frame.expiration,
                        "message_id": header_frame.message_id,
                        "timestamp": header_frame.timestamp,
                        "type": header_frame.type,
                        "user_id": header_frame.user_id,
                        "app_id": header_frame.app_id,
                        "headers": header_frame.headers
                    },
                    "routing_key": method_frame.routing_key,
                    "exchange": method_frame.exchange,
                    "queue": queue_name,
                    "timestamp": datetime.utcnow().isoformat()
                }
                messages.append(message)

            # Reject all messages to put them back in the queue
            for delivery_tag in temp_messages:
                channel.basic_nack(delivery_tag=delivery_tag, requeue=True)

            connection.close()
            return messages

        except Exception as e:
            raise Exception(f"Failed to browse messages: {str(e)}")
