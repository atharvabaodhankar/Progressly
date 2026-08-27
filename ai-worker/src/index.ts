import dotenv from 'dotenv';

dotenv.config();

console.log('[BridgeIQ AI-Worker] Service initialized.');
console.log('[BridgeIQ AI-Worker] Ready for extraction, matching, and reranking tasks.');

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[BridgeIQ AI-Worker] SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[BridgeIQ AI-Worker] SIGINT received, shutting down gracefully...');
  process.exit(0);
});
