import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin (needed to bypass RLS for checking last_seen/last_email)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { targetUserId, senderAlias, messageSnippet } = await req.json();

        // 1. Fetch User status and email settings
        const { data: profile, error: pError } = await supabaseAdmin
            .from("profiles_public")
            .select("*, last_seen, last_email_at, email_notifications_enabled")
            .eq("id", targetUserId)
            .single();

        if (pError || !profile || !profile.email_notifications_enabled) {
            return NextResponse.json({ sent: false, reason: "Notifications disabled or user not found" });
        }

        // 2. CHECK RULES: Don't spam
        const now = new Date();
        const lastSeen = profile.last_seen ? new Date(profile.last_seen) : new Date(0);
        const lastEmail = profile.last_email_at ? new Date(profile.last_email_at) : new Date(0);

        // Rule 1: User must be "Offline" for at least 15 min
        const diffSeenMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
        if (diffSeenMinutes < 15) {
            return NextResponse.json({ sent: false, reason: "User active on app recently" });
        }

        // Rule 2: Minimum 4 hours between notification emails
        const diffEmailHours = (now.getTime() - lastEmail.getTime()) / (1000 * 60 * 60);
        if (diffEmailHours < 4) {
            return NextResponse.json({ sent: false, reason: "Wait period for email not reached" });
        }

        // 3. SEND EMAIL (Example integration with Resend)
        // Note: You need to set RESEND_API_KEY in your .env.local
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        
        if (!RESEND_API_KEY) {
            console.warn("RESEND_API_KEY not found. Skipping email send.");
            return NextResponse.json({ sent: false, error: "API Key Missing" });
        }

        // Create HTML Email Template
        const emailHtml = `
            <div style="font-family: sans-serif; background: #0a0a0f; color: #ffffff; padding: 40px; border-radius: 20px;">
                <h1 style="color: #6d5dfe; font-size: 24px;">New Vibe on SSIM Sync! 🚀</h1>
                <p style="font-size: 16px; opacity: 0.8;">You have a new unread message waiting for you.</p>
                <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.1); margin: 20px 0;">
                    <p style="font-size: 14px; font-weight: bold; color: #6d5dfe; margin-bottom: 8px;">${senderAlias} says:</p>
                    <p style="font-size: 15px; font-style: italic; opacity: 0.9;">"${messageSnippet}"</p>
                </div>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://ssim-sync.vercel.app'}/chat/${profile.id}" 
                   style="display: inline-block; background: #6d5dfe; color: white; padding: 12px 24px; border-radius: 12px; font-weight: bold; text-decoration: none; margin-top: 20px;">
                   Open Chat & Reply
                </a>
                <p style="font-size: 10px; opacity: 0.4; margin-top: 40px;">If you're already on the app, ignore this email. You can disable these in your Profile settings.</p>
            </div>
        `;

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: "SSIM Sync <no-reply@ssim-sync.com>", // You'll need to verify your domain on Resend
                to: profile.user_email || profile.id, // Assuming user_email is stored or reachable
                subject: "You have a new anonymous message 🔒",
                html: emailHtml
            })
        });

        // 4. Update last_email_at if sent successfully
        if (res.ok) {
            await supabaseAdmin
                .from("profiles_public")
                .update({ last_email_at: now.toISOString() })
                .eq("id", targetUserId);
        }

        return NextResponse.json({ sent: res.ok });

    } catch (err) {
        console.error("Email API Error:", err);
        return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }
}
