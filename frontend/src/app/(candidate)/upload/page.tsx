'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { apiClient } from '@/lib/api-client'
import { ThemeToggle } from '@/components/theme-toggle'
import { toast } from 'sonner'

export default function UploadCVPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)

  const validateFile = (file: File): string | null => {
    // Check file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return 'File size must be less than 10MB'
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ]
    if (!allowedTypes.includes(file.type)) {
      return 'File type must be PDF, DOCX, JPG, or PNG'
    }

    return null
  }

  const handleFileSelect = (selectedFile: File) => {
    const validationError = validateFile(selectedFile)
    if (validationError) {
      toast.error(validationError)
      setFile(null)
      return
    }

    setError('')
    setFile(selectedFile)
    toast.success('File selected: ' + selectedFile.name)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const [statusMessage, setStatusMessage] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError('')
    setProgress(0)
    setStatusMessage('Preparing upload...')
    
    const uploadToast = toast.loading('Uploading and analyzing your CV...')

    try {
      // 1. Perform actual upload
      const response = await apiClient.uploadCV(file)
      setProcessingId(response.id)
      setStatusMessage('File received! Starting technical ingestion...')
      setProgress(30)

      // 2. Poll for background processing status
      const maxAttempts = 100 
      let attempts = 0
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1200)) // Faster polling: 1.2s
        try {
          const doc = await apiClient.getDocument(response.id)
          
          if (doc.status_message) {
            setStatusMessage(doc.status_message)
          }

          if (doc.processing_status === 'completed') {
            setProgress(100)
            setStatusMessage('Ingestion complete! Document is secured and ready.')
            toast.success('CV processed successfully!', { id: uploadToast })
            await new Promise(resolve => setTimeout(resolve, 1500))
            router.push(`/documents`)
            return
          } else if (doc.processing_status === 'failed') {
            throw new Error('Processing failed. Please check the file format and try again.')
          }
          
          // Gradually increase progress based on status
          setProgress(prev => Math.min(prev + 5, 95))
          attempts++
        } catch (pollErr) {
          console.error('Polling error:', pollErr)
          attempts++
        }
      }
      
      // If we timeout, still go to documents
      toast.info('Processing is taking longer than expected. It will appear in your list soon.', { id: uploadToast })
      router.push(`/documents`)
    } catch (err: any) {
      console.error('Upload/Process error:', err)
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || 'Upload failed. Please try again.'
      setError(errorMsg)
      toast.error(errorMsg, { id: uploadToast })
      setProgress(0)
      setUploading(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={['candidate']}>
      <div className="min-h-screen theme-bg theme-text relative overflow-hidden">
        {/* Animated Background */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 theme-glow-bg" />
          <div className="absolute top-0 left-1/4 w-96 h-96 theme-glow-1 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 theme-glow-2 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Header */}
        <header className="relative z-10 theme-card border-b theme-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => router.back()}
                  className="mr-4 theme-text-muted hover:opacity-100 transition-opacity"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <div>
                  <h1 className="text-2xl font-bold">Upload CV</h1>
                  <p className="text-sm theme-text-muted mt-1">Upload your resume for AI-powered analysis</p>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="theme-card rounded-3xl p-8">
            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                dragActive
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'theme-border hover:border-sky-500/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.jpg,.jpeg,.png"
                onChange={handleFileInputChange}
              />

              {!file ? (
                <>
                  <div className="text-6xl mb-6">??</div>
                  <p className="text-xl font-semibold mb-2">
                    Drag and drop your CV here
                  </p>
                  <p className="theme-text-tertiary mb-6">or</p>
                  <motion.button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-8 py-4 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white font-semibold relative overflow-hidden group"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="relative z-10">Browse Files</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-sky-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </motion.button>
                  <p className="mt-6 text-sm theme-text-quaternary">
                    Supported formats: PDF, DOCX, JPG, PNG (Max 10MB)
                  </p>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-6">?</div>
                  <p className="text-xl font-semibold mb-2">{file.name}</p>
                  <p className="theme-text-tertiary mb-6">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    onClick={() => setFile(null)}
                    className="text-sm text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    Choose different file
                  </button>
                </>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                className="mt-6 bg-red-500/20 border border-red-500/50 px-4 py-3 rounded-xl text-sm backdrop-blur-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <span className="theme-text">{error}</span>
              </motion.div>
            )}

            {/* Progress Bar & Status Messages */}
            {uploading && (
              <div className="mt-8 p-6 rounded-2xl bg-sky-500/5 border border-sky-500/20 backdrop-blur-sm">
                <div className="flex justify-between items-end mb-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold theme-text">System Status</span>
                    <motion.p 
                      key={statusMessage}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-lg font-bold text-sky-400 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                      {statusMessage}
                    </motion.p>
                  </div>
                  <span className="text-2xl font-bold text-sky-500">{progress}%</span>
                </div>
                
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden mb-4">
                  <motion.div
                    className="h-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 shadow-[0_0_15px_rgba(14,165,233,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Uploading', min: 0 },
                    { label: 'Processing', min: 30 },
                    { label: 'Securing', min: 80 }
                  ].map((stage) => (
                    <div key={stage.label} className="flex flex-col gap-1">
                      <div className={`h-1 rounded-full transition-colors duration-500 ${progress >= stage.min ? 'bg-sky-500' : 'bg-white/10'}`} />
                      <span className={`text-[10px] uppercase tracking-wider font-bold ${progress >= stage.min ? 'text-sky-400' : 'text-white/20'}`}>
                        {stage.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Button */}
            <div className="mt-6 flex gap-4">
              <button
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 border-2 border-white/20 theme-text-secondary rounded-full font-medium hover:bg-white/5 transition-all"
                disabled={uploading}
              >
                Cancel
              </button>
              <motion.button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex-1 px-6 py-3 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                whileHover={!file || uploading ? {} : { scale: 1.02 }}
                whileTap={!file || uploading ? {} : { scale: 0.98 }}
              >
                <span className="relative z-10">{uploading ? 'Uploading...' : 'Upload CV'}</span>
                {!uploading && !(!file) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-sky-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
              </motion.button>
            </div>

            {/* Info Section */}
            <div className="mt-8 pt-8 border-t border-white/10">
              <h3 className="text-sm font-semibold mb-4">
                What happens after upload?
              </h3>
              <ul className="space-y-3 text-sm theme-text-secondary">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2 mt-0.5">?</span>
                  <span><strong className="theme-text">Smart CV Validation:</strong> AI verifies your file is actually a CV/Resume</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2 mt-0.5">?</span>
                  <span><strong className="theme-text">Virus Scan:</strong> Your CV will be scanned for security</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2 mt-0.5">?</span>
                  <span><strong className="theme-text">OCR Support:</strong> Scanned PDFs are automatically processed with OCR</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2 mt-0.5">?</span>
                  <span><strong className="theme-text">Privacy Protection:</strong> Personal information is automatically masked</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2 mt-0.5">?</span>
                  <span><strong className="theme-text">Hybrid AI Extraction:</strong> Skills extracted from ANY field (tech, medical, legal, arts, business, etc.)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2 mt-0.5">?</span>
                  <span><strong className="theme-text">Smart Matching:</strong> Match your CV with job descriptions across all industries</span>
                </li>
              </ul>
              
              {/* New Features Badge */}
              <div className="mt-4 p-4 bg-sky-500/10 border border-sky-500/30 rounded-xl backdrop-blur-sm">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">?</span>
                  <span className="text-sm font-medium text-sky-300">
                    New: Unlimited domain support - Works with CVs from all fields!
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

