"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Tooth, Surface } from "./Tooth";
import { ODONTOGRAM_CONDITION_LABELS, type OdontogramCondition } from "~/lib/odontogram";

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

const surfaceTranslations: Record<string, string> = {
  TOP: "Top", BOTTOM: "Bottom", LEFT: "Left", RIGHT: "Right", CENTER: "Center",
};

const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
const lowerLeft = [38, 37, 36, 35, 34, 33, 32, 31];
const lowerRight = [41, 42, 43, 44, 45, 46, 47, 48];


export default function OdontogramPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const utils = api.useUtils();
  
  // 1. YENİ EKLENEN KISIM: Hasta bilgilerini getiren sorgu
  const { data: patientData } = api.patients.getById.useQuery(
      { id: patientId },
      { enabled: !!patientId }
  );
  
  // Mevcut diş verileri sorgusu
  const { data: teethData } = api.odontogram.get.useQuery(
      { patientId },
      { enabled: !!patientId }
  );
  
  const saveMutation = api.odontogram.save.useMutation({
    onSuccess: () => {
      void utils.odontogram.get.invalidate({ patientId });
      setIsSheetOpen(false);
      setSelectedTooth(null);
      setSelectedSurface(null);
      alert("Tooth status successfully saved!");
    },
  });

  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [selectedSurface, setSelectedSurface] = useState<Surface>(null);
  const [condition, setCondition] = useState<OdontogramCondition>("healthy");
  const [notes, setNotes] = useState("");
    const [timeline, setTimeline] = useState("");
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    useEffect(() => {
        if (selectedTooth && selectedSurface && teethData) {
            const existing = teethData.find(
                (t) => t.toothNumber === selectedTooth && t.surface === selectedSurface
            );
            setCondition((existing?.condition as OdontogramCondition) ?? "healthy");
            setNotes(existing?.notes ?? "");
        } else {
            setCondition("healthy");
            setNotes("");
        }
    }, [selectedTooth, selectedSurface, teethData]);

    const handleToothSelect = (toothNumber: number, surface: Surface) => {
        setSelectedTooth(toothNumber);
        setSelectedSurface(surface);
        setIsSheetOpen(true);
    };

    const handleSave = () => {
        if (!selectedTooth || !selectedSurface) return;
        saveMutation.mutate({
            patientId,
            toothNumber: selectedTooth,
            surface:     selectedSurface,
            condition,
            notes:       notes || null,
        });
    };

    const renderTooth = (t: number) => {
        // Build a map of surface → condition for this tooth from DB data
        const surfaceConditions = Object.fromEntries(
            (teethData ?? [])
                .filter((row) => row.toothNumber === t)
                .map((row) => [row.surface, row.condition])
        );

        return (
            <Tooth
                key={t}
                number={t}
                selectedTooth={selectedTooth}
                selectedSurface={selectedSurface}
                surfaceConditions={surfaceConditions}
                onSelect={handleToothSelect}
            />
        );
    };


    return (
        <div className="w-full min-h-screen bg-white p-6 rounded-lg shadow-sm border border-gray-100">

            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
                <div>
                    <button
                        onClick={() => router.push(`/dashboard/patients/${patientId}`)}
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-1"
                    >
                        ← Back to patient profile
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">
                        Odontogram: {patientData ? patientData.fullName : "Loading..."}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">Patient ID: {patientId}</p>
                </div>
            </div>

            {/* DENTAL MAP */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col items-center justify-center min-h-[400px]">
                <p className="text-sm font-medium text-gray-600 mb-8 text-center">
                    🦷 Click on the tooth surface to enter a diagnosis.
                </p>

                {/* GORNJA VILICA */}
                <div className="flex flex-col items-center gap-4 w-full border-b border-dashed border-gray-300 pb-6 mb-6">
                    <span className="text-xs font-bold text-gray-400 tracking-wider">
                        UPPER JAW (MAXILLA)
                    </span>
                    <div className="flex gap-4 justify-center items-center flex-wrap">
                        <div className="flex gap-2">{upperRight.map(renderTooth)}</div>
                        <div className="w-[2px] h-12 bg-gray-300 hidden sm:block" />
                        <div className="flex gap-2">{upperLeft.map(renderTooth)}</div>
                    </div>
                </div>

                {/* DONJA VILICA */}
                <div className="flex flex-col items-center gap-4 w-full">
                    <div className="flex gap-4 justify-center items-center flex-wrap">
                        <div className="flex gap-2">{lowerRight.slice().reverse().map(renderTooth)}</div>
                        <div className="w-[2px] h-12 bg-gray-300 hidden sm:block" />
                        <div className="flex gap-2">{lowerLeft.map(renderTooth)}</div>
                    </div>
                    <span className="text-xs font-bold text-gray-400 tracking-wider mt-2">
                        LOWER JAW (MANDIBLE)
                    </span>
                </div>
            </div>

            {/* SHEET — otvara se desno pri odabiru površine */}
            <Sheet
                open={isSheetOpen}
                onOpenChange={(open) => {
                    setIsSheetOpen(open);
                    if (!open) {
                        setSelectedTooth(null);
                        setSelectedSurface(null);
                    }
                }}
            >
                <SheetContent
                    className="w-[400px] sm:w-[540px] overflow-y-auto"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <SheetHeader>
                        <SheetTitle>Diagnosis and Treatment Plan</SheetTitle>
                    </SheetHeader>

                    <div className="mt-6 space-y-4">
                        {selectedTooth && selectedSurface ? (
                            <>
                                {/* Info o odabranom zubu */}
                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                    <p className="text-sm text-blue-800 font-semibold">
                                        Selected Tooth: No. {selectedTooth}
                                    </p>
                                    <p className="text-sm text-blue-600 mt-1">
                                        Surface: <strong>{surfaceTranslations[selectedSurface]}</strong>
                                    </p>
                                </div>

                                <select
                                    value={condition}
                                    onChange={(e) => setCondition(e.target.value as OdontogramCondition)}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white text-gray-700"
                                >
                                    {Object.entries(ODONTOGRAM_CONDITION_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>

                                {/* Napomene */}
                                <textarea
                                    rows={4}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Enter observations..."
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-700"
                                />

                                {/* Greška pri čuvanju */}
                                {saveMutation.isError && (
                                    <p className="text-sm text-red-500">
                                        {saveMutation.error.message}
                                    </p>
                                )}

                                <button
                                    onClick={handleSave}
                                    disabled={saveMutation.isPending}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {saveMutation.isPending ? "Saving..." : "Save Tooth Status"}
                                </button>

                                {/* Historija za ovaj zub */}
                                <div className="mt-6 border-t pt-4">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                        Surface History — Tooth {selectedTooth}
                                    </h4>
                                    {teethData?.filter((t) => t.toothNumber === selectedTooth).length ? (
                                        <div className="space-y-2">
                                            {teethData
                                                ?.filter((t) => t.toothNumber === selectedTooth)
                                                .map((item) => (
                                                    <div
                                                        key={`${item.toothNumber}-${item.surface}`}
                                                        className="rounded-lg border border-gray-200 p-3"
                                                    >
                                                        <p className="text-xs font-bold text-gray-500 uppercase">
                                                            {surfaceTranslations[item.surface] ?? item.surface}
                                                        </p>
                                                        <p className="text-sm font-medium text-gray-800 mt-0.5">
                                                            {ODONTOGRAM_CONDITION_LABELS[item.condition as OdontogramCondition] ?? item.condition}
                                                        </p>
                                                        {item.notes && (
                                                            <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400">
                                            No history for this tooth.
                                        </p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <p className="text-center py-12 text-gray-400 text-sm">
                                Select a tooth from the diagram.
                            </p>
                        )}

                        {/* Legenda */}
                        <div className="mt-8 pt-4 border-t border-gray-100">
                            <h4 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-3">
                                Status Legend
                            </h4>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-2.5 text-xs">
                                {[
                                    { color: "bg-white border border-gray-300", label: "Healthy tooth" },
                                    { color: "bg-[#ef4444]", label: "Caries" },
                                    { color: "bg-[#10b981]", label: "Filling" },
                                    { color: "bg-[#475569]", label: "Missing tooth" },
                                    { color: "bg-[#8b5cf6]", label: "Bridge" },
                                    { color: "bg-[#f59e0b]", label: "Implant" },
                                ].map(({ color, label }) => (
                                    <div key={label} className="flex items-center gap-2">
                                        <span className={`w-3 h-3 rounded-full ${color} inline-block shadow-sm`} />
                                        <span className="text-gray-600 font-medium">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
