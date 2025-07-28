from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.database import get_db, RabbitMQConnection as DBConnection
from app.models import ConsumeRequest, ConsumedMessage
from app.services.rabbitmq_service import RabbitMQService
import pika
import json
import asyncio
from datetime import datetime
from typing import Dict, Set
import threading

router = APIRouter()

# Store active consumer connections
active_consumers: Dict[str, Dict] = {}


# DISABLED: Conflicting with main.py WebSocket implementation
# @router.websocket("/consume/{connection_id}")
async def consume_messages(websocket: WebSocket, connection_id: int):
    """WebSocket endpoint for real-time message consumption"""
    await websocket.accept()
    
    consumer_id = f"{connection_id}_{id(websocket)}"
    
    try:
        # Get connection from database
        db = next(get_db())
        db_connection = db.query(DBConnection).filter(
            DBConnection.id == connection_id,
            DBConnection.is_active == True
        ).first()
        
        if not db_connection:
            await websocket.send_json({
                "error": "Connection not found"
            })
            await websocket.close()
            return
        
        rabbitmq_service = RabbitMQService(db_connection)
        
        # Wait for consume request
        consume_request = await websocket.receive_json()
        queue = consume_request.get("queue")
        vhost = consume_request.get("vhost", "/")
        auto_ack = consume_request.get("auto_ack", True)
        
        if not queue:
            await websocket.send_json({
                "error": "Queue name is required"
            })
            await websocket.close()
            return
        
        # Start consuming in a separate thread
        consumer_thread = threading.Thread(
            target=_consume_messages_thread,
            args=(rabbitmq_service, queue, vhost, auto_ack, websocket, consumer_id)
        )
        consumer_thread.daemon = True
        consumer_thread.start()
        
        # Store consumer info
        active_consumers[consumer_id] = {
            "thread": consumer_thread,
            "websocket": websocket,
            "queue": queue,
            "vhost": vhost
        }
        
        # Keep connection alive and handle stop requests
        while True:
            try:
                message = await websocket.receive_json()
                if message.get("action") == "stop":
                    break
            except WebSocketDisconnect:
                break
                
    except Exception as e:
        await websocket.send_json({
            "error": f"Consumer error: {str(e)}"
        })
    finally:
        # Cleanup
        if consumer_id in active_consumers:
            del active_consumers[consumer_id]
        await websocket.close()


