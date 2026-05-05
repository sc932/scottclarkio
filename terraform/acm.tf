# ACM cert for the apex + wildcard. DNS validation, fully automated:
# Terraform creates the cert (PENDING_VALIDATION) → reads the validation CNAMEs
# from its domain_validation_options → writes them into Route 53 → waits for
# validation to flip to ISSUED. The whole loop happens during one apply.
#
# NOTE: this hangs until DNS propagation + ACM validation completes. Expect
# 5–30 minutes the first time, depending on how recently the NS at iwantmyname
# was switched. ACM retries for 72h, so re-running apply is cheap if it stalls.

resource "aws_acm_certificate" "site" {
  domain_name       = var.domain
  subject_alternative_names = ["*.${var.domain}"]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# One Route 53 record per validation domain (apex + wildcard share most fields,
# so the for_each de-dupes by domain_name automatically).
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.site.domain_validation_options :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "site" {
  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]

  timeouts {
    create = "45m"
  }
}
