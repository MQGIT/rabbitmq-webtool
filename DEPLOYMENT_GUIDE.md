# 🚀 RabbitMQ Web Tool - Deployment Guide

A comprehensive web-based tool for managing RabbitMQ connections, publishing messages, consuming messages, and browsing queues/exchanges.

## 📋 Prerequisites

### Required Tools
- **Kubernetes Cluster** (v1.19+)
- **kubectl** configured to access your cluster
- **Docker** (if building custom images)
- **Helm** (optional, for cert-manager)

### Required Kubernetes Components
- **Ingress Controller** (nginx-ingress recommended)
- **Cert-Manager** (for automatic SSL certificates)
- **Storage Class** (for persistent volumes)

### Network Requirements
- **External DNS** pointing to your cluster's ingress IP
- **Firewall Rules** allowing HTTP (80) and HTTPS (443)

## 🎯 Quick Start (Automated)

### Option 1: Interactive Deployment Script
```bash
# Clone the repository
git clone https://github.com/MQGIT/rabbitmq-webtool.git
cd rabbitmq-webtool

# Run the interactive deployment script
chmod +x deploy.sh
./deploy.sh
```

The script will ask you:
- Target namespace
- Ingress hostname
- Docker registry (use public images or build custom)
- RabbitMQ connection details
- SSL certificate configuration

### Option 2: One-Command Deployment
```bash
# Deploy with default settings
./deploy.sh --namespace rabbitmq-webtool --hostname rmqtool.yourdomain.com --auto-confirm
```

## 📖 Manual Deployment Steps

### Step 1: Prepare Your Environment

1. **Verify Kubernetes Access**
   ```bash
   kubectl cluster-info
   kubectl get nodes
   ```

2. **Install Cert-Manager** (if not already installed)
   ```bash
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
   ```

3. **Install Nginx Ingress** (if not already installed)
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
   ```

### Step 2: Configure Your Deployment

1. **Clone the Repository**
   ```bash
   git clone https://github.com/MQGIT/rabbitmq-webtool.git
   cd rabbitmq-webtool
   ```

2. **Create Your Namespace**
   ```bash
   kubectl create namespace your-namespace
   ```

3. **Update Configuration Files**
   
   Edit `k8s/ingress.yaml`:
   ```yaml
   spec:
     rules:
     - host: your-hostname.yourdomain.com  # Change this
   ```
   
   Edit `k8s/deployment.yaml` (if using custom images):
   ```yaml
   image: your-registry/rabbitmq-web-ui-frontend:latest
   image: your-registry/rabbitmq-web-ui-backend:latest
   ```

### Step 3: Deploy the Application

1. **Apply Kubernetes Manifests**
   ```bash
   # Update namespace in all files
   sed -i 's/rabbitmq-webtool-test/your-namespace/g' k8s/*.yaml
   
   # Deploy all components
   kubectl apply -f k8s/
   ```

2. **Verify Deployment**
   ```bash
   kubectl get pods -n your-namespace
   kubectl get ingress -n your-namespace
   kubectl get certificate -n your-namespace
   ```

### Step 4: Configure RabbitMQ Access

1. **Set Up Network Policies** (if your RabbitMQ is in a different namespace)
   ```bash
   # Label your RabbitMQ namespace
   kubectl label namespace your-rabbitmq-namespace name=your-rabbitmq-namespace
   
   # Update network policy in k8s/networkpolicy.yaml
   ```

2. **Test Connectivity**
   ```bash
   kubectl exec -n your-namespace deployment/rabbitmq-web-ui -c rabbitmq-web-ui-backend -- \
     python -c "import socket; s = socket.socket(); print(s.connect_ex(('your-rabbitmq-host', 5672)))"
   ```

## 🔧 Configuration Options

### Environment Variables
The backend supports these environment variables:

```yaml
env:
- name: DATABASE_URL
  value: "sqlite:///./rabbitmq_web_tool.db"
- name: CORS_ORIGINS
  value: "https://your-hostname.yourdomain.com"
- name: LOG_LEVEL
  value: "INFO"
```

### Custom Docker Images
If you want to build custom images:

```bash
# Build frontend
docker build -t your-registry/rabbitmq-web-ui-frontend:latest -f frontend/Dockerfile frontend/
docker push your-registry/rabbitmq-web-ui-frontend:latest

# Build backend
docker build -t your-registry/rabbitmq-web-ui-backend:latest -f backend/Dockerfile backend/
docker push your-registry/rabbitmq-web-ui-backend:latest
```

## 🌐 DNS and SSL Configuration

### DNS Setup
Point your domain to the ingress controller's external IP:
```bash
# Get ingress IP
kubectl get ingress -n your-namespace

# Create DNS A record
your-hostname.yourdomain.com -> INGRESS_IP
```

### SSL Certificate
The deployment uses cert-manager with Let's Encrypt:
- Certificates are automatically provisioned
- Renewal is handled automatically
- HTTPS redirect is enforced

## 🔍 Troubleshooting

### Common Issues

1. **Pods Not Starting**
   ```bash
   kubectl describe pods -n your-namespace
   kubectl logs -n your-namespace deployment/rabbitmq-web-ui
   ```

2. **SSL Certificate Issues**
   ```bash
   kubectl describe certificate -n your-namespace
   kubectl get certificaterequests -n your-namespace
   ```

3. **Network Connectivity**
   ```bash
   kubectl exec -n your-namespace deployment/rabbitmq-web-ui -c rabbitmq-web-ui-backend -- \
     nslookup your-rabbitmq-host
   ```

4. **Ingress Not Working**
   ```bash
   kubectl describe ingress -n your-namespace
   kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
   ```

### Health Checks
```bash
# Check application health
curl https://your-hostname.yourdomain.com/api/health

# Check RabbitMQ connectivity
curl https://your-hostname.yourdomain.com/api/connections/
```

## 📚 Next Steps

1. **Access the Application**: https://your-hostname.yourdomain.com
2. **Add RabbitMQ Connections**: Use the Connections page
3. **Test Functionality**: Try publisher, consumer, and browser features
4. **Monitor Logs**: `kubectl logs -n your-namespace -f deployment/rabbitmq-web-ui`

## 🆘 Support

- **Issues**: https://github.com/MQGIT/rabbitmq-webtool/issues
- **Documentation**: Check the README.md for feature details
- **Logs**: Always include pod logs when reporting issues

---

**🎉 Your RabbitMQ Web Tool is now ready for production use!**
