import { useEffect, useRef, useState } from 'react'
import {
  Upload,
  FileText,
  Mic,
  Mail,
  X,
  Plus,
  CheckCircle,
} from 'lucide-react'
import { ProgressStepper } from '../components/forms/ProgressStepper'
import { INTAKE_FLOW_STEPS } from '../data/flow-steps'

interface SampleFile {
  id: string
  name: string
  size: string
  status: 'uploaded' | 'processing'
  icon: typeof FileText
}

const INITIAL_FILES: SampleFile[] = [
  {
    id: 'f1',
    name: 'school-brochure-harrow.pdf',
    size: '2.4 MB',
    status: 'uploaded',
    icon: FileText,
  },
  {
    id: 'f2',
    name: 'voice-note-what-we-want.m4a',
    size: '1.1 MB',
    status: 'processing',
    icon: Mic,
  },
  {
    id: 'f3',
    name: 'email-from-consultant.eml',
    size: '340 KB',
    status: 'uploaded',
    icon: Mail,
  },
]

type StepState = 'pending' | 'active' | 'complete'

interface ProcessingStep {
  pendingLabel: string
  completeLabel: string
}

const PROCESSING_STEPS: ProcessingStep[] = [
  { pendingLabel: 'Reading your documents...', completeLabel: 'Documents processed' },
  { pendingLabel: 'Identifying your preferences...', completeLabel: 'Preferences extracted' },
  { pendingLabel: 'Building your search profile...', completeLabel: 'Profile ready' },
]

interface DocumentUploadProps {
  onNavigate: (screen: string) => void
}

export function DocumentUpload({ onNavigate }: DocumentUploadProps) {
  const [files, setFiles] = useState(INITIAL_FILES)
  const [dragOver, setDragOver] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [stepStates, setStepStates] = useState<StepState[]>(['pending', 'pending', 'pending'])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!processing) return

    const timers: ReturnType<typeof setTimeout>[] = []

    ;[0, 1, 2].forEach((index) => {
      timers.push(
        setTimeout(() => {
          setStepStates((prev) => {
            const next = [...prev]
            next[index] = 'active'
            return next
          })
        }, index * 1500),
      )
      timers.push(
        setTimeout(
          () => {
            setStepStates((prev) => {
              const next = [...prev]
              next[index] = 'complete'
              return next
            })
          },
          index * 1500 + 1500,
        ),
      )
    })

    timers.push(
      setTimeout(() => {
        onNavigate('next-step')
      }, 4500),
    )

    return () => timers.forEach(clearTimeout)
  }, [processing, onNavigate])

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const handleBuildProfile = () => {
    setProcessing(true)
  }

  if (processing) {
    return (
      <div style={{ width: '100%', paddingTop: '48px', paddingBottom: '48px' }}>
        <div className="lw-form-card">
          <ProgressStepper steps={INTAKE_FLOW_STEPS} currentStep={2} />
          <div className="lw-processing-view">
            <div className="lw-spinner" />
            <div className="lw-processing-copy">
              We're reading through your documents and building your profile. This
              usually takes 1–2 minutes.
            </div>
            <div className="lw-processing-steps">
              {PROCESSING_STEPS.map((step, index) => {
                const state = stepStates[index]
                return (
                  <div key={index} className={`lw-processing-step ${state}`}>
                    {state === 'complete' && <CheckCircle size={16} />}
                    <span>{state === 'complete' ? `${step.completeLabel} ✓` : step.pendingLabel}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', paddingTop: '48px', paddingBottom: '48px' }}>
      <div className="lw-form-card">
        <ProgressStepper steps={INTAKE_FLOW_STEPS} currentStep={1} />

        {/* TODO(copy — Liam to finalise): clarify what documents/research are wanted and why */}
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 400,
            fontSize: '16px',
            color: 'var(--lw-text-secondary)',
            marginBottom: '24px',
          }}
        >
          Share anything you've already gathered — school brochures, notes from other consultants, voice memos of things you and your partner have discussed, emails from school contacts.
        </div>

        <div
          className={`lw-upload-zone${dragOver ? ' drag-over' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
          }}
        >
          <Upload size={32} color="var(--lw-text-muted)" />
          <div className="lw-upload-zone-title">Drag files here or tap to browse</div>
          <div className="lw-upload-zone-subtitle">
            PDFs, Word docs, images, voice notes, emails — anything you've collected
          </div>
          <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} />
        </div>

        <div className="lw-file-list">
          {files.map((file) => {
            const Icon = file.icon
            return (
              <div key={file.id} className="lw-file-card">
                <Icon size={20} className="lw-file-icon" />
                <div className="lw-file-name">{file.name}</div>
                <div className="lw-file-size">{file.size}</div>
                <div className={`lw-file-status ${file.status}`}>
                  <span className={`lw-file-status-dot ${file.status}`} />
                  {file.status === 'uploaded' ? 'Uploaded' : 'Processing'}
                </div>
                {file.status === 'uploaded' && (
                  <button
                    type="button"
                    className="lw-file-remove"
                    onClick={() => removeFile(file.id)}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <button type="button" className="lw-add-more" onClick={() => fileInputRef.current?.click()}>
          <Plus size={16} />
          Add more files
        </button>

        <button type="button" className="lw-btn-primary" onClick={handleBuildProfile}>
          Build my profile
        </button>

        <div className="lw-form-footer">Powered by Lawrence</div>
      </div>
    </div>
  )
}
