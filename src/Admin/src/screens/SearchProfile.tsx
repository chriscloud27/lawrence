import { useRef, useState } from 'react'
import { Pencil, Plus, GripVertical } from 'lucide-react'
import { sampleParents } from '../data/mock-data'
import { getScoreBand, getBandColor, getBandLabel } from '../utils/score'
import type { Criterion } from '../types/lawrence'

const sarah = sampleParents[0]

export function SearchProfile() {
  const band = getScoreBand(sarah.totalScore)
  const bandColor = getBandColor(band)

  const [criteria, setCriteria] = useState<Criterion[]>(sarah.criteria)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState('')

  const [preferences, setPreferences] = useState<string[]>(sarah.preferences)
  const dragIndex = useRef<number | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)

  const startEdit = (criterion: Criterion) => {
    setEditingId(criterion.id)
    setDraftValue(criterion.value)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraftValue('')
  }

  const saveEdit = (id: string) => {
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, value: draftValue } : c)))
    setEditingId(null)
    setDraftValue('')
  }

  const handleDragStart = (index: number) => {
    dragIndex.current = index
    setDragging(index)
  }

  const handleDragEnter = (index: number) => {
    if (dragIndex.current === null || dragIndex.current === index) return
    setPreferences((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex.current!, 1)
      next.splice(index, 0, moved)
      return next
    })
    dragIndex.current = index
    setDragging(index)
  }

  const handleDragEnd = () => {
    dragIndex.current = null
    setDragging(null)
  }

  return (
    <div className="lw-sp-page">
      <div className="lw-sp-summary-card">
        <button type="button" className="lw-sp-edit-btn" aria-label="Edit profile">
          <Pencil size={16} />
        </button>

        <div className="lw-sp-summary-name">{sarah.name}</div>
        <div className="lw-sp-summary-child">
          Parent of {sarah.childName} (Age {sarah.childAge}, {sarah.yearGroup})
        </div>

        <div className="lw-sp-summary-facts">
          <div className="lw-sp-summary-fact">
            <span className="lw-sp-summary-fact-label">Looking for: </span>
            <span className="lw-sp-summary-fact-value">{sarah.boardingPreference} school</span>
          </div>
          <div className="lw-sp-summary-fact">
            <span className="lw-sp-summary-fact-label">Regions: </span>
            <span className="lw-sp-summary-fact-value">{sarah.preferredRegions.join(', ')}</span>
          </div>
          <div className="lw-sp-summary-fact">
            <span className="lw-sp-summary-fact-label">Timeline: </span>
            <span className="lw-sp-summary-fact-value">{sarah.timeline}</span>
          </div>
        </div>

        <div className="lw-sp-progress-row">
          <div className="lw-sp-progress-label">Profile completeness: {sarah.profileCompleteness}%</div>
          <div className="lw-sp-progress-track">
            <div
              className="lw-sp-progress-fill"
              style={{ width: `${sarah.profileCompleteness}%` }}
            />
          </div>
        </div>

        <div className="lw-sp-bant-row">
          <span className="lw-sp-bant-score">BANT Score: {sarah.totalScore}/100</span>
          <span
            className="lw-sp-band-pill"
            style={{ backgroundColor: bandColor.bg, color: bandColor.text }}
          >
            <span className="lw-sp-band-dot" style={{ backgroundColor: bandColor.dot }} />
            {getBandLabel(band)}
          </span>
        </div>

        <div className="lw-sp-summary-updated">Last updated: {sarah.lastUpdatedDisplay}</div>
      </div>

      <div className="lw-sp-section-header">Search Criteria</div>
      <div className="lw-sp-criteria-list">
        {criteria.map((criterion) => {
          const isEditing = editingId === criterion.id
          return (
            <div key={criterion.id} className="lw-sp-criteria-card">
              <div className="lw-sp-criteria-top">
                <div style={{ flex: 1 }}>
                  <div className="lw-sp-criteria-label">{criterion.label}</div>
                  {isEditing ? (
                    <textarea
                      className="lw-sp-criteria-textarea"
                      rows={3}
                      value={draftValue}
                      onChange={(e) => setDraftValue(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <div className="lw-sp-criteria-value">{criterion.value}</div>
                  )}
                  <div className="lw-sp-criteria-source">Source: {criterion.source}</div>
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    className="lw-sp-icon-btn"
                    aria-label={`Edit ${criterion.label}`}
                    onClick={() => startEdit(criterion)}
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
              {isEditing && (
                <div className="lw-sp-criteria-actions">
                  <button
                    type="button"
                    className="lw-sp-btn-save"
                    onClick={() => saveEdit(criterion.id)}
                  >
                    Save
                  </button>
                  <button type="button" className="lw-sp-btn-cancel" onClick={cancelEdit}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <button type="button" className="lw-sp-add-link">
        <Plus size={16} />
        Add a criterion
      </button>

      <div className="lw-sp-section-header">What Matters Most</div>
      <div className="lw-sp-pref-list">
        {preferences.map((pref, index) => (
          <div
            key={pref}
            className={`lw-sp-pref-row${dragging === index ? ' dragging' : ''}`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
          >
            <span className="lw-sp-pref-rank">{index + 1}.</span>
            <span className="lw-sp-pref-handle">
              <GripVertical size={16} />
            </span>
            <span className="lw-sp-pref-text">{pref}</span>
          </div>
        ))}
      </div>
      <button type="button" className="lw-sp-add-link">
        <Plus size={16} />
        Add preference
      </button>

      <div className="lw-sp-section-header">Uploaded Documents</div>
      <div className="lw-sp-doc-list">
        {sarah.documents.map((doc) => (
          <div key={doc.id} className="lw-sp-doc-row">
            <span className="lw-sp-doc-name">{doc.filename}</span>
            <span className="lw-sp-doc-status">Processed</span>
            <span className="lw-sp-doc-criteria">{doc.criteriaExtracted} extracted</span>
            <span className="lw-sp-doc-actions">
              <button type="button" className="lw-sp-doc-action">
                {doc.type === 'Audio' ? 'View transcript' : 'View'}
              </button>
              <button type="button" className="lw-sp-doc-action">
                Remove
              </button>
            </span>
          </div>
        ))}
      </div>
      <button type="button" className="lw-btn-secondary lw-sp-upload-more">
        Upload more
      </button>

      <div className="lw-sp-footer">Powered by Lawrence</div>
    </div>
  )
}
