"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from "next-auth/react"; 
import Image from 'next/image'; // Imported for modern and optimized image handling
import { 
  Lock, Mail, ArrowRight,
  Stethoscope, UserCog, ClipboardList, ChevronLeft,
  Loader2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<'MASTER' | 'STAFF' | null>(null);
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [loading, setLoading] = useState(false); 
  const [serverError, setServerError] = useState(""); 
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRole || !email || !password) return;

    setLoading(true);
    setServerError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.ok) {
          router.push("/dashboard");
      } else {
          if (result?.error === "ACCOUNT_INACTIVE") {
              setServerError("Your account is deactivated. Contact the administrator.");
          } else {
              setServerError("Invalid email or password.");
          }
      }
    } catch (error) {
        setServerError("An error occurred during login.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-blue-100 relative overflow-hidden">
      
      {/* Decorative Background Blur */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-50 rounded-full blur-3xl opacity-60 z-0" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-50 rounded-full blur-3xl opacity-60 z-0" />

      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="w-full max-w-md space-y-8">
          
          {/* Official Clinic Logo and Header */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative h-28 w-56 drop-shadow-sm flex items-center justify-center">
              <Image 
                src="/clinic-logo-v3.png" 
                alt="Clinic Official Logo" 
                fill
                priority
                className="object-contain"
              />
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
                Al<span className="text-blue-600">ign</span>
              </h1>
              <p className="text-blue-500 font-bold tracking-[0.3em] text-[10px] uppercase">
                Management System
              </p>
            </div>
          </div>

          {!selectedRole ? (
            /* Role Selection Screen */
            <div className="space-y-4 animate-in fade-in zoom-in duration-300">
              <h2 className="text-center text-xs font-bold text-slate-400 mb-6 uppercase tracking-[0.2em]">Select role to access</h2>
              
              <div className="grid grid-cols-1 gap-4">
                <RoleButton 
                  icon={<Stethoscope size={28} className="text-blue-600" />}
                  title="Master Login"
                  description="Access for doctor"
                  onClick={() => setSelectedRole('MASTER')}
                />
                <RoleButton 
                  icon={<ClipboardList size={28} className="text-slate-500" />}
                  title="Staff Login"
                  description="Access for staff"
                  onClick={() => setSelectedRole('STAFF')}
                />
              </div>

              <div className="mt-8 text-center animate-in fade-in zoom-in duration-300">
                <p className="text-sm text-slate-500 font-medium">
                  Don't have a workspace?{" "}
                  <a href="/signup" className="text-blue-600 font-bold hover:underline">
                    Create a new clinic
                  </a>
                </p>
                <div className="mt-4">
                  <a href="/pricing" className="text-xs text-slate-400 font-bold uppercase tracking-widest hover:text-blue-600 transition-colors">
                    View Pricing Plans
                  </a>
                </div>
              </div>

            </div>
          ) : (
            /* Login Form Screen */
            <Card className="border-none shadow-2xl shadow-blue-100/50 rounded-[32px] p-2 bg-white/80 backdrop-blur-md animate-in slide-in-from-right duration-300">
              <CardHeader className="space-y-1 pb-6 pt-6">
                <button 
                  onClick={() => { setSelectedRole(null); setServerError(""); }}
                  className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase mb-4 hover:bg-blue-50 w-fit p-2 rounded-lg transition-all"
                >
                  <ChevronLeft size={14} /> Back
                </button>
                <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  {selectedRole === 'MASTER' ? <UserCog className="text-blue-600" /> : <ClipboardList className="text-slate-500" />}
                  Login: {selectedRole === 'MASTER' ? 'Master' : 'Staff'}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-400 ml-1 tracking-widest">Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <Input 
                        type="email"
                        required
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setServerError(""); }}
                        placeholder="example@align.com" 
                        className="pl-12 h-14 bg-slate-50/50 border-slate-100 rounded-2xl focus-visible:ring-blue-600 font-medium"
                      />
                    </div>
                  <div className="flex justify-end mt-1">
                    <a href="/forgot-password" className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest">
                      Forgot Password?
                    </a>
                  </div>

                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-400 tracking-widest ml-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <Input 
                        type="password"
                        required
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setServerError(""); }}
                        placeholder="••••••••" 
                        className="pl-12 h-14 bg-slate-50/50 border-slate-100 rounded-2xl focus-visible:ring-blue-600 font-medium"
                      />
                    </div>
                  <div className="flex justify-end mt-1">
                    <a href="/forgot-password" className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest">
                      Forgot Password?
                    </a>
                  </div>

                  </div>

                  {serverError && (
                    <div className="p-3 bg-red-50 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-1">
                      <p className="text-[10px] font-black text-red-500 uppercase tracking-widest text-center">
                        {serverError}
                      </p>
                    </div>
                  )}

                  <Button 
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl shadow-blue-200 transition-all font-bold text-base gap-2 group"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        <span>Access Panel</span>
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </main>


    </div>
  );
}

function RoleButton({ icon, title, description, onClick }: { icon: React.ReactNode, title: string, description: string, onClick: () => void }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className="group flex items-center gap-6 p-6 bg-white hover:bg-blue-600 border border-slate-100 rounded-[28px] text-left transition-all hover:shadow-2xl hover:shadow-blue-200 hover:-translate-y-1"
    >
      <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-900 group-hover:text-white transition-colors">{title}</h3>
        <p className="text-xs text-slate-500 group-hover:text-blue-100 transition-colors">{description}</p>
      </div>
      <ArrowRight className="ml-auto text-slate-300 group-hover:text-white transition-all opacity-0 group-hover:opacity-100" />
    </button>
  );
}