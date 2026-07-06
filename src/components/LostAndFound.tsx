// src/components/LostAndFound.tsx
// Campus Connect — Lost & Found
import { useState, useEffect, useRef } from "react";
import {
  collection, addDoc, onSnapshot, doc, updateDoc,
  query, orderBy, serverTimestamp, deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";

const ADMIN_UID = "PxIpEGUtJ1NmUbdfEbpvL3YBSLh2";

const CATEGORIES = ["ID Card", "Phone", "Bag", "Book", "Keys", "Wallet", "Laptop/Electronics", "Clothing", "Other"];

type LFItem = {
  id: string;
  uid: string;
  name: string;
  avatarUrl?: string;
  faculty: string;
  department: string;
  level: string;
  type: "lost" | "found";
  category: string;
  description: string;
  location: string;
  imageUrl?: string;
  status: "open" | "resolved";
  createdAt: any;
  resolvedAt?: any;
};

type LFComment = {
  id: string;
  uid: string;
  name: string;
  content: string;
  createdAt: any;
};

function timeAgo(ts: any): string {
  if (!ts) return "just now";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  ["#166534", "#16a34a"], ["#b45309", "#f59e0b"], ["#1d4ed8", "#3b82f6"],
  ["#7c3aed", "#a78bfa"], ["#be123c", "#f43f5e"], ["#0f766e", "#14b8a6"],
];
function avatarGrad(uid: string) {
  const i = uid.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return `linear-gradient(135deg,${AVATAR_COLORS[i][0]},${AVATAR_COLORS[i][1]})`;
}

const uploadToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "campus_connect");
  formData.append("cloud_name", "djibsjyqg");
  formData.append("folder", "lost_and_found");
  const res = await fetch("https://api.cloudinary.com/v1_1/djibsjyqg/image/upload", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Image upload failed");
  const data = await res.json();
  return data.secure_url;
};

