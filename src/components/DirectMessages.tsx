// src/components/DirectMessages.tsx
// Campus Connect — Direct Messages (Step 2: Chat View, read-only)
import { useState, useEffect, useRef } from "react";
import { collection, query, where, orderBy, onSnapshot, limit, addDoc, updateDoc, doc, serverTimestamp, getDoc, setDoc } from "firebase/firestore";import { auth, db } from "../firebase";

type Conversation = {
  id: string;
  participants: string[];
  participantInfo: Record<string, { name: string; avatarUrl?: string }>;
  lastMessage?: string;
  lastMessageAt?: any;
  lastMessageSenderId?: string;
  unreadBy?: string[];
};

type DMMessage = {
  id: string;
  senderId: string;
  content: string;
  createdAt: any;
  read?: boolean;
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

// ── Individual Chat Screen ─────────────────────────────────
const ChatView = ({ convo, currentUser, onBack }: { convo: Conversation; currentUser: any; onBack: () => void }) => {
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const otherUid = convo.participants.find(p => p !== currentUser.uid) || "";
  const other = convo.participantInfo?.[otherUid] || { name: "Unknown", avatarUrl: "" };

  useEffect(() => {
    // Clear unread flag for this user the moment they open the conversation
    if (convo.unreadBy?.includes(currentUser.uid)) {
      updateDoc(doc(db, "conversations", convo.id), {
        unreadBy: convo.unreadBy.filter((uid: string) => uid !== currentUser.uid),
      }).catch(() => {});
    }

    const q = query(
      collection(db, "conversations", convo.id, "messages"),
      orderBy("createdAt", "asc"),
      limit(200)
    );
    
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as DMMessage)));
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }, (err) => {
      console.error("Messages listener error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [convo.id]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, "conversations", convo.id, "messages"), {
        senderId: currentUser.uid,
        content: text.trim(),
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "conversations", convo.id), {
        lastMessage: text.trim(),
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: currentUser.uid,
        unreadBy: [otherUid],
      });
      setText("");
    } finally {
      setSending(false);
    }
  };

  // Group consecutive messages from the same sender
  const grouped = messages.map((msg, i) => ({
    ...msg,
    isFirst: i === 0 || messages[i - 1].senderId !== msg.senderId,
    isLast: i === messages.length - 1 || messages[i + 1].senderId !== msg.senderId,
  }));

  return (
    <div style={{
      maxWidth: 640, margin: "0 auto",
      display: "flex", flexDirection: "column",
      height: "calc(100vh - var(--topbar-h) - var(--bottom-nav-h))",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px", borderBottom: "1px solid var(--border)",
        background: "var(--dark-2)", flexShrink: 0,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button onClick={onBack} style={{
          background: "transparent", border: "none", color: "var(--text-2)",
          fontSize: 14, cursor: "pointer", padding: 4, flexShrink: 0,
        }}>← Back</button>
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: other.avatarUrl ? "transparent" : avatarGrad(otherUid),
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden",
        }}>
          {other.avatarUrl
            ? <img src={other.avatarUrl} alt={other.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : initials(other.name)}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{other.name}</div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "16px 20px",
        display: "flex", flexDirection: "column", gap: 2,
      }}>
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12, justifyContent: i % 2 === 0 ? "flex-end" : "flex-start" }}>
              <div className="skeleton" style={{ height: 36, width: "50%", borderRadius: 14 }} />
            </div>
          ))
        ) : messages.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "var(--text-3)" }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>👋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>Say hello to {other.name}</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>This is the start of your conversation</div>
          </div>
        ) : (
          grouped.map(msg => {
            const mine = msg.senderId === currentUser.uid;
            return (
              <div key={msg.id} style={{
                display: "flex", flexDirection: mine ? "row-reverse" : "row",
                alignItems: "flex-end", gap: 8, marginBottom: msg.isLast ? 10 : 2,
              }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", maxWidth: "72%" }}>
                  <div style={{
                    padding: "9px 13px",
                    borderRadius: mine
                      ? (msg.isFirst ? "16px 4px 16px 16px" : "16px 4px 4px 16px")
                      : (msg.isFirst ? "4px 16px 16px 16px" : "4px 16px 16px 4px"),
                    background: mine ? "linear-gradient(135deg,#166534,#16a34a)" : "rgba(255,255,255,0.06)",
                    border: mine ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,255,255,0.08)",
                    fontSize: 13.5, color: mine ? "#fff" : "var(--text)",
                    lineHeight: 1.55, wordBreak: "break-word",
                  }}>
                    {msg.content}
                  </div>
                  {msg.isLast && (
                    <div style={{ fontSize: 9.5, color: "var(--text-3)", marginTop: 3, marginLeft: 2, marginRight: 2 }}>
                      {timeAgo(msg.createdAt)}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div style={{
        padding: "12px 16px", borderTop: "1px solid var(--border)",
        background: "var(--dark-2)", flexShrink: 0,
        display: "flex", gap: 10, alignItems: "center",
      }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={`Message ${other.name}…`}
          style={{
            flex: 1, padding: "10px 14px",
            background: "rgba(255,255,255,0.05)",
            border: "1.5px solid var(--border)", borderRadius: 100,
            color: "var(--text)", fontSize: 13,
            fontFamily: "'Sora',sans-serif", outline: "none",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{
            width: 40, height: 40, borderRadius: 100,
            background: "linear-gradient(135deg,#166534,#16a34a)",
            border: "1px solid rgba(34,197,94,0.3)",
            color: "#fff", fontSize: 16, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, opacity: (!text.trim() || sending) ? 0.4 : 1,
          }}
        >{sending ? "…" : "➤"}</button>
      </div>
    </div>
  );
};

export async function startConversation(currentUser: any, myProfile: any, otherUid: string, otherProfile: any) {
  const convoId = [currentUser.uid, otherUid].sort().join("_");
  const convoRef = doc(db, "conversations", convoId);
  const existing = await getDoc(convoRef);
  if (!existing.exists()) {
    await setDoc(convoRef, {
      participants: [currentUser.uid, otherUid],
      participantInfo: {
        [currentUser.uid]: { name: myProfile?.name || "Student", avatarUrl: myProfile?.avatarUrl || "" },
        [otherUid]: { name: otherProfile?.name || "Student", avatarUrl: otherProfile?.avatarUrl || "" },
      },
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      lastMessageSenderId: "",
      unreadBy: [],
    });
  }
  return convoId;
}
export default function DirectMessages() {
  const currentUser = auth.currentUser;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);

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

  if (selectedConvo) {
    return <ChatView convo={selectedConvo} currentUser={currentUser} onBack={() => setSelectedConvo(null)} />;
  }

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
              <div
                key={convo.id}
                onClick={() => setSelectedConvo(convo)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 8px", borderRadius: 14, cursor: "pointer",
                  background: isUnread ? "rgba(34,197,94,0.04)" : "transparent",
                  transition: "background 0.15s",
                }}
              >
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
