
export type UserRole = 'admin' | 'team_member' | 'clinician';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  avatar?: string;
}

export type ItemStatus = 'pending' | 'in_progress' | 'completed' | 'locked' | 'on_hold' | 'rejected' | 'pending_approval';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  imageUrl?: string;
  timestamp: string;
}

export interface ResetLog {
  stageName: string;
  adminName: string;
  remark: string;
  timestamp: string;
}

export interface StageApproval {
  approverId: string;
  approverName: string;
  approverRole: UserRole;
  timestamp: string;
}

export type InputDataFormat = 'CT' | 'CBCT' | 'Facial Scan' | 'Mobile Phone scan';

export interface InputDataEntry {
  type: InputDataFormat;
  // CT / CBCT fields
  resolution?: string;
  sliceThickness?: string;
  gapInterval?: string;
  // Mobile Photogrammetry specific fields
  phoneModel?: string;
  phoneTier?: 'Low' | 'Med' | 'High';
  dataType?: 'Videos' | 'Photos';
  lightSource?: 'Natural' | 'Artificial';
  artificialLightType?: 'Home' | 'Photo Studio';
  pgSoftware?: string;
}

export interface DriveLink {
  label: string;
  type: string;
  url: string;
}

export interface Project {
  id: string;
  patientNumber: string;
  projectFolder: string;
  projectLink?: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  defectArea: string;
  materialType: 'fdm' | 'sla' | 'combination';
  inputData: InputDataFormat[]; 
  inputDataEntries?: InputDataEntry[];
  inputDataLinks?: DriveLink[];
  instructions?: string;
  pgSoftware: string;
  clinicianId: string;
  clinicianName: string;
  clinicianLocation?: string;
  patientLocation?: string;
  assignedEmployeeIds: string[];
  status: ItemStatus;
  currentStageNumber: number;
  processPhase: 'pattern' | 'poll';
  createdAt: string;
  createdByAdminId?: string;
  createdByAdminName?: string;
  trail: ChatMessage[];
  resetLogs?: ResetLog[];
  recordings?: Record<string, string>; 
  recordingHistory?: Record<string, string[]>; 
  approvals?: Record<string, StageApproval>; 
  clinicianApprovals?: Record<string, StageApproval>; 
  pendingApprovals?: Record<string, boolean>;
  pendingClinicianApprovals?: Record<string, boolean>;
  stageStartTimes?: Record<string, string>; // NEW: Tracks when "Start Node" was clicked
  completedSteps?: Record<string, boolean>; 
  stepResults?: Record<string, string>; // Stores technical measurements/reports
  stageFiles?: Record<string, string[]>; // New: Map of stageId to array of file URLs
  stageTrails?: Record<string, ChatMessage[]>; // New: Map of stageId to feedback trail
}

export interface StageStep {
  id: string;
  name: string;
  description: string;
  keyValue?: string;
  isCompleted: boolean;
  requiresMeasurement?: boolean; // New: Toggle for technical reporting
  measurementLabel?: string;    // New: Label for the input (e.g. "Weight", "Offset")
}

export interface StageTemplate {
  id: string;
  name: string;
  phase: 'pattern' | 'mold';
  category: string;
  stageNumber: number;
  software?: string;
  tutorialVideoUrl?: string;
  referenceLinks?: { label: string; url: string }[];
  isKeyStage: boolean;
  steps: StageStep[];
  requiresApproval?: boolean;
  requiresClinicianApproval?: boolean;
  guidelines?: string;
}

export interface ImageLearningCategory {
  id: string;
  name: string;
}

export interface ImageLearningItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  imageUrl: string;
  createdAt: number;
}
