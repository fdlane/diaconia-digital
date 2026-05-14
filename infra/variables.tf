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
