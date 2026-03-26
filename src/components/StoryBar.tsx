"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Clock, Ghost, Sparkles, MessageCircle, Loader2 } from "lucide-react";

interface Story {
    id: string;
    user_id: string;
    content: string;
    vibe_category: string;
    created_at: string;
    profiles_public: {
        alias: string;
    };
}

export default function StoryBar() {
    const [stories, setStories] = useState<Story[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPostModal, setShowPostModal] = useState(false);
    const [newStoryContent, setNewStoryContent] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("Social");
    const [isPosting, setIsPosting] = useState(false);

    const categories = [
        { name: "Social", icon: "🍹", color: "bg-pink-500" },
        { name: "Study", icon: "📚", color: "bg-blue-500" },
        { name: "Deep Talk", icon: "🧘", color: "bg-purple-500" },
        { name: "Random", icon: "🎲", color: "bg-amber-500" },
    ];

    useEffect(() => {
        fetchStories();

        // Real-time listener for new stories
        const channel = supabase
            .channel('public_stories')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'stories'
            }, () => {
                fetchStories();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchStories = async () => {
        const { data, error } = await supabase
            .from("stories")
            .select(`
                *,
                profiles_public:user_id (alias)
            `)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });

        if (!error && data) {
            setStories(data as any);
        }
        setLoading(false);
    };

    const handlePostStory = async () => {
        if (!newStoryContent.trim()) return;
        setIsPosting(true);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const { error } = await supabase
            .from("stories")
            .insert({
                user_id: session.user.id,
                content: newStoryContent,
                vibe_category: selectedCategory,
                expires_at: expiresAt.toISOString()
            });

        if (!error) {
            setNewStoryContent("");
            setShowPostModal(false);
            fetchStories();
        } else {
            alert("Error posting story: " + error.message);
        }
        setIsPosting(false);
    };

    return (
        <div className="w-full mb-8 relative">
            <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
                {/* Add Story Button */}
                <button
                    onClick={() => setShowPostModal(true)}
                    className="flex flex-col items-center gap-2 shrink-0 group"
                >
                    <div className="w-16 h-16 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center group-hover:border-primary/50 group-hover:bg-primary/5 transition-all">
                        <Plus className="w-6 h-6 text-foreground/40 group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-[10px] font-bold text-foreground/40 group-hover:text-primary uppercase tracking-widest">Share Vibe</span>
                </button>

                {/* Stories List */}
                {stories.map((story) => (
                    <motion.div
                        key={story.id}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center gap-2 shrink-0 max-w-[80px]"
                    >
                        <div className={`w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-primary via-indigo-500 to-pink-500 shadow-lg shadow-primary/20`}>
                            <div className="w-full h-full rounded-full bg-midnight flex items-center justify-center border-2 border-midnight overflow-hidden relative group">
                                <span className="text-2xl">{categories.find(c => c.name === story.vibe_category)?.icon || "✨"}</span>
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center">
                                    <p className="text-[8px] text-white leading-tight line-clamp-2">{story.content}</p>
                                </div>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold text-foreground/60 truncate w-full text-center">
                            {story.profiles_public.alias}
                        </span>
                    </motion.div>
                ))}

                {!loading && stories.length === 0 && (
                    <div className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-foreground/30 whitespace-nowrap">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-medium italic">No vibes yet. Be the first?</span>
                    </div>
                )}
            </div>

            {/* Post Modal */}
            <AnimatePresence>
                {showPostModal && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-midnight/90 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="glass-panel w-full max-w-sm p-8 rounded-[2.5rem] border border-white/10"
                        >
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <Clock className="text-primary w-6 h-6" />
                                Share a 24h Vibe
                            </h2>

                            <div className="flex flex-col gap-6">
                                <div className="flex flex-wrap gap-2">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.name}
                                            onClick={() => setSelectedCategory(cat.name)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedCategory === cat.name ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-white/5 border-white/5 text-foreground/40 hover:bg-white/10"}`}
                                        >
                                            {cat.icon} {cat.name}
                                        </button>
                                    ))}
                                </div>

                                <textarea
                                    value={newStoryContent}
                                    onChange={(e) => setNewStoryContent(e.target.value.substring(0, 100))}
                                    placeholder="What's happening right now?"
                                    rows={4}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-primary/50 text-white placeholder:text-foreground/20 resize-none font-medium leading-relaxed"
                                />
                                <p className="text-right text-[10px] text-foreground/20 font-bold">{newStoryContent.length}/100</p>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowPostModal(false)}
                                        className="flex-1 py-4 text-xs font-bold uppercase tracking-widest text-foreground/30 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handlePostStory}
                                        disabled={isPosting || !newStoryContent.trim()}
                                        className="flex-[2] py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isPosting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Post Vibe <Sparkles className="w-4 h-4" /></>}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
