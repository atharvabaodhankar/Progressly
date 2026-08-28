# -----------------------------------------------------------------------------
# Lambda S3-to-SQS Ingestion Trigger (Account B - infra-account)
# -----------------------------------------------------------------------------

# 1. Inline Lambda Function Code
data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "${path.module}/s3_to_sqs.zip"

  source {
    content  = <<-EOF
      const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
      const sqs = new SQSClient({});

      exports.handler = async (event) => {
        console.log("Received S3 Event:", JSON.stringify(event, null, 2));

        for (const record of event.Records || []) {
          const bucketName = record.s3.bucket.name;
          const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
          const fileSize = record.s3.object.size;
          const eventTime = record.eventTime;

          const payload = {
            bucket: bucketName,
            key: objectKey,
            size: fileSize,
            timestamp: eventTime,
            action: "PROCESS_DAILY_REPORT"
          };

          const params = {
            QueueUrl: process.env.REPORTS_QUEUE_URL,
            MessageBody: JSON.stringify(payload),
            MessageAttributes: {
              "FileType": {
                DataType: "String",
                StringValue: objectKey.split('.').pop() || "unknown"
              }
            }
          };

          console.log(`Enqueuing SQS message for s3://$${bucketName}/$${objectKey}`);
          await sqs.send(new SendMessageCommand(params));
        }

        return { statusCode: 200, body: "Successfully enqueued S3 events to SQS." };
      };
    EOF
    filename = "index.js"
  }
}

# 2. Lambda Function Definition
resource "aws_lambda_function" "s3_to_sqs" {
  function_name    = "${var.project_name}-s3-to-sqs-${var.environment}"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      REPORTS_QUEUE_URL = aws_sqs_queue.reports_queue.url
      ENVIRONMENT       = var.environment
    }
  }

  tags = {
    Name        = "${var.project_name}-s3-to-sqs-${var.environment}"
    Description = "Ingests S3 ObjectCreated events and enqueues job items into SQS"
  }
}

# 3. Permission for S3 Bucket to invoke Lambda
resource "aws_lambda_permission" "allow_s3" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.s3_to_sqs.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.reports.arn
}

# 4. S3 Bucket Notification Triggering Lambda
resource "aws_s3_bucket_notification" "reports_notification" {
  bucket = aws_s3_bucket.reports.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.s3_to_sqs.arn
    events              = ["s3:ObjectCreated:*"]
  }

  depends_on = [aws_lambda_permission.allow_s3]
}
