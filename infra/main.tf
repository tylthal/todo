terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

resource "aws_s3_bucket" "frontend" {
  bucket = var.bucket_name

  force_destroy = true
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls   = false
  block_public_policy = false
  ignore_public_acls  = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.frontend.json
}

# Bucket storing CloudFront access logs
resource "aws_s3_bucket" "cloudfront_logs" {
  bucket        = "${var.bucket_name}-logs"
  force_destroy = true
}

resource "aws_s3_bucket_ownership_controls" "cloudfront_logs" {
  bucket = aws_s3_bucket.cloudfront_logs.id

  rule {
    object_ownership = "ObjectWriter"
  }
}

resource "aws_s3_bucket_policy" "cloudfront_logs" {
  bucket = aws_s3_bucket.cloudfront_logs.id
  policy = data.aws_iam_policy_document.cloudfront_logs.json
}

data "aws_iam_policy_document" "cloudfront_logs" {
  statement {
    effect    = "Allow"
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.cloudfront_logs.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "frontend" {
  statement {
    effect = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]
    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.oai.iam_arn]
    }
  }
}

resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "frontend OAI"
}

resource "aws_cloudfront_distribution" "frontend" {
  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "frontend-s3"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  enabled             = true
  default_root_object = "index.html"

  aliases = [var.domain_name]

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "frontend-s3"

    viewer_protocol_policy = "redirect-to-https"
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = var.acm_certificate_arn
    ssl_support_method  = "sni-only"
  }
}

resource "aws_route53_record" "frontend" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_api_gateway_domain_name" "api" {
  domain_name = var.api_domain_name
  certificate_arn = local.api_cert_arn
  endpoint_configuration {
    types = ["EDGE"]
  }
}

resource "aws_api_gateway_base_path_mapping" "api" {
  domain_name = aws_api_gateway_domain_name.api.domain_name
  api_id      = aws_api_gateway_rest_api.main.id
  stage_name  = var.api_stage
}

# Route53 record for API custom domain
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.api_domain_name
  type    = "A"

  alias {
    name                   = aws_api_gateway_domain_name.api.cloudfront_domain_name
    zone_id                = aws_api_gateway_domain_name.api.cloudfront_zone_id
    evaluate_target_health = false
  }
}

data "aws_route53_zone" "main" {
  name = var.domain_name_root
}

# Create an ACM certificate for the API domain in us-east-1 when an ARN isn't provided
resource "aws_acm_certificate" "api" {
  count              = var.api_certificate_arn == null ? 1 : 0
  provider           = aws.us_east_1
  domain_name        = var.api_domain_name
  validation_method  = "DNS"
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "api_cert_validation" {
  for_each = var.api_certificate_arn == null ? {
    for dvo in aws_acm_certificate.api[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}
  allow_overwrite = true
  name    = each.value.name
  records = [each.value.record]
  type    = each.value.type
  ttl     = 60
  zone_id = data.aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "api" {
  count               = var.api_certificate_arn == null ? 1 : 0
  provider            = aws.us_east_1
  certificate_arn     = aws_acm_certificate.api[0].arn
  validation_record_fqdns = [for r in aws_route53_record.api_cert_validation : r.fqdn]
}

locals {
  api_cert_arn = var.api_certificate_arn != null ? var.api_certificate_arn : aws_acm_certificate_validation.api[0].certificate_arn
  allowed_origin = var.allowed_origin != null ? var.allowed_origin : "https://${var.domain_name}"
}

# Cognito User Pool for authentication
resource "aws_cognito_user_pool" "main" {
  name                = "sticky-notes-pool"
  auto_verified_attributes = ["email"]
  username_attributes = ["email"]
}

# Client application using OAuth2 code grant
resource "aws_cognito_user_pool_client" "web" {
  name         = "sticky-notes-client"
  user_pool_id = aws_cognito_user_pool.main.id

  explicit_auth_flows = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]

  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  supported_identity_providers      = ["COGNITO", "Google"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows               = ["code"]
  allowed_oauth_scopes              = [
    "email",
    "openid",
    "profile",
    "aws.cognito.signin.user.admin",
  ]
}

# Google identity provider
resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id     = var.google_client_id
    client_secret = var.google_client_secret
    authorize_scopes = "openid email profile"
  }

  attribute_mapping = {
    email       = "email"
    name        = "name"
    given_name  = "given_name"
    family_name = "family_name"
  }
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = var.cognito_domain_prefix
  user_pool_id = aws_cognito_user_pool.main.id
}

#######################
# Backend Infrastructure
#######################

# DynamoDB table storing users, workspaces and notes
resource "aws_dynamodb_table" "main" {
  name         = var.table_name
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "PK"
  range_key = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }
}

