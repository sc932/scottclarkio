# GitHub Actions OIDC. The deploy workflow at .github/workflows/ uses
# aws-actions/configure-aws-credentials@v4 with role-to-assume = the ARN
# emitted from this file's outputs. No long-lived AWS keys live in GitHub.
#
# Trust scope: only the main branch of github.com/${var.github_repo} can
# assume this role. PRs and forks cannot.
#
# IF YOU GET AN ERROR THAT THE OIDC PROVIDER ALREADY EXISTS in this AWS
# account (e.g., another project already added it), import the existing one
# instead of creating a new one:
#   terraform import aws_iam_openid_connect_provider.github \
#     arn:aws:iam::<ACCT-ID>:oidc-provider/token.actions.githubusercontent.com

data "tls_certificate" "github_oidc" {
  url = "https://token.actions.githubusercontent.com/.well-known/openid-configuration"
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github_oidc.certificates[0].sha1_fingerprint]
}

data "aws_iam_policy_document" "deploy_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "deploy" {
  name               = var.deploy_role_name
  description        = "Assumed by GitHub Actions (${var.github_repo}, main branch) to deploy ${var.domain}"
  assume_role_policy = data.aws_iam_policy_document.deploy_assume.json
}

# Permissions:
#   - Sync to and clean up the S3 bucket
#   - Invalidate the CloudFront distribution after deploy
# Nothing more — no IAM, no ACM, no Route 53, no CloudFront create. Read-only
# at the AWS-account level except for the two specific resources we own.
data "aws_iam_policy_document" "deploy" {
  statement {
    sid    = "S3SyncBucket"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetBucketLocation",
    ]
    resources = [aws_s3_bucket.site.arn]
  }

  statement {
    sid    = "S3SyncObjects"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = ["${aws_s3_bucket.site.arn}/*"]
  }

  statement {
    sid    = "CloudFrontInvalidate"
    effect = "Allow"
    actions = [
      "cloudfront:CreateInvalidation",
      "cloudfront:GetInvalidation",
      "cloudfront:ListInvalidations",
    ]
    resources = [aws_cloudfront_distribution.site.arn]
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "deploy"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}
