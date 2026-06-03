import sqlite3
import chromadb
from uuid import UUID
import sys
import asyncio

sys.path.insert(0, '.')
from app.services.nlp.rag_pipeline import rag_pipeline

async def rebuild():
    # 1. Initialize RAG client
    rag_pipeline._initialize_embedding_model()
    rag_pipeline._initialize_chromadb()
    
    # 2. Get all completed documents from SQLite
    conn = sqlite3.connect('ai_resume.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, masked_text, detected_language, original_filename FROM cv_documents WHERE processing_status = 'completed'")
    docs = cursor.fetchall()
    print(f"Found {len(docs)} completed documents to re-embed.")
    
    # 3. For each document, delete old embeddings and recreate them
    for doc_id_str, masked_text, language, filename in docs:
        if not masked_text:
            print(f"Skipping {filename} ({doc_id_str}) because masked_text is empty")
            continue
        doc_uuid = UUID(doc_id_str)
        print(f"Re-embedding {filename} ({doc_id_str})...")
        
        # Delete old embeddings
        await rag_pipeline.delete_embeddings(doc_uuid)
        
        # Generate new embeddings
        chunks, embs = await rag_pipeline.chunk_and_embed(
            document_id=doc_uuid,
            text=masked_text,
            language=language or 'en'
        )
        print(f"  Generated {len(chunks)} chunks")
        
    conn.close()
    print("Re-embedding completed successfully!")

if __name__ == "__main__":
    asyncio.run(rebuild())
