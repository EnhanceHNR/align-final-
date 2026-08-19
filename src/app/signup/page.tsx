"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowRight, Building2, Mail, Lock } from "lucide-react";
import Image from "next/image";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    clinicName: "",
    email: "",
    password: ""
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register");
      
      router.push("/?registered=true");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-blue-100 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-50 rounded-full blur-3xl opacity-60 z-0" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-50 rounded-full blur-3xl opacity-60 z-0" />

      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
                Al<span className="text-blue-600">ign</span>
              </h1>
              <p className="text-blue-500 font-bold tracking-[0.3em] text-[10px] uppercase">
                Create your workspace
              </p>
            </div>
          </div>

          <Card className="border-none shadow-2xl shadow-blue-100/50 rounded-[32px] p-2 bg-white/80 backdrop-blur-md">
            <CardHeader className="space-y-1 pb-6 pt-6">
              <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <Building2 className="text-blue-600" />
                Clinic Registration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400 ml-1 tracking-widest">Clinic Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <Input required value={formData.clinicName} onChange={e => setFormData({...formData, clinicName: e.target.value})} placeholder="Aligne Dental" className="pl-12 h-14 bg-slate-50/50 border-slate-100 rounded-2xl focus-visible:ring-blue-600 font-medium" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400 ml-1 tracking-widest">Master Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="admin@aligne.com" className="pl-12 h-14 bg-slate-50/50 border-slate-100 rounded-2xl focus-visible:ring-blue-600 font-medium" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-400 ml-1 tracking-widest">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <Input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" className="pl-12 h-14 bg-slate-50/50 border-slate-100 rounded-2xl focus-visible:ring-blue-600 font-medium" />
                  </div>
                </div>

                {error && <div className="p-3 bg-red-50 rounded-xl border border-red-100"><p className="text-[10px] font-black text-red-500 uppercase tracking-widest text-center">{error}</p></div>}

                <Button type="submit" disabled={loading} className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl shadow-blue-200 transition-all font-bold text-base gap-2 group">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <><span>Start Free Trial</span><ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>}
                </Button>
                
                <div className="text-center mt-6">
                   <a href="/" className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest">Already have an account? Login</a>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
