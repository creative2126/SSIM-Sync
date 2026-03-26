"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export function useNotifications() {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        let channel: any;

        const fetchUnreadCount = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const userId = session.user.id;

            // 1. Get all matches for this user
            const { data: matches } = await supabase
                .from("matches")
                .select("id")
                .or(`user_1_id.eq.${userId},user_2_id.eq.${userId}`);

            if (!matches || matches.length === 0) {
                setUnreadCount(0);
                return;
            }

            const matchIds = matches.map(m => m.id);

            // 2. Count unread messages (sender != self AND read_at is null)
            const { count, error } = await supabase
                .from("messages")
                .select("*", { count: "exact", head: true })
                .in("match_id", matchIds)
                .neq("sender_id", userId)
                .is("read_at", null);

            if (error) {
                console.error("Unread Count Fetch Error:", error);
            } else {
                setUnreadCount(count || 0);
            }

            // 3. Subscribe to real-time message events for these matches
            if (channel) supabase.removeChannel(channel);

            channel = supabase
                .channel('global_notifications')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'messages'
                }, (payload) => {
                    // Refresh count on any message change (new message or marked as read)
                    fetchUnreadCount();
                })
                .subscribe();
        };

        fetchUnreadCount();

        // Check again every minute as a fallback
        const interval = setInterval(fetchUnreadCount, 60000);

        return () => {
            if (channel) supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, []);

    return { unreadCount };
}
