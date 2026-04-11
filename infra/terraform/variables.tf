variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "wayport"
}

variable "cognito_domain_prefix" {
  description = "Cognito hosted UI domain prefix (must be globally unique)"
  type        = string
  default     = "wayport-auth"
}

variable "callback_urls" {
  description = "OAuth callback URLs for the desktop app"
  type        = list(string)
  default     = ["wayport://auth/callback"]
}

variable "logout_urls" {
  description = "OAuth logout URLs for the desktop app"
  type        = list(string)
  default     = ["wayport://auth/logout"]
}
