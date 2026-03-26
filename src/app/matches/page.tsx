"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare, ShieldCheck, ChevronRight, Sparkles } from "lucide-react";

export default function MatchesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [matches, setMatches] = useState<any[]>([]);

    useEffect(() => {
        fetchMatches();

        // Subscribe to real-time changes in matches
        const matchesChannel = supabase
            .channel('realtime_matches')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => fetchMatches())
            .subscribe();

        // Subscribe to messages to update unread dots
        const messagesChannel = supabase
            .channel('realtime_messages_dots')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchMatches())
            .subscribe();

        return () => {
            supabase.removeChannel(matchesChannel);
            supabase.removeChannel(messagesChannel);
        };
    }, []);

    const fetchMatches = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return router.push("/signup");

            console.log("Fetching matches for user:", session.user.id);

            // Use column names to disambiguate the join if constraints aren't named exactly as expected
            const { data, error } = await supabase
                .from("matches")
                .select(`
                    id,
                    user_1_id,
                    user_2_id,
                    u1_reveal_approved,
                    u2_reveal_approved,
                    streak_count,
                    created_at,
                    user1:profiles_public!user_1_id (alias, real_name, gender, verification_status),
                    user2:profiles_public!user_2_id (alias, real_name, gender, verification_status),
                    messages (read_at, sender_id)
                `)
                .or(`user_1_id.eq.${session.user.id},user_2_id.eq.${session.user.id}`)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Matches Fetch Error Detail:", error.message, error.details, error.hint);
                setMatches([]);
            } else if (data) {
                console.log("Matches data received:", data.length, "rows");
                const formattedMatches = data.map((match: any) => {
                    const isUser1 = match.user_1_id === session.user.id;
                    const partnerProfile = isUser1 ? match.user2 : match.user1;
                    const partnerId = isUser1 ? match.user_2_id : match.user_1_id;

                    // Mutual Consent Check (Phase 17)
                    const isFullyRevealed = match.u1_reveal_approved && match.u2_reveal_approved;

                    // Unread Check (Phase 18)
                    const hasUnread = (match.messages || []).some((m: any) => m.sender_id !== session.user.id && !m.read_at);

                    return {
                        id: match.id,
                        partnerId,
                        partnerProfile: {
                            ...partnerProfile,
                            // Mask name if not fully revealed
                            display_name: isFullyRevealed ? (partnerProfile.real_name || partnerProfile.alias) : partnerProfile.alias
                        },
                        is_revealed: isFullyRevealed,
                        hasUnread,
                        streak_count: match.streak_count || 0,
                        created_at: match.created_at
                    };
                });
                setMatches(formattedMatches);
            }
        } catch (err) {
            console.error("Critical error in fetchMatches:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-midnight flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

    return (
        <main className="min-h-screen bg-midnight">
            <div className="mobile-container">
                <header className="mb-10 mt-4">
                    <h1 className="text-3xl font-bold text-white mb-2">My Vibes</h1>
                    <p className="text-foreground/50 text-sm">Return to your anonymous conversations</p>
                </header>

                <div className="flex flex-col gap-4">
                    {matches.length === 0 ? (
                        <div className="glass-panel p-12 rounded-3xl text-center flex flex-col items-center border border-white/5">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-foreground/20">
                                <MessageSquare className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">No active chats yet</h2>
                            <p className="text-foreground/40 text-sm mb-8">Head over to Discover to find students who match your vibe.</p>
                            <button
                                onClick={() => router.push("/feed")}
                                className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                            >
                                Start Discovering
                            </button>
                        </div>
                    ) : (
                        matches.map((match, idx) => (
                            <motion.div
                                key={match.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => router.push(`/chat/${match.partnerId}`)}
                                className="glass-panel p-5 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-white/10 active:scale-[0.98] transition-all border border-white/5 group"
                            >
                                <div className="w-14 h-14 rounded-full bg-indigo/30 flex items-center justify-center text-primary border border-white/10 shrink-0">
                                    <MessageSquare className="w-7 h-7" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-white truncate group-hover:text-primary transition-colors">
                                            {match.partnerProfile?.display_name || "Anonymous Student"}
                                        </h3>
                                        {match.partnerProfile?.verification_status === "verified" && (
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                        )}
                                        {match.streak_count > 0 && (
                                            <div className="flex items-center gap-0.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[9px] text-amber-500 font-black animate-pulse">
                                                <Sparkles className="w-2.5 h-2.5 fill-current" /> {match.streak_count}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-foreground/30">
                                        <span>{match.is_revealed ? "Full Identity" : "Anonymous"}</span>
                                        <span className="w-1 h-1 rounded-full bg-white/10" />
                                        <span>Matched {new Date(match.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {match.hasUnread && (
                                        <div className="w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_8px_rgba(109,93,254,0.6)] animate-pulse" />
                                    )}
                                    <ChevronRight className="w-5 h-5 text-foreground/20 group-hover:text-primary transition-colors" />
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </main>
    );
}
