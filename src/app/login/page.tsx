"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            alert(error.message);
            setLoading(false);
        } else {
            // Check if onboarding is complete
            const { data: profile } = await supabase
                .from("profiles_public")
                .select("alias")
                .eq("id", (await supabase.auth.getUser()).data.user?.id)
                .single();

            if (profile?.alias && !profile.alias.startsWith("User_")) {
                router.push("/feed");
            } else {
                router.push("/onboarding");
            }
        }
    };

    return (
        <main className="min-h-screen bg-midnight flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo/20 rounded-full blur-[120px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-10">
                    <div className="inline-flex p-4 bg-primary/10 rounded-2xl border border-primary/20 mb-6 shadow-[0_0_30px_rgba(109,93,254,0.2)]">
                        <ShieldCheck className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
                    <p className="text-foreground/50 font-medium">Continue your anonymous journey</p>
                </div>

                <form onSubmit={handleLogin} className="glass-panel p-10 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-[0.2em] ml-1">SSIM Email</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 group-focus-within:text-primary transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="student@ssim.ac.in"
                                required
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/5 focus:border-primary/50 focus:bg-white/10 outline-none transition-all text-white placeholder:text-foreground/20"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-foreground/40 tracking-[0.2em] ml-1">Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 group-focus-within:text-primary transition-colors" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/5 focus:border-primary/50 focus:bg-white/10 outline-none transition-all text-white placeholder:text-foreground/20"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 rounded-2xl bg-primary text-white font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(109,93,254,0.3)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                            <>
                                Sign In <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>

                    <div className="pt-4 text-center">
                        <p className="text-sm text-foreground/40">
                            New to SSIM Sync?{" "}
                            <Link href="/signup" className="text-primary font-bold hover:underline">
                                Create Account
                            </Link>
                        </p>
                    </div>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-[10px] text-foreground/20 uppercase tracking-[0.3em] font-medium italic">
                        "Your identity is safe with us"
                    </p>
                </div>
            </motion.div>
        </main>
    );
}
