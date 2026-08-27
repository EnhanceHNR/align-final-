"use server";

import bcrypt from 'bcryptjs';
import { adminDb, adminStorage } from "@/lib/firebaseAdmin";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";

export async function addEmployeeAction(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { error: "Unauthorized" };
    }

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const employeeDataStr = formData.get('employeeData') as string;
    
    if (!email || !password || !name || !employeeDataStr) {
      return { error: "Missing required fields" };
    }

    const employeeData = JSON.parse(employeeDataStr);
    
    // Check if email exists
    const existingUserSnap = await adminDb
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
      
    if (!existingUserSnap.empty) {
      return { error: "Email already in use" };
    }

    // Handle file uploads
    const profilePhoto = formData.get('profilePhoto') as File | null;
    const nationalId = formData.get('nationalId') as File | null;
    const signedDocument = formData.get('signedDocument') as File | null;

    const bucket = adminStorage.bucket();
    const uploadedFiles: Record<string, string> = {};

    const uploadFile = async (file: File, pathPrefix: string) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${pathPrefix}/${Date.now()}_${file.name}`;
      const fileRef = bucket.file(fileName);
      await fileRef.save(buffer, {
        metadata: { contentType: file.type },
      });
      await fileRef.makePublic();
      return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    };

    if (profilePhoto) {
      uploadedFiles.profilePhotoUrl = await uploadFile(profilePhoto, 'employees/profiles');
    }
    if (nationalId) {
      uploadedFiles.nationalIdUrl = await uploadFile(nationalId, 'employees/documents');
    }
    if (signedDocument) {
      uploadedFiles.signedDocumentUrl = await uploadFile(signedDocument, 'employees/documents');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const orgId = session.user.organizationId;

    // Create User
    const newUserRef = adminDb.collection('users').doc();
    await newUserRef.set({
      email,
      passwordHash,
      role: employeeData.employeeType === "Admin" ? "ADMIN" : (employeeData.employeeType === "Super Admin" ? "MASTER" : "STAFF"),
      organizationId: orgId,
      isActive: true,
      emailVerified: true,
    });

    // Create EmployeeProfile
    const profileRef = adminDb.collection('employeeProfiles').doc();
    const profileDataPayload = {
      userId: newUserRef.id,
      organizationId: orgId,
      name,
      department: employeeData.department ?? null,
      baseSalary: employeeData.baseSalary ?? 0,
      employeeType: employeeData.employeeType ?? "Employee",
      mobileNumber: employeeData.mobileNumber ?? null,
      jobTitle: employeeData.role ?? null,
      manager: employeeData.manager ?? null,
      phoneNumber: employeeData.phoneNumber ?? null,
      bloodGroup: employeeData.bloodGroup ?? null,
      address: employeeData.address ?? null,
      emergencyContact: employeeData.emergencyContact ?? null,
      addressProof: employeeData.addressProof ?? null,
      panCard: employeeData.panCard ?? null,
      bankAccountDetails: employeeData.bankAccountDetails ?? null,
      dateOfBirth: employeeData.dateOfBirth ?? null,
      joiningDate: employeeData.joiningDate ?? null,
      weeklyOffs: employeeData.weeklyOffs ?? [],
      bufferTime: employeeData.bufferTime ?? 0,
      paidLeaveBalance: employeeData.paidLeave ?? 0,
      sickLeaveBalance: employeeData.sickLeave ?? 0,
      ...uploadedFiles
    };
    await profileRef.set(profileDataPayload);

    if (employeeData.shift && employeeData.shift.length > 0) {
      const batch = adminDb.batch();
      employeeData.shift.forEach((s: any) => {
         const shiftRef = adminDb.collection('shiftSegments').doc();
         batch.set(shiftRef, {
            employeeProfileId: profileRef.id,
            organizationId: orgId,
            startTime: s.startTime,
            endTime: s.endTime
         });
      });
      await batch.commit();
    }

    if (employeeData.salaryComponents && employeeData.salaryComponents.length > 0) {
       // Optionally store salary components in a separate collection or inside the profile.
       // The requirements say "create the employeeProfiles document with all the complex fields."
       await profileRef.update({
          salaryComponents: employeeData.salaryComponents
       });
    }

    return { success: true, profileId: profileRef.id };
  } catch (error: any) {
    console.error("Failed to add employee:", error);
    return { error: error.message || "Failed to add employee" };
  }
}
