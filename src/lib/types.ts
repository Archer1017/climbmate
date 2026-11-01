import type { AiRouteSuggestion } from './ai.ts';
export type ClimbingType = 'bouldering' | 'sport' | 'trad' | 'indoor';
export type Environment = 'indoor' | 'outdoor';
export type GradeSystem = 'V' | 'Font' | 'French' | 'YDS';
export type TrainingStage = 'beginner' | 'novice' | 'intermediate' | 'advanced';

export interface User {
  id: string;
  name: string;
  goal: string;
  stage: TrainingStage;
  preferredTypes: ClimbingType[];
  weeklyGoal: number;
  notifications: boolean;
}
export interface ClimbingRoute {
  id: string;
  name: string;
  type: ClimbingType;
  environment: Environment;
  location: string;
  region: string;
  gradeSystem: GradeSystem;
  grade: string;
  lengthMeters: number;
  styles: string[];
  image: string;
  description: string;
  requiredGear: string[];
  source: 'demo';
}
export interface GearInspection {
  date: string;
  result: 'passed' | 'needs-review' | 'retired';
  notes: string;
}
export interface GearItem {
  id: string;
  ownerId: string;
  name: string;
  category: 'basic' | 'safety' | 'outdoor' | 'care';
  brand: string;
  model: string;
  purchaseDate: string;
  inspections: GearInspection[];
  notes: string;
}
export interface ChecklistItem {
  id: string;
  name: string;
  category: 'basic' | 'safety' | 'outdoor' | 'planning';
  checked: boolean;
  critical: boolean;
  note: string;
}
export interface Trip {
  id: string;
  ownerId: string;
  title: string;
  destination: string;
  date: string;
  departureTime: string;
  durationMinutes: number;
  type: ClimbingType;
  environment: Environment;
  companions: string;
  routeIds: string[];
  transport: string;
  emergencyContact: string;
  returnPlan: string;
  checklist: ChecklistItem[];
  notes: string;
}
export interface RouteAttempt {
  routeId: string;
  routeName: string;
  gradeSystem: GradeSystem;
  grade: string;
  // 精简记录不再收集次数与完攀结果；null 表示未记录，保留旧记录的实际数值。
  attempts: number | null;
  completed: boolean | null;
  failureReason: string;
  notes: string;
}
export interface ClimbingSession {
  id: string;
  ownerId: string;
  date: string;
  location: string;
  type: ClimbingType;
  durationMinutes: number;
  attempts: RouteAttempt[];
  effort: number;
  // 保留历史状态，新建精简记录使用 null。
  mood: 'great' | 'good' | 'okay' | 'tired' | null;
  notes: string;
  image?: string;
}
export interface TrainingExercise {
  id: string;
  name: string;
  durationMinutes: number;
  completed: boolean;
  instructions: string;
}
export interface TrainingPlan {
  id: string;
  ownerId: string;
  goal: string;
  date: string;
  stage: TrainingStage;
  exercises: TrainingExercise[];
  recoveryNotes: string;
}
export interface SavedChecklist {
  id: string;
  name: string;
  type: ClimbingType;
  environment: Environment;
  items: ChecklistItem[];
}
export type HoldRole = 'start' | 'hand' | 'foot' | 'finish';
export interface PhotoHold {
  id: string;
  x: number;
  y: number;
  role: HoldRole;
}
export interface PhotoRoute {
  id: string;
  ownerId: string;
  favorite: boolean;
  name: string;
  location: string;
  image: string;
  holds: PhotoHold[];
  focus: 'technique' | 'balance' | 'reading' | 'endurance';
  notes: string;
  source: 'manual' | 'deepseek';
  ai?: AiRouteSuggestion;
  createdAt: string;
  updatedAt: string;
}
export interface AppState {
  version: 1;
  user: User;
  favoriteRouteIds: string[];
  trips: Trip[];
  sessions: ClimbingSession[];
  gear: GearItem[];
  trainingPlans: TrainingPlan[];
  savedChecklists: SavedChecklist[];
  photoRoutes: PhotoRoute[];
}
export const TYPE_LABELS: Record<ClimbingType, string> = {
  bouldering: '抱石',
  sport: '运动攀',
  trad: '传统攀',
  indoor: '室内难度',
};
export const STAGE_LABELS: Record<TrainingStage, string> = {
  beginner: '新手',
  novice: '初级',
  intermediate: '中级',
  advanced: '高级',
};
export const GRADE_OPTIONS: Record<GradeSystem, string[]> = {
  V: [
    'VB',
    'V0',
    'V1',
    'V2',
    'V3',
    'V4',
    'V5',
    'V6',
    'V7',
    'V8',
    'V9',
    'V10',
    'V11',
    'V12',
    'V13',
    'V14',
    'V15',
    'V16',
    'V17',
  ],
  Font: [
    '3',
    '4',
    '4+',
    '5',
    '5+',
    '6A',
    '6A+',
    '6B',
    '6B+',
    '6C',
    '6C+',
    '7A',
    '7A+',
    '7B',
    '7B+',
    '7C',
    '7C+',
    '8A',
    '8A+',
    '8B',
    '8B+',
    '8C',
    '8C+',
    '9A',
  ],
  French: [
    '3',
    '4a',
    '4b',
    '4c',
    '5a',
    '5b',
    '5c',
    '6a',
    '6a+',
    '6b',
    '6b+',
    '6c',
    '6c+',
    '7a',
    '7a+',
    '7b',
    '7b+',
    '7c',
    '7c+',
    '8a',
    '8a+',
    '8b',
    '8b+',
    '8c',
    '8c+',
    '9a',
    '9a+',
    '9b',
    '9b+',
    '9c',
  ],
  YDS: [
    '5.0',
    '5.1',
    '5.2',
    '5.3',
    '5.4',
    '5.5',
    '5.6',
    '5.7',
    '5.8',
    '5.9',
    '5.10a',
    '5.10b',
    '5.10c',
    '5.10d',
    '5.11a',
    '5.11b',
    '5.11c',
    '5.11d',
    '5.12a',
    '5.12b',
    '5.12c',
    '5.12d',
    '5.13a',
    '5.13b',
    '5.13c',
    '5.13d',
    '5.14a',
    '5.14b',
    '5.14c',
    '5.14d',
    '5.15a',
    '5.15b',
    '5.15c',
    '5.15d',
  ],
};
