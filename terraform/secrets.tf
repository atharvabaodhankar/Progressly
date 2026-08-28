# -----------------------------------------------------------------------------
# AWS Secrets Manager Configuration (Account B - infra-account)
# -----------------------------------------------------------------------------

# =============================================================================
# 1. Cross-Account Bedrock Credentials Secret (Account A Access Keys)
# =============================================================================
resource "aws_secretsmanager_secret" "bedrock_credentials" {
  name                    = "${var.project_name}/bedrock-credentials-${var.environment}"
  description             = "Cross-account IAM credentials scoped to Bedrock foundation models in Account A"
  recovery_window_in_days = 0 # Immediate deletion on destroy for dev/demo

  tags = {
    Name        = "${var.project_name}-bedrock-credentials-${var.environment}"
    AccountRole = "bedrock-ai-cross-account"
  }
}

resource "aws_secretsmanager_secret_version" "bedrock_credentials" {
  secret_id = aws_secretsmanager_secret.bedrock_credentials.id
  secret_string = jsonencode({
    AWS_ACCESS_KEY_ID     = var.bedrock_aws_access_key
    AWS_SECRET_ACCESS_KEY = var.bedrock_aws_secret_key
    AWS_REGION            = var.bedrock_aws_region
    EXTRACTION_MODEL_ID   = "apac.amazon.nova-micro-v1:0"
    EMBEDDING_MODEL_ID    = "amazon.titan-embed-text-v2:0"
    SYNTHESIS_MODEL_ID    = "apac.amazon.nova-pro-v1:0"
  })
}

# =============================================================================
# 2. Database Connection Credentials Secret
# =============================================================================
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${var.project_name}/db-credentials-${var.environment}"
  description             = "PostgreSQL database connection credentials for RDS instance in Account B"
  recovery_window_in_days = 0

  tags = {
    Name = "${var.project_name}-db-credentials-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    DATABASE_URL = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/${var.db_name}?sslmode=no-verify"
    DB_HOST      = aws_db_instance.postgres.address
    DB_PORT      = 5432
    DB_NAME      = var.db_name
    DB_USER      = var.db_username
    DB_PASSWORD  = var.db_password
  })
}
