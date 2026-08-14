import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Play, BookOpen, X, Loader2, Database, AlertCircle, Video, CheckCircle, Lock, ChevronDown, ListVideo } from 'lucide-react';
import { StageTemplate, StageStep, UserProfile } from '../types';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, doc, setDoc } from 'firebase/firestore';
import CustomVideoPlayer from '../components/CustomVideoPlayer';

interface WorkflowConfig {
  id: string;
  category: string;
  processType: string;
  stages: StageTemplate[];
  lastUpdated: string;
}

interface DefectCategory {
  id: string;
  name: string;
}

const Projects: React.FC<{ onProjectClick?: (id: string) => void, currentUser: UserProfile }> = ({ currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [configs, setConfigs] = useState<WorkflowConfig[]>([]);
  const [categories, setCategories] = useState<DefectCategory[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Progress tracking
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  // Modal State
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowConfig | null>(null);
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);
  const [expandedStageIndex, setExpandedStageIndex] = useState<number | null>(0);

  useEffect(() => {
    const unsubCats = onSnapshot(query(collection(db, 'defect_categories'), orderBy('name', 'asc')), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
    }, (err) => console.error("Categories fetch error:", err));

    const unsubConfigs = onSnapshot(collection(db, 'workflow_configs'), (snap) => {
      setConfigs(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkflowConfig)));
      setLoading(false);
    }, (err) => {
      console.error("Workflow fetch error:", err);
      setLoading(false);
    });

    return () => {
      unsubCats();
      unsubConfigs();
    };
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    const unsubProgress = onSnapshot(collection(db, 'users', currentUser.id, 'progress'), (snap) => {
       const progressMap: Record<string, boolean> = {};
       snap.forEach(d => {
           progressMap[d.id] = true; 
       });
       setCompletedSteps(progressMap);
    }, (err) => {
       console.error("Progress fetch error:", err);
    });
    return () => unsubProgress();
  }, [currentUser?.id]);

  const getCategoryName = (catId: string) => {
    const cat = categories.find(c => c.id.toLowerCase() === catId.toLowerCase());
    return cat ? cat.name : catId;
  };

  const handleCheckStep = async (stepId: string) => {
    if (!currentUser?.id) return;
    try {
      await setDoc(doc(db, 'users', currentUser.id, 'progress', stepId), {
        completedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to save progress:", err);
      setCompletedSteps(prev => ({ ...prev, [stepId]: true }));
    }
  };

  const handleMarkStageComplete = async (stageId: string) => {
    if (!currentUser?.id) return;
    try {
      await setDoc(doc(db, 'users', currentUser.id, 'progress', `stage_${stageId}`), {
        completedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to save stage progress:", err);
      setCompletedSteps(prev => ({ ...prev, [`stage_${stageId}`]: true }));
    }
  };

  const isStageCompleted = (stage: StageTemplate) => {
    if (completedSteps[`stage_${stage.id}`]) return true;
    if (!stage.steps || stage.steps.length === 0) return false;
    return stage.steps.every(step => completedSteps[step.id]);
  };

  const getWorkflowProgress = (config: WorkflowConfig) => {
    if (!config.stages || config.stages.length === 0) return { completed: 0, total: 0, percent: 0 };
    const completed = config.stages.filter(s => isStageCompleted(s)).length;
    return {
      completed,
      total: config.stages.length,
      percent: Math.round((completed / config.stages.length) * 100)
    };
  };

  const filteredConfigs = configs.filter(config => {
    if (!searchTerm) return true;
    const catName = getCategoryName(config.category);
    const procName = config.processType === 'pattern' ? 'Design Phase' : 'Manufacturing Phase';
    const searchStr = `${catName} ${procName} ${config.stages.map(s => s.name).join(' ')}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  const openWorkflow = (config: WorkflowConfig) => {
    // Find first incomplete stage, or default to 0
    const sortedStages = [...(config.stages || [])].sort((a, b) => a.stageNumber - b.stageNumber);
    let firstIncomplete = sortedStages.findIndex(s => !isStageCompleted(s));
    if (firstIncomplete === -1) firstIncomplete = 0; // all complete, start at 0
    
    // Create a normalized copy of the config with sorted stages
    setSelectedWorkflow({ ...config, stages: sortedStages });
    setActiveStageIndex(firstIncomplete);
    setExpandedStageIndex(firstIncomplete);
  };

  const activeStage = selectedWorkflow?.stages[activeStageIndex];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 font-heading tracking-tight">Learning Library</h2>
          <p className="text-slate-500 font-medium mt-1">Explore all workflows and training courses</p>
        </div>
      </div>

      <div className="relative w-full md:w-96">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
          type="text" 
          placeholder="Search courses or categories..." 
          className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none text-sm shadow-sm transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="animate-spin mb-4" size={32} />
          <p className="text-xs font-black uppercase tracking-widest">Accessing Video Library...</p>
        </div>
      ) : (
        <div className="animate-fade-in">
          {filteredConfigs.length === 0 ? (
            <div className="py-24 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
              <Database className="mx-auto text-slate-300 mb-4" size={40} />
              <p className="text-slate-500 font-semibold text-sm">No courses found.</p>
              <p className="text-slate-400 text-xs mt-1">Ensure you have defined workflows.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredConfigs.map((config) => {
                const progress = getWorkflowProgress(config);
                const isFullyComplete = progress.completed === progress.total && progress.total > 0;
                
                return (
                  <div 
                    key={config.id}
                    onClick={() => openWorkflow(config)}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover-lift cursor-pointer group flex flex-col h-full transition-all"
                  >
                    {/* Thumbnail / Header Area */}
                    <div className="h-32 bg-slate-900 relative flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 z-0"></div>
                      
                      {isFullyComplete ? (
                        <div className="z-10 bg-emerald-500 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                          <CheckCircle size={24} />
                        </div>
                      ) : (
                        <div className="z-10 bg-sky-500 w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-sky-500/30 group-hover:scale-110 transition-transform">
                          <ListVideo className="text-white ml-0.5" size={24} />
                        </div>
                      )}
                      
                      <div className="absolute top-3 right-3 z-10 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest text-white border border-white/10">
                        {progress.total} STAGES
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="text-lg font-bold text-slate-900 font-heading leading-tight mb-1">
                        {config.processType === 'pattern' ? 'Design Course' : 'Manufacturing Course'}
                      </h3>
                      <p className="text-sm font-semibold text-sky-600 mb-4">{getCategoryName(config.category)}</p>
                      
                      {/* Progress Bar */}
                      <div className="mt-auto">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Course Progress</span>
                          <span className="text-xs font-bold text-slate-700">{progress.percent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isFullyComplete ? 'bg-emerald-500' : 'bg-sky-500'}`}
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Full Screen Theater Modal */}
      {selectedWorkflow && activeStage && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col md:flex-row bg-black h-[100dvh] animate-fade-in">
          
          {/* Main Video Area */}
          <div className="w-full h-[35vh] md:h-full md:flex-1 flex flex-col relative shrink-0">
            <div className="px-4 py-3 md:px-6 md:py-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-50 pointer-events-none">
              <div className="text-white drop-shadow-md">
                <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-sky-400 mb-1 drop-shadow-md flex items-center gap-2">
                  <ListVideo size={12} /> {getCategoryName(selectedWorkflow.category)}
                </div>
                <h2 className="text-lg md:text-2xl font-bold tracking-tight line-clamp-1">{activeStage.name}</h2>
              </div>
              
              <button 
                onClick={() => setSelectedWorkflow(null)}
                className="p-2 md:p-3 bg-black/40 hover:bg-white/20 backdrop-blur-md rounded-full transition-colors text-white pointer-events-auto shadow-xl"
              >
                <X size={20} className="md:w-6 md:h-6" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center p-0 md:p-12 relative overflow-hidden bg-black">
              {activeStage.tutorialVideoUrl ? (
                <div className="w-full h-full max-h-[35vh] md:max-h-screen rounded-none md:rounded-2xl overflow-hidden shadow-2xl ring-0 md:ring-1 md:ring-white/10 relative z-10 bg-black">
                  <CustomVideoPlayer 
                    key={activeStage.id} // forces remount on stage change
                    src={activeStage.tutorialVideoUrl} 
                  />
                </div>
              ) : (
                <div className="text-center relative z-10 px-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 md:w-24 md:h-24 rounded-full bg-slate-800 mb-4 md:mb-6 border border-slate-700">
                    <Video size={32} className="text-slate-500" />
                  </div>
                  <h3 className="text-lg md:text-2xl font-bold text-white mb-2">Video Unavailable</h3>
                  <p className="text-xs md:text-sm text-slate-400">Follow the steps below.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right/Bottom Sidebar Overlay (Playlist) */}
          <div className="w-full md:w-96 bg-white flex flex-col flex-1 border-t md:border-t-0 md:border-l border-slate-200 shadow-2xl relative z-40 overflow-hidden rounded-t-2xl md:rounded-none -mt-4 md:mt-0">
            <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50 shrink-0 sticky top-0 z-10">
               <h3 className="text-lg font-black tracking-tight text-slate-900">Course Stages</h3>
               <p className="text-xs text-slate-500 font-medium mt-1">Complete steps sequentially to progress.</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 pb-safe-bottom">
               {selectedWorkflow.stages.map((stage, sIdx) => {
                 const isCompleted = isStageCompleted(stage);
                 const prevStage = sIdx > 0 ? selectedWorkflow.stages[sIdx - 1] : null;
                 const isLocked = prevStage ? !isStageCompleted(prevStage) : false;
                 const isActive = activeStageIndex === sIdx;

                 const isExpanded = expandedStageIndex === sIdx;

                 return (
                   <div key={stage.id} className={`rounded-2xl border overflow-hidden transition-all duration-300 ${isActive ? 'border-sky-300 bg-sky-50 shadow-md ring-2 ring-sky-500/20' : isCompleted ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 cursor-pointer' : isLocked ? 'border-slate-100 bg-slate-50/50 opacity-60 grayscale cursor-not-allowed' : 'border-slate-200 bg-white hover:border-sky-300 cursor-pointer'}`}>
                     
                     {/* Stage Header */}
                     <div 
                       className="p-4 flex items-center justify-between gap-4 cursor-pointer"
                       onClick={() => {
                         if (isLocked) return;
                         // If not active, clicking makes it active and expanded
                         if (!isActive) {
                           setActiveStageIndex(sIdx);
                           setExpandedStageIndex(sIdx);
                         } else {
                           // If already active, just toggle expansion
                           setExpandedStageIndex(isExpanded ? null : sIdx);
                         }
                       }}
                     >
                       <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center font-bold text-sm ${isActive ? 'bg-sky-500 text-white' : isCompleted ? 'bg-emerald-500 text-white' : isLocked ? 'bg-slate-200 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                            {isCompleted && !isActive ? <CheckCircle size={16} /> : stage.stageNumber}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-bold text-sm truncate ${isActive ? 'text-sky-900' : isCompleted ? 'text-emerald-900' : isLocked ? 'text-slate-500' : 'text-slate-900'}`}>
                              {stage.name}
                            </h4>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 flex items-center gap-1">
                              {isLocked ? <><Lock size={10} /> Locked</> : isCompleted ? 'Completed' : isActive ? 'Now Playing' : 'Ready'}
                            </p>
                          </div>
                       </div>
                       
                       {!isLocked && (
                         <div className="shrink-0 text-slate-400">
                           <ChevronDown size={18} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                         </div>
                       )}
                     </div>

                     {/* Expanded Steps (Accordion) */}
                     {isExpanded && (
                       <div className="border-t border-sky-100 bg-white p-4 space-y-3 animate-fade-in">
                         {stage.steps && stage.steps.length > 0 ? (
                           stage.steps.map((step, idx) => {
                             const isStepCompleted = completedSteps[step.id];
                             const prevStep = idx > 0 ? stage.steps[idx - 1] : null;
                             const isStepLocked = prevStep ? !completedSteps[prevStep.id] : false;

                             return (
                               <div key={idx} className="flex gap-3">
                                 <button 
                                   disabled={isStepLocked || isStepCompleted}
                                   onClick={() => handleCheckStep(step.id)}
                                   className={`w-6 h-6 rounded-md flex shrink-0 items-center justify-center transition-all mt-0.5 ${isStepCompleted ? 'bg-emerald-500 text-white' : isStepLocked ? 'bg-slate-100 border border-slate-200 text-slate-400' : 'bg-white border-2 border-sky-500 text-sky-600 hover:bg-sky-50'}`}
                                 >
                                   {isStepCompleted && <CheckCircle size={14} />}
                                 </button>
                                 <div className="flex-1 min-w-0">
                                   <h5 className={`font-bold text-sm leading-snug ${isStepCompleted ? 'text-emerald-800' : isStepLocked ? 'text-slate-500' : 'text-sky-900'}`}>{step.name}</h5>
                                   {step.description && <p className="text-xs text-slate-500 mt-1">{step.description}</p>}
                                 </div>
                               </div>
                             );
                           })
                         ) : (
                           <div className="text-center py-2">
                             <p className="text-xs text-slate-500 mb-3">No specific steps defined.</p>
                             {!isStageCompleted(stage) ? (
                               <button 
                                 onClick={() => handleMarkStageComplete(stage.id)}
                                 className="px-4 py-1.5 bg-emerald-500 text-white font-bold text-xs rounded-lg hover:bg-emerald-600 transition-colors w-full"
                               >
                                 Mark Stage Complete
                               </button>
                             ) : (
                               <div className="px-4 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-200 flex items-center justify-center gap-2">
                                 <CheckCircle size={14} /> Completed
                               </div>
                             )}
                           </div>
                         )}

                         {/* Stage Complete Banner linking to next stage */}
                         {isStageCompleted(stage) && sIdx < selectedWorkflow.stages.length - 1 && (
                            <div 
                              className="mt-4 p-3 bg-gradient-to-r from-sky-500 to-sky-400 rounded-xl text-white cursor-pointer shadow-md hover:shadow-lg transition-all flex items-center justify-between"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveStageIndex(sIdx + 1);
                                setExpandedStageIndex(sIdx + 1);
                              }}
                            >
                               <div>
                                 <div className="text-[10px] font-black uppercase tracking-widest text-sky-100 mb-0.5">Stage Complete</div>
                                 <div className="font-bold text-sm">Play Next Stage</div>
                               </div>
                               <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                 <Play size={16} className="fill-white" />
                               </div>
                            </div>
                         )}

                         {stage.guidelines && (
                           <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                             <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Guidelines</h4>
                             <p className="text-xs text-slate-600 whitespace-pre-wrap">{stage.guidelines}</p>
                           </div>
                         )}
                       </div>
                     )}
                   </div>
                 );
               })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Projects;