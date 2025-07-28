# Getting Started with RabbitMQ Web UI

This guide will help you get the RabbitMQ Web UI up and running quickly.

## Prerequisites

- Docker and Docker Compose installed
- Access to a RabbitMQ cluster
- Basic knowledge of RabbitMQ concepts (exchanges, queues, vhosts)

## Quick Setup

### 1. Download and Configure

```bash
# Download the latest release
wget https://github.com/your-org/rabbitmq-web-ui/archive/main.zip
unzip main.zip
cd rabbitmq-web-ui-main

# Copy the example docker-compose file
cp docker-compose.yml.example docker-compose.yml
```

### 2. Configure Environment (Optional)

Edit `docker-compose.yml` to customize:

```yaml
environment:
  - ENCRYPTION_KEY=your-secure-encryption-key-here
  - CORS_ORIGINS=["http://localhost:3000"]
```

### 3. Start the Application

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Access the Web UI

Open your browser and navigate to: **http://localhost:3000**

## First Time Setup

### Adding Your First RabbitMQ Connection

1. **Navigate to Connections**
   - Click on "Connections" in the navigation menu

2. **Add New Connection**
   - Click "Add Connection" button
   - Fill in the connection details:

   ```
   Name: My RabbitMQ Cluster
   Host: your-rabbitmq-host.com
   Port: 5672
   Management Port: 15672
   Username: your-username
   Password: your-password
   Virtual Host: /
   ```

3. **Test Connection**
   - Click "Test Connection" to verify connectivity
   - Save the connection if the test passes

### Using the Publisher

1. **Navigate to Publisher**
   - Select your connection from the dropdown
   - Choose a virtual host
   - Select target (Exchange or Queue)

2. **Send a Message**
   ```json
   {
     "message": "Hello, RabbitMQ!",
     "timestamp": "2025-01-01T00:00:00Z"
   }
   ```

3. **Configure Properties (Optional)**
   - Set routing key
   - Add custom headers
   - Configure message properties

### Using the Browser

1. **Navigate to Browser**
   - Select connection and vhost
   - Choose a queue to browse

2. **Browse Messages**
   - View messages without consuming them
   - Inspect message content and properties
   - Navigate through message pages

### Using the Consumer

1. **Navigate to Consumer**
   - Select connection and vhost
   - Choose a queue to consume from

2. **Configure Consumption**
   - Set maximum number of messages
   - Choose auto-acknowledge mode
   - Start consuming

3. **View Results**
   - Messages appear in real-time
   - Click on messages to view details
   - Messages are permanently removed from queue

## Common Use Cases

### Development and Testing

```bash
# Start with local RabbitMQ for testing
# Uncomment the rabbitmq service in docker-compose.yml
docker-compose up -d

# Access RabbitMQ Management UI
open http://localhost:15672
# Login: admin / admin123
```

### Production Monitoring

1. **Multiple Environments**
   - Add connections for dev, staging, prod
   - Use descriptive names
   - Organize by environment

2. **Message Inspection**
   - Use Browser to inspect message formats
   - Verify message routing
   - Debug queue issues

3. **Queue Management**
   - Monitor queue depths
   - Consume stuck messages
   - Test message flows

## Troubleshooting

### Connection Issues

```bash
# Check if RabbitMQ is accessible
telnet your-rabbitmq-host 5672
telnet your-rabbitmq-host 15672

# Check Docker logs
docker-compose logs rabbitmq-web-ui-backend
docker-compose logs rabbitmq-web-ui-frontend
```

### Common Problems

1. **"Connection refused"**
   - Verify RabbitMQ host and ports
   - Check firewall settings
   - Ensure RabbitMQ is running

2. **"Authentication failed"**
   - Verify username and password
   - Check user permissions in RabbitMQ
   - Ensure user has access to vhost

3. **"No exchanges/queues found"**
   - Verify vhost selection
   - Check user permissions
   - Ensure objects exist in RabbitMQ

### Getting Help

- Check the logs: `docker-compose logs`
- Verify connectivity: Use RabbitMQ Management UI
- Review configuration: Check docker-compose.yml
- Test API directly: Visit http://localhost:8000/docs

## Next Steps

- Explore the API documentation at http://localhost:8000/docs
- Set up multiple RabbitMQ connections
- Integrate with your existing monitoring setup
- Consider deploying to Kubernetes for production use

## Security Considerations

- Change the default encryption key
- Use strong passwords for RabbitMQ users
- Consider using TLS for production deployments
- Restrict network access as needed
- Regularly update Docker images

---

For more detailed information, see the main [README.md](README.md) file.
