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
