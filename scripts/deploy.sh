#!/bin/bash

# RabbitMQ Web UI - Kubernetes Deployment Script
# This script deploys the RabbitMQ Web UI to the Kubernetes cluster

set -e

# Configuration
NAMESPACE="apps"
APP_NAME="rabbitmq-web-ui"
K8S_DIR="k8s"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if kubectl is available and configured
check_kubectl() {
    log_info "Checking kubectl configuration..."
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        log_error "kubectl is not configured or cluster is not accessible"
        exit 1
    fi
    
    log_success "kubectl is configured and cluster is accessible"
}

# Create namespace if it doesn't exist
create_namespace() {
    log_info "Checking namespace: ${NAMESPACE}"
    
    if kubectl get namespace "${NAMESPACE}" &> /dev/null; then
        log_info "Namespace ${NAMESPACE} already exists"
    else
        log_info "Creating namespace: ${NAMESPACE}"
        kubectl create namespace "${NAMESPACE}"
        log_success "Namespace ${NAMESPACE} created"
    fi
}

# Deploy using kubectl
deploy_with_kubectl() {
    log_info "Deploying with kubectl..."
    
    # Apply all manifests
    for file in "${K8S_DIR}"/*.yaml; do
        if [[ -f "$file" ]]; then
            log_info "Applying $(basename "$file")..."
            kubectl apply -f "$file"
        fi
    done
    
    log_success "All manifests applied"
}

# Deploy using kustomize
deploy_with_kustomize() {
    log_info "Deploying with kustomize..."
    
    if command -v kustomize &> /dev/null; then
        kustomize build "${K8S_DIR}" | kubectl apply -f -
        log_success "Deployed using kustomize"
    else
        log_warning "kustomize not found, falling back to kubectl"
        deploy_with_kubectl
    fi
}

# Wait for deployment to be ready
wait_for_deployment() {
    log_info "Waiting for deployment to be ready..."
    
    if kubectl wait --for=condition=available --timeout=300s deployment/"${APP_NAME}" -n "${NAMESPACE}"; then
        log_success "Deployment is ready"
    else
        log_error "Deployment failed to become ready within timeout"
        show_deployment_status
        exit 1
    fi
}

# Show deployment status
show_deployment_status() {
    log_info "Deployment status:"
    kubectl get pods -n "${NAMESPACE}" -l app="${APP_NAME}"
    
    log_info "Service status:"
    kubectl get svc -n "${NAMESPACE}" -l app="${APP_NAME}"
    
    log_info "Ingress status:"
    kubectl get ingress -n "${NAMESPACE}" -l app="${APP_NAME}"
}

# Show access information
show_access_info() {
    log_info "Access information:"

    # Get ingress information
    INGRESS_HOST=$(kubectl get ingress "${APP_NAME}" -n "${NAMESPACE}" -o jsonpath='{.spec.rules[0].host}' 2>/dev/null || echo "")

    if [[ -n "$INGRESS_HOST" ]]; then
        echo "  HTTPS URL: https://${INGRESS_HOST} (with SSL certificate)"
        echo "  HTTP URL: http://${INGRESS_HOST} (redirects to HTTPS)"

        # Check certificate status
        CERT_STATUS=$(kubectl get certificate "${APP_NAME}-tls" -n "${NAMESPACE}" -o jsonpath='{.status.conditions[0].status}' 2>/dev/null || echo "Unknown")
        if [[ "$CERT_STATUS" == "True" ]]; then
            echo "  SSL Certificate: ✅ Ready"
        else
            echo "  SSL Certificate: ⏳ Provisioning (check: kubectl get certificate -n ${NAMESPACE})"
        fi
    else
        log_warning "Ingress host not configured"
    fi

    # Show port-forward command
    echo "  Port-forward: kubectl port-forward -n ${NAMESPACE} svc/${APP_NAME} 8080:80"
    echo "  Then access: http://localhost:8080"

    # Show logs command
    echo "  View logs: kubectl logs -n ${NAMESPACE} -l app=${APP_NAME} -f"

    # Show certificate commands
    echo "  Check SSL cert: kubectl describe certificate ${APP_NAME}-tls -n ${NAMESPACE}"
}

# Cleanup function
cleanup() {
    log_info "To remove the deployment, run:"
    echo "  kubectl delete -f ${K8S_DIR}/"
    echo "  or"
    echo "  kubectl delete namespace ${NAMESPACE}"
}

# Main execution
main() {
    log_info "Starting deployment of RabbitMQ Web UI to Kubernetes"
    
    # Change to the correct directory
    cd "$(dirname "$0")/.."
    
    # Check prerequisites
    check_kubectl
    
    # Create namespace
    create_namespace
    
    # Deploy application
    if [[ -f "${K8S_DIR}/kustomization.yaml" ]]; then
        deploy_with_kustomize
    else
        deploy_with_kubectl
    fi
    
    # Wait for deployment
    wait_for_deployment
    
    # Show status
    show_deployment_status
    
    # Show access information
    show_access_info
    
    log_success "Deployment completed successfully!"
    
    # Show cleanup information
    echo
    log_info "Cleanup information:"
    cleanup
}

# Handle script arguments
case "${1:-}" in
    "cleanup"|"remove"|"delete")
        log_info "Removing RabbitMQ Web UI deployment..."
        kubectl delete -f "${K8S_DIR}/" 2>/dev/null || true
        log_success "Deployment removed"
        exit 0
        ;;
    "status")
        show_deployment_status
        exit 0
        ;;
    "logs")
        kubectl logs -n "${NAMESPACE}" -l app="${APP_NAME}" -f
        exit 0
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo "Commands:"
        echo "  (no args)  Deploy the application"
        echo "  cleanup    Remove the deployment"
        echo "  status     Show deployment status"
        echo "  logs       Show application logs"
        echo "  help       Show this help message"
        exit 0
        ;;
esac

# Run main function
main "$@"
