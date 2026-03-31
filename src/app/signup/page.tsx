"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, UserCircle2, Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function SignupPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        fullName: "",
        gender: "Male"
    });

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");
        setSuccessMsg("");

        const emailStr = formData.email.trim().toLowerCase();

        // 1. Strict Domain Whitelist
        if (!emailStr.endsWith("@ssim.ac.in")) {
            setErrorMsg("Access Denied: Only @ssim.ac.in student emails are authorized to join SSIM Sync.");
            setLoading(false);
            return;
        }

        try {
            // 2. Core Supabase Auth Sign Up (attaching full_name and gender metadata for delayed creation)
            const { data, error } = await supabase.auth.signUp({
                email: emailStr,
                password: formData.password,
                options: {
                    emailRedirectTo: `${window.location.origin}/onboarding`,
                    data: {
                        full_name: formData.fullName,
                        gender: formData.gender
                    }
                }
            });

            if (error) throw error;

            if (data.user) {

                // Since Email Confirmation is required, session is usually null.
                if (!data.session) {
                    setSuccessMsg("Verification sent! Please check your @ssim.ac.in inbox for the secure link. Your profile will be generated upon login.");
                } else {
                    // If auto-logged in (email verification is accidentally disabled)
                    router.push("/onboarding");
                }
            }
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message || "Something went wrong during signup.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center relative overflow-hidden bg-midnight py-12">
            <div className="absolute inset-0 bg-gradient-to-br from-midnight via-indigo/20 to-midnight pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="glass-panel p-8 md:p-12 rounded-3xl w-full max-w-md relative z-10 mx-6"
            >
                <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                        <UserCircle2 className="w-8 h-8 text-primary" />
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-center text-foreground mb-2">Join SSIM Sync</h1>
                <div className="flex justify-center items-center gap-1 text-emerald-400 text-xs mb-8">
                    <ShieldAlert className="w-3 h-3" /> <span>SSIM Domain Protected</span>
                </div>

                {errorMsg && (
                    <div className="mb-6 p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200 text-sm text-center">
                        {errorMsg}
                    </div>
                )}

                {successMsg && (
                    <div className="mb-6 p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 text-sm text-center flex flex-col items-center">
                        <span className="font-bold mb-1">Check Your Email!</span>
                        <span>{successMsg}</span>
                    </div>
                )}

                {!successMsg && (
                    <form onSubmit={handleSignup} className="flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-foreground/80">College Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="student@ssim.ac.in"
                                className="px-4 py-3 rounded-xl bg-indigo/50 border border-white/10 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-foreground/30"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-foreground/80">Password</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="••••••••"
                                className="px-4 py-3 rounded-xl bg-indigo/50 border border-white/10 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-foreground/30"
                                required
                                minLength={6}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-foreground/80">Full Name (Private)</label>
                            <input
                                type="text"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                placeholder="Legal Name for ID Verification"
                                className="px-4 py-3 rounded-xl bg-indigo/50 border border-white/10 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-foreground/30"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-foreground/80">Gender</label>
                            <select
                                value={formData.gender}
                                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                className="px-4 py-3 rounded-xl bg-indigo/50 border border-white/10 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all cursor-pointer"
                            >
                                <option className="bg-midnight" value="Male">Male</option>
                                <option className="bg-midnight" value="Female">Female</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-4 w-full py-4 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(109,93,254,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>Sign Up Securely <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>
                )}

                <p className="mt-6 text-center text-xs text-foreground/40">
                    Already verified? <Link href="/login" className="text-primary hover:underline">Log in</Link>
                </p>
            </motion.div>
        </main>
    );
}
