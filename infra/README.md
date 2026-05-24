# Diaconia Foundation Infrastructure

Terraform foundation for the first Diaconia field-session slice on AWS.

The first deploy target is a `dev` environment in `sa-east-1` using the AWS Application Load Balancer DNS name. A custom domain, ACM certificate, private subnet NAT egress, RDS backup retention, and remote Terraform state should be added before production.

## Resources

- VPC with two public and two private subnets
- Public Application Load Balancer on port 80
- ECR repositories for the API and admin images
- ECS Fargate services for the API and admin app
- RDS PostgreSQL for Drizzle data
- S3 media bucket for profile and meeting images
- Cognito User Pool, app client, and `admin`/`facilitator` groups
- KMS key, Secrets Manager database URL, and CloudWatch log groups

Zero is intentionally not deployed yet because the repo currently has Zero integration notes and client config, but no runnable Zero service entrypoint.

## Bootstrap

Create a local tfvars file:

```bash
cp infra/terraform.tfvars.example infra/terraform.tfvars
```

Set `api_image_tag` and `admin_image_tag` to image tags that already exist in ECR, and keep `api_desired_count` and `admin_desired_count` at `1` for the dev environment. If you are creating the ECR repositories before images exist, temporarily set both desired counts to `0`, apply once, push images, then set both counts back to `1`.

Terraform uses the S3 backend declared in `providers.tf` so local applies and GitHub
Actions share the same state. Create the backend bucket before applying infra, then
initialize Terraform with the backend settings:

```bash
AWS_REGION=sa-east-1
TF_STATE_BUCKET=<terraform-state-bucket>
TF_STATE_KEY=diaconia-foundation/dev/terraform.tfstate

terraform -chdir=infra init \
  -backend-config="bucket=$TF_STATE_BUCKET" \
  -backend-config="key=$TF_STATE_KEY" \
  -backend-config="region=$AWS_REGION" \
  -backend-config="encrypt=true"
terraform -chdir=infra plan -var-file=terraform.tfvars
terraform -chdir=infra apply -var-file=terraform.tfvars
```

For GitHub Actions, configure GitHub environments named `dev` and, when ready,
`prod`. Add these environment or repository variables:

- `AWS_REGION` defaults to `sa-east-1` if omitted
- `PROJECT` defaults to `diaconia-foundation` if omitted
- `TF_STATE_BUCKET` is required
- `TF_STATE_KEY` is optional and defaults to `<project>/<environment>/terraform.tfstate`

Use an `AWS_ROLE_TO_ASSUME` environment secret for GitHub OIDC. If that is not set,
the workflows fall back to `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` secrets.
Optionally set `TF_VARS_DEV` and `TF_VARS_PROD` secrets with complete `.tfvars`
content; otherwise dev uses the committed `infra/terraform.tfvars`, and prod expects
`infra/terraform.prod.tfvars` or `TF_VARS_PROD`.

The deployment workflows are:

- `0a. Deploy branch to AWS`: manual branch/tag/SHA deploy
- `1a. Deploy main to AWS`: deploys `main` to dev after merge
- `2a. Deploy release to AWS`: deploys published releases to prod once prod exists
- `3a. Deploy infra to AWS`: manual Terraform apply
- `3b. Run db migrations`: manual Drizzle migration task in ECS

Capture the outputs:

```bash
terraform -chdir=infra output load_balancer_dns_name
terraform -chdir=infra output api_ecr_repository_url
terraform -chdir=infra output admin_ecr_repository_url
```

## Build And Push Images

Log Docker in to ECR:

```bash
AWS_REGION=sa-east-1
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
```

Build and push immutable git-SHA tags:

```bash
GIT_SHA=$(git rev-parse --short HEAD)
ALB_DNS=$(terraform -chdir=infra output -raw load_balancer_dns_name)
API_REPO=$(terraform -chdir=infra output -raw api_ecr_repository_url)
ADMIN_REPO=$(terraform -chdir=infra output -raw admin_ecr_repository_url)

docker build -f apps/api/Dockerfile -t "$API_REPO:$GIT_SHA" .
docker push "$API_REPO:$GIT_SHA"

docker build \
  -f apps/admin/Dockerfile \
  --build-arg "NEXT_PUBLIC_API_URL=http://$ALB_DNS" \
  -t "$ADMIN_REPO:$GIT_SHA" .
docker push "$ADMIN_REPO:$GIT_SHA"
```

Update `infra/terraform.tfvars`:

```hcl
api_image_tag       = "<git-sha>"
admin_image_tag     = "<git-sha>"
api_desired_count   = 1
admin_desired_count = 1
```

Apply to start or update the services:

```bash
terraform -chdir=infra apply -var-file=terraform.tfvars
```

## Database Migrations

The RDS instance is private. The `3b. Run db migrations` GitHub workflow builds
`packages/db/Dockerfile`, pushes it to ECR, and runs it as a one-off ECS Fargate
task in the existing API service network.

For local emergency use, run migrations only from a network location that can reach
the private RDS instance, such as a bastion/session-manager host or an ECS one-off
task in the VPC.

Optionally seed demo data from the same private network path with
`DATABASE_URL="$DATABASE_URL" pnpm db:seed`.

## Smoke Tests

```bash
ALB_DNS=$(terraform -chdir=infra output -raw load_balancer_dns_name)
curl "http://$ALB_DNS/health"
curl "http://$ALB_DNS/openapi.json"
```

Then open `http://$ALB_DNS` and verify the admin dashboard loads. API routes used by the admin app, including `/admin/*`, `/media/*`, `/sessions`, `/me/*`, and `/attendees/*`, are forwarded to the API target group.

Create initial Cognito users manually or with the AWS CLI, then add dashboard users to the `admin` group and mobile users to the `facilitator` group.
