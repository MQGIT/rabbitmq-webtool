from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db, RabbitMQConnection as DBConnection
from app.models import PublishMessage, PublishResult
from app.services.rabbitmq_service import RabbitMQService
import uuid
from datetime import datetime

router = APIRouter()


@router.post("/publish", response_model=PublishResult)
async def publish_message(
    message_data: PublishMessage,
    db: Session = Depends(get_db)
):
    """Publish a message to RabbitMQ"""
    # Get connection
    db_connection = db.query(DBConnection).filter(
        DBConnection.id == message_data.connection_id,
        DBConnection.is_active == True
    ).first()
    
    if not db_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    try:
        rabbitmq_service = RabbitMQService(db_connection)
        
        # Add default properties if not provided
        properties = message_data.properties or {}
        if "timestamp" not in properties:
            properties["timestamp"] = int(datetime.utcnow().timestamp())
        if "message_id" not in properties:
            properties["message_id"] = str(uuid.uuid4())
        
        # Publish message
        success = rabbitmq_service.publish_message(
            exchange=message_data.exchange,
            routing_key=message_data.routing_key,
            message=message_data.message,
            properties=properties,
            vhost=message_data.vhost
        )
        
        if success:
            return PublishResult(
                success=True,
                message="Message published successfully",
                message_id=properties.get("message_id")
            )
        else:
            return PublishResult(
                success=False,
                message="Failed to publish message"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to publish message: {str(e)}"
        )


@router.post("/validate")
async def validate_publish_params(
    message_data: PublishMessage,
    db: Session = Depends(get_db)
):
    """Validate publish parameters without actually publishing"""
    # Get connection
    db_connection = db.query(DBConnection).filter(
        DBConnection.id == message_data.connection_id,
        DBConnection.is_active == True
    ).first()
    
    if not db_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    try:
        rabbitmq_service = RabbitMQService(db_connection)
        
        # Test connection
        test_result = rabbitmq_service.test_connection()
        if not test_result.success:
            return {
                "valid": False,
                "message": f"Connection test failed: {test_result.message}"
            }
        
        # Validate exchange exists (if specified)
        if message_data.exchange:
            discovery = rabbitmq_service.discover_cluster()
            exchange_exists = any(
                e.name == message_data.exchange and e.vhost == message_data.vhost
                for e in discovery.exchanges
            )
            if not exchange_exists:
                return {
                    "valid": False,
                    "message": f"Exchange '{message_data.exchange}' not found in vhost '{message_data.vhost}'"
                }
        
        return {
            "valid": True,
            "message": "Parameters are valid"
        }
        
    except Exception as e:
        return {
            "valid": False,
            "message": f"Validation failed: {str(e)}"
        }
