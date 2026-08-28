# -----------------------------------------------------------------------------
# CloudWatch Logs & Monitoring Alarms (Account B - infra-account)
# -----------------------------------------------------------------------------

# =============================================================================
# 1. CloudWatch Log Groups
# =============================================================================
resource "aws_cloudwatch_log_group" "ecs_backend" {
  name              = "/ecs/${var.project_name}-backend-${var.environment}"
  retention_in_days = 30

  tags = {
    Name = "${var.project_name}-ecs-backend-logs-${var.environment}"
  }
}

resource "aws_cloudwatch_log_group" "ecs_worker" {
  name              = "/ecs/${var.project_name}-ai-worker-${var.environment}"
  retention_in_days = 30

  tags = {
    Name = "${var.project_name}-ecs-worker-logs-${var.environment}"
  }
}

resource "aws_cloudwatch_log_group" "lambda_s3" {
  name              = "/aws/lambda/${var.project_name}-s3-to-sqs-${var.environment}"
  retention_in_days = 14

  tags = {
    Name = "${var.project_name}-lambda-s3-logs-${var.environment}"
  }
}

# =============================================================================
# 2. CloudWatch Metric Alarms
# =============================================================================

# Alarm: Dead Letter Queue has messages (poison messages / unhandled processing errors)
resource "aws_cloudwatch_metric_alarm" "sqs_dlq_alarm" {
  alarm_name          = "${var.project_name}-sqs-dlq-messages-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Triggers when any report processing message lands in the Dead Letter Queue"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.reports_dlq.name
  }

  tags = {
    Name = "${var.project_name}-sqs-dlq-alarm-${var.environment}"
  }
}

# Alarm: Backend API 5XX Error Spike
resource "aws_cloudwatch_metric_alarm" "alb_5xx_alarm" {
  alarm_name          = "${var.project_name}-alb-5xx-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Triggers when backend Express container returns more than 5 5XX errors in 1 minute"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.backend.arn_suffix
  }

  tags = {
    Name = "${var.project_name}-alb-5xx-alarm-${var.environment}"
  }
}
