from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
from contextlib import asynccontextmanager

from app.database import engine, Base, RabbitMQConnection, get_db
from app.api import connections, discovery, publisher, consumer
from app.services.encryption import EncryptionService
from app.websockets.consumer import RabbitMQConsumerManager
from app.services.rabbitmq_service import RabbitMQService


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    app.state.consumer_manager = RabbitMQConsumerManager()
    yield
    # Shutdown
    pass


app = FastAPI(
    title="RabbitMQ Web UI API",
    description="REST API for RabbitMQ cluster management and operations",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(connections.router, prefix="/api/connections", tags=["connections"])
app.include_router(discovery.router, prefix="/api/discovery", tags=["discovery"])
app.include_router(publisher.router, prefix="/api/publisher", tags=["publisher"])
app.include_router(consumer.router, prefix="/api/consumer", tags=["consumer"])


@app.get("/")
async def root():
    return {"message": "RabbitMQ Web UI API", "version": "1.0.0"}


@app.websocket("/api/consumer/consume/{connection_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    connection_id: int,
    db=Depends(get_db)
):
    consumer_manager = app.state.consumer_manager
    try:
        # Get RabbitMQ connection from database
        db_connection = db.query(RabbitMQConnection).filter(RabbitMQConnection.id == connection_id).first()
        if not db_connection:
            await websocket.close(code=4004, reason="Connection not found")
            return

        # Initialize RabbitMQ service
        rabbitmq_service = RabbitMQService(db_connection)

        # Accept WebSocket connection
        await consumer_manager.connect(websocket, connection_id)

        # Wait for consumer configuration
        while True:
            try:
                data = await websocket.receive_json()
                if data.get("action") == "start":
                    # Start consuming messages
                    await consumer_manager.consume(
                        connection_id,
                        data["queue"],
                        rabbitmq_service
                    )
            except WebSocketDisconnect:
                break
            except Exception as e:
                await websocket.send_json({"error": f"Error: {str(e)}"})
                break

    except Exception as e:
        print(f"WebSocket error: {str(e)}")
    finally:
        consumer_manager.disconnect(connection_id)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("ENVIRONMENT") == "development"
    )
