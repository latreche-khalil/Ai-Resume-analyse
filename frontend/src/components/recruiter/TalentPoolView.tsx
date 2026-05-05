'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'

export function TalentPoolView() {
  const router = useRouter()
  const [pools, setPools] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [jds, setJds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [jdId, setJdId] = useState('')
  const [revealedIdentities, setRevealedIdentities] = useState<Record<string, any>>({})
  const [revealing, setRevealing] = useState<string | null>(null)
  const [availableCVs, setAvailableCVs] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    Promise.all([
      apiClient.listTalentPools().then(setPools),
      apiClient.getJobDescriptions({ limit: 50 }).then(r => setJds(Array.isArray(r) ? r : r.items || [])),
      apiClient.getDocuments({ limit: 100 }).then(r => setAvailableCVs(r.documents || []))
    ]).finally(() => setLoading(false))
  }, [])

  const create = async () => {
    if (!name) return
    const p = await apiClient.createTalentPool({ name, job_description_id: jdId || undefined })
    setPools(prev => [p, ...prev])
    setName(''); setJdId('')
  }

  const rank = async () => {
    if (!selected?.job_description_id) return alert('Link a JD to this pool first')
    await apiClient.batchRankCandidates(selected.id, selected.job_description_id)
    const u = await apiClient.getTalentPool(selected.id)
    setSelected(u)
  }

  const setStatus = async (cvId: string, status: 'shortlisted'|'rejected'|'backup') => {
    await apiClient.updateCandidateStatus(selected.id, cvId, status)
    const u = await apiClient.getTalentPool(selected.id)
    setSelected(u)
  }

  const revealIdentity = async (cvId: string) => {
    if (revealedIdentities[cvId]) return 
    setRevealing(cvId)
    try {
      const res = await apiClient.revealCandidateIdentity(cvId)
      setRevealedIdentities(prev => ({ ...prev, [cvId]: res.identity }))
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Cannot reveal — shortlist this candidate first')
    } finally {
      setRevealing(null)
    }
  }

  const addCandidate = async (cvId: string) => {
    if (!selected) return
    setAdding(true)
    try {
      await apiClient.addCandidateToPool(selected.id, cvId)
      const u = await apiClient.getTalentPool(selected.id)
      setSelected(u)
      setShowAddModal(false)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to add candidate')
    } finally {
      setAdding(false)
    }
  }

  const removeCandidate = async (cvId: string) => {
    if (!selected) return
    if (!confirm('Remove this candidate from the pool?')) return
    try {
      await apiClient.removeCandidateFromPool(selected.id, cvId)
      const u = await apiClient.getTalentPool(selected.id)
      setSelected(u)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to remove candidate')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="bg-white/5 border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/recruiter-dashboard')} className="text-white/60 hover:text-white">← Back</button>
        <span className="font-semibold">🏊 Talent Pool</span>
      </header>
      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-64 border-r border-white/10 p-4 space-y-3">
          <div className="space-y-2">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Pool name"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none" />
            <select value={jdId} onChange={e => setJdId(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
              <option value="">Link JD (optional)</option>
              {jds.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
            <button onClick={create} disabled={!name}
              className="w-full py-2 bg-blue-600 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-blue-500">
              + Create Pool
            </button>
          </div>
          <hr className="border-white/10" />
          {loading && <p className="text-white/40 text-sm text-center">Loading...</p>}
          {pools.map(p => (
            <button key={p.id} onClick={() => apiClient.getTalentPool(p.id).then(setSelected)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selected?.id === p.id ? 'bg-blue-600' : 'hover:bg-white/10'}`}>
              {p.name}
            </button>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 p-6">
          {!selected ? (
            <div className="text-center text-white/40 py-20">Select a pool</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{selected.name}</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowAddModal(true)} 
                    className="px-4 py-2 bg-green-600 rounded-lg text-sm hover:bg-green-500">
                    + Add Candidate
                  </button>
                  <button onClick={rank} className="px-4 py-2 bg-sky-600 rounded-lg text-sm hover:bg-sky-500">
                    ⚡ Rank All
                  </button>
                </div>
              </div>
              {(selected.candidates || []).length === 0 && (
                <p className="text-white/40 text-center py-10">No candidates yet</p>
              )}
              {(selected.candidates || []).map((c: any) => (
                <div key={c.cv_document_id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
                  <div className="flex-1">
                    {revealedIdentities[c.cv_document_id] ? (
                      <div className="space-y-0.5">
                        {revealedIdentities[c.cv_document_id].PERSON?.[0] && (
                          <div className="font-semibold text-green-400 text-sm">👤 {revealedIdentities[c.cv_document_id].PERSON[0]}</div>
                        )}
                        {revealedIdentities[c.cv_document_id].EMAIL?.[0] && (
                          <div className="text-xs text-white/60">✉️ {revealedIdentities[c.cv_document_id].EMAIL[0]}</div>
                        )}
                        {revealedIdentities[c.cv_document_id].PHONE?.[0] && (
                          <div className="text-xs text-white/60">📞 {revealedIdentities[c.cv_document_id].PHONE[0]}</div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-mono text-white/50">🔒 {c.cv_document_id?.slice(0,12)}...</div>
                        {c.pool_specific_score && <div className="text-xs text-white/40">Score: {Math.round(c.pool_specific_score*100)}%</div>}
                      </div>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    c.status==='shortlisted'?'bg-green-500/20 text-green-400':
                    c.status==='rejected'?'bg-red-500/20 text-red-400':
                    'bg-white/10 text-white/50'}`}>{c.status||'pending'}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setStatus(c.cv_document_id,'shortlisted')} className="px-2 py-1 bg-green-700 rounded text-xs hover:bg-green-600" title="Shortlist">✓</button>
                    <button onClick={() => setStatus(c.cv_document_id,'backup')} className="px-2 py-1 bg-yellow-700 rounded text-xs hover:bg-yellow-600" title="Backup">~</button>
                    <button onClick={() => setStatus(c.cv_document_id,'rejected')} className="px-2 py-1 bg-red-700 rounded text-xs hover:bg-red-600" title="Reject">✗</button>
                    <button 
                      onClick={() => removeCandidate(c.cv_document_id)} 
                      className="px-2 py-1 bg-gray-700 rounded text-xs hover:bg-gray-600" 
                      title="Remove from pool">
                      🗑️
                    </button>
                    {c.status === 'shortlisted' && !revealedIdentities[c.cv_document_id] && (
                      <button
                        onClick={() => revealIdentity(c.cv_document_id)}
                        disabled={revealing === c.cv_document_id}
                        className="px-2 py-1 bg-purple-700 hover:bg-sky-600 rounded text-xs transition-colors disabled:opacity-40"
                        title="Reveal identity (logged in audit trail)">
                        {revealing === c.cv_document_id ? '...' : '👁️'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Candidate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Add Candidate to {selected?.name}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-white/60 hover:text-white text-2xl">×</button>
            </div>
            
            <div className="space-y-3">
              {availableCVs.length === 0 ? (
                <p className="text-white/40 text-center py-8">No CVs available</p>
              ) : (
                availableCVs
                  .filter(cv => !selected?.candidates?.some((c: any) => c.cv_document_id === cv.id))
                  .map(cv => (
                    <div key={cv.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white text-sm">{cv.original_filename}</div>
                        <div className="text-xs text-white/50">
                          {cv.processing_status === 'completed' ? '✅ Ready' : '⏳ Processing'}
                        </div>
                      </div>
                      <button
                        onClick={() => addCandidate(cv.id)}
                        disabled={adding || cv.processing_status !== 'completed'}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {adding ? 'Adding...' : '+ Add'}
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
