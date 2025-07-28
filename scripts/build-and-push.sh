#!/bin/bash

# RabbitMQ Web UI - Build and Push Script
# This script builds the Docker image and pushes it to the rmqk8 DockerHub repository

set -e

# Configuration
IMAGE_NAME="rmqk8/rabbitmq-web-ui"
VERSION="1.0"
DOCKERFILE_PATH="."

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

# Check if Docker is running
check_docker() {
    log_info "Checking Docker daemon..."
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running. Please start Docker and try again."
        exit 1
    fi
    log_success "Docker daemon is running"
}

# Build the Docker image
build_image() {
    log_info "Building Docker image: ${IMAGE_NAME}:${VERSION}"
    
    if docker build -t "${IMAGE_NAME}:${VERSION}" "${DOCKERFILE_PATH}"; then
        log_success "Docker image built successfully"
    else
        log_error "Failed to build Docker image"
        exit 1
    fi
    
    # Tag as latest
    docker tag "${IMAGE_NAME}:${VERSION}" "${IMAGE_NAME}:latest"
    log_success "Tagged image as latest"
}

# Push the Docker image
push_image() {
    log_info "Pushing Docker image to registry..."
    
    # Check if logged in to Docker Hub
    if ! docker info | grep -q "Username:"; then
        log_warning "Not logged in to Docker Hub. Please run 'docker login' first."
        read -p "Do you want to continue with the push? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Skipping push. You can push manually later with:"
            echo "  docker push ${IMAGE_NAME}:${VERSION}"
            echo "  docker push ${IMAGE_NAME}:latest"
            return
        fi
    fi
    
    if docker push "${IMAGE_NAME}:${VERSION}"; then
        log_success "Pushed ${IMAGE_NAME}:${VERSION}"
    else
        log_error "Failed to push ${IMAGE_NAME}:${VERSION}"
        exit 1
    fi
    
    if docker push "${IMAGE_NAME}:latest"; then
        log_success "Pushed ${IMAGE_NAME}:latest"
    else
        log_error "Failed to push ${IMAGE_NAME}:latest"
        exit 1
    fi
}

# Show image information
show_image_info() {
    log_info "Image information:"
    docker images "${IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedAt}}\t{{.Size}}"
}

# Main execution
main() {
    log_info "Starting build and push process for RabbitMQ Web UI"
    
    # Change to the correct directory
    cd "$(dirname "$0")/.."
    
    check_docker
    build_image
    show_image_info
    
    # Ask if user wants to push
    read -p "Do you want to push the image to Docker Hub? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        push_image
    else
        log_info "Skipping push. You can push manually later with:"
        echo "  docker push ${IMAGE_NAME}:${VERSION}"
        echo "  docker push ${IMAGE_NAME}:latest"
    fi
    
    log_success "Build process completed!"
    log_info "Next steps:"
    echo "  1. Deploy to Kubernetes: ./scripts/deploy.sh"
    echo "  2. Check deployment status: kubectl get pods -n apps"
    echo "  3. Access the application via ingress or port-forward"
}

# Run main function
main "$@"
