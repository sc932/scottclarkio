# Hosted zone is created out-of-band (Scott created it via the Route 53 console
# during DNS migration). Terraform consumes it as a data source so we don't
# accidentally re-create it and break the existing MX/TXT/CNAME records that
# were migrated from iwantmyname.

data "aws_route53_zone" "main" {
  name         = var.domain
  private_zone = false
}

# Apex A → CloudFront (alias, no TTL — Route 53 manages it).
# Replaces the iwantmyname parking record (62.116.130.8).
resource "aws_route53_record" "apex_a" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

# Apex AAAA → CloudFront. CloudFront serves IPv6 when is_ipv6_enabled = true.
resource "aws_route53_record" "apex_aaaa" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

# www.* → CloudFront. The CF Function 301-redirects www to apex at edge.
resource "aws_route53_record" "www_a" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.${var.domain}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_aaaa" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.${var.domain}"
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}
