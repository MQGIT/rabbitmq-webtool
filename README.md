# RabbitMQ Web UI

A modern, feature-rich web interface for managing RabbitMQ clusters with real-time message publishing, browsing, and consumption capabilities.

![RabbitMQ Web UI](https://img.shields.io/badge/RabbitMQ-Web%20UI-orange)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)
![Kubernetes](https://img.shields.io/badge/Kubernetes-Native-green)
![React](https://img.shields.io/badge/React-Frontend-61dafb)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688)

## 🚀 Features

### 📤 **Publisher**
- Send messages to exchanges or queues
- Support for all RabbitMQ exchange types (direct, topic, fanout, headers)
- Custom message properties and headers
- Multi-vhost support

### 📋 **Browser** 
- View messages without consuming them (safe browsing)
- Message content preview with JSON formatting
- Message properties and metadata display
- Queue statistics and information

### 📥 **Consumer**
- Consume messages from queues
- Configurable message limits
- Auto-acknowledge or manual acknowledgment
- Real-time message display with two-panel interface

### 🔗 **Connection Management**
- Multiple RabbitMQ cluster connections
- Encrypted credential storage
- Connection testing and validation
- Easy switching between environments

### 🏠 **Multi-Vhost Support**
- Automatic vhost discovery
- Per-vhost exchange and queue listing
- Seamless vhost switching
- Complete isolation between virtual hosts

## 🏗️ Architecture

- **Frontend**: React.js with modern UI components
- **Backend**: FastAPI with async support
- **Database**: SQLite for connection storage
- **Deployment**: Docker containers with Kubernetes support
- **Security**: Encrypted credential storage, HTTPS ready

## 📦 Quick Start

### Docker Compose (Recommended)

1. **Clone and configure:**
```bash
git clone <your-repo>
cd rabbitmq-web-ui
```

2. **Start the application:**
```bash
docker-compose up -d
```

3. **Access the UI:**
Open http://localhost:3000

### Kubernetes Deployment

1. **Deploy the application:**
```bash
kubectl apply -f k8s/
```

2. **Access via port-forward:**
```bash
kubectl port-forward svc/rabbitmq-web-ui 3000:3000
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database path | `sqlite:///./rabbitmq_web_ui.db` |
| `ENCRYPTION_KEY` | Key for encrypting credentials | `auto-generated` |
| `CORS_ORIGINS` | Allowed CORS origins | `["*"]` |

### RabbitMQ Connection

Add your RabbitMQ connections through the web interface:

1. Navigate to the Connections page
2. Click "Add Connection"
3. Enter your RabbitMQ cluster details:
   - **Name**: Friendly name for the connection
   - **Host**: RabbitMQ server hostname
   - **Port**: AMQP port (default: 5672)
   - **Management Port**: Management API port (default: 15672)
   - **Username/Password**: RabbitMQ credentials
   - **Virtual Host**: Default vhost (default: "/")

## 🔧 Development

### Prerequisites
- Node.js 18+
- Python 3.9+
- Docker (optional)

### Local Development

1. **Backend setup:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

2. **Frontend setup:**
```bash
cd frontend
npm install
npm start
```

3. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 📚 API Documentation

The backend provides a comprehensive REST API with automatic OpenAPI documentation:

- **Interactive Docs**: `/docs` (Swagger UI)
- **OpenAPI Schema**: `/openapi.json`

### Key Endpoints

- `GET /api/connections/` - List all connections
- `POST /api/connections/` - Create new connection
- `GET /api/discovery/{connection_id}/vhosts` - List vhosts
- `GET /api/discovery/{connection_id}/exchanges` - List exchanges
- `GET /api/discovery/{connection_id}/queues` - List queues
- `POST /api/publisher/publish` - Publish messages
- `POST /api/consumer/browse` - Browse messages
- `POST /api/consumer/consume-messages` - Consume messages

## 🐳 Docker Images

Pre-built Docker images are available:

- **Backend**: `rmqk8/rabbitmq-web-ui:latest`
- **Frontend**: `rmqk8/rabbitmq-web-ui-frontend:latest`

## 🔒 Security

- **Credential Encryption**: All RabbitMQ credentials are encrypted at rest
- **HTTPS Support**: Ready for TLS termination
- **CORS Configuration**: Configurable cross-origin policies
- **Input Validation**: Comprehensive request validation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Report bugs and feature requests via GitHub Issues
- **Documentation**: Check the `/docs` folder for detailed guides
- **Community**: Join our discussions for help and feedback

## 🙏 Acknowledgments

- Built with ❤️ for the RabbitMQ community
- Inspired by the need for modern RabbitMQ management tools
- Thanks to all contributors and users

---

**Made with ❤️ by MarSem.org**
