
import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Mail, 
  Phone, 
  X, 
  Save, 
  User, 
  Stethoscope, 
  ShieldCheck, 
  Loader2, 
  Trash2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Power,
  Key
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { db, firebaseConfig } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, setDoc, orderBy } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'team_member' as UserRole,
    phone: '',
    password: '',
    isActive: true
  });

  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData: UserProfile[] = [];
      snapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() } as UserProfile);
      });
      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setFormData({ 
      firstName: '', 
      lastName: '', 
      email: '', 
      role: 'team_member', 
      phone: '', 
      password: '',
      isActive: true
    });
    setEditingUserId(null);
    setFormError(null);
    setShowPassword(false);
  };

  const handleOpenEdit = (user: UserProfile) => {
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      phone: (user as any).phone || '',
      password: '', // Password starts empty for editing
      isActive: user.isActive !== undefined ? user.isActive : true
    });
    setEditingUserId(user.id);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    const normalizedEmail = formData.email.toLowerCase().trim();

    if (!normalizedEmail || !formData.firstName) {
      setFormError("Basic identity fields are required.");
      return;
    }

    // Check for duplicate email across the registry
    const isDuplicate = users.some(u => 
      u.email.toLowerCase().trim() === normalizedEmail && u.id !== editingUserId
    );

    if (isDuplicate) {
      setFormError(`Registry Conflict: Email "${normalizedEmail}" is already registered to another node member.`);
      return;
    }

    if (!editingUserId && !formData.password) {
      setFormError("Password is required for new member initialization.");
      return;
    }

    try {
      if (editingUserId) {
        // Update existing user
        const updates: any = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          phone: formData.phone,
          isActive: formData.isActive
        };

        // If admin provided a new password, we mark it for update.
        if (formData.password) {
          updates.pendingPasswordReset = true;
          updates.tempSecret = formData.password; 
        }

        await updateDoc(doc(db, 'users', editingUserId), updates);
        if (formData.password) {
          alert(`Access key updated for ${formData.firstName}. The user will be prompted to re-authenticate with the new key.`);
        }
      } else {
        // Create new user using secondary Auth app to prevent logging out admin
        const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp_" + Date.now());
        const secondaryAuth = getAuth(secondaryApp);
        
        try {
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, formData.password);
          await signOut(secondaryAuth);
          
          const newUserId = userCredential.user.uid;
          
          await setDoc(doc(db, 'users', newUserId), {
            id: newUserId,
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: normalizedEmail,
            role: formData.role,
            phone: formData.phone,
            isActive: true,
            createdAt: new Date().toISOString()
          });
          
          alert(`User ${formData.firstName} has been created successfully. They can now log in.`);
        } catch (authError: any) {
          throw new Error("Failed to provision Auth account: " + authError.message);
        }
      }
      
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error("Error processing user:", err);
      setFormError("Database Access Denied: " + err.message);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setIsUpdating(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch (err: any) {
      console.error("Error updating role:", err);
      alert("Failed to update permissions: " + err.message);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("CRITICAL: This will revoke all manufacturing access for this node member. Proceed?")) return;
    setIsUpdating(userId);
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err: any) {
      console.error("Error deleting user:", err);
      alert("Failed to remove user: " + err.message);
    } finally {
      setIsUpdating(null);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return <ShieldCheck className="text-amber-500" size={18} />;
      case 'clinician': return <Stethoscope className="text-emerald-500" size={18} />;
      default: return <User className="text-sky-500" size={18} />;
    }
  };

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'clinician': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default: return 'bg-sky-50 text-sky-700 border-sky-100';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Personnel Directory</h2>
          <p className="text-slate-500 font-medium">Manage manufacturing personnel, clinicians, and administrative nodes</p>
        </div>
        <button 
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-[2rem] font-black flex items-center shadow-2xl shadow-slate-200 transition-all active:scale-95"
        >
          <UserPlus size={20} className="mr-3" /> Add System User
        </button>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="animate-spin mb-4" size={48} />
          <p className="text-xs font-black uppercase tracking-[0.3em]">Accessing Directory...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {users.map((user) => (
            <div key={user.id} className={`bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all ${!user.isActive ? 'opacity-60 grayscale' : ''}`}>
              {/* Role Header */}
              <div className={`absolute top-0 right-0 left-0 h-2 ${user.role === 'admin' ? 'bg-amber-400' : user.role === 'clinician' ? 'bg-emerald-400' : 'bg-sky-400'}`} />
              
              <div className="flex justify-between items-start mb-8">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center font-black text-3xl shadow-inner transition-all ${
                  user.role === 'admin' ? 'bg-amber-50 text-amber-600' : user.role === 'clinician' ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600'
                }`}>
                  {user.firstName[0]}
                </div>
                <div className="flex space-x-1">
                   <button 
                    onClick={() => handleOpenEdit(user)}
                    className="p-3 text-slate-300 hover:text-sky-600 hover:bg-sky-50 rounded-2xl transition-all"
                    title="Edit Member Details"
                   >
                     <Edit2 size={20} />
                   </button>
                   <button 
                    onClick={() => handleDeleteUser(user.id)}
                    className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                    title="Revoke System Access"
                   >
                     <Trash2 size={20} />
                   </button>
                </div>
              </div>

              <div className="space-y-1 mb-6">
                <h4 className="font-black text-2xl text-slate-900 truncate leading-tight">{user.firstName} {user.lastName}</h4>
                <div className="flex items-center gap-2">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${getRoleBadgeClass(user.role)}`}>
                    {getRoleIcon(user.role)} <span className="ml-2">{user.role.replace('_', ' ')}</span>
                  </div>
                  {!user.isActive && (
                    <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-red-200">Deactivated</span>
                  )}
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center text-sm font-bold text-slate-500">
                  <Mail className="text-slate-300 mr-3" size={18} />
                  <span className="truncate">{user.email}</span>
                </div>
                {(user as any).phone && (
                  <div className="flex items-center text-sm font-bold text-slate-500">
                    <Phone className="text-slate-300 mr-3" size={18} />
                    {(user as any).phone}
                  </div>
                )}
              </div>

              <div className="pt-8 border-t border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 ml-1">Modify System Privileges</label>
                <div className="flex gap-2">
                  {(['team_member', 'clinician', 'admin'] as UserRole[]).map((role) => (
                    <button
                      key={role}
                      disabled={isUpdating === user.id}
                      onClick={() => handleRoleChange(user.id, role)}
                      className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-tighter transition-all border ${
                        user.role === role 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                          : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300 hover:text-slate-600'
                      }`}
                    >
                      {role === 'team_member' ? 'Team' : role === 'clinician' ? 'Clinician' : 'Admin'}
                    </button>
                  ))}
                </div>
              </div>
              
              {isUpdating === user.id && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-[3.5rem] z-10 animate-fade-in">
                  <Loader2 className="animate-spin text-sky-600" size={32} />
                </div>
              )}
            </div>
          ))}

          {users.length === 0 && (
            <div className="col-span-full py-20 bg-white rounded-[4rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
              <User size={64} className="mb-4 opacity-20" />
              <p className="font-black uppercase tracking-widest text-xs">No Node Members Detected</p>
            </div>
          )}
        </div>
      )}

      {/* User Form Modal (Add/Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-[4.5rem] shadow-2xl overflow-hidden border border-white p-2">
            <div className="bg-slate-900 rounded-[4rem] p-12 text-white relative">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-10 right-10 text-slate-400 hover:text-white transition-colors p-3 bg-white/5 rounded-full"
              >
                <X size={24} />
              </button>
              
              <div className="flex items-center space-x-6 mb-10">
                <div className="w-16 h-16 bg-sky-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-sky-500/40">
                  {editingUserId ? <Edit2 size={32} className="text-white" /> : <UserPlus size={32} className="text-white" />}
                </div>
                <div>
                  <h3 className="text-3xl font-black tracking-tight leading-none">{editingUserId ? 'Modify Node Member' : 'New Node Member'}</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-3">{editingUserId ? 'Update Manufacturing Privileges' : 'Provision Manufacturing Access'}</p>
                </div>
              </div>

              {formError && (
                <div className="mb-8 p-5 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center space-x-4 text-red-400">
                  <AlertCircle size={20} className="shrink-0" />
                  <p className="text-[10px] font-black uppercase leading-relaxed">{formError}</p>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-3">First Name</label>
                    <input 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-sky-500/20 transition-all outline-none"
                      placeholder="Barathi"
                      value={formData.firstName}
                      onChange={e => setFormData({...formData, firstName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-3">Last Name</label>
                    <input 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-sky-500/20 transition-all outline-none"
                      placeholder="B"
                      value={formData.lastName}
                      onChange={e => setFormData({...formData, lastName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-3">Secure Email</label>
                  <input 
                    required
                    type="email"
                    disabled={!!editingUserId}
                    className={`w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-sky-500/20 transition-all outline-none ${editingUserId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="Barathi@ehnrin.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                  {editingUserId && <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest ml-3">Email acts as unique Registry ID and cannot be changed.</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-3">
                    {editingUserId ? 'Update Access Key (Optional)' : 'Initial Password'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input 
                      required={!editingUserId}
                      type={showPassword ? "text" : "password"}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-14 py-4 text-sm font-bold focus:ring-4 focus:ring-sky-500/20 transition-all outline-none"
                      placeholder={editingUserId ? "Leave empty to keep current" : "Set access key"}
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sky-400"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {editingUserId && formData.password && (
                    <p className="text-[8px] text-amber-500 font-bold uppercase tracking-widest ml-3 flex items-center gap-1">
                      <Key size={10} /> Admin override: This will reset the user's primary login credential.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-3">Access Level</label>
                    <select 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-sky-500/20 text-white"
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                    >
                      <option value="team_member" className="bg-slate-900">Production Team</option>
                      <option value="clinician" className="bg-slate-900">Medical Clinician</option>
                      <option value="admin" className="bg-slate-900">System Administrator</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-3">Phone Line</label>
                    <input 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-sky-500/20 transition-all outline-none"
                      placeholder="+91..."
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>

                {editingUserId && (
                  <div className="flex items-center justify-between px-3 py-6 bg-white/5 rounded-3xl border border-white/10">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl ${formData.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        <Power size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Node Visibility</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Disable to temporarily revoke system access</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                      className={`w-14 h-8 rounded-full transition-all relative ${formData.isActive ? 'bg-emerald-500' : 'bg-red-500/40'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${formData.isActive ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                )}

                <div className="pt-8">
                  <button 
                    type="submit"
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white py-7 rounded-[2.5rem] font-black text-xl shadow-2xl shadow-sky-600/30 transition-all flex items-center justify-center active:scale-95"
                  >
                    <CheckCircle2 size={24} className="mr-3" /> {editingUserId ? 'Save Profile Updates' : 'Initialize Node Member'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
