#!/bin/bash
# ============================================
# Backend (NestJS Monolith) - Update Service Script
# ============================================
# ใช้เมื่อ: มี deployment อยู่แล้ว แค่ build image ใหม่แล้ว restart
# รันจากโฟลเดอร์ backend: ./k8s/update-service.sh
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

IMAGE_NAME="backend-smart-cabinet:latest"
NAMESPACE="pose-microservices"
DEPLOYMENT_NAME="backend"
BACKEND_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🔄 UPDATE SERVICE - Backend (NestJS Monolith)     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}📦 Step 1/4: Building Docker image...${NC}"
echo -e "${CYAN}   → ${IMAGE_NAME}${NC}"
cd "$BACKEND_ROOT"
docker build -f docker/Dockerfile -t "${IMAGE_NAME}" .

echo ""
echo -e "${YELLOW}📥 Step 2/4: Importing image to K3s...${NC}"
docker save "${IMAGE_NAME}" | sudo k3s ctr images import -

echo ""
echo -e "${YELLOW}🔄 Step 3/4: Restarting deployment...${NC}"
kubectl rollout restart deployment/"${DEPLOYMENT_NAME}" -n "${NAMESPACE}"

echo ""
echo -e "${YELLOW}⏳ Step 4/4: Waiting for rollout...${NC}"
kubectl rollout status deployment/"${DEPLOYMENT_NAME}" -n "${NAMESPACE}" --timeout=5m

echo ""
echo -e "${GREEN}✅ Update completed.${NC}"
echo -e "${CYAN}Pods:${NC}"
kubectl get pods -n "${NAMESPACE}" -l app="${DEPLOYMENT_NAME}"
echo ""
echo -e "  • Logs: ${YELLOW}kubectl logs -n ${NAMESPACE} -l app=${DEPLOYMENT_NAME} -f${NC}"
echo -e "  • API (NodePort 30080): ${YELLOW}http://<NODE_IP>:30080/smart-cabinet-cu/api/v1/health${NC}"
echo ""
