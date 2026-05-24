#!/usr/bin/env bash
set -euo pipefail

environment="${1:?environment is required}"
tfvars_file="${2:?tfvars file is required}"
shift 2

: "${AWS_REGION:?AWS_REGION is required}"
: "${TF_STATE_BUCKET:?TF_STATE_BUCKET is required}"

project="${PROJECT:-diaconia-foundation}"
state_key="${TF_STATE_KEY:-${project}/${environment}/terraform.tfstate}"

terraform -chdir=infra init \
  -backend-config="bucket=${TF_STATE_BUCKET}" \
  -backend-config="key=${state_key}" \
  -backend-config="region=${AWS_REGION}" \
  -backend-config="encrypt=true"

terraform -chdir=infra plan \
  -var-file="$tfvars_file" \
  -var="environment=${environment}" \
  "$@" \
  -out=tfplan

terraform -chdir=infra apply -auto-approve tfplan
