# CloudFront distribution. Three pieces collaborate here:
#   1. OAC (Origin Access Control)        — modern, replaces deprecated OAI
#   2. CloudFront Function (viewer-request) — www→apex 301 + clean-URL rewrite
#   3. Response Headers Policy             — HSTS, X-Frame-Options, etc.

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${replace(var.domain, ".", "-")}-oac"
  description                       = "OAC for ${var.domain} S3 origin"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Edge-runtime function. Three responsibilities:
#   - 301-redirect www.${domain} to ${domain} (canonical apex)
#   - 301-redirect /about → / (replaces Astro's meta-refresh redirect)
#   - Internally rewrite clean URLs (/cv) to /cv/index.html for origin fetch
locals {
  edge_rewrite_function = <<-EOT
    function handler(event) {
      var request = event.request;
      var host = request.headers.host.value;
      var uri = request.uri;

      // Site-wide trailing-slash collapse (phase-4 bundle, 2026-07-23):
      // canonical form is slashless; root stays '/'. The legacy /about
      // redirect folds into the same single-301 path (query preserved).
      var target = uri;
      if (target.length > 1) {
        target = target.replace(/\/+$/, '');
        if (target === '') target = '/';
      }
      if (target === '/about') {
        target = '/';
      }

      if (host !== '${var.domain}' || target !== uri) {
        // Preserve the query string on every 301 (estate rule; the drop
        // was this function's round-2 G1 gap).
        var qs = '';
        for (var k in request.querystring) {
          var entry = request.querystring[k];
          if (entry.multiValue) {
            for (var i = 0; i < entry.multiValue.length; i++) {
              qs += (qs ? '&' : '?') + encodeURIComponent(k) + '=' + encodeURIComponent(entry.multiValue[i].value);
            }
          } else {
            qs += (qs ? '&' : '?') + encodeURIComponent(k) + (entry.value ? '=' + encodeURIComponent(entry.value) : '');
          }
        }
        return {
          statusCode: 301,
          statusDescription: 'Moved Permanently',
          headers: {
            location: { value: 'https://${var.domain}' + target + qs }
          }
        };
      }

      if (uri === '/') {
        request.uri = '/index.html';
      } else if (!uri.includes('.')) {
        request.uri = uri + '/index.html';
      }

      return request;
    }
  EOT
}

resource "aws_cloudfront_function" "rewrite" {
  name    = "${replace(var.domain, ".", "-")}-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "www→apex 301, /about→/ 301, clean-URL → /index.html rewrite"
  publish = true
  code    = local.edge_rewrite_function
}

# Response Headers Policy. Conservative defaults — HSTS 1y w/o preload (preload
# is functionally permanent once you submit to hstspreload.org, so we leave
# that opt-in for later). X-Frame-Options DENY because we never want to be
# iframed. Permissions-Policy opts out of FLoC/Topics tracking.
resource "aws_cloudfront_response_headers_policy" "security" {
  name = "${replace(var.domain, ".", "-")}-security-headers"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = false
      override                   = true
    }
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }

  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = "interest-cohort=(), browsing-topics=()"
      override = true
    }
  }
}

resource "aws_cloudfront_distribution" "site" {
  # Logging delivery needs the awslogsdelivery ACL grant to exist BEFORE
  # CloudFront enables logging on a clean apply (r4 sol S4 — the ACL sits
  # on a parallel graph branch otherwise).
  depends_on = [aws_s3_bucket_acl.logs]

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.domain, "www.${var.domain}"]
  comment             = "scottclark.io static site"
  http_version        = "http2and3"

  # PriceClass_100 = North America + Europe edges only. Cheapest tier; perfectly
  # fine for a personal site whose primary audience is in those regions.
  price_class = "PriceClass_100"

  # Server-side analytics (estate pattern, ported from talaria-site
  # 2026-07-23): CloudFront standard logs -> private S3 (logging.tf) ->
  # Athena (scripts/athena-setup.sh + analytics-report.sh). Zero client JS.
  logging_config {
    bucket          = aws_s3_bucket.logs.bucket_domain_name
    include_cookies = false
    prefix          = "cf/"
  }

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-${var.domain}"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-${var.domain}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # AWS-managed CachingOptimized policy. Honors origin Cache-Control headers
    # set by scripts/deploy.sh (HTML/XML/JSON: 1h must-revalidate; assets: 1y immutable).
    cache_policy_id            = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite.arn
    }
  }

  # S3 returns 403 on missing keys (because the OAC doesn't grant ListBucket);
  # remap to /404.html with a real 404 status so it looks right in browsers
  # and to crawlers.
  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    minimum_protocol_version = "TLSv1.2_2021"
    ssl_support_method       = "sni-only"
  }
}
