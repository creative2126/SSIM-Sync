"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Loader2, User, Edit3, ShieldCheck, LogOut, CheckCircle2 } from "lucide-react";

export default function ProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [privateProfile, setPrivateProfile] = useState<any>(null);

    // Form State
    const [alias, setAlias] = useState("");
    const [aliasError, setAliasError] = useState<string | null>(null);
    const [bio, setBio] = useState("");

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return router.push("/signup");

        const { data: pubData } = await supabase
            .from("profiles_public")
            .select("*")
            .eq("id", session.user.id)
            .single();

        const { data: privData } = await supabase
            .from("profiles_private")
            .select("real_name, email, verification_status")
            .eq("id", session.user.id)
            .single();

        if (pubData) {
            setProfile(pubData);
            setAlias(pubData.alias || "");
            setBio(pubData.bio || "");
        }
        if (privData) setPrivateProfile(privData);
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        setAliasError(null);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const cleanAlias = alias.toLowerCase().trim();
        const myRealName = privateProfile?.real_name?.toLowerCase() || "";

        // 1. Check against own real name
        if (cleanAlias === myRealName || cleanAlias.includes(myRealName) || (myRealName.length > 3 && myRealName.includes(cleanAlias))) {
            setAliasError("You cannot use your real name as your alias.");
            setSaving(false);
            return;
        }

        // 2. Check against others' real names
        const { data: collision } = await supabase
            .from("profiles_private")
            .select("id")
            .ilike("real_name", `%${cleanAlias}%`)
            .limit(1);

        if (collision && collision.length > 0) {
            setAliasError("This alias is too similar to a student's real name.");
            setSaving(false);
            return;
        }

        const { error } = await supabase
            .from("profiles_public")
            .update({ alias, bio })
            .eq("id", session.user.id);

        if (!error) {
            alert("Profile updated!");
        } else {
            alert("Error updating profile.");
        }
        setSaving(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    if (loading) return <div className="min-h-screen bg-midnight flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

    return (
        <main className="min-h-screen bg-midnight">
            <div className="mobile-container">
                <header className="mb-10 mt-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">My Persona</h1>
                        <p className="text-foreground/50 text-sm">Manage how others see you</p>
                    </div>
                    <button onClick={handleLogout} className="p-3 rounded-2xl bg-white/5 hover:bg-red-500/10 text-foreground/40 hover:text-red-400 transition-all border border-white/5 group">
                        <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                </header>

                {/* Profile Visibility Status */}
                <div className={`p-6 rounded-3xl mb-8 flex items-center gap-4 border transition-all ${privateProfile?.verification_status === "verified" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                        <ShieldCheck className={`w-7 h-7 ${privateProfile?.verification_status === "verified" ? "text-emerald-400" : "text-amber-400"}`} />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-0.5 opacity-50">Campus Status</p>
                        <p className="text-base font-bold">{privateProfile?.verification_status === "verified" ? "Identity Verified" : "Verification Pending"}</p>
                    </div>
                    {privateProfile?.verification_status === "verified" && (
                        <CheckCircle2 className="w-6 h-6 ml-auto animate-pulse" />
                    )}
                </div>

                <div className="flex flex-col gap-8">
                    <section className="glass-panel p-8 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-focus-within:opacity-10 transition-all">
                            <Edit3 className="w-24 h-24 text-primary" />
                        </div>

                        <div className="flex items-center gap-2 mb-8 relative">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <h2 className="text-lg font-bold">Public Persona</h2>
                        </div>

                        <div className="flex flex-col gap-8">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.2em] ml-1">Anonymous Alias</label>
                                <input
                                    type="text"
                                    value={alias}
                                    onChange={(e) => {
                                        setAlias(e.target.value);
                                        setAliasError(null);
                                    }}
                                    className={`w-full px-5 py-4 rounded-2xl bg-midnight border ${aliasError ? "border-red-500/50" : "border-white/10"} focus:border-primary/50 outline-none transition-all text-white font-medium`}
                                />
                                {aliasError ? (
                                    <p className="text-[10px] text-red-400 font-bold ml-1">{aliasError}</p>
                                ) : (
                                    <p className="text-[10px] text-foreground/20 italic ml-1">This is your identity in Discovery and Vibes. No real names allowed.</p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.2em] ml-1">Your Bio / Prompt</label>
                                <textarea
                                    rows={4}
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    className="w-full px-5 py-4 rounded-2xl bg-midnight border border-white/10 focus:border-primary/50 outline-none transition-all resize-none text-white leading-relaxed font-medium"
                                    placeholder="Tell the campus who you are anonymously..."
                                />
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full py-5 rounded-2xl bg-primary text-white font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(109,93,254,0.3)] hover:scale-[1.02] active:scale-[0.98] mt-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : "Save Changes"}
                            </button>
                        </div>
                    </section>

                    <section className="glass-panel p-8 rounded-[2rem] border border-white/5 opacity-50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <User className="w-16 h-16" />
                        </div>
                        <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em] mb-6">Private Campus Identity</p>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-foreground/30 border border-white/5">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest leading-none mb-1">Real Name</p>
                                <p className="text-lg font-bold text-white tracking-tight">{privateProfile?.real_name}</p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
