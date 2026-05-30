locals {
  name = "${var.project}-${var.environment}"

  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  api_container_name   = "api"
  admin_container_name = "admin"

  mobile_web_origins = distinct(compact([
    "https://${aws_cloudfront_distribution.mobile_web.domain_name}",
    var.mobile_web_domain_name != "" ? "https://${var.mobile_web_domain_name}" : "",
  ]))

  browser_allowed_origins = distinct(concat(
    var.allowed_callback_urls,
    local.mobile_web_origins,
    ["http://${aws_lb.app.dns_name}"],
  ))
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}


data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host_header" {
  name = "Managed-AllViewerExceptHostHeader"
}

resource "random_password" "database" {
  length  = 32
  special = true
}

resource "aws_kms_key" "app" {
  description             = "Diaconia foundation application key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableAccountAdministration"
        Effect = "Allow"
        Principal = {
          AWS = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowCloudWatchLogs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${var.aws_region}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          ArnLike = {
            "kms:EncryptionContext:aws:logs:arn" = "arn:${data.aws_partition.current.partition}:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/ecs/${local.name}/*"
          }
        }
      }
    ]
  })
  tags = local.common_tags
}

resource "aws_kms_alias" "app" {
  name          = "alias/${local.name}"
  target_key_id = aws_kms_key.app.key_id
}

resource "aws_vpc" "main" {
  cidr_block           = "10.42.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags                 = merge(local.common_tags, { Name = local.name })
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = merge(local.common_tags, { Name = local.name })
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags                    = merge(local.common_tags, { Name = "${local.name}-public-${count.index + 1}" })
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = merge(local.common_tags, { Name = "${local.name}-private-${count.index + 1}" })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  tags   = merge(local.common_tags, { Name = "${local.name}-public" })
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_s3_bucket" "media" {
  bucket = "${local.name}-media"
  tags   = local.common_tags
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket                  = aws_s3_bucket.media.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.app.arn
      sse_algorithm     = "aws:kms"
    }
  }
}


resource "aws_s3_bucket" "mobile_web" {
  bucket = "${local.name}-mobile-web"
  tags   = merge(local.common_tags, { Name = "${local.name}-mobile-web" })
}

resource "aws_s3_bucket_public_access_block" "mobile_web" {
  bucket                  = aws_s3_bucket.mobile_web.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "mobile_web" {
  bucket = aws_s3_bucket.mobile_web.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "mobile_web" {
  bucket = aws_s3_bucket.mobile_web.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "mobile_web" {
  bucket = aws_s3_bucket.mobile_web.id

  rule {
    id     = "expire-old-mobile-web-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_db_subnet_group" "main" {
  name       = local.name
  subnet_ids = aws_subnet.private[*].id
  tags       = local.common_tags
}

resource "aws_security_group" "database" {
  name        = "${local.name}-database"
  description = "PostgreSQL access for API and Zero services"
  vpc_id      = aws_vpc.main.id
  tags        = local.common_tags
}

resource "aws_security_group_rule" "database_from_api" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.database.id
  source_security_group_id = aws_security_group.api_service.id
  description              = "Allow API tasks to connect to PostgreSQL"
}

resource "aws_security_group" "load_balancer" {
  name        = "${local.name}-alb"
  description = "Public HTTP access to Diaconia dev services"
  vpc_id      = aws_vpc.main.id
  tags        = local.common_tags
}

resource "aws_security_group_rule" "load_balancer_http_in" {
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  security_group_id = aws_security_group.load_balancer.id
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "Allow public HTTP for the first ALB DNS deploy"
}

resource "aws_security_group_rule" "load_balancer_all_out" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  security_group_id = aws_security_group.load_balancer.id
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "Allow ALB egress to ECS tasks"
}

resource "aws_security_group" "api_service" {
  name        = "${local.name}-api"
  description = "API ECS service access"
  vpc_id      = aws_vpc.main.id
  tags        = local.common_tags
}

resource "aws_security_group_rule" "api_from_load_balancer" {
  type                     = "ingress"
  from_port                = var.api_container_port
  to_port                  = var.api_container_port
  protocol                 = "tcp"
  security_group_id        = aws_security_group.api_service.id
  source_security_group_id = aws_security_group.load_balancer.id
  description              = "Allow ALB traffic to API tasks"
}

resource "aws_security_group_rule" "api_all_out" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  security_group_id = aws_security_group.api_service.id
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "Allow API egress for AWS APIs and package runtime access"
}

resource "aws_security_group" "admin_service" {
  name        = "${local.name}-admin"
  description = "Admin ECS service access"
  vpc_id      = aws_vpc.main.id
  tags        = local.common_tags
}

resource "aws_security_group_rule" "admin_from_load_balancer" {
  type                     = "ingress"
  from_port                = var.admin_container_port
  to_port                  = var.admin_container_port
  protocol                 = "tcp"
  security_group_id        = aws_security_group.admin_service.id
  source_security_group_id = aws_security_group.load_balancer.id
  description              = "Allow ALB traffic to admin tasks"
}

resource "aws_security_group_rule" "admin_all_out" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  security_group_id = aws_security_group.admin_service.id
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "Allow admin egress for API calls and runtime access"
}

resource "aws_db_instance" "postgres" {
  identifier              = local.name
  allocated_storage       = 20
  engine                  = "postgres"
  engine_version          = var.database_engine_version
  instance_class          = "db.t4g.micro"
  db_name                 = var.database_name
  username                = var.database_username
  password                = random_password.database.result
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.database.id]
  storage_encrypted       = true
  kms_key_id              = aws_kms_key.app.arn
  backup_retention_period = var.database_backup_retention_period
  deletion_protection     = true
  skip_final_snapshot     = false
  tags                    = local.common_tags
}

