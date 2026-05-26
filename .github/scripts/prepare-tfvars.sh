#!/usr/bin/env bash
set -euo pipefail

environment="${1:?environment is required}"
tfvars_secret="${2:-}"
tfvars_path="${3:-infra/terraform.${environment}.tfvars}"
fallback_path="${4:-infra/terraform.tfvars}"
generated_path="infra/terraform.${environment}.generated.tfvars"

if [ -n "$tfvars_secret" ]; then
  printf "%s\n" "$tfvars_secret" > "$generated_path"
elif [ -f "$tfvars_path" ]; then
  cp "$tfvars_path" "$generated_path"
elif [ "$environment" = "dev" ] && [ -f "$fallback_path" ]; then
  cp "$fallback_path" "$generated_path"
else
  echo "No Terraform variable file found for environment '$environment'." >&2
  echo "Add $tfvars_path or set the TF_VARS_${environment^^} GitHub secret." >&2
  exit 1
fi

append_string_tfvar_from_env() {
  local tfvar_name="${1:?tfvar name is required}"
  local env_name="${2:?env var name is required}"
  local env_value="${!env_name:-}"

  if [ -n "$env_value" ]; then
    TFVAR_NAME="$tfvar_name" ENV_NAME="$env_name" python3 <<'PY' >> "$generated_path"
import json
import os

print(f'{os.environ["TFVAR_NAME"]} = {json.dumps(os.environ[os.environ["ENV_NAME"]])}')
PY
  fi
}

# Optional environment secrets used by the Next.js admin app. Keeping these as
# discrete GitHub environment secrets avoids needing to maintain a monolithic
# TF_VARS_* secret just to deploy Clerk config.
append_string_tfvar_from_env "clerk_publishable_key" "CLERK_PUBLISHABLE_KEY"
append_string_tfvar_from_env "clerk_secret_key" "CLERK_SECRET_KEY"

echo "tfvars_file=$(basename "$generated_path")" >> "$GITHUB_OUTPUT"
