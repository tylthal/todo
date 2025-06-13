variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
}

variable "bucket_name" {
  description = "Name of the S3 bucket for hosting the frontend"
  type        = string
}

variable "domain_name" {
  description = "Fully qualified domain name for the app"
  type        = string
  default     = "notes.thalman.org"
}

variable "domain_name_root" {
  description = "Route53 hosted zone domain"
  type        = string
  default     = "thalman.org"
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for CloudFront"
  type        = string
}

variable "api_domain_name" {
  description = "Fully qualified domain name for the API"
  type        = string
  default     = "api.notes.thalman.org"
}

variable "api_certificate_arn" {
  description = "ACM certificate ARN for the API domain"
  type        = string
}

variable "google_client_id" {
  description = "Google OAuth client ID"
  type        = string
}

variable "google_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  sensitive   = true
}

variable "callback_urls" {
  description = "Allowed OAuth2 callback URLs"
  type        = list(string)
}

variable "logout_urls" {
  description = "Allowed logout redirect URLs"
  type        = list(string)
}

variable "cognito_domain_prefix" {
  description = "Unique prefix for Cognito hosted UI domain"
  type        = string
}

variable "table_name" {
  description = "DynamoDB table name for backend data"
  type        = string
}

variable "api_stage" {
  description = "Deployment stage name for API Gateway"
  type        = string
  default     = "prod"
}
