"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, XCircle, CheckCircle, ExternalLink, Trash2, Zap, Users, UserCheck } from "lucide-react";

import { motion } from "framer-motion";

export default function AdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [adminPassword, setAdminPassword] = useState("");
    const [authError, setAuthError] = useState(false);
    const [pendingUsers, setPendingUsers] = useState<any[]>([]);
    const [broadcastTitle, setBroadcastTitle] = useState("");
    const [broadcastMessage, setBroadcastMessage] = useState("");
    const [sendingBroadcast, setSendingBroadcast] = useState(false);
    const [stories, setStories] = useState<any[]>([]);
    const [loadingStories, setLoadingStories] = useState(true);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);


    useEffect(() => {
        const auth = localStorage.getItem("admin_auth");
        if (auth === "true") {
            setIsAuthorized(true);
            fetchPendingVerifications();
            fetchActiveStories();
            fetchUsers();
        } else {
            setLoading(false);
        }
    }, []);

    const handleAuth = () => {
        const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin2026";
        if (adminPassword === correctPassword) {
            setIsAuthorized(true);
            localStorage.setItem("admin_auth", "true");
            fetchPendingVerifications();
            fetchActiveStories();
            fetchUsers();
        } else {
            setAuthError(true);
            setTimeout(() => setAuthError(false), 2000);
        }
    };

    const fetchUsers = async () => {
        setLoadingUsers(true);
        const { data, error } = await supabase
            .from("profiles_public")
            .select("*")
            .order("created_at", { ascending: false });

        if (!error && data) {
            setAllUsers(data);
        }
        setLoadingUsers(false);
    };

    const fetchPendingVerifications = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return router.push("/login");

        const { data, error } = await supabase
            .from("profiles_private")
            .select("*")
            .eq("verification_status", "pending")
            .order("created_at", { ascending: false });

        if (error) {
            console.error(error);
        } else if (data) {
            // Map storage paths to SIGNED URLs (Secure: Only admin sees them)
            const usersWithUrls = await Promise.all(data.map(async (user) => {
                let idUrl = "";
                let selfieUrl = "";

                if (user.student_id_url) {
                    const { data: idData } = await supabase.storage.from("verifications").createSignedUrl(user.student_id_url, 3600);
                    idUrl = idData?.signedUrl || "";
                }
                if (user.selfie_url) {
                    const { data: selfieData } = await supabase.storage.from("verifications").createSignedUrl(user.selfie_url, 3600);
                    selfieUrl = selfieData?.signedUrl || "";
                }

                return { ...user, idUrl, selfieUrl };
            }));
            setPendingUsers(usersWithUrls);
        }
        setLoading(false);
    };

    const updateStatus = async (userId: string, status: "verified" | "rejected") => {
        setPendingUsers(prev => prev.filter(u => u.id !== userId)); // Optimistic UI update

        // Update Private Profile
        const { error: privErr } = await supabase
            .from("profiles_private")
            .update({ verification_status: status })
            .eq("id", userId);

        // ALSO update Public Profile for UI badges AND Reveal Identity
        const { error: pubErr } = await supabase
            .from("profiles_public")
            .update({
                verification_status: status,
                real_name: status === "verified" ? pendingUsers.find(u => u.id === userId)?.real_name : null
            })
            .eq("id", userId);

        if (privErr || pubErr) {
            console.error("Update Error:", privErr || pubErr);
            alert("Error updating status in one or more tables.");
            fetchPendingVerifications(); // Revert on error
        }
    };

    const sendBroadcast = async () => {
        if (!broadcastTitle || !broadcastMessage) return;
        setSendingBroadcast(true);

        const { error } = await supabase
            .from("broadcasts")
            .insert({ title: broadcastTitle, message: broadcastMessage });

        if (!error) {
            alert("Broadcast sent to all students!");
            setBroadcastTitle("");
            setBroadcastMessage("");
        } else {
            alert("Error: " + error.message);
        }
    };

    const fetchActiveStories = async () => {
        setLoadingStories(true);
        const { data, error } = await supabase
            .from("stories")
            .select(`
                *,
                profiles_public (
                    alias
                )
            `)
            .gte("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false });

        if (!error && data) {
            setStories(data);
        }
        setLoadingStories(false);
    };

    const deleteStory = async (storyId: string) => {
        if (!confirm("Are you sure you want to remove this vibe? This cannot be undone.")) return;

        const { error } = await supabase
            .from("stories")
            .delete()
            .eq("id", storyId);

        if (!error) {
            setStories(prev => prev.filter(s => s.id !== storyId));
        } else {
            alert("Error deleting story: " + error.message);
        }
    };

    if (loading) return <div className="min-h-screen bg-midnight flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

    if (!isAuthorized) {
        return (
            <main className="min-h-screen bg-midnight flex items-center justify-center p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-midnight pointer-events-none" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-panel p-10 rounded-[2.5rem] border border-white/5 max-w-sm w-full relative z-10 shadow-2xl text-center"
                >
                    <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(109,93,254,0.4)] mx-auto mb-8">
                        <ShieldCheck className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
                    <p className="text-foreground/40 text-sm mb-8">Enter the master password to continue</p>

                    <div className="flex flex-col gap-4">
                        <input
                            type="password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                            placeholder="Enter Password"
                            autoFocus
                            className={`w-full px-6 py-4 rounded-2xl bg-midnight border transition-all outline-none text-center font-bold tracking-[0.3em] ${authError ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]" : "border-white/10 focus:border-primary/50"
                                }`}
                        />
                        <button
                            onClick={handleAuth}
                            className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-[0_10px_20px_rgba(109,93,254,0.3)] active:scale-95"
                        >
                            Unlock Dashboard
                        </button>
                        {authError && (
                            <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-red-400 text-[10px] font-bold uppercase tracking-widest"
                            >
                                Incorrect Password
                            </motion.p>
                        )}
                    </div>
                </motion.div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-midnight p-8 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-primary/20 rounded-xl border border-primary/30 shadow-[0_0_20px_rgba(109,93,254,0.3)]">
                        <ShieldCheck className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Trust & Safety Admin</h1>
                        <p className="text-foreground/50 text-sm">Review pending student verifications</p>
                    </div>
                </div>

                {/* Vibe Moderator Section */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                                <Zap className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Vibe Moderator</h2>
                                <p className="text-foreground/40 text-xs">Remove harmful or inappropriate campus stories</p>
                            </div>
                        </div>
                        <button
                            onClick={fetchActiveStories}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-foreground/50 transition-all"
                            title="Refresh Vibes"
                        >
                            <Loader2 className={`w-4 h-4 ${loadingStories ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loadingStories && stories.length === 0 ? (
                            <div className="col-span-full py-12 flex flex-col items-center justify-center bg-white/5 rounded-3xl border border-white/5">
                                <Loader2 className="animate-spin text-primary w-6 h-6 mb-2" />
                                <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest">Scanning active vibes...</p>
                            </div>
                        ) : stories.length === 0 ? (
                            <div className="col-span-full py-12 flex flex-col items-center justify-center bg-white/5 rounded-3xl border border-white/5 italic text-foreground/30 text-sm">
                                No active stories to moderate.
                            </div>
                        ) : (
                            stories.map((story) => (
                                <motion.div
                                    key={story.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-4 transition-all hover:bg-white/[0.07]"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-1">{story.vibe_category}</span>
                                            <span className="text-xs font-bold text-white/50">{story.profiles_public?.alias || "Anonymous Student"}</span>
                                        </div>
                                        <button
                                            onClick={() => deleteStory(story.id)}
                                            className="p-2 rounded-lg bg-red-500/10 text-red-400 transition-all hover:bg-red-500 hover:text-white border border-red-500/20"
                                            title="Delete Story"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-sm text-foreground/90 italic leading-relaxed font-medium">
                                        "{story.content}"
                                    </p>
                                    <div className="pt-3 border-t border-white/5 mt-auto">
                                        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-foreground/20">
                                            <span>Posted {new Date(story.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span>Expires {new Date(story.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {/* Real-time Stats */}
                    <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Total Students</p>
                            <Users className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-3xl font-black text-white">{allUsers.length}</p>
                    </div>

                    <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Real Students</p>
                            <UserCheck className="w-4 h-4 text-emerald-400" />
                        </div>
                        <p className="text-3xl font-black text-white">{allUsers.filter(u => !u.is_demo).length}</p>
                    </div>

                    <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Demo Profiles</p>
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        </div>
                        <p className="text-3xl font-black text-white">{allUsers.filter(u => u.is_demo).length}</p>
                    </div>

                    <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold">Pending Approval</p>
                            <Loader2 className="w-4 h-4 text-amber-400" />
                        </div>
                        <p className="text-3xl font-black text-white">{pendingUsers.length}</p>
                    </div>
                </div>

                {/* Users List Section */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                                <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Campus Population</h2>
                                <p className="text-foreground/40 text-xs">Directory of all active and demo students</p>
                            </div>
                        </div>
                        <button
                            onClick={fetchUsers}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-foreground/50 transition-all font-bold text-[10px] uppercase tracking-widest flex items-center gap-2"
                        >
                            <Loader2 className={`w-3 h-3 ${loadingUsers ? 'animate-spin' : ''}`} />
                            Sync List
                        </button>
                    </div>

                    <div className="glass-panel rounded-[2rem] border border-white/5 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 border-b border-white/5">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-foreground/40">Student Alias</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-foreground/40">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-foreground/40">Type</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-foreground/40">Vibe Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loadingUsers && allUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center">
                                                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                                                <p className="text-xs text-foreground/30 font-bold uppercase tracking-widest">Fetching student data...</p>
                                            </td>
                                        </tr>
                                    ) : allUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center italic text-foreground/30 text-sm">
                                                No students found on campus.
                                            </td>
                                        </tr>
                                    ) : (
                                        allUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-xs border border-primary/20">
                                                            {user.alias?.[0]}
                                                        </div>
                                                        <span className="font-bold text-white text-sm">{user.alias}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${user.verification_status === 'verified'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                        }`}>
                                                        {user.verification_status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {user.is_demo ? (
                                                        <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-black uppercase tracking-wider">
                                                            Demo
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 rounded-lg bg-white/5 text-white/40 border border-white/10 text-[9px] font-black uppercase tracking-wider">
                                                            Real
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5">
                                                        {Object.values(user.vibe_scores || {}).map((score: any, idx) => (
                                                            <div key={idx} className="w-1.5 h-1.5 rounded-full bg-primary/30"
                                                                style={{ opacity: score / 5 }} />
                                                        ))}
                                                        <span className="text-[10px] text-foreground/40 font-mono ml-1">
                                                            {Object.values(user.vibe_scores || {}).reduce((a: any, b: any) => a + b, 0)}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    {/* Stats Card */}
                    <div className="glass-panel p-8 rounded-3xl border border-white/5 flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <CheckCircle className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <p className="text-3xl font-black text-white">{pendingUsers.length}</p>
                            <p className="text-xs uppercase tracking-widest text-foreground/40 font-bold">Pending Verifications</p>
                        </div>
                    </div>

                    {/* Broadcast Tool */}
                    <div className="glass-panel p-8 rounded-3xl border border-primary/20 bg-primary/5 shadow-[0_0_30px_rgba(109,93,254,0.1)]">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                            Campus-Wide Broadcast
                        </h2>
                        <div className="flex flex-col gap-3">
                            <input
                                type="text"
                                value={broadcastTitle}
                                onChange={(e) => setBroadcastTitle(e.target.value)}
                                placeholder="Broadcast Title (e.g., Mandatory Event)"
                                className="w-full px-4 py-2 rounded-xl bg-midnight border border-white/10 outline-none focus:border-primary/50 text-sm"
                            />
                            <textarea
                                value={broadcastMessage}
                                onChange={(e) => setBroadcastMessage(e.target.value)}
                                placeholder="Your message to all students..."
                                rows={2}
                                className="w-full px-4 py-2 rounded-xl bg-midnight border border-white/10 outline-none focus:border-primary/50 text-sm resize-none"
                            />
                            <button
                                onClick={sendBroadcast}
                                disabled={sendingBroadcast || !broadcastTitle || !broadcastMessage}
                                className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-xs uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {sendingBroadcast ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Broadcast Now"}
                            </button>
                        </div>
                    </div>
                </div>

                {pendingUsers.length === 0 ? (
                    <div className="glass-panel p-12 rounded-3xl text-center flex flex-col items-center">
                        <CheckCircle className="w-12 h-12 text-emerald-400 mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Queue Empty</h2>
                        <p className="text-foreground/50">All pending verifications have been processed.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {pendingUsers.map(user => (
                            <div key={user.id} className="glass-panel p-6 rounded-3xl flex flex-col gap-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{user.real_name}</h3>
                                        <p className="text-sm text-foreground/50">{user.email}</p>
                                        <p className="text-xs text-primary/70 mt-1 uppercase tracking-wider font-mono">ID: {user.id.substring(0, 8)}...</p>
                                    </div>
                                    <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-medium border border-amber-500/30">
                                        Pending Review
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs uppercase tracking-wide text-foreground/50 font-medium">Student ID</span>
                                        <a href={user.idUrl} target="_blank" rel="noreferrer" className="block relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10 group bg-indigo/20">
                                            {user.idUrl ? (
                                                <>
                                                    <img src={user.idUrl} alt="ID Document" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <ExternalLink className="w-6 h-6 text-white" />
                                                    </div>
                                                </>
                                            ) : <div className="flex items-center justify-center h-full text-foreground/30 text-xs">No image</div>}
                                        </a>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <span className="text-xs uppercase tracking-wide text-foreground/50 font-medium">Live Selfie</span>
                                        <a href={user.selfieUrl} target="_blank" rel="noreferrer" className="block relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10 group bg-indigo/20">
                                            {user.selfieUrl ? (
                                                <>
                                                    <img src={user.selfieUrl} alt="Selfie" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <ExternalLink className="w-6 h-6 text-white" />
                                                    </div>
                                                </>
                                            ) : <div className="flex items-center justify-center h-full text-foreground/30 text-xs">No image</div>}
                                        </a>
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-2">
                                    <button
                                        onClick={() => updateStatus(user.id, "rejected")}
                                        className="flex-1 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all flex items-center justify-center gap-2 font-medium"
                                    >
                                        <XCircle className="w-5 h-5" /> Reject Identity
                                    </button>
                                    <button
                                        onClick={() => updateStatus(user.id, "verified")}
                                        className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 border border-emerald-400/50 text-white transition-all flex items-center justify-center gap-2 font-medium shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                    >
                                        <CheckCircle className="w-5 h-5" /> Approve & Verify
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
