import anthropic

# Automatically picks up ANTHROPIC_API_KEY from environment
client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-3-5-haiku-20241022",  # Standard model ID
    max_tokens=64,
    messages=[{"role": "user", "content": "What is Amazon Bedrock?"}],
)
print(message.content[0].text)
