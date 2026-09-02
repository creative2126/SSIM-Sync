"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldAlert, LogOut } from "lucide-react";

export default function AccessGuard() {
    const pathname = usePathname();
    const router = useRouter();
    const [hasSession, setHasSession] = useState<boolean | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const checkStatus = async (session: any) => {
            if (!session) {
                if (isMounted) {
                    setHasSession(false);
                    setStatus(null);
                    setLoading(false);
                }
                return;
            }

            if (isMounted) {
                setHasSession(true);
            }

            const { data, error } = await supabase
                .from("profiles_public")
                .select("verification_status")
                .eq("id", session.user.id)
                .single();

            if (isMounted) {
                if (!error && data) {
                    setStatus(data.verification_status);
                }
                setLoading(false);
            }
        };

        // 1. Initial getSession call to restore auth state from localStorage immediately
        supabase.auth.getSession().then(({ data: { session } }) => {
            checkStatus(session);
        });

        // 2. Listen to onAuthStateChange so login/logout updates state without delay
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            checkStatus(session);
        });

        // 3. Realtime updates for admin rejection (subscribed once on mount)
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
            isMounted = false;
            subscription.unsubscribe();
            supabase.removeChannel(channel);
        };
    }, []);

    // Route guard effect: only redirect when loading is complete
    useEffect(() => {
        if (loading) return;

        const isPublicPath =
            pathname === "/" ||
            pathname === "/login" ||
            pathname === "/signup" ||
            pathname === "/download";

        if (!hasSession && !isPublicPath) {
            const encoded = encodeURIComponent(pathname);
            router.replace(`/login?next=${encoded}`);
        }
    }, [loading, hasSession, pathname, router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setStatus(null);
        setHasSession(false);
        router.replace("/login");
    };

    const isPublicPath =
        pathname === "/" ||
        pathname === "/login" ||
        pathname === "/signup" ||
        pathname === "/download";

    if (isPublicPath || loading) {
        return null;
    }

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