# IAM role and permissions for Lambda functions
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_exec" {
  name               = "sticky-notes-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_dynamo" {
  statement {
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:DeleteItem"
    ]
    resources = [
      aws_dynamodb_table.main.arn,
      "${aws_dynamodb_table.main.arn}/*"
    ]
  }
}

resource "aws_iam_role_policy" "lambda_dynamo" {
  name   = "lambda-dynamo"
  role   = aws_iam_role.lambda_exec.id
  policy = data.aws_iam_policy_document.lambda_dynamo.json
}

# Package Lambda code from the compiled backend
data "archive_file" "backend" {
  type        = "zip"
  source_dir  = "${path.module}/../packages/backend/dist"
  output_path = "${path.module}/backend.zip"
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/sticky-notes-backend"
  retention_in_days = 14
}

resource "aws_lambda_function" "backend" {
  function_name = "sticky-notes-backend"
  filename         = data.archive_file.backend.output_path
  source_code_hash = data.archive_file.backend.output_base64sha256
  handler          = "handler.handler"
  runtime          = "nodejs18.x"
  role             = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      TABLE_NAME  = aws_dynamodb_table.main.name
      WS_ENDPOINT = "${aws_apigatewayv2_api.ws.api_endpoint}/${var.api_stage}"
      ALLOWED_ORIGIN = local.allowed_origin
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda]
}

# API Gateway REST API
resource "aws_api_gateway_rest_api" "main" {
  name = "sticky-notes-api"
}

# Resources
resource "aws_api_gateway_resource" "workspaces" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "workspaces"
}

resource "aws_api_gateway_resource" "workspace_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.workspaces.id
  path_part   = "{id}"
}

resource "aws_api_gateway_resource" "notes" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "notes"
}

resource "aws_api_gateway_resource" "note_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.notes.id
  path_part   = "{id}"
}

# Cognito authorizer for API methods
resource "aws_api_gateway_authorizer" "cognito" {
  name            = "cognito"
  rest_api_id     = aws_api_gateway_rest_api.main.id
  identity_source = "method.request.header.Authorization"
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [aws_cognito_user_pool.main.arn]
}

# Methods and integrations
locals {
  lambda_uri = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.backend.arn}/invocations"
}

resource "aws_api_gateway_method" "workspaces_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.workspaces.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "workspaces_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.workspaces.id
  http_method = aws_api_gateway_method.workspaces_post.http_method
  integration_http_method = "POST"
  type        = "AWS"
  uri         = local.lambda_uri
}

resource "aws_api_gateway_method" "workspaces_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.workspaces.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "workspaces_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.workspaces.id
  http_method = aws_api_gateway_method.workspaces_get.http_method
  integration_http_method = "POST"
  type        = "AWS"
  uri         = local.lambda_uri
}

resource "aws_api_gateway_method" "workspaces_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.workspaces.id
  http_method = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "workspaces_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.workspaces.id
  http_method = aws_api_gateway_method.workspaces_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "workspaces_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.workspaces.id
  http_method = aws_api_gateway_method.workspaces_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration_response" "workspaces_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.workspaces.id
  http_method = aws_api_gateway_method.workspaces_options.http_method
  status_code = aws_api_gateway_method_response.workspaces_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.allowed_origin}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PATCH,DELETE,OPTIONS'"
  }
}

resource "aws_api_gateway_method" "workspace_id_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.workspace_id.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "workspace_id_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.workspace_id.id
  http_method = aws_api_gateway_method.workspace_id_get.http_method
  integration_http_method = "POST"
  type        = "AWS"
  uri         = local.lambda_uri
}

