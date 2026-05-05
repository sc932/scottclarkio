variable "domain" {
  description = "Apex domain. Used for the ACM cert (apex + wildcard SAN), the S3 bucket name, the CloudFront aliases, and the Route 53 zone lookup."
  type        = string
  default     = "scottclark.io"
}

variable "github_repo" {
  description = "GitHub repository in OWNER/REPO form. Used to scope the OIDC trust policy to this repo's main branch only."
  type        = string
  default     = "sc932/scottclarkio"
}

variable "aws_region" {
  description = "AWS region. Must be us-east-1 because the ACM cert used by CloudFront has to live there."
  type        = string
  default     = "us-east-1"

  validation {
    condition     = var.aws_region == "us-east-1"
    error_message = "ACM certs for CloudFront must be in us-east-1; do not change this."
  }
}

variable "deploy_role_name" {
  description = "Name of the IAM role assumed by GitHub Actions via OIDC. The role ARN goes into the AWS_ROLE_ARN GitHub secret."
  type        = string
  default     = "scottclarkio-deploy"
}
