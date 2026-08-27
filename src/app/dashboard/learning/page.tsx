"use client";

import React, { useState } from 'react';
import { api } from '~/trpc/react';
import { ImageIcon, X, ChevronLeft, ChevronRight, Video, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import Link from 'next/link';

export default function ImageLearningPage() {
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<any>(null);


    const [zoomLevel, setZoomLevel] = useState(1);



    const { data: categories, isLoading: categoriesLoading } = api.learning.listCategories.useQuery();
    const { data: materials, isLoading: materialsLoading } = api.learning.listMaterials.useQuery(
        { categoryId: selectedCategoryId || undefined },
        { enabled: !!selectedCategoryId }
    );

    const currentIndex = materials?.findIndex(m => m.id === selectedImage?.id) ?? -1;

    const navigateSlide = (direction: number) => {
        if (!materials) return;
        const newIndex = currentIndex + direction;
        if (newIndex >= 0 && newIndex < materials.length) {
            setSelectedImage(materials[newIndex]);
            setZoomLevel(1);
        }
    };

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedImage) return;
            if (e.key === 'ArrowRight') navigateSlide(1);
            if (e.key === 'ArrowLeft') navigateSlide(-1);
            if (e.key === 'Escape') setSelectedImage(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedImage, currentIndex, materials]);

    const isLoading = categoriesLoading || (selectedCategoryId && materialsLoading);

    // If no category selected, show categories
    if (!selectedCategoryId) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">E-Learning Library</h1>
                        <p className="text-slate-500 mt-2">Select a category to view learning materials</p>
                    </div>
                    <Link href="/dashboard/learning/manage">
                        <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition">
                            Manage Content
                        </button>
                    </Link>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories?.map((cat) => (
                            <div 
                                key={cat.id}
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md cursor-pointer transition flex items-center justify-between group"
                            >
                                <div>
                                    <h3 className="font-semibold text-lg text-slate-800 group-hover:text-blue-600 transition">
                                        {cat.name}
                                    </h3>
                                    <p className="text-slate-500 text-sm mt-1">
                                        {cat._count.materials} items
                                    </p>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-full text-blue-600">
                                    <ImageIcon className="w-6 h-6" />
                                </div>
                            </div>
                        ))}
                        {categories?.length === 0 && (
                            <div className="col-span-full text-center py-12 text-slate-400">
                                No categories found. Click "Manage Content" to add some.
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Material Gallery View
    const activeCategory = categories?.find(c => c.id === selectedCategoryId);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={() => setSelectedCategoryId(null)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{activeCategory?.name}</h1>
                    <p className="text-slate-500">Learning Materials</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {materials?.map((item) => (
                        <div 
                            key={item.id}
                            onClick={() => setSelectedImage(item)}
                            className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md cursor-pointer transition group"
                        >
                            <div className="aspect-square bg-slate-50 relative overflow-hidden flex items-center justify-center">
                                {item.type === 'VIDEO' ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/5 group-hover:bg-black/10 transition">
                                        <Video className="w-12 h-12 text-slate-400" />
                                    </div>
                                ) : (
                                    <img 
                                        src={item.url} 
                                        alt={item.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                    />
                                )}
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold text-slate-800 truncate">{item.title}</h3>
                                {item.description && (
                                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                                )}
                            </div>
                        </div>
                    ))}
                    {materials?.length === 0 && (
                        <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-100 border-dashed">
                            No materials in this category.
                        </div>
                    )}
                </div>
            )}

            {/* Lightbox / Video Player Modal */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center backdrop-blur-sm">
                    <div className="absolute top-4 right-4 flex gap-4 z-50">
                        <button 
                            onClick={() => setSelectedImage(null)}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition backdrop-blur-md"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    
                    {/* Navigation Arrows */}
                    {currentIndex > 0 && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); navigateSlide(-1); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition backdrop-blur-md z-50 shadow-xl"
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </button>
                    )}
                    
                    {currentIndex >= 0 && currentIndex < (materials?.length || 0) - 1 && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); navigateSlide(1); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition backdrop-blur-md z-50 shadow-xl"
                        >
                            <ChevronRight className="w-8 h-8" />
                        </button>
                    )}

                    <div className="w-full max-w-6xl max-h-[85vh] p-4 flex items-center justify-center relative overflow-hidden">
                        {selectedImage.type === 'VIDEO' ? (
                            <video 
                                src={selectedImage.url} 
                                controls 
                                autoPlay 
                                className="max-w-full max-h-full rounded-lg shadow-2xl"
                            />
                        ) : (
                            <div 
                                className="relative flex items-center justify-center"
                                style={{
                                    transform: `scale(${zoomLevel})`,
                                    transition: 'transform 0.2s ease-out'
                                }}
                            >
                                <img 
                                    src={selectedImage.url} 
                                    alt={selectedImage.title}
                                    className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                                />
                            </div>
                        )}
                    </div>

                    {selectedImage.type === 'IMAGE' && (
                        <div className="absolute bottom-20 flex gap-4 bg-black/50 p-2 rounded-full backdrop-blur-md">
                            <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))} className="p-2 hover:bg-white/20 rounded-full text-white">
                                <ZoomOut className="w-5 h-5" />
                            </button>
                            <button onClick={() => setZoomLevel(1)} className="p-2 hover:bg-white/20 rounded-full text-white">
                                <Maximize2 className="w-5 h-5" />
                            </button>
                            <button onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))} className="p-2 hover:bg-white/20 rounded-full text-white">
                                <ZoomIn className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                        <h2 className="text-white text-xl font-bold">{selectedImage.title}</h2>
                        {selectedImage.description && (
                            <p className="text-white/80 mt-2 max-w-3xl">{selectedImage.description}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