resource "aws_api_gateway_method" "workspace_id_patch" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.workspace_id.id
  http_method   = "PATCH"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "workspace_id_patch" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.workspace_id.id
  http_method = aws_api_gateway_method.workspace_id_patch.http_method
  integration_http_method = "POST"
  type        = "AWS"
  uri         = local.lambda_uri
}

resource "aws_api_gateway_method" "workspace_id_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.workspace_id.id
  http_method = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "workspace_id_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.workspace_id.id
  http_method = aws_api_gateway_method.workspace_id_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "workspace_id_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.workspace_id.id
  http_method = aws_api_gateway_method.workspace_id_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration_response" "workspace_id_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.workspace_id.id
  http_method = aws_api_gateway_method.workspace_id_options.http_method
  status_code = aws_api_gateway_method_response.workspace_id_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.allowed_origin}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PATCH,DELETE,OPTIONS'"
  }
}

resource "aws_api_gateway_method" "notes_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.notes.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "notes_post" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.notes.id
  http_method = aws_api_gateway_method.notes_post.http_method
  integration_http_method = "POST"
  type        = "AWS"
  uri         = local.lambda_uri
}

resource "aws_api_gateway_method" "notes_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.notes.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "notes_get" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.notes.id
  http_method = aws_api_gateway_method.notes_get.http_method
  integration_http_method = "POST"
  type        = "AWS"
  uri         = local.lambda_uri
}

resource "aws_api_gateway_method" "notes_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.notes.id
  http_method = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "notes_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.notes.id
  http_method = aws_api_gateway_method.notes_options.http_method
  type        = "MOCK"
  request_templates = { "application/json" = "{\"statusCode\": 200}" }
}

resource "aws_api_gateway_method_response" "notes_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.notes.id
  http_method = aws_api_gateway_method.notes_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration_response" "notes_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.notes.id
  http_method = aws_api_gateway_method.notes_options.http_method
  status_code = aws_api_gateway_method_response.notes_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.allowed_origin}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PATCH,DELETE,OPTIONS'"
  }
}

resource "aws_api_gateway_method" "note_id_patch" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.note_id.id
  http_method   = "PATCH"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "note_id_patch" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.note_id.id
  http_method = aws_api_gateway_method.note_id_patch.http_method
  integration_http_method = "POST"
  type        = "AWS"
  uri         = local.lambda_uri
}

resource "aws_api_gateway_method" "note_id_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.note_id.id
  http_method = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "note_id_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.note_id.id
  http_method = aws_api_gateway_method.note_id_options.http_method
  type        = "MOCK"
  request_templates = { "application/json" = "{\"statusCode\": 200}" }
}

resource "aws_api_gateway_method_response" "note_id_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.note_id.id
  http_method = aws_api_gateway_method.note_id_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_integration_response" "note_id_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.note_id.id
  http_method = aws_api_gateway_method.note_id_options.http_method
  status_code = aws_api_gateway_method_response.note_id_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.allowed_origin}'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PATCH,DELETE,OPTIONS'"
  }
}

resource "aws_lambda_permission" "api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# WebSocket API for realtime updates
resource "aws_apigatewayv2_api" "ws" {
  name                       = "sticky-notes-ws"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}

resource "aws_apigatewayv2_integration" "ws_lambda" {
  api_id           = aws_apigatewayv2_api.ws.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.backend.invoke_arn
  payload_format_version = "1.0"
}

resource "aws_apigatewayv2_route" "ws_connect" {
  api_id    = aws_apigatewayv2_api.ws.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.ws_lambda.id}"
}

resource "aws_apigatewayv2_route" "ws_disconnect" {
  api_id    = aws_apigatewayv2_api.ws.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.ws_lambda.id}"
}

resource "aws_apigatewayv2_route" "ws_subscribe" {
  api_id    = aws_apigatewayv2_api.ws.id
  route_key = "subscribe"
  target    = "integrations/${aws_apigatewayv2_integration.ws_lambda.id}"
}

resource "aws_apigatewayv2_route" "ws_unsubscribe" {
  api_id    = aws_apigatewayv2_api.ws.id
  route_key = "unsubscribe"
  target    = "integrations/${aws_apigatewayv2_integration.ws_lambda.id}"
}

