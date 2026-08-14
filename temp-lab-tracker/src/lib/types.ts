export type LabServiceSubType = {
  name: string;
  price: string;
};

export type LabService = {
  name: string;
  price: string;
  tat?: string; // Turn Around Time (e.g., "2 days")
  keywords?: string[];
  subTypes?: LabServiceSubType[];
};

export type Lab = {
  id: string;
  name: string;
  phone?: string;
  services?: LabService[];
  createdAt?: string;
  updatedAt?: string;
};

export type InstructionTemplate = {
  id: string;
  name: string; // The UI title of the template
  text: string; // The actual instruction text
  createdAt?: string;
  updatedAt?: string;
};

export type Patient = {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

export type DocumentRecord = {
  type: 'Challan' | 'Bill';
  amount?: string | number;
  photoUrl: string;
};

export type Submission = {
  id: string;
  type: 'send' | 'receive';
  senderName?: string;
  receiverName?: string;
  photoUrl: string; // Keep for backward compatibility or primary photo
  photoUrls?: string[]; // Multiple product photos
  deliveryPersonPhotoUrl?: string;
  senderSelfieUrl?: string;
  item: string;
  subType?: string;
  deliveryPerson?: string;
  labName: string;
  patientName: string;
  appointmentStatus: 'Appointment given' | 'Appointment not given';
  appointmentDate?: Date;
  createdAt: Date;
  servicePrice?: string; // Store price at time of submission
  remarks?: string; // Admin remarks for late delivery, etc.
  tat?: string; // Turn around time at time of submission
  linkedRecordId?: string; // ID of the sent record this is linked to
  
  // Billing fields
  documents?: DocumentRecord[];
  
  // UI fields for grouped records
  isReturned?: boolean;
  linkedReceiveRecord?: Submission;
  trail?: Submission[];

  // Approval Workflow
  approvalStatus?: 'Pending' | 'Approved' | 'Rejected';
  senderEmail?: string;
  
  isAlertResolved?: boolean;
  editLogs?: EditLog[];
};

export type EditLog = {
  timestamp: string;
  editorSelfieUrl: string;
  editorName: string;
  changes: string;
};

export interface LabTransaction {
  id: string;
  labName: string;
  amount: number; // positive for debit (we owe them), negative for credit (payment made)
  type: 'Bill' | 'Payment' | 'Adjustment';
  description: string;
  photoUrl?: string;
  createdAt: string;
  submissionId?: string; // Link to a send/receive record if applicable
}
