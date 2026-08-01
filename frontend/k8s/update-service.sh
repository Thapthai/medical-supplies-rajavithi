#!/bin/bash
# ============================================
# Frontend (Next.js) - Update Service Script — Smart Cabinet CU
# ============================================
# ใช้เมื่อ: มี deployment อยู่แล้ว แค่ build image ใหม่แล้ว restart
# รันจากโฟลเดอร์ frontend: ./k8s/update-service.sh
# ตัวแปร build ตรงกับ frontend/.env.example (หรือส่งจาก .env)
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

IMAGE_NAME="frontend-smart-cabinet:latest"
NAMESPACE="pose-microservices"
DEPLOYMENT_NAME="frontend"
FRONTEND_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# อ่านจาก .env หรือ .env.local ถ้ามี (ตรงกับ .env.example)
if [ -f "$FRONTEND_ROOT/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$FRONTEND_ROOT/.env"
  set +a
elif [ -f "$FRONTEND_ROOT/.env.local" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$FRONTEND_ROOT/.env.local"
  set +a
fi

NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3000/smart-cabinet-cu/api/v1}"
NEXT_PUBLIC_BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-/smart-cabinet-cu}"

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🔄 UPDATE SERVICE - Frontend (Smart Cabinet CU)   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}📦 Step 1/4: Building Docker image...${NC}"
echo -e "${CYAN}   → ${IMAGE_NAME}${NC}"
echo -e "${CYAN}   → NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}${NC}"
echo -e "${CYAN}   → NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}${NC}"
cd "$FRONTEND_ROOT"
docker build \
  --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" \
  --build-arg NEXT_PUBLIC_BASE_PATH="${NEXT_PUBLIC_BASE_PATH}" \
  -f docker/Dockerfile \
  -t "${IMAGE_NAME}" \
  .

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
echo -e "  • Frontend (NodePort 30100): ${YELLOW}http://<NODE_IP>:30100${NEXT_PUBLIC_BASE_PATH}/${NC}"
echo ""
