# RabbitMQ Web UI - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 Kubernetes Cluster                              │
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────────┐  │
│  │   Ingress       │    │   Apps          │    │   RMQ-Kafka                 │  │
│  │   Controller    │    │   Namespace     │    │   Namespace                 │  │
│  │                 │    │                 │    │                             │  │
│  │  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌─────────────────────┐    │  │
│  │  │  Nginx    │  │    │  │ RabbitMQ  │  │    │  │   RabbitMQ Cluster  │    │  │
│  │  │  Ingress  │◄─┼────┼─►│  Web UI   │◄─┼────┼─►│   (rmqkafka)        │    │  │
│  │  │           │  │    │  │           │  │    │  │                     │    │  │
│  │  └───────────┘  │    │  └───────────┘  │    │  │  - Management API   │    │  │
│  └─────────────────┘    │                 │    │  │  - AMQP Protocol    │    │  │
│                         │  ┌───────────┐  │    │  │  - Multiple VHosts  │    │  │
│                         │  │Persistent │  │    │  └─────────────────────┘    │  │
│                         │  │ Volume    │  │    └─────────────────────────────┘  │
│                         │  └───────────┘  │                                     │
│                         └─────────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend (React + TypeScript)
```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Publisher  │  │  Consumer   │  │    Connection Mgmt      │  │
│  │    Page     │  │    Page     │  │        Page             │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Shared State Management                       │  │
│  │              (Connection Context)                          │  │
│  └─────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   HTTP      │  │  WebSocket  │  │      UI Components      │  │
│  │   Client    │  │   Client    │  │      (Tailwind CSS)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Backend (FastAPI + Python)
```
┌─────────────────────────────────────────────────────────────────┐
│                         Backend Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Connections │  │  Discovery  │  │    Publisher/Consumer   │  │
│  │     API     │  │     API     │  │         APIs            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                  Business Logic Layer                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │  │
│  │  │ RabbitMQ    │  │ Connection  │  │    Encryption       │  │  │
│  │  │ Service     │  │ Management  │  │    Service          │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    Data Layer                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │  │
│  │  │ SQLAlchemy  │  │   SQLite    │  │    Pika (AMQP)     │  │  │
│  │  │    ORM      │  │  Database   │  │     Client          │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Publisher Flow
```
User Input → React Form → API Call → FastAPI → RabbitMQ Service → Pika → RabbitMQ Cluster
     ↑                                                                              ↓
     └─── Success/Error Response ←─── JSON Response ←─── Result ←─── AMQP Response ←─┘
```

### Consumer Flow
```
User Action → WebSocket Connection → FastAPI → RabbitMQ Service → Pika Consumer
     ↑                                                                    ↓
     └─── Real-time Messages ←─── WebSocket Stream ←─── Message Handler ←─┘
```

### Connection Management Flow
```
User Input → React Form → Encryption → Database Storage → Connection Pool
     ↑                                                           ↓
     └─── Connection List ←─── Decryption ←─── Database Query ←───┘
```

## Security Architecture

### Authentication & Authorization
- No built-in authentication (designed for internal cluster use)
- RBAC configured for Kubernetes service account
- Network policies restrict traffic flow

### Data Security
- Passwords encrypted at rest using Fernet encryption
- Secure key management via Kubernetes secrets
- Non-root container execution

### Network Security
```
Internet → Ingress Controller → Service → Pod → RabbitMQ Cluster
    ↑            ↑                ↑        ↑           ↑
   TLS      Rate Limiting    Load Balancer  Security   Network
 Optional    & CORS           & Health      Context    Policies
                              Checks
```

## Deployment Architecture

### Container Structure
```
┌─────────────────────────────────────────────────────────────────┐
│                    Container Image                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    Nginx (Port 80)                         │  │
│  │  - Serves React static files                               │  │
│  │  - Proxies API requests to backend                         │  │
│  │  - Handles WebSocket upgrades                              │  │
│  └─────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                 FastAPI Backend (Port 8000)                │  │
│  │  - REST API endpoints                                      │  │
│  │  - WebSocket handlers                                      │  │
│  │  - Database operations                                     │  │
│  └─────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                   Supervisor                               │  │
│  │  - Process management                                      │  │
│  │  - Health monitoring                                       │  │
│  │  - Log aggregation                                         │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Kubernetes Resources
```
Namespace (apps)
├── ConfigMap (configuration)
├── Secret (encryption keys)
├── PersistentVolumeClaim (database storage)
├── ServiceAccount (RBAC)
├── Role & RoleBinding (permissions)
├── Deployment (application pods)
├── Service (internal networking)
├── Ingress (external access)
├── NetworkPolicy (traffic rules)
└── HorizontalPodAutoscaler (scaling)
```

## Scalability Design

### Horizontal Scaling
- Stateless application design
- Shared database via persistent volume
- Load balancing via Kubernetes service
- Auto-scaling based on CPU/memory metrics

### Performance Considerations
- Connection pooling for RabbitMQ
- Efficient WebSocket management
- Optimized React rendering
- Nginx caching for static assets

## Monitoring & Observability

### Health Checks
- Application: `/health` endpoint
- Kubernetes: Liveness and readiness probes
- Database: Connection validation

### Logging
- Application logs via stdout/stderr
- Nginx access logs
- Supervisor process logs
- Kubernetes event logs

### Metrics
- Prometheus-compatible endpoints
- Resource utilization metrics
- Custom application metrics

## Integration Points

### RabbitMQ Cluster Integration
- Management API for discovery
- AMQP protocol for messaging
- Multiple virtual host support
- Connection validation and testing

### Kubernetes Integration
- Service discovery
- Configuration management
- Secret management
- Network policies
- Resource management

This architecture provides a robust, scalable, and secure foundation for RabbitMQ cluster management through a modern web interface.
