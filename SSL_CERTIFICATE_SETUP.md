# SSL Certificate Setup with Cert-Manager

## Overview

The RabbitMQ Web UI includes automatic SSL certificate provisioning using cert-manager and Let's Encrypt. This provides secure HTTPS access with automatically renewed certificates.

## Prerequisites

- ✅ **cert-manager** already deployed in your cluster
- ✅ **nginx ingress controller** configured
- 🔧 **Domain name** pointing to your cluster
- 🔧 **Email address** for Let's Encrypt registration

## Configuration Steps

### 1. Update Domain Configuration

Edit `k8s/ingress.yaml` and replace `yourdomain.com` with your actual domain:

```yaml
spec:
  rules:
  - host: rabbitmq-ui.yourdomain.com  # ← Change this
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
    - rabbitmq-ui.yourdomain.com  # ← Change this
    secretName: rabbitmq-web-ui-tls
```

### 2. Cert-Manager Configuration

The application is configured to use your existing `letsencrypt-prod` ClusterIssuer. No additional cert-manager configuration is needed since cert-manager is already deployed in your cluster.

### 3. Deploy the Application

```bash
# Deploy all resources including SSL configuration
./scripts/deploy.sh
```

### 4. Verify SSL Certificate

```bash
# Check certificate status
kubectl get certificate -n apps

# Expected output:
# NAME                   READY   SECRET                 AGE
# rabbitmq-web-ui-tls    True    rabbitmq-web-ui-tls    2m

# Check certificate details
kubectl describe certificate rabbitmq-web-ui-tls -n apps

# Test HTTPS access
curl -I https://rabbitmq-ui.yourdomain.com
```

## SSL Features Included

### 🔒 **Automatic Certificate Provisioning**
- Let's Encrypt integration via cert-manager
- HTTP-01 challenge validation
- No manual certificate management required

### 🔄 **Auto-Renewal**
- Certificates automatically renewed before expiration
- Zero-downtime certificate updates
- 90-day Let's Encrypt certificate lifecycle

### 🛡️ **Security Hardening**
- Force HTTPS redirect enabled
- SSL redirect configured in ingress
- Security headers included in nginx configuration

### 🌍 **Production Ready**
- Production Let's Encrypt ACME server
- Staging issuer available for testing
- Rate limit compliant configuration

## Troubleshooting

### Certificate Not Ready

```bash
# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Check certificate events
kubectl describe certificate rabbitmq-web-ui-tls -n apps

# Check certificate request
kubectl get certificaterequest -n apps
```

### Common Issues

#### 1. **Domain Not Pointing to Cluster**
```bash
# Verify DNS resolution
nslookup rabbitmq-ui.yourdomain.com

# Should point to your cluster's ingress IP
kubectl get ingress -n apps
```

#### 2. **HTTP-01 Challenge Failing**
```bash
# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Verify ingress is accessible
curl -I http://rabbitmq-ui.yourdomain.com/.well-known/acme-challenge/test
```

#### 3. **Rate Limiting**
```bash
# Use staging issuer for testing
# In k8s/ingress.yaml, change:
cert-manager.io/cluster-issuer: "letsencrypt-staging"

# Then switch back to production:
cert-manager.io/cluster-issuer: "letsencrypt-prod"
```

## Testing SSL Configuration

### 1. **Staging Environment**

For testing, use the staging issuer first:

```bash
# Update ingress annotation
cert-manager.io/cluster-issuer: "letsencrypt-staging"

# Deploy and test
./scripts/deploy.sh

# Verify staging certificate
curl -k -I https://rabbitmq-ui.yourdomain.com
```

### 2. **Production Environment**

Once staging works, switch to production:

```bash
# Update ingress annotation
cert-manager.io/cluster-issuer: "letsencrypt-prod"

# Redeploy
kubectl apply -f k8s/ingress.yaml

# Wait for certificate provisioning
kubectl wait --for=condition=ready certificate/rabbitmq-web-ui-tls -n apps --timeout=300s
```

## Certificate Management Commands

```bash
# List all certificates
kubectl get certificate -A

# Check certificate details
kubectl describe certificate rabbitmq-web-ui-tls -n apps

# Check certificate secret
kubectl get secret rabbitmq-web-ui-tls -n apps -o yaml

# Force certificate renewal (if needed)
kubectl delete certificate rabbitmq-web-ui-tls -n apps
kubectl apply -f k8s/ingress.yaml

# Check cert-manager status
kubectl get pods -n cert-manager
```

## Security Considerations

### 🔐 **Certificate Security**
- Private keys stored securely in Kubernetes secrets
- TLS 1.2+ enforced by nginx ingress
- Strong cipher suites configured

### 🌐 **Network Security**
- HTTP automatically redirects to HTTPS
- HSTS headers can be added for enhanced security
- Certificate transparency logging enabled

### 📊 **Monitoring**
- Certificate expiration monitoring available
- Prometheus metrics for cert-manager
- Alerting on certificate renewal failures

## Access URLs

Once configured, access the application at:

- **HTTPS (Primary)**: https://rabbitmq-ui.yourdomain.com
- **HTTP (Redirects)**: http://rabbitmq-ui.yourdomain.com → HTTPS
- **Port-Forward (Testing)**: http://localhost:8080

## Next Steps

1. ✅ Configure your domain name
2. ✅ Update email in cert-manager issuer
3. ✅ Deploy the application
4. ✅ Verify SSL certificate
5. ✅ Access via HTTPS
6. 🔄 Monitor certificate renewal

Your RabbitMQ Web UI is now secured with automatic SSL certificates!
