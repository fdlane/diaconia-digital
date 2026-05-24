#!/usr/bin/env bash
set -euo pipefail

environment="${1:?environment is required}"
tfvars_file="${2:?tfvars file is required}"
shift 2

: "${AWS_REGION:?AWS_REGION is required}"
: "${TF_STATE_BUCKET:?TF_STATE_BUCKET is required}"

project="${PROJECT:-diaconia-foundation}"
name="${project}-${environment}"
state_key="${TF_STATE_KEY:-${project}/${environment}/terraform.tfstate}"

terraform -chdir=infra init \
  -backend-config="bucket=${TF_STATE_BUCKET}" \
  -backend-config="key=${state_key}" \
  -backend-config="region=${AWS_REGION}" \
  -backend-config="encrypt=true"

terraform -chdir=infra plan \
  -target=aws_ecs_task_definition.api \
  -target=aws_ecs_task_definition.admin \
  -target=aws_ecs_service.api \
  -target=aws_ecs_service.admin \
  -var-file="$tfvars_file" \
  -var="environment=${environment}" \
  "$@" \
  -out=tfplan

terraform -chdir=infra apply -auto-approve tfplan

if ! aws ecs wait services-stable \
  --region "$AWS_REGION" \
  --cluster "$name" \
  --services api admin; then
  echo "ECS services did not stabilize. Recent service state:" >&2
  aws ecs describe-services \
    --region "$AWS_REGION" \
    --cluster "$name" \
    --services api admin \
    --query 'services[].{service:serviceName,desired:desiredCount,running:runningCount,pending:pendingCount,deployments:deployments[].{status:status,rolloutState:rolloutState,desired:desiredCount,running:runningCount,pending:pendingCount,failed:failedTasks,taskDefinition:taskDefinition},events:events[0:8].message}' \
    --output json >&2

  echo "Recent API logs:" >&2
  aws logs tail "/aws/ecs/${name}/api" --region "$AWS_REGION" --since 20m >&2 || true

  echo "Recent admin logs:" >&2
  aws logs tail "/aws/ecs/${name}/admin" --region "$AWS_REGION" --since 20m >&2 || true

  exit 1
fi