resource "aws_iam_role" "cognito_sms" {
  name = "${local.name}-cognito-sms"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "cognito-idp.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "cognito_sms" {
  name = "${local.name}-cognito-sms"
  role = aws_iam_role.cognito_sms.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_cognito_user_pool" "main" {
  name = local.name

  username_attributes      = ["email", "phone_number"]
  auto_verified_attributes = ["email", "phone_number"]
  mfa_configuration        = "OPTIONAL"

  sms_configuration {
    external_id    = "${local.name}-sms"
    sns_caller_arn = aws_iam_role.cognito_sms.arn
    sns_region     = var.aws_region
  }

  password_policy {
    minimum_length    = 10
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  software_token_mfa_configuration {
    enabled = true
  }

  tags = local.common_tags
}

resource "aws_cognito_user_pool_client" "facilitator" {
  name         = "${local.name}-facilitator"
  user_pool_id = aws_cognito_user_pool.main.id

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "phone", "profile"]
  callback_urls                        = var.allowed_callback_urls
  logout_urls                          = var.allowed_logout_urls
  explicit_auth_flows                  = ["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_SRP_AUTH"]
  prevent_user_existence_errors        = "ENABLED"
  supported_identity_providers         = ["COGNITO"]
}

resource "aws_ecs_cluster" "main" {
  name = local.name
  tags = local.common_tags
}

resource "aws_ecr_repository" "api" {
  name                 = "${local.name}/api"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = local.common_tags
}

resource "aws_ecr_repository" "admin" {
  name                 = "${local.name}/admin"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = local.common_tags
}

resource "aws_lb" "app" {
  name               = local.name
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.load_balancer.id]
  subnets            = aws_subnet.public[*].id
  tags               = local.common_tags
}

resource "aws_lb_target_group" "api" {
  name        = "${local.name}-api"
  port        = var.api_container_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.main.id

  health_check {
    enabled             = true
    path                = "/health"
    matcher             = "200"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
  }

  tags = local.common_tags
}

resource "aws_lb_target_group" "admin" {
  name        = "${local.name}-admin"
  port        = var.admin_container_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.main.id

  health_check {
    enabled             = true
    path                = "/"
    matcher             = "200-399"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
  }

  tags = local.common_tags
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.admin.arn
  }

  tags = local.common_tags
}

resource "aws_lb_listener_rule" "api_health" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/health", "/openapi.json"]
    }
  }
}

# Rules 20–50: require Authorization header so browser page navigation
# (no token) falls through to the admin app even on shared paths like
# /meetings and /groups.

