from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db, RabbitMQConnection as DBConnection
from app.models import (
    RabbitMQConnection, RabbitMQConnectionCreate, RabbitMQConnectionUpdate,
    ConnectionTestResult
)
from app.services.encryption import encryption_service
from app.services.rabbitmq_service import RabbitMQService

router = APIRouter()


@router.post("/", response_model=RabbitMQConnection)
async def create_connection(
    connection: RabbitMQConnectionCreate,
    db: Session = Depends(get_db)
):
    """Create a new RabbitMQ connection"""
    # Check if connection name already exists
    existing = db.query(DBConnection).filter(DBConnection.name == connection.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connection name already exists"
        )
    
    # Encrypt password
    encrypted_password = encryption_service.encrypt(connection.password)
    
    # Create database record
    db_connection = DBConnection(
        name=connection.name,
        host=connection.host,
        port=connection.port,
        management_port=connection.management_port,
        username=connection.username,
        password_encrypted=encrypted_password,
        virtual_host=connection.virtual_host,
        use_ssl=connection.use_ssl,
        description=connection.description
    )
    
    db.add(db_connection)
    db.commit()
    db.refresh(db_connection)
    
    # Return connection without encrypted password
    return RabbitMQConnection(
        id=db_connection.id,
        name=db_connection.name,
        host=db_connection.host,
        port=db_connection.port,
        management_port=db_connection.management_port,
        username=db_connection.username,
        password="***",  # Don't return actual password
        virtual_host=db_connection.virtual_host,
        use_ssl=db_connection.use_ssl,
        description=db_connection.description,
        created_at=db_connection.created_at,
        updated_at=db_connection.updated_at,
        is_active=db_connection.is_active
    )


@router.get("/", response_model=List[RabbitMQConnection])
async def list_connections(db: Session = Depends(get_db)):
    """List all RabbitMQ connections"""
    connections = db.query(DBConnection).filter(DBConnection.is_active == True).all()
    
    result = []
    for conn in connections:
        result.append(RabbitMQConnection(
            id=conn.id,
            name=conn.name,
            host=conn.host,
            port=conn.port,
            management_port=conn.management_port,
            username=conn.username,
            password="***",  # Don't return actual password
            virtual_host=conn.virtual_host,
            use_ssl=conn.use_ssl,
            description=conn.description,
            created_at=conn.created_at,
            updated_at=conn.updated_at,
            is_active=conn.is_active
        ))
    
    return result


@router.get("/{connection_id}", response_model=RabbitMQConnection)
async def get_connection(connection_id: int, db: Session = Depends(get_db)):
    """Get a specific RabbitMQ connection"""
    connection = db.query(DBConnection).filter(
        DBConnection.id == connection_id,
        DBConnection.is_active == True
    ).first()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    return RabbitMQConnection(
        id=connection.id,
        name=connection.name,
        host=connection.host,
        port=connection.port,
        management_port=connection.management_port,
        username=connection.username,
        password="***",  # Don't return actual password
        virtual_host=connection.virtual_host,
        use_ssl=connection.use_ssl,
        description=connection.description,
        created_at=connection.created_at,
        updated_at=connection.updated_at,
        is_active=connection.is_active
    )


@router.put("/{connection_id}", response_model=RabbitMQConnection)
async def update_connection(
    connection_id: int,
    connection_update: RabbitMQConnectionUpdate,
    db: Session = Depends(get_db)
):
    """Update a RabbitMQ connection"""
    db_connection = db.query(DBConnection).filter(
        DBConnection.id == connection_id,
        DBConnection.is_active == True
    ).first()
    
    if not db_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    # Update fields
    update_data = connection_update.dict(exclude_unset=True)
    
    # Handle password encryption
    if "password" in update_data:
        update_data["password_encrypted"] = encryption_service.encrypt(update_data["password"])
        del update_data["password"]
    
    for field, value in update_data.items():
        setattr(db_connection, field, value)
    
    db.commit()
    db.refresh(db_connection)
    
    return RabbitMQConnection(
        id=db_connection.id,
        name=db_connection.name,
        host=db_connection.host,
        port=db_connection.port,
        management_port=db_connection.management_port,
        username=db_connection.username,
        password="***",
        virtual_host=db_connection.virtual_host,
        use_ssl=db_connection.use_ssl,
        description=db_connection.description,
        created_at=db_connection.created_at,
        updated_at=db_connection.updated_at,
        is_active=db_connection.is_active
    )


@router.delete("/{connection_id}")
async def delete_connection(connection_id: int, db: Session = Depends(get_db)):
    """Delete a RabbitMQ connection (soft delete)"""
    connection = db.query(DBConnection).filter(
        DBConnection.id == connection_id,
        DBConnection.is_active == True
    ).first()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    connection.is_active = False
    db.commit()
    
    return {"message": "Connection deleted successfully"}


@router.post("/{connection_id}/test", response_model=ConnectionTestResult)
async def test_connection(connection_id: int, db: Session = Depends(get_db)):
    """Test a RabbitMQ connection"""
    db_connection = db.query(DBConnection).filter(
        DBConnection.id == connection_id,
        DBConnection.is_active == True
    ).first()
    
    if not db_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    rabbitmq_service = RabbitMQService(db_connection)
    return rabbitmq_service.test_connection()
