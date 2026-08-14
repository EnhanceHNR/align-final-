"use client";

import { useState, useEffect } from "react";
import { useUser, useFirestore } from "@/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export type UserRole = "admin" | "staff" | null;

export function useRoles() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const db = useFirestore();
  const [role, setRole] = useState<UserRole>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        setIsRoleLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setRole(userDoc.data().role as UserRole);
        } else {
          // Default role for new users is 'staff'
          const defaultRole: UserRole = "staff";
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            fullName: user.displayName || "",
            role: defaultRole,
            createdAt: new Date().toISOString(),
          });
          setRole(defaultRole);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setRole(null);
      } finally {
        setIsRoleLoading(false);
      }
    }

    if (!isAuthLoading) {
      fetchRole();
    }
  }, [user, isAuthLoading, db]);

  return {
    role,
    isAdmin: role === "admin",
    isStaff: role === "staff",
    isLoading: isAuthLoading || isRoleLoading,
  };
}
