"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, LogOut, Loader2 } from "lucide-react";

export default function AccessGuard() {
    const pathname = usePathname();
    const router = useRouter();
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkStatus = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from("profiles_public")
                .select("verification_status")
                .eq("id", session.user.id)
                .single();

            if (!error && data) {
                setStatus(data.verification_status);
            }
            setLoading(false);
        };

        checkStatus();

        // Optional: Listen for real-time status changes (Admin might reject while user is logged in)
        const channel = supabase
            .channel('status_guard')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles_public'
            }, (payload) => {
                supabase.auth.getSession().then(({ data: { session } }) => {
                    if (session && payload.new.id === session.user.id) {
                        setStatus(payload.new.verification_status);
                    }
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [pathname]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setStatus(null);
        router.push("/login");
    };

    // Don't block public pages
    if (pathname === "/" || pathname === "/login" || pathname === "/signup") return null;

    if (loading) return null; // Silent load

    if (status === "rejected") {
        return (
            <div className="fixed inset-0 z-[1000] bg-midnight flex items-center justify-center p-6 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.15),transparent)] pointer-events-none" />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative w-full max-w-md glass-panel p-10 rounded-[3rem] border border-red-500/20 text-center shadow-[0_0_50px_rgba(239,68,68,0.2)]"
                >
                    <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-8 border border-red-500/30">
                        <ShieldAlert className="w-10 h-10 text-red-500" />
                    </div>

                    <h1 className="text-3xl font-black text-white mb-4 tracking-tight">Access Denied</h1>
                    <p className="text-foreground/60 text-sm leading-relaxed mb-10">
                        Your account verification request was <span className="text-red-400 font-bold">rejected</span> by the campus administration.
                        For safety reasons, your access to SSIM Sync has been permanently disabled.
                    </p>

                    <button
                        onClick={handleLogout}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/10 flex items-center justify-center gap-3 group"
                    >
                        <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        Log Out to Safety
                    </button>

                    <p className="mt-8 text-[10px] text-foreground/20 uppercase tracking-[0.2em] font-bold">
                        SSIM Sync Trust & Safety
                    </p>
                </motion.div>
            </div>
        );
    }

    return null;
}
