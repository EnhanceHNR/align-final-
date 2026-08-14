import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { ImageLearningCategory, ImageLearningItem, UserProfile } from '../types';
import { ImageIcon, X, Maximize2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ImageLearningProps {
  user: UserProfile;
}

const ImageLearning: React.FC<ImageLearningProps> = ({ user }) => {
  const [categories, setCategories] = useState<ImageLearningCategory[]>([]);
  const [items, setItems] = useState<ImageLearningItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Lightbox state
  const [selectedImage, setSelectedImage] = useState<ImageLearningItem | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Active items for navigation
  const activeItems = selectedCategoryId 
    ? items.filter(i => i.categoryId === selectedCategoryId) 
    : [];
  const currentIndex = selectedImage 
    ? activeItems.findIndex(i => i.id === selectedImage.id) 
    : -1;

  const handleNext = () => {
    if (currentIndex >= 0 && currentIndex < activeItems.length - 1) {
      setSelectedImage(activeItems[currentIndex + 1]);
      setZoomLevel(1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setSelectedImage(activeItems[currentIndex - 1]);
      setZoomLevel(1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImage) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') { 
        setSelectedImage(null); 
        setZoomLevel(1); 
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, currentIndex, activeItems]);

  useEffect(() => {
    setLoading(true);
    // Fetch all items
    const unsub = onSnapshot(query(collection(db, 'image_learning_items'), orderBy('createdAt', 'desc')), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImageLearningItem));
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'image_learning_categories'), orderBy('name', 'asc')), (snap) => {
      const cats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImageLearningCategory));
      setCategories(cats);
    });
    return unsub;
  }, []);

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden animate-fade-in relative">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shrink-0 shadow-sm z-10 p-6 md:p-10">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <ImageIcon className="text-sky-500" size={32} />
          Visual Learning Library
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          {selectedCategoryId 
            ? "Click on any image to expand and read details." 
            : "Explore categories to view learning materials."}
        </p>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar relative">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {[1,2,3,4].map(i => (
               <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border border-slate-100"></div>
             ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <ImageIcon size={64} className="mb-4 text-slate-200" />
            <h3 className="text-xl font-bold text-slate-500">No categories found</h3>
            <p className="text-sm mt-2">Check back later for new learning materials.</p>
          </div>
        ) : !selectedCategoryId ? (
          /* View 1: Grid of Category Cards (Styled like Video Thumbnails) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categories.map(cat => {
              const catItemsCount = items.filter(i => i.categoryId === cat.id).length;
              if (catItemsCount === 0) return null; // hide empty categories
              
              return (
                <div 
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md cursor-pointer group flex flex-col h-full transition-all hover:-translate-y-1"
                >
                  {/* Thumbnail / Header Area */}
                  <div className="h-32 bg-slate-900 relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 z-0"></div>
                    
                    <div className="z-10 bg-sky-500 w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-sky-500/30 group-hover:scale-110 transition-transform">
                      <ImageIcon className="text-white" size={24} />
                    </div>
                    
                    <div className="absolute top-3 right-3 z-10 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest text-white border border-white/10">
                      {catItemsCount} IMAGES
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-5 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">
                      {cat.name}
                    </h3>
                    <p className="text-sm font-semibold text-sky-600">Visual Category</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* View 2: Images for the Selected Category */
          <div className="animate-fade-in">
            <button 
              onClick={() => setSelectedCategoryId(null)}
              className="mb-6 flex items-center gap-2 text-slate-500 hover:text-sky-600 transition-colors font-bold text-sm bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm"
            >
              <X size={16} /> Back to Categories
            </button>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {items.filter(i => i.categoryId === selectedCategoryId).map(item => (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedImage(item)}
                  className="bg-white rounded-[2rem] shadow-sm hover:shadow-xl border border-slate-200 overflow-hidden group cursor-pointer flex flex-col transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="h-48 md:h-56 w-full bg-slate-100 relative overflow-hidden">
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
                      loading="lazy"
                    />
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm text-slate-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300 shadow-xl">
                        <Maximize2 size={20} />
                      </div>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col bg-white">
                    <h4 className="font-bold text-lg text-slate-900 mb-2 leading-tight group-hover:text-sky-600 transition-colors">{item.name}</h4>
                    <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed flex-1">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && createPortal(
        <div className="fixed inset-0 z-[10000] flex bg-black/95 backdrop-blur-xl animate-fade-in flex-col md:flex-row">
          
          {/* Close button for mobile - highly visible */}
          <button 
            onClick={() => { setSelectedImage(null); setZoomLevel(1); }}
            className="absolute top-4 right-4 z-[10010] p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md md:hidden shadow-2xl"
          >
            <X size={24} />
          </button>

          {/* Image Container with Zoom & Navigation */}
          <div className="flex-1 h-[50vh] md:h-full flex items-center justify-center relative overflow-hidden group">
             
             {/* Navigation Overlay - Left */}
             {currentIndex > 0 && (
               <button 
                 onClick={handlePrev}
                 className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-[10010] p-3 md:p-4 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md transition-all md:opacity-0 md:group-hover:opacity-100 shadow-xl"
               >
                 <ChevronLeft size={32} />
               </button>
             )}

             {/* Navigation Overlay - Right */}
             {currentIndex >= 0 && currentIndex < activeItems.length - 1 && (
               <button 
                 onClick={handleNext}
                 className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-[10010] p-3 md:p-4 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md transition-all md:opacity-0 md:group-hover:opacity-100 shadow-xl"
               >
                 <ChevronRight size={32} />
               </button>
             )}

             {/* Zoom Controls */}
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[10010] flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-white md:opacity-0 md:group-hover:opacity-100 transition-opacity">
               <button onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.5))} className="p-1.5 hover:bg-white/20 rounded-full" disabled={zoomLevel <= 1}>
                 <ZoomOut size={20} className={zoomLevel <= 1 ? "opacity-50" : ""} />
               </button>
               <span className="text-xs font-bold w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
               <button onClick={() => setZoomLevel(Math.min(4, zoomLevel + 0.5))} className="p-1.5 hover:bg-white/20 rounded-full" disabled={zoomLevel >= 4}>
                 <ZoomIn size={20} className={zoomLevel >= 4 ? "opacity-50" : ""} />
               </button>
             </div>

             {/* Zoomable Image Wrapper */}
             <div className="absolute inset-0 overflow-auto custom-scrollbar">
               <div 
                 className="flex items-center justify-center p-4 md:p-12 min-w-full min-h-full transition-all duration-300"
                 style={{ 
                   width: `${zoomLevel * 100}%`, 
                   height: `${zoomLevel * 100}%` 
                 }}
               >
                 <img 
                   src={selectedImage.imageUrl} 
                   alt={selectedImage.name} 
                   className="w-full h-full object-contain drop-shadow-2xl rounded-lg md:rounded-2xl cursor-zoom-in transition-transform duration-300"
                   onClick={() => setZoomLevel(zoomLevel === 1 ? 2 : 1)}
                 />
               </div>
             </div>
          </div>

          {/* Details Sidebar */}
          <div className="w-full md:w-[400px] bg-white h-[50vh] md:h-full flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-[10005]">
            <div className="p-6 md:p-8 flex items-center justify-between border-b border-slate-100 shrink-0">
               <div>
                 <div className="text-[10px] font-black uppercase tracking-widest text-sky-500 mb-1">
                   {categories.find(c => c.id === selectedImage.categoryId)?.name || 'Unknown Category'}
                 </div>
                 <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedImage.name}</h2>
               </div>
               
               <button 
                 onClick={() => { setSelectedImage(null); setZoomLevel(1); }}
                 className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 hidden md:block transition-colors"
               >
                 <X size={20} />
               </button>
            </div>

            <div className="p-6 md:p-8 flex-1 overflow-y-auto custom-scrollbar">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Description & Details</h3>
              <div className="text-slate-700 text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
                {selectedImage.description}
              </div>
            </div>
          </div>
          
        </div>,
        document.body
      )}

    </div>
  );
};

export default ImageLearning;
