import React from 'react';

export default function Home() {
  return (
    <main style={{ padding: '3rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '0.5rem' }}>
          BridgeIQ
        </h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)' }}>
          Intelligent Data Capture & Schedule-Linking Layer (SIH26122 — Oil India Limited)
        </p>
      </header>

      <section style={{
        backgroundColor: 'var(--bg-card)',
        padding: '1.75rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
          System Overview
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Automating ingestion of heterogeneous field inputs, structured activity extraction,
          semantic matching via pgvector embeddings, confidence-tiered approval routing, and
          Project Memory RAG.
        </p>
      </section>
    </main>
  );
}
