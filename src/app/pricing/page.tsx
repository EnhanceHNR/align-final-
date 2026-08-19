"use client";
import React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  { name: "Starter", price: "$49", period: "/month", features: ["Up to 5 staff members", "Basic appointments", "Inventory tracking", "Email support"], cta: "Start Free Trial" },
  { name: "Professional", price: "$99", period: "/month", features: ["Unlimited staff members", "Advanced analytics", "Custom domain", "Priority 24/7 support", "Lab integrations"], cta: "Upgrade to Pro", popular: true },
];

export default function PricingPage() {
  const handleSubscribe = async (plan: string) => {
    // Integrate with Stripe here
    window.location.href = `/api/stripe/checkout?plan=${plan}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight sm:text-5xl">Simple, transparent pricing</h1>
          <p className="mt-4 text-xl text-slate-500">Everything you need to manage your dental clinic, with no hidden fees.</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, i) => (
            <div key={i} className={`bg-white rounded-3xl p-8 shadow-xl ${plan.popular ? 'ring-4 ring-blue-600 scale-105' : 'border border-slate-100'}`}>
              {plan.popular && <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4 inline-block">Most Popular</span>}
              <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
              <div className="mt-4 flex items-baseline text-5xl font-extrabold text-slate-900">
                {plan.price}
                <span className="ml-1 text-xl font-medium text-slate-500">{plan.period}</span>
              </div>
              <ul className="mt-8 space-y-4">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-3">
                    <Check className="text-blue-600" size={20} />
                    <span className="text-slate-600 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button onClick={() => handleSubscribe(plan.name)} className={`w-full mt-8 h-14 rounded-xl font-bold text-lg ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}>
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
