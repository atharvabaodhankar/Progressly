terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

# -----------------------------------------------------------------------------
# Account B: Infrastructure Account (Default Provider)
# Hosts: VPC, ECS Fargate, ALB, RDS Postgres, S3, SQS, Lambda, IAM, CloudWatch
# -----------------------------------------------------------------------------
provider "aws" {
  region     = var.infra_aws_region
  access_key = var.infra_aws_access_key != "" ? var.infra_aws_access_key : null
  secret_key = var.infra_aws_secret_key != "" ? var.infra_aws_secret_key : null

  default_tags {
    tags = {
      Project     = "BridgeIQ"
      Environment = var.environment
      ManagedBy   = "Terraform"
      AccountRole = "infrastructure"
    }
  }
}

# -----------------------------------------------------------------------------
# Account A: Bedrock AI Account (Aliased Provider)
# Dedicated account for Amazon Bedrock foundation models (Nova Micro, Titan V2, Nova Pro)
# -----------------------------------------------------------------------------
provider "aws" {
  alias      = "bedrock"
  region     = var.bedrock_aws_region
  access_key = var.bedrock_aws_access_key != "" ? var.bedrock_aws_access_key : null
  secret_key = var.bedrock_aws_secret_key != "" ? var.bedrock_aws_secret_key : null

  default_tags {
    tags = {
      Project     = "BridgeIQ"
      Environment = var.environment
      ManagedBy   = "Terraform"
      AccountRole = "bedrock-ai"
    }
  }
}