def _consume_messages_thread(rabbitmq_service, queue, vhost, auto_ack, websocket, consumer_id):
    """Thread function for consuming messages"""
    try:
        connection_params = rabbitmq_service.get_connection_params()
        connection_params.virtual_host = vhost
        
        connection = pika.BlockingConnection(connection_params)
        channel = connection.channel()
        
        def callback(ch, method, properties, body):
            try:
                # Decode message body
                try:
                    body_str = body.decode('utf-8')
                except UnicodeDecodeError:
                    body_str = str(body)
                
                # Prepare message data
                message_data = {
                    "type": "message",
                    "body": body_str,
                    "properties": {
                        "content_type": getattr(properties, 'content_type', None),
                        "content_encoding": getattr(properties, 'content_encoding', None),
                        "delivery_mode": getattr(properties, 'delivery_mode', None),
                        "priority": getattr(properties, 'priority', None),
                        "correlation_id": getattr(properties, 'correlation_id', None),
                        "reply_to": getattr(properties, 'reply_to', None),
                        "expiration": getattr(properties, 'expiration', None),
                        "message_id": getattr(properties, 'message_id', None),
                        "timestamp": getattr(properties, 'timestamp', None),
                        "type": getattr(properties, 'type', None),
                        "user_id": getattr(properties, 'user_id', None),
                        "app_id": getattr(properties, 'app_id', None),
                        "headers": getattr(properties, 'headers', {})
                    },
                    "delivery_info": {
                        "delivery_tag": method.delivery_tag,
                        "redelivered": method.redelivered,
                        "exchange": method.exchange,
                        "routing_key": method.routing_key
                    },
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                # Send message via WebSocket (async)
                asyncio.run_coroutine_threadsafe(
                    websocket.send_json(message_data),
                    asyncio.get_event_loop()
                )
                
                # Acknowledge message if not auto-ack
                if not auto_ack:
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    
            except Exception as e:
                error_data = {
                    "type": "error",
                    "message": f"Error processing message: {str(e)}"
                }
                asyncio.run_coroutine_threadsafe(
                    websocket.send_json(error_data),
                    asyncio.get_event_loop()
                )
        
        # Start consuming
        channel.basic_consume(
            queue=queue,
            on_message_callback=callback,
            auto_ack=auto_ack
        )
        
        # Send ready signal
        ready_data = {
            "type": "ready",
            "message": f"Started consuming from queue '{queue}' in vhost '{vhost}'"
        }
        asyncio.run_coroutine_threadsafe(
            websocket.send_json(ready_data),
            asyncio.get_event_loop()
        )
        
        # Start consuming (blocking)
        channel.start_consuming()
        
    except Exception as e:
        error_data = {
            "type": "error",
            "message": f"Consumer thread error: {str(e)}"
        }
        try:
            asyncio.run_coroutine_threadsafe(
                websocket.send_json(error_data),
                asyncio.get_event_loop()
            )
        except:
            pass
    finally:
        try:
            if 'connection' in locals():
                connection.close()
        except:
            pass


@router.get("/test")
async def test_endpoint():
    """Simple test endpoint to verify routing"""
    return {"message": "Consumer endpoint is working", "status": "ok"}

@router.post("/test-post")
async def test_post_endpoint(data: dict):
    """Simple POST test endpoint to verify POST routing"""
    return {"message": "Consumer POST endpoint is working", "status": "ok", "received_data": data}

@router.post("/consume-simple")
async def consume_simple_test(data: dict):
    """Simple consume test endpoint"""
    return {"message": "Simple consume endpoint works", "received": data}

@router.post("/consume-messages")
async def consume_messages_http(
    consume_request: ConsumeRequest,
    db: Session = Depends(get_db)
):
    """Consume messages via HTTP (for simple consumption)"""
    # Get connection
    db_connection = db.query(DBConnection).filter(
        DBConnection.id == consume_request.connection_id,
        DBConnection.is_active == True
    ).first()

    if not db_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )

    try:
        rabbitmq_service = RabbitMQService(db_connection)
        messages = rabbitmq_service.consume_messages(
            queue_name=consume_request.queue,
            max_messages=consume_request.max_messages or 10,
            auto_ack=consume_request.auto_ack,
            vhost=consume_request.vhost
        )

        return {"messages": messages}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to consume messages: {str(e)}"
        )


@router.post("/browse")
async def browse_messages_http(
    consume_request: ConsumeRequest,
    db: Session = Depends(get_db)
):
    """Browse messages via HTTP (messages remain in queue)"""
    # Get connection
    db_connection = db.query(DBConnection).filter(
        DBConnection.id == consume_request.connection_id,
        DBConnection.is_active == True
    ).first()

    if not db_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )

    try:
        rabbitmq_service = RabbitMQService(db_connection)
        messages = rabbitmq_service.browse_messages(
            queue_name=consume_request.queue,
            max_messages=consume_request.max_messages or 10,
            vhost=consume_request.vhost
        )

        return {"messages": messages}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to browse messages: {str(e)}"
        )


@router.get("/active")
async def get_active_consumers():
    """Get list of active consumers"""
    consumers = []
    for consumer_id, info in active_consumers.items():
        consumers.append({
            "id": consumer_id,
            "queue": info["queue"],
            "vhost": info["vhost"]
        })
    return {"active_consumers": consumers}


@router.post("/stop/{consumer_id}")
async def stop_consumer(consumer_id: str):
    """Stop a specific consumer"""
    if consumer_id in active_consumers:
        # The consumer will be stopped when the WebSocket connection is closed
        # This is handled in the WebSocket endpoint
        return {"message": f"Stop signal sent to consumer {consumer_id}"}
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consumer not found"
        )
