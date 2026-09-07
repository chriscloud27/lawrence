export type ScoreBand = "cold" | "warm" | "qualified" | "hot";
export type ParentStatus = "new" | "contacted" | "in-progress" | "auto-nurture";
export type FormStatus = "live" | "draft" | "ab-test";
export type DocStatus = "uploaded" | "processing" | "processed";

export interface BANTScore {
  budget: number;     // 0-25
  authority: number;  // 0-25
  need: number;       // 0-25
  timeline: number;   // 0-25
}

export interface Parent {
  id: string;
  name: string;
  email: string;
  phone: string;
  childName: string;
  childAge: number;
  yearGroup: string;
  timeline: string;
  budgetRange: string;
  impetus: string;
  currentCurriculum: string;
  boardingPreference: string;
  nationality: string[];
  preferredRegions: string[];
  learningDifferences: string;
  bant: BANTScore;
  totalScore: number;
  band: ScoreBand;
  status: ParentStatus;
  documents: Document[];
  criteria: Criterion[];
  preferences: string[];
  activities: Activity[];
  profileCompleteness: number; // 0-100
  lastUpdatedDisplay: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  filename: string;
  size: string;
  type: string;
  status: DocStatus;
  criteriaExtracted: number;
}

export interface Criterion {
  id: string;
  label: string;
  value: string;
  source: string;
  editable: boolean;
}

export interface Activity {
  id: string;
  timestamp: string;
  description: string;
}

export interface IntakeForm {
  id: string;
  name: string;
  fieldCount: number;
  submissions: number;
  completionRate: number;
  status: FormStatus;
  lastEdited: string;
  isDefault: boolean;
}
