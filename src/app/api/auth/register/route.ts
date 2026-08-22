import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { clinicName, email, password } = await req.json();

    if (!clinicName || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    const slug = clinicName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const passwordHash = await bcrypt.hash(password, 10);

    // Create Organization and User transaction
    const org = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: clinicName,
          slug: slug + "-" + Math.floor(Math.random() * 1000), // ensure uniqueness
          isActive: true,
        }
      });

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: "MASTER",
          organizationId: organization.id
        }
      });
      
      await tx.employeeProfile.create({
         data: {
            userId: user.id,
            name: clinicName + " Admin",
            employeeType: "Super Admin",
         }
      });

      return organization;
    });

    return NextResponse.json({ success: true, organizationId: org.id });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
