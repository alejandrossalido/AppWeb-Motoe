
export type Role = 'owner' | 'coordinator' | 'team_lead' | 'member' | 'partner';
export type Branch = 'Eléctrica' | 'Mecánica' | 'Administración';
export type TaskStatus = 'proposed' | 'available' | 'in_progress' | 'completed';
export type UserStatus = 'pending' | 'active' | 'rejected' | 'removed';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Campo añadido para validación
  role: Role;
  branch: Branch;
  subteam: string;
  status: UserStatus;
  totalHours: number;
  totalCredits: number;
  avatar: string;
  currentClockIn?: string; // ISO string
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'Baja' | 'Media' | 'Alta';
  status: TaskStatus;
  branch: Branch;
  subteam: string;
  assignedTo?: string;
  creditsValue: number;
  icon: string;
  createdBy: string;
  createdAt: string; // ISO string
  completedAt?: string; // ISO string
  completedBy?: string; // User Name
}

export interface TimeEntry {
  id: string;
  userId: string;
  clockIn: string;
  clockOut?: string;
  durationMinutes: number;
  summary: string;
  creditsEarned: number;
  status: 'active' | 'completed' | 'validated';
}

export interface Request {
  id: string;
  uid: string;
  fullName: string;
  type: 'join' | 'change_team';
  branch: Branch;
  subteam: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  branch: Branch | 'Global';
  type: 'meeting' | 'feria';
}

export interface MotoSpec {
  id: string;
  category: string;
  component_name: string;
  spec_value: string;
  notes?: string;
  created_at: string;
}

