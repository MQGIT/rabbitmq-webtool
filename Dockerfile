# Multi-stage build for RabbitMQ Web UI (Frontend + Backend)
# Stage 1: Build React frontend
FROM node:18-alpine as frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy frontend source code
COPY frontend/ .

# Build the application
RUN npm run build

# Stage 2: Build Python backend
FROM python:3.11-slim as backend-builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app/backend

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/app/ ./app/

# Stage 3: Production stage with nginx + supervisord
FROM python:3.11-slim as production

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set work directory
WORKDIR /app

# Copy Python dependencies from backend builder
COPY --from=backend-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend-builder /usr/local/bin /usr/local/bin

# Copy backend application
COPY --from=backend-builder /app/backend ./backend

# Copy frontend build
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/sites-available/default

# Create nginx configuration for combined app
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    \
    # Frontend static files \
    location / { \
        root /app/frontend/build; \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Backend API \
    location /api { \
        proxy_pass http://127.0.0.1:8000; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    \
    # Health check endpoint \
    location /health { \
        proxy_pass http://127.0.0.1:8000/health; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
}' > /etc/nginx/sites-available/default

# Create supervisord configuration
RUN echo '[supervisord] \
nodaemon=true \
user=root \
\
[program:backend] \
command=uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 \
directory=/app \
user=appuser \
autostart=true \
autorestart=true \
stdout_logfile=/var/log/supervisor/backend.log \
stderr_logfile=/var/log/supervisor/backend.log \
\
[program:nginx] \
command=nginx -g "daemon off;" \
autostart=true \
autorestart=true \
stdout_logfile=/var/log/supervisor/nginx.log \
stderr_logfile=/var/log/supervisor/nginx.log' > /etc/supervisor/conf.d/supervisord.conf

# Create directory for SQLite database and logs
RUN mkdir -p /app/data /var/log/supervisor && \
    chown -R appuser:appuser /app/data && \
    chown -R appuser:appuser /app/backend

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start supervisord
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
