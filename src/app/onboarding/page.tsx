"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const VIBE_OPTIONS = [
    "Deep conversation", "Random banter", "Comfort", "Shared humor",
    "Calm", "Chaotic", "Thoughtful", "Playful",
    "Kindness", "Intelligence", "Confidence", "Sarcasm",
    "Coffee", "Long walk", "Movie night", "Spontaneous"
];

const generateCampusAlias = () => {
    const adjectives = ["Canteen", "Library", "Midnight", "Coffee", "Hostel", "Campus", "Exam", "Lecture", "Silent", "Sleepy"];
    const nouns = ["Philosopher", "Sleeper", "Thinker", "Addict", "Ghost", "Wanderer", "Procrastinator", "Genius", "Ninja", "Overthinker"];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomAdjective}${randomNoun}${Math.floor(Math.random() * 100)}`;
};

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState<any>(null);

    // Form State
    const [vibeAnswers, setVibeAnswers] = useState<string[]>([]);
    const [alias, setAlias] = useState("");
    const [aliasError, setAliasError] = useState<string | null>(null);
    const [bio, setBio] = useState("");

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

                // ── Resolve college_id ──────────────────────────────────────
                let collegeId: string | null = meta.college_id || null;

                if (!collegeId && user.email) {
                    const domain = user.email.split("@").pop()?.toLowerCase();
                    if (domain) {
                        const { data: college } = await supabase
                            .from("colleges")
                            .select("id")
                            .eq("domain", domain)
                            .eq("is_active", true)
                            .maybeSingle();
                        collegeId = college?.id || null;
                    }
                }

                await supabase.from("profiles_private").insert({
                    id: user.id,
                    real_name: meta.full_name || "Student",
                    email: user.email,
                    verification_status: "approved", // Automatically approved since email is verified
                    college_id: collegeId
                });

                const tempAlias = generateCampusAlias();
                await supabase.from("profiles_public").insert({
                    id: user.id,
                    alias: tempAlias,
                    real_name: meta.full_name || "Student",
                    gender: meta.gender || "Male",
                    college_id: collegeId
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
        setStep(s => Math.min(s + 1, 2));
    };

    const handleBack = () => {
        setAliasError(null);
        setStep(s => Math.max(s - 1, 1));
    };

    const handleFinish = async () => {
        if (!session?.user) return;
        setLoading(true);

        try {
            const finalAlias = alias || generateCampusAlias();
            
            const { error: publicErr } = await supabase
                .from("profiles_public")
                .update({
                    alias: finalAlias,
                    bio: bio,
                    vibe_scores: { selections: vibeAnswers }
                })
                .eq("id", session.user.id);

            if (publicErr) throw publicErr;

            // Mark as approved immediately since domain handles verification
            const { error: privateErr } = await supabase
                .from("profiles_private")
                .update({
                    verification_status: "approved"
                })
                .eq("id", session.user.id);

            if (privateErr) throw privateErr;

            router.push("/feed");
        } catch (err: any) {
            console.error(err);
            alert("Error setting up profile.");
        } finally {
            setLoading(false);
        }
    };

    const toggleVibe = (opt: string) => {
        if (vibeAnswers.includes(opt)) {
            setVibeAnswers(vibeAnswers.filter(v => v !== opt));
        } else if (vibeAnswers.length < 5) {
            setVibeAnswers([...vibeAnswers, opt]);
        }
    };

    if (!session) return <div className="min-h-screen bg-midnight flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

    return (
        <main className="min-h-screen flex flex-col items-center py-12 px-6 relative overflow-hidden bg-midnight">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo/10 via-midnight to-midnight pointer-events-none" />

            {/* Progress Bar & Skip Button */}
            <div className="w-full max-w-2xl px-2 mb-12 relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold text-white leading-none mb-1">Onboarding</h1>
                        <p className="text-[10px] text-foreground/40 uppercase tracking-widest font-black">Customize your persona</p>
                    </div>
                    <button 
                        onClick={() => router.push("/vibes")} 
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-white/5"
                    >
                        Skip for now
                    </button>
                </div>
                
                <div className="flex items-center justify-between">
                    {[1, 2].map(num => (
                        <div key={num} className="flex flex-col items-center gap-2 flex-1 relative">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step >= num ? "bg-primary text-white shadow-[0_0_15px_rgba(109,93,254,0.4)]" : "bg-indigo/30 text-foreground/40 border border-white/5"}`}>
                                {step > num ? <CheckCircle2 className="w-5 h-5" /> : num}
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-tighter mt-1 ${step >= num ? "text-primary" : "text-foreground/40"}`}>
                                {num === 1 ? "Vibe" : "Profile"}
                            </span>
                            {num !== 2 && (
                                <div className={`absolute top-5 left-1/2 w-full h-[2px] -z-10 ${step > num ? "bg-primary/50" : "bg-white/5"}`} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-full max-w-2xl relative z-10">
                <AnimatePresence mode="wait">
                    {/* STEP 1: VIBE QUESTIONS */}
                    {step === 1 && (
                        <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-panel p-8 md:p-10 rounded-3xl">
                            <h2 className="text-2xl font-bold mb-2">Let's find your vibe.</h2>
                            <p className="text-foreground/50 text-sm mb-6">Pick 3 to 5 traits that describe you best.</p>
                            
                            <div className="flex flex-wrap gap-3">
                                {VIBE_OPTIONS.map(opt => {
                                    const isSelected = vibeAnswers.includes(opt);
                                    return (
                                        <button
                                            key={opt}
                                            onClick={() => toggleVibe(opt)}
                                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all text-left border ${isSelected ? "btn-gradient border-transparent" : "bg-indigo/30 border-white/5 hover:bg-indigo/50 text-foreground/70"}`}
                                        >
                                            {opt}
                                        </button>
                                    );
                                })}
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
                                        placeholder="e.g. MidnightThinker (Leave blank for random)"
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
                </AnimatePresence>

                {/* Footer Navigation */}
                <div className="flex items-center justify-between mt-8">
                    {step > 1 ? (
                        <button onClick={handleBack} className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors font-medium flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                    ) : <div />}

                    {step < 2 ? (
                        <button
                            onClick={handleNext}
                            disabled={step === 1 && (vibeAnswers.length < 3 || vibeAnswers.length > 5)}
                            className="px-6 py-3 rounded-xl btn-gradient transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next Step <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleFinish}
                            disabled={loading}
                            className="px-8 py-3 rounded-xl btn-gradient font-medium flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Profile"}
                        </button>
                    )}
                </div>
            </div>
        </main>
    );
}
