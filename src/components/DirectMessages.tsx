// src/components/DirectMessages.tsx
// Campus Connect — Direct Messages (Step 1: Conversation List)
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";

type Conversation = {
  id: string;
  participants: string[];
  participantInfo: Record<string, { name: string; avatarUrl?: string }>;
  lastMessage?: string;
  lastMessageAt?: any;
  lastMessageSenderId?: string;
  unreadBy?: string[];
};

const AVATAR_COLORS = [
  ["#166534", "#16a34a"], ["#b45309", "#f59e0b"], ["#1d4ed8", "#3b82f6"],
  ["#7c3aed", "#a78bfa"], ["#be123c", "#f43f5e"], ["#0f766e", "#14b8a6"],
];
function avatarGrad(uid: string) {
  const i = uid.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return `linear-gradient(135deg,${AVATAR_COLORS[i][0]},${AVATAR_COLORS[i][1]})`;
}
function initials(name: string) {
  return (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}
function timeAgo(ts: any): string {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function DirectMessages() {
  const currentUser = auth.currentUser;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid),
      orderBy("lastMessageAt", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation)));
      setLoading(false);
    }, (err) => {
      console.error("Conversations listener error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser?.uid]);

  if (!currentUser) return null;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 0 60px" }}>
      <div style={{ padding: "24px 20px 18px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
        <div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
          💬 Messages
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>
          Your private conversations with other students
        </div>
      </div>

      <div style={{ padding: "0 12px" }}>
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "14px 8px" }}>
              <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
                <div className="skeleton" style={{ height: 11, width: "40%" }} />
                <div className="skeleton" style={{ height: 10, width: "70%" }} />
              </div>
            </div>
          ))
        ) : conversations.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--text-3)" }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>💬</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>No conversations yet</div>
            <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.6 }}>
              Visit a student's profile and tap "Message" to start a conversation.
            </div>
          </div>
        ) : (
          conversations.map(convo => {
            const otherUid = convo.participants.find(p => p !== currentUser.uid) || "";
            const other = convo.participantInfo?.[otherUid] || { name: "Unknown", avatarUrl: "" };
            const isUnread = convo.unreadBy?.includes(currentUser.uid);
            const isMine = convo.lastMessageSenderId === currentUser.uid;

            return (
              <div key={convo.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 8px", borderRadius: 14, cursor: "pointer",
                background: isUnread ? "rgba(34,197,94,0.04)" : "transparent",
                transition: "background 0.15s",
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                  background: other.avatarUrl ? "transparent" : avatarGrad(otherUid),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700, color: "#fff", overflow: "hidden",
                  border: isUnread ? "2px solid rgba(34,197,94,0.4)" : "1.5px solid rgba(255,255,255,0.08)",
                }}>
                  {other.avatarUrl
                    ? <img src={other.avatarUrl} alt={other.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : initials(other.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: isUnread ? 700 : 600, color: "var(--text)" }}>
                      {other.name}
                    </span>
                    <span style={{ fontSize: 10.5, color: "var(--text-3)", flexShrink: 0 }}>
                      {timeAgo(convo.lastMessageAt)}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 12, color: isUnread ? "var(--text-2)" : "var(--text-3)",
                    fontWeight: isUnread ? 600 : 400,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {isMine && "You: "}{convo.lastMessage || "Start the conversation…"}
                  </div>
                </div>
                {isUnread && (
                  <div style={{
                    width: 9, height: 9, borderRadius: "50%",
                    background: "var(--green-glow)", boxShadow: "0 0 6px rgba(34,197,94,0.6)",
                    flexShrink: 0,
                  }} />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
