import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import nodemailer from "nodemailer";

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

    // Send email notification via Gmail SMTP
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: "pandukusumautama@gmail.com", // Target penerima utama
        subject: `[LEAD BARU PBG] ${submission.name || submission.whatsapp}`,
        text: `PROSPEK BARU PBG/SLF MASUK!\n\nNama: ${submission.name || "-"}\nWhatsApp: ${submission.whatsapp}\nJenis Proyek: ${submission.projectType}\nKebutuhan Izin: ${submission.permitNeeded}\nKesiapan Dokumen: ${submission.docsReady}\n\nAmbil tindakan logistik sekarang juga.`,
      };

      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error("Gagal mengirim email notifikasi:", emailError);
    }

    return NextResponse.json({ success: true, id: submission.id });
  } catch (error: any) {
    console.error("Onboarding submission error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat menyimpan data." },
      { status: 500 }
    );
  }
}
