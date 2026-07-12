"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { ArrowRight, ArrowLeft, Check, AlertCircle, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

interface StepConfig {
  id: string;
  question: string;
  subtext: string;
  type: "text" | "textarea" | "radio";
  placeholder?: string;
  options?: string[];
}

const ONBOARDING_STEPS: StepConfig[] = [
  {
    id: "projectType",
    question: "Proyek apa yang sedang Anda tangani?",
    subtext: "Ceritakan singkat jenis dan skala proyek Anda — misalnya jenis bangunan, estimasi lantai, dan lokasi di Bali.",
    type: "textarea",
    placeholder: "Contoh: Hotel butik 30 kamar di Seminyak, gedung kantor 4 lantai di Denpasar, klinik swasta 2 lantai di Gianyar..."
  },
  {
    id: "permitNeeded",
    question: "Apa yang Anda butuhkan, dan di tahap apa Anda sekarang?",
    subtext: "PBG diurus sebelum membangun. SLF diurus setelah bangunan selesai untuk mendapat sertifikasi laik fungsi.",
    type: "radio",
    options: [
      "PBG — Proyek akan atau sedang dibangun, belum ada izin",
      "SLF — Bangunan sudah selesai, butuh sertifikasi laik fungsi",
      "Keduanya (PBG + SLF)",
      "Belum yakin, butuh konsultasi dulu"
    ]
  },
  {
    id: "docsReady",
    question: "Apakah dokumen teknis bangunan sudah tersedia?",
    subtext: "Dokumen teknis mencakup gambar arsitektur, site plan, dan dokumen struktur bangunan. Ini menentukan seberapa cepat proses bisa dimulai.",
    type: "radio",
    options: [
      "Sudah lengkap",
      "Sebagian ada",
      "Belum ada",
      "Tidak tahu"
    ]
  },
  {
    id: "name",
    question: "Nama Anda?",
    subtext: "Agar kami bisa menyapa Anda dengan benar saat menghubungi.",
    type: "text",
    placeholder: "Contoh: Budi Santoso"
  },
  {
    id: "whatsapp",
    question: "Nomor WhatsApp aktif Anda?",
    subtext: "Kami akan menghubungi Anda langsung melalui WhatsApp setelah data ini kami terima dan tinjau.",
    type: "text",
    placeholder: "Contoh: 08123456789"
  }
];

