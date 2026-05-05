# Terraform — scottclark.io infrastructure

Provisions everything between the existing Route 53 hosted zone (created
manually during DNS migration) and the GitHub Actions deploy workflow:

| Module file | Resources |
|---|---|
| `acm.tf` | ACM certificate (`scottclark.io` + `*.scottclark.io`), DNS validation |
| `s3.tf` | Private S3 bucket with versioning, lifecycle, and CloudFront-OAC-only bucket policy |
| `cloudfront.tf` | OAC, CloudFront Function (www→apex 301 + clean-URL → `/index.html` rewrite + `/about` 301), Response Headers Policy (HSTS, X-Frame-Options, Permissions-Policy, etc.), the distribution itself |
| `route53.tf` | A + AAAA aliases for `scottclark.io` and `www.scottclark.io` → CloudFront |
| `iam.tf` | GitHub Actions OIDC provider + deploy role scoped to `sc932/scottclarkio:refs/heads/main` |

Total wall-clock for a fresh `terraform apply`: 15–30 minutes (CloudFront
distribution deployment is the slow step).

## Prerequisites

- AWS CLI authed to the right account: `aws sts get-caller-identity`
- Terraform installed: `terraform version` (need ≥ 1.7)
- Route 53 hosted zone for `scottclark.io` already exists (you've done this)
- DNS nameservers at iwantmyname pointed at Route 53's NS values
  (propagation should be complete or close to it before applying — ACM
  validation depends on DNS being resolvable)

## Apply

```bash
cd terraform/
terraform init
terraform plan      # review everything before it touches your account
terraform apply
```

If you see `aws_iam_openid_connect_provider.github: error … already exists`
because some other project in the same AWS account added the provider, import
it instead of creating:

```bash
terraform import aws_iam_openid_connect_provider.github \
  arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):oidc-provider/token.actions.githubusercontent.com
terraform apply
```

The `aws_acm_certificate_validation` resource is the apply-time cliff: it
sits and polls ACM for up to 45 minutes waiting for DNS to validate. If your
NS flip is still propagating, this is fine — it'll succeed once propagation
catches up. If it times out, re-run `terraform apply`; it picks up where it
left off.

## After apply: copy outputs to GitHub secrets

```bash
terraform output
```

Three of the outputs are named to match the GitHub secret names exactly:

| Output | GitHub secret | Where it goes |
|---|---|---|
| `github_secret_AWS_ROLE_ARN` | `AWS_ROLE_ARN` | github.com/sc932/scottclarkio/settings/secrets/actions |
| `github_secret_S3_BUCKET` | `S3_BUCKET` | same |
| `github_secret_CLOUDFRONT_DISTRIBUTION_ID` | `CLOUDFRONT_DISTRIBUTION_ID` | same |

You can paste them into the UI, or use `gh`:

```bash
gh secret set AWS_ROLE_ARN -b "$(terraform output -raw github_secret_AWS_ROLE_ARN)"
gh secret set S3_BUCKET    -b "$(terraform output -raw github_secret_S3_BUCKET)"
gh secret set CLOUDFRONT_DISTRIBUTION_ID -b "$(terraform output -raw github_secret_CLOUDFRONT_DISTRIBUTION_ID)"
```

Then push to `main` and the existing `.github/workflows/` workflow takes
over — build → S3 sync → CloudFront invalidate.

## Verify

```bash
# DNS resolves to CloudFront
dig +short scottclark.io
dig +short www.scottclark.io

# HTTPS serves and security headers are set
curl -sI https://scottclark.io | grep -iE '(strict-transport|x-frame|content-type-options|referrer)'

# www redirects to apex
curl -sI https://www.scottclark.io | head -3

# /about redirects to /
curl -sI https://scottclark.io/about | head -3
```

## Destroy

`terraform destroy` works but takes ~30 minutes because CloudFront
distributions have to disable before deletion. The bucket has versioning on,
so destroy fails until you empty all versioned objects:

```bash
aws s3api delete-objects --bucket scottclark.io --delete "$(aws s3api list-object-versions \
  --bucket scottclark.io --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}')"
aws s3api delete-objects --bucket scottclark.io --delete "$(aws s3api list-object-versions \
  --bucket scottclark.io --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}')"
terraform destroy
```

## Cost expectations

- Route 53 hosted zone: $0.50/mo
- CloudFront: free tier (1TB/mo) → effectively $0 for personal-site traffic
- S3: pennies (a few MB stored)
- ACM: free
- IAM/OIDC: free

Total: ~$0.50–$2/month.
