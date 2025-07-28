# 🚀 RabbitMQ Web Tool - Quick Start

Deploy the RabbitMQ Web Tool to your Kubernetes cluster in minutes!

## ⚡ One-Command Deployment

```bash
# Clone and deploy with interactive setup
git clone https://github.com/MQGIT/rabbitmq-webtool.git
cd rabbitmq-webtool
chmod +x deploy.sh
./deploy.sh
```

## 🎯 Command Line Options

```bash
# Deploy with specific settings
./deploy.sh \
  --namespace my-rabbitmq-tool \
  --hostname rmqtool.mydomain.com \
  --rabbitmq-namespace my-rabbitmq \
  --auto-confirm

# Use custom Docker images
./deploy.sh \
  --frontend-image my-registry/frontend:latest \
  --backend-image my-registry/backend:latest \
  --hostname rmqtool.mydomain.com \
  --auto-confirm

# Skip prerequisite checks (for CI/CD)
./deploy.sh \
  --namespace production-rmq \
  --hostname rmqtool.company.com \
  --skip-prerequisites \
  --auto-confirm
```

## 📋 Prerequisites

### Required
- **Kubernetes cluster** (v1.19+)
- **kubectl** configured
- **Ingress controller** (nginx recommended)
- **Cert-manager** for SSL certificates

### Quick Install Prerequisites
```bash
# Install nginx ingress controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

## 🔧 Configuration Options

The deployment script will ask you for:

1. **Namespace** - Where to deploy the application
2. **Hostname** - Your domain name (e.g., rmqtool.yourdomain.com)
3. **Docker Images** - Use public images or specify custom ones
4. **SSL Certificate** - Cert-manager issuer configuration
5. **RabbitMQ Namespace** - For network policy configuration

## 🌐 DNS Configuration

After deployment, point your domain to the ingress IP:

```bash
# Get ingress IP
kubectl get ingress -n your-namespace

# Create DNS A record
your-hostname.yourdomain.com -> INGRESS_IP
```

## ✅ Verification

The script automatically verifies:
- ✅ Pods are running
- ✅ Ingress is configured
- ✅ SSL certificate is issued
- ✅ Application is accessible

## 🔍 Troubleshooting

### Common Issues

**Pods not starting:**
```bash
kubectl describe pods -n your-namespace
kubectl logs -n your-namespace deployment/rabbitmq-web-ui
```

**SSL certificate issues:**
```bash
kubectl describe certificate -n your-namespace
kubectl get certificaterequests -n your-namespace
```

**Network connectivity:**
```bash
kubectl exec -n your-namespace deployment/rabbitmq-web-ui -c rabbitmq-web-ui-backend -- \
  python -c "import socket; print(socket.create_connection(('your-rabbitmq-host', 5672)))"
```

## 📚 What's Deployed

The script deploys:
- **Frontend** - React application for the web interface
- **Backend** - FastAPI application for RabbitMQ management
- **Database** - SQLite for storing connection configurations
- **Ingress** - HTTPS access with automatic SSL certificates
- **Network Policies** - Secure communication between components

## 🎉 Next Steps

1. **Access your application** at `https://your-hostname.yourdomain.com`
2. **Add RabbitMQ connections** in the Connections page
3. **Test functionality** - publisher, consumer, browser
4. **Monitor logs** - `kubectl logs -n your-namespace -f deployment/rabbitmq-web-ui`

## 🆘 Need Help?

- **Detailed Guide**: See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Issues**: https://github.com/MQGIT/rabbitmq-webtool/issues
- **Features**: Check the main [README.md](README.md)

---

**🚀 Your RabbitMQ Web Tool will be ready in minutes!**
