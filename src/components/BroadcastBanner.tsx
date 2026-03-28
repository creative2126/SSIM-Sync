"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Info } from "lucide-react";

export default function BroadcastBanner() {
    const [broadcast, setBroadcast] = useState<any>(null);
    const [dismissedId, setDismissedId] = useState<string | null>(null);

    useEffect(() => {
        fetchLatestBroadcast();

        const channel = supabase
            .channel('public_broadcasts')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'broadcasts'
            }, () => {
                fetchLatestBroadcast();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchLatestBroadcast = async () => {
        const { data, error } = await supabase
            .from("broadcasts")
            .select("*")
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!error && data) {
            const savedDismissed = localStorage.getItem('dismissed_broadcast_id');
            if (savedDismissed !== data.id) {
                setBroadcast(data);
            }
        }
    };

    const handleDismiss = () => {
        if (broadcast) {
            localStorage.setItem('dismissed_broadcast_id', broadcast.id);
            setBroadcast(null);
        }
    };

    if (!broadcast) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="fixed top-0 left-0 right-0 z-[200] bg-primary/25 backdrop-blur-xl border-b border-primary/30 shadow-2xl safe-top"
            >
                <div className="mobile-container py-4 px-6 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Bell className="w-4 h-4 text-primary animate-bounce" />
                        </div>
                        <div className="flex flex-col">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary leading-none mb-1.5">Campus Broadcast</h4>
                            <p className="text-xs font-bold text-white leading-relaxed">
                                {broadcast.title}: <span className="font-medium text-foreground/70">{broadcast.message}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-foreground/30 hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
