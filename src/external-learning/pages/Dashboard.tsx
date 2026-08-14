import React from 'react';
import { Project, UserProfile } from '../types';
import { Activity, ClipboardCheck, Clock, Users, ArrowUpRight, TrendingUp, PlayCircle, ArrowRight } from 'lucide-react';

interface DashboardProps {
  projects?: Project[];
  users?: UserProfile[];
  onProjectClick?: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ projects = [], users = [], onProjectClick }) => {
  const activeProjects = projects.filter(p => p.status === 'in_progress').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const teamSize = users.length;
  const completionRate = projects.length ? Math.round((completedProjects / projects.length) * 100) : 0;

  const stats = [
    { label: 'Active Processes', value: activeProjects, icon: Activity, gradient: 'from-sky-500 to-indigo-500', trend: '+12%' },
    { label: 'Platform Users', value: teamSize, icon: Users, gradient: 'from-violet-500 to-purple-500', trend: '+4%' },
    { label: 'Completed', value: completedProjects, icon: ClipboardCheck, gradient: 'from-emerald-400 to-teal-500', trend: '+18%' },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: TrendingUp, gradient: 'from-amber-400 to-orange-500', trend: '+2%' },
  ];

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 font-heading tracking-tight">Platform Overview</h2>
          <p className="text-slate-500 mt-1">Real-time metrics for your learning and manufacturing pipeline.</p>
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold shadow-sm hover:bg-slate-50 transition-colors">
            Download Report
          </button>
          <button className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold shadow-lg hover:bg-slate-800 transition-all hover-lift">
            New Process
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover-lift relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-[0.03] rounded-full blur-3xl group-hover:opacity-10 transition-opacity duration-500`} />
            <div className="flex justify-between items-start mb-6">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${stat.gradient} flex items-center justify-center text-white shadow-md`}>
                <stat.icon size={22} strokeWidth={2.5} />
              </div>
              <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                {stat.trend} <ArrowUpRight size={14} className="ml-1" />
              </span>
            </div>
            <div>
              <h4 className="text-3xl font-black text-slate-900 font-heading tracking-tight">{stat.value}</h4>
              <p className="text-slate-500 text-sm font-medium mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 min-h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Continue Learning</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center space-y-4">
            {projects.length > 0 ? (
              <div 
                className="flex flex-col md:flex-row items-start md:items-center p-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] cursor-pointer hover:border-sky-500 hover:shadow-xl hover:shadow-sky-500/10 transition-all group gap-8"
                onClick={() => onProjectClick?.(projects[0].id)}
              >
                <div className="w-full md:w-1/3 aspect-video bg-slate-900 rounded-3xl overflow-hidden relative shadow-lg">
                  <div className="absolute inset-0 flex items-center justify-center text-white/50 group-hover:scale-110 group-hover:text-white transition-all duration-500">
                    <PlayCircle size={64} className="opacity-90" />
                  </div>
                  {projects[0].status === 'completed' && (
                    <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">
                      Completed
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-3">Last Active</p>
                  <h4 className="text-3xl font-black text-slate-900 tracking-tight mb-2 group-hover:text-sky-600 transition-colors">
                    {projects[0].lastName ? `${projects[0].defectArea.charAt(0).toUpperCase() + projects[0].defectArea.slice(1).replace('_', ' ')} Workflow` : projects[0].firstName}
                  </h4>
                  <p className="text-slate-500 font-medium text-lg">Process {projects[0].patientNumber}</p>
                </div>
                <div className="mt-6 md:mt-0 bg-white border border-slate-200 text-slate-900 p-5 rounded-[2rem] group-hover:bg-sky-600 group-hover:border-sky-600 group-hover:text-white transition-all shadow-sm">
                  <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400 font-medium">No learning videos found. Initialize a case to begin!</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
