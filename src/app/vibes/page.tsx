"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Loader2, Zap, Send, UserCircle2, MessageSquare, X, Heart, Shield, ShieldCheck, AlertCircle, MessageCircle } from "lucide-react";
import { checkContentSafety } from "@/lib/utils/safety";

const getAvatarColor = (alias: string) => {
    const colors = [
        'bg-pink-500', 'bg-purple-500', 'bg-indigo-500',
        'bg-blue-500', 'bg-cyan-500', 'bg-teal-500',
        'bg-emerald-500', 'bg-amber-500', 'bg-orange-500',
        'bg-rose-500', 'bg-violet-500'
    ];
    let hash = 0;
    for (let i = 0; i < (alias?.length || 0); i++) {
        hash = alias.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

export default function VibesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [vibes, setVibes] = useState<any[]>([]);
    const [newVibe, setNewVibe] = useState("");
    const [session, setSession] = useState<any>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [safetyError, setSafetyError] = useState<string | null>(null);

    const [selectedProfile, setSelectedProfile] = useState<any>(null);
    const [showProfileModal, setShowProfileModal] = useState(false);

    // Interaction states
    const [expandedVibeId, setExpandedVibeId] = useState<string | null>(null);
    const [comments, setComments] = useState<{ [key: string]: any[] }>({});
    const [newComment, setNewComment] = useState("");
    const [isCommenting, setIsCommenting] = useState(false);
    const [userLikes, setUserLikes] = useState<Set<string>>(new Set());

    useEffect(() => {
        initVibes();
    }, []);

    const initVibes = async () => {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);

        await fetchVibes();

        // Realtime subscription for Vibes, Comments, and Likes
        const channel = supabase
            .channel('vibes_realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vibes' }, async (payload) => {
                const { data: profile } = await supabase
                    .from("profiles_public")
                    .select("alias, gender")
                    .eq("id", payload.new.user_id)
                    .single();

                const vibeWithProfile = { ...payload.new, profiles_public: profile, vibe_comments: [{ count: 0 }], vibe_likes: [{ count: 0 }] };
                setVibes(prev => [vibeWithProfile, ...prev]);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vibe_comments' }, async (payload) => {
                const vibeId = payload.new.vibe_id;
                // Update local counts
                setVibes(prev => prev.map(v => 
                    v.id === vibeId 
                        ? { ...v, vibe_comments: [{ count: (v.vibe_comments?.[0]?.count || 0) + 1 }] } 
                        : v
                ));
                // Fetch full comment if this post is currently expanded
                if (expandedVibeId === vibeId) {
                    fetchComments(vibeId);
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vibe_likes' }, async (payload) => {
                setVibes(prev => prev.map(v => 
                    v.id === payload.new.vibe_id 
                        ? { ...v, vibe_likes: [{ count: (v.vibe_likes?.[0]?.count || 0) + 1 }] } 
                        : v
                ));
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'vibe_likes' }, async (payload) => {
                // Note: payload.old for DELETE might only have the id or PKs
                // This is a bit tricky for real-time without specific payload info, 
                // but we can re-fetch or just ignore for unlikes as it's less critical.
                await fetchVibes(); // Safe fallback for unlikes
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    };

    const fetchVibes = async () => {
        try {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            setSession(currentSession);

            // 1. Get blocked IDs (both ways)
            let excludedIds: string[] = [];
            if (currentSession) {
                const [{ data: myBlocks }, { data: blockedMe }] = await Promise.all([
                    supabase.from("blocks").select("blocked_id").eq("blocker_id", currentSession.user.id),
                    supabase.from("blocks").select("blocker_id").eq("blocked_id", currentSession.user.id)
                ]);
                excludedIds = [
                    ...(myBlocks?.map(b => b.blocked_id) || []),
                    ...(blockedMe?.map(b => b.blocker_id) || [])
                ];
            }

            // 2. Fetch vibes (filtered if someone is logged in)
            let query = supabase
                .from("vibes")
                .select(`
                    id,
                    content,
                    created_at,
                    user_id,
                    profiles_public (id, alias, gender, verification_status),
                    vibe_comments (count),
                    vibe_likes (count)
                `)
                .order("created_at", { ascending: false });

            if (excludedIds.length > 0) {
                query = query.not("user_id", "in", `(${excludedIds.join(",")})`);
            }

            const { data, error } = await query;

            if (error) {
                console.error("Vibes Fetch Error (Full):", JSON.stringify(error, null, 2));
                alert(`Database Error: ${error.message || "Table 'vibes' not found. Did you run the SQL?"}`);
            } else {
                setVibes(data || []);
                
                // Fetch my likes if session exists
                if (currentSession) {
                    const { data: myLikes } = await supabase
                        .from("vibe_likes")
                        .select("vibe_id")
                        .eq("user_id", currentSession.user.id);
                    
                    if (myLikes) {
                        setUserLikes(new Set(myLikes.map(l => l.vibe_id)));
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching vibes:", err);
            alert("Failed to load vibes. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleShareVibe = async (e: React.FormEvent) => {
        e.preventDefault();
        setSafetyError(null);
        if (!newVibe.trim() || !session) return;

        // AUTOMATED SAFETY FILTER (Phase 15)
        const safetyResult = checkContentSafety(newVibe);
        if (safetyResult.isHarmful) {
            setSafetyError(`Vibe Blocked: Inappropriate language detected (Substances/Violence).`);
            setNewVibe("");
            return;
        }

        setIsSharing(true);
        const { error } = await supabase.from("vibes").insert({
            user_id: session.user.id,
            content: newVibe
        });

        if (error) {
            alert("Failed to share vibe. Try again.");
        } else {
            setNewVibe("");
        }
        setIsSharing(false);
    };

    const viewProfile = async (userId: string) => {
        setLoading(true);
        const { data: profile } = await supabase
            .from("profiles_public")
            .select("*")
            .eq("id", userId)
            .single();

        if (profile) {
            setSelectedProfile(profile);
            setShowProfileModal(true);
        }
        setLoading(false);
    };

    const fetchComments = async (vibeId: string) => {
        const { data, error } = await supabase
            .from("vibe_comments")
            .select(`
                id,
                content,
                created_at,
                user_id,
                profiles_public (alias, gender)
            `)
            .eq("vibe_id", vibeId)
            .order("created_at", { ascending: true });

        if (!error) {
            setComments(prev => ({ ...prev, [vibeId]: data || [] }));
        }
    };

    const toggleComments = (vibeId: string) => {
        if (expandedVibeId === vibeId) {
            setExpandedVibeId(null);
        } else {
            setExpandedVibeId(vibeId);
            if (!comments[vibeId]) {
                fetchComments(vibeId);
            }
        }
    };

    const toggleLike = async (vibeId: string) => {
        if (!session) return router.push("/login");

        const isLiked = userLikes.has(vibeId);
        
        // Optimistic UI update
        const newLikes = new Set(userLikes);
        if (isLiked) newLikes.delete(vibeId);
        else newLikes.add(vibeId);
        setUserLikes(newLikes);

        setVibes(prev => prev.map(v => 
            v.id === vibeId 
                ? { ...v, vibe_likes: [{ count: (v.vibe_likes?.[0]?.count || 0) + (isLiked ? -1 : 1) }] } 
                : v
        ));

        if (isLiked) {
            await supabase.from("vibe_likes").delete().eq("vibe_id", vibeId).eq("user_id", session.user.id);
        } else {
            await supabase.from("vibe_likes").insert({ vibe_id: vibeId, user_id: session.user.id });
        }
    };

    const handlePostComment = async (vibeId: string) => {
        if (!newComment.trim() || !session) return;

        // AUTOMATED SAFETY FILTER (Phase 15 - Applied to Comments)
        const safetyResult = checkContentSafety(newComment);
        if (safetyResult.isHarmful) {
            alert(`Comment Blocked: Inappropriate language detected.`);
            setNewComment("");
            return;
        }

        setIsCommenting(true);
        const { error } = await supabase.from("vibe_comments").insert({
            vibe_id: vibeId,
            user_id: session.user.id,
            content: newComment
        });

        if (!error) {
            setNewComment("");
            fetchComments(vibeId); // Refresh comments
            
            // Increment local count
            setVibes(prev => prev.map(v => 
                v.id === vibeId 
                    ? { ...v, vibe_comments: [{ count: (v.vibe_comments?.[0]?.count || 0) + 1 }] } 
                    : v
            ));
        } else {
            alert("Failed to post comment.");
        }
        setIsCommenting(false);
    };

    const connectWithUser = async (targetUserId: string) => {
        if (!session) return router.push("/login");
        if (session.user.id === targetUserId) return alert("You can't vibe with yourself!");

        // Check for existing match
        const { data: existingMatch } = await supabase
            .from("matches")
            .select("id")
            .or(`and(user_1_id.eq.${session.user.id},user_2_id.eq.${targetUserId}),and(user_1_id.eq.${targetUserId},user_2_id.eq.${session.user.id})`)
            .maybeSingle();

        if (existingMatch) {
            router.push(`/chat/${targetUserId}`);
        } else {
            // Create a new match record
            const { error } = await supabase.from("matches").insert({
                user_1_id: session.user.id,
                user_2_id: targetUserId,
                is_revealed: false
            });

            if (error) alert("Error connecting. Try again.");
            else router.push(`/chat/${targetUserId}`);
        }
    };

    if (loading && vibes.length === 0) return <div className="min-h-screen bg-midnight flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

    return (
        <main className="min-h-screen bg-midnight">
            <div className="mobile-container">

                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Zap className="w-8 h-8 text-primary fill-primary" />
                        Campus Vibes
                    </h1>
                    <p className="text-foreground/50 text-sm italic">"What's happening at SSIM right now?"</p>
                </header>

                {/* Share Vibe Component */}
                <div className="glass-panel p-6 rounded-[2.5rem] mb-12 border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <Zap className="w-12 h-12 text-primary" />
                    </div>

                    <AnimatePresence>
                        {safetyError && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-100 text-[10px] font-bold uppercase tracking-widest"
                            >
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                <span>{safetyError}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <textarea
                        value={newVibe}
                        onChange={(e) => {
                            setNewVibe(e.target.value);
                            if (safetyError) setSafetyError(null);
                        }}
                        placeholder="What's your campus vibe today?"
                        className="w-full bg-transparent border-none focus:ring-0 text-lg md:text-xl text-white placeholder:text-foreground/20 resize-none min-h-[120px] mb-4 font-medium"
                        maxLength={280}
                    />
                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                        <span className={`text-[10px] font-bold tracking-widest uppercase ${newVibe.length > 250 ? "text-amber-400" : "text-foreground/20"}`}>
                            {newVibe.length} / 280
                        </span>
                        <button
                            onClick={handleShareVibe}
                            disabled={isSharing || !newVibe.trim()}
                            className="px-8 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Share Vibe"}
                        </button>
                    </div>
                </div>

                {/* Vibes List */}
                <div className="space-y-6">
                    {vibes.map((vibe, idx) => (
                        <motion.div
                            key={vibe.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="glass-panel p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo/30 flex items-center justify-center text-primary border border-white/5">
                                        <Zap className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-white text-base">{vibe.profiles_public?.alias}</h3>
                                            {vibe.profiles_public?.verification_status === 'verified' && (
                                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                            )}
                                        </div>
                                        <p className="text-[10px] text-foreground/30 uppercase tracking-[0.2em] font-bold mt-0.5">
                                            {vibe.profiles_public?.gender} • {new Date(vibe.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <p className="text-foreground/80 text-lg leading-relaxed mb-8 font-medium italic">
                                "{vibe.content}"
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => viewProfile(vibe.user_id)}
                                    className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/5 transition-all active:scale-95"
                                >
                                    Profile
                                </button>
                                <button
                                    onClick={() => toggleLike(vibe.id)}
                                    className={`w-14 py-3.5 rounded-2xl font-bold text-xs border transition-all active:scale-95 flex items-center justify-center gap-1 ${userLikes.has(vibe.id) ? 'bg-orange-500/20 border-orange-500/50 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'bg-white/5 border-white/5 text-foreground/40 hover:bg-white/10'}`}
                                >
                                    <motion.div
                                        animate={userLikes.has(vibe.id) ? { scale: [1, 1.4, 1], rotate: [0, -10, 10, 0] } : {}}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Zap className={`w-4 h-4 ${userLikes.has(vibe.id) ? 'fill-orange-500' : ''}`} />
                                    </motion.div>
                                    <span className="text-[10px]">{vibe.vibe_likes?.[0]?.count || 0}</span>
                                </button>
                                <button
                                    onClick={() => toggleComments(vibe.id)}
                                    className={`flex-1 py-3.5 rounded-2xl font-bold text-xs border transition-all active:scale-95 flex items-center justify-center gap-2 ${expandedVibeId === vibe.id ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/5 text-white hover:bg-white/10'}`}
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    {vibe.vibe_comments?.[0]?.count || 0}
                                </button>
                                <button
                                    onClick={() => connectWithUser(vibe.user_id)}
                                    className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    Connect
                                </button>
                            </div>

                            {/* Comments Section */}
                            <AnimatePresence>
                                {expandedVibeId === vibe.id && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-6 pt-6 border-t border-white/5"
                                    >
                                        <div className="flex items-center gap-2 mb-4">
                                            <MessageCircle className="w-4 h-4 text-primary" />
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Discussion</h4>
                                        </div>

                                        <div className="space-y-3 max-h-[350px] overflow-y-auto mb-6 pr-2 scrollbar-hide py-1">
                                            {comments[vibe.id]?.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-8 opacity-20">
                                                    <MessageSquare className="w-8 h-8 mb-2" />
                                                    <p className="text-[10px] font-bold uppercase tracking-widest">Silence is golden...</p>
                                                </div>
                                            ) : (
                                                comments[vibe.id]?.map((comment, cidx) => (
                                                    <motion.div
                                                        key={comment.id}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: cidx * 0.05 }}
                                                        className="group/comment relative"
                                                    >
                                                        <div className="flex gap-3">
                                                            <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white shadow-lg ${getAvatarColor(comment.profiles_public?.alias)}`}>
                                                                {comment.profiles_public?.alias?.[0]?.toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="bg-white/[0.03] group-hover/comment:bg-white/[0.05] p-3 rounded-2xl rounded-tl-none border border-white/5 transition-colors">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[11px] font-bold text-white/90">{comment.profiles_public?.alias}</span>
                                                                            {comment.user_id === vibe.user_id && (
                                                                                <span className="px-1.5 py-0.5 rounded-md bg-primary/20 text-primary text-[8px] font-black uppercase tracking-tighter">Author</span>
                                                                            )}
                                                                        </div>
                                                                        <span className="text-[8px] text-foreground/20 font-medium">{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    </div>
                                                                    <p className="text-xs text-foreground/70 leading-relaxed break-words">{comment.content}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))
                                            )}
                                        </div>

                                        <div className="relative group/input">
                                            <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity" />
                                            <input
                                                type="text"
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                placeholder="Say something nice..."
                                                className="relative w-full bg-midnight/80 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-foreground/20 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none pr-14 shadow-2xl shadow-black/20"
                                                onKeyDown={(e) => e.key === 'Enter' && handlePostComment(vibe.id)}
                                            />
                                            <button
                                                onClick={() => handlePostComment(vibe.id)}
                                                disabled={isCommenting || !newComment.trim()}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white hover:scale-105 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-primary/20"
                                            >
                                                {isCommenting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Profile Modal Overlay */}
            <AnimatePresence>
                {showProfileModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowProfileModal(false)}
                            className="absolute inset-0 bg-midnight/95 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-sm glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 right-0 h-2 bg-primary" />

                            <button
                                onClick={() => setShowProfileModal(false)}
                                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition"
                            >
                                <X className="w-5 h-5 text-foreground/40" />
                            </button>

                            <div className="flex flex-col items-center mb-8">
                                <div className="w-24 h-24 rounded-full bg-indigo/30 flex items-center justify-center text-primary mb-4 border-2 border-primary/20 shadow-lg shadow-primary/10">
                                    <UserCircle2 className="w-16 h-16" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-1">{selectedProfile?.alias}</h3>
                                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-foreground/40">
                                    <span>{selectedProfile?.gender}</span>
                                    <span className="w-1 h-1 rounded-full bg-white/10" />
                                    {selectedProfile?.verification_status === "verified" ? (
                                        <span className="flex items-center gap-1 text-emerald-400">
                                            <ShieldCheck className="w-2.5 h-2.5" />
                                            Verified Student
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-amber-500">
                                            Verification Pending
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6 mb-10">
                                <div>
                                    <h4 className="text-[10px] uppercase font-bold text-primary tracking-widest mb-2">Anonymous Bio</h4>
                                    <p className="text-sm italic leading-relaxed text-foreground/80">
                                        "{selectedProfile?.bio || "No bio yet..."}"
                                    </p>
                                </div>
                                {selectedProfile?.vibe_scores?.q1 && (
                                    <div>
                                        <h4 className="text-[10px] uppercase font-bold text-primary tracking-widest mb-2">Ideal Connection</h4>
                                        <p className="text-sm text-foreground/80 leading-relaxed">
                                            Looking for: <strong>{selectedProfile.vibe_scores.q1}</strong>
                                        </p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    setShowProfileModal(false);
                                    connectWithUser(selectedProfile?.id);
                                }}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20"
                            >
                                <MessageSquare className="w-5 h-5" />
                                Initiate Vibe
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </main>
    );
}
