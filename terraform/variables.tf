# -----------------------------------------------------------------------------
# General Project Configuration
# -----------------------------------------------------------------------------
variable "project_name" {
  description = "The naming prefix used for all BridgeIQ resources"
  type        = string
  default     = "bridgeiq"
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)"
  type        = string
  default     = "prod"
}

# -----------------------------------------------------------------------------
# Account B: Infrastructure Account Credentials & Region
# -----------------------------------------------------------------------------
variable "infra_aws_region" {
  description = "AWS region for primary infrastructure account (Account B)"
  type        = string
  default     = "ap-south-1"
}

variable "infra_aws_access_key" {
  description = "AWS access key ID for infrastructure account (Account B)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "infra_aws_secret_key" {
  description = "AWS secret access key for infrastructure account (Account B)"
  type        = string
  default     = ""
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Account A: Bedrock AI Account Credentials & Region
# -----------------------------------------------------------------------------
variable "bedrock_aws_region" {
  description = "AWS region where Bedrock foundation models are enabled (Account A)"
  type        = string
  default     = "ap-south-1"
}

variable "bedrock_aws_access_key" {
  description = "IAM Access Key ID from Account A scoped exclusively to bedrock:InvokeModel*"
  type        = string
  default     = ""
  sensitive   = true
}

variable "bedrock_aws_secret_key" {
  description = "IAM Secret Access Key from Account A scoped exclusively to bedrock:InvokeModel*"
  type        = string
  default     = ""
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Network & VPC Configuration
# -----------------------------------------------------------------------------
variable "vpc_cidr" {
  description = "CIDR block for the main BridgeIQ VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (ALB, NAT Gateways)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets (ECS Fargate Tasks, RDS)"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24"]
}

# -----------------------------------------------------------------------------
# Database Configuration (RDS PostgreSQL + pgvector)
# -----------------------------------------------------------------------------
variable "db_name" {
  description = "Name of the PostgreSQL database"
  type        = string
  default     = "bridgeiq_db"
}

variable "db_username" {
  description = "Master username for RDS PostgreSQL"
  type        = string
  default     = "bridgeiq_admin"
}

variable "db_password" {
  description = "Master password for RDS PostgreSQL"
  type        = string
  default     = "ChangeMeSecurely2026!"
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class (Graviton t4g supports pgvector)"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB for RDS instance"
  type        = number
  default     = 20
}

# -----------------------------------------------------------------------------
# ECS & Container Images Configuration
# -----------------------------------------------------------------------------
variable "backend_container_image" {
  description = "Container image URI for BridgeIQ Express Backend API"
  type        = string
  default     = "bridgeiq-backend:latest"
}

variable "ai_worker_container_image" {
  description = "Container image URI for BridgeIQ SQS AI Worker"
  type        = string
  default     = "bridgeiq-ai-worker:latest"
}

variable "backend_cpu" {
  description = "Fargate CPU units for Backend service (256, 512, 1024, etc.)"
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Fargate Memory (MB) for Backend service (512, 1024, 2048, etc.)"
  type        = number
  default     = 1024
}

variable "worker_cpu" {
  description = "Fargate CPU units for AI Worker service"
  type        = number
  default     = 1024
}

variable "worker_memory" {
  description = "Fargate Memory (MB) for AI Worker service"
  type        = number
  default     = 2048
}

# -----------------------------------------------------------------------------
# Cost Guardrail & Billing Configuration (us-east-1)
# -----------------------------------------------------------------------------
variable "billing_alert_threshold_usd" {
  description = "Monthly estimated AWS charges threshold in USD to trigger the billing alarm"
  type        = number
  default     = 25
}

variable "billing_alert_email" {
  description = "Optional email address to receive SNS notifications when billing alarm triggers"
  type        = string
  default     = ""
}
