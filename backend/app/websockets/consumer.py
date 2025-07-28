from fastapi import WebSocket
import asyncio
import aio_pika
from datetime import datetime
import json
from typing import Dict, Optional
from app.services.rabbitmq_service import RabbitMQService

class RabbitMQConsumerManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}
        self.active_consumers: Dict[int, asyncio.Task] = {}

    async def connect(self, websocket: WebSocket, connection_id: int):
        """Establish WebSocket connection"""
        await websocket.accept()
        self.active_connections[connection_id] = websocket

    def disconnect(self, connection_id: int):
        """Remove WebSocket connection and stop consumer"""
        self.active_connections.pop(connection_id, None)
        if connection_id in self.active_consumers:
            self.active_consumers[connection_id].cancel()
            self.active_consumers.pop(connection_id)

    async def consume(self, connection_id: int, queue_name: str, rabbitmq_service: RabbitMQService):
        """Start consuming messages from RabbitMQ queue"""
        try:
            # Get connection parameters
            params = rabbitmq_service.get_connection_params()
            
            # Create asynchronous connection
            connection = await aio_pika.connect_robust(
                host=params.host,
                port=params.port,
                login=params.credentials.username,
                password=params.credentials.password,
                virtualhost=params.virtual_host
            )

            # Create channel
            channel = await connection.channel()
            await channel.set_qos(prefetch_count=1)

            # Declare queue (passive=True means we only check if it exists)
            queue = await channel.declare_queue(queue_name, passive=True)

            async def process_message(message: aio_pika.IncomingMessage):
                """Process each received message"""
                async with message.process():
                    websocket = self.active_connections.get(connection_id)
                    if websocket:
                        try:
                            body = message.body.decode()
                            # Try to parse JSON if the message is JSON formatted
                            try:
                                body = json.loads(body)
                            except json.JSONDecodeError:
                                pass  # Keep body as string if not JSON

                            msg_data = {
                                "body": body,
                                "routing_key": message.routing_key,
                                "exchange": message.exchange,
                                "properties": {
                                    "content_type": message.content_type,
                                    "content_encoding": message.content_encoding,
                                    "headers": message.headers,
                                    "delivery_mode": message.delivery_mode,
                                    "priority": message.priority,
                                    "correlation_id": message.correlation_id,
                                    "reply_to": message.reply_to,
                                    "expiration": message.expiration.isoformat() if message.expiration else None,
                                    "message_id": message.message_id,
                                    "timestamp": message.timestamp.isoformat() if message.timestamp else None,
                                    "type": message.type,
                                    "user_id": message.user_id,
                                    "app_id": message.app_id,
                                },
                                "received_timestamp": datetime.utcnow().isoformat()
                            }
                            await websocket.send_json(msg_data)
                        except Exception as e:
                            await websocket.send_json({"error": f"Error processing message: {str(e)}"})

            # Start consuming
            consumer_tag = await queue.consume(process_message)
            
            # Keep connection alive until disconnect
            while connection_id in self.active_connections:
                await asyncio.sleep(1)

        except Exception as e:
            websocket = self.active_connections.get(connection_id)
            if websocket:
                await websocket.send_json({"error": f"Consumer error: {str(e)}"})
        finally:
            # Cleanup
            if 'connection' in locals():
                await connection.close()
            self.disconnect(connection_id)
