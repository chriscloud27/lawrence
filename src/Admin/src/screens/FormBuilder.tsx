import { useState } from 'react'
import {
  Plus,
  Pencil,
  Copy,
  Archive,
  ArrowLeft,
  Type,
  Mail,
  ChevronDown,
  ToggleLeft,
  Tag,
  AlignLeft,
  Upload,
  Calendar,
  GripVertical,
  Eye,
  X,
} from 'lucide-react'
import { sampleForms } from '../data/mock-data'
import { ageOptions, budgetOptions, impetusOptions, timelineOptions } from '../data/form-options'
import type { FormStatus, IntakeForm } from '../types/lawrence'

type FieldType = 'text' | 'email' | 'dropdown' | 'chips' | 'tags' | 'textarea' | 'file' | 'date'

type BantMapping = 'None' | 'Budget' | 'Authority' | 'Need' | 'Timeline'

interface BuilderField {
  id: string
  type: FieldType
  label: string
  placeholder: string
  required: boolean
  helpText: string
  bant: BantMapping
  options?: string[]
}

const PALETTE: { type: FieldType; label: string; icon: typeof Type }[] = [
  { type: 'text', label: 'Text Input', icon: Type },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'dropdown', label: 'Dropdown', icon: ChevronDown },
  { type: 'chips', label: 'Multi-Select Chips', icon: ToggleLeft },
  { type: 'tags', label: 'Tag Input', icon: Tag },
  { type: 'textarea', label: 'Textarea', icon: AlignLeft },
  { type: 'file', label: 'File Upload', icon: Upload },
  { type: 'date', label: 'Date Picker', icon: Calendar },
]

const BANT_OPTIONS: BantMapping[] = ['None', 'Budget', 'Authority', 'Need', 'Timeline']

const SAMPLE_FIELDS: BuilderField[] = [
  {
    id: 'field-001',
    type: 'text',
    label: 'Your name',
    placeholder: 'Jane Mitchell',
    required: true,
    helpText: '',
    bant: 'None',
  },
  {
    id: 'field-002',
    type: 'dropdown',
    label: "Child's age",
    placeholder: 'Select an option',
    required: true,
    helpText: '',
    bant: 'Need',
    options: ageOptions,
  },
  {
    id: 'field-003',
    type: 'dropdown',
    label: 'Budget range',
    placeholder: 'Select an option',
    required: true,
    helpText: 'Per year, including boarding fees where relevant.',
    bant: 'Budget',
    options: budgetOptions,
  },
  {
    id: 'field-004',
    type: 'dropdown',
    label: 'Why are you looking?',
    placeholder: 'Select an option',
    required: true,
    helpText: '',
    bant: 'Need',
    options: impetusOptions,
  },
  {
    id: 'field-005',
    type: 'dropdown',
    label: 'When does your child need to start?',
    placeholder: 'Select an option',
    required: true,
    helpText: '',
    bant: 'Timeline',
    options: timelineOptions,
  },
]

const STATUS_LABEL: Record<FormStatus, string> = {
  live: 'Live',
  draft: 'Draft',
  'ab-test': 'A/B Test',
}

