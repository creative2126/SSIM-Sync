"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Send, LockOpen, ArrowLeft, Shield, RefreshCw, ShieldCheck, ChevronRight, AlertCircle, XCircle, UserCheck, Info, Check, CheckCheck, Sparkles } from "lucide-react";

import { checkContentSafety } from "@/lib/utils/safety";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    const router = useRouter();

    const [session, setSession] = useState<any>(null);
    const [myProfile, setMyProfile] = useState<any>(null);
    const [matchData, setMatchData] = useState<any>(null);
    const [otherProfile, setOtherProfile] = useState<any>(null);
    const [syncStatus, setSyncStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [blocking, setBlocking] = useState(false);
    const [safetyError, setSafetyError] = useState<string | null>(null);
    const [showRevealModal, setShowRevealModal] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Determine current user position (u1 or u2)
    const isU1 = session?.user.id === matchData?.user_1_id;
    const myRevealStatus = isU1 ? matchData?.u1_reveal_approved : matchData?.u2_reveal_approved;
    const otherRevealStatus = isU1 ? matchData?.u2_reveal_approved : matchData?.u1_reveal_approved;
    const isFullyRevealed = matchData?.u1_reveal_approved && matchData?.u2_reveal_approved;

    useEffect(() => {
        let chatChannel: any;
        let matchChannel: any;
        let pollInterval: any;

        const setup = async () => {
            const match = await initChat();
            if (match) {
                // Messages Subscription
                chatChannel = supabase
                    .channel(`chat_${match.id}`)
                    .on('postgres_changes', {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages',
                        filter: `match_id=eq.${match.id}`
                    }, (payload) => {
                        // If it's a message from the other person, mark it as read immediately
                        if (payload.new.sender_id !== session?.user.id) {
                            markAsRead(match.id);
                        }

                        setMessages((prev) => {
                            if (prev.some(m => m.id === payload.new.id)) return prev;
                            return [...prev, payload.new];
                        });
                    })
                    .on('postgres_changes', {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'messages',
                        filter: `match_id=eq.${match.id}`
                    }, (payload) => {
                        // Update the message in state (especially for read_at changes)
                        setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m));
                    })
                    .subscribe();

                // Match Status Subscription (For Reveal Requests)
                matchChannel = supabase
                    .channel(`match_status_${match.id}`)
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${match.id}` },
                        (payload) => {
                            console.log("Match updated (Reveal sync):", payload.new);
                            setMatchData(payload.new);
                        }
                    ).subscribe();

                // Mark as read initially
                markAsRead(match.id);

                pollInterval = setInterval(async () => {
                    const { data: latest } = await supabase.from("messages").select("*").eq("match_id", match.id).order("created_at", { ascending: false }).limit(20);
                    if (latest) {
                        setMessages(prev => {
                            const currentIds = new Set(prev.map(m => m.id));
                            const hasNewOtherMsg = latest.some(m => !currentIds.has(m.id) && m.sender_id !== session?.user.id);
                            if (hasNewOtherMsg) markAsRead(match.id);

                            const newMsgs = latest.filter(m => !currentIds.has(m.id)).reverse();
                            return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev;
                        });
                    }
                }, 5000);
            }
        };

        setup();

        return () => {
            if (chatChannel) supabase.removeChannel(chatChannel);
            if (matchChannel) supabase.removeChannel(matchChannel);
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [id, session?.user.id]); // Re-run if session changes to re-calc isU1

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const initChat = async () => {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession) {
            router.push("/login");
            return null;
        }
        setSession(currentSession);

        const { data: me } = await supabase.from("profiles_public").select("*").eq("id", currentSession.user.id).single();
        setMyProfile(me);

        const { data: currentMatch } = await supabase
            .from("matches")
            .select("*")
            .or(`and(user_1_id.eq.${currentSession.user.id},user_2_id.eq.${id}),and(user_1_id.eq.${id},user_2_id.eq.${currentSession.user.id})`)
            .single();

        if (!currentMatch) {
            router.push("/matches");
            return null;
        }
        setMatchData(currentMatch);

        // Fetch other profile (if fully revealed, we might want to fetch real photo later)
        const { data: other } = await supabase.from("profiles_public").select("*").eq("id", id).single();
        setOtherProfile(other);

        const { data: previousMsgs } = await supabase.from("messages").select("*").eq("match_id", currentMatch.id).order("created_at", { ascending: true });
        if (previousMsgs) setMessages(previousMsgs);
        setLoading(false);
        return currentMatch;
    };

    const markAsRead = async (matchId: string) => {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession) return;

        await supabase
            .from("messages")
            .update({ read_at: new Date().toISOString() })
            .eq("match_id", matchId)
            .neq("sender_id", currentSession.user.id)
            .is("read_at", null);
    };

    const blockUser = async () => {
        if (!window.confirm(`Are you sure you want to block this student? This will delete the match and you won't see them again.`)) return;
        setBlocking(true);
        try {
            await supabase.from("matches").delete().eq("id", matchData.id);
            await supabase.from("blocks").insert({ blocker_id: session.user.id, blocked_id: id });
            router.push("/matches");
        } catch (err) {
            alert("Failed to block user.");
            setBlocking(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        setSafetyError(null);
        if (!newMessage.trim() || !session || !matchData) return;

        const safetyResult = checkContentSafety(newMessage);
        if (safetyResult.isHarmful) {
            setSafetyError(`Inappropriate Content detected. Message not delivered.`);
            setNewMessage("");
            return;
        }

        const msg = newMessage;
        setNewMessage("");
        const tempId = "temp-" + Date.now();
        const optimisticMsg = { id: tempId, match_id: matchData.id, sender_id: session.user.id, content: msg, created_at: new Date().toISOString() };
        setMessages(prev => [...prev, optimisticMsg]);

        const { error, data } = await supabase.from("messages").insert({ match_id: matchData.id, sender_id: session.user.id, content: msg }).select().single();
        if (error) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setNewMessage(msg);
        } else if (data) {
            setMessages(prev => prev.map(m => m.id === tempId ? data : m));

            // Streak & Last Message Logic
            const now = new Date();
            const lastMsgAt = matchData.last_message_at ? new Date(matchData.last_message_at) : null;
            let newStreak = matchData.streak_count || 0;

            if (!lastMsgAt) {
                newStreak = 1;
            } else {
                const diffHours = (now.getTime() - lastMsgAt.getTime()) / (1000 * 60 * 60);
                if (diffHours >= 18 && diffHours <= 48) { // 18-48 hours gap for daily streak
                    newStreak += 1;
                } else if (diffHours > 48) {
                    newStreak = 1; // Reset if too long
                }
            }

            await supabase
                .from("matches")
                .update({
                    last_message_at: now.toISOString(),
                    streak_count: newStreak
                })
                .eq("id", matchData.id);

            setMatchData((prev: any) => ({ ...prev, streak_count: newStreak, last_message_at: now.toISOString() }));
        }
    };

    const approveReveal = async () => {
        setLoading(true);
        const updateObj = isU1 ? { u1_reveal_approved: true } : { u2_reveal_approved: true };

        await supabase.from("matches").update(updateObj).eq("id", matchData.id);

        // Refresh local data
        const { data: updated } = await supabase.from("matches").select("*").eq("id", matchData.id).single();
        setMatchData(updated);
        setShowRevealModal(false);
        setLoading(false);
    };

    if (loading && !matchData) return <div className="min-h-screen bg-midnight flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

    return (
        <main className="fixed inset-0 bg-midnight flex flex-col z-[150]">

            {/* Reveal Consent Modal */}
            <AnimatePresence>
                {showRevealModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowRevealModal(false)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm glass-panel p-8 rounded-[2.5rem] border border-white/10 text-center shadow-[0_0_50px_rgba(109,93,254,0.3)]">
                            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 border border-primary/30">
                                <LockOpen className="w-10 h-10 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-4">Loss of Anonymity</h2>
                            <p className="text-foreground/60 text-sm leading-relaxed mb-8">
                                Once you reveal, this student will see your **real name** and **public photo**. You cannot hide your identity again in this chat.
                                <br /><br />
                                <strong className="text-white">Do you wish to proceed?</strong>
                            </p>
                            <div className="flex flex-col gap-3">
                                <button onClick={approveReveal} className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                                    Yes, Reveal Myself
                                </button>
                                <button onClick={() => setShowRevealModal(false)} className="w-full py-4 bg-white/5 text-foreground/40 rounded-2xl font-bold">
                                    Stay Anonymous
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="px-6 pb-4 pt-[calc(env(safe-area-inset-top,1rem)+1rem)] flex items-center justify-between bg-midnight/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push("/matches")} className="p-2 hover:bg-white/10 rounded-full transition text-foreground/50">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-white text-base leading-none flex items-center gap-2">
                                {isFullyRevealed ? (otherProfile?.real_name || otherProfile?.alias) : otherProfile?.alias}
                                {matchData.streak_count > 0 && (
                                    <span className="flex items-center gap-0.5 text-[10px] text-amber-500 font-black animate-pulse">
                                        <Sparkles className="w-3 h-3 fill-current" /> {matchData.streak_count}
                                    </span>
                                )}
                            </h2>
                            {otherProfile?.verification_status === 'verified' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
                            <span className="text-[9px] text-foreground/40 uppercase tracking-widest font-bold">
                                {isFullyRevealed ? "Identity Unlocked" : "Anonymous Connection"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={blockUser} disabled={blocking} className="p-2 text-red-500/50 hover:text-red-500 transition-colors disabled:opacity-50">
                        {blocking ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                    </button>
                    {!isFullyRevealed && (
                        <button
                            onClick={() => !myRevealStatus && setShowRevealModal(true)}
                            disabled={myRevealStatus}
                            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${myRevealStatus
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-primary text-white shadow-lg shadow-primary/20"
                                }`}
                        >
                            {myRevealStatus ? "Requested" : "Reveal"}
                        </button>
                    )}
                </div>
            </header>

            {/* Incoming Reveal Request Banner */}
            <AnimatePresence>
                {otherRevealStatus && !myRevealStatus && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-primary/10 border-b border-primary/20 p-4 overflow-hidden">
                        <div className="flex items-center justify-between max-w-xl mx-auto">
                            <div className="flex items-center gap-3">
                                <Info className="w-5 h-5 text-primary" />
                                <span className="text-xs font-bold text-white">Stranger wants to reveal! Shall we?</span>
                            </div>
                            <button onClick={() => setShowRevealModal(true)} className="px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest">
                                View Request
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 pb-12">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-8">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel p-8 rounded-3xl border border-primary/20 bg-primary/5 max-w-xs">
                            <Sparkles className="w-8 h-8 text-primary mb-4 mx-auto" />
                            <h3 className="text-sm font-bold mb-2 uppercase tracking-widest text-primary">Vibe Starter</h3>
                            <p className="text-xs text-foreground/60 leading-relaxed mb-6 italic italic text-center">
                                {(() => {
                                    const vibes = Object.values(otherProfile?.vibe_scores || {});
                                    const randomVibe = vibes[Math.floor(Math.random() * vibes.length)];
                                    return `Both of you love "${randomVibe}". Ask ${otherProfile?.alias} what's the best part about it!`;
                                })()}
                            </p>
                            <button
                                onClick={() => {
                                    const vibes = Object.values(otherProfile?.vibe_scores || {});
                                    const randomVibe = vibes[Math.floor(Math.random() * vibes.length)];
                                    setNewMessage(`Hey! I noticed we both vibe with "${randomVibe}". What's your take on it?`);
                                }}
                                className="w-full py-3 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:scale-105 transition-transform"
                            >
                                Use Starter
                            </button>
                        </motion.div>
                        <p className="text-[9px] text-foreground/20 mt-8 uppercase tracking-widest font-bold">Secure, anonymous connection.</p>
                    </div>
                ) : (
                    (() => {
                        const renderedMessages: React.ReactNode[] = [];
                        let lastDateStr = "";

                        messages.forEach((m, idx) => {
                            const isMe = m.sender_id === session?.user.id;
                            const prevMsg = messages[idx - 1];
                            const nextMsg = messages[idx + 1];

                            const isSameSenderAsPrev = prevMsg?.sender_id === m.sender_id;
                            const isSameSenderAsNext = nextMsg?.sender_id === m.sender_id;

                            // Date Grouping
                            const msgDate = new Date(m.created_at);
                            const dateStr = msgDate.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' });
                            const todayStr = new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' });

                            if (dateStr !== lastDateStr) {
                                renderedMessages.push(
                                    <div key={`date-${dateStr}`} className="flex justify-center my-8">
                                        <span className="px-4 py-1.5 rounded-full bg-white/5 text-[10px] font-bold uppercase tracking-widest text-foreground/30 border border-white/5">
                                            {dateStr === todayStr ? "Today" : dateStr}
                                        </span>
                                    </div>
                                );
                                lastDateStr = dateStr;
                            }

                            // Bubble Rounding Logic
                            let borderRadius = "20px";
                            if (isMe) {
                                const br = isSameSenderAsNext ? "4px" : "20px";
                                const tr = isSameSenderAsPrev ? "4px" : "20px";
                                borderRadius = `20px ${tr} ${br} 20px`;
                            } else {
                                const bl = isSameSenderAsNext ? "4px" : "20px";
                                const tl = isSameSenderAsPrev ? "4px" : "20px";
                                borderRadius = `${tl} 20px 20px ${bl}`;
                            }

                            renderedMessages.push(
                                <motion.div
                                    key={m.id || idx}
                                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${isSameSenderAsNext ? "mb-1" : "mb-4"}`}
                                >
                                    <div
                                        style={{ borderRadius }}
                                        className={`px-5 py-3 max-w-[85%] text-sm font-medium transition-all ${isMe ? "bg-primary text-white shadow-lg shadow-primary/10" : "bg-white/5 text-foreground/90 border border-white/5"}`}
                                    >
                                        {m.content}
                                    </div>

                                    {/* Show "Seen" only for the last 'me' message if it's actually seen */}
                                    {isMe && !isSameSenderAsNext && m.read_at && idx === messages.length - 1 && (
                                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[9px] text-primary font-bold uppercase tracking-tighter mt-1 px-1">
                                            Seen
                                        </motion.span>
                                    )}

                                    {/* Show time only if there's a gap or it's the last in a group */}
                                    {!isSameSenderAsNext && !m.read_at && (
                                        <span className="text-[9px] text-foreground/20 mt-1 px-1">
                                            {msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </motion.div>
                            );
                        });

                        return renderedMessages;
                    })()
                )}
            </div>

            {/* Input area */}
            <div className="p-4 bg-midnight/90 backdrop-blur-xl border-t border-white/5 pb-[calc(env(safe-area-inset-bottom,1.5rem)+1rem)] relative">
                <AnimatePresence>
                    {safetyError && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-4 right-4 mb-4 p-4 bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-100 text-xs font-bold shadow-2xl">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                            <span>{safetyError}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleSendMessage} className="max-w-xl mx-auto flex gap-3">
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/50 text-white placeholder:text-white/20 transition-all font-medium" />
                    <button type="submit" disabled={!newMessage.trim()} className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 disabled:opacity-50">
                        <Send className="w-6 h-6 ml-0.5" />
                    </button>
                </form>
            </div>
        </main>
    );
}
