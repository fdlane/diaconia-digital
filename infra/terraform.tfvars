environment = "dev"
aws_region  = "sa-east-1"

allowed_callback_urls = [
  "http://localhost:3000",
  "http://localhost:8081",
  "http://localhost:19006"
]

allowed_logout_urls = [
  "http://localhost:3000",
  "http://localhost:8081",
  "http://localhost:19006"
]

# Set these in TF_VARS_DEV or an uncommitted local tfvars file before deploying with
# desired counts greater than 0.
# clerk_publishable_key = "pk_test_..."
# clerk_secret_key      = "sk_test_..."

# First apply:
#   keep desired counts at 0 so the ALB/ECR/cluster can bootstrap before images exist.
# Second apply after pushing immutable git-SHA image tags:
#   api_image_tag       = "0084120-api-fix1"
#   admin_image_tag     = "abc1234"
#   api_desired_count   = 1
#   admin_desired_count = 1
api_image_tag       = "0abad7e"
admin_image_tag     = "0abad7e"
api_desired_count   = 1
admin_desired_count = 1

database_engine_version = "18.4"
