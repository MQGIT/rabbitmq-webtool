#!/bin/bash

# RabbitMQ Web Tool - Interactive Deployment Script
# This script helps deploy the RabbitMQ Web Tool to any Kubernetes cluster

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
DEFAULT_NAMESPACE="rabbitmq-webtool"
DEFAULT_HOSTNAME="rmqtool.example.com"
DEFAULT_FRONTEND_IMAGE="rmqk8/rabbitmq-web-ui-frontend:1.63"
DEFAULT_BACKEND_IMAGE="rmqk8/rabbitmq-web-ui-backend:1.0"
DEFAULT_CERT_ISSUER="letsencrypt-prod"

# Configuration variables
NAMESPACE=""
HOSTNAME=""
FRONTEND_IMAGE=""
BACKEND_IMAGE=""
CERT_ISSUER=""
RABBITMQ_NAMESPACE=""
CUSTOM_IMAGES="false"
AUTO_CONFIRM="false"
SKIP_PREREQUISITES="false"

# Function to print colored output
print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}================================${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    if [ "$SKIP_PREREQUISITES" = "true" ]; then
        print_info "Skipping prerequisite checks..."
        return 0
    fi

    print_header "Checking Prerequisites"
    
    # Check kubectl
    if ! command_exists kubectl; then
        print_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    print_success "kubectl found"
    
    # Check cluster access
    if ! kubectl cluster-info >/dev/null 2>&1; then
        print_error "Cannot access Kubernetes cluster. Please check your kubeconfig"
        exit 1
    fi
    print_success "Kubernetes cluster accessible"
    
    # Check for ingress controller
    if ! kubectl get ingressclass nginx >/dev/null 2>&1; then
        print_warning "Nginx ingress controller not found. You may need to install it:"
        echo "kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml"
    else
        print_success "Nginx ingress controller found"
    fi
    
    # Check for cert-manager
    if ! kubectl get namespace cert-manager >/dev/null 2>&1; then
        print_warning "Cert-manager not found. You may need to install it:"
        echo "kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml"
    else
        print_success "Cert-manager found"
    fi
}

# Function to parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            --hostname)
                HOSTNAME="$2"
                shift 2
                ;;
            --frontend-image)
                FRONTEND_IMAGE="$2"
                CUSTOM_IMAGES="true"
                shift 2
                ;;
            --backend-image)
                BACKEND_IMAGE="$2"
                CUSTOM_IMAGES="true"
                shift 2
                ;;
            --cert-issuer)
                CERT_ISSUER="$2"
                shift 2
                ;;
            --rabbitmq-namespace)
                RABBITMQ_NAMESPACE="$2"
                shift 2
                ;;
            --auto-confirm)
                AUTO_CONFIRM="true"
                shift
                ;;
            --skip-prerequisites)
                SKIP_PREREQUISITES="true"
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Function to show help
show_help() {
    echo "RabbitMQ Web Tool Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --namespace NAMESPACE           Target namespace (default: $DEFAULT_NAMESPACE)"
    echo "  --hostname HOSTNAME             Ingress hostname (default: $DEFAULT_HOSTNAME)"
    echo "  --frontend-image IMAGE          Custom frontend image"
    echo "  --backend-image IMAGE           Custom backend image"
    echo "  --cert-issuer ISSUER            Cert-manager issuer (default: $DEFAULT_CERT_ISSUER)"
    echo "  --rabbitmq-namespace NAMESPACE  RabbitMQ namespace for network policy"
    echo "  --auto-confirm                  Skip confirmation prompts"
    echo "  --skip-prerequisites            Skip prerequisite checks"
    echo "  --help                          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                          # Interactive mode"
    echo "  $0 --namespace my-rmq --hostname rmq.example.com --auto-confirm"
    echo "  $0 --custom-images --frontend-image my-registry/frontend:latest"
}

