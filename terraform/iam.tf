# -----------------------------------------------------------------------------
# Scoped IAM Roles and Policies (Account B - infra-account)
# -----------------------------------------------------------------------------

# =============================================================================
# 1. ECS Task Execution Role (Allows ECS Agent to pull images & fetch secrets)
# =============================================================================
resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.project_name}-ecs-execution-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-ecs-execution-role-${var.environment}"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution_standard" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_policy" "ecs_execution_secrets" {
  name        = "${var.project_name}-ecs-execution-secrets-${var.environment}"
  description = "Allows ECS agent to retrieve database and Bedrock secrets from Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.bedrock_credentials.arn,
          aws_secretsmanager_secret.db_credentials.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_secrets_attach" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = aws_iam_policy.ecs_execution_secrets.arn
}

# =============================================================================
# 2. ECS Backend Task Role (Runtime permissions for Express API)
# =============================================================================
resource "aws_iam_role" "ecs_backend_task_role" {
  name = "${var.project_name}-ecs-backend-task-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-ecs-backend-task-role-${var.environment}"
  }
}

resource "aws_iam_policy" "ecs_backend_permissions" {
  name        = "${var.project_name}-ecs-backend-permissions-${var.environment}"
  description = "Scoped permissions for Express API to access S3 reports and read secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3ReportsAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.reports.arn,
          "${aws_s3_bucket.reports.arn}/*"
        ]
      },
      {
        Sid    = "SecretsManagerAccess"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.db_credentials.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_backend_attach" {
  role       = aws_iam_role.ecs_backend_task_role.name
  policy_arn = aws_iam_policy.ecs_backend_permissions.arn
}

# =============================================================================
# 3. ECS AI Worker Task Role (Runtime permissions for SQS AI Consumer)
# =============================================================================
resource "aws_iam_role" "ecs_worker_task_role" {
  name = "${var.project_name}-ecs-worker-task-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-ecs-worker-task-role-${var.environment}"
  }
}

resource "aws_iam_policy" "ecs_worker_permissions" {
  name        = "${var.project_name}-ecs-worker-permissions-${var.environment}"
  description = "Permissions for AI Worker to consume SQS, read S3, and read Bedrock secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SQSConsumerAccess"
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = aws_sqs_queue.reports_queue.arn
      },
      {
        Sid    = "S3ReportsAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.reports.arn,
          "${aws_s3_bucket.reports.arn}/*"
        ]
      },
      {
        Sid    = "SecretsManagerBedrockAccess"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.bedrock_credentials.arn,
          aws_secretsmanager_secret.db_credentials.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_worker_attach" {
  role       = aws_iam_role.ecs_worker_task_role.name
  policy_arn = aws_iam_policy.ecs_worker_permissions.arn
}

# =============================================================================
# 4. Lambda Execution Role (S3 Upload Event -> SQS Enqueue)
# =============================================================================
resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-lambda-exec-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-lambda-exec-role-${var.environment}"
  }
}

resource "aws_iam_policy" "lambda_policy" {
  name        = "${var.project_name}-lambda-policy-${var.environment}"
  description = "Allows Lambda to write CloudWatch logs, read S3 event objects, and enqueue to SQS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Sid    = "S3ReadMetadata"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion"
        ]
        Resource = "${aws_s3_bucket.reports.arn}/*"
      },
      {
        Sid    = "SQSSendMessage"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.reports_queue.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_policy_attach" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}
