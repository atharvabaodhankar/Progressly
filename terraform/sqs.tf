# -----------------------------------------------------------------------------
# SQS Queues for Decoupled Asynchronous Processing (Account B - infra-account)
# -----------------------------------------------------------------------------

# 1. Dead Letter Queue (DLQ)
resource "aws_sqs_queue" "reports_dlq" {
  name                      = "${var.project_name}-reports-dlq-${var.environment}"
  message_retention_seconds = 1209600 # 14 days
  sqs_managed_sse_enabled   = true

  tags = {
    Name        = "${var.project_name}-reports-dlq-${var.environment}"
    Description = "Captures poison messages and failed AI processing jobs after 3 retries"
  }
}

# 2. Primary Ingestion Queue
resource "aws_sqs_queue" "reports_queue" {
  name                       = "${var.project_name}-reports-queue-${var.environment}"
  visibility_timeout_seconds = 300   # 5 minutes for Bedrock extraction & matching
  message_retention_seconds  = 86400 # 1 day
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.reports_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name        = "${var.project_name}-reports-queue-${var.environment}"
    Description = "Buffers uploaded daily field reports for asynchronous AI worker processing"
  }
}

# 3. Allow Lambda / S3 to send messages to the SQS Queue
resource "aws_sqs_queue_policy" "reports_queue_policy" {
  queue_url = aws_sqs_queue.reports_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowLambdaAndS3SendMessages"
        Effect    = "Allow"
        Principal = "*"
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.reports_queue.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = [
              aws_s3_bucket.reports.arn,
              aws_iam_role.lambda_exec.arn
            ]
          }
        }
      },
      {
        Sid       = "AllowCrossAccountWorker"
        Effect    = "Allow"
        Principal = {
          AWS = "arn:aws:iam::469876202785:root"
        }
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]
        Resource = aws_sqs_queue.reports_queue.arn
      }
    ]
  })
}