// ── Item Comments (simple inline thread) ──────────────────
const ItemComments = ({ itemId, currentUser }: { itemId: string; currentUser: any }) => {
  const [comments, setComments] = useState<LFComment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "lostAndFound", itemId, "comments"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as LFComment)));
    });
    return () => unsub();
  }, [itemId]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, "lostAndFound", itemId, "comments"), {
        uid: currentUser.uid,
        name: currentUser.displayName || "Student",
        content: text.trim(),
        createdAt: serverTimestamp(),
      });
      setText("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
      {comments.map(c => (
        <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 8, flexShrink: 0,
            background: avatarGrad(c.uid), display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff",
          }}>{initials(c.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text)" }}>{c.name}</div>
            <div style={{ fontSize: 12, color: "rgba(240,244,241,0.8)", lineHeight: 1.5 }}>{c.content}</div>
            <div style={{ fontSize: 9.5, color: "var(--text-3)", marginTop: 2 }}>{timeAgo(c.createdAt)}</div>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="I think this is mine… / I saw this…"
          style={{
            flex: 1, padding: "8px 12px", background: "rgba(255,255,255,0.05)",
            border: "1.5px solid var(--border)", borderRadius: 100, color: "var(--text)",
            fontSize: 12, fontFamily: "'Sora',sans-serif", outline: "none",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{
            padding: "8px 16px", borderRadius: 100,
            background: "linear-gradient(135deg,#166534,#16a34a)",
            border: "none", color: "#fff", fontSize: 12, fontWeight: 700,
            fontFamily: "'Sora',sans-serif", cursor: "pointer",
            opacity: (!text.trim() || sending) ? 0.5 : 1,
          }}
        >Send</button>
      </div>
    </div>
  );
};

// ── Report Form ────────────────────────────────────────────
const ReportForm = ({ myProfile, currentUser, onClose, showToast }: any) => {
  const [type, setType] = useState<"lost" | "found">("lost");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!category || !description.trim() || !location.trim()) {
      showToast("Please fill in category, description and location.");
      return;
    }
    setSaving(true);
    try {
      let imageUrl = "";
      if (imageFile) {
        try {
          imageUrl = await uploadToCloudinary(imageFile);
        } catch {
          showToast("Image upload failed — posting without image.");
        }
      }
      await addDoc(collection(db, "lostAndFound"), {
        uid: currentUser.uid,
        name: myProfile?.name || "Student",
        avatarUrl: myProfile?.avatarUrl || "",
        faculty: myProfile?.faculty || "",
        department: myProfile?.department || "",
        level: myProfile?.level || "",
        type,
        category,
        description: description.trim(),
        location: location.trim(),
        imageUrl,
        status: "open",
        createdAt: serverTimestamp(),
      });
      showToast(type === "lost" ? "Lost item reported!" : "Found item reported!");
      onClose();
    } catch {
      showToast("Failed to submit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", background: "var(--dark-3)",
    border: "1.5px solid var(--border)", borderRadius: 10, color: "var(--text)",
    fontSize: 13, fontFamily: "'Sora',sans-serif", outline: "none", marginBottom: 14,
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(5px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "min(460px, 92vw)", maxHeight: "88vh", overflowY: "auto",
        zIndex: 601, background: "var(--dark-2)", border: "1px solid var(--border)",
        borderRadius: 20, padding: "24px 22px", boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
      }}>
        <div style={{ fontFamily: "'Fraunces',serif", fontSize: 19, fontWeight: 700, color: "var(--text)", marginBottom: 18 }}>
          📍 Report Lost or Found Item
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setType("lost")}
            style={{
              flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer",
              fontSize: 12.5, fontWeight: 700, fontFamily: "'Sora',sans-serif",
              border: type === "lost" ? "1.5px solid rgba(244,63,94,0.5)" : "1px solid var(--border)",
              background: type === "lost" ? "rgba(244,63,94,0.1)" : "transparent",
              color: type === "lost" ? "#f43f5e" : "var(--text-3)",
            }}
          >😢 I Lost Something</button>
          <button
            onClick={() => setType("found")}
            style={{
              flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer",
              fontSize: 12.5, fontWeight: 700, fontFamily: "'Sora',sans-serif",
              border: type === "found" ? "1.5px solid rgba(34,197,94,0.5)" : "1px solid var(--border)",
              background: type === "found" ? "rgba(34,197,94,0.1)" : "transparent",
              color: type === "found" ? "var(--green-glow)" : "var(--text-3)",
            }}
          >🎉 I Found Something</button>
        </div>

        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Category *</label>
        <select value={category} onChange={e => setCategory(e.target.value)} style={fieldStyle}>
          <option value="">Select category</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Description *</label>
        <textarea
          value={description} onChange={e => setDescription(e.target.value)} rows={3}
          placeholder={type === "lost" ? "e.g. Black wallet with student ID card inside…" : "e.g. Found a black wallet, has a student ID card…"}
          style={{ ...fieldStyle, resize: "vertical", minHeight: 70 }}
        />

        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
          {type === "lost" ? "Where did you lose it?" : "Where did you find it?"} *
        </label>
        <input
          value={location} onChange={e => setLocation(e.target.value)}
          placeholder="e.g. Faculty of Science lecture hall"
          style={fieldStyle}
        />

        <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Photo (optional)</label>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => {
            const f = e.target.files?.[0];
            if (!f) return;
            setImageFile(f);
            setImagePreview(URL.createObjectURL(f));
          }}
        />
        {imagePreview ? (
          <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", marginBottom: 16 }}>
            <img src={imagePreview} alt="preview" style={{ width: "100%", maxHeight: 180, objectFit: "cover", display: "block" }} />
            <button onClick={() => { setImageFile(null); setImagePreview(null); }} style={{
              position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 50,
              background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", fontSize: 12, cursor: "pointer",
            }}>✕</button>
          </div>
        ) : (
          <div onClick={() => fileRef.current?.click()} style={{
            padding: "20px", border: "2px dashed rgba(255,255,255,0.15)", borderRadius: 12,
            textAlign: "center", cursor: "pointer", color: "var(--text-3)", marginBottom: 16, fontSize: 12.5,
          }}>📷 Tap to add a photo</div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "11px", borderRadius: 100, border: "1px solid var(--border)",
            background: "transparent", color: "var(--text-2)", fontSize: 12.5, fontWeight: 600,
            fontFamily: "'Sora',sans-serif", cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{
            flex: 2, padding: "11px", borderRadius: 100,
            background: "linear-gradient(135deg,#166534,#16a34a)", border: "none",
            color: "#fff", fontSize: 12.5, fontWeight: 700, fontFamily: "'Sora',sans-serif",
            cursor: "pointer", opacity: saving ? 0.5 : 1,
          }}>{saving ? "Submitting…" : "Submit Report"}</button>
        </div>
      </div>
    </>
  );
};

