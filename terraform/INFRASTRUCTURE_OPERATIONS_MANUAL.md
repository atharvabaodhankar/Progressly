# Progressly — Infrastructure Operations & Cost Safety Manual

This manual provides a battle-tested, step-by-step guide to managing AWS infrastructure costs, executing zero-cost teardowns, and launching the complete production stack into a fresh AWS account (e.g. new $200 credit/free-tier accounts) in under 5 minutes.

---

## 1. Clean Teardown (`terraform destroy`) & Zero-Cost Guarantee

When you run `terraform destroy`, **100% of paid AWS resources are terminated and deleted**, immediately dropping the hourly burn rate to **$0.00/hour**.

### Why no background costs remain:
* **S3 Raw Reports Bucket:** (`force_destroy = true`) Automatically empties all uploaded reports, PDFs, and versions before deleting the bucket itself (no `BucketNotEmpty` errors).
* **RDS PostgreSQL Database:** (`skip_final_snapshot = true` and `deletion_protection = false`) Terminates instantly without creating expensive persistent snapshot backups.
* **AWS Secrets Manager:** (`recovery_window_in_days = 0`) Immediately purges secrets instead of retaining them in AWS's 30-day paid pending-recovery state.
* **ECS Fargate Tasks & ALB:** Tasks stop execution immediately; Application Load Balancer and Target Groups are deleted.
* **VPC, Subnets, Route Tables, SQS, Lambda, CloudWatch:** Fully deleted.

> [!NOTE]
> The only items remaining in AWS after `terraform destroy` are:
> 1. The IAM user you manually created (`progressly-terraform`) — **$0.00 cost** (IAM is free).
> 2. The `AWSServiceRoleForECS` service-linked role — **$0.00 cost** (IAM roles are free).

### Command to Destroy:
```powershell
cd terraform
terraform destroy -auto-approve
```

---

## 2. Migrating / Launching on a Fresh AWS Account ($200 Credits)

All architectural fixes (PostgreSQL 16.9, SSL enforcement, auto-schema migrations, SQS long-polling worker) are **already baked into the application codebase**.

Follow these 4 sequential steps to launch into a new AWS account:

```mermaid
flowchart TD
    A["1. Create IAM User in New AWS Account<br/>(Attach permissions JSON & get Access Keys)"] --> B["2. Create ECR Repositories & Docker Login"]
    B --> C["3. Build & Push Container Images to ECR"]
    C --> D["4. Update terraform.tfvars & Run terraform apply"]
    D --> E["5. Complete! App is live & auto-migrated"]
```

---

### Step 1: In the New AWS Account (Console)

