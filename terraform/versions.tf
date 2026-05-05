# Pin terraform + provider versions per dep-hygiene policy in CLAUDE.md.
# Bump deliberately: pick a version ≥2 weeks old, run `terraform init -upgrade`,
# commit the regenerated .terraform.lock.hcl alongside the version bump.

terraform {
  required_version = ">= 1.7.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}
