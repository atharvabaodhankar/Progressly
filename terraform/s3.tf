# -----------------------------------------------------------------------------
# S3 Bucket for Raw Daily Reports and Evidence Files (Account B - infra-account)
# -----------------------------------------------------------------------------

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "reports" {
  bucket        = "${var.project_name}-raw-reports-${var.environment}-${random_id.bucket_suffix.hex}"
  force_destroy = true

  tags = {
    Name        = "${var.project_name}-raw-reports-${var.environment}"
    Description = "Ingestion store for raw site reports spreadsheets PDFs and evidence files"
  }
}

resource "aws_s3_bucket_versioning" "reports" {
  bucket = aws_s3_bucket.reports.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "reports" {
  bucket = aws_s3_bucket.reports.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "reports" {
  bucket = aws_s3_bucket.reports.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "reports" {
  bucket = aws_s3_bucket.reports.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
