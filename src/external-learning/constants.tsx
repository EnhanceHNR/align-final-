
import React from 'react';
import { 
  Activity, 
  Users, 
  ClipboardList, 
  Settings, 
  CheckCircle2, 
  Clock, 
  Lock, 
  LayoutDashboard,
  Box,
  BrainCircuit,
  UserCircle
} from 'lucide-react';

export const DEFECT_AREAS = [
  'trans-tibial',
  'trans-femoral',
  'partial-foot',
  'hip-disarticulation',
  'trans-radial',
  'trans-humeral'
];

export const MATERIAL_TYPES = [
  'Polypropylene',
  'Polyethylene',
  'Carbon Fiber',
  'Silicon',
  'Copolyester'
];

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'team_member'] },
  { id: 'projects', label: 'Projects', icon: ClipboardList, roles: ['admin', 'team_member'] },
  { id: 'team', label: 'Team', icon: Users, roles: ['admin'] },
  { id: 'templates', label: 'Workflows', icon: Box, roles: ['admin'] },
  { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin', 'team_member'] },
];

export const STATUS_COLORS = {
  pending: 'bg-slate-200 text-slate-600',
  in_progress: 'bg-sky-100 text-sky-700',
  completed: 'bg-emerald-100 text-emerald-700',
  locked: 'bg-slate-100 text-slate-400',
};
