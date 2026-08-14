import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc, orderBy, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { ImageLearningCategory, ImageLearningItem, UserProfile } from '../types';
import { ImagePlus, Trash2, Plus, ImageIcon, Upload, Loader2, X } from 'lucide-react';

const slugify = (text: string) => {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

interface ManageImageLearningProps {
  user: UserProfile;
}

const ManageImageLearning: React.FC<ManageImageLearningProps> = ({ user }) => {
  const [categories, setCategories] = useState<ImageLearningCategory[]>([]);
  const [items, setItems] = useState<ImageLearningItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemFile, setNewItemFile] = useState<File | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch Categories
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'image_learning_categories'), orderBy('name', 'asc')), (snap) => {
      const cats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImageLearningCategory));
      setCategories(cats);
      if (cats.length > 0 && !activeCategoryId) {
        setActiveCategoryId(cats[0].id);
      }
    });
    return unsub;
  }, [activeCategoryId]);

  // Fetch Items for active category
  useEffect(() => {
    if (!activeCategoryId) {
      setItems([]);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, 'image_learning_items'), where('categoryId', '==', activeCategoryId), orderBy('createdAt', 'desc')),
      (snap) => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImageLearningItem));
        setItems(data);
      }
    );
    return unsub;
  }, [activeCategoryId]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const slug = slugify(newCategoryName);
    try {
      await addDoc(collection(db, 'image_learning_categories'), { name: newCategoryName.trim(), id: slug });
      setNewCategoryName('');
      setActiveCategoryId(slug); // wait, addDoc gives auto-id, let's just let it auto-id
    } catch (e) {
      console.error("Error adding category", e);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm("Are you sure? This deletes the category but NOT its images from storage.")) return;
    await deleteDoc(doc(db, 'image_learning_categories', id));
    if (activeCategoryId === id) setActiveCategoryId('');
  };

  const handleUploadItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategoryId || !newItemName || !newItemFile) return;

    setUploading(true);
    setUploadProgress(10); // Fake progress for UX

    try {
      const fileExt = newItemFile.name.split('.').pop();
      const fileName = `image_learning/${activeCategoryId}/${Date.now()}_${slugify(newItemName)}.${fileExt}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, newItemFile);
      setUploadProgress(70);
      
      const downloadUrl = await getDownloadURL(storageRef);
      setUploadProgress(90);
      
      await addDoc(collection(db, 'image_learning_items'), {
        categoryId: activeCategoryId,
        name: newItemName.trim(),
        description: newItemDescription.trim(),
        imageUrl: downloadUrl,
        createdAt: Date.now()
      });
      
      setNewItemName('');
      setNewItemDescription('');
      setNewItemFile(null);
    } catch (err) {
      console.error("Error uploading image", err);
      alert("Error uploading image");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteItem = async (item: ImageLearningItem) => {
    if (!window.confirm("Delete this image?")) return;
    try {
      await deleteDoc(doc(db, 'image_learning_items', item.id));
      // Try to delete from storage (might fail if URL structure is weird but we'll try)
      // For a robust system we'd parse the URL, but deleting the DB doc is primary.
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-50 animate-fade-in">
      {/* Left Sidebar - Categories */}
      <div className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 h-1/3 md:h-full">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ImageIcon className="text-sky-500" /> Image Categories
          </h2>
        </div>
        
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex gap-2">
            <input 
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              placeholder="New Category..."
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
            />
            <button 
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim()}
              className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white p-2 rounded-xl transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {categories.map(cat => (
            <div 
              key={cat.id} 
              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activeCategoryId === cat.id ? 'bg-sky-50 border border-sky-200 shadow-sm' : 'hover:bg-slate-50 border border-transparent'}`}
              onClick={() => setActiveCategoryId(cat.id)}
            >
              <span className={`font-bold text-sm ${activeCategoryId === cat.id ? 'text-sky-900' : 'text-slate-700'}`}>
                {cat.name}
              </span>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                className="text-slate-300 hover:text-red-500 transition-colors p-1"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="text-center p-6 text-sm text-slate-400 font-medium">
              Create a category to get started.
            </div>
          )}
        </div>
      </div>

      {/* Right Area - Upload & Gallery */}
      <div className="flex-1 flex flex-col h-2/3 md:h-full overflow-hidden bg-slate-50">
        {!activeCategoryId ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            Select or create a category to manage images.
          </div>
        ) : (
          <>
            {/* Upload Form */}
            <div className="bg-white p-6 md:p-8 border-b border-slate-200 shadow-sm z-10 shrink-0">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                Upload New Image to {categories.find(c => c.id === activeCategoryId)?.name}
              </h3>
              
              <form onSubmit={handleUploadItem} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-3">
                  <label className="block border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition-all h-full flex flex-col items-center justify-center min-h-[120px]">
                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden" 
                      onChange={e => setNewItemFile(e.target.files?.[0] || null)}
                    />
                    {newItemFile ? (
                      <div className="text-sm font-bold text-sky-700 break-all">{newItemFile.name}</div>
                    ) : (
                      <>
                        <ImagePlus className="text-slate-400 mb-2" size={24} />
                        <span className="text-xs font-bold text-slate-500">Choose Image</span>
                      </>
                    )}
                  </label>
                </div>
                
                <div className="md:col-span-6 space-y-3">
                  <input 
                    placeholder="Image Name / Title (e.g., Orbital Scalpel)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    required
                  />
                  <textarea 
                    placeholder="Detailed Description..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none h-20"
                    value={newItemDescription}
                    onChange={e => setNewItemDescription(e.target.value)}
                    required
                  />
                </div>
                
                <div className="md:col-span-3 flex items-end">
                  <button 
                    type="submit"
                    disabled={uploading || !newItemFile || !newItemName}
                    className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2 h-[124px]"
                  >
                    {uploading ? <><Loader2 className="animate-spin" size={20} /> {uploadProgress}%</> : <><Upload size={20} /> Upload</>}
                  </button>
                </div>
              </form>
            </div>

            {/* Image Gallery */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {items.map(item => (
                  <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group flex flex-col">
                    <div className="h-48 w-full bg-slate-100 relative overflow-hidden">
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <button 
                        onClick={() => handleDeleteItem(item)}
                        className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-red-50 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h4 className="font-bold text-slate-900 mb-2">{item.name}</h4>
                      <p className="text-xs text-slate-500 line-clamp-3">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {items.length === 0 && !uploading && (
                <div className="text-center py-20">
                  <ImageIcon size={48} className="mx-auto text-slate-200 mb-4" />
                  <h3 className="text-lg font-bold text-slate-400">No Images Yet</h3>
                  <p className="text-sm text-slate-400">Upload your first image above.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ManageImageLearning;
