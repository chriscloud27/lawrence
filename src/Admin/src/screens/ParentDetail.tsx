import { useState } from 'react'
import { ArrowLeft, ArrowRight, Mail, Calendar, Pencil } from 'lucide-react'
import { sampleParents } from '../data/mock-data'
import { getScoreBand, getBandColor, getBandLabel } from '../utils/score'

interface ParentDetailProps {
  onNavigate: (screen: string) => void
}

type CriteriaTab = 'documents' | 'form' | 'conversation'

const CRITERIA_TABS: { id: CriteriaTab; label: string }[] = [
  { id: 'documents', label: 'From Documents' },
  { id: 'form', label: 'From Form' },
  { id: 'conversation', label: 'From Conversation' },
]

function authorityLabel(score: number): string {
  if (score >= 20) return 'Primary decision-maker'
  if (score >= 13) return 'Joint decision (with partner)'
  if (score >= 6) return 'Consulting with family'
  return 'Not primary decision-maker'
}

function needLabel(impetus: string, hasSpecialRequirements: boolean): string {
  return hasSpecialRequirements ? `${impetus} + learning support` : impetus
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function sourceLabel(source: string): string {
  return source.replace('Extracted from: ', '')
}

export function ParentDetail({ onNavigate }: ParentDetailProps) {
  const [activeTab, setActiveTab] = useState<CriteriaTab>('documents')

  const parent = sampleParents[0]
  const band = getScoreBand(parent.totalScore)
  const color = getBandColor(band)

  const surname = parent.name.split(' ').slice(1).join(' ')
  const childFullName = surname ? `${parent.childName} ${surname}` : parent.childName

  const hasSpecialRequirements = parent.criteria.some((c) => c.label === 'Special Requirements')

  const bantRows = [
    {
      key: 'budget',
      label: 'Budget',
      value: `${parent.budgetRange}/yr`,
      score: parent.bant.budget,
    },
    {
      key: 'authority',
      label: 'Authority',
      value: authorityLabel(parent.bant.authority),
      score: parent.bant.authority,
    },
    {
      key: 'need',
      label: 'Need',
      value: needLabel(parent.impetus, hasSpecialRequirements),
      score: parent.bant.need,
    },
    {
      key: 'timeline',
      label: 'Timeline',
      value: parent.timeline,
      score: parent.bant.timeline,
    },
  ]

  const keyFacts = [
    { label: 'Timeline', value: parent.timeline },
    { label: 'Boarding/Day', value: parent.boardingPreference },
    { label: 'Regions', value: parent.preferredRegions.join(', ') },
    { label: 'Budget', value: parent.budgetRange },
  ]

  const suggestedActions = [
    `Send an information pack building on the ${
      parent.documents[0]?.filename ?? 'school brochure'
    } she's already reviewed, matching her academic and boarding criteria.`,
    `Highlight learning support programmes for James's dyslexia in your call.`,
    `Confirm her partner's involvement — authority score is strong but based on one parent only.`,
  ]

  return (
    <div className="lw-pd-page">
      <button type="button" className="lw-pd-back-link" onClick={() => onNavigate('dashboard')}>
        <ArrowLeft size={16} />
        Back to Parents
      </button>

      <div className="lw-pd-header-card">
        <div className="lw-pd-header-top">
          <div className="lw-pd-header-left">
            <div className="lw-pd-name">{parent.name}</div>
            <div className="lw-pd-email">
              <Mail size={14} />
              {parent.email}
            </div>
            <div className="lw-pd-child-line">
              Parent of {childFullName} (Age {parent.childAge}, {parent.yearGroup})
            </div>
            <div className="lw-pd-facts-row">
              {keyFacts.map((fact, index) => (
                <span className="lw-pd-fact" key={fact.label}>
                  {index > 0 && <span className="lw-pd-fact-sep">·</span>}
                  <span className="lw-pd-fact-label">{fact.label}:</span>{' '}
                  <span className="lw-pd-fact-value">{fact.value}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="lw-pd-header-right">
            <div className="lw-pd-score">
              {parent.totalScore}
              <span className="lw-pd-score-suffix">/100</span>
            </div>
            <div className="lw-pd-score-pill" style={{ backgroundColor: color.bg, color: color.text }}>
              <span className="lw-pd-score-pill-dot" style={{ backgroundColor: color.dot }} />
              {getBandLabel(band)}
            </div>
          </div>
        </div>

        <div className="lw-pd-actions-row">
          <button type="button" className="lw-pd-action-btn">
            <Mail size={16} />
            Send Email
          </button>
          <button type="button" className="lw-pd-action-btn">
            <Calendar size={16} />
            Book Call
          </button>
          <button type="button" className="lw-pd-action-btn">
            <Pencil size={16} />
            Add Note
          </button>
        </div>
      </div>

      <div className="lw-pd-bant-grid">
        {bantRows.map((row) => (
          <div key={row.key} className={`lw-pd-bant-card ${row.score < 18 ? 'low' : ''}`}>
            <div className="lw-pd-bant-label">{row.label}</div>
            <div className="lw-pd-bant-value">{row.value}</div>
            <div className="lw-pd-bant-score">
              {row.score}
              <span className="lw-pd-bant-score-max">/25</span>
            </div>
          </div>
        ))}
      </div>

      <div className="lw-pd-section-label">AI Summary</div>
      <div className="lw-pd-summary">
        Sarah is researching boarding options for James ({parent.childAge}, mild dyslexia) with a
        focus on strong academics and established learning support. Budget sits at{' '}
        {parent.budgetRange}/yr, and she's flexible on boarding versus day depending on the right
        fit. She and her partner appear aligned on the decision, and she's targeting placement for{' '}
        {parent.timeline.toLowerCase()}. She's already reviewed a school brochure and left a
        detailed voice note on requirements — pastoral care and wellbeing support stand out as a
        top priority alongside her other preferences.
      </div>

      <div className="lw-pd-section-label">Extracted Criteria</div>
      <div className="lw-pd-tab-bar">
        {CRITERIA_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`lw-pd-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'documents' ? (
        <div className="lw-pd-table-wrap">
          <table className="lw-pd-table">
            <thead>
              <tr>
                <th>Criterion</th>
                <th>Value</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {parent.criteria.map((c) => (
                <tr key={c.id}>
                  <td>{c.label}</td>
                  <td>{c.value}</td>
                  <td className="lw-pd-td-source">{sourceLabel(c.source)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="lw-pd-empty-tab">No additional data</div>
      )}

      <div className="lw-pd-section-label">Activity</div>
      <div className="lw-pd-timeline">
        {parent.activities.map((activity, index) => (
          <div className="lw-pd-timeline-item" key={activity.id}>
            <div className="lw-pd-timeline-marker">
              <span className="lw-pd-timeline-dot" />
              {index < parent.activities.length - 1 && <span className="lw-pd-timeline-line" />}
            </div>
            <div className="lw-pd-timeline-content">
              <div className="lw-pd-timeline-time">{formatTimestamp(activity.timestamp)}</div>
              <div className="lw-pd-timeline-desc">{activity.description}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="lw-pd-section-label">Notes</div>
      <div className="lw-pd-notes-empty">
        <div className="lw-pd-notes-empty-text">
          No notes yet. Add your first note after speaking with this parent.
        </div>
        <button type="button" className="lw-pd-notes-add-btn">
          Add
        </button>
      </div>

      <div className="lw-pd-section-label">Suggested Actions</div>
      <div className="lw-pd-suggested-list">
        {suggestedActions.map((action) => (
          <div className="lw-pd-suggested-item" key={action}>
            <ArrowRight size={16} className="lw-pd-suggested-icon" />
            {action}
          </div>
        ))}
      </div>
    </div>
  )
}
