import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Database, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Video,
  FileText,
  Loader2,
  CheckCircle2,
  History as HistoryIcon,
  Briefcase,
  UserCheck,
  Mail,
  UserCircle,
  AlertCircle,
  Timer,
  Zap,
  ExternalLink,
  CheckSquare,
  Square,
  MapPin,
  Stethoscope
} from 'lucide-react';
import { Project, UserProfile, StageTemplate } from '../types';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, getDocs } from 'firebase/firestore';

const AuditRegistry: React.FC<{ currentUser: UserProfile }> = ({ currentUser }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [configs, setConfigs] = useState<Record<string, StageTemplate[]>>({});

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    const unsubProjects = onSnapshot(query(collection(db, 'projects'), orderBy('createdAt', 'desc')), (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
    });

    onSnapshot(collection(db, 'defect_categories'), (snap) => {
      const cats: Record<string, string> = {};
      snap.forEach(d => cats[d.id] = d.data().name);
      setCategories(cats);
    });

    getDocs(collection(db, 'workflow_configs')).then(snap => {
      const cfg: Record<string, StageTemplate[]> = {};
      snap.forEach(d => {
        const data = d.data();
        cfg[d.id] = data.stages || [];
      });
      setConfigs(cfg);
    });

    return () => {
      unsubProjects();
      unsubUsers();
    };
  }, []);

  const resolveProsthesisName = (id: string) => {
    return categories[id] || (categories[id.toLowerCase()] || id);
  };

  const filtered = projects.filter(p => 
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.patientNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resolveProsthesisName(p.defectArea).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.patientLocation || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.clinicianName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selectedProjectIds.size === filtered.length) {
      setSelectedProjectIds(new Set());
    } else {
      setSelectedProjectIds(new Set(filtered.map(p => p.id)));
    }
  };

  const toggleSelectProject = (id: string) => {
    const newSelected = new Set(selectedProjectIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProjectIds(newSelected);
  };

  const getAdminEmail = (adminId?: string) => {
    if (!adminId) return 'N/A';
    const admin = users.find(u => u.id === adminId);
    return admin?.email || 'N/A';
  };

  const calculateStageDuration = (project: Project, stages: StageTemplate[], currentIndex: number) => {
    const stage = stages[currentIndex];
    const approval = project.approvals?.[stage.id];
    const startTimeStr = project.stageStartTimes?.[stage.id];
    
    if (!startTimeStr) {
      if (!approval) return 'In Progress';
      const endTime = new Date(approval.timestamp).getTime();
      let startTime: number;
      if (currentIndex === 0) {
        startTime = new Date(project.createdAt).getTime();
      } else {
        const prevStage = stages[currentIndex - 1];
        const prevApproval = project.approvals?.[prevStage.id];
        if (!prevApproval) return '...';
        startTime = new Date(prevApproval.timestamp).getTime();
      }
      const diffMinutes = Math.floor((endTime - startTime) / (1000 * 60));
      return formatDiff(diffMinutes);
    }

    const startTime = new Date(startTimeStr).getTime();
    const endTime = approval ? new Date(approval.timestamp).getTime() : new Date().getTime();
    const diffMinutes = Math.floor((endTime - startTime) / (1000 * 60));
    return formatDiff(diffMinutes) + (!approval ? ' (Active)' : '');
  };

  const formatDiff = (diffMinutes: number) => {
    if (diffMinutes < 1) return '< 1m';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  const downloadBulkCSV = () => {
    if (selectedProjectIds.size === 0) return;
    const selectedProjects = projects.filter(p => selectedProjectIds.has(p.id));
    const headers = ['Serial No', 'Patient Id', 'Patient Name', 'Patient Location', 'Clinician', 'Clinician Location', 'Prosthesis', 'Register Date', 'Created By (Name)', 'Created By (Email)'];
    const csvRows = [headers];
    selectedProjects.forEach((p, index) => {
      const createdAt = new Date(p.createdAt);
      csvRows.push([
        (index + 1).toString(),
        p.patientNumber,
        `${p.firstName} ${p.lastName}`,
        p.patientLocation || 'N/A',
        p.clinicianName || 'N/A',
        p.clinicianLocation || 'N/A',
        resolveProsthesisName(p.defectArea),
        createdAt.toLocaleDateString(),
        p.createdByAdminName || 'System',
        getAdminEmail(p.createdByAdminId)
      ]);
    });
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.map(val => `"${val}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Master_Registry_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCombinedStages = (project: Project) => {
    const patternKey = `pattern_${project.defectArea}`;
    const moldKey = `mold_${project.materialType}_${project.defectArea}`;
    return [...(configs[patternKey] || []), ...(configs[moldKey] || [])];
  };

  const handleDownloadSingleReport = (project: Project) => {
    if (!isAdmin) return;
    const stages = getCombinedStages(project);
    const reportData = [
      ['Enhance HNR - Individual Case Audit'],
      ['Patient Name', `${project.firstName} ${project.lastName}`],
      ['Patient Location', project.patientLocation || 'N/A'],
      ['Clinician', project.clinicianName || 'N/A'],
      ['Clinician Location', project.clinicianLocation || 'N/A'],
      ['Case ID', project.patientNumber],
      ['Initialized At', new Date(project.createdAt).toLocaleString()],
      ['Admin Email', getAdminEmail(project.createdByAdminId)],
      [''],
      ['Manufacturing Node Logs'],
      ['Node', 'Worker', 'Verifier', 'Node Duration', 'Completion Time']
    ];
    stages.forEach((s, idx) => {
      const approval = project.approvals?.[s.id];
      const operatorRaw = (project as any).stageOperators?.[s.id];
      const operator = typeof operatorRaw === 'object' ? operatorRaw : { name: operatorRaw || 'N/A' };
      const duration = calculateStageDuration(project, stages, idx);
      reportData.push([
        s.name,
        operator.name,
        approval?.approverName || 'Awaiting Authorization',
        duration,
        approval ? new Date(approval.timestamp).toLocaleString() : 'Pending'
      ]);
    });
    const csvContent = "data:text/csv;charset=utf-8," + reportData.map(e => e.map(v => `"${v}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Audit_Log_${project.patientNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-sky-600" size={48} /></div>;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Audit Registry</h2>
          <p className="text-slate-500 font-medium">Full manufacturing history, node durations, and authorized verifiers.</p>
        </div>
        {selectedProjectIds.size > 0 && (
          <button 
            onClick={downloadBulkCSV}
            className="bg-sky-600 hover:bg-sky-700 text-white px-8 py-4 rounded-[2rem] font-black flex items-center shadow-xl shadow-sky-100 transition-all active:scale-95 animate-fade-in"
          >
            <Download size={18} className="mr-3" /> Export Selected ({selectedProjectIds.size})
          </button>
        )}
      </header>

      <div className="relative w-full md:w-1/3">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Filter Registry..." 
          className="w-full bg-white border border-slate-200 pl-14 pr-6 py-5 rounded-[2.5rem] focus:ring-4 focus:ring-sky-500/10 outline-none font-bold text-sm shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-[4rem] border border-slate-200 overflow-x-auto shadow-sm">
        <table className="w-full text-left min-w-[1000px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-8 text-center">
                <button onClick={toggleSelectAll} className="p-2 text-slate-400 hover:text-sky-600 transition-colors">
                  {selectedProjectIds.size === filtered.length && filtered.length > 0 ? <CheckSquare size={20} className="text-sky-600" /> : <Square size={20} />}
                </button>
              </th>
              <th className="px-4 py-8 text-center text-xs font-black text-slate-300">#</th>
              <th className="px-8 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Info</th>
              <th className="px-8 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinician Info</th>
              <th className="px-8 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Register Date</th>
              <th className="px-8 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Throughput</th>
              <th className="px-8 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Nodes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((project, index) => {
              const creationTime = new Date(project.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <React.Fragment key={project.id}>
                  <tr className={`hover:bg-slate-50/50 transition-all cursor-pointer ${selectedProjectIds.has(project.id) ? 'bg-sky-50/30' : ''}`}>
                    <td className="px-6 py-8 text-center">
                      <button onClick={(e) => { e.stopPropagation(); toggleSelectProject(project.id); }} className="p-2 text-slate-400 hover:text-sky-600 transition-colors">
                        {selectedProjectIds.has(project.id) ? <CheckSquare size={20} className="text-sky-600" /> : <Square size={20} />}
                      </button>
                    </td>
                    <td className="px-4 py-8 text-center text-xs font-black text-slate-300">{(index + 1).toString().padStart(2, '0')}</td>
                    <td className="px-8 py-8" onClick={() => setExpandedProjectId(expandedProjectId === project.id ? null : project.id)}>
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 font-black text-[10px] border border-sky-100">{project.patientNumber}</div>
                        <div>
                          <p className="font-black text-slate-900 text-sm leading-none mb-1">{project.firstName} {project.lastName}</p>
                          <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <MapPin size={10} className="text-sky-500" /> {project.patientLocation || 'N/A'} • {resolveProsthesisName(project.defectArea)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-8" onClick={() => setExpandedProjectId(expandedProjectId === project.id ? null : project.id)}>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Stethoscope size={14} className="text-emerald-500" />
                          <p className="text-xs font-black text-slate-800 leading-none">{project.clinicianName || 'N/A'}</p>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{project.clinicianLocation || 'No Loc'}</p>
                      </div>
                    </td>
                    <td className="px-8 py-8" onClick={() => setExpandedProjectId(expandedProjectId === project.id ? null : project.id)}>
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2 text-slate-500 mb-1">
                          <Clock size={12} className="text-sky-400" />
                          <span className="text-xs font-bold text-slate-700">{new Date(project.createdAt).toLocaleDateString()}</span>
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-5">{creationTime}</span>
                      </div>
                    </td>
                    <td className="px-8 py-8" onClick={() => setExpandedProjectId(expandedProjectId === project.id ? null : project.id)}>
                      <div className="flex items-center justify-center space-x-4">
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-sky-500" style={{ width: `${Math.min(100, (project.currentStageNumber / 10) * 100)}%` }} />
                        </div>
                        <span className="text-[9px] font-black text-slate-800 uppercase">Node {project.currentStageNumber}</span>
                      </div>
                    </td>
                    <td className="px-8 py-8 text-right">
                      <button onClick={() => setExpandedProjectId(expandedProjectId === project.id ? null : project.id)} className={`p-3 rounded-xl transition-all border ${expandedProjectId === project.id ? 'bg-sky-600 text-white' : 'bg-white text-slate-400 border-slate-100 shadow-sm'}`}>
                        {expandedProjectId === project.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </td>
                  </tr>
                  {expandedProjectId === project.id && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={7} className="p-10">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                          <div className="lg:col-span-3 bg-white rounded-[3rem] border border-slate-200 p-8 space-y-6 shadow-sm">
                             <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                                  <HistoryIcon size={14} className="mr-2 text-sky-500" /> Process Audit Trail
                                </h4>
                             </div>
                             <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {getCombinedStages(project).map((stage, idx, allStages) => {
                                  const approval = project.approvals?.[stage.id];
                                  const operatorRaw = (project as any).stageOperators?.[stage.id];
                                  const operator = typeof operatorRaw === 'object' ? operatorRaw : { name: operatorRaw || '' };
                                  const recording = project.recordings?.[stage.id];
                                  const duration = calculateStageDuration(project, allStages, idx);
                                  return (
                                    <div key={stage.id} className="grid grid-cols-12 items-center p-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] group hover:bg-white hover:shadow-xl transition-all">
                                      <div className="col-span-1 flex items-center justify-center">
                                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${approval ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300 border border-slate-200'}`}>
                                            {idx + 1}
                                         </div>
                                      </div>
                                      <div className="col-span-3 min-w-0 pr-4">
                                         <p className="text-sm font-black text-slate-900 truncate">{stage.name}</p>
                                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{stage.software || 'System Node'}</p>
                                      </div>
                                      <div className="col-span-3 border-l border-slate-200/50 pl-6">
                                        <div className="flex items-center gap-2">
                                          <Briefcase size={10} className="text-sky-500" />
                                          <p className="text-[10px] font-black text-slate-800 uppercase truncate">
                                            {operator.name || <span className="text-slate-300 italic">Unassigned</span>}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="col-span-2 border-l border-slate-200/50 pl-6">
                                        {approval ? (
                                          <div className="flex items-center gap-2">
                                            <UserCheck size={11} className="text-emerald-500" />
                                            <p className="text-[10px] font-black text-emerald-600 uppercase truncate">{approval.adminName}</p>
                                          </div>
                                        ) : <span className="text-[10px] font-black uppercase text-slate-300 italic">Pending</span>}
                                      </div>
                                      <div className="col-span-2 border-l border-slate-200/50 pl-6">
                                         <p className="text-xs font-black text-slate-900">{duration}</p>
                                      </div>
                                      <div className="col-span-1 flex justify-end">
                                         {recording && (
                                            <a href={recording} target="_blank" rel="noopener noreferrer" className="p-3 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-600 hover:text-white transition-all shadow-sm border border-sky-100 flex items-center justify-center">
                                              <ExternalLink size={16} />
                                            </a>
                                         )}
                                      </div>
                                    </div>
                                  );
                                })}
                             </div>
                          </div>
                          <div className="space-y-6">
                             <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl space-y-8 relative overflow-hidden">
                                <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest flex items-center gap-2">
                                  <Zap size={14} className="text-sky-400" /> Registry Export
                                </h4>
                                <button onClick={() => handleDownloadSingleReport(project)} className="w-full bg-white/10 border border-white/5 hover:bg-white hover:text-slate-900 p-5 rounded-[1.5rem] flex items-center justify-between transition-all group">
                                  <FileText size={18} className="text-sky-400 group-hover:text-sky-600" />
                                  <span className="text-xs font-black uppercase tracking-widest">Case CSV</span>
                                  <Download size={16} />
                                </button>
                             </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditRegistry;