# -----------------------------------------------------------------------------
# VPC & Network Infrastructure (Account B - infra-account)
# -----------------------------------------------------------------------------
# ARCHITECTURE NOTE:
# ECS Fargate tasks (Backend API and AI Worker) are placed directly in public
# subnets with public IP assignment and hardened security groups, routing
# outbound internet traffic directly via the Internet Gateway.
#
# This is a deliberate cost/simplicity tradeoff for a hackathon-duration demo
# that eliminates the AWS NAT Gateway ($32.40/month + hourly data processing),
# while maintaining strict security group isolation:
# - ecs_backend allows ingress ONLY from the ALB on port 4000 (no direct internet access)
# - ecs_worker has ZERO ingress rules (purely outbound SQS consumer)
# - RDS PostgreSQL remains strictly isolated in private subnets with NO internet route
# -----------------------------------------------------------------------------

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc-${var.environment}"
  }
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw-${var.environment}"
  }
}

# -----------------------------------------------------------------------------
# Public Subnets (For ALB, ECS Backend API, and ECS AI Worker)
# -----------------------------------------------------------------------------
resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet-${count.index + 1}-${var.environment}"
    Type = "Public"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = {
    Name = "${var.project_name}-public-rt-${var.environment}"
  }
}

resource "aws_route_table_association" "public" {
  count          = length(var.public_subnet_cidrs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# -----------------------------------------------------------------------------
# Private Subnets (Isolated - Exclusively for RDS PostgreSQL Database)
# -----------------------------------------------------------------------------
resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.project_name}-private-subnet-${count.index + 1}-${var.environment}"
    Type = "Private-Isolated"
  }
}

# Purely local VPC route table for RDS (no default internet gateway route)
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-private-isolated-rt-${var.environment}"
  }
}

resource "aws_route_table_association" "private" {
  count          = length(var.private_subnet_cidrs)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# -----------------------------------------------------------------------------
# Hardened Security Groups
# -----------------------------------------------------------------------------

# 1. ALB Security Group (Public Web Ingress)
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg-${var.environment}"
  description = "Controls HTTP/HTTPS ingress to BridgeIQ Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Allow HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic to ECS target group"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-alb-sg-${var.environment}"
  }
}

# 2. ECS Backend API Security Group (Inbound from ALB ONLY)
resource "aws_security_group" "ecs_backend" {
  name        = "${var.project_name}-ecs-backend-sg-${var.environment}"
  description = "Allows incoming traffic to Express API from ALB only - no direct internet access"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Allow HTTP port 4000 exclusively from ALB security group"
    from_port       = 4000
    to_port         = 4000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Allow outbound to RDS, S3, Secrets Manager, ECR"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-ecs-backend-sg-${var.environment}"
  }
}

# 3. ECS AI Worker Security Group (ZERO Inbound Rules - Outbound Only)
resource "aws_security_group" "ecs_worker" {
  name        = "${var.project_name}-ecs-worker-sg-${var.environment}"
  description = "Zero-ingress security group for SQS AI Worker tasks"
  vpc_id      = aws_vpc.main.id

  # Note: Explicitly NO ingress blocks defined.
  # The AI Worker is a consumer that polls SQS, calls Bedrock APIs, and writes to RDS.

  egress {
    description = "Allow outbound to SQS, S3, Bedrock APIs, RDS, Secrets Manager"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-ecs-worker-sg-${var.environment}"
  }
}

# 4. RDS PostgreSQL Security Group (Private DB - Inbound from ECS Services ONLY)
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg-${var.environment}"
  description = "Controls access to private RDS PostgreSQL instance from ECS security groups only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from Backend ECS service"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_backend.id]
  }

  ingress {
    description     = "PostgreSQL from AI Worker ECS service"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_worker.id]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds-sg-${var.environment}"
  }
}
