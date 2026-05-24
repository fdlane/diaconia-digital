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

```bash
terraform -chdir=infra init
terraform -chdir=infra plan -var-file=terraform.tfvars
terraform -chdir=infra apply -var-file=terraform.tfvars
```

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

Fetch the RDS URL from Secrets Manager and run migrations from a network location that can reach the private RDS instance. For this first setup, use a temporary controlled path such as a bastion/session-manager host or an ECS one-off task in the VPC.

```bash
DATABASE_SECRET_ARN=$(terraform -chdir=infra output -raw database_secret_arn)
DATABASE_URL=$(aws secretsmanager get-secret-value \
  --region sa-east-1 \
  --secret-id "$DATABASE_SECRET_ARN" \
  --query SecretString \
  --output text)

DATABASE_URL="$DATABASE_URL" pnpm db:migrate
```

Optionally seed demo data:

```bash
DATABASE_URL="$DATABASE_URL" pnpm db:seed
```

## Smoke Tests

```bash
ALB_DNS=$(terraform -chdir=infra output -raw load_balancer_dns_name)
curl "http://$ALB_DNS/health"
curl "http://$ALB_DNS/openapi.json"
```

Then open `http://$ALB_DNS` and verify the admin dashboard loads. API routes used by the admin app, including `/admin/*`, `/media/*`, `/sessions`, `/me/*`, and `/attendees/*`, are forwarded to the API target group.

Create initial Cognito users manually or with the AWS CLI, then add dashboard users to the `admin` group and mobile users to the `facilitator` group.