# Function to get user input
get_user_input() {
    if [ "$AUTO_CONFIRM" = "true" ]; then
        return 0
    fi

    print_header "Configuration"
    
    # Namespace
    if [ -z "$NAMESPACE" ]; then
        read -p "Enter target namespace [$DEFAULT_NAMESPACE]: " NAMESPACE
        NAMESPACE=${NAMESPACE:-$DEFAULT_NAMESPACE}
    fi
    
    # Hostname
    if [ -z "$HOSTNAME" ]; then
        read -p "Enter ingress hostname [$DEFAULT_HOSTNAME]: " HOSTNAME
        HOSTNAME=${HOSTNAME:-$DEFAULT_HOSTNAME}
    fi
    
    # Docker images
    if [ "$CUSTOM_IMAGES" = "false" ]; then
        echo ""
        print_info "Docker Image Options:"
        echo "1. Use public images (recommended)"
        echo "2. Use custom images"
        read -p "Choose option [1]: " image_choice
        image_choice=${image_choice:-1}
        
        if [ "$image_choice" = "2" ]; then
            CUSTOM_IMAGES="true"
            read -p "Enter frontend image [$DEFAULT_FRONTEND_IMAGE]: " FRONTEND_IMAGE
            FRONTEND_IMAGE=${FRONTEND_IMAGE:-$DEFAULT_FRONTEND_IMAGE}
            read -p "Enter backend image [$DEFAULT_BACKEND_IMAGE]: " BACKEND_IMAGE
            BACKEND_IMAGE=${BACKEND_IMAGE:-$DEFAULT_BACKEND_IMAGE}
        fi
    fi
    
    # Set default images if not custom
    if [ "$CUSTOM_IMAGES" = "false" ]; then
        FRONTEND_IMAGE=$DEFAULT_FRONTEND_IMAGE
        BACKEND_IMAGE=$DEFAULT_BACKEND_IMAGE
    fi
    
    # Cert issuer
    if [ -z "$CERT_ISSUER" ]; then
        read -p "Enter cert-manager issuer [$DEFAULT_CERT_ISSUER]: " CERT_ISSUER
        CERT_ISSUER=${CERT_ISSUER:-$DEFAULT_CERT_ISSUER}
    fi
    
    # RabbitMQ namespace
    if [ -z "$RABBITMQ_NAMESPACE" ]; then
        echo ""
        print_info "If your RabbitMQ is in a different namespace, we'll configure network policies"
        read -p "Enter RabbitMQ namespace (leave empty if same as deployment): " RABBITMQ_NAMESPACE
    fi
}

# Function to show configuration summary
show_summary() {
    print_header "Deployment Summary"
    echo -e "${CYAN}Namespace:${NC} $NAMESPACE"
    echo -e "${CYAN}Hostname:${NC} $HOSTNAME"
    echo -e "${CYAN}Frontend Image:${NC} $FRONTEND_IMAGE"
    echo -e "${CYAN}Backend Image:${NC} $BACKEND_IMAGE"
    echo -e "${CYAN}Cert Issuer:${NC} $CERT_ISSUER"
    if [ -n "$RABBITMQ_NAMESPACE" ]; then
        echo -e "${CYAN}RabbitMQ Namespace:${NC} $RABBITMQ_NAMESPACE"
    fi
    echo ""
    
    if [ "$AUTO_CONFIRM" = "false" ]; then
        read -p "Proceed with deployment? [y/N]: " confirm
        if [[ ! $confirm =~ ^[Yy]$ ]]; then
            print_info "Deployment cancelled"
            exit 0
        fi
    fi
}

# Function to create namespace
create_namespace() {
    print_header "Creating Namespace"

    if kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        print_info "Namespace $NAMESPACE already exists"
    else
        kubectl create namespace "$NAMESPACE"
        print_success "Created namespace $NAMESPACE"
    fi
}

