# CI/CD & Infrastructure Delivery Architecture

## SIH Problem Statement 26122 — Oil India Limited

**Project:** Intelligent Data Capture & Schedule-Linking Layer  
**Category:** Software  
**Theme:** Smart Automation

---

## 1. Purpose

This document defines the CI/CD and infrastructure-delivery strategy for SIH26122.

The goal is to make the application:

- reproducibly deployable
- automatically tested before deployment
- safely deployable to AWS
- easy for multiple team members to develop
- protected from accidental infrastructure changes
- production-like without requiring manual AWS Console operations

The system separates **application delivery** from **infrastructure delivery**:

```text
Application CI/CD
GitHub → GitHub Actions → Tests → Docker → ECR → ECS Fargate

Infrastructure as Code
Terraform → Plan → Human Approval → Apply → AWS
```

---

## 2. High-Level Delivery Architecture

```text
                         ┌──────────────────────┐
                         │      Developers      │
                         │ Frontend / Backend   │
                         │ Worker / Terraform   │
                         └──────────┬───────────┘
                                    │
                                 git push
                                    │
                                    ▼
                           ┌─────────────────┐
                           │     GitHub      │
                           │    Repository   │
                           └────────┬────────┘
                                    │
                              GitHub Actions
                                    │
                    ┌───────────────┴────────────────┐
                    │                                │
                    ▼                                ▼
             Application CI                    Infrastructure CI
                    │                                │
            lint / tests / build              fmt / validate
                    │                         security checks
                    │                         terraform plan
                    ▼                                │
             Docker image                           │
                    │                                │
                    ▼                                │
                  ECR                         Human approval
                    │                                │
                    ▼                                ▼
              ECS Fargate                    terraform apply
                    │                                │
                    ▼                                ▼
              Live Backend                    AWS Resources
```

The frontend follows a separate Vercel deployment path:

```text
GitHub → Vercel → Preview / Production
```

---

## 3. Repository Strategy

Recommended repository structure:

```text
sih26122/
├── frontend/
├── backend/
├── worker/
├── database/
│   ├── migrations/
│   └── seeds/
├── infrastructure/
│   └── terraform/
│       ├── environments/
│       │   ├── dev/
│       │   └── demo/
│       └── modules/
│           ├── network/
│           ├── alb/
│           ├── ecs/
│           ├── ecr/
│           ├── rds/
│           ├── s3/
│           ├── sqs/
│           ├── lambda/
│           ├── iam/
│           └── monitoring/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-backend.yml
│       └── terraform.yml
├── docker-compose.yml
├── README.md
└── architecture.md
```

---

## 4. Branching Strategy

Use a simple feature-branch workflow.

```text
main
 │
 ├── feature/activity-matching
 ├── feature/project-memory
 ├── feature/dashboard
 └── fix/report-parser
```

### Rules

- `main` is always deployable.
- Developers work on feature branches.
- Changes enter `main` through Pull Requests.
- CI must pass before merging.
- At least one teammate reviews the PR.
- Infrastructure changes receive additional Terraform review.

---

## 5. Continuous Integration (CI)

CI answers:

> **"Is this change safe to merge?"**

Every Pull Request should trigger automated checks.

### Frontend

```text
install → lint → tests → production build
```

### Backend

```text
install → lint → unit tests → integration tests → build
```

### Worker

```text
lint → unit tests → integration tests → build
```

### Database

Validate migrations against a temporary PostgreSQL + pgvector environment.

---

## 6. Container Strategy

Backend and AI worker are containerized.

### Local

```text
Docker Compose
├── Express API
├── AI Worker
└── PostgreSQL + pgvector
```

### Production

```text
Docker Image
    ↓
Amazon ECR
    ↓
ECS Fargate
```

The same image built by CI is the image deployed to AWS, reducing environment drift.

---

## 7. Continuous Deployment (CD)

After a Pull Request is merged into `main`:

