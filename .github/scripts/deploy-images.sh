#!/usr/bin/env bash
set -euo pipefail

environment="${1:?environment is required}"
image_tag="${2:-}"
tfvars_file="${3:-}"

: "${AWS_REGION:?AWS_REGION is required}"
project="${PROJECT:-diaconia-foundation}"
name="${project}-${environment}"
image_platform="${IMAGE_PLATFORM:-linux/arm64}"

if [ -z "$image_tag" ]; then
  image_tag="$(git rev-parse --short HEAD)"
fi

tfvars_path=""
if [ -n "$tfvars_file" ]; then
  if [ -f "$tfvars_file" ]; then
    tfvars_path="$tfvars_file"
  elif [ -f "infra/$tfvars_file" ]; then
    tfvars_path="infra/$tfvars_file"
  else
    echo "Terraform variable file '$tfvars_file' was not found." >&2
    exit 1
  fi
fi

tfvar_string() {
  local name="$1"
  local file="$2"

  sed -nE "s/^[[:space:]]*${name}[[:space:]]*=[[:space:]]*\"([^\"]*)\"[[:space:]]*(#.*)?$/\1/p" "$file" | head -n 1
}

clerk_publishable_key="${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}"
if [ -z "$clerk_publishable_key" ]; then
  clerk_publishable_key="${CLERK_PUBLISHABLE_KEY:-}"
fi
if [ -z "$clerk_publishable_key" ] && [ -n "$tfvars_path" ]; then
  clerk_publishable_key="$(tfvar_string clerk_publishable_key "$tfvars_path")"
fi

if [ -z "$clerk_publishable_key" ]; then
  echo "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required to build the admin image." >&2
  echo "Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY or clerk_publishable_key in the Terraform tfvars file." >&2
  exit 1
fi

clerk_jwt_template="${NEXT_PUBLIC_CLERK_JWT_TEMPLATE:-diaconia-api}"
clerk_sign_in_url="${NEXT_PUBLIC_CLERK_SIGN_IN_URL:-/}"
clerk_sign_up_url="${NEXT_PUBLIC_CLERK_SIGN_UP_URL:-/sign-up}"
clerk_sign_in_force_redirect_url="${NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL:-/}"
clerk_sign_up_force_redirect_url="${NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL:-/}"

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
      --platform "$image_platform" \
      --cache-from "type=gha,scope=${name}-${app}" \
      --cache-to "type=gha,mode=max,scope=${name}-${app}" \
      --push \
      -t "$image" \
      "$@" \
      .
  else
    docker build --platform "$image_platform" -f "$dockerfile" -t "$image" "$@" .
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

verify_image_platform() {
  local image="$1"

  if [ "${GITHUB_ACTIONS:-}" != "true" ]; then
    return 0
  fi

  if docker buildx imagetools inspect "$image" | grep -q "$image_platform"; then
    return 0
  fi

  echo "Image $image already exists, but it does not include platform $image_platform." >&2
  echo "ECR tags are immutable for this project; deploy with a new image tag or delete the incompatible image tag first." >&2
  exit 1
}

if image_exists "${name}/api"; then
  echo "API image ${api_repo}:${image_tag} already exists; reusing it."
  verify_image_platform "${api_repo}:${image_tag}"
else
  build_and_push api apps/api/Dockerfile "${api_repo}:${image_tag}"
fi

if image_exists "${name}/admin"; then
  echo "Admin image ${admin_repo}:${image_tag} already exists; reusing it."
  verify_image_platform "${admin_repo}:${image_tag}"
else
  build_and_push admin apps/admin/Dockerfile "${admin_repo}:${image_tag}" \
    --build-arg "NEXT_PUBLIC_API_URL=${admin_api_url}" \
    --build-arg "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${clerk_publishable_key}" \
    --build-arg "NEXT_PUBLIC_CLERK_JWT_TEMPLATE=${clerk_jwt_template}" \
    --build-arg "NEXT_PUBLIC_CLERK_SIGN_IN_URL=${clerk_sign_in_url}" \
    --build-arg "NEXT_PUBLIC_CLERK_SIGN_UP_URL=${clerk_sign_up_url}" \
    --build-arg "NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=${clerk_sign_in_force_redirect_url}" \
    --build-arg "NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=${clerk_sign_up_force_redirect_url}"
fi

{
  echo "image_tag=${image_tag}"
  echo "api_repo=${api_repo}"
  echo "admin_repo=${admin_repo}"
  echo "admin_api_url=${admin_api_url}"
} >> "$GITHUB_OUTPUT"
