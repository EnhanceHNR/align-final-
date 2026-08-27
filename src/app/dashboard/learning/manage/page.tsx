"use client";

import React, { useState } from 'react';

import { api } from '~/trpc/react';
import { uploadLearningMaterial } from '../actions';
import { FolderPlus, Upload, Trash2, X, Plus, ImageIcon, Video } from 'lucide-react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function ManageLearningPage() {
    const utils = api.useUtils();
    
    // State for Categories
    const [newCategoryName, setNewCategoryName] = useState('');
    
    // State for Materials
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemDescription, setNewItemDescription] = useState('');
    const [newItemFile, setNewItemFile] = useState<File | null>(null);
    const [newItemType, setNewItemType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
    
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    // Queries
    const { data: categories, isLoading: categoriesLoading } = api.learning.listCategories.useQuery();
    const { data: materials, isLoading: materialsLoading } = api.learning.listMaterials.useQuery(
        { categoryId: selectedCategoryId || undefined },
        { enabled: !!selectedCategoryId }
    );
    

    // Mutations
    const createCategory = api.learning.createCategory.useMutation({
        onSuccess: () => {
            utils.learning.listCategories.invalidate();
            setNewCategoryName('');
        }
    });

    const deleteCategory = api.learning.deleteCategory.useMutation({
        onSuccess: () => {
            utils.learning.listCategories.invalidate();
            if (selectedCategoryId) {
                setSelectedCategoryId('');
            }
        }
    });

    const deleteMaterial = api.learning.deleteMaterial.useMutation({
        onSuccess: () => {
            utils.learning.listMaterials.invalidate();
        }
    });

    const handleCreateCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCategoryName.trim()) {
            createCategory.mutate({ name: newCategoryName.trim() });
        }
    };

    const handleUploadMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCategoryId || !newItemTitle || !newItemFile) {
            setError('Please fill in all required fields.');
            return;
        }

        setError('');
        setUploading(true);
        
        try {
            const formData = new FormData();
            formData.append('categoryId', selectedCategoryId);
            formData.append('title', newItemTitle);
            formData.append('description', newItemDescription);
            formData.append('type', newItemType);
            formData.append('file', newItemFile);

            const result = await uploadLearningMaterial(formData);
            
            if (result.success) {
                setNewItemTitle('');
                setNewItemDescription('');
                setNewItemFile(null);
                utils.learning.listMaterials.invalidate();
                utils.learning.listCategories.invalidate();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to upload material');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8 h-[calc(100vh-80px)]">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/learning">
                    <button className="p-2 hover:bg-slate-100 rounded-lg transition">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Manage E-Learning</h1>
                    <p className="text-slate-500 mt-1">Upload and organize learning materials</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
                {/* LEFT SIDE: CATEGORIES */}
                <div className="w-full lg:w-1/3 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <FolderPlus className="w-5 h-5 text-blue-600" />
                            Categories
                        </h2>
                    </div>
                    
                    <div className="p-4 border-b border-slate-100">
                        <form onSubmit={handleCreateCategory} className="flex gap-2">
                            <input 
                                type="text"
                                placeholder="New category name..."
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button 
                                type="submit"
                                disabled={!newCategoryName.trim() || createCategory.isPending}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg transition"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </form>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {categoriesLoading && <p className="text-center text-sm text-slate-400 p-4">Loading categories...</p>}
                        {categories?.map((cat) => (
                            <div 
                                key={cat.id}
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition ${
                                    selectedCategoryId === cat.id 
                                        ? 'bg-blue-50 text-blue-700 font-medium' 
                                        : 'hover:bg-slate-50 text-slate-700'
                                }`}
                            >
                                <span className="truncate flex-1">{cat.name} ({cat._count.materials})</span>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Are you sure you want to delete this category and all its materials?')) {
                                            deleteCategory.mutate({ id: cat.id });
                                        }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition ml-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT SIDE: MATERIALS FOR SELECTED CATEGORY */}
                <div className="w-full lg:w-2/3 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {!selectedCategoryId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                            <FolderPlus className="w-16 h-16 mb-4 text-slate-200" />
                            <p>Select a category to manage its materials</p>
                        </div>
                    ) : (
                        <>
                            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-blue-600" />
                                    Upload Material
                                </h2>
                            </div>

                            {/* UPLOAD FORM */}
                            <form onSubmit={handleUploadMaterial} className="p-6 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                                        <input 
                                            type="text"
                                            required
                                            value={newItemTitle}
                                            onChange={e => setNewItemTitle(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="E.g., Crown Prep Video"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                        <textarea 
                                            value={newItemDescription}
                                            onChange={e => setNewItemDescription(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                                            placeholder="Optional description..."
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                                        <select 
                                            value={newItemType}
                                            onChange={e => setNewItemType(e.target.value as 'IMAGE' | 'VIDEO')}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="IMAGE">Image</option>
                                            <option value="VIDEO">Video</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">File *</label>
                                        <input 
                                            type="file"
                                            required
                                            accept="image/*,video/*"
                                            onChange={e => {
                                                const file = e.target.files?.[0] || null;
                                                setNewItemFile(file);
                                                if (file) {
                                                    if (file.type.startsWith('video/')) setNewItemType('VIDEO');
                                                    else if (file.type.startsWith('image/')) setNewItemType('IMAGE');
                                                }
                                            }}
                                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        />
                                    </div>
                                    {error && <p className="text-red-500 text-sm">{error}</p>}
                                    <div className="pt-2">
                                        <button 
                                            type="submit"
                                            disabled={uploading}
                                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-xl transition flex items-center justify-center gap-2"
                                        >
                                            {uploading ? (
                                                <>
                                                    <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                                                    Uploading...
                                                </>
                                            ) : (
                                                <>Upload</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>

                            {/* MATERIAL LIST */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <h3 className="font-semibold text-slate-700 mb-4">Existing Materials</h3>
                                {materialsLoading && <p className="text-sm text-slate-400">Loading...</p>}
                                <div className="grid grid-cols-2 gap-4">
                                    {materials?.map(item => (
                                        <div key={item.id} className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                                            <div className="aspect-video relative bg-slate-100 flex items-center justify-center overflow-hidden">
                                                {item.type === 'VIDEO' ? (
                                                    <Video className="w-8 h-8 text-slate-300" />
                                                ) : (
                                                    <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                            <div className="p-3">
                                                <p className="font-medium text-sm truncate text-slate-800">{item.title}</p>
                                                <p className="text-xs text-slate-500 truncate">{item.type}</p>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    if (confirm('Delete this material?')) {
                                                        deleteMaterial.mutate({ id: item.id });
                                                    }
                                                }}
                                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition shadow-sm"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {materials?.length === 0 && (
                                        <p className="col-span-full text-sm text-slate-400">No materials uploaded yet.</p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
