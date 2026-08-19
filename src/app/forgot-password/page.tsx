"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <Card className="w-full max-w-md border-none shadow-2xl rounded-3xl p-4">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <p className="text-center text-green-600 font-medium">If an account exists, a reset link has been sent.</p>
          ) : (
            <form onSubmit={e => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-400">Email Address</label>
                <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-xl bg-slate-50" />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold">Send Reset Link</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
