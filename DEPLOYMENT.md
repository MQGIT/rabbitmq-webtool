# RabbitMQ Web UI - Deployment Guide

This guide provides detailed instructions for deploying the RabbitMQ Web UI to your Kubernetes cluster.

## Prerequisites

### Required Tools
- Docker (for building images)
- kubectl (configured for your cluster)
- Access to RabbitMQ cluster in `rmq-kafka` namespace

### Required Access
- Docker Hub account (for pushing to rmqk8 repository)
- Kubernetes cluster with:
  - `apps` namespace (will be created if not exists)
  - Ingress controller (nginx recommended)
  - Storage class `freenas-iscsi` (or modify in PVC)

## Step-by-Step Deployment

### 1. Prepare the Environment

```bash
# Clone the repository and navigate to the project
cd rmq-web-ui

# Verify Docker is running
docker info

# Verify kubectl access
kubectl cluster-info
```

### 2. Configure Secrets

Generate a secure encryption key for password storage:

```bash
# Generate encryption key
ENCRYPTION_KEY=$(openssl rand -base64 32)
echo "Generated encryption key: $ENCRYPTION_KEY"

# Base64 encode for Kubernetes secret
ENCODED_KEY=$(echo -n "$ENCRYPTION_KEY" | base64 -w 0)
echo "Encoded key: $ENCODED_KEY"
```

Update the secret in `k8s/secret.yaml`:

```yaml
data:
  ENCRYPTION_KEY: YOUR_ENCODED_KEY_HERE
```

### 3. Build and Push Docker Image

```bash
# Build and push the image
./scripts/build-and-push.sh

# This will:
# 1. Build the Docker image
# 2. Tag it as rmqk8/rabbitmq-web-ui:1.0
# 3. Push to Docker Hub (requires login)
```

### 4. Deploy to Kubernetes

```bash
# Deploy all resources
./scripts/deploy.sh

# Monitor the deployment
kubectl get pods -n apps -w
```

### 5. Verify Deployment

```bash
# Check deployment status
./scripts/deploy.sh status

# View logs
./scripts/deploy.sh logs

# Test health endpoint
kubectl port-forward -n apps svc/rabbitmq-web-ui 8080:80
curl http://localhost:8080/health
```

### 6. Verify SSL Certificate

```bash
# Check certificate status
kubectl get certificate -n apps

# Check certificate details
kubectl describe certificate rabbitmq-web-ui-tls -n apps

# Check cert-manager logs if issues
kubectl logs -n cert-manager deployment/cert-manager

# Test HTTPS access
curl -I https://rabbitmq-ui.yourdomain.com
```

## Configuration Options

### Storage Configuration

By default, the application uses `freenas-iscsi` storage class. To use a different storage class:

```bash
# Edit the PVC
kubectl edit pvc rabbitmq-web-ui-data -n apps

# Or modify k8s/pvc.yaml before deployment
```

### Ingress Configuration with SSL Certificates

The application includes automatic SSL certificate provisioning using cert-manager.

#### 1. Configure Your Domain

Update `k8s/ingress.yaml` with your actual domain:

```yaml
spec:
  rules:
  - host: rabbitmq-ui.yourdomain.com  # Change this to your domain
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rabbitmq-web-ui
            port:
              number: 80
  tls:
  - hosts:
    - rabbitmq-ui.yourdomain.com  # Change this to your domain
    secretName: rabbitmq-web-ui-tls
```

#### 2. Cert-Manager Configuration

The application is configured to use your existing `letsencrypt-prod` ClusterIssuer. No additional cert-manager configuration is needed since you already have cert-manager deployed.

#### 3. SSL Certificate Features

- **Automatic provisioning** via Let's Encrypt
- **HTTP-01 challenge** validation
- **Auto-renewal** before expiration
- **Force HTTPS redirect** enabled
- **Production-ready** certificates

#### 4. Testing SSL Setup

For testing, you can use the staging issuer first:

```bash
# Use staging issuer in ingress annotations
cert-manager.io/cluster-issuer: "letsencrypt-staging"

# Then switch to production
cert-manager.io/cluster-issuer: "letsencrypt-prod"
```

### Resource Limits

Adjust resource limits in `k8s/deployment.yaml`:

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Scaling Configuration

Modify HPA settings in `k8s/hpa.yaml`:

```yaml
spec:
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Access Methods

### 1. Port Forward (Immediate Access)

```bash
kubectl port-forward -n apps svc/rabbitmq-web-ui 8080:80
# Access at http://localhost:8080
```

### 2. Ingress (Production Access)

```bash
# Get ingress information
kubectl get ingress -n apps

# Access via configured domain
# http://rabbitmq-ui.yourdomain.com
```

### 3. NodePort (Alternative)

Create a NodePort service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rabbitmq-web-ui-nodeport
  namespace: apps
spec:
  type: NodePort
  ports:
  - port: 80
    targetPort: 80
    nodePort: 30080
  selector:
    app: rabbitmq-web-ui
```

## Initial Setup

### 1. Access the Application

Use one of the access methods above to reach the web interface.

### 2. Configure RabbitMQ Connection

1. Navigate to the "Connections" page
2. Click "Add Connection"
3. Fill in your RabbitMQ cluster details:
   - **Name**: My RabbitMQ Cluster
   - **Host**: rmqkafka.rmq-kafka.svc
   - **Port**: 5672
   - **Management Port**: 15672
   - **Username**: your-rabbitmq-username
   - **Password**: your-rabbitmq-password
   - **Virtual Host**: / (or your specific vhost)

### 3. Test Connection

Click "Test Connection" to verify connectivity to your RabbitMQ cluster.

### 4. Start Using

- Navigate to "Publisher" to send messages
- Navigate to "Consumer" to receive messages

## Maintenance

### Updating the Application

```bash
# Build new version
./scripts/build-and-push.sh

# Update deployment
kubectl rollout restart deployment/rabbitmq-web-ui -n apps

# Monitor rollout
kubectl rollout status deployment/rabbitmq-web-ui -n apps
```

### Backup and Restore

```bash
# Backup database
kubectl exec -n apps deployment/rabbitmq-web-ui -- cp /app/data/rabbitmq_ui.db /tmp/backup.db
kubectl cp apps/$(kubectl get pods -n apps -l app=rabbitmq-web-ui -o jsonpath='{.items[0].metadata.name}'):/tmp/backup.db ./backup.db

# Restore database
kubectl cp ./backup.db apps/$(kubectl get pods -n apps -l app=rabbitmq-web-ui -o jsonpath='{.items[0].metadata.name}'):/app/data/rabbitmq_ui.db
```

### Monitoring

```bash
# View metrics
kubectl top pods -n apps -l app=rabbitmq-web-ui

# Check HPA status
kubectl get hpa -n apps

# View events
kubectl get events -n apps --sort-by='.lastTimestamp'
```

## Troubleshooting

### Common Issues

1. **Image Pull Errors**
   ```bash
   # Check image exists
   docker pull rmqk8/rabbitmq-web-ui:1.0
   
   # Verify image name in deployment
   kubectl describe deployment rabbitmq-web-ui -n apps
   ```

2. **Database Issues**
   ```bash
   # Check PVC status
   kubectl get pvc -n apps
   
   # Check volume mounts
   kubectl describe pod -n apps -l app=rabbitmq-web-ui
   ```

3. **Network Connectivity**
   ```bash
   # Test RabbitMQ connectivity
   kubectl exec -n apps deployment/rabbitmq-web-ui -- nc -zv rmqkafka.rmq-kafka.svc 5672
   ```

### Cleanup

```bash
# Remove deployment
./scripts/deploy.sh cleanup

# Or manually remove
kubectl delete namespace apps
```

## Security Considerations

### Production Checklist

- [ ] Use HTTPS/TLS for ingress
- [ ] Generate unique encryption keys
- [ ] Configure network policies
- [ ] Set up RBAC properly
- [ ] Enable audit logging
- [ ] Regular security updates
- [ ] Monitor for vulnerabilities

### Network Security

The deployment includes network policies that:
- Allow ingress from nginx ingress controller
- Allow egress to RabbitMQ cluster
- Restrict other network access

### Container Security

- Runs as non-root user (UID 1001)
- Read-only root filesystem where possible
- Drops all capabilities
- Security context configured

## Performance Tuning

### Resource Optimization

```yaml
# For high-traffic environments
resources:
  requests:
    memory: "512Mi"
    cpu: "200m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

### Database Optimization

For high-volume connection management, consider:
- Using PostgreSQL instead of SQLite
- Implementing connection pooling
- Adding database indices

### Scaling

```yaml
# Increase replicas for high availability
spec:
  replicas: 3
  
# Configure HPA for auto-scaling
spec:
  minReplicas: 3
  maxReplicas: 20
```

This completes the deployment guide. For additional support, refer to the main README.md or create an issue in the repository.