# Function to update configuration files
update_config_files() {
    print_header "Updating Configuration Files"

    # Create temporary directory for modified files
    TEMP_DIR=$(mktemp -d)
    cp -r k8s/* "$TEMP_DIR/"

    # Update namespace in all files
    find "$TEMP_DIR" -name "*.yaml" -exec sed -i.bak "s/rabbitmq-webtool-test/$NAMESPACE/g" {} \;

    # Update hostname in ingress
    sed -i.bak "s/rmqtool\.marsem\.org/$HOSTNAME/g" "$TEMP_DIR/ingress.yaml"

    # Update cert issuer
    sed -i.bak "s/letsencrypt-prod/$CERT_ISSUER/g" "$TEMP_DIR/ingress.yaml"

    # Update docker images
    sed -i.bak "s|rmqk8/rabbitmq-web-ui-frontend:1.63|$FRONTEND_IMAGE|g" "$TEMP_DIR/deployment.yaml"
    sed -i.bak "s|rmqk8/rabbitmq-web-ui-backend:1.0|$BACKEND_IMAGE|g" "$TEMP_DIR/deployment.yaml"

    # Update network policy for RabbitMQ namespace if specified
    if [ -n "$RABBITMQ_NAMESPACE" ]; then
        sed -i.bak "s/rmq-kafka/$RABBITMQ_NAMESPACE/g" "$TEMP_DIR/networkpolicy.yaml"
    fi

    print_success "Configuration files updated"
    echo "$TEMP_DIR"
}

# Function to deploy application
deploy_application() {
    print_header "Deploying Application"

    local temp_dir=$(update_config_files)

    # Apply all manifests
    print_info "Applying Kubernetes manifests..."
    kubectl apply -f "$temp_dir/"

    # Label RabbitMQ namespace if specified
    if [ -n "$RABBITMQ_NAMESPACE" ]; then
        print_info "Configuring network policy for RabbitMQ namespace..."
        kubectl label namespace "$RABBITMQ_NAMESPACE" name="$RABBITMQ_NAMESPACE" --overwrite
        print_success "Network policy configured"
    fi

    # Clean up temp directory
    rm -rf "$temp_dir"

    print_success "Application deployed successfully"
}

# Function to wait for deployment
wait_for_deployment() {
    print_header "Waiting for Deployment"

    print_info "Waiting for pods to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/rabbitmq-web-ui -n "$NAMESPACE"

    print_info "Waiting for SSL certificate..."
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if kubectl get certificate rabbitmq-web-ui-tls -n "$NAMESPACE" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null | grep -q "True"; then
            print_success "SSL certificate ready"
            break
        fi

        echo -n "."
        sleep 10
        ((attempt++))
    done

    if [ $attempt -eq $max_attempts ]; then
        print_warning "SSL certificate not ready after 5 minutes. Check cert-manager logs."
    fi
}

# Function to verify deployment
verify_deployment() {
    print_header "Verifying Deployment"

    # Check pods
    print_info "Checking pod status..."
    kubectl get pods -n "$NAMESPACE"

    # Check ingress
    print_info "Checking ingress..."
    kubectl get ingress -n "$NAMESPACE"

    # Test HTTP access
    print_info "Testing HTTP access..."
    if curl -s -o /dev/null -w "%{http_code}" "https://$HOSTNAME" --max-time 10 2>/dev/null | grep -q "200"; then
        print_success "Application is accessible at https://$HOSTNAME"
    else
        print_warning "Application may not be ready yet. Check ingress and DNS configuration."
    fi
}

# Function to show post-deployment information
show_post_deployment_info() {
    print_header "Deployment Complete!"

    echo -e "${GREEN}🎉 RabbitMQ Web Tool has been deployed successfully!${NC}"
    echo ""
    echo -e "${CYAN}Application URL:${NC} https://$HOSTNAME"
    echo -e "${CYAN}Namespace:${NC} $NAMESPACE"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Ensure DNS points $HOSTNAME to your ingress IP"
    echo "2. Access the application at https://$HOSTNAME"
    echo "3. Add your RabbitMQ connections in the Connections page"
    echo "4. Test publisher, consumer, and browser functionality"
    echo ""
    echo -e "${YELLOW}Useful Commands:${NC}"
    echo "# Check pod status"
    echo "kubectl get pods -n $NAMESPACE"
    echo ""
    echo "# View logs"
    echo "kubectl logs -n $NAMESPACE deployment/rabbitmq-web-ui -c rabbitmq-web-ui-backend"
    echo ""
    echo "# Check certificate status"
    echo "kubectl get certificate -n $NAMESPACE"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "If you encounter issues, check the DEPLOYMENT_GUIDE.md for detailed troubleshooting steps."
}

# Main function
main() {
    print_header "RabbitMQ Web Tool Deployment"
    echo -e "${CYAN}Welcome to the RabbitMQ Web Tool deployment script!${NC}"
    echo ""

    parse_args "$@"
    check_prerequisites
    get_user_input
    show_summary
    create_namespace
    deploy_application
    wait_for_deployment
    verify_deployment
    show_post_deployment_info
}

# Run main function with all arguments
main "$@"
