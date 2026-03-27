"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, UploadCloud, CheckCircle2, Loader2, ShieldAlert, Camera } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import CameraCapture from "@/components/CameraCapture";

const VIBE_QUESTIONS = [
    {
        id: "q1",
        question: "Your ideal connection starts with:",
        options: ["Deep conversation", "Random banter", "Comfort", "Shared humor"]
    },
    {
        id: "q2",
        question: "Your vibe is more:",
        options: ["Calm", "Chaotic", "Thoughtful", "Playful"]
    },
    {
        id: "q3",
        question: "You’re more likely to fall for:",
        options: ["Kindness", "Intelligence", "Confidence", "Humor"]
    },
    {
        id: "q4",
        question: "Best hangout?",
        options: ["Coffee", "Long walk", "Movie night", "Random spontaneous plan"]
    }
];

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState<any>(null);

    // Form State
    const [vibeAnswers, setVibeAnswers] = useState<Record<string, string>>({});
    const [alias, setAlias] = useState("");
    const [aliasError, setAliasError] = useState<string | null>(null);
    const [bio, setBio] = useState("");
    const [studentIdFile, setStudentIdFile] = useState<File | null>(null);
    const [selfieFile, setSelfieFile] = useState<File | null>(null);
    const [activeCamera, setActiveCamera] = useState<"id" | "selfie" | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (!data.session) {
                router.push("/signup");
                return;
            }
            setSession(data.session);
            initProfileFallback(data.session.user);
        });
    }, [router]);

    const initProfileFallback = async (user: any) => {
        try {
            const { data: checkData } = await supabase.from("profiles_private").select("id").eq("id", user.id);

            if (!checkData || checkData.length === 0) {
                const meta = user.user_metadata || {};

                await supabase.from("profiles_private").insert({
                    id: user.id,
                    real_name: meta.full_name || "Student",
                    email: user.email,
                    verification_status: "pending"
                });

                const tempAlias = `User_${Math.floor(Math.random() * 100000)}`;
                await supabase.from("profiles_public").insert({
                    id: user.id,
                    alias: tempAlias,
                    real_name: meta.full_name || "Student",
                    gender: meta.gender || "Male"
                });
            } else {
                const { data: pubProfile } = await supabase.from("profiles_public").select("alias, bio").eq("id", user.id).single();
                if (pubProfile) {
                    if (pubProfile.alias && !pubProfile.alias.startsWith("User_")) setAlias(pubProfile.alias);
                    if (pubProfile.bio) setBio(pubProfile.bio);
                }
            }
        } catch (err) {
            console.error("Init Profile Error:", err);
        }
    };

    const handleNext = async () => {
        if (step === 2) {
            setLoading(true);
            setAliasError(null);

            setLoading(false);
        }
        setStep(s => Math.min(s + 1, 3));
    };
    const handleBack = () => {
        setAliasError(null);
        setStep(s => Math.max(s - 1, 1));
    };

    const handleFinish = async () => {
        if (!session?.user || !selfieFile || !studentIdFile) return;
        setLoading(true);

        try {
            const faceapi = await import("face-api.js");
            await faceapi.nets.tinyFaceDetector.loadFromUri('/models');

            const selfieUrl = URL.createObjectURL(selfieFile);
            const selfieImg = new Image();
            selfieImg.src = selfieUrl;
            await new Promise((resolve) => { selfieImg.onload = resolve; });

            const detections = await faceapi.detectAllFaces(selfieImg, new faceapi.TinyFaceDetectorOptions());

            if (detections.length === 0) {
                alert("No face detected in the selfie. Please upload a clear photo of your face.");
                throw new Error("No face detected");
            }
            if (detections.length > 1) {
                alert("Multiple faces detected. Please ensure only you are in the photo.");
                throw new Error("Multiple faces detected");
            }

            const selfiePath = `selfies/${session.user.id}_${Date.now()}.jpg`;
            const idPath = `ids/${session.user.id}_${Date.now()}.jpg`;

            const { error: selfieUploadError } = await supabase.storage.from("verifications").upload(selfiePath, selfieFile);
            if (selfieUploadError) {
                console.error("Selfie upload error:", selfieUploadError);
                throw new Error(`Selfie upload failed: ${selfieUploadError.message}. Ensure the 'verifications' bucket exists in Supabase Storage.`);
            }

            const { error: idUploadError } = await supabase.storage.from("verifications").upload(idPath, studentIdFile);
            if (idUploadError) {
                console.error("ID upload error:", idUploadError);
                throw new Error(`ID upload failed: ${idUploadError.message}. Ensure the 'verifications' bucket exists in Supabase Storage.`);
            }

            const { error: publicErr } = await supabase
                .from("profiles_public")
                .update({
                    alias: alias || `User_${Math.floor(Math.random() * 9999)}`,
                    bio: bio,
                    vibe_scores: vibeAnswers
                })
                .eq("id", session.user.id);

            if (publicErr) throw publicErr;

            const { error: privateErr } = await supabase
                .from("profiles_private")
                .update({
                    student_id_url: idPath,
                    selfie_url: selfiePath,
                    verification_status: "pending"
                })
                .eq("id", session.user.id);

            if (privateErr) throw privateErr;

            router.push("/feed");
        } catch (err: any) {
            console.error(err);
            if (!err.message.includes("face")) {
                alert("Error setting up profile. Please ensure caching is not blocking the DB query.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (!session) return <div className="min-h-screen bg-midnight flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

    return (
        <main className="min-h-screen flex flex-col items-center py-12 px-6 relative overflow-hidden bg-midnight">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo/10 via-midnight to-midnight pointer-events-none" />

            {/* Progress Bar */}
            <div className="w-full max-w-2xl flex items-center justify-between mb-12 relative z-10">
                {[1, 2, 3].map(num => (
                    <div key={num} className="flex flex-col items-center gap-2 flex-1 relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step >= num ? "bg-primary text-white shadow-[0_0_15px_rgba(109,93,254,0.4)]" : "bg-indigo/30 text-foreground/40 border border-white/5"}`}>
                            {step > num ? <CheckCircle2 className="w-5 h-5" /> : num}
                        </div>
                        <span className={`text-xs ${step >= num ? "text-primary" : "text-foreground/40"}`}>
                            {num === 1 ? "The Vibe" : num === 2 ? "The Profile" : "Verification"}
                        </span>
                        {num !== 3 && (
                            <div className={`absolute top-5 left-1/2 w-full h-[2px] -z-10 ${step > num ? "bg-primary/50" : "bg-white/5"}`} />
                        )}
                    </div>
                ))}
            </div>

            <div className="w-full max-w-2xl relative z-10">
                <AnimatePresence mode="wait">
                    {/* STEP 1: VIBE QUESTIONS */}
                    {step === 1 && (
                        <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-panel p-8 md:p-10 rounded-3xl">
                            <h2 className="text-2xl font-bold mb-6">Let's find your vibe.</h2>
                            <div className="flex flex-col gap-8">
                                {VIBE_QUESTIONS.map(q => (
                                    <div key={q.id}>
                                        <p className="font-medium text-foreground/90 mb-3">{q.question}</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {q.options.map(opt => (
                                                <button
                                                    key={opt}
                                                    onClick={() => setVibeAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                                    className={`p-3 rounded-xl text-sm font-medium transition-all text-left ${vibeAnswers[q.id] === opt ? "bg-primary/20 border-primary text-primary border" : "bg-indigo/30 border border-white/5 hover:bg-indigo/50 text-foreground/70"}`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: PROFILE SETUP */}
                    {step === 2 && (
                        <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-panel p-8 md:p-10 rounded-3xl">
                            <h2 className="text-2xl font-bold mb-2">Build your anonymous persona.</h2>
                            <p className="text-foreground/50 text-sm mb-8">This is what other students will see.</p>

                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-foreground/80">Anonymous Alias</label>
                                    <input
                                        type="text"
                                        value={alias}
                                        onChange={(e) => {
                                            setAlias(e.target.value);
                                            setAliasError(null);
                                        }}
                                        placeholder="e.g. MidnightThinker"
                                        className={`px-4 py-3 rounded-xl bg-indigo/50 border ${aliasError ? "border-red-500/50" : "border-white/10"} text-foreground focus:outline-none focus:border-primary/50`}
                                    />
                                    {aliasError ? (
                                        <p className="text-xs text-red-400 font-bold">{aliasError}</p>
                                    ) : (
                                        <p className="text-xs text-primary/80">Choose a name that represents your campus vibe.</p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-foreground/80">Short Bio / Prompt</label>
                                    <textarea
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        placeholder="A random fact about me is..."
                                        rows={4}
                                        className="px-4 py-3 rounded-xl bg-indigo/50 border border-white/10 text-foreground focus:outline-none focus:border-primary/50 resize-none"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: VERIFICATION */}
                    {step === 3 && (
                        <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-panel p-8 md:p-10 rounded-3xl">
                            <h2 className="text-2xl font-bold mb-2">Platform Verification</h2>
                            <p className="text-foreground/50 text-sm mb-6">Your identity remains hidden. Used strictly for manual approval to keep the platform safe.</p>

                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3 mb-8">
                                <ShieldAlert className="text-amber-500 w-6 h-6 shrink-0" />
                                <p className="text-xs text-amber-200 leading-relaxed">Identity verification protects our community from fake accounts. Your pictures will be securely stored and never shown publicly without your explicit consent via Mutual Reveal.</p>
                            </div>

                            <div className="flex flex-col gap-8">
                                {/* Student ID Section */}
                                <div className="flex flex-col gap-3">
                                    <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                                        SSIM Student ID
                                        {studentIdFile && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="border-2 border-dashed border-white/10 hover:border-primary/50 transition-colors rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-indigo/20 group">
                                            <UploadCloud className="w-6 h-6 text-primary/50 group-hover:text-primary mb-2" />
                                            <p className="text-xs font-medium">Upload ID</p>
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => setStudentIdFile(e.target.files?.[0] || null)} />
                                        </label>
                                        <button
                                            onClick={() => setActiveCamera("id")}
                                            className="border-2 border-dashed border-white/10 hover:border-primary/50 transition-colors rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-indigo/20 group"
                                        >
                                            <Camera className="w-6 h-6 text-primary/50 group-hover:text-primary mb-2" />
                                            <p className="text-xs font-medium">Take Photo</p>
                                        </button>
                                    </div>
                                    {studentIdFile && (
                                        <div className="mt-2 flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-indigo/30">
                                                <img src={URL.createObjectURL(studentIdFile)} alt="ID Preview" className="w-full h-full object-cover" />
                                            </div>
                                            <p className="text-xs text-foreground/50 truncate flex-1">{studentIdFile.name}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Selfie Section (CAMERA ONLY) */}
                                <div className="flex flex-col gap-3">
                                    <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                                        Verification Selfie (Live Photo Required)
                                        {selfieFile && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                    </label>
                                    <div className="w-full">
                                        <button
                                            onClick={() => setActiveCamera("selfie")}
                                            className="w-full border-2 border-dashed border-white/10 hover:border-primary/50 transition-colors rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-indigo/20 group"
                                        >
                                            <Camera className="w-8 h-8 text-primary/50 group-hover:text-primary mb-2" />
                                            <p className="font-medium">Open Camera</p>
                                            <p className="text-xs text-foreground/40 mt-1">Live capture required for safety</p>
                                        </button>
                                    </div>
                                    {selfieFile && (
                                        <div className="mt-2 flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-indigo/30">
                                                <img src={URL.createObjectURL(selfieFile)} alt="Selfie Preview" className="w-full h-full object-cover" />
                                            </div>
                                            <p className="text-xs text-foreground/50 truncate flex-1">Captured Selfie</p>
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer Navigation */}
                <div className="flex items-center justify-between mt-8">
                    {step > 1 ? (
                        <button onClick={handleBack} className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors font-medium flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                    ) : <div />}

                    {step < 3 ? (
                        <button
                            onClick={handleNext}
                            disabled={step === 1 && Object.keys(vibeAnswers).length < 4}
                            className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(109,93,254,0.2)]"
                        >
                            Next Step <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleFinish}
                            disabled={loading || !studentIdFile || !selfieFile}
                            className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 transition-colors font-medium flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit for Verification"}
                        </button>
                    )}
                </div>
            </div>

            {/* Camera Capture Modal */}
            <AnimatePresence>
                {activeCamera && (
                    <CameraCapture
                        title={activeCamera === "id" ? "Capture Student ID" : "Capture Verification Selfie"}
                        onCapture={(file) => {
                            if (activeCamera === "id") setStudentIdFile(file);
                            else setSelfieFile(file);
                            setActiveCamera(null);
                        }}
                        onClose={() => setActiveCamera(null)}
                    />
                )}
            </AnimatePresence>
        </main>
    );
}
