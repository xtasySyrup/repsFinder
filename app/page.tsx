'use client'

import { useState, useCallback, useRef } from 'react'

type Step = 'upload' | 'identifying' | 'confirm' | 'searching' | 'results'

interface QCItem {
  itemID: string
  qcUrl: string
  imageUrl?: string
  sources: Array<{ title: string; url: string }>
}

const STEPS = ['Upload', 'Confirm', 'Results'] as const

function StepIndicator({ step }: { step: Step }) {
  const activeIndex =
    step === 'upload' || step === 'identifying' ? 0
    : step === 'confirm' || step === 'searching' ? 1
    : 2

  return (
    <div className="flex items-center gap-1 mb-10 text-xs select-none">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-1">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] transition-colors ${
            i < activeIndex ? 'bg-indigo-700 text-indigo-200' :
            i === activeIndex ? 'bg-indigo-500 text-white' :
            'bg-gray-800 text-gray-600'
          }`}>{i + 1}</div>
          <span className={i === activeIndex ? 'text-white font-medium' : 'text-gray-600'}>{label}</span>
          {i < STEPS.length - 1 && <span className="text-gray-700 mx-2">—</span>}
        </div>
      ))}
    </div>
  )
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      <p className="text-gray-400 text-sm">{label}</p>
    </div>
  )
}

export default function Home() {
  const [step, setStep] = useState<Step>('upload')
  const [preview, setPreview] = useState<string | null>(null)
  const [itemName, setItemName] = useState('')
  const [editedName, setEditedName] = useState('')
  const [qcItems, setQcItems] = useState<QCItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [searchStatus, setSearchStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.')
      return
    }
    setError(null)

    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      const base64 = dataUrl.split(',')[1]
      const mediaType = file.type

      setPreview(dataUrl)
      setStep('identifying')

      try {
        const res = await fetch('/api/identify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, mediaType }),
        })
        if (!res.ok) {
          const { error: msg } = await res.json().catch(() => ({}))
          throw new Error(msg || 'Failed to identify item')
        }
        const { itemName: name } = await res.json()
        setItemName(name)
        setEditedName(name)
        setStep('confirm')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to identify item')
        setStep('upload')
      }
    }
    reader.readAsDataURL(file)
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleConfirm = useCallback(async () => {
    setStep('searching')
    try {
      setSearchStatus(`Searching Reddit for "${editedName}"…`)
      const searchRes = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: editedName }),
      })
      if (!searchRes.ok) throw new Error('Search failed')
      const { results, meta } = await searchRes.json()

      const sourceLine = [
        meta?.redditCount ? `Reddit: ${meta.redditCount}` : null,
        meta?.googleCount ? `Google: ${meta.googleCount}` : null,
      ].filter(Boolean).join(', ')

      setSearchStatus(`Found ${results.length} result${results.length !== 1 ? 's' : ''}${sourceLine ? ` (${sourceLine})` : ''} — extracting Weidian IDs…`)
      const qcRes = await fetch('/api/qc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results }),
      })
      if (!qcRes.ok) throw new Error('QC extraction failed')

      setSearchStatus('Fetching product images…')
      const { items } = await qcRes.json()

      setQcItems(items)
      setStep('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setStep('confirm')
    }
  }, [editedName])

  const handleReset = useCallback(() => {
    setStep('upload')
    setPreview(null)
    setItemName('')
    setEditedName('')
    setQcItems([])
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      {/* Header */}
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Reps<span className="text-indigo-400">Finder</span>
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload → AI identifies → Find QC photos
        </p>
      </header>

      <div className="w-full max-w-lg">
        <StepIndicator step={step} />

        {/* Error banner */}
        {error && (
          <div className="mb-6 bg-red-950/60 border border-red-800 text-red-400 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* ── UPLOAD ── */}
        {step === 'upload' && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-gray-800 hover:border-gray-600 hover:bg-gray-900/40'
            }`}
          >
            <div className="text-5xl mb-4 select-none">🖼️</div>
            <p className="text-gray-200 font-semibold">Drop a clothing photo here</p>
            <p className="text-gray-600 text-sm mt-1">or click to browse</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}

        {/* ── IDENTIFYING ── */}
        {step === 'identifying' && (
          <div className="text-center">
            {preview && (
              <img
                src={preview}
                alt="Uploaded"
                className="max-h-56 rounded-xl border border-gray-800 mx-auto mb-6 object-contain"
              />
            )}
            <Spinner label="Identifying item with AI…" />
          </div>
        )}

        {/* ── CONFIRM ── */}
        {step === 'confirm' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            {preview && (
              <div className="flex justify-center bg-gray-950 p-4">
                <img
                  src={preview}
                  alt="Uploaded"
                  className="max-h-48 rounded-lg object-contain"
                />
              </div>
            )}
            <div className="p-6">
              <h2 className="text-base font-semibold mb-1">Confirm your search</h2>
              <p className="text-gray-500 text-sm mb-5">
                We identified this as{' '}
                <span className="text-indigo-400 font-medium">"{itemName}"</span>.
                Edit if needed, then confirm.
              </p>

              <label className="block text-[11px] uppercase tracking-widest text-gray-600 mb-2">
                Item name
              </label>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && editedName.trim() && handleConfirm()}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors mb-4"
                placeholder="e.g. Nike Air Force 1 Low White"
              />

              <div className="flex gap-3">
                <button
                  onClick={handleConfirm}
                  disabled={!editedName.trim()}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg text-sm transition-colors"
                >
                  Search for QC Photos
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SEARCHING ── */}
        {step === 'searching' && (
          <Spinner label={searchStatus} />
        )}
      </div>

      {/* ── RESULTS ── */}
      {step === 'results' && (
        <div className="w-full max-w-4xl mt-0">
          <div className="flex items-center justify-between mb-6 max-w-4xl mx-auto px-0">
            <div>
              <h2 className="text-lg font-semibold">
                Results for{' '}
                <span className="text-indigo-400">&ldquo;{editedName}&rdquo;</span>
              </h2>
              <p className="text-gray-500 text-sm mt-0.5">
                {qcItems.length} Weidian item{qcItems.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm transition-colors"
            >
              New search
            </button>
          </div>

          {qcItems.length === 0 ? (
            <div className="text-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-300 font-semibold">No Weidian items found</p>
              <p className="text-gray-600 text-sm mt-1">
                Try a more specific search term or a different query
              </p>
              <button
                onClick={() => setStep('confirm')}
                className="mt-5 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
              >
                Edit search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {qcItems.map(({ itemID, qcUrl, imageUrl, sources }) => (
                <div
                  key={itemID}
                  className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col hover:border-gray-700 transition-colors"
                >
                  {/* Product image */}
                  <div className="w-full aspect-square bg-gray-800 relative overflow-hidden">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={`Weidian item ${itemID}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-4xl select-none">
                        🛍
                      </div>
                    )}
                    {/* itemID badge */}
                    <span className="absolute bottom-2 left-2 bg-black/70 text-gray-300 font-mono text-[10px] px-2 py-0.5 rounded">
                      #{itemID}
                    </span>
                  </div>

                  {/* Links */}
                  <div className="p-3 flex flex-col gap-2">
                    <a
                      href={qcUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                    >
                      View QC Photos
                    </a>
                    <a
                      href={`https://weidian.com/item.html?itemID=${itemID}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm transition-colors"
                    >
                      Weidian listing
                    </a>

                    {/* Source proof */}
                    {sources.length > 0 && (
                      <div className="flex items-start gap-1.5 pt-1">
                        <span className="text-gray-600 text-[10px] mt-0.5 shrink-0">📄</span>
                        <div className="min-w-0">
                          <a
                            href={sources[0].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-gray-500 hover:text-indigo-400 transition-colors line-clamp-1 block"
                            title={sources[0].title}
                          >
                            {sources[0].title || sources[0].url}
                          </a>
                          {sources.length > 1 && (
                            <span className="text-[10px] text-gray-700">
                              +{sources.length - 1} more source{sources.length > 2 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
