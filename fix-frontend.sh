#!/bin/bash

# Script to fix frontend issues in running containers
# This patches the JavaScript files to fix API endpoints and improve UI

echo "🔧 Fixing RabbitMQ Web UI Frontend Issues..."

NAMESPACE="rabbitmq-webtool-test"
DEPLOYMENT="rabbitmq-web-ui"

# Get all pod names
PODS=$(kubectl get pods -n $NAMESPACE -l app=rabbitmq-web-ui -o jsonpath='{.items[*].metadata.name}')

for POD in $PODS; do
    echo "📦 Patching pod: $POD"
    
    # Fix API endpoints by removing trailing slashes in the main JS file
    echo "  🔗 Fixing API endpoints..."
    kubectl exec -n $NAMESPACE $POD -c rabbitmq-web-ui-frontend -- sh -c "
        find /usr/share/nginx/html/static/js -name '*.js' -exec sed -i 's|/api/connections/\"|/api/connections\"|g' {} \;
        find /usr/share/nginx/html/static/js -name '*.js' -exec sed -i 's|/api/connections/\${|/api/connections/\${|g' {} \;
        find /usr/share/nginx/html/static/js -name '*.js' -exec sed -i 's|connections/\${.*}/\"|connections/\${editingConnection.id}\"|g' {} \;
    "
    
    # Add improved CSS for connection layout
    echo "  🎨 Adding improved CSS..."
    kubectl exec -n $NAMESPACE $POD -c rabbitmq-web-ui-frontend -- sh -c "
        cat >> /usr/share/nginx/html/static/css/main.*.css << 'EOF'

/* Improved Connections Layout */
.connections-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)) !important;
  gap: 1.5rem !important;
  margin-top: 1.5rem !important;
}

@media (max-width: 768px) {
  .connections-grid {
    grid-template-columns: 1fr !important;
    gap: 1rem !important;
  }
}

.connection-card {
  background: white !important;
  border-radius: 0.75rem !important;
  padding: 1.5rem !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
  border: 1px solid #e2e8f0 !important;
  transition: all 0.2s ease !important;
  margin-bottom: 1rem !important;
}

.connection-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  transform: translateY(-2px) !important;
}

.connection-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: flex-start !important;
  margin-bottom: 1rem !important;
  gap: 1rem !important;
}

.connection-actions {
  display: flex !important;
  gap: 0.5rem !important;
  flex-wrap: wrap !important;
}

.connection-metadata {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
  gap: 0.75rem !important;
  margin-bottom: 1rem !important;
  padding: 1rem !important;
  background-color: #f8fafc !important;
  border-radius: 0.5rem !important;
}

/* Override cramped grid layout */
.grid.grid-2 {
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)) !important;
  gap: 1.5rem !important;
}

@media (max-width: 768px) {
  .grid.grid-2 {
    grid-template-columns: 1fr !important;
  }
}
EOF
    "
    
    # Reload nginx to apply changes
    echo "  🔄 Reloading nginx..."
    kubectl exec -n $NAMESPACE $POD -c rabbitmq-web-ui-frontend -- nginx -s reload
    
    echo "  ✅ Pod $POD patched successfully"
done

echo ""
echo "🎉 Frontend fixes applied successfully!"
echo ""
echo "📋 Fixed Issues:"
echo "  ✅ API endpoint trailing slashes removed"
echo "  ✅ Improved responsive grid layout for connections"
echo "  ✅ Better spacing and card design"
echo "  ✅ Enhanced mobile responsiveness"
echo ""
echo "🌐 Access your application at: https://rmqapp-test.marsem.org/connections"
echo ""
echo "🔧 Test the following functionality:"
echo "  • Add new connections"
echo "  • Edit existing connections"  
echo "  • Delete connections"
echo "  • Responsive layout on different screen sizes"