```text
Merge
 ↓
CI
 ↓
Docker build
 ↓
Tag with Git commit SHA
 ↓
Push to ECR
 ↓
Update ECS
 ↓
Health checks
 ↓
Smoke tests
 ↓
✅ Deployment
```

Example image tag:

```text
sih26122/backend:3f82a1c
```

Every deployed version must be traceable to a Git commit.

---

## 8. Amazon ECR

Amazon Elastic Container Registry stores backend and worker Docker images.

Recommended approach:

- commit-SHA tags are canonical
- `latest` may exist for convenience
- ECR lifecycle policies clean up stale images

---

## 9. ECS Fargate

```text
Internet
   ↓
AWS ALB
   ↓
ECS Service
   ├── Task 1
   ├── Task 2
   └── Task N
```

The ECS service provides:

- managed containers
- health checks
- horizontal scaling
- rolling deployments
- CloudWatch integration
- ALB integration

---

## 10. Deployment Safety

```text
Old version
    ↓
Deploy new version
    ↓
Health checks
    ↓
Smoke test
    ↓
Success → keep new version
Failure → stop/rollback
```

The demo environment should always have a known-good deployment.

---

## 11. Frontend Deployment with Vercel

```text
Feature branch
      ↓
Pull Request
      ↓
Vercel Preview
```

After merge:

```text
main
 ↓
Vercel
 ↓
Production
```

Use an environment variable for the backend API:

```text
NEXT_PUBLIC_API_URL=https://api.example.com
```

Backend CORS must explicitly allow the deployed Vercel domain.

---

## 12. Infrastructure as Code

All AWS infrastructure is managed using **Terraform**.

Terraform is responsible for resources such as:

```text
VPC
Subnets
Security Groups
ALB
ECS
ECR
RDS
S3
SQS
Lambda
IAM
Secrets Manager
CloudWatch
Autoscaling
```

There should be no dependency on undocumented manual AWS Console configuration.

---

## 13. Terraform Workflow

Infrastructure changes follow a stricter workflow:

```text
Terraform change
       ↓
Pull Request
       ↓
terraform fmt
       ↓
terraform validate
       ↓
security checks
       ↓
terraform plan
       ↓
Human review
       ↓
terraform apply
```

`terraform apply` should require explicit approval.

---

## 14. Terraform Environments

Maintain:

```text
dev
demo
```

### Dev

Used for:

- integration testing
- AWS service testing
- experimentation

### Demo

Used for:

- SIH presentation
- judge demonstrations
- stable final builds

---

## 15. GitHub Actions → AWS Authentication

Do **not** store permanent AWS access keys in GitHub.

Use:

```text
GitHub Actions
      ↓
OIDC identity token
      ↓
AWS IAM role
      ↓
Temporary AWS credentials
```

The deployment role follows least-privilege access.

---

## 16. Secrets Management

Never commit secrets to Git.

Production secrets belong in:

**AWS Secrets Manager**

Examples:

```text
DATABASE_URL
DB_USERNAME
DB_PASSWORD
```

Do not put credentials in source code, Dockerfiles, or committed `.env` files.

---

## 17. AI Deployment

```text
S3
 ↓
Lambda
 ↓
SQS
 ↓
AI Worker
 ↓
Bedrock
 ├── Nova Micro
 └── Titan Text Embeddings V2
       ↓
    pgvector
```

Project Memory:

```text
Historical data
 ↓
Titan Embeddings V2
 ↓
pgvector
 ↓
Retrieve evidence
 ↓
Claude Sonnet 5
```

Model configuration should be environment/config driven.

---

## 18. Worker CI/CD

The worker must test:

- valid extraction
- malformed model output
- missing fields
- low-confidence matches
- rule conflicts
- duplicate events
- retry behavior
- failed Bedrock requests

---

## 19. Database Migration Strategy

RDS PostgreSQL is the production source of truth.

Schema changes are version-controlled:

