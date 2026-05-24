#!/usr/bin/env bash
set -euo pipefail

environment="${1:?environment is required}"
image_tag="${2:-}"

: "${AWS_REGION:?AWS_REGION is required}"
project="${PROJECT:-diaconia-foundation}"
name="${project}-${environment}"

if [ -z "$image_tag" ]; then
  image_tag="$(git rev-parse --short HEAD)"
fi

account_id="$(aws sts get-caller-identity --query Account --output text)"
registry="${account_id}.dkr.ecr.${AWS_REGION}.amazonaws.com"
api_repo="${registry}/${name}/api"
admin_repo="${registry}/${name}/admin"

alb_dns="$(aws elbv2 describe-load-balancers \
  --region "$AWS_REGION" \
  --names "$name" \
  --query "LoadBalancers[0].DNSName" \
  --output text 2>/dev/null || true)"

if [ -z "$alb_dns" ] || [ "$alb_dns" = "None" ]; then
  admin_api_url="${NEXT_PUBLIC_API_URL:-http://localhost:4000}"
else
  admin_api_url="${NEXT_PUBLIC_API_URL:-http://${alb_dns}}"
fi

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$registry"

build_and_push() {
  local app="$1"
  local dockerfile="$2"
  local image="$3"
  shift 3

  if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
    docker buildx build \
      -f "$dockerfile" \
      --cache-from "type=gha,scope=${name}-${app}" \
      --cache-to "type=gha,mode=max,scope=${name}-${app}" \
      --push \
      -t "$image" \
      "$@" \
      .
  else
    docker build -f "$dockerfile" -t "$image" "$@" .
    docker push "$image"
  fi
}

image_exists() {
  local repository_name="$1"

  aws ecr describe-images \
    --region "$AWS_REGION" \
    --repository-name "$repository_name" \
    --image-ids "imageTag=${image_tag}" >/dev/null 2>&1
}

if image_exists "${name}/api"; then
  echo "API image ${api_repo}:${image_tag} already exists; reusing it."
else
  build_and_push api apps/api/Dockerfile "${api_repo}:${image_tag}"
fi

if image_exists "${name}/admin"; then
  echo "Admin image ${admin_repo}:${image_tag} already exists; reusing it."
else
  build_and_push admin apps/admin/Dockerfile "${admin_repo}:${image_tag}" \
    --build-arg "NEXT_PUBLIC_API_URL=${admin_api_url}"
fi

{
  echo "image_tag=${image_tag}"
  echo "api_repo=${api_repo}"
  echo "admin_repo=${admin_repo}"
  echo "admin_api_url=${admin_api_url}"
} >> "$GITHUB_OUTPUT"
