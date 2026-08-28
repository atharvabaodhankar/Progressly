# -----------------------------------------------------------------------------
# RDS PostgreSQL Database with pgvector support (Account B - infra-account)
# -----------------------------------------------------------------------------

resource "aws_db_subnet_group" "rds" {
  name        = "${var.project_name}-db-subnet-group-${var.environment}"
  description = "Subnet group for BridgeIQ RDS PostgreSQL instance"
  subnet_ids  = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-db-subnet-group-${var.environment}"
  }
}

resource "aws_db_parameter_group" "pg16" {
  name        = "${var.project_name}-pg16-params-${var.environment}"
  family      = "postgres16"
  description = "Custom parameter group for PostgreSQL 16 with pgvector support"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  tags = {
    Name = "${var.project_name}-pg16-params-${var.environment}"
  }
}

resource "aws_db_instance" "postgres" {
  identifier                 = "${var.project_name}-db-${var.environment}"
  engine                     = "postgres"
  engine_version             = "16.3"
  instance_class             = var.db_instance_class
  allocated_storage          = var.db_allocated_storage
  max_allocated_storage      = 100
  storage_type               = "gp3"
  db_name                    = var.db_name
  username                   = var.db_username
  password                   = var.db_password
  port                       = 5432
  publicly_accessible        = false
  db_subnet_group_name       = aws_db_subnet_group.rds.name
  vpc_security_group_ids     = [aws_security_group.rds.id]
  parameter_group_name       = aws_db_parameter_group.pg16.name
  skip_final_snapshot        = true
  deletion_protection        = false
  auto_minor_version_upgrade = true
  backup_retention_period    = 7

  tags = {
    Name = "${var.project_name}-db-${var.environment}"
  }
}
