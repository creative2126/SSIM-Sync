"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search, Loader2, UserCircle2, Zap, MessageSquare, ShieldCheck, Heart, Sparkles, Filter, X } from "lucide-react";
import { formatLastSeen } from "@/lib/utils/time";


export default function DiscoverPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [myId, setMyId] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>("all"); // all, male, female

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id || null));
        // Load some initial "New Faces"
        handleSearch("");
    }, []);

    const handleSearch = async (query: string) => {
        setLoading(true);
        try {
            let q = supabase
                .from("profiles_public")
                .select("*")
                .neq("id", myId || "") // Don't find yourself
                .order("created_at", { ascending: false })
                .limit(20);

            if (query.trim()) {
                q = q.ilike("alias", `%${query}%`);
            }

            if (filter !== "all") {
                q = q.eq("gender", filter === "male" ? "Male" : "Female");
            }

            const { data, error } = await q;

            if (!error) setResults(data || []);
        } finally {
            setLoading(false);
        }
    };

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            handleSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, filter]);

    const connectWithUser = async (targetUserId: string) => {
        if (!myId) return router.push("/login");

        // Check for existing match
        const { data: existingMatch } = await supabase
            .from("matches")
            .select("id")
            .or(`and(user_1_id.eq.${myId},user_2_id.eq.${targetUserId}),and(user_1_id.eq.${targetUserId},user_2_id.eq.${myId})`)
            .maybeSingle();

        if (existingMatch) {
            router.push(`/chat/${targetUserId}`);
        } else {
            const { error } = await supabase.from("matches").insert({
                user_1_id: myId,
                user_2_id: targetUserId,
                is_revealed: false
            });

            if (error) alert("Error connecting. Try again.");
            else router.push(`/chat/${targetUserId}`);
        }
    };

    return (
        <main className="min-h-screen bg-midnight">
            <div className="mobile-container pt-8">
                
                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-primary" />
                        Discover
                    </h1>
                    <p className="text-foreground/50 text-sm">Find and connect with fellow SSIM students</p>
                </header>

                {/* Search Bar */}
                <div className="relative group mb-8">
                    <div className="absolute inset-0 bg-primary/20 rounded-[2rem] blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <div className="relative flex items-center border border-white/5 bg-white/5 rounded-[1.5rem] p-1.5 focus-within:border-primary/50 transition-all">
                        <Search className="w-5 h-5 ml-4 text-foreground/20 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by alias..."
                            className="bg-transparent border-none focus:ring-0 text-white placeholder:text-foreground/20 w-full py-3.5 px-4"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="p-2 hover:bg-white/10 rounded-full transition text-foreground/20">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide">
                    {["all", "male", "female"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filter === f ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-white/5 border-white/5 text-foreground/40"}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* Results Section */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase">Scanning Student Database...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {results.length === 0 ? (
                            <div className="text-center py-20 opacity-20">
                                <Search className="w-12 h-12 mx-auto mb-4" />
                                <p className="font-bold">No students found</p>
                                <p className="text-xs">Try a different alias!</p>
                            </div>
                        ) : (
                            results.map((profile, idx) => (
                                <motion.div
                                    key={profile.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="glass-panel p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all group overflow-hidden relative"
                                >
                                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] rotate-12 pointer-events-none">
                                        <Zap className="w-24 h-24 text-primary" />
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-3xl bg-indigo/30 flex items-center justify-center text-primary border border-white/5 group-hover:scale-105 transition-transform">
                                            <UserCircle2 className="w-10 h-10" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-white text-lg">{profile.alias}</h3>
                                                {profile.verification_status === 'verified' && (
                                                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-foreground/40">
                                                <span>{profile.gender}</span>
                                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                                <span className="text-primary italic">"{(profile.vibe_scores?.q1) || "New Vibe"}"</span>
                                            </div>
                                            <p className="text-[8px] uppercase tracking-tighter text-foreground/20 font-black mt-1">
                                                {formatLastSeen(profile.last_seen)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => connectWithUser(profile.id)}
                                            className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all"
                                        >
                                            <MessageSquare className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {profile.bio && (
                                        <p className="mt-4 text-xs text-foreground/60 leading-relaxed italic line-clamp-2">
                                            "{profile.bio}"
                                        </p>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </div>
                )}

                <div className="h-24" /> {/* Bottom Spacing */}
            </div>
        </main>
    );
}