resource "aws_apigatewayv2_stage" "ws" {
  api_id      = aws_apigatewayv2_api.ws.id
  name        = var.api_stage
  auto_deploy = true
}

resource "aws_lambda_permission" "ws" {
  statement_id  = "AllowWSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.ws.execution_arn}/*"
}

resource "aws_api_gateway_deployment" "main" {
  depends_on = [
    aws_api_gateway_integration.workspaces_post,
    aws_api_gateway_integration.workspaces_get,
    aws_api_gateway_integration.workspaces_options,
    aws_api_gateway_integration.workspace_id_get,
    aws_api_gateway_integration.workspace_id_patch,
    aws_api_gateway_integration.workspace_id_options,
    aws_api_gateway_integration.notes_post,
    aws_api_gateway_integration.notes_get,
    aws_api_gateway_integration.notes_options,
    aws_api_gateway_integration.note_id_patch,
    aws_api_gateway_integration.note_id_options
  ]

  triggers = {
    redeploy = sha1(jsonencode([
      aws_api_gateway_integration.workspaces_post.id,
      aws_api_gateway_integration.workspaces_get.id,
      aws_api_gateway_integration.workspaces_options.id,
      aws_api_gateway_integration.workspace_id_get.id,
      aws_api_gateway_integration.workspace_id_patch.id,
      aws_api_gateway_integration.workspace_id_options.id,
      aws_api_gateway_integration.notes_post.id,
      aws_api_gateway_integration.notes_get.id,
      aws_api_gateway_integration.notes_options.id,
      aws_api_gateway_integration.note_id_patch.id,
      aws_api_gateway_integration.note_id_options.id
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  rest_api_id = aws_api_gateway_rest_api.main.id
}

resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/api-gateway/${aws_api_gateway_rest_api.main.name}"
  retention_in_days = 14
}

data "aws_iam_policy_document" "api_gw_logs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["apigateway.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "api_gw_logs" {
  name               = "sticky-notes-apigw-logs"
  assume_role_policy = data.aws_iam_policy_document.api_gw_logs_assume.json
}

resource "aws_iam_role_policy_attachment" "api_gw_logs" {
  role       = aws_iam_role.api_gw_logs.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.api_gw_logs.arn
}

resource "aws_api_gateway_stage" "main" {
  stage_name    = var.api_stage
  rest_api_id   = aws_api_gateway_rest_api.main.id
  deployment_id = aws_api_gateway_deployment.main.id

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      caller         = "$context.identity.caller"
      user           = "$context.identity.user"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }


  depends_on = [aws_api_gateway_account.main]
}

resource "aws_api_gateway_method_settings" "default" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "*/*"

  settings {
    logging_level      = "INFO"
    data_trace_enabled = true
    metrics_enabled    = true
  }
}

resource "aws_api_gateway_gateway_response" "default_4xx" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "DEFAULT_4XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'${local.allowed_origin}'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PATCH,DELETE,OPTIONS'"
  }
}

resource "aws_api_gateway_gateway_response" "default_5xx" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "DEFAULT_5XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'${local.allowed_origin}'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PATCH,DELETE,OPTIONS'"
  }
}

resource "aws_api_gateway_gateway_response" "unauthorized" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "UNAUTHORIZED"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'${local.allowed_origin}'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PATCH,DELETE,OPTIONS'"
  }
}

resource "aws_api_gateway_gateway_response" "access_denied" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "ACCESS_DENIED"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'${local.allowed_origin}'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PATCH,DELETE,OPTIONS'"
  }
}


output "bucket_name" {
  value = aws_s3_bucket.frontend.bucket
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.frontend.domain_name
}

output "user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "cognito_hosted_ui_domain" {
  value = aws_cognito_user_pool_domain.main.domain
}

output "api_invoke_url" {
  value = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${var.aws_region}.amazonaws.com/${var.api_stage}"
}

output "api_domain_name" {
  value = aws_api_gateway_domain_name.api.domain_name
}

output "ws_endpoint" {
  value = "${aws_apigatewayv2_api.ws.api_endpoint}/${var.api_stage}"
}

output "lambda_function_name" {
  value = aws_lambda_function.backend.function_name
}
