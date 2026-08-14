"use client";

import { EntityManager } from "@/components/EntityManager";
import { User } from "lucide-react";

export default function PatientsPage() {
  return (
    <EntityManager 
      title="Patient Records"
      description="List of all registered patients for case management."
      collectionName="patients"
      icon={User}
    />
  );
}