resource "aws_lb_listener_rule" "api_auth_1" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 20

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/me", "/me/*", "/admin/*", "/attendees/*"]
    }
  }

  condition {
    http_header {
      http_header_name = "Authorization"
      values           = ["Bearer *"]
    }
  }
}

resource "aws_lb_listener_rule" "api_auth_2" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 30

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/meetings", "/meetings/*", "/groups", "/groups/*"]
    }
  }

  condition {
    http_header {
      http_header_name = "Authorization"
      values           = ["Bearer *"]
    }
  }
}

resource "aws_lb_listener_rule" "api_auth_3" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 40

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/users", "/users/*", "/chaplains", "/chaplains/*"]
    }
  }

  condition {
    http_header {
      http_header_name = "Authorization"
      values           = ["Bearer *"]
    }
  }
}

resource "aws_lb_listener_rule" "api_auth_4" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 50

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/media/*", "/zero/*", "/api/*"]
    }
  }

  condition {
    http_header {
      http_header_name = "Authorization"
      values           = ["Bearer *"]
    }
  }
}


resource "aws_cloudfront_origin_access_control" "mobile_web" {
  name                              = "${local.name}-mobile-web"
  description                       = "Allow CloudFront to read the private mobile web bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "mobile_web" {
  enabled             = true
  comment             = "${local.name} mobile web"
  default_root_object = "index.html"
  aliases             = var.mobile_web_domain_name != "" ? [var.mobile_web_domain_name] : []
  price_class         = var.mobile_web_cloudfront_price_class

  origin {
    origin_id                = "mobile-web-s3"
    domain_name              = aws_s3_bucket.mobile_web.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.mobile_web.id
  }

  origin {
    origin_id   = "app-alb"
    domain_name = aws_lb.app.dns_name

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "mobile-web-s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
  }

  dynamic "ordered_cache_behavior" {
    for_each = toset([
      "/health",
      "/openapi.json",
      "/me*",
      "/media*",
      "/zero*",
      "/meetings*",
      "/users*",
      "/groups*",
      "/chaplains*",
      "/api/*",
    ])

    content {
      path_pattern             = ordered_cache_behavior.value
      target_origin_id         = "app-alb"
      viewer_protocol_policy   = "redirect-to-https"
      allowed_methods          = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods           = ["GET", "HEAD", "OPTIONS"]
      compress                 = true
      cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
      origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host_header.id
    }
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn            = var.mobile_web_acm_certificate_arn != "" ? var.mobile_web_acm_certificate_arn : null
    cloudfront_default_certificate = var.mobile_web_acm_certificate_arn == "" ? true : null
    minimum_protocol_version       = var.mobile_web_acm_certificate_arn != "" ? "TLSv1.2_2021" : null
    ssl_support_method             = var.mobile_web_acm_certificate_arn != "" ? "sni-only" : null
  }

  tags = merge(local.common_tags, { Name = "${local.name}-mobile-web" })
}

resource "aws_s3_bucket_policy" "mobile_web_cloudfront" {
  bucket = aws_s3_bucket.mobile_web.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontRead"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.mobile_web.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.mobile_web.arn
          }
        }
      }
    ]
  })
}

resource "aws_route53_record" "mobile_web_a" {
  count   = var.route53_zone_id != "" && var.mobile_web_domain_name != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.mobile_web_domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.mobile_web.domain_name
    zone_id                = aws_cloudfront_distribution.mobile_web.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "mobile_web_aaaa" {
  count   = var.route53_zone_id != "" && var.mobile_web_domain_name != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.mobile_web_domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.mobile_web.domain_name
    zone_id                = aws_cloudfront_distribution.mobile_web.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/ecs/${local.name}/api"
  retention_in_days = 30
  kms_key_id        = aws_kms_key.app.arn
  tags              = local.common_tags
}

resource "aws_cloudwatch_log_group" "admin" {
  name              = "/aws/ecs/${local.name}/admin"
  retention_in_days = 30
  kms_key_id        = aws_kms_key.app.arn
  tags              = local.common_tags
}

resource "aws_cloudwatch_log_group" "zero" {
  name              = "/aws/ecs/${local.name}/zero"
  retention_in_days = 30
  kms_key_id        = aws_kms_key.app.arn
  tags              = local.common_tags
}

resource "aws_secretsmanager_secret" "database_url" {
  name       = "${local.name}/database-url"
  kms_key_id = aws_kms_key.app.arn
  tags       = local.common_tags
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id = aws_secretsmanager_secret.database_url.id
  secret_string = format(
    "postgres://%s:%s@%s:%s/%s",
    var.database_username,
    random_password.database.result,
    aws_db_instance.postgres.address,
    aws_db_instance.postgres.port,
    var.database_name
  )
}

resource "aws_secretsmanager_secret" "clerk_secret_key" {
  name       = "${local.name}/clerk-secret-key"
  kms_key_id = aws_kms_key.app.arn
  tags       = local.common_tags
}

resource "aws_secretsmanager_secret_version" "clerk_secret_key" {
  secret_id     = aws_secretsmanager_secret.clerk_secret_key.id
  secret_string = var.clerk_secret_key
}

resource "aws_iam_role" "ecs_task_execution" {
  name = "${local.name}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_task_execution_secrets" {
  name = "${local.name}-ecs-execution-secrets"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.database_url.arn,
          aws_secretsmanager_secret.clerk_secret_key.arn,
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = aws_kms_key.app.arn
      }
    ]
  })
}

resource "aws_iam_role" "api_task" {
  name = "${local.name}-api-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "api_task" {
  name = "${local.name}-api-task"
  role = aws_iam_role.api_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.media.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.app.arn
      }
    ]
  })
}

resource "aws_iam_role" "admin_task" {
  name = "${local.name}-admin-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${local.name}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = tostring(var.api_task_cpu)
  memory                   = tostring(var.api_task_memory)
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.api_task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }

  container_definitions = jsonencode([
    {
      name      = local.api_container_name
      image     = "${aws_ecr_repository.api.repository_url}:${var.api_image_tag}"
      essential = true
      portMappings = [
        {
          containerPort = var.api_container_port
          hostPort      = var.api_container_port
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "ENVIRONMENT", value = var.environment },
        { name = "PORT", value = tostring(var.api_container_port) },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "MEDIA_BUCKET_NAME", value = aws_s3_bucket.media.bucket },
        { name = "COGNITO_USER_POOL_ID", value = aws_cognito_user_pool.main.id },
        { name = "COGNITO_APP_CLIENT_ID", value = aws_cognito_user_pool_client.facilitator.id },
        { name = "ALLOWED_ORIGINS", value = join(",", local.browser_allowed_origins) },
        { name = "AUTH_AUTO_PROVISION_CLERK_USERS", value = tostring(var.auth_auto_provision_clerk_users) },
        { name = "CLERK_JWT_AUDIENCE", value = "diaconia-api" },
        { name = "CLERK_AUTHORIZED_PARTIES", value = join(",", local.browser_allowed_origins) }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.database_url.arn },
        { name = "CLERK_SECRET_KEY", valueFrom = aws_secretsmanager_secret.clerk_secret_key.arn }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.api.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  lifecycle {
    precondition {
      condition     = var.api_desired_count == 0 || length(trimspace(nonsensitive(var.clerk_secret_key))) > 0
      error_message = "clerk_secret_key must be set when api_desired_count is greater than 0."
    }
  }

  tags = local.common_tags
}

resource "aws_ecs_task_definition" "admin" {
  family                   = "${local.name}-admin"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = tostring(var.admin_task_cpu)
  memory                   = tostring(var.admin_task_memory)
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.admin_task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }

  container_definitions = jsonencode([
    {
      name      = local.admin_container_name
      image     = "${aws_ecr_repository.admin.repository_url}:${var.admin_image_tag}"
      essential = true
      portMappings = [
        {
          containerPort = var.admin_container_port
          hostPort      = var.admin_container_port
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "ENVIRONMENT", value = var.environment },
        { name = "PORT", value = tostring(var.admin_container_port) },
        { name = "NEXT_PUBLIC_API_URL", value = "http://${aws_lb.app.dns_name}" },
        { name = "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", value = var.clerk_publishable_key },
        { name = "NEXT_PUBLIC_CLERK_JWT_TEMPLATE", value = "diaconia-api" },
        { name = "NEXT_PUBLIC_CLERK_SIGN_IN_URL", value = "/" },
        { name = "NEXT_PUBLIC_CLERK_SIGN_UP_URL", value = "/sign-up" },
        { name = "NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL", value = "/" },
        { name = "NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL", value = "/" }
      ]
      secrets = [
        { name = "CLERK_SECRET_KEY", valueFrom = aws_secretsmanager_secret.clerk_secret_key.arn }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.admin.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  lifecycle {
    precondition {
      condition     = var.admin_desired_count == 0 || length(trimspace(var.clerk_publishable_key)) > 0
      error_message = "clerk_publishable_key must be set when admin_desired_count is greater than 0."
    }

    precondition {
      condition     = var.admin_desired_count == 0 || length(trimspace(nonsensitive(var.clerk_secret_key))) > 0
      error_message = "clerk_secret_key must be set when admin_desired_count is greater than 0."
    }
  }

  tags = local.common_tags
}

resource "aws_ecs_service" "api" {
  name            = "api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.api_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    assign_public_ip = true
    security_groups  = [aws_security_group.api_service.id]
    subnets          = aws_subnet.public[*].id
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = local.api_container_name
    container_port   = var.api_container_port
  }

  depends_on = [aws_lb_listener.http]
  tags       = local.common_tags
}

resource "aws_ecs_service" "admin" {
  name            = "admin"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.admin.arn
  desired_count   = var.admin_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    assign_public_ip = true
    security_groups  = [aws_security_group.admin_service.id]
    subnets          = aws_subnet.public[*].id
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.admin.arn
    container_name   = local.admin_container_name
    container_port   = var.admin_container_port
  }

  depends_on = [aws_lb_listener.http]
  tags       = local.common_tags
}

resource "aws_cognito_user_group" "admin" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Diaconia admin dashboard users"
}

resource "aws_cognito_user_group" "facilitator" {
  name         = "facilitator"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Diaconia facilitator mobile users"
}
