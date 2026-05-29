variable "project" {
  description = "Project name used for AWS resource names."
  type        = string
  default     = "diaconia-foundation"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region for the Paraguay launch foundation."
  type        = string
  default     = "sa-east-1"
}

variable "database_username" {
  description = "RDS PostgreSQL admin username."
  type        = string
  default     = "diaconia_admin"
}

variable "database_name" {
  description = "Application database name."
  type        = string
  default     = "diaconia"
}

variable "database_engine_version" {
  description = "RDS PostgreSQL engine version. Use a major version so AWS can choose a supported regional patch."
  type        = string
  default     = "16"
}

variable "database_backup_retention_period" {
  description = "RDS backup retention in days. Use 0 for free-tier dev accounts; raise before production."
  type        = number
  default     = 0
}

variable "allowed_callback_urls" {
  description = "Cognito callback URLs for hosted auth flows."
  type        = list(string)
  default     = ["http://localhost:3000", "http://localhost:8081"]
}

variable "allowed_logout_urls" {
  description = "Cognito logout URLs for hosted auth flows."
  type        = list(string)
  default     = ["http://localhost:3000", "http://localhost:8081"]
}

variable "api_image_tag" {
  description = "Immutable ECR image tag for the API task. Use a git SHA for live deploys."
  type        = string
  default     = "bootstrap"
}

variable "admin_image_tag" {
  description = "Immutable ECR image tag for the admin task. Use a git SHA for live deploys."
  type        = string
  default     = "bootstrap"
}

variable "api_container_port" {
  description = "Container port exposed by the API service."
  type        = number
  default     = 4000
}

variable "admin_container_port" {
  description = "Container port exposed by the admin Next.js service."
  type        = number
  default     = 3000
}

variable "api_task_cpu" {
  description = "Fargate CPU units for the API task."
  type        = number
  default     = 256
}

variable "api_task_memory" {
  description = "Fargate memory MiB for the API task."
  type        = number
  default     = 512
}

variable "admin_task_cpu" {
  description = "Fargate CPU units for the admin task."
  type        = number
  default     = 256
}

variable "admin_task_memory" {
  description = "Fargate memory MiB for the admin task."
  type        = number
  default     = 512
}

variable "api_desired_count" {
  description = "Desired API task count. Keep 0 for bootstrap before images are pushed, then set to 1."
  type        = number
  default     = 0
}

variable "admin_desired_count" {
  description = "Desired admin task count. Keep 0 for bootstrap before images are pushed, then set to 1."
  type        = number
  default     = 0
}

variable "auth_auto_provision_clerk_users" {
  description = "Allow non-production deployments to create an active admin row for any valid Clerk user that signs in. Ignored by the API when environment is prod or production."
  type        = bool
  default     = false
}

variable "clerk_publishable_key" {
  description = "Clerk publishable key (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) for the admin Next.js app."
  type        = string
  default     = ""
}

variable "clerk_secret_key" {
  description = "Clerk secret key for the admin Next.js app. Stored in Secrets Manager."
  type        = string
  sensitive   = true
  default     = ""
}
