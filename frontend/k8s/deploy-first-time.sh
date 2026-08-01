#!/bin/bash

# ============================================
# 🚀 Frontend - First Time Deployment Script
# ============================================
# ใช้สำหรับ: Deploy ครั้งแรก
# ============================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="frontend-pose:latest"
NAMESPACE="pose-microservices"
DEPLOYMENT_NAME="frontend"
API_URL="http://10.11.9.84:3000/api/v1"
BASE_PATH="/medical-supplies"

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🚀 FIRST TIME DEPLOYMENT - Frontend             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Build Docker Image
echo -e "${YELLOW}📦 Step 1/5: Building Docker image...${NC}"
echo -e "${CYAN}   → Building ${IMAGE_NAME}${NC}"
echo -e "${CYAN}   → API URL: ${API_URL}${NC}"
echo -e "${CYAN}   → Base Path: ${BASE_PATH}${NC}"
echo -e "${CYAN}   → Note: Dockerfile has default values, build args are optional${NC}"
cd ..
docker build \
  --build-arg NEXT_PUBLIC_API_URL=${API_URL} \
  --build-arg NEXT_PUBLIC_BASE_PATH=${BASE_PATH} \
  -f docker/Dockerfile \
  -t ${IMAGE_NAME} \
  .

# Alternative: Simple build (uses defaults from Dockerfile)
# docker build -f docker/Dockerfile -t ${IMAGE_NAME} .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build completed successfully!${NC}"
else
    echo -e "${RED}✗ Build failed!${NC}"
    exit 1
fi
echo ""

# Step 2: Import to K3s
echo -e "${YELLOW}📥 Step 2/5: Importing image to K3s...${NC}"
echo -e "${CYAN}   → Saving and importing ${IMAGE_NAME}${NC}"
docker save ${IMAGE_NAME} | sudo k3s ctr images import -

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Import completed successfully!${NC}"
else
    echo -e "${RED}✗ Import failed!${NC}"
    exit 1
fi
echo ""

# Step 3: Deploy to K3s
echo -e "${YELLOW}🚀 Step 3/5: Deploying to K3s...${NC}"
echo -e "${CYAN}   → Applying deployment configuration${NC}"
cd k8s
kubectl apply -f frontend-deployment.yaml

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Deployment applied successfully!${NC}"
else
    echo -e "${RED}✗ Deployment failed!${NC}"
    exit 1
fi
echo ""

# Step 4: Wait for Deployment
echo -e "${YELLOW}⏳ Step 4/5: Waiting for deployment to be ready...${NC}"
echo -e "${CYAN}   → Monitoring rollout status${NC}"
kubectl rollout status deployment/${DEPLOYMENT_NAME} -n ${NAMESPACE} --timeout=5m

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Deployment is ready!${NC}"
else
    echo -e "${RED}✗ Deployment rollout failed or timed out!${NC}"
    exit 1
fi
echo ""

# Step 5: Show Status
echo -e "${YELLOW}📊 Step 5/5: Checking final status...${NC}"
echo ""
echo -e "${CYAN}Pods:${NC}"
kubectl get pods -n ${NAMESPACE} -l app=${DEPLOYMENT_NAME}
echo ""
echo -e "${CYAN}Services:${NC}"
kubectl get svc -n ${NAMESPACE} frontend-service
echo ""

# Success Message
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ First Time Deployment Completed Successfully! ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Next Steps
echo -e "${BLUE}📝 Next steps:${NC}"
echo -e "  • Check logs: ${YELLOW}kubectl logs -n ${NAMESPACE} -l app=${DEPLOYMENT_NAME} -f${NC}"
echo -e "  • Check status: ${YELLOW}kubectl get pods -n ${NAMESPACE} -l app=${DEPLOYMENT_NAME}${NC}"
echo -e "  • Access frontend via Apache: ${YELLOW}https://phc.dyndns.biz/medical-supplies/${NC}"
echo -e "  • Access frontend via NodePort: ${YELLOW}http://10.11.9.84:30100/medical-supplies/${NC}"
echo ""

echo -e "${GREEN}🎉 Deployment completed at $(date '+%Y-%m-%d %H:%M:%S')${NC}"

