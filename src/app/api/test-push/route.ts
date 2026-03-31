import { NextResponse } from 'next/server';
import webPush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Required: web-push uses Node.js crypto APIs, not available on Edge runtime
export const runtime = 'nodejs';

// Initialize Supabase Admin client to fetch the user's secure push subscription
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// We define our securely generated VAPID keys here
const VAPID_PUBLIC = "BGE1BpYyWIAGEq4dyHQoVYY4JZ-3ZYr2z28kEpq0Brsnkt9uS0it5IHuLXGkZBs71dJQhSqgVZH05P7fdEUFuGw";
const VAPID_PRIVATE = "aVv89QDMCXZmLQVCvqRfSYm9N1xeJQemRIn-0o02s44";

webPush.setVapidDetails(
  'mailto:admin@ssim.ac.in',
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

export async function POST(request: Request) {
  try {
    const { userId, title, body, subscription } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    let pushSubscription = subscription;

    // If no subscription passed directly, try to fetch from DB
    if (!pushSubscription) {
      const { data: subscriptionRecord, error } = await supabaseAdmin
        .from("push_subscriptions")
        .select("subscription")
        .eq("user_id", userId)
        .single();

      if (error || !subscriptionRecord) {
        return NextResponse.json({ error: "User has no push subscription. Please allow notifications first." }, { status: 404 });
      }
      pushSubscription = subscriptionRecord.subscription;
    }

    // Prepare the notification payload
    const payload = JSON.stringify({
      title: title || 'New Vibe Match! ✨',
      body: body || 'Someone just swiped right on your profile...',
      url: '/matches'
    });

    // Dispatch the ping to Google/Mozilla servers
    await webPush.sendNotification(pushSubscription as webPush.PushSubscription, payload);

    return NextResponse.json({ success: true, message: "Push notification dispatched successfully!" });

  } catch (error: any) {
    console.error("Error triggering push:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
