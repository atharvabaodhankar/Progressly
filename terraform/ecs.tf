# -----------------------------------------------------------------------------
# ECS Fargate Cluster, Task Definitions & Services (Account B - infra-account)
# -----------------------------------------------------------------------------

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.project_name}-cluster-${var.environment}"
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "FARGATE"
  }
}

# =============================================================================
# 1. Express Backend Core API Service
# =============================================================================
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project_name}-backend-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = tostring(var.backend_cpu)
  memory                   = tostring(var.backend_memory)
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_backend_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "backend-api"
      image     = var.backend_container_image
      essential = true

      portMappings = [
        {
          containerPort = 4000
          hostPort      = 4000
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = "4000" },
        { name = "S3_BUCKET_NAME", value = aws_s3_bucket.reports.id },
        { name = "AWS_REGION", value = var.infra_aws_region },
        { name = "BEDROCK_EMBEDDING_MODEL_ID", value = "amazon.titan-embed-text-v2:0" },
        { name = "BEDROCK_SYNTHESIS_MODEL_ID", value = "apac.amazon.nova-pro-v1:0" }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = "${aws_secretsmanager_secret.db_credentials.arn}:DATABASE_URL::"
        },
        {
          name      = "BEDROCK_AWS_ACCESS_KEY_ID"
          valueFrom = "${aws_secretsmanager_secret.bedrock_credentials.arn}:AWS_ACCESS_KEY_ID::"
        },
        {
          name      = "BEDROCK_AWS_SECRET_ACCESS_KEY"
          valueFrom = "${aws_secretsmanager_secret.bedrock_credentials.arn}:AWS_SECRET_ACCESS_KEY::"
        },
        {
          name      = "BEDROCK_AWS_REGION"
          valueFrom = "${aws_secretsmanager_secret.bedrock_credentials.arn}:AWS_REGION::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_backend.name
          "awslogs-region"        = var.infra_aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-backend-task-${var.environment}"
  }
}

resource "aws_ecs_service" "backend" {
  name            = "${var.project_name}-backend-service-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_backend.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend-api"
    container_port   = 4000
  }

  depends_on = [
    aws_lb_listener.http,
    aws_db_instance.postgres
  ]

  tags = {
    Name = "${var.project_name}-backend-service-${var.environment}"
  }
}

# =============================================================================
# 2. SQS AI Worker Service (Extraction, Matching, Bedrock Nova & Titan)
# =============================================================================
resource "aws_ecs_task_definition" "ai_worker" {
  family                   = "${var.project_name}-ai-worker-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = tostring(var.worker_cpu)
  memory                   = tostring(var.worker_memory)
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_worker_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "ai-worker"
      image     = var.ai_worker_container_image
      essential = true

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "SQS_QUEUE_URL", value = aws_sqs_queue.reports_queue.url },
        { name = "S3_BUCKET_NAME", value = aws_s3_bucket.reports.id },
        { name = "EXTRACTION_PROVIDER", value = "bedrock" },
        { name = "EMBEDDING_PROVIDER", value = "bedrock" },
        { name = "SYNTHESIS_PROVIDER", value = "bedrock" },
        { name = "BEDROCK_EXTRACTION_MODEL_ID", value = "apac.amazon.nova-micro-v1:0" },
        { name = "BEDROCK_EMBEDDING_MODEL_ID", value = "amazon.titan-embed-text-v2:0" },
        { name = "BEDROCK_SYNTHESIS_MODEL_ID", value = "apac.amazon.nova-pro-v1:0" }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = "${aws_secretsmanager_secret.db_credentials.arn}:DATABASE_URL::"
        },
        {
          name      = "BEDROCK_AWS_ACCESS_KEY_ID"
          valueFrom = "${aws_secretsmanager_secret.bedrock_credentials.arn}:AWS_ACCESS_KEY_ID::"
        },
        {
          name      = "BEDROCK_AWS_SECRET_ACCESS_KEY"
          valueFrom = "${aws_secretsmanager_secret.bedrock_credentials.arn}:AWS_SECRET_ACCESS_KEY::"
        },
        {
          name      = "BEDROCK_AWS_REGION"
          valueFrom = "${aws_secretsmanager_secret.bedrock_credentials.arn}:AWS_REGION::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_worker.name
          "awslogs-region"        = var.infra_aws_region
          "awslogs-stream-prefix" = "ai-worker"
        }
      }
    }
  ])

  tags = {
    Name = "${var.project_name}-ai-worker-task-${var.environment}"
  }
}

resource "aws_ecs_service" "ai_worker" {
  name            = "${var.project_name}-ai-worker-service-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.ai_worker.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_worker.id]
    assign_public_ip = true
  }

  depends_on = [
    aws_db_instance.postgres,
    aws_sqs_queue.reports_queue
  ]

  tags = {
    Name = "${var.project_name}-ai-worker-service-${var.environment}"
  }
}
