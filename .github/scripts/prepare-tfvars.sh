#!/usr/bin/env bash
set -euo pipefail

environment="${1:?environment is required}"
tfvars_secret="${2:-}"
tfvars_path="${3:-infra/terraform.${environment}.tfvars}"
fallback_path="${4:-infra/terraform.tfvars}"

if [ -n "$tfvars_secret" ]; then
  printf "%s\n" "$tfvars_secret" > "infra/terraform.${environment}.tfvars"
  echo "tfvars_file=terraform.${environment}.tfvars" >> "$GITHUB_OUTPUT"
elif [ -f "$tfvars_path" ]; then
  echo "tfvars_file=$(basename "$tfvars_path")" >> "$GITHUB_OUTPUT"
elif [ "$environment" = "dev" ] && [ -f "$fallback_path" ]; then
  echo "tfvars_file=$(basename "$fallback_path")" >> "$GITHUB_OUTPUT"
else
  echo "No Terraform variable file found for environment '$environment'." >&2
  echo "Add $tfvars_path or set the TF_VARS_${environment^^} GitHub secret." >&2
  exit 1
fi
