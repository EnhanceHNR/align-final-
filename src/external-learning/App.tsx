
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import UserManagement from './pages/UserManagement';
import WorkflowManagement from './pages/WorkflowManagement';
import Analytics from './pages/Analytics';
import AuditRegistry from './pages/AuditRegistry';
import Login from './components/Login';
import ImageLearning from './pages/ImageLearning';
import ManageImageLearning from './pages/ManageImageLearning';
import { UserProfile, Project } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, collection, query, orderBy, updateDoc, where } from 'firebase/firestore';
import { ShieldAlert, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setIsSyncing(true);
        const isAdminEmail = firebaseUser.email?.toLowerCase().includes('admin') || firebaseUser.email?.toLowerCase() === 'enhancetech001@gmail.com';
        
        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const profileData = docSnap.data() as UserProfile;
            if (isAdminEmail && profileData.role !== 'admin') {
              await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' });
            }
            setUser({ id: firebaseUser.uid, ...profileData, role: isAdminEmail ? 'admin' : profileData.role });
            setPermissionError(null);
          } else {
            const defaultProfile = {
              firstName: isAdminEmail ? 'System' : (firebaseUser.displayName?.split(' ')[0] || 'New'),
              lastName: isAdminEmail ? 'Administrator' : (firebaseUser.displayName?.split(' ')[1] || 'User'),
              email: firebaseUser.email || '',
              role: isAdminEmail ? 'admin' : 'team_member',
              isActive: true,
              createdAt: new Date().toISOString()
            };
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), defaultProfile);
              setUser({ id: firebaseUser.uid, ...defaultProfile } as UserProfile);
            } catch (e: any) {
              if (e.code === 'permission-denied') setPermissionError("Database profile initialization denied.");
            }
          }
          setIsSyncing(false);
          setIsLoading(false);
        }, (err) => {
          console.error("Profile sync error:", err);
          if (err.code === 'permission-denied') setPermissionError("Security Access Denied for Profile.");
          setIsLoading(false);
          setIsSyncing(false);
        });
      } else {
        if (unsubscribeProfile) unsubscribeProfile();
        setUser(null);
        setIsLoading(false);
        setIsSyncing(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  useEffect(() => {
    if (!user || !user.role) return;

    // 1. Projects Query: Admins get all, others get assigned only
    const projectsRef = collection(db, 'projects');
    const projectsQuery = user.role === 'admin' 
      ? query(projectsRef, orderBy('createdAt', 'desc'))
      : query(projectsRef, where('assignedEmployeeIds', 'array-contains', user.id));

    const unsubProjects = onSnapshot(
      projectsQuery, 
      (snap) => {
        setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
      },
      (err) => {
        console.error("Projects snapshot error:", err);
        if (err.code === 'permission-denied') {
          console.warn("Project registry access restricted for current role.");
        }
      }
    );

    // 2. Users Query: Strictly Admin only
    let unsubUsers = () => {};
    if (user.role === 'admin') {
      unsubUsers = onSnapshot(
        query(collection(db, 'users'), orderBy('createdAt', 'desc')), 
        (snap) => {
          setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
        },
        (err) => {
          console.error("Users directory snapshot error:", err);
        }
      );
    }

    return () => { 
      unsubProjects(); 
      unsubUsers(); 
    };
  }, [user?.id, user?.role]);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setActiveTab('dashboard');
    setSelectedProjectId(null);
  };

  if (isLoading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white"><Loader2 className="animate-spin text-sky-500" size={48} /></div>;

  if (!user) return <Login />;

  const renderContent = () => {
    if (selectedProjectId) return <ProjectDetail id={selectedProjectId} currentUser={user} onBack={() => setSelectedProjectId(null)} />;
    
    switch (activeTab) {
      case 'dashboard': return <Dashboard projects={projects} users={allUsers} onProjectClick={setSelectedProjectId} />;
      case 'projects': return <Projects onProjectClick={setSelectedProjectId} currentUser={user} />;
      case 'analytics': return user.role === 'admin' ? <Analytics onProjectClick={setSelectedProjectId} /> : <div className="p-20 text-center text-slate-400">Restricted Access</div>;
      case 'registry': return <AuditRegistry currentUser={user} />;
      case 'users': return user.role === 'admin' ? <UserManagement /> : <div className="p-20 text-center text-slate-400">Restricted Access</div>;
      case 'workflows': return user.role === 'admin' ? <WorkflowManagement /> : <div className="p-20 text-center text-slate-400">Restricted Access</div>;
      case 'image_learning': return <ImageLearning user={user} />;
      case 'manage_image_learning': return user.role === 'admin' ? <ManageImageLearning user={user} /> : <div className="p-20 text-center text-slate-400">Restricted Access</div>;
      default: return <Dashboard projects={projects} users={allUsers} onProjectClick={setSelectedProjectId} />;
    }
  };

  return (
    <Layout user={user} activeTab={activeTab} onTabChange={(id) => { setActiveTab(id); setSelectedProjectId(null); }} onLogout={handleLogout}>
      {permissionError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-3xl flex items-center gap-3 text-red-600 text-xs font-black uppercase tracking-widest animate-fade-in shadow-sm">
          <ShieldAlert size={18} />
          {permissionError}
        </div>
      )}
      {renderContent()}
    </Layout>
  );
};

export default App;
