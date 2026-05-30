#!/usr/bin/env bash
set -euo pipefail

environment="${1:?environment is required}"
tfvars_file="${2:?tfvars file is required}"
shift 2

: "${AWS_REGION:?AWS_REGION is required}"
: "${TF_STATE_BUCKET:?TF_STATE_BUCKET is required}"

project="${PROJECT:-diaconia-foundation}"
state_key="${TF_STATE_KEY:-${project}/${environment}/terraform.tfstate}"

tf() {
  terraform -chdir=infra "$@"
}

tf init \
  -backend-config="bucket=${TF_STATE_BUCKET}" \
  -backend-config="key=${state_key}" \
  -backend-config="region=${AWS_REGION}" \
  -backend-config="encrypt=true"

tf plan \
  -target=aws_s3_bucket.mobile_web \
  -target=aws_s3_bucket_public_access_block.mobile_web \
  -target=aws_s3_bucket_versioning.mobile_web \
  -target=aws_s3_bucket_server_side_encryption_configuration.mobile_web \
  -target=aws_s3_bucket_lifecycle_configuration.mobile_web \
  -target=aws_cloudfront_origin_access_control.mobile_web \
  -target=aws_cloudfront_distribution.mobile_web \
  -target=aws_s3_bucket_policy.mobile_web_cloudfront \
  -target=aws_route53_record.mobile_web_a \
  -target=aws_route53_record.mobile_web_aaaa \
  -var-file="$tfvars_file" \
  -var="environment=${environment}" \
  "$@" \
  -out=tfplan-mobile-web

tf apply -auto-approve tfplan-mobile-web

mobile_bucket="$(tf output -raw mobile_web_bucket_name)"
distribution_id="$(tf output -raw mobile_web_cloudfront_distribution_id)"
mobile_web_url="$(tf output -raw mobile_web_url)"

echo "Building mobile web for ${mobile_web_url}"
export EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY="${EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:-${CLERK_PUBLISHABLE_KEY:-}}"
export EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-}"
export EXPO_PUBLIC_ZERO_CACHE_URL="${EXPO_PUBLIC_ZERO_CACHE_URL:-}"

pnpm --filter @diaconia/mobile web:export

aws s3 sync apps/mobile/dist "s3://${mobile_bucket}/" \
  --region "$AWS_REGION" \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html"

aws s3 cp apps/mobile/dist/index.html "s3://${mobile_bucket}/index.html" \
  --region "$AWS_REGION" \
  --cache-control "no-cache,no-store,must-revalidate" \
  --content-type "text/html"

aws cloudfront create-invalidation \
  --distribution-id "$distribution_id" \
  --paths "/" "/index.html" "/manifest.json" \
  >/dev/null

{
  echo "mobile_web_bucket=${mobile_bucket}"
  echo "mobile_web_distribution_id=${distribution_id}"
  echo "mobile_web_url=${mobile_web_url}"
} >> "${GITHUB_OUTPUT:-/dev/stdout}"

echo "Mobile web deployed to ${mobile_web_url}"
