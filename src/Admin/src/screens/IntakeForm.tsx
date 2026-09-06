import { useState } from 'react'
import { ChevronDown, ArrowRight } from 'lucide-react'
import { FormField } from '../components/forms/FormField'
import { ChipSelect } from '../components/forms/ChipSelect'
import { TagInput } from '../components/forms/TagInput'
import {
  ageOptions,
  timelineOptions,
  budgetOptions,
  impetusOptions,
  curriculumOptions,
  boardingOptions,
  learningOptions,
} from '../data/form-options'

interface IntakeFormData {
  name: string
  email: string
  childName: string
  ageOrYear: string
  timeline: string
  budget: string
  impetus: string
  impetusOther: string
  curriculum: string
  boarding: string
  nationalities: string[]
  regions: string[]
  learning: string
  notes: string
}

const INITIAL_DATA: IntakeFormData = {
  name: '',
  email: '',
  childName: '',
  ageOrYear: '',
  timeline: '',
  budget: '',
  impetus: '',
  impetusOther: '',
  curriculum: '',
  boarding: '',
  nationalities: [],
  regions: [],
  learning: '',
  notes: '',
}

type RequiredField =
  | 'name'
  | 'email'
  | 'childName'
  | 'ageOrYear'
  | 'timeline'
  | 'budget'
  | 'impetus'
  | 'curriculum'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateField(field: RequiredField, data: IntakeFormData): string | undefined {
  switch (field) {
    case 'name':
      return data.name.trim().length >= 2 ? undefined : 'Please enter your full name.'
    case 'email':
      return EMAIL_REGEX.test(data.email) ? undefined : 'Please enter a valid email address.'
    case 'childName':
      return data.childName.trim().length > 0 ? undefined : "Please enter your child's name."
    case 'ageOrYear':
      return data.ageOrYear ? undefined : 'Please select an age or year group.'
    case 'timeline':
      return data.timeline ? undefined : 'Please select a timeline.'
    case 'budget':
      return data.budget ? undefined : 'Please select a budget range.'
    case 'impetus':
      return data.impetus ? undefined : 'Please select a reason.'
    case 'curriculum':
      return data.curriculum ? undefined : 'Please select a curriculum.'
  }
}

const REQUIRED_FIELDS: RequiredField[] = [
  'name',
  'email',
  'childName',
  'ageOrYear',
  'timeline',
  'budget',
  'impetus',
  'curriculum',
]

interface IntakeFormProps {
  onNavigate: (screen: string) => void
}

