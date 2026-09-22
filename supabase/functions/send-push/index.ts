import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type WebhookPayload = {
  table: string;
  type: "INSERT" | "UPDATE";
  record: Record<string, unknown>;
  old_record?: Record<string, unknown> | null;
};

async function sendExpoPush(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });
}

export default {
  fetch: withSupabase({ auth: ["secret"] }, async (req, ctx) => {
    const payload = (await req.json()) as WebhookPayload;
    const supabase = ctx.supabaseAdmin;

    let recipientIds: string[] = [];
    let title = "";
    let body = "";
    let data: Record<string, unknown> = {};

    if (payload.table === "messages" && payload.type === "INSERT") {
      const message = payload.record as {
        id: string;
        conversation_id: string;
        sender_id: string;
        body: string;
      };
      const { data: members } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", message.conversation_id)
        .neq("user_id", message.sender_id);
      const { data: sender } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", message.sender_id)
        .single();

      recipientIds = (members ?? []).map((m) => m.user_id);
      title = sender?.display_name ?? "Nytt meddelande";
      body = message.body;
      data = { type: "message", conversationId: message.conversation_id };
    } else if (payload.table === "friendships" && payload.type === "INSERT") {
      const friendship = payload.record as { requester_id: string; addressee_id: string; status: string };
      if (friendship.status !== "pending") return Response.json({ skipped: true });
      const { data: requester } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", friendship.requester_id)
        .single();

      recipientIds = [friendship.addressee_id];
      title = "Ny vänförfrågan";
      body = `${requester?.display_name ?? "Någon"} vill bli vän med dig`;
      data = { type: "friend_request" };
    } else if (payload.table === "friendships" && payload.type === "UPDATE") {
      const friendship = payload.record as { requester_id: string; addressee_id: string; status: string };
      const previous = payload.old_record as { status?: string } | null;
      if (friendship.status !== "accepted" || previous?.status === "accepted") {
        return Response.json({ skipped: true });
      }
      const { data: addressee } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", friendship.addressee_id)
        .single();

      recipientIds = [friendship.requester_id];
      title = "Vänförfrågan accepterad";
      body = `${addressee?.display_name ?? "Någon"} accepterade din vänförfrågan`;
      data = { type: "friend_accepted" };
    } else if (payload.table === "meetup_interests" && payload.type === "INSERT") {
      const interest = payload.record as { meetup_id: string; user_id: string };
      const { data: meetup } = await supabase
        .from("meetups")
        .select("title, creator_id")
        .eq("id", interest.meetup_id)
        .single();
      if (!meetup || meetup.creator_id === interest.user_id) {
        return Response.json({ skipped: true });
      }
      const { data: interested } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", interest.user_id)
        .single();

      recipientIds = [meetup.creator_id];
      title = "Någon är intresserad";
      body = `${interested?.display_name ?? "Någon"} är intresserad av ${meetup.title}`;
      data = { type: "meetup_interest", meetupId: interest.meetup_id };
    } else {
      return Response.json({ skipped: true });
    }

    if (recipientIds.length === 0) return Response.json({ skipped: true });

    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("token")
      .in("user_id", recipientIds);

    const messages: PushMessage[] = (tokens ?? []).map((t) => ({
      to: t.token,
      title,
      body,
      data,
    }));

    await sendExpoPush(messages);
    return Response.json({ sent: messages.length });
  }),
};