```text
database/migrations/
├── 001_initial_schema.sql
├── 002_add_schedule_embeddings.sql
├── 003_add_audit_log.sql
└── ...
```

Migrations should be backward-compatible with rolling deployments wherever practical.

---

## 20. Smoke Tests

After ECS deployment:

```text
GET /health
GET /api/projects
POST /api/reports/test
```

Also verify in the demo environment:

```text
Authentication
Project loading
Report submission
Schedule retrieval
Dashboard loading
Project Memory
Audit trail
```

---

## 21. Observability

CloudWatch should capture:

### Application

```text
request
user
endpoint
status
latency
error
correlation ID
```

### Worker

```text
job ID
message ID
report ID
AI processing status
model call status
matching result
confidence
retry state
```

Never log secrets.

---

## 22. Correlation IDs

Every processing workflow should be traceable.

```text
Report DR-1042
    ↓
Job JOB-8492
    ↓
Match MATCH-221
    ↓
Audit AUD-991
```

Useful identifiers:

```text
report_id
job_id
match_id
```

---

## 23. Failure Handling

The ingestion path is intentionally asynchronous:

```text
S3
 ↓
Lambda
 ↓
SQS
 ↓
Worker
```

If processing fails:

```text
Worker failure
     ↓
SQS retry
     ↓
Worker retry
```

After the configured retry limit:

```text
SQS
 ↓
Dead Letter Queue
```

Failed jobs should be visible to administrators.

---

## 24. Deployment Environments

```text
                 GitHub
                    │
           ┌────────┴────────┐
           │                 │
          DEV              DEMO
           │                 │
      continuous        controlled
       iteration         releases
```

The demo environment should not be used for last-minute experiments.

---

## 25. Recommended GitHub Actions Workflows

### `.github/workflows/ci.yml`

Runs on:

```text
pull_request
push to main
```

Responsibilities:

```text
frontend lint/test/build
backend lint/test/build
worker lint/test/build
database migration validation
```

### `.github/workflows/deploy-backend.yml`

Runs on:

```text
push to main
```

Responsibilities:

```text
build Docker image
push to ECR
deploy ECS
health-check
smoke-test
```

### `.github/workflows/terraform.yml`

Runs on:

```text
pull_request
manual approval
```

Responsibilities:

```text
terraform fmt
terraform validate
security checks
terraform plan
terraform apply after approval
```

---

## 26. Application CI Example

```text
Pull Request
     │
     ▼
Checkout Code
     ↓
Install Dependencies
     ↓
Lint
     ↓
Unit Tests
     ↓
Integration Tests
     ↓
Build
     ↓
✅ Merge Allowed
```

If a required stage fails:

```text
❌ Merge blocked
```

---

## 27. Backend CD Example

```text
main
 ↓
GitHub Actions
 ↓
CI
 ↓
Docker build
 ↓
Security scan
 ↓
ECR push
 ↓
ECS deployment
 ↓
ALB health check
 ↓
Smoke test
 ↓
✅ Demo/Production
```

---

## 28. Terraform CI/CD Example

```text
Terraform change
       ↓
Pull Request
       ↓
terraform fmt
       ↓
terraform validate
       ↓
security checks
       ↓
terraform plan
       ↓
Review diff
       ↓
Approval
       ↓
terraform apply
       ↓
AWS updated
```

Destructive operations must receive explicit review.

---

## 29. Local Development

Normal development should not depend on AWS.

```bash
docker compose up
```

Starts:

```text
Express API
AI Worker
PostgreSQL
pgvector
```

Development flow:

```text
Code
 ↓
Docker Compose
 ↓
Tests
 ↓
Git branch
 ↓
Pull Request
 ↓
GitHub CI
```

AWS is only required for real cloud integration and deployment testing.

---

## 30. Dev/Prod Parity

The same Docker image should move through environments:

```text
Local build
     ↓
CI build
     ↓
ECR
     ↓
ECS
```

Only environment configuration should change.

---

## 31. Rollback

Every deployment maps to a Git commit.

