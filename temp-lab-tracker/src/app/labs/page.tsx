"use client";

import { EntityManager } from "@/components/EntityManager";
import { FlaskConical } from "lucide-react";

export default function LabsPage() {
  return (
    <EntityManager 
      title="Labs & Partners"
      description="Manage receiving labs, partners, and internal staff."
      collectionName="labs"
      icon={FlaskConical}
    />
  );
}
