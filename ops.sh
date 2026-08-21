#!/usr/bin/env bash
# ops.sh — LockBox Operations Script
# Usage: ./ops.sh <command> [options]
#   deploy              Build and deploy the full stack (scales backend to 3 replicas)
#   logs [--errors]     Tail container logs (--errors filters 4xx/5xx only)
#   health              Continuous health check against /api/health via edge NGINX
#   down                Tear down the stack
#   status              Show running containers and health

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err() { echo -e "${RED}[ERROR]${NC} $1"; }

check_env() {
    if [ ! -f .env ]; then
        log_err ".env file not found! Copy .env.example to .env and configure."
        exit 1
    fi
    JWT=$(grep -E '^JWT_SECRET=' .env | cut -d '=' -f2)
    if [ -z "$JWT" ] || [[ "$JWT" == "replace_with_strong_random_secret" ]] || [[ "$JWT" == "your_super_secret_jwt_key_here_at_least_32_chars" ]]; then
        log_err "JWT_SECRET in .env is not set to a secure random string!"
        exit 1
    fi
}

deploy() {
    log_info "Validating environment..."
    check_env
    log_info "Building and deploying LockBox..."
    docker compose build
    docker compose up -d --scale backend=3
    
    log_info "Waiting for containers to initialize (5s)..."
    sleep 5
    
    STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health || echo "FAIL")
    if [[ "$STATUS_CODE" == "200" ]]; then
        log_info "Deployment successful! Edge NGINX is responding (HTTP 200)."
    else
        log_warn "Health check failed (Status: $STATUS_CODE). Check 'ops.sh status' or 'ops.sh logs'."
    fi
}

logs() {
    if [[ "$1" == "--errors" ]]; then
        log_info "Tailing logs for 4xx/5xx errors..."
        docker compose logs -f --tail=100 | awk '
            /\" (4[0-9]{2})/ {print "\033[0;33m" $0 "\033[0m"}
            /\" (5[0-9]{2})/ {print "\033[0;31m" $0 "\033[0m"}
        '
    else
        docker compose logs -f --tail=100
    fi
}

health() {
    log_info "Starting health checks against http://localhost/api/health (Ctrl+C to stop)..."
    
    TOTAL_CHECKS=0
    TOTAL_TIME=0
    
    cleanup() {
        echo ""
        log_info "Health Check Summary:"
        echo "Total Checks: $TOTAL_CHECKS"
        if [ $TOTAL_CHECKS -gt 0 ]; then
            AVG_TIME=$(echo "scale=3; $TOTAL_TIME / $TOTAL_CHECKS" | bc)
            echo "Average Latency: ${AVG_TIME}s"
        fi
        exit 0
    }
    
    trap cleanup SIGINT

    printf "%-25s | %-6s | %-10s | %-20s\n" "Timestamp" "Status" "Latency" "Backend Host"
    printf "%-25s-+-%-6s-+-%-10s-+-%-20s\n" "-------------------------" "------" "----------" "--------------------"

    while true; do
        TS=$(date "+%Y-%m-%d %H:%M:%S")
        
        # Capture raw response including body and timing
        RES=$(curl -s -w "\n%{http_code} %{time_total}" http://localhost/api/health)
        
        BODY=$(echo "$RES" | head -n -1)
        METRICS=$(echo "$RES" | tail -n 1)
        STATUS=$(echo "$METRICS" | awk '{print $1}')
        LATENCY=$(echo "$METRICS" | awk '{print $2}')
        
        HOST=$(echo "$BODY" | grep -o '"hostname":"[^"]*"' | cut -d'"' -f4 || echo "N/A")
        
        TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
        TOTAL_TIME=$(echo "$TOTAL_TIME + $LATENCY" | bc)
        
        COLOR=$GREEN
        if [[ "$STATUS" != "200" ]]; then COLOR=$RED; fi
        
        printf "%-25s | ${COLOR}%-6s${NC} | %-9ss | %-20s\n" "$TS" "$STATUS" "$LATENCY" "$HOST"
        
        sleep 2
    done
}

cmd_down() {
    log_info "Tearing down LockBox..."
    docker compose down
}

status() {
    docker compose ps
}

COMMAND=$1
case "$COMMAND" in
    deploy)
        deploy
        ;;
    logs)
        logs "$2"
        ;;
    health)
        health
        ;;
    down)
        cmd_down
        ;;
    status)
        status
        ;;
    *)
        echo "Usage: ./ops.sh <command> [options]"
        echo "Commands:"
        echo "  deploy          Build and deploy the full stack (3 backend replicas)"
        echo "  logs [--errors] Tail container logs"
        echo "  health          Continuous health check loop"
        echo "  down            Tear down stack"
        echo "  status          Show container status"
        exit 1
        ;;
esac
