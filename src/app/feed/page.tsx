"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Heart, X, MessageCircleHeart, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import StoryBar from "@/components/StoryBar";

export default function FeedPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [matchModal, setMatchModal] = useState<any>(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [selectedProfileStories, setSelectedProfileStories] = useState<any[]>([]);
    const [initiationsToday, setInitiationsToday] = useState(0);
    const [timeLeft, setTimeLeft] = useState("");
    useEffect(() => {
        fetchFeed();
        fetchInteractionCount();

        const timer = setInterval(() => {
            updateCountdown();
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const updateCountdown = () => {
        const now = new Date();
        const nextHour = (Math.floor(now.getHours() / 6) + 1) * 6;
        const nextRefill = new Date(now).setHours(nextHour, 0, 0, 0);
        const diff = nextRefill - now.getTime();

        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        setTimeLeft(`${h}h ${m}m ${s}s`);
        if (diff <= 1000) fetchInteractionCount();
    };

    const fetchInteractionCount = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const now = new Date();
        const windowStartHour = Math.floor(now.getHours() / 6) * 6;
        const windowStart = new Date(now).setHours(windowStartHour, 0, 0, 0);

        const { count } = await supabase
            .from("matches")
            .select("*", { count: "exact", head: true })
            .eq("user_1_id", session.user.id)
            .gte("created_at", new Date(windowStart).toISOString());

        setInitiationsToday(count || 0);
    };

    const fetchFeed = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/signup");
                return;
            }

            // 1. Get current user's public profile for gender and vibe_scores
            const { data: myProfile } = await supabase
                .from("profiles_public")
                .select("*")
                .eq("id", session.user.id)
                .single();

            if (!myProfile) return;
            setCurrentUser(myProfile);

            // 2. Strict Heterosexual matching filter
            const targetGender = myProfile.gender === "Male" ? "Female" : "Male";

            // 3. Get existing matches AND blocks to exclude
            const [{ data: existingMatches }, { data: myBlocks }, { data: blockedMe }] = await Promise.all([
                supabase.from("matches").select("user_1_id, user_2_id").or(`user_1_id.eq.${session.user.id},user_2_id.eq.${session.user.id}`),
                supabase.from("blocks").select("blocked_id").eq("blocker_id", session.user.id),
                supabase.from("blocks").select("blocker_id").eq("blocked_id", session.user.id)
            ]);

            const excludedIds = new Set<string>();
            excludedIds.add(session.user.id);

            existingMatches?.forEach(m => {
                excludedIds.add(m.user_1_id);
                excludedIds.add(m.user_2_id);
            });
            myBlocks?.forEach(b => excludedIds.add(b.blocked_id));
            blockedMe?.forEach(b => excludedIds.add(b.blocker_id));

            const { data: potentialMatches } = await supabase
                .from("profiles_public")
                .select("id, alias, gender, verification_status, vibe_scores, bio")
                .eq("gender", targetGender)
                .not("id", "in", `(${Array.from(excludedIds).join(",")})`);

            if (potentialMatches) {
                const scoredMatches = potentialMatches.map((p) => {
                    let score = 50;
                    const myVibes = myProfile.vibe_scores || {};
                    const theirVibes = p.vibe_scores || {};

                    Object.keys(myVibes).forEach(qId => {
                        if (myVibes[qId] === theirVibes[qId]) score += 12;
                    });

                    return { ...p, compatibility: Math.min(score, 99) };
                });

                scoredMatches.sort((a, b) => b.compatibility - a.compatibility);
                setProfiles(scoredMatches);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProfileStories = async (userId: string) => {
        const { data, error } = await supabase
            .from("stories")
            .select("*")
            .eq("user_id", userId)
            .gte("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false });

        if (!error && data) {
            setSelectedProfileStories(data);
        } else {
            setSelectedProfileStories([]);
        }
    };

    const handleMatch = (userId: string) => handleAction("like");
    const skipProfile = () => handleAction("pass");
    const handleAction = async (action: "like" | "pass") => {
        if (currentIndex >= profiles.length) return;

        if (action === "like") {
            if (initiationsToday >= 3) {
                alert("Daily limit reached! You can initiate 3 anonymous chats per day.");
                return;
            }

            const targetProfile = profiles[currentIndex];
            const { error } = await supabase
                .from("matches")
                .insert({
                    user_1_id: currentUser.id,
                    user_2_id: targetProfile.id,
                    is_revealed: false
                });

            if (!error) {
                setMatchModal(targetProfile);
                setInitiationsToday(prev => prev + 1);
            }
        }

        setCurrentIndex(prev => prev + 1);
    };

    if (loading) return <div className="min-h-screen bg-midnight flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

    return (
        <main className="min-h-screen bg-midnight relative flex flex-col items-center py-6 overflow-hidden px-4">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo/20 to-midnight pointer-events-none" />
            <div className="mobile-container relative z-10 flex flex-col flex-1 h-full">
                <header className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold tracking-tight">Discover</h1>
                    <div className="flex flex-col items-end">
                        <div className="flex gap-1">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`w-2 h-2 rounded-full ${i <= (3 - initiationsToday) ? "bg-primary shadow-[0_0_8px_rgba(109,93,254,0.6)]" : "bg-white/10"}`} />
                            ))}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 mt-1">
                            {3 - initiationsToday} vibes left • Refill in {timeLeft}
                        </span>
                    </div>
                </header>

                {/* Campus Stories */}
                <StoryBar />

                <div className="relative flex-1 min-h-[400px]">
                    <AnimatePresence mode="popLayout">
                        {currentIndex < profiles.length ? (
                            <motion.div
                                key={profiles[currentIndex].id}
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, x: 200, rotate: 20, transition: { duration: 0.3 } }}
                                className="absolute inset-0 glass-panel rounded-3xl p-8 flex flex-col shadow-2xl border border-white/5"
                            >
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <h2 className="text-3xl font-bold text-white">{profiles[currentIndex].alias}</h2>
                                            {profiles[currentIndex].verification_status === "verified" && (
                                                <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] text-emerald-400 font-bold uppercase tracking-wider mt-1">
                                                    <ShieldCheck className="w-3 h-3" />
                                                    Verified
                                                </div>
                                            )}
                                        </div>
                                        <span className="px-4 py-1.5 rounded-full bg-indigo/50 border border-white/5 text-[10px] uppercase font-bold tracking-widest text-foreground/50">
                                            {profiles[currentIndex].gender} Profile
                                        </span>
                                    </div>
                                    <div className="relative flex flex-col items-center gap-2">
                                        <div className="relative flex items-center justify-center">
                                            <svg className="w-16 h-16 transform -rotate-90">
                                                <circle cx="32" cy="32" r="28" className="stroke-white/5 fill-none" strokeWidth="4" />
                                                <circle
                                                    cx="32" cy="32" r="28"
                                                    className="stroke-primary fill-none transition-all duration-1000"
                                                    strokeWidth="4"
                                                    strokeLinecap="round"
                                                    strokeDasharray={175}
                                                    strokeDashoffset={175 - (175 * profiles[currentIndex].compatibility) / 100}
                                                />
                                            </svg>
                                            <span className="absolute font-bold text-sm text-primary">{profiles[currentIndex].compatibility}%</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setShowProfileModal(true);
                                                fetchProfileStories(profiles[currentIndex].id);
                                            }}
                                            className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] font-bold uppercase tracking-widest text-foreground/50 transition-colors"
                                        >
                                            View Profile
                                        </button>
                                    </div>
                                </div>

                                {profiles[currentIndex].bio && (
                                    <blockquote className="mb-8 p-6 rounded-2xl bg-white/5 border-l-4 border-primary/50 relative">
                                        <p className="text-foreground/90 text-lg leading-relaxed italic">"{profiles[currentIndex].bio}"</p>
                                    </blockquote>
                                )}

                                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
                                    <div className="flex items-center justify-between mb-1 text-center">
                                        <div className="flex-1 h-[1px] bg-white/10" />
                                        <p className="px-4 text-[10px] text-foreground/30 font-bold uppercase tracking-[0.2em]">Vibe Highlights</p>
                                        <div className="flex-1 h-[1px] bg-white/10" />
                                    </div>

                                    <motion.div
                                        variants={{
                                            hidden: { opacity: 0 },
                                            show: {
                                                opacity: 1,
                                                transition: { staggerChildren: 0.1 }
                                            }
                                        }}
                                        initial="hidden"
                                        animate="show"
                                        className="flex flex-wrap gap-2.5"
                                    >
                                        {Object.entries(profiles[currentIndex].vibe_scores || {}).map(([key, val]: any) => {
                                            const isSame = currentUser?.vibe_scores?.[key] === val;
                                            const vibeIcons: any = {
                                                social: "🍹", intellect: "🧠", chill: "🧘",
                                                study: "📚", random: "🎲", "deep talk": "🧘"
                                            };
                                            const icon = vibeIcons[key.toLowerCase()] || "✨";

                                            return (
                                                <motion.div
                                                    key={key}
                                                    variants={{
                                                        hidden: { scale: 0.8, opacity: 0 },
                                                        show: { scale: 1, opacity: 1 }
                                                    }}
                                                    className={`px-4 py-2.5 rounded-full border flex items-center gap-2 transition-all cursor-default ${isSame
                                                        ? "bg-primary/20 border-primary/40 text-white shadow-[0_0_20px_rgba(109,93,254,0.15)] ring-1 ring-primary/30"
                                                        : "bg-white/5 border-white/10 text-foreground/50 opacity-70 hover:opacity-100"
                                                        }`}
                                                >
                                                    <span className="text-lg leading-none">{icon}</span>
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black uppercase tracking-[0.15em] leading-none mb-0.5 opacity-50">{key}</span>
                                                        <span className="text-[11px] font-bold leading-none">{val}</span>
                                                    </div>
                                                    {isSame && (
                                                        <div className="ml-1 w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(109,93,254,1)]" />
                                                    )}
                                                </motion.div>
                                            );
                                        })}
                                    </motion.div>

                                    {/* Match Summary */}
                                    {(() => {
                                        const mutuals = Object.entries(profiles[currentIndex].vibe_scores || {})
                                            .filter(([k, v]) => currentUser?.vibe_scores?.[k] === v);

                                        if (mutuals.length < 2) return null;

                                        return (
                                            <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/20 to-transparent border-l-4 border-primary mt-2">
                                                <p className="text-xs font-medium text-white/90 italic">
                                                    "You both love <span className="text-primary font-bold">{String(mutuals[0][1])}</span> & <span className="text-primary font-bold">{String(mutuals[1][1])}</span>! 🔥"
                                                </p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </motion.div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground/50 text-center px-12">
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    className="w-24 h-24 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center mb-6"
                                >
                                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                </motion.div>
                                <h2 className="text-xl font-bold text-white mb-2">Scanning Campus</h2>
                                <p className="text-sm leading-relaxed">No more profiles in your vibe-sphere right now. Check back soon for new students!</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="mt-8 flex justify-center gap-8 mb-12">
                    <button
                        onClick={() => handleAction("pass")}
                        disabled={currentIndex >= profiles.length}
                        className="w-18 h-18 rounded-full glass-panel flex items-center justify-center text-foreground/30 hover:text-white hover:bg-white/10 transition-all hover:scale-110 active:scale-95 disabled:opacity-50 border border-white/10"
                    >
                        <X className="w-9 h-9" />
                    </button>

                    <button
                        onClick={() => handleAction("like")}
                        disabled={currentIndex >= profiles.length || initiationsToday >= 3}
                        className={`w-18 h-18 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:grayscale ${initiationsToday >= 3 ? "bg-white/10 text-foreground/20" : "bg-primary text-white shadow-[0_0_30px_rgba(109,93,254,0.4)]"}`}
                    >
                        <Heart className="w-9 h-9 fill-current" />
                    </button>
                </div>
            </div>

            {matchModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-midnight/90 backdrop-blur-xl px-6">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 40 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        className="glass-panel p-10 rounded-[2.5rem] max-w-sm w-full text-center flex flex-col items-center border border-primary/20"
                    >
                        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-8 border border-primary/40 shadow-[0_0_40px_rgba(109,93,254,0.5)]">
                            <MessageCircleHeart className="w-12 h-12 text-primary" />
                        </div>
                        <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-primary/50 to-white mb-4 italic">
                            GOT A VIBE.
                        </h2>
                        <p className="text-foreground/70 mb-10 leading-relaxed px-4">
                            You and <span className="text-white font-bold">{matchModal.alias}</span> have a massive <span className="text-primary font-bold">{matchModal.compatibility}%</span> overlap.
                        </p>
                        <div className="w-full flex flex-col gap-3">
                            <button
                                onClick={() => router.push(`/chat/${matchModal.id}`)}
                                className="w-full py-5 rounded-2xl bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(109,93,254,0.4)] flex items-center justify-center gap-2"
                            >
                                Enter Private Chat
                            </button>
                            <button onClick={() => setMatchModal(null)} className="py-4 text-xs font-bold uppercase tracking-widest text-foreground/30 hover:text-white transition-colors">
                                Keep Searching
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
            {/* Profile Preview Modal */}
            <AnimatePresence>
                {showProfileModal && currentIndex < profiles.length && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] bg-midnight/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="w-full max-w-lg bg-midnight border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

                            <div className="flex justify-between items-start mb-8 relative">
                                <div>
                                    <h2 className="text-3xl font-bold text-white mb-2">{profiles[currentIndex].alias}</h2>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] uppercase font-bold tracking-widest text-foreground/40">{profiles[currentIndex].gender} Profile</span>
                                        <div className="flex items-center gap-1 text-[10px] text-primary font-black uppercase tracking-widest">
                                            {profiles[currentIndex].compatibility}% Synchronized
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setShowProfileModal(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-foreground/50 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-8 relative">
                                {profiles[currentIndex].bio && (
                                    <section>
                                        <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-[0.2em] mb-3">About Student</p>
                                        <p className="text-sm text-foreground/80 leading-relaxed bg-white/5 p-5 rounded-2xl border border-white/5 italic">
                                            "{profiles[currentIndex].bio}"
                                        </p>
                                    </section>
                                )}

                                {selectedProfileStories.length > 0 && (
                                    <section>
                                        <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-[0.2em] mb-4 text-center">Recent Vibes & Stories</p>
                                        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                                            {selectedProfileStories.map((story: any) => (
                                                <div key={story.id} className="min-w-[120px] p-4 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col gap-2">
                                                    <span className="text-xs font-bold text-primary italic leading-tight">"{story.content}"</span>
                                                    <span className="text-[9px] text-foreground/30 uppercase font-black">{story.vibe_category}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => { setShowProfileModal(false); skipProfile(); }} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-foreground/50 hover:bg-white/10 transition-colors">
                                        Skip Quietly
                                    </button>
                                    <button onClick={() => { setShowProfileModal(false); handleMatch(profiles[currentIndex].id); }} className="w-full py-4 bg-primary text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                                        Match & Chat 🔥
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
