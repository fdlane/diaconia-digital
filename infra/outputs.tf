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
