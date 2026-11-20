import { getAdminClient } from "@/lib/supabase/admin";
import { Notification, NotificationChannel, DeliveryStatus } from "@/types/database";

export interface SendNotificationOptions {
  userId: number;
  type:
    | "match_suggested"
    | "match_approved"
    | "match_confirmed"
    | "claim_submitted"
    | "claim_approved"
    | "claim_rejected"
    | "claim_info_needed"
    | "system";
  title: string;
  message: string;
  reportId?: number | null;
  matchId?: number | null;
  email?: string | null;
  phone?: string | null;
  preferredChannels?: NotificationChannel[];
}

export async function dispatchNotification(opts: SendNotificationOptions): Promise<{
  success: boolean;
  notificationId?: number;
  deliveries: Array<{ channel: NotificationChannel; status: DeliveryStatus }>;
}> {
  const supabase = getAdminClient();
  const deliveries: Array<{ channel: NotificationChannel; status: DeliveryStatus }> = [];

  try {
    // 1. Create In-App Notification Record
    const { data: notif, error: notifErr } = await supabase
      .from("notifications")
      .insert([
        {
          user_id: opts.userId,
          type: opts.type,
          title: opts.title,
          message: opts.message,
          report_id: opts.reportId || null,
          match_id: opts.matchId || null,
          is_read: false,
        },
      ])
      .select()
      .single();

    if (notifErr || !notif) {
      console.error("Failed to insert in-app notification:", notifErr);
      return { success: false, deliveries: [] };
    }

    deliveries.push({ channel: "in_app", status: "delivered" });

    // 2. Transactional Email Channel (if recipient email is provided and configured)
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailSender = process.env.NOTIFICATION_EMAIL_FROM || "notifications@findr.campus.edu";

    if (opts.email && resendApiKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: emailSender,
            to: opts.email,
            subject: `[FINDR] ${opts.title}`,
            text: `${opts.message}\n\nSign in to FINDR to view the full details: ${
              process.env.NEXT_PUBLIC_APP_URL || "https://findr-topaz.vercel.app"
            }\n\n— Team FINDR`,
          }),
        });

        if (res.ok) {
          deliveries.push({ channel: "email", status: "sent" });
          await logDelivery(supabase, notif.id, opts.email, null, "email", "sent");
        } else {
          const errText = await res.text();
          deliveries.push({ channel: "email", status: "failed" });
          await logDelivery(supabase, notif.id, opts.email, null, "email", "failed", errText);
        }
      } catch (err: unknown) {
        deliveries.push({ channel: "email", status: "failed" });
        await logDelivery(supabase, notif.id, opts.email, null, "email", "failed", String(err));
      }
    } else if (opts.email) {
      // Email configured as pending / outbox log
      deliveries.push({ channel: "email", status: "queued" });
      await logDelivery(supabase, notif.id, opts.email, null, "email", "queued", "Provider unconfigured, logged to outbox");
    }

    // 3. SMS Channel (if recipient phone is provided and Twilio is configured)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (opts.phone && twilioSid && twilioAuthToken && twilioFrom) {
      try {
        const smsBody = new URLSearchParams({
          From: twilioFrom,
          To: opts.phone,
          Body: `[FINDR] ${opts.title}: ${opts.message}. Visit: ${
            process.env.NEXT_PUBLIC_APP_URL || "https://findr-topaz.vercel.app"
          }`,
        });

        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString("base64")}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: smsBody.toString(),
          }
        );

        if (res.ok) {
          deliveries.push({ channel: "sms", status: "sent" });
          await logDelivery(supabase, notif.id, null, opts.phone, "sms", "sent");
        } else {
          const errText = await res.text();
          deliveries.push({ channel: "sms", status: "failed" });
          await logDelivery(supabase, notif.id, null, opts.phone, "sms", "failed", errText);
        }
      } catch (err: unknown) {
        deliveries.push({ channel: "sms", status: "failed" });
        await logDelivery(supabase, notif.id, null, opts.phone, "sms", "failed", String(err));
      }
    } else if (opts.phone) {
      deliveries.push({ channel: "sms", status: "queued" });
      await logDelivery(supabase, notif.id, null, opts.phone, "sms", "queued", "SMS provider unconfigured, logged to outbox");
    }

    return { success: true, notificationId: notif.id, deliveries };
  } catch (err: unknown) {
    console.error("dispatchNotification error:", err);
    return { success: false, deliveries };
  }
}

async function logDelivery(
  supabase: any,
  notifId: number,
  email: string | null,
  phone: string | null,
  channel: NotificationChannel,
  status: DeliveryStatus,
  errorMsg?: string
) {
  try {
    await supabase.from("notification_deliveries").insert([
      {
        notification_id: notifId,
        recipient_email: email,
        recipient_phone: phone,
        channel,
        status,
        error_message: errorMsg || null,
      },
    ]);
  } catch {
    // Non-blocking if table is being initialized
  }
}