1. **Create the Terraform IAM User:**
   * Open AWS Console $\rightarrow$ **IAM** $\rightarrow$ **Users** $\rightarrow$ **Create User** (e.g. `progressly-terraform`).
   * Choose **Attach policies directly** $\rightarrow$ **Create Policy** $\rightarrow$ Click **JSON** tab $\rightarrow$ Paste the complete policy below:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "InfraProvisioning",
            "Effect": "Allow",
            "Action": [
                "ec2:*",
                "ecs:*",
                "ecr:*",
                "elasticloadbalancing:*",
                "rds:*",
                "s3:*",
                "sqs:*",
                "lambda:*",
                "iam:CreateRole",
                "iam:DeleteRole",
                "iam:AttachRolePolicy",
                "iam:DetachRolePolicy",
                "iam:PutRolePolicy",
                "iam:DeleteRolePolicy",
                "iam:PassRole",
                "iam:GetRole",
                "iam:ListRolePolicies",
                "iam:ListAttachedRolePolicies",
                "iam:CreateInstanceProfile",
                "iam:DeleteInstanceProfile",
                "iam:AddRoleToInstanceProfile",
                "iam:RemoveRoleFromInstanceProfile",
                "iam:TagRole",
                "logs:*",
                "secretsmanager:*",
                "cloudwatch:*",
                "application-autoscaling:*",
                "iam:CreateServiceLinkedRole",
                "iam:CreatePolicy",
                "iam:DeletePolicy",
                "iam:GetPolicy",
                "iam:ListPolicyVersions",
                "sns:*",
                "iam:TagPolicy",
                "iam:UntagPolicy",
                "iam:GetPolicyVersion"
            ],
            "Resource": "*"
        }
    ]
}
```
   * Name policy `ProgresslyInfraPolicy`, create it, and attach it to the user.
   * Go to **Security Credentials** $\rightarrow$ **Create Access Key** $\rightarrow$ Select **Command Line Interface (CLI)**.
   * Copy the **Access Key ID** (`AKIA...`) and **Secret Access Key**.

2. **Create the ECS Service-Linked Role (One-Time Command):**
   Open PowerShell and run:
   ```powershell
   $env:AWS_ACCESS_KEY_ID="NEW_ACCOUNT_ACCESS_KEY"
   $env:AWS_SECRET_ACCESS_KEY="NEW_ACCOUNT_SECRET_KEY"
   $env:AWS_DEFAULT_REGION="ap-south-1"

   aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com
   ```
   *(If it returns `Role already exists`, you can safely proceed).*

3. **Enable Amazon Bedrock Foundation Models (in Bedrock Account):**
   * Open **Amazon Bedrock Console** in `ap-south-1` (Mumbai) or `us-east-1`.
   * Go to **Model Access** $\rightarrow$ Click **Enable all models** / Request access for:
     * **Amazon Nova Micro** (`apac.amazon.nova-micro-v1:0` or `amazon.nova-micro-v1:0`)
     * **Amazon Titan Embeddings V2** (`amazon.titan-embed-text-v2:0`)
     * **Amazon Nova Pro** (`apac.amazon.nova-pro-v1:0` or `amazon.nova-pro-v1:0`)

---

### Step 2: Create ECR Repos & Authenticate Docker

Replace `<NEW_ACCOUNT_ID>` with your new 12-digit AWS Account ID:

```powershell
$env:AWS_ACCESS_KEY_ID="NEW_ACCOUNT_ACCESS_KEY"
$env:AWS_SECRET_ACCESS_KEY="NEW_ACCOUNT_SECRET_KEY"
$env:AWS_DEFAULT_REGION="ap-south-1"

# 1. Create ECR Repositories
aws ecr create-repository --repository-name progressly-backend --region ap-south-1
aws ecr create-repository --repository-name progressly-ai-worker --region ap-south-1

# 2. Login Docker to the new ECR Registry (Storing in $pass avoids PowerShell CRLF 400 errors)
$pass = aws ecr get-login-password --region ap-south-1
docker login --username AWS --password $pass <NEW_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com
```

---

### Step 3: Build & Push Container Images to ECR

Run from the root project directory:

```powershell
# Build Backend Image
docker build -t <NEW_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/progressly-backend:latest -f backend/Dockerfile backend

# Build AI Worker Image
docker build -t <NEW_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/progressly-ai-worker:latest -f ai-worker/Dockerfile ai-worker

# Push both to ECR
docker push <NEW_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/progressly-backend:latest
docker push <NEW_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/progressly-ai-worker:latest
```

---

### Step 4: Update `terraform.tfvars` & Deploy

Open `terraform/terraform.tfvars` and update with the new credentials and image URIs:

```hcl
project_name = "progressly"
environment  = "prod"

# Account B: Infrastructure Account
infra_aws_region     = "ap-south-1"
infra_aws_access_key = "NEW_ACCOUNT_ACCESS_KEY"
infra_aws_secret_key = "NEW_ACCOUNT_SECRET_KEY"

# Account A: Bedrock AI Account (Can be same or separate account)
bedrock_aws_region     = "ap-south-1"
bedrock_aws_access_key = "NEW_BEDROCK_ACCESS_KEY"
bedrock_aws_secret_key = "NEW_BEDROCK_SECRET_KEY"

