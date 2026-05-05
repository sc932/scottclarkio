# Single AWS provider in us-east-1.
#
# WHY us-east-1: ACM certs used by CloudFront *must* live in us-east-1, period.
# The S3 bucket can technically live anywhere, but co-locating it in us-east-1
# keeps the deploy region-uniform and avoids accidental cross-region traffic
# during invalidation / management.

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "scottclark.io"
      ManagedBy = "Terraform"
      Repo      = "github.com/${var.github_repo}"
    }
  }
}
