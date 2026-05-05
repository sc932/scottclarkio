# Origin bucket for the static site. CloudFront reads via OAC; the bucket
# itself is fully private (BlockPublicAccess on, ACLs disabled).

resource "aws_s3_bucket" "site" {
  bucket = var.domain
}

# Disable ACLs entirely — modern best practice. Object-level access control
# happens through bucket policy + OAC, not legacy ACLs.
resource "aws_s3_bucket_ownership_controls" "site" {
  bucket = aws_s3_bucket.site.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# All public access blocked — CloudFront accesses via OAC + signed sigv4
# requests to a private bucket. The bucket policy below is the *only* way
# anything reads from this bucket.
resource "aws_s3_bucket_public_access_block" "site" {
  bucket = aws_s3_bucket.site.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Versioning gives a recovery path for accidental delete/overwrite during
# `aws s3 sync --delete` from the deploy workflow. Combined with the
# 90-day noncurrent-version expiration below, storage cost stays trivial.
resource "aws_s3_bucket_versioning" "site" {
  bucket = aws_s3_bucket.site.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "site" {
  depends_on = [aws_s3_bucket_versioning.site]
  bucket     = aws_s3_bucket.site.id

  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"
    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# Bucket policy: allow CloudFront (and *only* this distribution) to GetObject.
# AWS:SourceArn pin prevents the "confused deputy" pattern of another
# distribution in another AWS account being able to read this bucket.
data "aws_iam_policy_document" "site_bucket" {
  statement {
    sid    = "AllowCloudFrontServicePrincipalReadOnly"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.site_bucket.json
}
