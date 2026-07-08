/**
 * PackEditor — full-screen mobile sheet for managing custom word packs.
 *
 * Create/edit pairs inline, import JSON (paste or file), export (copy or
 * download), and delete packs. Built-in packs are visible and exportable but
 * read-only. Calls `onClose` when dismissed; the setup screen re-reads
 * `allPacks()` afterward.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  builtinPacks,
  loadCustomPacks,
  saveCustomPack,
  deleteCustomPack,
  validateCustomPack,
  exportPackToJSON,
} from '../../words'
import type { WordPack } from '../../words'
import './packs.css'

interface PairDraft {
  a: string
  b: string
}

type Mode =
  | { kind: 'list' }
  | { kind: 'edit'; packId: string | null } // null = new pack
  | { kind: 'import' }

const TITLE_ID = 'packs-editor-title'

function emptyPair(): PairDraft {
  return { a: '', b: '' }
}

export function PackEditor({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [custom, setCustom] = useState<WordPack[]>(() => loadCustomPacks())
  const [mode, setMode] = useState<Mode>({ kind: 'list' })
  const dialogRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(() => setCustom(loadCustomPacks()), [])

  // Move focus into the dialog on open.
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  // Escape closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="packs-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      ref={dialogRef}
      tabIndex={-1}
    >
      <header className="packs-header">
        <h1 className="packs-title" id={TITLE_ID}>
          Word Packs
        </h1>
        <button
          type="button"
          className="packs-btn packs-btn-ghost btn btn-ghost"
          onClick={onClose}
        >
          Close
        </button>
      </header>

      <div className="packs-body">
        {mode.kind === 'list' && (
          <PackList
            custom={custom}
            onNew={() => setMode({ kind: 'edit', packId: null })}
            onEdit={(id) => setMode({ kind: 'edit', packId: id })}
            onImport={() => setMode({ kind: 'import' })}
            onDelete={(id) => {
              deleteCustomPack(id)
              refresh()
            }}
          />
        )}

        {mode.kind === 'edit' && (
          <PackForm
            packId={mode.packId}
            onDone={() => {
              refresh()
              setMode({ kind: 'list' })
            }}
            onCancel={() => setMode({ kind: 'list' })}
          />
        )}

        {mode.kind === 'import' && (
          <ImportPanel
            onDone={() => {
              refresh()
              setMode({ kind: 'list' })
            }}
            onCancel={() => setMode({ kind: 'list' })}
          />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------

function PackList({
  custom,
  onNew,
  onEdit,
  onImport,
  onDelete,
}: {
  custom: WordPack[]
  onNew: () => void
  onEdit: (id: string) => void
  onImport: () => void
  onDelete: (id: string) => void
}): React.JSX.Element {
  return (
    <>
      <div className="packs-form-actions">
        <button
          type="button"
          className="packs-btn packs-btn-primary btn btn-primary"
          onClick={onNew}
        >
          New pack
        </button>
        <button
          type="button"
          className="packs-btn btn"
          onClick={onImport}
        >
          Import JSON
        </button>
      </div>

      <section>
        <h2 className="packs-section-title">Your packs</h2>
        {custom.length === 0 ? (
          <p className="packs-card-desc">No custom packs yet. Create or import one.</p>
        ) : (
          <ul className="packs-list">
            {custom.map((pack) => (
              <CustomPackCard
                key={pack.id}
                pack={pack}
                onEdit={() => onEdit(pack.id)}
                onDelete={() => onDelete(pack.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="packs-section-title">Built-in packs</h2>
        <ul className="packs-list">
          {builtinPacks.map((pack) => (
            <BuiltinPackCard key={pack.id} pack={pack} />
          ))}
        </ul>
      </section>
    </>
  )
}

function CustomPackCard({
  pack,
  onEdit,
  onDelete,
}: {
  pack: WordPack
  onEdit: () => void
  onDelete: () => void
}): React.JSX.Element {
  const [confirming, setConfirming] = useState(false)
  return (
    <li className="packs-card">
      <div className="packs-card-top">
        <span className="packs-card-name">{pack.name}</span>
        <span className="packs-card-count">{pack.pairs.length} pairs</span>
      </div>
      <div className="packs-card-actions">
        <button type="button" className="packs-btn btn" onClick={onEdit}>
          Edit
        </button>
        <ExportButtons pack={pack} />
        <button
          type="button"
          className="packs-btn packs-btn-danger"
          onClick={() => setConfirming(true)}
        >
          Delete
        </button>
      </div>
      {confirming && (
        <div className="packs-confirm">
          <span>Delete “{pack.name}”? This cannot be undone.</span>
          <div className="packs-confirm-actions">
            <button
              type="button"
              className="packs-btn packs-btn-danger"
              onClick={onDelete}
            >
              Confirm delete
            </button>
            <button
              type="button"
              className="packs-btn packs-btn-ghost btn btn-ghost"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

function BuiltinPackCard({ pack }: { pack: WordPack }): React.JSX.Element {
  return (
    <li className="packs-card">
      <div className="packs-card-top">
        <span className="packs-card-name">{pack.name}</span>
        <span className="packs-card-count">{pack.pairs.length} pairs</span>
      </div>
      <p className="packs-card-desc">{pack.description}</p>
      <div className="packs-card-actions">
        <span className="packs-badge">Built-in</span>
        <ExportButtons pack={pack} />
      </div>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function ExportButtons({ pack }: { pack: WordPack }): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const linkRef = useRef<HTMLAnchorElement>(null)

  const json = useMemo(() => exportPackToJSON(pack), [pack])

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }, [json])

  const onDownload = useCallback(() => {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = linkRef.current
    if (link) {
      link.href = url
      link.download = `${pack.name}.json`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 0)
    }
  }, [json, pack.name])

  return (
    <>
      <button type="button" className="packs-btn btn" onClick={onCopy}>
        {copied ? 'Copied!' : 'Copy JSON'}
      </button>
      <button type="button" className="packs-btn btn" onClick={onDownload}>
        Download
      </button>
      <a ref={linkRef} className="packs-download-link" aria-hidden="true">
        download
      </a>
    </>
  )
}

// ---------------------------------------------------------------------------
// Create / edit form
// ---------------------------------------------------------------------------

function PackForm({
  packId,
  onDone,
  onCancel,
}: {
  packId: string | null
  onDone: () => void
  onCancel: () => void
}): React.JSX.Element {
  const existing = useMemo(
    () => (packId ? loadCustomPacks().find((p) => p.id === packId) ?? null : null),
    [packId],
  )

  const [name, setName] = useState(existing?.name ?? '')
  const [pairs, setPairs] = useState<PairDraft[]>(
    existing ? existing.pairs.map((p) => ({ a: p.a, b: p.b })) : [emptyPair(), emptyPair()],
  )
  const [errors, setErrors] = useState<string[]>([])

  function updatePair(i: number, key: 'a' | 'b', value: string) {
    setPairs((prev) => prev.map((p, idx) => (idx === i ? { ...p, [key]: value } : p)))
  }

  function addPair() {
    setPairs((prev) => [...prev, emptyPair()])
  }

  function removePair(i: number) {
    setPairs((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))
  }

  function onSave() {
    const filled = pairs.filter((p) => p.a.trim() !== '' || p.b.trim() !== '')
    const file = {
      version: 1 as const,
      name,
      pairs: filled.map((p) => ({ a: p.a, b: p.b })),
    }
    const result = validateCustomPack(file)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    // Preserve id when editing an existing pack.
    const pack = existing ? { ...result.pack, id: existing.id } : result.pack
    saveCustomPack(pack)
    onDone()
  }

  return (
    <>
      <h2 className="packs-section-title">{existing ? 'Edit pack' : 'New pack'}</h2>

      <div className="packs-field">
        <label className="packs-label" htmlFor="packs-name">
          Pack name
        </label>
        <input
          id="packs-name"
          className="packs-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Inside Jokes"
        />
      </div>

      <div className="packs-field">
        <span className="packs-label">Pairs</span>
        {pairs.map((pair, i) => (
          <div className="packs-pair-row" key={i}>
            <input
              className="packs-input"
              aria-label={`Pair ${i + 1} word A`}
              value={pair.a}
              onChange={(e) => updatePair(i, 'a', e.target.value)}
              placeholder="word A"
            />
            <span className="packs-pair-sep">/</span>
            <input
              className="packs-input"
              aria-label={`Pair ${i + 1} word B`}
              value={pair.b}
              onChange={(e) => updatePair(i, 'b', e.target.value)}
              placeholder="word B"
            />
            <button
              type="button"
              className="packs-remove"
              aria-label={`Remove pair ${i + 1}`}
              onClick={() => removePair(i)}
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" className="packs-btn btn" onClick={addPair}>
          Add pair
        </button>
      </div>

      {errors.length > 0 && (
        <ul className="packs-errors">
          {errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}

      <div className="packs-form-actions">
        <button
          type="button"
          className="packs-btn packs-btn-primary btn btn-primary"
          onClick={onSave}
        >
          Save pack
        </button>
        <button
          type="button"
          className="packs-btn packs-btn-ghost btn btn-ghost"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

function ImportPanel({
  onDone,
  onCancel,
}: {
  onDone: () => void
  onCancel: () => void
}): React.JSX.Element {
  const [text, setText] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [note, setNote] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function doImport(raw: string) {
    const result = validateCustomPack(raw)
    if (!result.ok) {
      setErrors(result.errors)
      setNote('')
      return
    }
    saveCustomPack(result.pack)
    setErrors([])
    setNote(`Imported “${result.pack.name}” (${result.pack.pairs.length} pairs).`)
    onDone()
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : ''
      setText(content)
      doImport(content)
    }
    reader.onerror = () => setErrors(['Could not read the selected file.'])
    reader.readAsText(file)
    // Reset so re-selecting the same file fires change again.
    e.target.value = ''
  }

  return (
    <>
      <h2 className="packs-section-title">Import pack</h2>

      <div className="packs-field">
        <label className="packs-label" htmlFor="packs-import-text">
          Paste pack JSON
        </label>
        <textarea
          id="packs-import-text"
          className="packs-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='{ "version": 1, "name": "...", "pairs": [{ "a": "...", "b": "..." }] }'
        />
      </div>

      <div className="packs-form-actions">
        <button
          type="button"
          className="packs-btn packs-btn-primary btn btn-primary"
          onClick={() => doImport(text)}
        >
          Import
        </button>
        <button
          type="button"
          className="packs-btn btn"
          onClick={() => fileRef.current?.click()}
        >
          Choose file
        </button>
        <button
          type="button"
          className="packs-btn packs-btn-ghost btn btn-ghost"
          onClick={onCancel}
        >
          Cancel
        </button>
        <input
          ref={fileRef}
          className="packs-hidden-file"
          type="file"
          accept=".json,application/json"
          aria-label="Import pack from file"
          onChange={onFile}
        />
      </div>

      {errors.length > 0 && (
        <ul className="packs-errors">
          {errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}
      {note && <p className="packs-note">{note}</p>}
    </>
  )
}