```text
Current:
3f82a1c

Previous:
9a7c212
```

If current deployment fails:

```text
3f82a1c ❌
    ↓
rollback
    ↓
9a7c212 ✅
```

Do not repair production by making undocumented console changes.

---

## 32. Cost-Safety Rules

Terraform review must check:

- RDS instance size
- ECS task count
- autoscaling limits
- unnecessary public resources
- unexpectedly expensive services

For SIH:

```text
minimum practical capacity
+
explicit maximum scaling
+
no unnecessary always-on services
```

---

## 33. Security Rules

### Never

- commit AWS credentials
- commit database passwords
- expose RDS publicly without a clear reason
- expose internal workers directly to the internet
- give GitHub Actions full administrator access
- allow arbitrary infrastructure deployment

### Prefer

- private database networking
- narrow security-group rules
- IAM least privilege
- GitHub OIDC
- Secrets Manager
- HTTPS
- environment protection
- CloudWatch logging

---

## 34. SIH Demo-Day Procedure

The day before judging:

```text
Freeze demo version
        ↓
Run full CI
        ↓
Deploy known-good image
        ↓
Run smoke tests
        ↓
Load demo dataset
        ↓
Verify Bedrock
        ↓
Verify RDS
        ↓
Verify S3/SQS
        ↓
Verify Vercel
        ↓
Record deployed commit SHA
```

Avoid experimental deployments immediately before judging.

---

## 35. Final Architecture

```text
                           ┌──────────────────┐
                           │     GitHub       │
                           │  Source Control  │
                           └────────┬─────────┘
                                    │
                       ┌────────────┴────────────┐
                       │                         │
                    Vercel                   GitHub Actions
                       │                         │
                       ▼                         ▼
                React / Next.js          CI / Docker / Deploy
                       │                         │
                       │                         ▼
                       │                       ECR
                       │                         │
                       │                         ▼
                       │                   ECS Fargate
                       │                         │
                       │                         ▼
                       │                       ALB
                       │                         │
                       └──────────────► HTTPS ◄─┘
                                                 │
                          ┌──────────────────────┼────────────────────┐
                          │                      │                    │
                          ▼                      ▼                    ▼
                         RDS                    S3                   SQS
                    PostgreSQL +             Reports             Job Queue
                       pgvector               Evidence                │
                          │                       │                    ▼
                          │                       ▼               AI Worker
                          │                    Lambda                 │
                          │                       │          ┌────────┴────────┐
                          │                       └─────────►│   Bedrock       │
                          │                                  │  Nova Micro     │
                          │                                  │  Titan V2       │
                          │                                  └────────┬────────┘
                          │                                           │
                          └───────────────────────────────► pgvector │
                                                                      │
                                                              Matching Engine
                                                                      │
                                                              Confidence / Review
                                                                      │
                                                                 Audit Log

                ─────────────────────────────────────────────────────────────

                         INFRASTRUCTURE AS CODE

                         Terraform
                            │
                     terraform plan
                            │
                       review/approve
                            │
                     terraform apply
                            │
                            ▼
                       AWS Resources
```

---

## 36. Core Principles

1. **Every application change is tested before merge.**
2. **Every deployment is traceable to a Git commit.**
3. **Every AWS infrastructure change is defined in Terraform.**
4. **Infrastructure changes are reviewed through `terraform plan`.**
5. **AWS credentials are never committed; GitHub uses OIDC and IAM roles.**
6. **The SIH demo environment remains stable and reproducible.**

### Developer workflow

```text
develop locally
     ↓
git push
     ↓
Pull Request
     ↓
automated CI
     ↓
review + merge
     ↓
automatic application deployment
```

### Infrastructure workflow

```text
change Terraform
     ↓
Pull Request
     ↓
terraform plan
     ↓
review
     ↓
approve
     ↓
terraform apply
```

This gives SIH26122 a production-style delivery pipeline while keeping normal development simple and reproducible.
