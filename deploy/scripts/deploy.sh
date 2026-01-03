#!/bin/bash
# LENR Simulation App - Deployment Script
# Usage: ./deploy.sh [build|start|stop|restart|logs|status]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$DEPLOY_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

check_env() {
    if [ ! -f "$DEPLOY_DIR/.env" ]; then
        log_warn ".env file not found. Creating from template..."
        cp "$DEPLOY_DIR/.env.production" "$DEPLOY_DIR/.env"
        log_warn "Please edit $DEPLOY_DIR/.env with your production settings!"
    fi
}

build() {
    log_info "Building Docker images..."
    cd "$DEPLOY_DIR"
    docker compose build --no-cache
    log_info "Build complete!"
}

start() {
    log_info "Starting LENR Simulation App..."
    cd "$DEPLOY_DIR"
    docker compose up -d
    log_info "Application started!"
    log_info "Frontend: http://localhost:8080/lenr-sim-app/"
    log_info "API Health: http://localhost:8080/lenr-sim-app/api/health"
}

stop() {
    log_info "Stopping LENR Simulation App..."
    cd "$DEPLOY_DIR"
    docker compose down
    log_info "Application stopped!"
}

restart() {
    log_info "Restarting LENR Simulation App..."
    stop
    start
}

logs() {
    cd "$DEPLOY_DIR"
    docker compose logs -f "$@"
}

status() {
    cd "$DEPLOY_DIR"
    echo ""
    log_info "Container Status:"
    docker compose ps
    echo ""
    log_info "Resource Usage:"
    docker stats --no-stream $(docker compose ps -q) 2>/dev/null || echo "No containers running"
}

update() {
    log_info "Updating LENR Simulation App..."
    cd "$PROJECT_DIR"
    git pull origin main
    build
    restart
    log_info "Update complete!"
}

health_check() {
    log_info "Running health checks..."
    
    # Check frontend
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/lenr-sim-app/ | grep -q "200"; then
        log_info "✓ Frontend is healthy"
    else
        log_error "✗ Frontend is not responding"
    fi
    
    # Check backend
    if curl -s http://localhost:8080/lenr-sim-app/api/health | grep -q "healthy"; then
        log_info "✓ Backend is healthy"
    else
        log_error "✗ Backend is not responding"
    fi
}

usage() {
    echo "LENR Simulation App Deployment Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build     Build Docker images"
    echo "  start     Start the application"
    echo "  stop      Stop the application"
    echo "  restart   Restart the application"
    echo "  logs      View application logs (use: logs [service])"
    echo "  status    Show container status and resource usage"
    echo "  update    Pull latest code and redeploy"
    echo "  health    Run health checks"
    echo "  help      Show this help message"
    echo ""
}

# Main
check_docker

case "$1" in
    build)
        check_env
        build
        ;;
    start)
        check_env
        start
        ;;
    stop)
        stop
        ;;
    restart)
        check_env
        restart
        ;;
    logs)
        shift
        logs "$@"
        ;;
    status)
        status
        ;;
    update)
        check_env
        update
        ;;
    health)
        health_check
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        usage
        exit 1
        ;;
esac
