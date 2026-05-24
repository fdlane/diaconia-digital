output "aws_region" {
  value = var.aws_region
}

output "media_bucket_name" {
  value = aws_s3_bucket.media.bucket
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "cognito_facilitator_client_id" {
  value = aws_cognito_user_pool_client.facilitator.id
}

output "database_secret_arn" {
  value     = aws_secretsmanager_secret.database_url.arn
  sensitive = true
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "load_balancer_dns_name" {
  value = aws_lb.app.dns_name
}

output "api_ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}

output "admin_ecr_repository_url" {
  value = aws_ecr_repository.admin.repository_url
}

output "api_service_name" {
  value = aws_ecs_service.api.name
}

output "admin_service_name" {
  value = aws_ecs_service.admin.name
}
