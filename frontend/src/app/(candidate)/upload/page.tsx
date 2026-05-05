'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { apiClient } from '@/lib/api-client'
import { ThemeToggle } from '@/components/theme-toggle'

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
      setError(validationError)
      setFile(null)
      return
    }

    setError('')
    setFile(selectedFile)
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

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError('')
    setProgress(0)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const response = await apiClient.uploadCV(file)

      clearInterval(progressInterval)
      setProgress(100)

      // Wait a moment to show 100% progress
      setTimeout(() => {
        router.push(`/documents`)
      }, 800)
    } catch (err: any) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('Server is warming up (OCR/AI services). This is common for the first upload. Please wait a moment and try again.')
      } else {
        setError(err.response?.data?.detail || err.response?.data?.message || 'Upload failed. Please try again.')
      }
      setProgress(0)
    } finally {
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

            {/* Progress Bar */}
            {uploading && (
              <div className="mt-6">
                <div className="flex justify-between text-sm theme-text-secondary mb-2">
                  <span>Uploading...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-2 bg-gradient-to-r from-sky-500 to-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="mt-2 text-xs theme-text-quaternary text-center">
                  {progress < 20 && 'Uploading file...'}
                  {progress >= 20 && progress < 40 && 'Validating CV format...'}
                  {progress >= 40 && progress < 60 && 'Scanning for viruses...'}
                  {progress >= 60 && progress < 80 && 'Extracting text with OCR...'}
                  {progress >= 80 && progress < 95 && 'Analyzing skills (AI-powered)...'}
                  {progress >= 95 && 'Processing complete!'}
                </p>
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