function formatLastEdited(iso: string): string {
  const then = new Date(iso).getTime()
  const hours = (Date.now() - then) / 36e5
  if (hours < 1) return 'less than an hour ago'
  if (hours < 24) return `${Math.round(hours)} hours ago`
  if (hours < 24 * 30) return `${Math.round(hours / 24)} days ago`
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface FieldPreviewProps {
  field: BuilderField
}

function FieldPreview({ field }: FieldPreviewProps) {
  return (
    <>
      <label className="lw-field-label">
        {field.label}
        {field.required && <span className="lw-required">*</span>}
      </label>
      {field.type === 'dropdown' ? (
        <select className="lw-select" defaultValue="">
          <option value="" disabled>
            {field.placeholder || 'Select an option'}
          </option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea className="lw-textarea" rows={3} placeholder={field.placeholder} />
      ) : (
        <input
          className="lw-input"
          type={field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : 'text'}
          placeholder={field.placeholder}
        />
      )}
      {field.helpText && <div className="lw-fb-help-text">{field.helpText}</div>}
    </>
  )
}

export function FormBuilder() {
  const [editingForm, setEditingForm] = useState<IntakeForm | null>(null)
  const [formName, setFormName] = useState('')
  const [fields, setFields] = useState<BuilderField[]>(SAMPLE_FIELDS)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [dragFieldId, setDragFieldId] = useState<string | null>(null)
  const [showParentPreview, setShowParentPreview] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null

  const notify = (message: string) => {
    console.log(message)
    setToast(message)
    window.setTimeout(() => setToast(null), 2500)
  }

  const openForm = (form: IntakeForm) => {
    setEditingForm(form)
    setFormName(form.name)
    setFields(SAMPLE_FIELDS)
    setSelectedFieldId(null)
    setShowParentPreview(false)
  }

  const closeForm = () => {
    setEditingForm(null)
    setSelectedFieldId(null)
    setShowParentPreview(false)
  }

  const updateSelected = <K extends keyof BuilderField>(key: K, value: BuilderField[K]) => {
    if (!selectedFieldId) return
    setFields((prev) =>
      prev.map((f) => (f.id === selectedFieldId ? { ...f, [key]: value } : f)),
    )
  }

  const handleDrop = (targetId: string) => {
    if (!dragFieldId || dragFieldId === targetId) return
    setFields((prev) => {
      const from = prev.findIndex((f) => f.id === dragFieldId)
      const to = prev.findIndex((f) => f.id === targetId)
      if (from < 0 || to < 0) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
    setDragFieldId(null)
  }

  const toastNode = toast ? <div className="lw-fb-toast">{toast}</div> : null

  if (!editingForm) {
    return (
      <div className="lw-fb-page">
        <div className="lw-fb-header-row">
          <div className="lw-fb-title">Intake Forms</div>
          <button
            type="button"
            className="lw-fb-btn-secondary"
            onClick={() => notify('New form created (prototype — nothing saved)')}
          >
            <Plus size={16} />
            New Form
          </button>
        </div>

        <div className="lw-fb-list">
          {sampleForms.map((form) => (
            <div
              key={form.id}
              className="lw-fb-card"
              role="button"
              tabIndex={0}
              onClick={() => openForm(form)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openForm(form)
                }
              }}
            >
              <span className={`lw-fb-radio${form.isDefault ? ' filled' : ''}`}>
                {form.isDefault && <span className="lw-fb-radio-dot" />}
              </span>

              <div className="lw-fb-card-body">
                <div className="lw-fb-card-name-row">
                  <span className="lw-fb-card-name">{form.name}</span>
                  <span className={`lw-fb-pill ${form.status}`}>{STATUS_LABEL[form.status]}</span>
                </div>
                <div className="lw-fb-card-stats">
                  {form.fieldCount} fields · {form.submissions} submissions ·{' '}
                  {Math.round(form.completionRate * 100)}% completion · {STATUS_LABEL[form.status]}
                </div>
                <div className="lw-fb-card-edited">
                  Last edited: {formatLastEdited(form.lastEdited)}
                </div>
              </div>

              <div className="lw-fb-row-actions">
                <button
                  type="button"
                  className="lw-fb-ghost-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    openForm(form)
                  }}
                >
                  <Pencil size={14} />
                  Edit
                </button>
                <button
                  type="button"
                  className="lw-fb-ghost-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    notify(`Duplicated "${form.name}" (prototype — nothing saved)`)
                  }}
                >
                  <Copy size={14} />
                  Duplicate
                </button>
                <button
                  type="button"
                  className="lw-fb-ghost-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    notify(`Archived "${form.name}" (prototype — nothing saved)`)
                  }}
                >
                  <Archive size={14} />
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>

        {toastNode}
      </div>
    )
  }

  return (
    <div className="lw-fb-page-wide">
      <div className="lw-fb-action-bar">
        <button type="button" className="lw-fb-back-link" onClick={closeForm}>
          <ArrowLeft size={16} />
          Back to Forms
        </button>
        <div className="lw-fb-action-bar-right">
          <button
            type="button"
            className="lw-fb-btn-secondary"
            onClick={() => notify('Saved as draft (prototype — nothing saved)')}
          >
            Save as Draft
          </button>
          <button
            type="button"
            className="lw-fb-btn-primary"
            onClick={() => notify('Published (prototype — nothing saved)')}
          >
            Publish
          </button>
        </div>
      </div>

      <div className="lw-fb-panels">
        <div>
          <div className="lw-fb-panel-header">Add Field</div>
          <div className="lw-fb-palette">
            {PALETTE.map(({ type, label, icon: Icon }) => (
              <button key={type} type="button" className="lw-fb-palette-item" draggable>
                <span className="lw-fb-palette-icon">
                  <Icon size={16} />
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="lw-fb-center-head">
            <input
              className="lw-fb-name-input"
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              aria-label="Form name"
            />
            <button
              type="button"
              className="lw-fb-btn-secondary"
              onClick={() => setShowParentPreview(true)}
            >
              <Eye size={16} />
              Preview as parent
            </button>
          </div>

          <div className="lw-fb-preview">
            {fields.map((field) => (
              <div
                key={field.id}
                className={`lw-fb-preview-field${
                  selectedFieldId === field.id ? ' selected' : ''
                }${dragFieldId === field.id ? ' dragging' : ''}`}
                onClick={() => setSelectedFieldId(field.id)}
                draggable
                onDragStart={() => setDragFieldId(field.id)}
                onDragEnd={() => setDragFieldId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(field.id)}
              >
                <span className="lw-fb-drag-handle">
                  <GripVertical size={16} />
                </span>
                <div className="lw-fb-preview-field-body">
                  <FieldPreview field={field} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="lw-fb-panel-header">Field Settings</div>
          <div className="lw-fb-config">
            {!selectedField ? (
              <div className="lw-fb-config-empty">Select a field to configure</div>
            ) : (
              <>
                <div className="lw-field">
                  <label className="lw-field-label">Label</label>
                  <input
                    className="lw-input"
                    type="text"
                    value={selectedField.label}
                    onChange={(e) => updateSelected('label', e.target.value)}
                  />
                </div>

                <div className="lw-field">
                  <label className="lw-field-label">Placeholder</label>
                  <input
                    className="lw-input"
                    type="text"
                    value={selectedField.placeholder}
                    onChange={(e) => updateSelected('placeholder', e.target.value)}
                  />
                </div>

                <div className="lw-fb-toggle-row">
                  <span className="lw-field-label" style={{ marginBottom: 0 }}>
                    Required
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={selectedField.required}
                    aria-label="Required"
                    className={`lw-fb-toggle${selectedField.required ? ' on' : ''}`}
                    onClick={() => updateSelected('required', !selectedField.required)}
                  >
                    <span className="lw-fb-toggle-knob" />
                  </button>
                </div>

                <div className="lw-field">
                  <label className="lw-field-label">Help text</label>
                  <input
                    className="lw-input"
                    type="text"
                    value={selectedField.helpText}
                    onChange={(e) => updateSelected('helpText', e.target.value)}
                  />
                </div>

                <div className="lw-field" style={{ marginBottom: 0 }}>
                  <label className="lw-field-label">BANT Mapping</label>
                  <select
                    className="lw-select"
                    value={selectedField.bant}
                    onChange={(e) => updateSelected('bant', e.target.value as BantMapping)}
                  >
                    {BANT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showParentPreview && (
        <div className="lw-fb-modal-root" role="dialog" aria-modal="true" aria-label="Form preview">
          <button
            type="button"
            className="lw-fb-modal-backdrop"
            aria-label="Close preview"
            onClick={() => setShowParentPreview(false)}
          />
          <div className="lw-fb-modal-card">
            <button
              type="button"
              className="lw-fb-modal-close"
              aria-label="Close preview"
              onClick={() => setShowParentPreview(false)}
            >
              <X size={18} />
            </button>
            <div className="lw-fb-modal-title">{formName}</div>
            {fields.map((field) => (
              <div className="lw-field" key={field.id}>
                <FieldPreview field={field} />
              </div>
            ))}
            <div className="lw-form-footer">Powered by Lawrence</div>
          </div>
        </div>
      )}

      {toastNode}
    </div>
  )
}
