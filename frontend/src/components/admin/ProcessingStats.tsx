'use client'

import { motion } from 'framer-motion'

interface ProcessingStatsProps {
  documentIngestion?: {
    file_size_bytes: number
    file_format: string
    processing_status: string
    virus_scan_status: string
  }
  textExtraction?: {
    extracted_text_length: number
    masked_text_length: number
    detected_language: string
    word_count: number
  }
  cvProcessing?: {
    document_id: string
    pii_entities_masked: number
    skills_extracted: number
    chunks_created: number
    extraction_confidence: number
    flagged_for_review: boolean
  }
  ragPipeline?: {
    chunks_created: number
    embeddings_generated: number
  }
  semanticSearch?: {
    query: string
    results_count: number
    results: Array<{
      id: string
      text: string
      similarity: number
      distance: number
      metadata: any
    }>
  }
}

export function ProcessingStats({
  documentIngestion,
  textExtraction,
  cvProcessing,
  ragPipeline,
  semanticSearch
}: ProcessingStatsProps) {
  return (
    <div className="space-y-6">
      {/* Document Processing */}
      {documentIngestion && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6"
        >
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl">
              📄
            </div>
            <div className="ml-3">
              <h3 className="text-xl font-bold">Document Processing</h3>
              <p className="text-sm text-white/60">File analysis and validation</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-500/10 rounded-xl">
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {(documentIngestion.file_size_bytes / 1024).toFixed(1)} KB
              </div>
              <div className="text-xs text-white/60">File Size</div>
              <div className="text-xs text-white/50 mt-1">
                Format: {documentIngestion.file_format.toUpperCase()}
              </div>
            </div>
            
            <div className="p-4 bg-green-500/10 rounded-xl">
              <div className="text-2xl font-bold text-green-400 mb-1">
                {documentIngestion.processing_status === 'completed' ? '✓' : '⏳'}
              </div>
              <div className="text-xs text-white/60">Processing</div>
              <div className="text-xs text-white/50 mt-1">
                {documentIngestion.processing_status}
              </div>
            </div>
            
            <div className="p-4 bg-purple-500/10 rounded-xl">
              <div className="text-2xl font-bold text-purple-400 mb-1">
                {documentIngestion.virus_scan_status === 'clean' ? '🛡️' : '⚠️'}
              </div>
              <div className="text-xs text-white/60">Security</div>
              <div className="text-xs text-white/50 mt-1">
                {documentIngestion.virus_scan_status}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Text Extraction */}
      {textExtraction && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6"
        >
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-2xl">
              📝
            </div>
            <div className="ml-3">
              <h3 className="text-xl font-bold">Text Extraction</h3>
              <p className="text-sm text-white/60">OCR and text processing</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-500/10 rounded-xl">
              <div className="text-2xl font-bold text-green-400 mb-1">
                {textExtraction.word_count}
              </div>
              <div className="text-xs text-white/60">Words Extracted</div>
              <div className="text-xs text-white/50 mt-1">
                {textExtraction.extracted_text_length} characters
              </div>
            </div>
            
            <div className="p-4 bg-blue-500/10 rounded-xl">
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {textExtraction.detected_language.toUpperCase()}
              </div>
              <div className="text-xs text-white/60">Language</div>
              <div className="text-xs text-white/50 mt-1">
                Auto-detected
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Privacy Protection */}
      {cvProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-xl rounded-3xl border border-yellow-500/30 p-6"
        >
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center text-2xl">
              🔒
            </div>
            <div className="ml-3">
              <h3 className="text-xl font-bold">Privacy Protection</h3>
              <p className="text-sm text-white/60">PII masking and data security</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-yellow-500/10 rounded-xl">
              <div className="text-3xl font-bold text-yellow-400 mb-1">
                {cvProcessing.pii_entities_masked}
              </div>
              <div className="text-xs text-white/60">PII Entities Masked</div>
              <div className="text-xs text-white/50 mt-1">
                Names, emails, phones
              </div>
            </div>
            
            <div className="p-4 bg-purple-500/10 rounded-xl">
              <div className="text-3xl font-bold text-purple-400 mb-1">
                {cvProcessing.skills_extracted}
              </div>
              <div className="text-xs text-white/60">Skills Extracted</div>
              <div className="text-xs text-white/50 mt-1">
                AI-powered detection
              </div>
            </div>
            
            <div className="p-4 bg-green-500/10 rounded-xl">
              <div className="text-3xl font-bold text-green-400 mb-1">
                {Math.round(cvProcessing.extraction_confidence * 100)}%
              </div>
              <div className="text-xs text-white/60">Confidence</div>
              <div className="text-xs text-white/50 mt-1">
                Extraction accuracy
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* RAG Pipeline */}
      {ragPipeline && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 backdrop-blur-xl rounded-3xl border border-cyan-500/30 p-6"
        >
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-2xl">
              🧠
            </div>
            <div className="ml-3">
              <h3 className="text-xl font-bold">RAG Pipeline</h3>
              <p className="text-sm text-white/60">Retrieval-Augmented Generation</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-cyan-500/10 rounded-xl">
              <div className="text-3xl font-bold text-cyan-400 mb-1">
                {ragPipeline.chunks_created}
              </div>
              <div className="text-xs text-white/60">Text Chunks</div>
              <div className="text-xs text-white/50 mt-1">
                For semantic search
              </div>
            </div>
            
            <div className="p-4 bg-indigo-500/10 rounded-xl">
              <div className="text-3xl font-bold text-indigo-400 mb-1">
                {ragPipeline.embeddings_generated}
              </div>
              <div className="text-xs text-white/60">Embeddings</div>
              <div className="text-xs text-white/50 mt-1">
                Vector representations
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Semantic Search Results */}
      {semanticSearch && semanticSearch.results && semanticSearch.results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6"
        >
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center text-2xl">
              🔍
            </div>
            <div className="ml-3">
              <h3 className="text-xl font-bold">Semantic Search</h3>
              <p className="text-sm text-white/60">
                Query: "{semanticSearch.query}" ({semanticSearch.results_count} results)
              </p>
            </div>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {semanticSearch.results.map((result, index) => (
              <div key={index} className="p-4 bg-pink-500/10 rounded-xl border border-pink-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">
                    Chunk {result.metadata.chunk_index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-pink-500/20 rounded-full text-xs">
                      {Math.round(result.similarity * 100)}% match
                    </span>
                    <span className="px-2 py-1 bg-white/10 rounded-full text-xs">
                      {result.metadata.word_count} words
                    </span>
                  </div>
                </div>
                <p className="text-sm text-white/70 line-clamp-3">
                  {result.text.substring(0, 200)}...
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
