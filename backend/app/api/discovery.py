from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db, RabbitMQConnection as DBConnection
from app.models import ClusterDiscovery
from app.services.rabbitmq_service import RabbitMQService

router = APIRouter()


@router.get("/{connection_id}/cluster", response_model=ClusterDiscovery)
async def discover_cluster(connection_id: int, db: Session = Depends(get_db)):
    """Discover all objects in a RabbitMQ cluster"""
    db_connection = db.query(DBConnection).filter(
        DBConnection.id == connection_id,
        DBConnection.is_active == True
    ).first()
    
    if not db_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    try:
        rabbitmq_service = RabbitMQService(db_connection)
        return rabbitmq_service.discover_cluster()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to discover cluster: {str(e)}"
        )


@router.get("/{connection_id}/queues")
async def get_queues(connection_id: int, vhost: str = None, db: Session = Depends(get_db)):
    """Get queues from a specific connection, optionally filtered by vhost"""
    db_connection = db.query(DBConnection).filter(
        DBConnection.id == connection_id,
        DBConnection.is_active == True
    ).first()
    
    if not db_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    try:
        rabbitmq_service = RabbitMQService(db_connection)
        discovery = rabbitmq_service.discover_cluster()
        
        queues = discovery.queues
        if vhost:
            queues = [q for q in queues if q.vhost == vhost]
        
        return {"queues": queues}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get queues: {str(e)}"
        )


@router.get("/{connection_id}/exchanges")
async def get_exchanges(connection_id: int, vhost: str = None, db: Session = Depends(get_db)):
    """Get exchanges from a specific connection, optionally filtered by vhost"""
    db_connection = db.query(DBConnection).filter(
        DBConnection.id == connection_id,
        DBConnection.is_active == True
    ).first()
    
    if not db_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    try:
        rabbitmq_service = RabbitMQService(db_connection)
        discovery = rabbitmq_service.discover_cluster()
        
        exchanges = discovery.exchanges
        if vhost:
            exchanges = [e for e in exchanges if e.vhost == vhost]
        
        return {"exchanges": exchanges}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get exchanges: {str(e)}"
        )


@router.get("/{connection_id}/vhosts")
async def get_vhosts(connection_id: int, db: Session = Depends(get_db)):
    """Get virtual hosts from a specific connection"""
    db_connection = db.query(DBConnection).filter(
        DBConnection.id == connection_id,
        DBConnection.is_active == True
    ).first()
    
    if not db_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    try:
        rabbitmq_service = RabbitMQService(db_connection)
        discovery = rabbitmq_service.discover_cluster()
        
        return {"vhosts": discovery.vhosts}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get vhosts: {str(e)}"
        )


@router.get("/{connection_id}/users")
async def get_users(connection_id: int, db: Session = Depends(get_db)):
    """Get users from a specific connection"""
    db_connection = db.query(DBConnection).filter(
        DBConnection.id == connection_id,
        DBConnection.is_active == True
    ).first()
    
    if not db_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    try:
        rabbitmq_service = RabbitMQService(db_connection)
        discovery = rabbitmq_service.discover_cluster()
        
        return {"users": discovery.users}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get users: {str(e)}"
        )
