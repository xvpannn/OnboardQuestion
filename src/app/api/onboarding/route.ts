import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, whatsapp, projectType, permitNeeded, docsReady } = body;

    if (!whatsapp?.trim() || !projectType?.trim() || !permitNeeded?.trim() || !docsReady?.trim()) {
      return NextResponse.json(
        { error: "Semua pertanyaan wajib diisi." },
        { status: 400 }
      );
    }

    const submission = await prisma.onboardingSubmission.create({
      data: {
        name: name?.trim() || null,
        whatsapp: whatsapp.trim(),
        projectType: projectType.trim(),
        permitNeeded: permitNeeded.trim(),
        docsReady: docsReady.trim(),
      },
    });

    return NextResponse.json({ success: true, id: submission.id });
  } catch (error: any) {
    console.error("Onboarding submission error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat menyimpan data." },
      { status: 500 }
    );
  }
}