# Database Credentials
db_name     = "progressly_db"
db_username = "progressly_admin"
db_password = "YourSecurePassword2026!"

# Container Image URIs
backend_container_image   = "<NEW_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/progressly-backend:latest"
ai_worker_container_image = "<NEW_ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/progressly-ai-worker:latest"
```

Now deploy the complete infrastructure:

```powershell
# 1. Ensure PATH includes Terraform binary
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 2. Re-initialize state for the new account
cd terraform
Remove-Item -Recurse -Force .terraform, terraform.tfstate, terraform.tfstate.backup -ErrorAction SilentlyContinue
terraform init

# 3. Apply infrastructure
terraform plan -out=tfplan
terraform apply "tfplan"
```

---

## 3. What Happens Automatically on Startup (Zero Extra Steps)

1. **Database Schema Auto-Migration:** On container boot inside the VPC, `backend/src/migrate.ts` automatically executes:
   - `CREATE EXTENSION IF NOT EXISTS vector;` (pgvector)
   - `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
   - Creates all tables: `projects`, `wbs_nodes`, `activities`, `reports`, `actual_events`, `matches`, `audit_log`, `historical_records`.
   - Seeds the default project (`Baghjan Gas Gathering Station Project`).
2. **SSL Connection:** Both backend and AI worker automatically connect to PostgreSQL RDS over encrypted TLS (`?sslmode=no-verify` / `ssl: { rejectUnauthorized: false }`).
3. **Continuous AI Worker:** The AI Worker automatically connects to the SQS queue and runs a resilient long-polling consumer loop (`WaitTimeSeconds: 20`), processing new daily field reports in real time.
4. **Health Checks:** The Application Load Balancer registers the backend target and starts serving public traffic on `http://<ALB_DNS_NAME>`.

---

## 4. Cost Guardrails & Architecture Summary

| Component | Hackathon Sizing | Estimated Cost (`ap-south-1`) |
|---|---|---|
| **NAT Gateway** | **REMOVED** (ECS uses direct Internet Gateway) | **$0.00 / month** (Saves ~$32.40/mo) |
| **Application Load Balancer** | 1x Internet-Facing ALB | ~$16.20 / month |
| **RDS PostgreSQL 16** | `db.t4g.micro` (Single-AZ, 20GB GP3) | ~$15.44 / month |
| **ECS Backend API** | 512 CPU (0.5 vCPU) / 1024 MB RAM | ~$17.80 / month |
| **ECS AI Worker** | 1024 CPU (1.0 vCPU) / 2048 MB RAM | ~$35.50 / month |
| **S3, SQS, Lambda, Secrets, Logs** | Serverless / Pay-per-use | < $1.50 / month |
| **CloudWatch Billing Alarm** | Active in `us-east-1` at **$25 threshold** | **$0.00** (Included in free tier) |
| **Total Run Rate** | **~$2.85 / day** (~$86.44 / month) | **~$8.50 - $11.50 for 3–4 day demo** |

---

## 5. Key Troubleshooting Rules

1. **PostgreSQL Version:** AWS RDS in `ap-south-1` requires engine version `16.9` or higher for Postgres 16 (do not use `16.3`).
2. **Postgres Parameter Group:** `shared_preload_libraries` (for `pgvector` / `pg_stat_statements`) is a static parameter and must have `apply_method = "pending-reboot"`.
3. **S3 Bucket Tags:** AWS S3 strictly forbids commas (`,`) in tag values. Only alphanumeric characters and `+ - = . _ : / @` are allowed.
4. **CloudWatch Billing Metrics:** `EstimatedCharges` metric is **only** published by AWS in the `us-east-1` region.
5. **Docker Login in PowerShell:** Always use `$pass = aws ecr get-login-password ...; docker login -u AWS -p $pass ...` to avoid PowerShell pipe newline corruption (which causes `400 Bad Request`).
6. **Git Safety:** `terraform/terraform.tfvars` is permanently excluded in `.gitignore`. Never commit real credentials to GitHub.
