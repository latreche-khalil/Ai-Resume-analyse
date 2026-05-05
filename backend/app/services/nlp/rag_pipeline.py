"""
RAG Pipeline - Document Chunking and Embedding.

Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10
"""
import time
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

from app.core.config import settings
from app.utils.logger import logger


class RAGPipeline:
    """
    RAG Pipeline for document chunking, embedding, and semantic search.
    
    Features:
    - Document chunking (512 tokens, 50 overlap)
    - Embedding generation (384-dimensional)
    - ChromaDB integration
    - Semantic search with cosine similarity
    - Multilingual support
    
    Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
    """
    
    # Chunking parameters
    CHUNK_SIZE = 512  # tokens
    CHUNK_OVERLAP = 50  # tokens
    
    # Performance targets
    EMBEDDING_TARGET_SECONDS = 15.0  # 2-page CV
    SEARCH_TARGET_MS = 500  # milliseconds
    
    # Similarity threshold
    SIMILARITY_THRESHOLD = 0.3  # Lowered for better recall
    TOP_K_RESULTS = 5
    
    def __init__(self):
        """Initialize RAG Pipeline with lazy loading."""
        self.embedding_model = None
        self.chroma_client = None
        self.collection = None
        self._initialized = False
        logger.info("RAG Pipeline created (lazy loading enabled)")
    
    def _ensure_initialized(self) -> None:
        """Ensure models are initialized (lazy loading)."""
        if not self._initialized:
            self._initialize_embedding_model()
            self._initialize_chromadb()
            self._initialized = True
    
    def _initialize_embedding_model(self) -> None:
        """
        Initialize sentence-transformers model.
        
        Requirements: 7.2, 7.4
        """
        try:
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Loaded embedding model: all-MiniLM-L6-v2 (384-dimensional)")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {str(e)}")
    
    def _initialize_chromadb(self) -> None:
        """
        Initialize ChromaDB client and collection.
        
        Requirements: 7.3
        """
        try:
            # Try HTTP client first (production)
            try:
                self.chroma_client = chromadb.HttpClient(
                    host=settings.CHROMADB_HOST,
                    port=settings.CHROMADB_PORT,
                    settings=Settings(anonymized_telemetry=False)
                )
                logger.info("ChromaDB HTTP connection established")
            except Exception as http_error:
                # Fallback to persistent local storage (keeps data between restarts)
                logger.warning(f"ChromaDB HTTP connection failed: {str(http_error)}")
                import os
                persist_dir = os.path.join(os.path.dirname(__file__), "../../../../chroma_data")
                os.makedirs(persist_dir, exist_ok=True)
                self.chroma_client = chromadb.PersistentClient(
                    path=persist_dir,
                    settings=Settings(anonymized_telemetry=False)
                )
                logger.info(f"Using persistent ChromaDB at: {persist_dir}")
            
            # Get or create collection
            self.collection = self.chroma_client.get_or_create_collection(
                name="cv_embeddings",
                metadata={"description": "CV document embeddings"}
            )
            
            logger.info("ChromaDB collection ready")
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {str(e)}")
    
    def chunk_text(self, text: str, language: str) -> List[Dict[str, Any]]:
        """
        Split text into overlapping chunks.

        Strategy: character-based splitting that approximates token count.
        ~4 characters ≈ 1 BPE token for Latin text; for Arabic ~3 chars/token.
        Overlap preserves context across chunk boundaries.

        Args:
            text: Text to chunk
            language: Language code (used to estimate chars-per-token)

        Returns:
            List of chunk dicts with text, index, and metadata.

        Requirements: 7.1
        """
        # Characters-per-token approximation by language
        chars_per_token = 3 if language == 'ar' else 4
        max_chars   = self.CHUNK_SIZE   * chars_per_token   # ~2048 chars
        overlap_chars = self.CHUNK_OVERLAP * chars_per_token  # ~200 chars
        step = max_chars - overlap_chars

        chunks: List[Dict[str, Any]] = []
        chunk_index = 0
        start = 0

        while start < len(text):
            end = start + max_chars
            chunk_text_slice = text[start:end]

            # Trim to the last whitespace so we don't cut mid-word
            if end < len(text):
                last_space = chunk_text_slice.rfind(' ')
                if last_space > overlap_chars:
                    chunk_text_slice = chunk_text_slice[:last_space]

            if chunk_text_slice.strip():   # skip empty chunks
                chunks.append({
                    'text':        chunk_text_slice.strip(),
                    'chunk_index': chunk_index,
                    'start_char':  start,
                    'end_char':    start + len(chunk_text_slice),
                    'language':    language,
                    'word_count':  len(chunk_text_slice.split()),
                    'approx_tokens': len(chunk_text_slice) // chars_per_token,
                })
                chunk_index += 1

            start += step

        logger.info(
            f"Created {len(chunks)} chunks "
            f"(avg ~{max_chars // chars_per_token} tokens each)"
        )
        return chunks
    
    async def chunk_and_embed(
        self,
        document_id: UUID,
        text: str,
        language: str
    ) -> Tuple[List[Dict], List[List[float]]]:
        """
        Chunk text and generate embeddings.
        
        Args:
            document_id: Document ID
            text: Text to process
            language: Language code
            
        Returns:
            Tuple of (chunks, embeddings)
            
        Requirements: 7.1, 7.2, 7.4, 7.5, 7.8
        """
        import asyncio
        
        start_time = time.time()
        
        try:
            # Ensure models are loaded in thread pool to avoid greenlet issues
            await asyncio.to_thread(self._ensure_initialized)
            
            # Chunk text
            chunks = self.chunk_text(text, language)
            
            # Generate embeddings in thread pool to avoid async issues
            chunk_texts = [chunk['text'] for chunk in chunks]
            embeddings = await asyncio.to_thread(
                self.embedding_model.encode,
                chunk_texts,
                show_progress_bar=False,
                convert_to_numpy=True
            )
            
            # Store in ChromaDB (also in thread pool)
            await asyncio.to_thread(
                self._store_embeddings_sync,
                document_id,
                chunks,
                embeddings.tolist()
            )
            
            elapsed_time = time.time() - start_time
            
            if elapsed_time > self.EMBEDDING_TARGET_SECONDS:
                logger.warning(
                    f"Embedding generation exceeded target: {elapsed_time:.2f}s > "
                    f"{self.EMBEDDING_TARGET_SECONDS}s"
                )
            else:
                logger.info(f"Embedding generation completed in {elapsed_time:.2f}s")
            
            return chunks, embeddings.tolist()
            
        except Exception as e:
            logger.error(f"Chunking and embedding error: {str(e)}")
            raise
    
    def _store_embeddings_sync(
        self,
        document_id: UUID,
        chunks: List[Dict],
        embeddings: List[List[float]]
    ) -> None:
        """
        Store embeddings in ChromaDB (synchronous version).
        
        Requirements: 7.3
        """
        try:
            # Prepare data for ChromaDB
            ids = [f"{document_id}_{chunk['chunk_index']}" for chunk in chunks]
            documents = [chunk['text'] for chunk in chunks]
            metadatas = [
                {
                    'document_id': str(document_id),
                    'chunk_index': chunk['chunk_index'],
                    'language': chunk['language'],
                    'word_count': chunk['word_count']
                }
                for chunk in chunks
            ]
            
            # Add to collection
            self.collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas
            )
            
            logger.info(f"Stored {len(embeddings)} embeddings for document {document_id}")
            
        except Exception as e:
            logger.error(f"Failed to store embeddings: {str(e)}")
            raise
    
    async def _store_embeddings(
        self,
        document_id: UUID,
        chunks: List[Dict],
        embeddings: List[List[float]]
    ) -> None:
        """
        Store embeddings in ChromaDB (async wrapper).
        
        Requirements: 7.3
        """
        import asyncio
        await asyncio.to_thread(
            self._store_embeddings_sync,
            document_id,
            chunks,
            embeddings
        )
    
    async def retrieve_relevant_chunks(
        self,
        document_id: UUID,
        query: str,
        top_k: int = TOP_K_RESULTS
    ) -> List[str]:
        """
        Retrieve relevant chunks for a specific document.
        
        Args:
            document_id: Document ID to search within
            query: Search query
            top_k: Number of results to return
            
        Returns:
            List of relevant chunk texts
        """
        results = await self.semantic_search(
            query=query,
            document_ids=[document_id],
            top_k=top_k
        )
        return [result['text'] for result in results]
    
    async def semantic_search(
        self,
        query: str,
        document_ids: Optional[List[UUID]] = None,
        top_k: int = TOP_K_RESULTS
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic search on embeddings.
        
        Args:
            query: Search query
            document_ids: Optional list of document IDs to filter
            top_k: Number of results to return
            
        Returns:
            List of search results with scores
            
        Requirements: 7.6, 7.7
        """
        import asyncio
        
        start_time = time.time()
        
        try:
            # Ensure models are loaded in thread pool
            await asyncio.to_thread(self._ensure_initialized)
            
            # Generate query embedding in thread pool
            query_embedding = await asyncio.to_thread(
                lambda: self.embedding_model.encode(
                    [query],
                    show_progress_bar=False,
                    convert_to_numpy=True
                )[0].tolist()
            )
            
            # Build filter
            where_filter = None
            if document_ids:
                where_filter = {
                    "document_id": {"$in": [str(doc_id) for doc_id in document_ids]}
                }
            
            # Search in thread pool
            results = await asyncio.to_thread(
                self.collection.query,
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where_filter
            )
            
            # Format results
            formatted_results = []
            
            if results['ids'] and len(results['ids']) > 0:
                for i in range(len(results['ids'][0])):
                    # ChromaDB returns L2 distances, convert to similarity
                    # For L2 distance: similarity = 1 / (1 + distance)
                    distance = results['distances'][0][i]
                    similarity = 1 / (1 + distance)
                    
                    if similarity >= self.SIMILARITY_THRESHOLD:
                        formatted_results.append({
                            'id': results['ids'][0][i],
                            'text': results['documents'][0][i],
                            'metadata': results['metadatas'][0][i],
                            'similarity': round(similarity, 3),
                            'distance': round(distance, 3)
                        })
            
            elapsed_time = (time.time() - start_time) * 1000  # Convert to ms
            
            if elapsed_time > self.SEARCH_TARGET_MS:
                logger.warning(
                    f"Semantic search exceeded target: {elapsed_time:.0f}ms > "
                    f"{self.SEARCH_TARGET_MS}ms"
                )
            else:
                logger.info(f"Semantic search completed in {elapsed_time:.0f}ms")
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Semantic search error: {str(e)}")
            return []
    
    async def update_embeddings(
        self,
        document_id: UUID,
        text: str,
        language: str
    ) -> bool:
        """
        Update embeddings when document is modified.
        
        Requirements: 7.9
        """
        try:
            # Delete old embeddings
            await self.delete_embeddings(document_id)
            
            # Create new embeddings
            await self.chunk_and_embed(document_id, text, language)
            
            logger.info(f"Updated embeddings for document {document_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update embeddings: {str(e)}")
            return False
    
    async def delete_embeddings(self, document_id: UUID) -> bool:
        """
        Delete embeddings when document is deleted.
        
        Requirements: 7.10
        """
        self._ensure_initialized()  # Lazy load models
        try:
            # Get all chunk IDs for this document
            results = self.collection.get(
                where={"document_id": str(document_id)}
            )
            
            if results['ids']:
                # Delete embeddings
                self.collection.delete(ids=results['ids'])
                logger.info(f"Deleted {len(results['ids'])} embeddings for document {document_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete embeddings: {str(e)}")
            return False


# Global RAG pipeline instance
rag_pipeline = RAGPipeline()
