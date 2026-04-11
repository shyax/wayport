terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform"
    }
  }
}

# ---------------------------------------------------------------
# Cognito User Pool
# ---------------------------------------------------------------

resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-users"

  auto_verified_attributes = ["email"]
  username_attributes      = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = false
    require_numbers   = false
    require_symbols   = false
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    name                = "display_name"
    attribute_data_type = "String"
    required            = false
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 128
    }
  }
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = var.cognito_domain_prefix
  user_pool_id = aws_cognito_user_pool.main.id
}

resource "aws_cognito_user_pool_client" "desktop" {
  name         = "${var.project_name}-desktop"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  allowed_oauth_flows_user_pool_client = true
  supported_identity_providers         = ["COGNITO"]

  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  prevent_user_existence_errors = "ENABLED"
}

# ---------------------------------------------------------------
# DynamoDB
# ---------------------------------------------------------------

resource "aws_dynamodb_table" "sync" {
  name         = "${var.project_name}-sync"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  attribute {
    name = "workspaceId"
    type = "S"
  }

  attribute {
    name = "updatedAt"
    type = "S"
  }

  global_secondary_index {
    name            = "gsi-workspace"
    hash_key        = "workspaceId"
    range_key       = "updatedAt"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }
}

# ---------------------------------------------------------------
# IAM Role for Lambda
# ---------------------------------------------------------------

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${var.project_name}-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "dynamodb_access" {
  statement {
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:Scan",
    ]
    resources = [
      aws_dynamodb_table.sync.arn,
      "${aws_dynamodb_table.sync.arn}/index/*",
    ]
  }
}

resource "aws_iam_role_policy" "dynamodb" {
  name   = "${var.project_name}-dynamodb-access"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.dynamodb_access.json
}

# ---------------------------------------------------------------
# Lambda Functions
# ---------------------------------------------------------------

data "archive_file" "lambda_placeholder" {
  type        = "zip"
  output_path = "${path.module}/.build/placeholder.zip"

  source {
    content  = "exports.handler = async () => ({ statusCode: 501, body: 'Not deployed yet. Build Lambda bundle first.' });"
    filename = "index.js"
  }
}

locals {
  lambda_env = {
    TABLE_NAME   = aws_dynamodb_table.sync.name
    USER_POOL_ID = aws_cognito_user_pool.main.id
  }
}

resource "aws_lambda_function" "sync_push" {
  function_name = "${var.project_name}-sync-push"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  architectures = ["arm64"]
  timeout       = 10
  memory_size   = 256

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  environment {
    variables = local.lambda_env
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

resource "aws_lambda_function" "sync_pull" {
  function_name = "${var.project_name}-sync-pull"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  architectures = ["arm64"]
  timeout       = 10
  memory_size   = 256

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  environment {
    variables = local.lambda_env
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

resource "aws_lambda_function" "sync_delete" {
  function_name = "${var.project_name}-sync-delete"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  architectures = ["arm64"]
  timeout       = 10
  memory_size   = 256

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  environment {
    variables = local.lambda_env
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

# ---------------------------------------------------------------
# API Gateway
# ---------------------------------------------------------------

resource "aws_api_gateway_rest_api" "sync" {
  name        = "${var.project_name}-sync-api"
  description = "Wayport profile sync API"
}

# Cognito authorizer
resource "aws_api_gateway_authorizer" "cognito" {
  name            = "cognito"
  rest_api_id     = aws_api_gateway_rest_api.sync.id
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [aws_cognito_user_pool.main.arn]
  identity_source = "method.request.header.Authorization"
}

# /sync resource
resource "aws_api_gateway_resource" "sync" {
  rest_api_id = aws_api_gateway_rest_api.sync.id
  parent_id   = aws_api_gateway_rest_api.sync.root_resource_id
  path_part   = "sync"
}

# /sync/push
resource "aws_api_gateway_resource" "push" {
  rest_api_id = aws_api_gateway_rest_api.sync.id
  parent_id   = aws_api_gateway_resource.sync.id
  path_part   = "push"
}

resource "aws_api_gateway_method" "push_post" {
  rest_api_id   = aws_api_gateway_rest_api.sync.id
  resource_id   = aws_api_gateway_resource.push.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "push" {
  rest_api_id             = aws_api_gateway_rest_api.sync.id
  resource_id             = aws_api_gateway_resource.push.id
  http_method             = aws_api_gateway_method.push_post.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.sync_push.invoke_arn
}

resource "aws_lambda_permission" "push_apigw" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sync_push.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.sync.execution_arn}/*/*"
}

# /sync/pull
resource "aws_api_gateway_resource" "pull" {
  rest_api_id = aws_api_gateway_rest_api.sync.id
  parent_id   = aws_api_gateway_resource.sync.id
  path_part   = "pull"
}

resource "aws_api_gateway_method" "pull_get" {
  rest_api_id   = aws_api_gateway_rest_api.sync.id
  resource_id   = aws_api_gateway_resource.pull.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "pull" {
  rest_api_id             = aws_api_gateway_rest_api.sync.id
  resource_id             = aws_api_gateway_resource.pull.id
  http_method             = aws_api_gateway_method.pull_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.sync_pull.invoke_arn
}

resource "aws_lambda_permission" "pull_apigw" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sync_pull.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.sync.execution_arn}/*/*"
}

# /sync/delete
resource "aws_api_gateway_resource" "delete" {
  rest_api_id = aws_api_gateway_rest_api.sync.id
  parent_id   = aws_api_gateway_resource.sync.id
  path_part   = "delete"
}

resource "aws_api_gateway_method" "delete_post" {
  rest_api_id   = aws_api_gateway_rest_api.sync.id
  resource_id   = aws_api_gateway_resource.delete.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "delete" {
  rest_api_id             = aws_api_gateway_rest_api.sync.id
  resource_id             = aws_api_gateway_resource.delete.id
  http_method             = aws_api_gateway_method.delete_post.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.sync_delete.invoke_arn
}

resource "aws_lambda_permission" "delete_apigw" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sync_delete.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.sync.execution_arn}/*/*"
}

# CORS — OPTIONS methods
module "cors_push" {
  source        = "./modules/cors"
  rest_api_id   = aws_api_gateway_rest_api.sync.id
  resource_id   = aws_api_gateway_resource.push.id
}

module "cors_pull" {
  source        = "./modules/cors"
  rest_api_id   = aws_api_gateway_rest_api.sync.id
  resource_id   = aws_api_gateway_resource.pull.id
}

module "cors_delete" {
  source        = "./modules/cors"
  rest_api_id   = aws_api_gateway_rest_api.sync.id
  resource_id   = aws_api_gateway_resource.delete.id
}

# Deployment
resource "aws_api_gateway_deployment" "sync" {
  rest_api_id = aws_api_gateway_rest_api.sync.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_method.push_post,
      aws_api_gateway_method.pull_get,
      aws_api_gateway_method.delete_post,
      aws_api_gateway_integration.push,
      aws_api_gateway_integration.pull,
      aws_api_gateway_integration.delete,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "prod" {
  rest_api_id   = aws_api_gateway_rest_api.sync.id
  deployment_id = aws_api_gateway_deployment.sync.id
  stage_name    = "prod"
}