// ── Item Card ───────────────────────────────────────────────
const ItemCard = ({ item, currentUser, onDelete }: { item: LFItem; currentUser: any; onDelete: (item: LFItem) => void }) => {
  const [showComments, setShowComments] = useState(false);
  const isOwner = item.uid === currentUser.uid;
  const isAdmin = currentUser.uid === ADMIN_UID;

  const handleResolve = async () => {
    if (!confirm("Mark this item as resolved? This means it's been returned/reunited with its owner.")) return;
    await updateDoc(doc(db, "lostAndFound", item.id), {
      status: "resolved",
      resolvedAt: serverTimestamp(),
    });
  };

  return (
    <div style={{
      background: item.status === "resolved" ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${item.status === "resolved" ? "var(--border)" : (item.type === "lost" ? "rgba(244,63,94,0.2)" : "rgba(34,197,94,0.2)")}`,
      borderRadius: 16, padding: 16, marginBottom: 14,
      opacity: item.status === "resolved" ? 0.6 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: item.avatarUrl ? "transparent" : avatarGrad(item.uid),
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden",
        }}>
          {item.avatarUrl ? <img src={item.avatarUrl} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(item.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{item.name}</div>
          <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{timeAgo(item.createdAt)}</div>
        </div>
        <span style={{
          padding: "3px 10px", borderRadius: 100, fontSize: 10, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0,
          color: item.type === "lost" ? "#f43f5e" : "var(--green-glow)",
          background: item.type === "lost" ? "rgba(244,63,94,0.1)" : "rgba(34,197,94,0.1)",
          border: `1px solid ${item.type === "lost" ? "rgba(244,63,94,0.25)" : "rgba(34,197,94,0.25)"}`,
        }}>{item.type === "lost" ? "😢 Lost" : "🎉 Found"}</span>
        {item.status === "resolved" && (
          <span style={{
            padding: "3px 10px", borderRadius: 100, fontSize: 10, fontWeight: 700,
            color: "var(--text-3)", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
          }}>✅ Resolved</span>
        )}
      </div>

      <div style={{ display: "inline-block", fontSize: 10.5, fontWeight: 700, color: "#f59e0b", marginBottom: 6 }}>
        📦 {item.category}
      </div>
      <div style={{ fontSize: 13, color: "rgba(240,244,241,0.85)", lineHeight: 1.6, marginBottom: 8 }}>
        {item.description}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: item.imageUrl ? 12 : 0 }}>
        📍 {item.location}
      </div>

      {item.imageUrl && (
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", marginBottom: 12 }}>
          <img src={item.imageUrl} alt={item.category} style={{ width: "100%", maxHeight: 260, objectFit: "cover", display: "block" }} />
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setShowComments(o => !o)} style={{
          flex: 1, padding: "8px", borderRadius: 100, border: "1px solid var(--border)",
          background: "transparent", color: "var(--text-2)", fontSize: 12, fontWeight: 600,
          fontFamily: "'Sora',sans-serif", cursor: "pointer",
        }}>💬 {showComments ? "Hide" : "Comment"}</button>

        {isOwner && item.status === "open" && (
          <button onClick={handleResolve} style={{
            flex: 1, padding: "8px", borderRadius: 100, border: "1px solid rgba(34,197,94,0.3)",
            background: "rgba(34,197,94,0.1)", color: "var(--green-glow)", fontSize: 12, fontWeight: 700,
            fontFamily: "'Sora',sans-serif", cursor: "pointer",
          }}>✅ Mark Resolved</button>
        )}

        {(isOwner || isAdmin) && (
          <button onClick={() => onDelete(item)} style={{
            padding: "8px 14px", borderRadius: 100, border: "1px solid rgba(244,63,94,0.3)",
            background: "rgba(244,63,94,0.08)", color: "#f43f5e", fontSize: 12, fontWeight: 700,
            fontFamily: "'Sora',sans-serif", cursor: "pointer",
          }}>🗑️</button>
        )}
      </div>

      {showComments && <ItemComments itemId={item.id} currentUser={currentUser} />}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────
export default function LostAndFound({ myProfile }: { myProfile: any }) {
  const currentUser = auth.currentUser;
  const [items, setItems] = useState<LFItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "lost" | "found" | "resolved">("all");
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    const q = query(collection(db, "lostAndFound"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as LFItem)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const handleDelete = async (item: LFItem) => {
    if (!confirm(`Delete this ${item.type} item report?`)) return;
    await deleteDoc(doc(db, "lostAndFound", item.id));
  };

  const filtered = items.filter(item => {
    if (filter === "all") return item.status === "open";
    if (filter === "resolved") return item.status === "resolved";
    return item.type === filter && item.status === "open";
  });

  if (!currentUser) return null;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 0 60px" }}>
      <div style={{ padding: "24px 20px 18px", borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 10 }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 700, color: "var(--text)" }}>
            📍 Lost &amp; Found
          </div>
          <button onClick={() => setShowForm(true)} style={{
            padding: "9px 18px", borderRadius: 100,
            background: "linear-gradient(135deg,#b45309,#f59e0b)", border: "none",
            color: "#1a0a00", fontSize: 12.5, fontWeight: 700,
            fontFamily: "'Sora',sans-serif", cursor: "pointer", whiteSpace: "nowrap",
          }}>+ Report Item</button>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-3)", marginBottom: 16 }}>
          Lost something on campus, or found something that isn't yours? Post it here.
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { id: "all", label: "All Open" },
            { id: "lost", label: "😢 Lost" },
            { id: "found", label: "🎉 Found" },
            { id: "resolved", label: "✅ Resolved" },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id as any)} style={{
              padding: "6px 14px", borderRadius: 100, fontSize: 11.5, fontWeight: 700,
              fontFamily: "'Sora',sans-serif", cursor: "pointer",
              border: filter === f.id ? "1.5px solid rgba(34,197,94,0.4)" : "1px solid var(--border)",
              background: filter === f.id ? "rgba(22,163,74,0.1)" : "transparent",
              color: filter === f.id ? "var(--green-glow)" : "var(--text-3)",
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16, marginBottom: 14 }} />)
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>Nothing here yet</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>Be the first to report a lost or found item</div>
          </div>
        ) : (
          filtered.map(item => (
            <ItemCard key={item.id} item={item} currentUser={currentUser} onDelete={handleDelete} />
          ))
        )}
      </div>

      {showForm && (
        <ReportForm
          myProfile={myProfile}
          currentUser={currentUser}
          onClose={() => setShowForm(false)}
          showToast={showToast}
        />
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
          padding: "10px 20px", borderRadius: 100,
          background: "linear-gradient(135deg,rgba(20,83,45,0.95),rgba(14,30,18,0.98))",
          border: "1px solid rgba(34,197,94,0.3)", color: "var(--green-glow)",
          fontSize: 13, fontWeight: 600, fontFamily: "'Sora',sans-serif",
          zIndex: 500, whiteSpace: "nowrap", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
