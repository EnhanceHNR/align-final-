
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  Clock, 
  TrendingUp, 
  Filter, 
  ChevronRight, 
  Search, 
  Layers, 
  CheckCircle2, 
  Loader2, 
  Zap,
  User,
  Activity,
  Calendar,
  BarChart as BarChartIcon,
  Database
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  BarChart, 
  Bar,
  Cell
} from 'recharts';
import { Project, UserProfile, StageTemplate } from '../types';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';

interface AnalyticsProps {
  onProjectClick: (id: string) => void;
}

const Analytics: React.FC<AnalyticsProps> = ({ onProjectClick }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedDefects, setSelectedDefects] = useState<string[]>([]);
  const [timeView, setTimeView] = useState<'duration' | 'stages'>('stages');

  useEffect(() => {
    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const usersList = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
      setUsers(usersList);
      if (selectedUserIds.length === 0 && usersList.length > 0) {
        // Default to showing first few users
        setSelectedUserIds(usersList.slice(0, 4).map(u => u.id));
      }
    });

    const unsubCats = onSnapshot(collection(db, 'defect_categories'), (snap) => {
      const uniqueCats = new Map();
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.name) uniqueCats.set(data.name.toLowerCase(), { id: d.id, name: data.name });
      });
      const catsList = Array.from(uniqueCats.values());
      setCategories(catsList);
    });

    const unsubConfigs = onSnapshot(collection(db, 'workflow_configs'), (snap) => {
      const configData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setConfigs(configData);
      
      // If still loading, this is our initial load signal
      if (loading) {
        setLoading(false);
      }
    });

    return () => {
      unsubProjects();
      unsubUsers();
      unsubCats();
      unsubConfigs();
    };
  }, []);

  // Smart default selection
  useEffect(() => {
    if (selectedDefects.length === 0 && categories.length > 0) {
      if (projects.length > 0) {
        const counts: Record<string, number> = {};
        projects.forEach(p => {
          if (p.defectArea) {
            counts[p.defectArea] = (counts[p.defectArea] || 0) + 1;
          }
        });
        const mostActive = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        if (mostActive) {
          setSelectedDefects([mostActive[0]]);
        } else {
          setSelectedDefects([categories[0].id]);
        }
      } else {
        setSelectedDefects([categories[0].id]);
      }
    }
  }, [categories, projects, selectedDefects.length]);

  const getSafeTime = (ts: any) => {
    if (!ts) return null;
    try {
      if (typeof ts === 'string') return new Date(ts).getTime();
      if (ts.toDate) return ts.toDate().getTime();
      return new Date(ts).getTime();
    } catch (e) {
      return null;
    }
  };

  const { chartData, renderedProjects } = useMemo(() => {
    if (selectedDefects.length === 0 || selectedUserIds.length === 0) return { chartData: [], renderedProjects: [] };

    const primaryDefect = selectedDefects[0];
    
    // 1. Get projects matching the defect AND involving the selected users
    const relevantProjects = projects.filter(p => {
      const isRelevantDefect = p.defectArea === primaryDefect || selectedDefects.includes(p.defectArea);
      if (!isRelevantDefect) return false;
      
      // Is this project relevant to ANY selected user?
      return selectedUserIds.some(uid => {
        const isAssigned = p.assignedEmployeeIds?.includes(uid);
        const hasOperated = Object.values((p as any).stageOperators || {}).some((op: any) => op.id === uid);
        const hasApproved = Object.values(p.approvals || {}).some((ap: any) => ap.approverId === uid);
        const hasClinicianApproved = Object.values(p.clinicianApprovals || {}).some((ap: any) => ap.approverId === uid);
        return isAssigned || hasOperated || hasApproved || hasClinicianApproved;
      });
    });

    if (relevantProjects.length === 0) return { chartData: [], renderedProjects: [] };

    // 2. Identify all unique stages
    const stagesFromData = new Set<string>();
    relevantProjects.forEach(p => {
      if (p.approvals) Object.keys(p.approvals).forEach(id => stagesFromData.add(id));
      if (p.clinicianApprovals) Object.keys(p.clinicianApprovals).forEach(id => stagesFromData.add(id));
      if ((p as any).stageOperators) Object.keys((p as any).stageOperators).forEach(id => stagesFromData.add(id));
      if (p.completedSteps) Object.keys(p.completedSteps).forEach(id => {
        const parts = id.split('_');
        if (parts.length >= 2) stagesFromData.add(`${parts[0]}_${parts[1]}`);
      });
    });

    // Try to get stage names from configs
    const stageMap = new Map<string, string>();
    configs.forEach(c => {
      c.stages?.forEach((s: any) => stageMap.set(s.id, s.name));
    });

    let stagesToRender = Array.from(stagesFromData)
      .map(id => ({ id, name: stageMap.get(id) || id.replace('st_', 'Stage ') }));

    // Fallback if no stages found but projects exist
    if (stagesToRender.length === 0) {
      stagesToRender = [{ id: 'total', name: 'Total Production Cycle' }];
    }

    // 3. Build data
    const builtData = stagesToRender.map((stage: any) => {
      const dataPoint: any = { name: stage.name, stageId: stage.id };

      relevantProjects.forEach(p => {
        const projKey = `proj_${p.id}`;
        
        if (stage.id === 'total') {
          if (p.status === 'completed' && p.createdAt) {
             const end = Object.values(p.approvals || {}).map((a:any) => getSafeTime(a.timestamp)).sort((a:any, b:any) => b-a)[0];
             const start = getSafeTime(p.createdAt);
             if (end && start) {
               dataPoint[projKey] = Math.round((end - start) / (1000 * 60));
             }
          }
          return;
        }

        const completionLog = p.approvals?.[stage.id] || 
                            p.clinicianApprovals?.[stage.id] || 
                            (p as any).stageOperators?.[stage.id];
        
        if (completionLog) {
          const endTime = getSafeTime(completionLog.timestamp);
          if (!endTime) return;

          let startTime = getSafeTime(p.stageStartTimes?.[stage.id]) || getSafeTime(p.createdAt);
          
          if (timeView === 'stages') {
            const sortedStageIds = Object.keys((p as any).stageOperators || {}).sort((a,b) => 
              getSafeTime((p as any).stageOperators[a].timestamp)! - getSafeTime((p as any).stageOperators[b].timestamp)!
            );
            const myIdx = sortedStageIds.indexOf(stage.id);
            if (myIdx > 0) {
              const prevId = sortedStageIds[myIdx - 1];
              const prevLog = (p as any).stageOperators[prevId] || p.approvals?.[prevId];
              if (prevLog) startTime = getSafeTime(prevLog.timestamp);
            }
          }

          if (startTime) {
            const diff = (endTime - startTime) / (1000 * 60);
            if (diff >= 0 && diff < 43200) { 
              dataPoint[projKey] = Math.round(diff);
            }
          }
        }
      });

      return dataPoint;
    });

    // Filter rendered projects to only those that have at least one data point in chartData
    const activeProjects = relevantProjects.filter(p => {
      const projKey = `proj_${p.id}`;
      return builtData.some(dp => dp[projKey] !== undefined);
    });

    // If only one stage, Recharts LineChart draws nothing. Let's duplicate the point to draw a flat line across the chart.
    if (builtData.length === 1) {
      builtData.push({ ...builtData[0], name: builtData[0].name + ' (End)' });
    }

    return { chartData: builtData, renderedProjects: activeProjects };
  }, [projects, configs, selectedUserIds, selectedDefects, timeView]);
  // LEARNING CURVE DATA: Progress of users over time for the first selected stage
  const improvementData = useMemo(() => {
    if (selectedDefects.length === 0 || selectedUserIds.length === 0 || chartData.length === 0) return [];
    
    const targetStage = chartData[0]; // Look at the first stage of the process for learning curve
    const history: any[] = [];
    
    // Get all projects for selected defect, sorted by date
    const sortedProjects = [...projects]
      .filter(p => selectedDefects.includes(p.defectArea))
      .sort((a, b) => getSafeTime(a.createdAt)! - getSafeTime(b.createdAt)!);

    sortedProjects.forEach((p, idx) => {
      const entry: any = { name: `Case ${idx + 1}`, date: new Date(p.createdAt).toLocaleDateString() };
      let hasDataForThisProject = false;

      selectedUserIds.forEach(userId => {
        const completionLog = p.approvals?.[targetStage.stageId] || (p as any).stageOperators?.[targetStage.stageId];
        const isUserInvolved = (p as any).stageOperators?.[targetStage.stageId]?.id === userId || p.assignedEmployeeIds?.includes(userId);
        
        if (completionLog && isUserInvolved) {
          const endTime = getSafeTime(completionLog.timestamp);
          const startTime = getSafeTime(p.stageStartTimes?.[targetStage.stageId]) || getSafeTime(p.createdAt);
          if (endTime && startTime) {
            const diff = (endTime - startTime) / (1000 * 60);
            if (diff >= 0 && diff < 43200) {
              entry[`user_${userId}`] = Math.round(diff);
              hasDataForThisProject = true;
            }
          }
        }
      });

      if (hasDataForThisProject) history.push(entry);
    });

    return history;
  }, [projects, selectedUserIds, selectedDefects, chartData]);

  const COLORS = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const hasData = useMemo(() => {
    return chartData.some((dp: any) => 
      Object.entries(dp).some(([key, val]) => key.startsWith('proj_') && val !== undefined)
    );
  }, [chartData]);

  if (loading) return <div className="h-screen w-full flex items-center justify-center"><Loader2 className="animate-spin text-sky-600" size={48} /></div>;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Node Analytics</h2>
          <p className="text-slate-500 font-medium">Performance tracking and manufacturing cycle optimization</p>
        </div>
        <div className="flex items-center space-x-3 bg-white p-2 rounded-3xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setTimeView('stages')}
            className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${timeView === 'stages' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Stage Delta
          </button>
          <button 
            onClick={() => setTimeView('duration')}
            className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${timeView === 'duration' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Total Cycle
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filter Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                  <Users size={14} className="mr-2" /> Personnel Nodes
                </h4>
                <span className="text-[10px] font-black text-sky-600">{selectedUserIds.length}</span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {users.map(user => (
                  <button 
                    key={user.id} 
                    onClick={() => setSelectedUserIds(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id])}
                    className={`w-full flex items-center p-3 rounded-2xl border-2 transition-all ${selectedUserIds.includes(user.id) ? 'bg-sky-50 border-sky-500 shadow-sm' : 'bg-white border-slate-50 hover:border-slate-200'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs mr-3 ${selectedUserIds.includes(user.id) ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {user.firstName ? user.firstName[0] : 'U'}
                    </div>
                    <span className={`text-xs font-black truncate ${selectedUserIds.includes(user.id) ? 'text-sky-900' : 'text-slate-600'}`}>{user.firstName} {user.lastName}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-50">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                <Layers size={14} /> Prosthesis Types
              </h4>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button 
                    key={cat.id} 
                    onClick={() => setSelectedDefects(prev => prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id])}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border-2 ${selectedDefects.includes(cat.id) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-50 hover:bg-slate-100'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Database size={80} /></div>
             <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-4">Registry Audit</h4>
             <div className="space-y-3 opacity-80 text-xs font-medium">
                <p className="flex justify-between"><span>Found Projects:</span> <span className="font-black text-white">{projects.filter(p => selectedDefects.includes(p.defectArea)).length}</span></p>
                <p className="flex justify-between"><span>Target Defect:</span> <span className="font-black text-white uppercase">{selectedDefects[0] || 'None'}</span></p>
                <p className="flex justify-between"><span>Active Stages:</span> <span className="font-black text-white">{chartData.length}</span></p>
             </div>
          </div>
        </div>

        {/* Main Chart Area */}
        <div className="lg:col-span-3 space-y-8">
          <div className="bg-white p-8 md:p-12 rounded-[4rem] border border-slate-200 shadow-sm min-h-[550px] flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
               <div>
                  <h3 className="text-2xl font-black text-slate-900 flex items-center"><Activity size={24} className="mr-3 text-sky-600" /> Throughput Comparison</h3>
                  <p className="text-slate-400 text-xs font-medium">Averaged minutes taken per production node</p>
               </div>
            </div>
              <div className="flex-1 w-full h-[400px] relative">
              {hasData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#475569', fontSize: 9, fontWeight: 800}} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#475569', fontSize: 10, fontWeight: 800}} 
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', fontWeight: 900, fontSize: '12px', padding: '16px' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, paddingBottom: '20px' }} />
                    {renderedProjects.map((p, i) => (
                      <Line 
                        key={p.id}
                        name={`Case ${p.patientNumber || p.id.substring(0,6)}`}
                        type="monotone" 
                        dataKey={`proj_${p.id}`} 
                        stroke={COLORS[i % COLORS.length]} 
                        strokeWidth={4}
                        animationDuration={1500}
                        connectNulls={true}
                        dot={{ r: 4, strokeWidth: 2 }}
                        activeDot={{ r: 6, strokeWidth: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 space-y-4">
                  <BarChartIcon size={64} className="opacity-10" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Establishing Node Context...</p>
                </div>
              )}
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-[4rem] border border-slate-200 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center"><Clock size={14} className="mr-2" /> Recent Project Cycle Audit</h4>
              <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {projects.filter(p => renderedProjects.some(rp => rp.id === p.id)).slice(0, 8).map(p => {
                  const date = getSafeTime(p.createdAt);
                  const cycleTime = date ? Math.round((new Date().getTime() - date) / (1000 * 60 * 60)) : 0;
                  return (
                    <div key={p.id} onClick={() => onProjectClick(p.id)} className="flex items-center justify-between p-5 bg-slate-50 rounded-[1.5rem] hover:bg-sky-50 transition-all cursor-pointer border border-transparent hover:border-sky-100">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-sky-600 font-black text-[10px]">{p.patientNumber || 'E?'}</div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{p.firstName} {p.lastName}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{categories.find(c => c.id === p.defectArea)?.name || p.defectArea}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-slate-800">{cycleTime} hrs</p>
                        <p className="text-[8px] text-slate-400 uppercase font-black">Age</p>
                      </div>
                    </div>
                  );
                })}
                {projects.length === 0 && (
                   <div className="text-center py-10 opacity-30 italic text-xs font-bold text-slate-400">No projects initializing...</div>
                )}
              </div>
            </div>

            <div className="bg-white p-10 rounded-[4rem] border border-slate-200 shadow-sm flex flex-col">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center"><TrendingUp size={14} className="mr-2" /> Learning Curve & Improvements</h4>
               <div className="flex-1 min-h-[250px]">
                 {improvementData.length > 0 ? (
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={improvementData}>
                        <defs>
                          {COLORS.map((color, i) => (
                            <linearGradient key={i} id={`improvementColor${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                              <stop offset="95%" stopColor={color} stopOpacity={0}/>
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9}} />
                        <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        {selectedUserIds.map((uid, i) => (
                          <Area 
                            key={uid} 
                            type="monotone" 
                            dataKey={`user_${uid}`} 
                            stroke={COLORS[i % COLORS.length]} 
                            fill={`url(#improvementColor${i})`}
                            strokeWidth={3}
                            animationDuration={1500}
                          />
                        ))}
                      </AreaChart>
                   </ResponsiveContainer>
                 ) : (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-10">
                       <TrendingUp size={48} className="mb-2" />
                       <p className="text-[10px] font-black uppercase">Requires multiple projects</p>
                    </div>
                 )}
               </div>
               <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-4">Progress across sequential cases</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
