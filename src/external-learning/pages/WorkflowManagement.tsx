import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Save, 
  Loader2, 
  Database, 
  Box, 
  Microscope, 
  Layers, 
  ChevronDown, 
  Download, 
  Upload, 
  ShieldCheck, 
  Ruler, 
  GripVertical,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { StageTemplate, StageStep } from '../types';
import { doc, onSnapshot, setDoc, query, collection, orderBy, deleteDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

// Standardized slugification to prevent ID collisions and issues with special characters (like parentheses)
const slugify = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric with underscores
    .replace(/^_+|_+$/g, '');    // Remove leading/trailing underscores
};

const WorkflowManagement: React.FC = () => {
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('orbital');
  const [selectedProcess, setSelectedProcess] = useState<'pattern' | 'mold_fdm' | 'mold_sla' | 'mold_combination'>('pattern');
  const [stages, setStages] = useState<StageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);

  const [newStage, setNewStage] = useState<Partial<StageTemplate>>({
    name: '',
    software: '',
    phase: 'pattern',
    tutorialVideoUrl: '',
    referenceLinks: [],
    guidelines: '',
    isKeyStage: false,
    steps: []
  });

  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingVideo(true);
    try {
      const storageRef = ref(storage, `tutorial_videos/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setNewStage({ ...newStage, tutorialVideoUrl: url });
    } catch (err) {
      console.error('Video upload failed', err);
      alert('Video upload failed');
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const [tempStep, setTempStep] = useState<Partial<StageStep>>({ 
    name: '', 
    description: '', 
    requiresMeasurement: false, 
    measurementLabel: '' 
  });

  const processOptions = [
    { id: 'pattern', name: 'Phase 1: Design (Pattern)', icon: Microscope, color: 'text-sky-500' },
    { id: 'mold_fdm', name: 'Phase 2: Mold (FDM)', icon: Box, color: 'text-indigo-500' },
    { id: 'mold_sla', name: 'Phase 2: Mold (SLA)', icon: Box, color: 'text-emerald-500' },
    { id: 'mold_combination', name: 'Phase 2: Mold (Combination)', icon: Box, color: 'text-amber-500' }
  ];

  useEffect(() => {
    const q = query(collection(db, 'defect_categories'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const cats = snap.docs.map(d => ({ id: d.id, name: d.data().name }));
      setCategories(cats);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // CRITICAL: Immediately purge local state to prevent overlap while waiting for Firestore
    setStages([]);
    setLoading(true);
    
    const configId = `${selectedProcess}_${selectedCategory}`;
    const unsub = onSnapshot(doc(db, 'workflow_configs', configId), (snap) => {
      // Race condition safety check: ensure this snapshot still matches current selections
      if (snap.id !== `${selectedProcess}_${selectedCategory}`) {
        console.warn("Discarded stale snapshot for ID:", snap.id);
        return;
      }

      const data = snap.exists() ? snap.data().stages || [] : [];
      const sortedStages = [...data].sort((a, b) => (a.stageNumber || 0) - (b.stageNumber || 0));
      setStages(sortedStages);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Registry Error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedCategory, selectedProcess]);

  const handleExport = () => {
    if (loading) return;
    const dataStr = JSON.stringify(stages, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `blueprint_${selectedProcess}_${selectedCategory}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (loading) return;
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) {
          if (window.confirm(`Blueprint detected for ${selectedCategory}. Overwrite existing stages?`)) {
            persistStages(json);
          }
        }
      } catch (err) {
        alert("Invalid Blueprint format.");
      }
    };
    reader.readAsText(file);
  };

  const persistStages = async (updatedStages: StageTemplate[]) => {
    // LOADING GUARD: Prevent writes if the UI is still in flux
    if (loading) return;
    
    const configId = `${selectedProcess}_${selectedCategory}`;
    const reindexed = updatedStages.map((s, idx) => ({ ...s, stageNumber: idx + 1 }));
    
    try {
      await setDoc(doc(db, 'workflow_configs', configId), {
        category: selectedCategory,
        processType: selectedProcess,
        stages: reindexed,
        lastUpdated: new Date().toISOString()
      });
    } catch (err) {
      console.error("Registry Sync Failure:", err);
      alert("System Registry Sync Failed. Check Node Connectivity.");
    }
  };

  const handleSaveStage = () => {
    if (!newStage.name || loading) return;
    const phase = selectedProcess === 'pattern' ? 'pattern' : 'mold';
    let updated: StageTemplate[];

    if (editingStageId) {
      updated = stages.map(s => s.id === editingStageId ? { ...s, ...newStage } as StageTemplate : s);
    } else {
      updated = [...stages, { ...newStage, id: `st_${Date.now()}`, stageNumber: stages.length + 1, phase, category: selectedCategory } as StageTemplate];
    }

    persistStages(updated);
    setIsModalOpen(false);
    setEditingStageId(null);
  };

  const handleSaveStep = () => {
    if (!tempStep.name || loading) return;

    if (editingStepId) {
      const updatedSteps = (newStage.steps || []).map(s => 
        s.id === editingStepId ? { ...s, name: tempStep.name!, description: tempStep.description || '' } : s
      );
      setNewStage(prev => ({ ...prev, steps: updatedSteps }));
    } else {
      const step: StageStep = { 
        id: `step_${Date.now()}`, 
        name: tempStep.name, 
        description: tempStep.description || '', 
        isCompleted: false 
      };
      setNewStage(prev => ({ ...prev, steps: [...(prev.steps || []), step] }));
    }

    setEditingStepId(null);
    setTempStep({ name: '', description: '' });
  };

  const handleEditStep = (step: StageStep) => {
    setEditingStepId(step.id);
    setTempStep({
      name: step.name,
      description: step.description || ''
    });
  };

  const onDragStartStage = (index: number) => {
    if (loading) return;
    setDraggedItemIndex(index);
  };

  const onDragOverStage = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index || loading) return;
    const newStages = [...stages];
    const item = newStages[draggedItemIndex];
    newStages.splice(draggedItemIndex, 1);
    newStages.splice(index, 0, item);
    setDraggedItemIndex(index);
    setStages(newStages);
  };

  const onDropStage = () => {
    if (loading) return;
    setDraggedItemIndex(null);
    persistStages(stages);
  };

  const onDragStartStep = (index: number) => setDraggedStepIndex(index);
  const onDragOverStep = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedStepIndex === null || draggedStepIndex === index) return;
    const newSteps = [...(newStage.steps || [])];
    const item = newSteps[draggedStepIndex];
    newSteps.splice(draggedStepIndex, 1);
    newSteps.splice(index, 0, item);
    setDraggedStepIndex(index);
    setNewStage(prev => ({ ...prev, steps: newSteps }));
  };
  const onDropStep = () => setDraggedStepIndex(null);

  const handleDeleteCategory = async (catId: string) => {
    if (window.confirm(`Permanently remove this prosthesis type? This action cannot be reversed.`)) {
      try {
        await deleteDoc(doc(db, 'defect_categories', catId));
        if (selectedCategory === catId && categories.length > 1) {
          setSelectedCategory(categories.find(c => c.id !== catId)?.id || '');
        }
      } catch (err) {
        console.error("Registry Purge Failure", err);
      }
    }
  };

  const handleDeleteStage = (stageId: string, stageName: string) => {
    if (loading) return;
    if (window.confirm(`Revoke node "${stageName}" from this specific blueprint?`)) {
      const updated = stages.filter(s => s.id !== stageId);
      persistStages(updated);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Workflow Engine</h2>
          <p className="text-slate-500 font-medium italic">Isolating Protocol: {selectedCategory.toUpperCase()}</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button 
            disabled={loading}
            onClick={handleExport} 
            className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-600 px-5 py-3.5 rounded-2xl font-black text-xs flex items-center justify-center transition-all hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={16} className="mr-2" /> Export
          </button>
          <button 
            disabled={loading}
            onClick={() => fileInputRef.current?.click()} 
            className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-600 px-5 py-3.5 rounded-2xl font-black text-xs flex items-center justify-center transition-all hover:bg-slate-50 disabled:opacity-50"
          >
            <Upload size={16} className="mr-2" /> Import
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportFile} />
          <button 
            disabled={loading}
            onClick={() => { 
              setEditingStageId(null); 
              setNewStage({ name: '', software: '', tutorialVideoUrl: '', referenceLinks: [], guidelines: '', isKeyStage: false, steps: [] }); 
              setIsModalOpen(true); 
            }} 
            className="flex-1 md:flex-none bg-sky-600 hover:bg-sky-700 text-white px-8 py-3.5 rounded-[2rem] font-black text-sm flex items-center justify-center shadow-xl shadow-sky-100 transition-all active:scale-95 disabled:opacity-50"
          >
            <Plus size={18} className="mr-2" /> New Stage
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col gap-8 items-end">
        <div className="space-y-1.5 w-full">
          <div className="flex items-center justify-between px-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Layers size={12} /> Workflows
            </label>
            <button 
              onClick={() => setIsCategoryModalOpen(true)}
              className="text-[10px] font-black text-sky-600 uppercase tracking-widest hover:underline"
            >
              Manage Registry
            </button>
          </div>
          <div className="relative">
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-700 outline-none appearance-none cursor-pointer"
            >
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
          </div>
        </div>
      </div>

      {/* KEY-BASED RESET: The key forces React to unmount and remount this entire block, purging stale state */}
      <div key={`${selectedCategory}_${selectedProcess}`} className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[400px] relative">
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p className="text-[10px] font-black uppercase tracking-widest">Securing Blueprint Context...</p>
          </div>
        ) : stages.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-center p-12">
            <Database size={48} className="text-slate-200 mb-6" />
            <h4 className="text-xl font-black text-slate-400">Registry Entry Empty</h4>
            <p className="text-xs text-slate-400 mt-2 max-w-xs font-medium">Initialize the manufacturing protocol for this specific category node.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {stages.map((stage, idx) => (
              <div 
                key={stage.id} 
                draggable 
                onDragStart={() => onDragStartStage(idx)}
                onDragOver={(e) => onDragOverStage(e, idx)}
                onDrop={onDropStage}
                className={`p-8 flex items-center group hover:bg-slate-50/50 transition-all ${draggedItemIndex === idx ? 'opacity-40 bg-sky-50' : ''}`}
              >
                <div className="cursor-grab active:cursor-grabbing mr-4 p-2 text-slate-300 hover:text-slate-500">
                  <GripVertical size={20} />
                </div>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg mr-8 bg-sky-600 text-white shadow-lg relative">
                  {idx + 1}
                  {stage.isKeyStage && <div className="absolute -top-2 -right-2 bg-amber-500 text-white p-1 rounded-full border-2 border-white shadow-lg"><ShieldCheck size={10} /></div>}
                </div>
                <div className="flex-1 min-w-0 pr-8">
                  <h4 className="font-black text-xl text-slate-900 truncate">{stage.name}</h4>
                  <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase mt-1">
                    <span>{stage.steps?.length || 0} Steps</span>
                    {stage.software && <span className="text-sky-600">{stage.software}</span>}
                    {stage.isKeyStage && <span className="text-amber-500 font-black">Auth Lock</span>}
                  </div>
                </div>
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => { setEditingStageId(stage.id); setNewStage(stage); setIsModalOpen(true); }} className="p-4 bg-white border border-slate-200 text-slate-400 hover:text-sky-600 rounded-2xl shadow-sm"><Edit2 size={18} /></button>
                  <button onClick={() => handleDeleteStage(stage.id, stage.name)} className="p-4 bg-white border border-slate-200 text-slate-400 hover:text-red-500 rounded-2xl shadow-sm"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-white flex flex-col max-h-[95vh]">
            <div className="p-8 bg-[#0f172a] text-white flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Layers size={28} className="text-sky-400" />
                <h3 className="text-2xl font-black tracking-tight">{editingStageId ? 'Modify' : 'Initialize'} Stage</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white/5 rounded-full transition-all text-slate-400 hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="p-10 overflow-y-auto space-y-10 flex-1 custom-scrollbar">
              <div className="flex items-center justify-between bg-amber-50/50 p-6 rounded-3xl border border-amber-100/50">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${newStage.isKeyStage ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Admin Authorization Lock</h5>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Mandatory manual sign-off required</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setNewStage({...newStage, isKeyStage: !newStage.isKeyStage})}
                  className={`w-14 h-8 rounded-full transition-all relative ${newStage.isKeyStage ? 'bg-amber-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${newStage.isKeyStage ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-2">Stage Descriptor</label>
                <input className="w-full bg-[#f8fafc] border-none rounded-2xl px-6 py-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-sky-500/10" value={newStage.name} onChange={e => setNewStage({...newStage, name: e.target.value})} placeholder="e.g. Scanned Data Alignment" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-2">Primary Software</label>
                  <input className="w-full bg-[#f8fafc] border-none rounded-2xl px-6 py-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-sky-500/10" value={newStage.software} onChange={e => setNewStage({...newStage, software: e.target.value})} placeholder="e.g. ExoCAD" />
                </div>
                
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-2">Tutorial Video Upload</label>
                  <div className="bg-[#f8fafc] rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
                    <input 
                      type="file" 
                      accept="video/*" 
                      onChange={handleVideoUpload} 
                      className="text-xs font-bold text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100" 
                    />
                    {isUploadingVideo && <Loader2 className="animate-spin text-sky-500" size={20} />}
                    {newStage.tutorialVideoUrl && !isUploadingVideo && (
                      <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1"><CheckCircle2 size={14} /> Uploaded</span>
                    )}
                  </div>
                </div>

                <div className="space-y-4 sm:col-span-2 mt-2">
                  <div className="flex items-center justify-between px-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Reference Links</label>
                    <button 
                      type="button" 
                      onClick={() => setNewStage({...newStage, referenceLinks: [...(newStage.referenceLinks || []), {label: '', url: ''}]})}
                      className="text-[10px] font-black text-sky-500 uppercase flex items-center gap-1 hover:text-sky-600"
                    >
                      <Plus size={12} /> Add Link
                    </button>
                  </div>
                  <div className="space-y-3">
                    {newStage.referenceLinks?.map((link, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input className="w-1/3 bg-[#f8fafc] border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-500/20" value={link.label} onChange={e => {
                          const updated = [...(newStage.referenceLinks || [])];
                          updated[idx].label = e.target.value;
                          setNewStage({...newStage, referenceLinks: updated});
                        }} placeholder="Label (e.g. Docs)" />
                        <input className="flex-1 bg-[#f8fafc] border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-sky-500/20" value={link.url} onChange={e => {
                          const updated = [...(newStage.referenceLinks || [])];
                          updated[idx].url = e.target.value;
                          setNewStage({...newStage, referenceLinks: updated});
                        }} placeholder="URL (https://...)" />
                        <button type="button" onClick={() => {
                          const updated = newStage.referenceLinks?.filter((_, i) => i !== idx);
                          setNewStage({...newStage, referenceLinks: updated});
                        }} className="p-2 text-red-400 hover:text-red-500 bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    ))}
                    {(!newStage.referenceLinks || newStage.referenceLinks.length === 0) && (
                      <p className="text-xs text-slate-400 italic px-2">No reference links added.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-10 rounded-[3rem] space-y-8 bg-[#0f172a] shadow-2xl relative overflow-hidden">
                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400">Step Verification Protocol</h5>
                
                <div className="space-y-3">
                  {newStage.steps?.map((step, i) => (
                    <div 
                      key={step.id} 
                      draggable 
                      onDragStart={() => onDragStartStep(i)}
                      onDragOver={(e) => onDragOverStep(e, i)}
                      onDrop={onDropStep}
                      className={`flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl text-white group hover:bg-white/10 transition-all ${draggedStepIndex === i ? 'opacity-30' : ''}`}
                    >
                      <div className="cursor-grab active:cursor-grabbing p-1 mr-2 text-white/20 hover:text-white/50">
                        <GripVertical size={16} />
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-xs font-black">{step.name}</p>
                        {step.description && <p className="text-[10px] text-slate-400 mt-1 truncate">{step.description}</p>}
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleEditStep(step)} className="p-2 hover:text-sky-400 transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => setNewStage({...newStage, steps: newStage.steps?.filter((_, idx) => idx !== i)})} className="p-2 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-6 pt-6 mt-6 border-t border-white/5">
                  <div className="space-y-4">
                    <input 
                      placeholder="Step Title" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white text-sm font-bold outline-none focus:ring-4 focus:ring-sky-500/20" 
                      value={tempStep.name} 
                      onChange={e => setTempStep({...tempStep, name: e.target.value})} 
                    />
                    <textarea 
                      placeholder="Step Description (Optional instructions for the student)" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white text-sm outline-none focus:ring-4 focus:ring-sky-500/20 resize-none h-24" 
                      value={tempStep.description || ''} 
                      onChange={e => setTempStep({...tempStep, description: e.target.value})} 
                    />
                  </div>

                  <button 
                    type="button"
                    onClick={handleSaveStep} 
                    className={`w-full py-5 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 ${editingStepId ? 'bg-emerald-600' : 'bg-[#0088cc]'} text-white`}
                  >
                    {editingStepId ? 'Update Step' : 'Add verification step'}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-white flex justify-center items-center space-x-12">
              <button onClick={() => setIsModalOpen(false)} className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-all">Discard Changes</button>
              <button 
                onClick={handleSaveStage} 
                className="bg-slate-900 hover:bg-black text-white px-14 py-5 rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3 active:scale-95 transition-all"
              >
                <Save size={18} /> Commit blueprint
              </button>
            </div>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[3.5rem] p-10 space-y-8 overflow-hidden shadow-2xl border border-white/20">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Prosthesis Registry</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-all"><X size={24} /></button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                  <span className="font-bold text-slate-700 text-sm">{cat.name}</span>
                  <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="pt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Register New Category</label>
                <input 
                  className="w-full bg-slate-100 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-sky-500/20 outline-none" 
                  placeholder="e.g. Orbital Adhesive" 
                  value={newCategoryName} 
                  onChange={e => setNewCategoryName(e.target.value)} 
                />
              </div>
              <button onClick={async () => {
                const name = newCategoryName.trim();
                if (!name) return;
                // Standardized ID generation
                const slug = slugify(name);
                
                const docRef = doc(db, 'defect_categories', slug);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                  alert("Prosthesis ID collision: This type already exists in the Registry.");
                  return;
                }

                await setDoc(docRef, { name, createdAt: new Date().toISOString() });
                setNewCategoryName('');
              }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95">
                Commit to Registry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowManagement;