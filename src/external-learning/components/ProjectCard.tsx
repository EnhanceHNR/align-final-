
import React from 'react';
import { Project, ItemStatus } from '../types';
import { STATUS_COLORS } from '../constants';
import { ChevronRight, Calendar, User, Microscope } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onClick: (id: string) => void;
  prosthesisName?: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, prosthesisName }) => {
  return (
    <div 
      onClick={() => onClick(project.id)}
      className="glass-panel p-6 rounded-[2.5rem] hover:shadow-2xl transition-all cursor-pointer group border border-white/50"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-[10px] font-bold text-sky-600 uppercase tracking-widest bg-sky-50 px-2 py-1 rounded-full">
            {project.patientNumber}
          </span>
          <h3 className="text-xl font-bold text-slate-800 mt-2 group-hover:text-sky-600 transition-colors">
            {project.firstName} {project.lastName}
          </h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${STATUS_COLORS[project.status as keyof typeof STATUS_COLORS]}`}>
          {project.status.replace('_', ' ')}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex items-center space-x-2 text-slate-500">
          <Microscope size={16} />
          <span className="text-sm">{prosthesisName || project.defectArea}</span>
        </div>
        <div className="flex items-center space-x-2 text-slate-500">
          <Calendar size={16} />
          <span className="text-sm">{project.age} yrs • {project.gender}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="flex items-center space-x-2 text-slate-400">
          <User size={14} />
          <span className="text-xs font-medium">Dr. {project.clinicianName}</span>
        </div>
        <ChevronRight size={20} className="text-slate-300 group-hover:text-sky-600 group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
};

export default ProjectCard;
