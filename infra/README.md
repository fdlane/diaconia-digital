# Diaconia Foundation Infrastructure

Terraform foundation for the first Diaconia field-session slice.

The configuration targets a temporary AWS account first and is intentionally portable to a future Diaconia-owned account and GitHub repository.

## Resources

- Cognito User Pool with email fallback and SMS role wiring
- KMS key for application encryption
- S3 media bucket for profile and meeting images
- VPC with public/private subnets
- RDS PostgreSQL for Drizzle and Zero
- ECS cluster placeholders for API and Zero services
- CloudWatch log groups

## Usage

```bash
terraform init
terraform plan -var='environment=dev'
terraform apply -var='environment=dev'
```

Set remote state before production use.