export function IntakeForm({ onNavigate }: IntakeFormProps) {
  const [data, setData] = useState<IntakeFormData>(INITIAL_DATA)
  const [touched, setTouched] = useState<Partial<Record<RequiredField, boolean>>>({})
  const [showOptional, setShowOptional] = useState(false)

  const update = <K extends keyof IntakeFormData>(field: K, value: IntakeFormData[K]) => {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  const handleBlur = (field: RequiredField) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const errorFor = (field: RequiredField) =>
    touched[field] ? validateField(field, data) : undefined

  const isFormValid = REQUIRED_FIELDS.every((field) => validateField(field, data) === undefined)

  const handleSubmit = () => {
    const allTouched = REQUIRED_FIELDS.reduce(
      (acc, field) => ({ ...acc, [field]: true }),
      {} as Partial<Record<RequiredField, boolean>>,
    )
    setTouched(allTouched)
    if (isFormValid) {
      onNavigate('document-upload')
    }
  }

  return (
    <div style={{ width: '100%', paddingTop: '48px', paddingBottom: '48px' }}>
      <div className="lw-form-card">
        <div className="lw-progress-label-top">Step 1 of 2</div>
        <div className="lw-progress">
          <div className="lw-progress-step">
            <div className="lw-progress-circle active" />
            <div className="lw-progress-step-label">Your details</div>
          </div>
          <div className="lw-progress-line" />
          <div className="lw-progress-step">
            <div className="lw-progress-circle inactive" />
            <div className="lw-progress-step-label">Upload research</div>
          </div>
        </div>

        <div className="lw-section-header">About You</div>

        <div className="lw-row-2col">
          <FormField label="Your name" required error={errorFor('name')}>
            <input
              className={`lw-input${errorFor('name') ? ' lw-error' : ''}`}
              type="text"
              value={data.name}
              onChange={(e) => update('name', e.target.value)}
              onBlur={() => handleBlur('name')}
            />
          </FormField>
          <FormField label="Your email" required error={errorFor('email')}>
            <input
              className={`lw-input${errorFor('email') ? ' lw-error' : ''}`}
              type="email"
              value={data.email}
              onChange={(e) => update('email', e.target.value)}
              onBlur={() => handleBlur('email')}
            />
          </FormField>
        </div>

        <FormField label="Child's first name" required error={errorFor('childName')}>
          <input
            className={`lw-input${errorFor('childName') ? ' lw-error' : ''}`}
            type="text"
            value={data.childName}
            onChange={(e) => update('childName', e.target.value)}
            onBlur={() => handleBlur('childName')}
          />
        </FormField>

        <div className="lw-section-header">About Your Search</div>

        <FormField label="Child's age or year group" required error={errorFor('ageOrYear')}>
          <select
            className={`lw-select${errorFor('ageOrYear') ? ' lw-error' : ''}`}
            value={data.ageOrYear}
            onChange={(e) => update('ageOrYear', e.target.value)}
            onBlur={() => handleBlur('ageOrYear')}
          >
            <option value="" disabled>
              Select an option
            </option>
            {ageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="When does your child need to start?" required error={errorFor('timeline')}>
          <select
            className={`lw-select${errorFor('timeline') ? ' lw-error' : ''}`}
            value={data.timeline}
            onChange={(e) => update('timeline', e.target.value)}
            onBlur={() => handleBlur('timeline')}
          >
            <option value="" disabled>
              Select an option
            </option>
            {timelineOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="What is your budget range per year?" required error={errorFor('budget')}>
          <select
            className={`lw-select${errorFor('budget') ? ' lw-error' : ''}`}
            value={data.budget}
            onChange={(e) => update('budget', e.target.value)}
            onBlur={() => handleBlur('budget')}
          >
            <option value="" disabled>
              Select an option
            </option>
            {budgetOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Why are you looking for a new school?" required error={errorFor('impetus')}>
          <select
            className={`lw-select${errorFor('impetus') ? ' lw-error' : ''}`}
            value={data.impetus}
            onChange={(e) => update('impetus', e.target.value)}
            onBlur={() => handleBlur('impetus')}
          >
            <option value="" disabled>
              Select an option
            </option>
            {impetusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>

        {data.impetus === 'Other' && (
          <FormField label="Tell us more">
            <textarea
              className="lw-textarea"
              rows={3}
              placeholder="Tell us more"
              value={data.impetusOther}
              onChange={(e) => update('impetusOther', e.target.value)}
            />
          </FormField>
        )}

        <FormField label="Current school type or curriculum" required error={errorFor('curriculum')}>
          <select
            className={`lw-select${errorFor('curriculum') ? ' lw-error' : ''}`}
            value={data.curriculum}
            onChange={(e) => update('curriculum', e.target.value)}
            onBlur={() => handleBlur('curriculum')}
          >
            <option value="" disabled>
              Select an option
            </option>
            {curriculumOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>

        <button
          type="button"
          className="lw-collapse-toggle"
          onClick={() => setShowOptional((prev) => !prev)}
        >
          Add more details (optional)
          <span className={`lw-collapse-icon${showOptional ? ' open' : ''}`}>
            <ChevronDown size={16} />
          </span>
        </button>

        {showOptional && (
          <div className="lw-collapse-body">
            <FormField label="Boarding or day?">
              <ChipSelect
                options={boardingOptions}
                value={data.boarding}
                onChange={(value) => update('boarding', value)}
              />
            </FormField>

            <FormField label="Nationality / passports held">
              <TagInput
                values={data.nationalities}
                onChange={(values) => update('nationalities', values)}
                placeholder="Type and press Enter"
              />
            </FormField>

            <FormField label="Preferred regions or countries">
              <TagInput
                values={data.regions}
                onChange={(values) => update('regions', values)}
                placeholder="Type and press Enter"
              />
            </FormField>

            <FormField label="Learning differences or special needs?">
              <ChipSelect
                options={learningOptions}
                value={data.learning}
                onChange={(value) => update('learning', value)}
              />
            </FormField>

            <FormField label="Anything else we should know?">
              <textarea
                className="lw-textarea"
                rows={3}
                value={data.notes}
                onChange={(e) => update('notes', e.target.value)}
              />
            </FormField>
          </div>
        )}

        <button
          type="button"
          className="lw-btn-primary"
          disabled={!isFormValid}
          onClick={handleSubmit}
        >
          Continue to upload your research
          <ArrowRight size={16} />
        </button>

        <div className="lw-form-footer">Powered by Lawrence</div>
      </div>
    </div>
  )
}
