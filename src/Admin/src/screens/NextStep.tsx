import { Calendar, BookOpen } from 'lucide-react'
import { ProgressStepper } from '../components/forms/ProgressStepper'
import { INTAKE_FLOW_STEPS } from '../data/flow-steps'

interface NextStepProps {
  onNavigate: (screen: string) => void
}

export function NextStep({ onNavigate }: NextStepProps) {
  return (
    <div style={{ width: '100%', paddingTop: '48px', paddingBottom: '48px' }}>
      <div className="lw-form-card">
        <ProgressStepper steps={INTAKE_FLOW_STEPS} currentStep={3} />

        <div className="lw-section-header">Your Profile is Ready</div>

        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 400,
            fontSize: '16px',
            color: 'var(--lw-text)',
            marginBottom: '32px',
            lineHeight: 1.6,
          }}
        >
          {/* TODO(copy — Liam to finalise): explain next steps and options */}
          We've built your search profile based on everything you've shared. Here are two ways to move forward:
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
          {/* Book a call card */}
          <div
            style={{
              padding: '20px',
              border: '1px solid var(--lw-border)',
              borderRadius: 'var(--lw-radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '12px',
            }}
          >
            <Calendar size={32} color="var(--lw-accent)" strokeWidth={1.5} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--lw-text)' }}>Book a Consultation</div>
            <div style={{ fontSize: '13px', color: 'var(--lw-text-muted)', marginBottom: '12px' }}>
              Talk directly with an advisor about your child's journey
            </div>
            <a
              href="#"
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--lw-accent)',
                color: 'var(--lw-text-on-accent)',
                borderRadius: 'var(--lw-radius-lg)',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
                display: 'inline-block',
              }}
            >
              Schedule Call
            </a>
          </div>

          {/* View shortlist card */}
          <div
            style={{
              padding: '20px',
              border: '1px solid var(--lw-border)',
              borderRadius: 'var(--lw-radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '12px',
            }}
          >
            <BookOpen size={32} color="var(--lw-text-muted)" strokeWidth={1.5} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--lw-text)' }}>View Your Shortlist</div>
            <div style={{ fontSize: '13px', color: 'var(--lw-text-muted)', marginBottom: '12px' }}>
              See schools matched to your criteria
            </div>
            <button
              type="button"
              onClick={() => onNavigate('search-profile')}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: 'var(--lw-accent)',
                border: '1px solid var(--lw-accent)',
                borderRadius: 'var(--lw-radius-lg)',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              View Schools
            </button>
          </div>
        </div>

        {/* Retention/nurture note */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--lw-bg-subtle)',
            borderRadius: 'var(--lw-radius-lg)',
            fontSize: '13px',
            color: 'var(--lw-text-muted)',
            lineHeight: 1.6,
            marginBottom: '16px',
          }}
        >
          Even if you don't book a call right now, we'll keep your profile on file and follow up if anything changes. No pressure — we're here when you're ready.
        </div>

        <div className="lw-form-footer">Powered by Lawrence</div>
      </div>
    </div>
  )
}
