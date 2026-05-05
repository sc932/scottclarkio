# Outputs to copy into GitHub Actions repo secrets at
# https://github.com/${var.github_repo}/settings/secrets/actions
#
# After `terraform apply`, run:
#   terraform output -raw github_secret_AWS_ROLE_ARN
#   terraform output -raw github_secret_S3_BUCKET
#   terraform output -raw github_secret_CLOUDFRONT_DISTRIBUTION_ID
#
# Or simply `terraform output` for the full block.

output "github_secret_AWS_ROLE_ARN" {
  description = "Set as GitHub Actions secret AWS_ROLE_ARN"
  value       = aws_iam_role.deploy.arn
}

output "github_secret_S3_BUCKET" {
  description = "Set as GitHub Actions secret S3_BUCKET"
  value       = aws_s3_bucket.site.id
}

output "github_secret_CLOUDFRONT_DISTRIBUTION_ID" {
  description = "Set as GitHub Actions secret CLOUDFRONT_DISTRIBUTION_ID"
  value       = aws_cloudfront_distribution.site.id
}

output "cloudfront_domain_name" {
  description = "CloudFront-assigned hostname (for debugging — not what users hit)"
  value       = aws_cloudfront_distribution.site.domain_name
}

output "acm_certificate_arn" {
  description = "ARN of the ACM cert (for reference)"
  value       = aws_acm_certificate.site.arn
}

output "route53_name_servers" {
  description = "Route 53 nameservers (the four you set at iwantmyname's registrar)"
  value       = data.aws_route53_zone.main.name_servers
}
