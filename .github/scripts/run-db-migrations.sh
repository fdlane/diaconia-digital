#!/usr/bin/env bash
set -euo pipefail

environment="${1:?environment is required}"
image_tag="${2:-}"

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

if [ -z "$image_tag" ]; then
  image_tag="migrations-$(git rev-parse --short HEAD)"
fi

account_id="$(aws sts get-caller-identity --query Account --output text)"
registry="${account_id}.dkr.ecr.${AWS_REGION}.amazonaws.com"
api_repo="${registry}/${name}/api"

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$registry"

if aws ecr describe-images \
  --region "$AWS_REGION" \
  --repository-name "${name}/api" \
  --image-ids "imageTag=${image_tag}" >/dev/null 2>&1; then
  echo "Migration image ${api_repo}:${image_tag} already exists; reusing it."
else
  docker build -f packages/db/Dockerfile -t "${api_repo}:${image_tag}" .
  docker push "${api_repo}:${image_tag}"
fi

api_task_definition="$(aws ecs describe-services \
  --region "$AWS_REGION" \
  --cluster "$name" \
  --services api \
  --query "services[0].taskDefinition" \
  --output text)"

network_configuration="$(aws ecs describe-services \
  --region "$AWS_REGION" \
  --cluster "$name" \
  --services api \
  --query "services[0].networkConfiguration.awsvpcConfiguration" \
  --output json)"

task_definition_json="$(aws ecs describe-task-definition \
  --region "$AWS_REGION" \
  --task-definition "$api_task_definition" \
  --query "taskDefinition" \
  --output json)"

migration_task_definition="$(jq \
  --arg image "${api_repo}:${image_tag}" \
  --arg family "${name}-migrations" \
  '
  {
    family: $family,
    taskRoleArn,
    executionRoleArn,
    networkMode,
    requiresCompatibilities,
    cpu,
    memory,
    runtimePlatform,
    containerDefinitions: [
      (
        .containerDefinitions[]
        | select(.name == "api")
        | .name = "migrations"
        | .image = $image
        | .command = ["pnpm", "db:migrate"]
        | .portMappings = []
        | .environment = ((.environment // []) | map(select(.name != "NODE_ENV")))
        | .environment += [{name: "NODE_ENV", value: "production"}]
      )
    ]
  }
  | with_entries(select(.value != null))
  ' <<< "$task_definition_json")"

migration_task_definition_arn="$(aws ecs register-task-definition \
  --region "$AWS_REGION" \
  --cli-input-json "$migration_task_definition" \
  --query "taskDefinition.taskDefinitionArn" \
  --output text)"

subnets="$(jq -r '.subnets | join(",")' <<< "$network_configuration")"
security_groups="$(jq -r '.securityGroups | join(",")' <<< "$network_configuration")"
assign_public_ip="$(jq -r '.assignPublicIp' <<< "$network_configuration")"

task_arn="$(aws ecs run-task \
  --region "$AWS_REGION" \
  --cluster "$name" \
  --launch-type FARGATE \
  --task-definition "$migration_task_definition_arn" \
  --network-configuration "awsvpcConfiguration={subnets=[$subnets],securityGroups=[$security_groups],assignPublicIp=$assign_public_ip}" \
  --query "tasks[0].taskArn" \
  --output text)"

aws ecs wait tasks-stopped \
  --region "$AWS_REGION" \
  --cluster "$name" \
  --tasks "$task_arn"

exit_code="$(aws ecs describe-tasks \
  --region "$AWS_REGION" \
  --cluster "$name" \
  --tasks "$task_arn" \
  --query "tasks[0].containers[0].exitCode" \
  --output text)"

if [ "$exit_code" != "0" ]; then
  reason="$(aws ecs describe-tasks \
    --region "$AWS_REGION" \
    --cluster "$name" \
    --tasks "$task_arn" \
    --query "tasks[0].containers[0].reason" \
    --output text)"
  echo "Migration task failed with exit code ${exit_code}: ${reason}" >&2
  exit 1
fi

echo "Migration task completed successfully: $task_arn"
