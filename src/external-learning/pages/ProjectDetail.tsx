import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Pause,
  ShieldCheck,
  RotateCcw,
  Loader2,
  PlayCircle,
  Check,
  ChevronRight,
  AlertCircle,
  Play,
  Lock as LockIcon,
  Users,
  X,
  CheckCircle2,
  VideoOff,
  RefreshCw,
  Send,
  Clock,
  Info,
  History as HistoryIcon,
  ShieldAlert,
  UserCheck,
  UserPlus,
  CheckCircle,
  FileText,
  Activity,
  ExternalLink,
  Youtube,
  Link as LinkIcon,
  Database,
  Monitor,
  Copy,
  FileType,
  Timer,
  UserMinus,
  Upload,
  Image as ImageIcon,
  File as FileIcon,
  Video as VideoIcon,
  Download,
  MessageSquare
} from 'lucide-react';
import { Project, StageTemplate, UserProfile, ChatMessage, ResetLog } from '../types';
import ClinicianTrail from '../components/ClinicianTrail';
import { storage, db } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, onSnapshot, updateDoc, arrayUnion, deleteField, getDoc, collection, query, getDocs, arrayRemove } from 'firebase/firestore';

const ProjectDetail: React.FC<{ id: string; onBack: () => void; currentUser: UserProfile }> = ({ id, onBack, currentUser }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [project, setProject] = useState<Project | null>(null);
  const [stages, setStages] = useState<StageTemplate[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [showNamingProtocol, setShowNamingProtocol] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetFeedback, setResetFeedback] = useState('');
  const [stageMessage, setStageMessage] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isAdmin = currentUser.role === 'admin';
  const isClinician = currentUser.role === 'clinician';

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'projects', id), 
      async (docSnap) => {
        if (docSnap.exists()) {
          const projectData = { id: docSnap.id, ...(docSnap.data() as Project) };
          setProject(projectData);

          const patternConfigId = `pattern_${projectData.defectArea}`;
          const moldConfigId = `mold_${projectData.materialType}_${projectData.defectArea}`;

          const patternSnap = await getDoc(doc(db, 'workflow_configs', patternConfigId));
          const moldSnap = await getDoc(doc(db, 'workflow_configs', moldConfigId));

          const pStages = patternSnap.exists() ? patternSnap.data().stages || [] : [];
          const mStages = moldSnap.exists() ? moldSnap.data().stages || [] : [];
          
          const combined = [...pStages, ...mStages].map((s, idx) => ({ ...s, stageNumber: idx + 1 }));
          
          if (combined.length > 0) {
            setStages(combined);
            if (isInitialLoad) {
              const workingIdx = (projectData.currentStageNumber || 1) - 1;
              setActiveStageIndex(workingIdx < combined.length ? workingIdx : 0);
              setIsInitialLoad(false);
            }
          }
        }
        setLoading(false);
      }
    );

    // Fetch categories to resolve ID to Name for Naming Protocol
    const unsubCats = onSnapshot(collection(db, 'defect_categories'), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
    });

    if (isAdmin) {
      getDocs(query(collection(db, 'users'))).then(snap => {
        setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
      });
    }

    return () => {
      unsubscribe();
      unsubCats();
      // Cleanup: Stop any active recording if the user leaves the page
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [id, isAdmin, isInitialLoad]);

  // Handle active timer during recording
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setTimerSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStepToggle = async (stepId: string) => {
    if (!project || !id) return;
    const isCompleted = !!project.completedSteps?.[stepId];
    await updateDoc(doc(db, 'projects', id), {
      [`completedSteps.${stepId}`]: !isCompleted
    });
  };

  const handleAssignUser = async (userId: string) => {
    if (!project || !id) return;
    await updateDoc(doc(db, 'projects', id), {
      assignedEmployeeIds: arrayUnion(userId)
    });
  };

  const handleUnassignUser = async (userId: string) => {
    if (!project || !id) return;
    // Don't allow unassigning if only one user is left
    if (project.assignedEmployeeIds.length <= 1 && project.assignedEmployeeIds.includes(userId)) {
      alert("At least one node member must be assigned to this project.");
      return;
    }
    await updateDoc(doc(db, 'projects', id), {
      assignedEmployeeIds: arrayRemove(userId)
    });
  };

  const handleStageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!project || !id || !activeStage || !e.target.files?.length) return;
    
    const files = Array.from(e.target.files) as File[];
    setIsUploading(true);
    
    try {
      const currentStageId = activeStage.id;
      const uploadedUrls: string[] = [];
      
      for (const file of files) {
        const timestamp = Date.now();
        const fileName = `${project.patientNumber}_Node_${activeStage.stageNumber}_Asset_${timestamp}_${file.name.replace(/\s+/g, '_')}`;
        const storageRef = ref(storage, `patient_archives/${project.patientNumber}_${project.firstName}_${project.lastName}/stage_assets/${fileName}`);
        
        const snap = await uploadBytesResumable(storageRef, file);
        const url = await getDownloadURL(snap.ref);
        uploadedUrls.push(url);
      }
      
      await updateDoc(doc(db, 'projects', id), {
        [`stageFiles.${currentStageId}`]: arrayUnion(...uploadedUrls)
      });
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleResetStage = async () => {
    if (!project || !id || !activeStage || !resetFeedback.trim()) return;
    
    const currentStageId = activeStage.id;
    const timestamp = new Date().toISOString();
    
    const updates: any = {
      [`approvals.${currentStageId}`]: deleteField(),
      [`clinicianApprovals.${currentStageId}`]: deleteField(),
      [`pendingApprovals.${currentStageId}`]: deleteField(),
      [`pendingClinicianApprovals.${currentStageId}`]: deleteField(),
      resetLogs: arrayUnion({
        stageName: activeStage.name,
        adminName: `${currentUser.firstName} ${currentUser.lastName}`,
        remark: resetFeedback,
        timestamp: timestamp
      }),
      [`stageTrails.${currentStageId}`]: arrayUnion({
        id: `reset_${Date.now()}`,
        senderId: currentUser.id,
        senderName: `${currentUser.firstName} ${currentUser.lastName}`,
        senderRole: currentUser.role,
        text: `NODE RESET: ${resetFeedback}`,
        timestamp: timestamp
      })
    };

    // Reset all steps for this stage
    activeStage.steps.forEach(step => {
      updates[`completedSteps.${step.id}`] = deleteField();
    });

    await updateDoc(doc(db, 'projects', id), updates);
    setIsResetModalOpen(false);
    setResetFeedback('');
  };

  const handleSendStageMessage = async () => {
    if (!project || !id || !activeStage || !stageMessage.trim()) return;
    
    const currentStageId = activeStage.id;
    await updateDoc(doc(db, 'projects', id), {
      [`stageTrails.${currentStageId}`]: arrayUnion({
        id: `msg_${Date.now()}`,
        senderId: currentUser.id,
        senderName: `${currentUser.firstName} ${currentUser.lastName}`,
        senderRole: currentUser.role,
        text: stageMessage,
        timestamp: new Date().toISOString()
      })
    });
    setStageMessage('');
  };

  const handleProceedToNext = async () => {
    if (!project || !id || !stages[activeStageIndex]) return;
    
    // Auto-stop recording if active when proceeding
    if (isRecording) {
      stopRecording();
      // We give a small delay to allow the stop event to trigger and start uploading
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const activeStage = stages[activeStageIndex];
    const currentStageId = activeStage.id;
    const operatorData = { id: currentUser.id, name: `${currentUser.firstName} ${currentUser.lastName}`, timestamp: new Date().toISOString() };
    const isLastStage = activeStageIndex === stages.length - 1;
    const updates: any = { [`stageOperators.${currentStageId}`]: operatorData };
    if (isLastStage) {
      updates.status = 'completed';
      await updateDoc(doc(db, 'projects', id), updates);
      onBack();
    } else {
      const nextStageNumber = project.currentStageNumber + 1;
      updates.currentStageNumber = nextStageNumber;
      await updateDoc(doc(db, 'projects', id), updates);
      setActiveStageIndex(nextStageNumber - 1);
    }
  };

  const formatUrl = (url?: string) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `https://${url}`;
  };

  const resolveFullProsthesisName = () => {
    if (!project) return '';
    const normalizedId = project.defectArea.toLowerCase().trim();
    const legacyMap: Record<string, string> = {
      'orbital': 'Orbital Adhesive (Eye)',
      'nasal': 'Nasal Prosthesis',
      'auricular': 'Auricular Prosthesis'
    };

    const categoryObj = categories.find(c => c.id.toLowerCase() === normalizedId);
    if (categoryObj) return categoryObj.name;
    if (legacyMap[normalizedId]) return legacyMap[normalizedId];

    return project.defectArea.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getNamingProtocolList = () => {
    if (!project) return [];
    const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, ''); // DDMMYYYY
    const pn = project.patientNumber;
    const fnln = `${project.firstName}-${project.lastName}`;
    
    const prosthesisName = resolveFullProsthesisName();
    const prosthesis = prosthesisName.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

    const isCombo = project.materialType === 'combination';
    const matDisplay = isCombo ? 'Combination' : project.materialType.toUpperCase();
    
    const base = (file: string, customMat?: string) => 
      `${pn}_${fnln}_${prosthesis}_STL_Mold Protocol (${customMat || matDisplay})_${file}_version(vXX)_Date(${dateStr})`;

    const items = [
      { id: 'sliced', label: 'Sliced Model', name: base('Model') },
      { id: 'blender', label: 'Blender', name: base('Blender') },
      { id: 'pattern', label: 'Pattern', name: base('Pattern') },
    ];

    if (isCombo) {
      items.push(
        { id: 'bm_fdm', label: 'Base Mould FDM', name: base('BaseMould', 'FDM') },
        { id: 'bm_sla', label: 'Base Mould SLA', name: base('BaseMould', 'SLA') },
        { id: 'mp_fdm', label: 'Middle Piece FDM', name: base('MiddlePiece', 'FDM') },
        { id: 'mp_sla', label: 'Middle Piece SLA', name: base('MiddlePiece', 'SLA') },
        { id: 'cm_fdm', label: 'Counter Mould FDM', name: base('CounterMould', 'FDM') },
        { id: 'cm_sla', label: 'Counter Mould SLA', name: base('CounterMould', 'SLA') }
      );
    } else {
      items.push(
        { id: 'bm', label: 'Base Mould', name: base('BaseMould') },
        { id: 'mp', label: 'Middle Piece', name: base('MiddlePiece') },
        { id: 'cm', label: 'Counter Mould', name: base('CounterMould') }
      );
    }

    items.push({ id: 'gom', label: 'GOM', name: `${pn}_${fnln}_${prosthesis}_GOM_version(vXX)_Date(${dateStr})` });
    return items;
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const hasAssets = project?.projectLink || (project?.inputDataLinks && project.inputDataLinks.length > 0);
  const hasResetLogs = project?.resetLogs && project.resetLogs.length > 0;

  if (loading || !project) return <div className="h-full w-full flex items-center justify-center p-20"><Loader2 className="animate-spin text-sky-600" size={48} /></div>;

  const activeStage = stages[activeStageIndex];
  const currentWorkingIndex = (project.currentStageNumber || 1) - 1;
  const isSelectedStageWorkable = activeStageIndex === currentWorkingIndex;
  const isAssigned = project.assignedEmployeeIds?.includes(currentUser.id) || isAdmin;
  const isApproved = activeStage ? !!project.approvals?.[activeStage.id] : false;
  const isClinicianApproved = activeStage ? !!project.clinicianApprovals?.[activeStage.id] : false;
  const isPendingApproval = activeStage ? !!project.pendingApprovals?.[activeStage.id] : false;
  const isPendingClinicianApproval = activeStage ? !!project.pendingClinicianApprovals?.[activeStage.id] : false;
  
  const activeStageRecording = activeStage ? project.recordings?.[activeStage.id] : undefined;
  const allStepsDone = activeStage?.steps?.every(s => !!project.completedSteps?.[s.id]) || false;
  const isProjectCompleted = project.status === 'completed';

  const canStartStage = isAssigned && !isProjectCompleted && isSelectedStageWorkable && !isRecording && !isApproved;
  
  // Show approval workflow if steps are done and it requires either admin or clinician approval
  const needsAdminApproval = (activeStage?.requiresApproval || activeStage?.isKeyStage) && !isApproved;
  const needsClinicianApproval = activeStage?.requiresClinicianApproval && !isClinicianApproved;
  const showApprovalWorkflow = isSelectedStageWorkable && (needsAdminApproval || needsClinicianApproval) && allStepsDone && !isProjectCompleted;

  const isProceedDisabled = isProjectCompleted || !isAssigned || !isSelectedStageWorkable || !allStepsDone || isUploading || needsAdminApproval || needsClinicianApproval;

  return (
    <div className="space-y-6 pb-24 animate-fade-in max-w-full overflow-hidden text-slate-950">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <button onClick={onBack} className="flex items-center text-slate-800 hover:text-sky-600 font-extrabold group cursor-pointer transition-all">
          <ArrowLeft size={20} className="mr-3 group-hover:-translate-x-1" /> Back
        </button>
      </div>

      <div className="pt-2 pb-4">
        <h2 className="text-4xl font-black text-slate-950 tracking-tight leading-none">
          {project.lastName ? `${resolveFullProsthesisName()} Workflow` : project.firstName}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="space-y-6 lg:col-span-1 lg:order-last">


          <div className="space-y-3 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
            {stages.map((stage, i) => {
              const isCurrent = i === activeStageIndex;
              const finished = i < currentWorkingIndex;
              const approved = !!project.approvals?.[stage.id];
              const pending = !!(project as any).pendingApprovals?.[stage.id];
              return (
                <div key={stage.id} onClick={() => !isRecording && setActiveStageIndex(i)} className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${isCurrent ? 'bg-white border-sky-500 shadow-md ring-1 ring-sky-500/20' : (approved || finished) ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300' : pending ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200 hover:border-sky-300'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${approved ? 'bg-emerald-600 text-white' : i === currentWorkingIndex ? 'bg-sky-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}>{stage.stageNumber}</div>
                      <div className="min-w-0">
                        <p className={`font-black text-[13px] leading-tight truncate ${isCurrent ? 'text-slate-950' : 'text-slate-600'}`}>{stage.name}</p>
                        <div className="flex items-center gap-2.5 mt-1">
                          <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest">{stage.steps?.length || 0} Steps</span>
                          {stage.software && (
                             <span className="text-[9px] font-black text-sky-700 uppercase tracking-widest bg-sky-50 px-1.5 py-0.5 rounded-md">{stage.software}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasResetLogs && (
            <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-lg space-y-6 animate-fade-in">
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.25em] flex items-center gap-2.5">
                <HistoryIcon size={16} className="text-amber-500" /> Manufacturing Reset Trail
              </h4>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {project.resetLogs!.map((log, idx) => (
                  <div key={idx} className="p-5 bg-amber-50/30 border border-amber-100 rounded-[1.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                      <RotateCcw size={40} />
                    </div>
                    <div className="relative z-10">
                      <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-2 leading-none">Node: {log.stageName}</p>
                      <p className="text-sm font-black text-slate-900 leading-tight mb-2">"{log.remark}"</p>
                      <div className="flex items-center justify-between pt-2 border-t border-amber-200/50">
                        <div className="flex items-center gap-2">
                          <UserCheck size={12} className="text-amber-600" />
                          <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">{log.adminName}</span>
                        </div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">{new Date(log.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="bg-[#0f172a] rounded-2xl overflow-hidden shadow-lg border border-slate-800 aspect-video relative group flex flex-col">
            {activeStage?.tutorialVideoUrl ? (
              <div className="w-full h-full relative flex items-center justify-center">
                <video 
                  key={activeStage.tutorialVideoUrl} 
                  src={activeStage.tutorialVideoUrl} 
                  controls 
                  preload="metadata" 
                  className="w-full h-full bg-black object-contain focus:outline-none" 
                  onPlay={(e) => {
                    e.currentTarget.parentElement?.querySelector('.yt-overlay')?.classList.add('hidden');
                  }}
                  onPause={(e) => {
                    e.currentTarget.parentElement?.querySelector('.yt-overlay')?.classList.remove('hidden');
                  }}
                />
                {/* YouTube-like Blue Play Button Overlay */}
                <div 
                  className="yt-overlay absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300"
                >
                  <div className="w-20 h-14 bg-sky-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-900/50 opacity-90 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                    <Youtube size={36} fill="currentColor" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 space-y-5">
                <Youtube size={56} className="opacity-20 text-sky-500" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">No Tutorial Video Provided</p>
              </div>
            )}
          </div>

          <div className="space-y-5">
            {activeStage?.referenceLinks && activeStage.referenceLinks.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover-lift">
                <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <LinkIcon size={14} className="text-sky-500" /> Reference Links
                </h5>
                <div className="flex flex-col gap-3">
                  {activeStage.referenceLinks.map((link, idx) => (
                    <a 
                      key={idx}
                      href={formatUrl(link.url)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-sky-300 hover:bg-sky-50 transition-all"
                    >
                      <span className="text-sm font-bold text-slate-700 group-hover:text-sky-700">{link.label || link.url}</span>
                      <ExternalLink size={16} className="text-slate-400 group-hover:text-sky-600" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {activeStage?.steps?.map((step, index) => {
              const stepDone = !!project.completedSteps?.[step.id];
              const isPreviousDone = activeStage.steps.slice(0, index).every(s => !!project.completedSteps?.[s.id]);
              const interactionPermitted = isRecording && isAssigned && !isProjectCompleted && isSelectedStageWorkable && isPreviousDone;
              
              return (
                <div key={step.id} className={`bg-white border p-6 rounded-2xl transition-all flex items-center justify-between ${stepDone ? 'border-emerald-400 bg-emerald-50/10 shadow-sm' : !interactionPermitted ? 'opacity-50 bg-slate-50 cursor-not-allowed' : 'border-slate-200 shadow-sm hover:border-sky-300'}`}>
                  <div className="flex-1 pr-6">
                    <p className={`font-bold text-lg tracking-tight leading-none mb-2 ${stepDone ? 'text-emerald-800' : 'text-slate-900'}`}>{step.name}</p>
                    <p className="text-sm text-slate-600 font-normal leading-relaxed">{step.description}</p>
                    {step.measurementLabel && (
                       <div className="mt-4 flex items-center gap-2.5">
                          <Monitor size={14} className="text-sky-600" />
                          <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-lg">Target Report: {step.measurementLabel}</span>
                       </div>
                    )}
                  </div>
                  <button onClick={() => handleStepToggle(step.id)} disabled={!interactionPermitted} className={`w-14 h-14 rounded-[1.75rem] flex items-center justify-center transition-all border-4 ${stepDone ? 'bg-emerald-600 border-emerald-500 text-white shadow-xl' : !interactionPermitted ? 'bg-slate-200 border-slate-100 text-slate-400' : 'bg-white border-sky-100 text-sky-500 hover:bg-sky-600 hover:text-white hover:border-sky-600 cursor-pointer'}`}>
                    {stepDone ? <Check size={24} strokeWidth={3} /> : <CheckCircle2 size={24} strokeWidth={2.5} />}
                  </button>
                </div>
              );
            })}

            {/* Stage Feedback Trail */}
            <div className="bg-white border border-slate-200 p-8 rounded-2xl space-y-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-sm font-black text-slate-900 tracking-tight">Stage Feedback Trail</h5>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Chat history for this manufacturing node</p>
                </div>
                <MessageSquare size={20} className="text-sky-600" />
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {project.stageTrails?.[activeStage?.id]?.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser.id ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${msg.text.startsWith('NODE RESET:') ? 'bg-red-50 border border-red-100 text-red-900' : msg.senderId === currentUser.id ? 'bg-sky-600 text-white' : 'bg-white border border-slate-100 text-slate-800'}`}>
                      <div className="flex items-center gap-2 mb-1.5 opacity-70 text-[9px] font-black uppercase tracking-widest">
                        {msg.senderName} • {msg.senderRole.replace('_', ' ')}
                      </div>
                      <p className="font-bold leading-relaxed">{msg.text}</p>
                      <p className="text-[8px] mt-2 opacity-50 font-black">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
                {(!project.stageTrails?.[activeStage?.id] || project.stageTrails[activeStage.id].length === 0) && (
                  <div className="text-center py-10 opacity-30">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">No feedback recorded for this node</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={stageMessage}
                  onChange={(e) => setStageMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendStageMessage()}
                  placeholder="Type a response or feedback..."
                  className="flex-1 bg-white border-2 border-slate-100 px-6 py-4 rounded-2xl outline-none focus:border-sky-500 font-bold text-sm shadow-sm"
                />
                <button 
                  onClick={handleSendStageMessage}
                  className="bg-slate-950 text-white p-4 rounded-2xl hover:bg-sky-600 transition-all shadow-xl active:scale-95"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-8 space-y-5">
            {showApprovalWorkflow && (
              <div className="p-4 bg-slate-100 rounded-[3rem] border-2 border-slate-200 shadow-inner flex flex-col gap-4">
                {/* Admin Approval Section */}
                {needsAdminApproval && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-6">Verifier Authorization Required</p>
                    {isAdmin ? (
                      <div className="flex flex-col gap-3">
                        <button onClick={async () => { if (!isAdmin || !activeStage) return; const timestamp = new Date().toISOString(); await updateDoc(doc(db, 'projects', id), { [`approvals.${activeStage.id}`]: { approverId: currentUser.id, approverName: `${currentUser.firstName} ${currentUser.lastName}`, approverRole: currentUser.role, timestamp: timestamp }, [`pendingApprovals.${activeStage.id}`]: deleteField() }); }} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-7 rounded-[2.5rem] font-black text-lg flex items-center justify-center shadow-2xl transition-all active:scale-95 animate-pulse">
                          <UserCheck size={22} className="mr-3" /> Authorize Node (Admin)
                        </button>
                        <button onClick={() => setIsResetModalOpen(true)} className="w-full bg-white border-4 border-red-50 text-red-600 py-6 rounded-[2.5rem] font-black text-lg flex items-center justify-center shadow-xl transition-all hover:bg-red-600 hover:text-white cursor-pointer active:scale-95">
                          <RotateCcw size={22} className="mr-3" /> Reject & Reset Node
                        </button>
                      </div>
                    ) : (
                      <button disabled={isPendingApproval} onClick={async () => { if (!activeStage) return; await updateDoc(doc(db, 'projects', id), { [`pendingApprovals.${activeStage.id}`]: true }); }} className={`w-full py-7 rounded-[2.5rem] font-black text-lg flex items-center justify-center shadow-2xl transition-all ${isPendingApproval ? 'bg-slate-300 text-slate-600' : 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer'}`}>
                        <Send size={22} className="mr-3" /> {isPendingApproval ? 'Sent to Admin' : 'Send for Admin Approval'}
                      </button>
                    )}
                  </div>
                )}

                {/* Clinician Approval Section */}
                {needsClinicianApproval && (
                  <div className="space-y-3 pt-3 border-t-2 border-slate-200/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-6">Clinician Authorization Required</p>
                    {isClinician ? (
                      <div className="flex flex-col gap-3">
                        <button onClick={async () => { if (!isClinician || !activeStage) return; const timestamp = new Date().toISOString(); await updateDoc(doc(db, 'projects', id), { [`clinicianApprovals.${activeStage.id}`]: { approverId: currentUser.id, approverName: `${currentUser.firstName} ${currentUser.lastName}`, approverRole: currentUser.role, timestamp: timestamp }, [`pendingClinicianApprovals.${activeStage.id}`]: deleteField() }); }} className="w-full bg-sky-600 hover:bg-sky-700 text-white py-7 rounded-[2.5rem] font-black text-lg flex items-center justify-center shadow-2xl transition-all active:scale-95">
                          <ShieldCheck size={22} className="mr-3" /> Authorize Node (Clinician)
                        </button>
                        <button onClick={() => setIsResetModalOpen(true)} className="w-full bg-white border-4 border-red-50 text-red-600 py-6 rounded-[2.5rem] font-black text-lg flex items-center justify-center shadow-xl transition-all hover:bg-red-600 hover:text-white cursor-pointer active:scale-95">
                          <RotateCcw size={22} className="mr-3" /> Reject Node
                        </button>
                      </div>
                    ) : (
                      <button disabled={isPendingClinicianApproval} onClick={async () => { if (!activeStage) return; await updateDoc(doc(db, 'projects', id), { [`pendingClinicianApprovals.${activeStage.id}`]: true }); }} className={`w-full py-7 rounded-[2.5rem] font-black text-lg flex items-center justify-center shadow-2xl transition-all ${isPendingClinicianApproval ? 'bg-slate-300 text-slate-600' : 'bg-indigo-500 hover:bg-indigo-600 text-white cursor-pointer'}`}>
                        <Send size={22} className="mr-3" /> {isPendingClinicianApproval ? 'Sent to Clinician' : 'Send for Clinician Approval'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <button 
              disabled={isProceedDisabled}
              onClick={handleProceedToNext}
              className={`w-full text-white py-7 rounded-[3rem] font-black text-xl shadow-2xl transition-all flex items-center justify-center ${!isProceedDisabled ? 'bg-sky-600 hover:bg-sky-700 active:scale-95 cursor-pointer shadow-sky-200' : 'bg-slate-300 cursor-not-allowed text-slate-600'}`}
            >
              {activeStageIndex === stages.length - 1 ? 'Finalize Production' : 'Proceed to Next Node'}
              <ChevronRight size={26} className="ml-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[3.5rem] p-10 space-y-8 overflow-hidden shadow-2xl border border-white/20">
            <div className="flex items-center justify-between border-b border-slate-50 pb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Personnel Node</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Assign manufacturing authority</p>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 transition-all rounded-full">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {allUsers.map(u => {
                const isAssigned = project.assignedEmployeeIds.includes(u.id);
                return (
                  <div key={u.id} className={`flex items-center justify-between p-5 rounded-3xl border-2 transition-all ${isAssigned ? 'bg-sky-50 border-sky-500 shadow-sm' : 'bg-white border-slate-50 hover:border-slate-200'}`}>
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${isAssigned ? 'bg-sky-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                        {u.firstName[0]}
                      </div>
                      <div>
                        <p className={`text-sm font-black truncate ${isAssigned ? 'text-sky-900' : 'text-slate-600'}`}>{u.firstName} {u.lastName}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{u.role.replace('_', ' ')}</p>
                      </div>
                    </div>
                    {isAssigned ? (
                      <button 
                        onClick={() => handleUnassignUser(u.id)}
                        className="p-3 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                        title="Remove Assignment"
                      >
                        <UserMinus size={18} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleAssignUser(u.id)}
                        className="p-3 text-sky-400 hover:bg-sky-50 hover:text-sky-600 rounded-xl transition-all"
                        title="Assign to Project"
                      >
                        <UserPlus size={18} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="pt-4">
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95"
              >
                Close Registry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Naming Protocol Modal */}
      {showNamingProtocol && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[4rem] p-12 shadow-2xl overflow-y-auto custom-scrollbar border border-white/20">
            <div className="flex items-center justify-between border-b-2 border-slate-50 pb-10 mb-10">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-sky-50 text-sky-600 rounded-[1.5rem] shadow-inner">
                  <FileType size={32} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-950 tracking-tight leading-none">Naming Protocol Registry</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3">Dynamic Node Asset Standard (v2.1)</p>
                </div>
              </div>
              <button onClick={() => setShowNamingProtocol(false)} className="p-4 bg-slate-50 text-slate-700 hover:text-slate-950 transition-all rounded-full">
                <X size={32} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {getNamingProtocolList().map((item) => (
                <div key={item.id} className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] group hover:bg-white hover:border-sky-200 hover:shadow-xl transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <FileText size={12} className="text-sky-500" /> {item.label}
                      </p>
                      <p className="font-mono text-[13px] text-slate-950 font-bold bg-white p-4 rounded-xl border border-slate-100 break-all select-all">
                        {item.name}
                      </p>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(item.name, item.id)}
                      className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shrink-0 ${copiedId === item.id ? 'bg-emerald-600 text-white shadow-emerald-100' : 'bg-slate-900 text-white hover:bg-sky-600 shadow-slate-100 shadow-xl'}`}
                    >
                      {copiedId === item.id ? <Check size={18} /> : <Copy size={18} />}
                      {copiedId === item.id ? 'Copied' : 'Copy Name'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 p-8 bg-amber-50 border border-amber-100 rounded-[2.5rem] flex items-start gap-6">
              <Info size={24} className="text-amber-600 shrink-0 mt-1" />
              <div>
                <h5 className="text-[11px] font-black text-amber-900 uppercase tracking-widest mb-2">Protocol Note</h5>
                <p className="text-sm font-semibold text-amber-800 leading-relaxed opacity-80">
                  Ensure the version placeholder <span className="font-black text-amber-950">(vXX)</span> is replaced with the correct numerical sequence (e.g., v01, v02) before final archiving to maintain registry integrity.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <ClinicianTrail messages={project.trail || []} currentUser={currentUser} onSendMessage={async (text) => {
         await updateDoc(doc(db, 'projects', id), { trail: arrayUnion({ id: `msg_${Date.now()}`, senderId: currentUser.id, senderName: `${currentUser.firstName} ${currentUser.lastName}`, senderRole: currentUser.role, text, timestamp: new Date().toISOString() }) });
      }} />

      {/* Reject & Reset Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-[4rem] flex flex-col shadow-2xl overflow-hidden border border-white/20">
            <div className="p-10 border-b-2 border-slate-50 flex items-center justify-between bg-red-50/50">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-red-600 text-white rounded-3xl shadow-xl shadow-red-100">
                  <RotateCcw size={32} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-950 tracking-tight leading-none">Node Reset Protocol</h3>
                  <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mt-3">Requires mandatory feedback remark</p>
                </div>
              </div>
              <button onClick={() => setIsResetModalOpen(false)} className="p-4 bg-white text-slate-400 hover:text-slate-950 transition-all rounded-full border-2 border-slate-100">
                <X size={28} />
              </button>
            </div>

            <div className="p-12 space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Reset Rationale / Remark</label>
                <textarea 
                  value={resetFeedback}
                  onChange={(e) => setResetFeedback(e.target.value)}
                  placeholder="Explain why this node is being rejected and what needs to be fixed..."
                  className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl min-h-[150px] outline-none focus:border-red-500 font-bold text-slate-900 transition-all shadow-inner"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 py-6 rounded-[2rem] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleResetStage}
                  disabled={!resetFeedback.trim()}
                  className="flex-[2] bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-6 rounded-[2rem] font-black text-lg flex items-center justify-center shadow-2xl transition-all active:scale-95 shadow-red-900/20"
                >
                  Confirm Reset Node
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Production Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-fade-in print:p-0 print:bg-white print:backdrop-blur-none">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[4rem] flex flex-col shadow-2xl overflow-hidden border border-white/20 print:max-h-none print:shadow-none print:rounded-none print:border-none">
            {/* Header - Hidden in Print */}
            <div className="p-10 border-b-2 border-slate-50 flex items-center justify-between bg-slate-50/50 print:hidden">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-sky-600 text-white rounded-3xl shadow-xl shadow-sky-100">
                  <FileIcon size={32} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-950 tracking-tight leading-none">Production Audit Report</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3">Verified Manufacturing Dossier</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => window.print()}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl active:scale-95"
                >
                  <Download size={18} /> Print / Save PDF
                </button>
                <button onClick={() => setIsReportModalOpen(false)} className="p-4 bg-white text-slate-400 hover:text-slate-950 transition-all rounded-full border-2 border-slate-100">
                  <X size={28} />
                </button>
              </div>
            </div>

            {/* Report Content */}
            <div className="flex-1 overflow-y-auto p-12 space-y-12 print:overflow-visible print:p-0">
              <div className="flex justify-between items-start border-b-4 border-slate-950 pb-10">
                <div>
                  <h1 className="text-5xl font-black text-slate-950 tracking-tighter uppercase mb-4">Production Report</h1>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Project ID: <span className="text-slate-950">{project.patientNumber}</span></p>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Patient: <span className="text-slate-950">{project.firstName} {project.lastName}</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Generation Date</p>
                  <p className="text-xl font-black text-slate-950">{new Date().toLocaleDateString('en-GB')}</p>
                </div>
              </div>

              <div className="space-y-16">
                {stages.map((stage, idx) => {
                  const operator = project.stageOperators?.[stage.id];
                  const assets = project.stageFiles?.[stage.id];
                  const approved = !!project.approvals?.[stage.id];
                  
                  if (!operator && !assets) return null;

                  return (
                    <div key={stage.id} className="space-y-8 break-inside-avoid">
                      <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
                        <div className="flex items-center gap-4">
                          <span className="w-10 h-10 bg-slate-950 text-white flex items-center justify-center rounded-xl font-black">{idx + 1}</span>
                          <h4 className="text-2xl font-black text-slate-950 tracking-tight">{stage.name}</h4>
                        </div>
                        {approved && (
                          <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                            <CheckCircle size={16} /> Verified
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-10">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Primary Operator</p>
                          <p className="text-lg font-black text-slate-900">{operator?.name || 'Unrecorded'}</p>
                          <p className="text-xs font-bold text-slate-500 mt-1">{operator?.timestamp ? new Date(operator.timestamp).toLocaleString() : 'N/A'}</p>
                        </div>
                        {stage.software && (
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Software Protocol</p>
                            <p className="text-lg font-black text-slate-900">{stage.software}</p>
                          </div>
                        )}
                      </div>

                      {assets && assets.length > 0 && (
                        <div className="space-y-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manufacturing Assets ({assets.length})</p>
                          <div className="grid grid-cols-2 gap-4">
                            {assets.map((url, i) => {
                              const isVideo = url.toLowerCase().includes('.webm') || url.toLowerCase().includes('.mp4');
                              if (isVideo) return null; // Videos are not printable
                              return (
                                <div key={i} className="aspect-video rounded-3xl overflow-hidden border-2 border-slate-100 bg-slate-50">
                                  <img src={url} alt={`Stage ${stage.stageNumber} Asset`} className="w-full h-full object-cover" />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Stage-Specific Feedback Trail */}
                      {project.stageTrails?.[stage.id] && project.stageTrails[stage.id].length > 0 && (
                        <div className="space-y-4 pt-6 border-t border-slate-50">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <MessageSquare size={14} /> Feedback & Discussion Trail ({project.stageTrails[stage.id].length})
                          </p>
                          <div className="space-y-3">
                            {project.stageTrails[stage.id].map((msg) => (
                              <div key={msg.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-black text-slate-900 uppercase">{msg.senderName} ({msg.senderRole})</span>
                                  <span className="text-[9px] font-bold text-slate-400">{new Date(msg.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">{msg.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* General Project Feedback Trail */}
              {project.trail && project.trail.length > 0 && (
                <div className="space-y-8 pt-12 border-t-4 border-slate-950 break-inside-avoid">
                  <h3 className="text-3xl font-black text-slate-950 tracking-tight uppercase">General Project Feedback Trail</h3>
                  <div className="space-y-4">
                    {project.trail.map((msg) => (
                      <div key={msg.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-slate-950 uppercase">{msg.senderName} ({msg.senderRole})</span>
                          <span className="text-[10px] font-bold text-slate-400">{new Date(msg.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">{msg.text}</p>
                        {msg.imageUrl && (
                          <div className="mt-4 max-w-sm rounded-2xl overflow-hidden border border-slate-200">
                            <img src={msg.imageUrl} alt="attached" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-20 border-t-2 border-slate-100 flex justify-between items-end opacity-40">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">End of Manufacturing Dossier - Enhance HNR</p>
                <div className="w-32 h-1 bg-slate-950"></div>
              </div>
            </div>
          </div>
          
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * { visibility: hidden; }
              .print\\:block, .print\\:block * { visibility: visible; }
              #root > div:last-child { visibility: visible; position: absolute; left: 0; top: 0; width: 100%; }
              .print\\:hidden { display: none !important; }
              .print\\:p-0 { padding: 0 !important; }
              .print\\:m-0 { margin: 0 !important; }
              .print\\:shadow-none { shadow: none !important; }
              .print\\:rounded-none { border-radius: 0 !important; }
            }
          `}} />
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;