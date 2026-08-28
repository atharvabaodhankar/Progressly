# -----------------------------------------------------------------------------
# Terraform Outputs (Account B - infra-account)
# -----------------------------------------------------------------------------

output "alb_dns_name" {
  description = "Public DNS hostname of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "api_endpoint" {
  description = "Base URL for the Express Backend Core API"
  value       = "http://${aws_lb.main.dns_name}"
}

output "rds_endpoint" {
  description = "Connection endpoint for RDS PostgreSQL database instance"
  value       = aws_db_instance.postgres.endpoint
}

output "rds_address" {
  description = "Hostname for RDS PostgreSQL database"
  value       = aws_db_instance.postgres.address
}

output "s3_reports_bucket" {
  description = "Name of the S3 bucket storing raw field reports and evidence files"
  value       = aws_s3_bucket.reports.id
}

output "sqs_reports_queue_url" {
  description = "URL of the primary SQS queue buffering daily reports"
  value       = aws_sqs_queue.reports_queue.url
}

output "sqs_reports_dlq_url" {
  description = "URL of the Dead Letter Queue capturing failed AI processing jobs"
  value       = aws_sqs_queue.reports_dlq.url
}

output "secrets_manager_bedrock_arn" {
  description = "ARN of Secrets Manager secret containing cross-account Bedrock credentials"
  value       = aws_secretsmanager_secret.bedrock_credentials.arn
}

output "secrets_manager_db_arn" {
  description = "ARN of Secrets Manager secret containing database credentials"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "ecs_cluster_name" {
  description = "Name of the ECS Fargate cluster"
  value       = aws_ecs_cluster.main.name
}

output "billing_alarm_name" {
  description = "Name of the CloudWatch billing alarm in us-east-1"
  value       = aws_cloudwatch_metric_alarm.billing_alarm.alarm_name
}

output "billing_sns_topic_arn" {
  description = "ARN of the SNS topic for billing alerts in us-east-1"
  value       = aws_sns_topic.billing_alerts.arn
}
