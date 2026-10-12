import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

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

type PushTicket = { status: "ok" | "error"; details?: { error?: string } };

async function sendExpoPush(messages: PushMessage[]): Promise<string[]> {
  if (messages.length === 0) return [];
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });
  if (!response.ok) return [];
  const { data } = (await response.json().catch(() => ({}))) as { data?: PushTicket[] };
  return (data ?? [])
    .map((ticket, index) =>
      ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered"
        ? messages[index].to
        : null,
    )
    .filter((token): token is string => !!token);
}

async function blockedWith(supabase: SupabaseClient, userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "blocked")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  return new Set(
    (data ?? []).map((row) => (row.requester_id === userId ? row.addressee_id : row.requester_id)),
  );
}

export default {
  fetch: withSupabase({ auth: ["secret"] }, async (req, ctx) => {
    const payload = (await req.json()) as WebhookPayload;
    const supabase = ctx.supabaseAdmin;

    let recipientIds: string[] = [];
    let actorId: string | null = null;
    let title = "";
    let body = "";
    let data: Record<string, unknown> = {};

    if (payload.table === "messages" && payload.type === "INSERT") {
      const message = payload.record as {
        id: string;
        conversation_id: string;
        sender_id: string;
        body: string;
        image_path: string | null;
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
      const { data: conversation } = await supabase
        .from("conversations")
        .select("is_group, name")
        .eq("id", message.conversation_id)
        .single();

      const senderName = sender?.display_name ?? "Någon";
      const what = message.image_path ? "en bild" : "ett meddelande";
      recipientIds = (members ?? []).map((m) => m.user_id);
      actorId = message.sender_id;
      if (conversation?.is_group) {
        title = conversation.name?.trim() || "Gruppchatt";
        body = `${senderName} skickade ${what}`;
      } else {
        title = senderName;
        body = `Skickade ${what}`;
      }
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
      actorId = friendship.requester_id;
      title = "Ny kompisförfrågan";
      body = `${requester?.display_name ?? "Någon"} vill bli kompis med dig`;
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
      title = "Ny kompis";
      body = `Du och ${addressee?.display_name ?? "någon"} är kompisar nu`;
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
      actorId = interest.user_id;
      title = "Din meet";
      body = `${interested?.display_name ?? "Någon"} vill med på ${meetup.title}`;
      data = { type: "meetup_interest", meetupId: interest.meetup_id };
    } else {
      return Response.json({ skipped: true });
    }

    if (actorId) {
      const blocked = await blockedWith(supabase, actorId);
      recipientIds = recipientIds.filter((id) => !blocked.has(id));
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

    const deadTokens = await sendExpoPush(messages);
    if (deadTokens.length > 0) {
      await supabase.from("push_tokens").delete().in("token", deadTokens);
    }
    return Response.json({ sent: messages.length, removed: deadTokens.length });
  }),
};
