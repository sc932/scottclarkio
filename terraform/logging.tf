# CloudFront standard access logs → private S3 bucket. Server-side analytics:
# adblock-immune (matters for an ML-researcher audience) and zero client-side
# JS (preserves the site's no-JS posture). Every request logs page, referrer,
# user-agent, and edge location. Query with Athena; a report script lands
# once the first logs deliver (see the vault launch plan → analytics).
#
# Legacy standard logging requires ACLs enabled on the log bucket and the
# awslogsdelivery canonical user granted FULL_CONTROL. That canonical id is
# AWS-documented and stable. BlockPublicAcls stays on — the awslogsdelivery
# grant is a specific canonical user, not a public grant.

data "aws_canonical_user_id" "current" {}

resource "aws_s3_bucket" "logs" {
  bucket = "scottclarkio-site-logs"
}

resource "aws_s3_bucket_ownership_controls" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "logs" {
  depends_on = [aws_s3_bucket_ownership_controls.logs]
  bucket     = aws_s3_bucket.logs.id

  access_control_policy {
    owner {
      id = data.aws_canonical_user_id.current.id
    }

    grant {
      grantee {
        type = "CanonicalUser"
        id   = data.aws_canonical_user_id.current.id
      }
      permission = "FULL_CONTROL"
    }

    # awslogsdelivery — CloudFront's log-delivery account (documented id)
    grant {
      grantee {
        type = "CanonicalUser"
        id   = "c4c1ede66af53448b93c283ce9448c4ba468c9432aa01d700d3878632f77d2d0"
      }
      permission = "FULL_CONTROL"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ~13 months of raw logs (year-over-year comparisons); cost is pennies.
resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "expire-old-logs"
    status = "Enabled"
    filter {}

    expiration {
      days = 400
    }
  }
}