function OnboardingFormInner() {
  const searchParams = useSearchParams();
  const waParam = searchParams.get("wa") || searchParams.get("whatsapp") || "";

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    projectType: "",
    permitNeeded: "",
    docsReady: "",
    name: "",
    whatsapp: waParam,
  });
  const [inputVal, setInputVal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);

  const step = ONBOARDING_STEPS[currentStep];
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const submittingRef = useRef(false);

  // Pre-fill whatsapp if provided in URL
  useEffect(() => {
    if (waParam) {
      setFormData(prev => ({ ...prev, whatsapp: waParam }));
      if (currentStep === 3) setInputVal(waParam);
    }
  }, [waParam]);

  // Auto-focus input when step changes
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [currentStep, isDone]);

  // Sync input value when navigating between steps
  useEffect(() => {
    const savedVal = (formData[step.id as keyof typeof formData] as string) || "";
    setInputVal(savedVal);
  }, [currentStep]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const showToast = (message: string, type: "success" | "error" | "warning" = "warning") => {
    setToast({ message, type });
  };

  const handleNext = () => {
    if (isSubmitting || submittingRef.current) return;

    if (!inputVal.trim()) {
      showToast("Kolom ini wajib diisi sebelum melanjutkan.");
      return;
    }

    const updatedData = { ...formData, [step.id]: inputVal };
    setFormData(updatedData);

    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      submitForm(updatedData);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  // Radio auto-advance: select → save → advance after brief delay
  const handleRadioSelect = (value: string) => {
    setInputVal(value);
    const updatedData = { ...formData, [step.id]: value };
    setFormData(updatedData);

    setTimeout(() => {
      if (currentStep < ONBOARDING_STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        submitForm(updatedData);
      }
    }, 280);
  };

  const submitForm = async (finalData = formData) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalData.name.trim(),
          whatsapp: finalData.whatsapp.trim(),
          projectType: finalData.projectType.trim(),
          permitNeeded: finalData.permitNeeded.trim(),
          docsReady: finalData.docsReady.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsDone(true);
        showToast("Data berhasil dikirim!", "success");
      } else {
        submittingRef.current = false;
        setIsSubmitting(false);
        showToast(data.error || "Terjadi kesalahan saat mengirim formulir.", "error");
      }
    } catch (e) {
      console.error(e);
      submittingRef.current = false;
      setIsSubmitting(false);
      showToast("Koneksi gagal. Silakan periksa jaringan internet Anda.", "error");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (step.type === "textarea" && !e.ctrlKey) return;
      e.preventDefault();
      handleNext();
    } else if (e.key === "Backspace" && inputVal === "") {
      e.preventDefault();
      handlePrev();
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isSubmitting || isDone) return;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (isInput) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [currentStep, isSubmitting, isDone]);

  const progressPct = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  if (isDone) {
    return (
      <div className="relative min-h-screen bg-black flex flex-col justify-between p-6 md:p-12 text-white overflow-hidden">
        <header className="z-10 flex justify-between items-center">
          <div className="text-sm font-mono font-bold tracking-widest text-white/40 uppercase">PBG / SLF</div>
        </header>

        <main className="z-10 max-w-xl mx-auto flex-1 flex flex-col justify-center items-center text-center animate-fade-in my-12">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white mb-6">
            <Check className="w-8 h-8" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-light leading-snug mb-4">
            Terima Kasih. <br />
            <span className="italic text-gray-400">Data Anda Telah Kami Terima</span>
          </h1>
          <p className="font-sans text-sm md:text-base text-gray-400 mb-2 leading-relaxed max-w-md">
            Kami akan segera meninjau kebutuhan proyek Anda dan menghubungi nomor WhatsApp yang terdaftar dalam waktu dekat.
          </p>
        </main>

        <footer className="z-10 text-center text-xs text-gray-600 font-sans">
          Perizinan Bangunan Bali — PBG &amp; SLF
        </footer>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black flex flex-col justify-between p-6 md:p-12 text-white overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-lg shadow-md border animate-fade-in ${
          toast.type === "success"
            ? "bg-white/10 border-white text-white"
            : toast.type === "error"
              ? "bg-red-500/10 border-red-500 text-red-400"
              : "bg-gray-800 border-gray-700 text-gray-300"
        }`}>
          {toast.type === "error" ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <Check className="w-4 h-4 flex-shrink-0" />}
          <span className="text-xs md:text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-[4px] bg-neutral-900">
        <div className="h-full bg-white transition-all duration-300 ease-out" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Header */}
      <header className="z-10 flex justify-between items-center mt-2">
        <div className="text-xs font-mono font-bold tracking-widest text-white/30 uppercase">PBG / SLF Bali</div>
        <div className="text-xs uppercase tracking-wider font-semibold text-gray-500 font-sans">
          Langkah {currentStep + 1} dari {ONBOARDING_STEPS.length}
        </div>
      </header>

      {/* Form Content */}
      <main className="z-10 max-w-2xl w-full mx-auto flex-1 flex flex-col justify-center py-12 transition-all duration-500 animate-fade-in">
        <div className="space-y-6">
          <div>
            <h1 className="font-serif text-2xl md:text-4xl font-light leading-snug text-white tracking-wide animate-fade-in" key={currentStep}>
              {step.question}
            </h1>
            <p className="font-sans text-xs md:text-sm text-gray-400 mt-3 leading-relaxed max-w-xl">
              {step.subtext}
            </p>
          </div>

          <div className="pt-4">
            {/* Text Input */}
            {step.type === "text" && (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={step.placeholder}
                className="w-full bg-transparent border-b border-neutral-800 focus:border-white outline-none py-3 text-lg md:text-xl font-sans transition-all text-white placeholder-neutral-700"
              />
            )}

            {/* Textarea Input */}
            {step.type === "textarea" && (
              <div className="space-y-2">
                <textarea
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={step.placeholder}
                  rows={4}
                  className="w-full bg-transparent border-b border-neutral-800 focus:border-white outline-none py-2 text-base md:text-lg font-sans transition-all resize-none text-white placeholder-neutral-700"
                />
                <span className="block text-[10px] text-gray-500 font-sans">
                  *Tekan Lanjut di bawah atau gunakan <kbd className="bg-neutral-900 px-1.5 py-0.5 rounded text-[10px] text-gray-400">Ctrl + Enter</kbd>
                </span>
              </div>
            )}

            {/* Radio Options — Typeform-style */}
            {step.type === "radio" && step.options && (
              <div className="space-y-3 pt-2">
                {step.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => handleRadioSelect(option)}
                    className={`w-full text-left px-5 py-4 rounded-xl border text-sm font-sans transition-all flex items-center gap-4 ${
                      inputVal === option
                        ? "border-white bg-white/10 text-white"
                        : "border-neutral-800 text-gray-400 hover:border-gray-600 hover:text-gray-200"
                    }`}
                  >
                    <span className="font-mono text-[11px] font-bold text-gray-500 border border-neutral-700 rounded px-1.5 py-0.5 shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nav Controls */}
          {step.type !== "radio" && (
            <div className="pt-6 flex items-center gap-4">
              <button
                onClick={handleNext}
                disabled={isSubmitting}
                className="px-6 py-3 bg-white hover:bg-gray-200 text-black rounded-lg text-xs md:text-sm font-semibold tracking-wide flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    {currentStep === ONBOARDING_STEPS.length - 1 ? "Kirim" : "Lanjut"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer Nav */}
      <footer className="z-10 flex justify-between items-center border-t border-neutral-900 pt-6">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0 || isSubmitting}
          className="text-xs md:text-sm font-semibold text-gray-500 hover:text-white flex items-center gap-1.5 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>
        <div className="text-[10px] md:text-xs text-gray-600 font-sans tracking-wide">
          {step.type === "radio" ? "Klik salah satu pilihan di atas untuk melanjutkan." : "Isi kolom lalu klik Lanjut."}
        </div>
      </footer>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-sans text-sm">
        <Loader2 className="w-6 h-6 animate-spin text-white mr-2" />
        Memuat...
      </div>
    }>
      <OnboardingFormInner />
    </Suspense>
  );
}
