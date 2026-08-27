# BridgeIQ AI Worker

## Extraction Provider Architecture

> **TEMPORARY ARCHITECTURE NOTE (Bedrock Model Access Pending):**
> 
> The final production architecture specifies **Amazon Bedrock (Nova Micro)** for high-volume extraction and candidate reranking, **Amazon Bedrock (Titan Text Embeddings V2)** for text embeddings, and **Amazon Bedrock (Claude Sonnet 5)** for Project Memory RAG.
>
> While the AWS Bedrock quota request is being processed, the extraction step is temporarily backed by **Groq SDK** as a drop-in placeholder.
>
> All provider calls are isolated behind the `extractEvents()` interface in `src/extractionProvider.ts`. The prompt, JSON schema, and event normalization logic are 100% identical, ensuring zero rework when switching back to Amazon Bedrock (`EXTRACTION_PROVIDER=bedrock`).

## Running Standalone Extraction Tests

```bash
npm run test:extract
```
