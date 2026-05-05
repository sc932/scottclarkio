# Remote state in a private S3 bucket.
#
# The bucket is created out-of-band (via `aws s3api create-bucket` from the
# repo root, see CLAUDE.md → Phase 1D bullet) rather than via this Terraform
# module — otherwise we'd hit the chicken-and-egg of "where do I store the
# state for the bucket that stores my state."
#
# Bucket properties set at creation (not Terraform-managed):
#   - Versioning ON           (recovery if a bad apply corrupts state)
#   - SSE-S3 encryption (AES256)  (state can include ARNs, account IDs, etc.)
#   - All public access blocked
#   - Tagged Project=scottclark.io, ManagedBy=manual-bootstrap
#
# Native S3 state locking via `use_lockfile` (terraform >= 1.10) — no
# DynamoDB table needed.

terraform {
  backend "s3" {
    bucket       = "scottclarkio-terraform-state"
    key          = "scottclarkio/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
