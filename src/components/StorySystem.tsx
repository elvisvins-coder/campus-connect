// src/components/StorySystem.tsx
// Campus Connect — TASU Story System
// Full Firebase Integration: Stories expire after 24 hours
//
// FIRESTORE COLLECTION:
//   /stories — story documents
//   Fields: uid, name, faculty, department, level, avatarUrl,
//           mediaUrl (base64 or empty), mediaType ("image"|"text"),
//           caption, bgGradient, textColor, createdAt, expiresAt,
//           views: string[] (uids who viewed)
//
// Add to your Firestore security rules:
//   match /stories/{story} {
//     allow read: if request.auth != null;
//     allow create: if request.auth != null;
//     allow update: if request.auth != null; // for view tracking
//     allow delete: if request.auth.uid == resource.data.uid;
//   }

import { useState, useRef, useEffect, useCallback } from "react";
import {
  collection, addDoc, onSnapshot, doc,
  updateDoc, arrayUnion, query, orderBy,
  serverTimestamp, where, deleteDoc, Timestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";

// ── Types ─────────────────────────────────────────────────────
type Story = {
  id: string;
  uid: string;
  name: string;
  faculty: string;
  department: string;
  level: string;
  avatarUrl?: string;
  mediaUrl?: string;
  mediaType: "image" | "text";
  caption?: string;
  bgGradient: string;
  textColor: string;
  createdAt: any;
  expiresAt: any;
  views: string[];
};

type StoryGroup = {
  uid: string;
  name: string;
  avatarUrl?: string;
  faculty: string;
  stories: Story[];
  hasUnviewed: boolean;
};

// ── Constants ─────────────────────────────────────────────────
const STORY_GRADIENTS = [
  { label: "Forest", value: "linear-gradient(135deg,#064e3b,#065f46,#047857)" },
  { label: "Sunset", value: "linear-gradient(135deg,#7c2d12,#b45309,#d97706)" },
  { label: "Ocean", value: "linear-gradient(135deg,#1e3a5f,#1d4ed8,#2563eb)" },
  { label: "Violet", value: "linear-gradient(135deg,#4c1d95,#7c3aed,#8b5cf6)" },
  { label: "Rose",   value: "linear-gradient(135deg,#881337,#be123c,#e11d48)" },
  { label: "Teal",   value: "linear-gradient(135deg,#134e4a,#0f766e,#14b8a6)" },
  { label: "Night",  value: "linear-gradient(135deg,#0f172a,#1e293b,#334155)" },
  { label: "Gold",   value: "linear-gradient(135deg,#78350f,#b45309,#fbbf24)" },
];

const AVATAR_COLORS = [
  ["#166534","#16a34a"],["#b45309","#f59e0b"],["#1d4ed8","#3b82f6"],
  ["#7c3aed","#a78bfa"],["#be123c","#f43f5e"],["#0f766e","#14b8a6"],
];

function avatarGrad(uid: string) {
  const i = uid.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return `linear-gradient(135deg,${AVATAR_COLORS[i][0]},${AVATAR_COLORS[i][1]})`;
}
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}
function timeAgo(ts: any): string {
  if (!ts) return "just now";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function timeLeft(ts: any): string {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

// ── Avatar Component ──────────────────────────────────────────
const Avatar = ({ uid, name, url, size = 40, radius = 12 }: {
  uid: string; name: string; url?: string; size?: number; radius?: number;
}) => (
  <div style={{
    width: size, height: size, borderRadius: radius, flexShrink: 0,
    background: url ? "transparent" : avatarGrad(uid),
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.32, fontWeight: 700, color: "#fff",
    border: "1.5px solid rgba(255,255,255,0.1)", overflow: "hidden",
  }}>
    {url
      ? <img src={url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      : initials(name)}
  </div>
);

// ── Props ─────────────────────────────────────────────────────
type StorySystemProps = {
  myProfile: {
    uid: string; name: string; faculty: string;
    department: string; level: string; avatarUrl?: string;
  } | null;
};

// ─────────────────────────────────────────────────────────────
export function StorySystem({ myProfile }: StorySystemProps) {
  const currentUser = auth.currentUser;
  if (!currentUser || !myProfile) return null;

  // ── State ────────────────────────────────────────────────
  const [stories,       setStories]       = useState<Story[]>([]);
  const [storyGroups,   setStoryGroups]   = useState<StoryGroup[]>([]);
  const [viewerOpen,    setViewerOpen]    = useState(false);
  const [viewerGroup,   setViewerGroup]   = useState<StoryGroup | null>(null);
  const [viewerIdx,     setViewerIdx]     = useState(0);
  const [creatorOpen,   setCreatorOpen]   = useState(false);
  const [progress,      setProgress]      = useState(0);
  const [paused,        setPaused]        = useState(false);

  // Creator state
  const [creatorStep,   setCreatorStep]   = useState<"choose" | "text" | "image">("choose");
  const [caption,       setCaption]       = useState("");
  const [bgGradient,    setBgGradient]    = useState(STORY_GRADIENTS[0].value);
  const [textColor,     setTextColor]     = useState("#ffffff");
  const [storyText,     setStoryText]     = useState("");
  const [imageFile,     setImageFile]     = useState<File | null>(null);
  const [imagePrev,     setImagePrev]     = useState<string | null>(null);
  const [posting,       setPosting]       = useState(false);
  const [toast,         setToast]         = useState("");

  const progressRef  = useRef<any>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const STORY_DURATION = 5000; // 5 seconds per story

  // ── Load Stories (live, filter expired) ──────────────────
  useEffect(() => {
    const now = Timestamp.now();
    const q = query(
      collection(db, "stories"),
      where("expiresAt", ">", now),
      orderBy("expiresAt", "asc"),
    );
    const unsub = onSnapshot(q, snap => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() } as Story));
      setStories(arr);
    }, err => console.error("Stories error:", err));
    return () => unsub();
  }, []);

  // ── Group stories by user ─────────────────────────────────
  useEffect(() => {
    const map: Record<string, StoryGroup> = {};
    stories.forEach(s => {
      if (!map[s.uid]) {
        map[s.uid] = {
          uid: s.uid, name: s.name,
          avatarUrl: s.avatarUrl, faculty: s.faculty,
          stories: [], hasUnviewed: false,
        };
      }
      map[s.uid].stories.push(s);
      if (!s.views.includes(currentUser.uid)) {
        map[s.uid].hasUnviewed = true;
      }
    });

    // Sort: my stories first, then by has-unviewed
    const arr = Object.values(map).sort((a, b) => {
      if (a.uid === currentUser.uid) return -1;
      if (b.uid === currentUser.uid) return 1;
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return 0;
    });
    setStoryGroups(arr);
  }, [stories, currentUser.uid]);

  // ── Story Viewer Progress ─────────────────────────────────
  const startProgress = useCallback(() => {
    setProgress(0);
    const start = Date.now();
    clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      if (paused) return;
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(progressRef.current);
        nextStory();
      }
    }, 50);
  }, [paused]);

  useEffect(() => {
    if (viewerOpen && viewerGroup) {
      const story = viewerGroup.stories[viewerIdx];
      // Mark as viewed
      if (!story.views.includes(currentUser.uid)) {
        updateDoc(doc(db, "stories", story.id), {
          views: arrayUnion(currentUser.uid),
        }).catch(() => {});
      }
      startProgress();
    }
    return () => clearInterval(progressRef.current);
  }, [viewerOpen, viewerGroup, viewerIdx]);

  const nextStory = useCallback(() => {
    if (!viewerGroup) return;
    if (viewerIdx < viewerGroup.stories.length - 1) {
      setViewerIdx(i => i + 1);
    } else {
      // Move to next group
      const groupIdx = storyGroups.findIndex(g => g.uid === viewerGroup.uid);
      if (groupIdx < storyGroups.length - 1) {
        setViewerGroup(storyGroups[groupIdx + 1]);
        setViewerIdx(0);
      } else {
        closeViewer();
      }
    }
  }, [viewerGroup, viewerIdx, storyGroups]);

  const prevStory = useCallback(() => {
    if (viewerIdx > 0) {
      setViewerIdx(i => i - 1);
    } else {
      const groupIdx = storyGroups.findIndex(g => g.uid === viewerGroup?.uid);
      if (groupIdx > 0) {
        setViewerGroup(storyGroups[groupIdx - 1]);
        setViewerIdx(0);
      }
    }
  }, [viewerGroup, viewerIdx, storyGroups]);

  const openViewer = (group: StoryGroup, idx = 0) => {
    setViewerGroup(group);
    setViewerIdx(idx);
    setViewerOpen(true);
    setPaused(false);
  };

  const closeViewer = () => {
    clearInterval(progressRef.current);
    setViewerOpen(false);
    setViewerGroup(null);
    setViewerIdx(0);
    setProgress(0);
  };

  // ── Delete my story ───────────────────────────────────────
  const deleteStory = async (storyId: string) => {
    try {
      await deleteDoc(doc(db, "stories", storyId));
      showToast("Story deleted");
    } catch (e) {
      console.error(e);
    }
  };

  // ── Post Story ────────────────────────────────────────────
  const handlePostStory = async () => {
    if (creatorStep === "text" && !storyText.trim()) return;
    if (creatorStep === "image" && !imagePrev) return;
    setPosting(true);
    try {
      // Upload image to Cloudinary
      let finalImageUrl = "";
      if (creatorStep === "image" && imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("upload_preset", "campus_connect");
        formData.append("cloud_name", "djibsjyqg");
        formData.append("folder", "stories");
        const res = await fetch(
          "https://api.cloudinary.com/v1_1/djibsjyqg/image/upload",
          { method: "POST", body: formData }
        );
        if (!res.ok) throw new Error("Image upload failed");
        const data = await res.json();
        finalImageUrl = data.secure_url;
      }
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await addDoc(collection(db, "stories"), {
        uid:        currentUser.uid,
        name:       myProfile.name,
        faculty:    myProfile.faculty,
        department: myProfile.department,
        level:      myProfile.level,
        avatarUrl:  myProfile.avatarUrl || "",
        mediaUrl:   creatorStep === "image" ? finalImageUrl : "",
        mediaType:  creatorStep === "image" ? "image" : "text",
        caption:    caption.trim(),
        bgGradient,
        textColor,
        storyText:  creatorStep === "text" ? storyText.trim() : "",
        views:      [],
        createdAt:  serverTimestamp(),
        expiresAt:  Timestamp.fromDate(expiresAt),
      });
      resetCreator();
      showToast("Story posted! It'll disappear in 24h ✨");
    } catch (e) {
      console.error(e);
      showToast("Failed to post story");
    } finally {
      setPosting(false);
    }
  };

  const resetCreator = () => {
    setCreatorOpen(false);
    setCreatorStep("choose");
    setCaption("");
    setStoryText("");
    setBgGradient(STORY_GRADIENTS[0].value);
    setTextColor("#ffffff");
    setImageFile(null);
    setImagePrev(null);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // My story group
  const myGroup = storyGroups.find(g => g.uid === currentUser.uid);

  // ─────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        /* ── Story Styles ── */
        .story-row {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding-bottom: 20px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .story-row::-webkit-scrollbar { display: none; }

        /* Story bubble */
        .story-bubble {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          flex-shrink: 0;
          transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1);
        }
        .story-bubble:hover { transform: translateY(-4px) scale(1.04); }
        .story-bubble:active { transform: scale(0.96); }

        .story-ring {
          width: 62px; height: 62px;
          border-radius: 50%;
          padding: 2.5px;
          background: conic-gradient(#22c55e, #f59e0b, #22c55e);
          display: flex; align-items: center; justify-content: center;
          position: relative;
          transition: box-shadow 0.2s;
        }
        .story-ring.viewed {
          background: rgba(255,255,255,0.1);
          padding: 2px;
          border: 2px solid rgba(255,255,255,0.15);
        }
        .story-ring.is-me {
          background: transparent;
          padding: 0;
          border: 2px dashed rgba(255,255,255,0.2);
        }
        .story-ring:hover { box-shadow: 0 0 0 3px rgba(34,197,94,0.15); }

        .story-inner {
          width: 100%; height: 100%;
          border-radius: 50%;
          border: 2.5px solid #060d08;
          overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 700; color: #fff;
        }
        .story-add-icon {
          width: 62px; height: 62px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.05);
          font-size: 22px;
        }
        .story-name {
          font-size: 10px; font-weight: 500;
          color: rgba(240,244,241,0.55);
          max-width: 62px; text-align: center;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .story-bubble .story-name.me { color: #22c55e; font-weight: 600; }

        /* ── Story Viewer ── */
        .story-viewer-overlay {
          position: fixed; inset: 0; z-index: 600;
          background: rgba(0,0,0,0.92);
          display: flex; align-items: center; justify-content: center;
          animation: sv-fade 0.22s ease;
        }
        @keyframes sv-fade { from { opacity:0; } to { opacity:1; } }

        .story-viewer {
          position: relative;
          width: min(420px, 100vw);
          height: min(720px, calc(100vh - 40px));
          border-radius: 20px;
          overflow: hidden;
          background: #000;
          box-shadow: 0 32px 80px rgba(0,0,0,0.9);
          animation: sv-pop 0.28s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes sv-pop {
          from { transform: scale(0.88); opacity:0; }
          to   { transform: scale(1);   opacity:1; }
        }

        /* Progress bars */
        .sv-progress-row {
          position: absolute; top: 0; left: 0; right: 0;
          z-index: 10;
          display: flex; gap: 3px; padding: 12px 12px 0;
        }
        .sv-prog-track {
          flex: 1; height: 2.5px; border-radius: 2px;
          background: rgba(255,255,255,0.22);
          overflow: hidden;
        }
        .sv-prog-fill {
          height: 100%; border-radius: 2px;
          background: #fff;
          transition: none;
        }

        /* Header */
        .sv-header {
          position: absolute; top: 24px; left: 0; right: 0;
          z-index: 10;
          display: flex; align-items: center; gap: 10px;
          padding: 0 14px;
        }
        .sv-name { font-size: 13px; font-weight: 700; color: #fff; }
        .sv-time { font-size: 11px; color: rgba(255,255,255,0.55); }
        .sv-close {
          margin-left: auto;
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(0,0,0,0.4);
          border: none; color: #fff; font-size: 14px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
        }
        .sv-close:hover { background: rgba(0,0,0,0.65); }

        /* Delete btn (my stories) */
        .sv-delete-btn {
          position: absolute; bottom: 80px; right: 14px;
          z-index: 11;
          padding: 6px 14px; border-radius: 100px;
          background: rgba(244,63,94,0.2);
          border: 1px solid rgba(244,63,94,0.35);
          color: #f43f5e; font-size: 11px; font-weight: 700;
          font-family: 'Sora', sans-serif; cursor: pointer;
          transition: all 0.15s;
        }
        .sv-delete-btn:hover { background: rgba(244,63,94,0.35); }

        /* Media */
        .sv-media { width:100%; height:100%; object-fit:cover; display:block; }
        .sv-text-slide {
          width:100%; height:100%;
          display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          padding: 40px 28px;
          text-align: center;
        }
        .sv-text-content {
          font-family: 'Fraunces', serif;
          font-size: clamp(22px, 5.5vw, 32px);
          font-weight: 700; line-height: 1.4;
          letter-spacing: -0.01em;
          word-break: break-word;
          text-shadow: 0 2px 12px rgba(0,0,0,0.3);
        }
        .sv-caption {
          position: absolute; bottom: 60px; left: 16px; right: 16px;
          z-index: 10;
          text-align: center;
          font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.9);
          text-shadow: 0 1px 6px rgba(0,0,0,0.5);
          background: rgba(0,0,0,0.25);
          padding: 8px 16px; border-radius: 100px;
          backdrop-filter: blur(8px);
        }

        /* Tap zones */
        .sv-tap-left, .sv-tap-right {
          position: absolute; top: 0; bottom: 0;
          z-index: 9; width: 40%;
          cursor: pointer;
        }
        .sv-tap-left  { left: 0; }
        .sv-tap-right { right: 0; }

        /* Views count */
        .sv-views {
          position: absolute; bottom: 16px; left: 0; right: 0;
          z-index: 10; text-align: center;
          font-size: 11px; color: rgba(255,255,255,0.4);
          font-family: 'Sora', sans-serif;
        }

        /* ── Story Creator ── */
        .story-creator-overlay {
          position: fixed; inset: 0; z-index: 600;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          animation: sv-fade 0.2s ease;
        }
        .story-creator {
          width: min(440px, 96vw);
          background: rgba(10,21,16,0.98);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          overflow: hidden;
          animation: sv-pop 0.28s cubic-bezier(0.16,1,0.3,1);
          max-height: 90vh;
          overflow-y: auto;
        }
        .sc-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 20px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .sc-title {
          font-family: 'Fraunces', serif;
          font-size: 17px; font-weight: 700; color: #f0f4f1;
        }
        .sc-close {
          width: 30px; height: 30px; border-radius: 8px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(240,244,241,0.6); font-size: 13px;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
        }

        /* Step: choose */
        .sc-choose-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 14px; padding: 24px;
        }
        .sc-choose-card {
          aspect-ratio: 9/10;
          border-radius: 18px; overflow: hidden;
          cursor: pointer; position: relative;
          border: 2px solid transparent;
          transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 12px;
        }
        .sc-choose-card:hover { transform: translateY(-4px); border-color: rgba(34,197,94,0.35); }
        .sc-choose-card-icon { font-size: 36px; }
        .sc-choose-card-label {
          font-size: 13px; font-weight: 700; color: #fff;
          font-family: 'Sora', sans-serif;
        }
        .sc-choose-card-sub {
          font-size: 11px; color: rgba(255,255,255,0.55);
          font-family: 'Sora', sans-serif; text-align: center; padding: 0 12px;
        }

        /* Step: compose */
        .sc-preview {
          margin: 0 20px 16px;
          border-radius: 18px; overflow: hidden;
          position: relative;
          aspect-ratio: 9/16;
          max-height: 340px;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.3s;
        }
        .sc-preview-text {
          font-family: 'Fraunces', serif;
          font-size: clamp(18px, 4.5vw, 26px);
          font-weight: 700; line-height: 1.4;
          text-align: center; padding: 24px; word-break: break-word;
          width: 100%;
          text-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .sc-preview img {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .sc-fields { padding: 0 20px 20px; display: flex; flex-direction: column; gap: 14px; }

        .sc-label {
          font-size: 10px; font-weight: 700; color: rgba(240,244,241,0.35);
          text-transform: uppercase; letter-spacing: 0.1em;
          display: block; margin-bottom: 6px;
        }
        .sc-input {
          width: 100%; padding: 10px 14px;
          background: rgba(255,255,255,0.05);
          border: 1.5px solid rgba(255,255,255,0.09);
          border-radius: 10px; color: #f0f4f1;
          font-size: 13px; font-family: 'Sora', sans-serif; outline: none;
          resize: none; transition: border-color 0.2s;
        }
        .sc-input:focus { border-color: rgba(245,158,11,0.35); }
        .sc-textarea {
          min-height: 80px; max-height: 140px;
        }

        /* Gradient picker */
        .sc-grad-row {
          display: flex; gap: 8px; flex-wrap: wrap;
        }
        .sc-grad-swatch {
          width: 32px; height: 32px; border-radius: 8px;
          cursor: pointer; border: 2.5px solid transparent;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .sc-grad-swatch.selected { border-color: #fff; transform: scale(1.15); }
        .sc-grad-swatch:hover:not(.selected) { transform: scale(1.08); }

        /* Text color row */
        .sc-color-row { display: flex; gap: 8px; align-items: center; }
        .sc-color-swatch {
          width: 26px; height: 26px; border-radius: 50%;
          cursor: pointer; border: 2px solid transparent;
          transition: all 0.15s; flex-shrink: 0;
        }
        .sc-color-swatch.selected { border-color: rgba(255,255,255,0.8); transform: scale(1.15); }

        /* Post button */
        .sc-post-btn {
          width: 100%; padding: 13px;
          border-radius: 14px; border: none;
          background: linear-gradient(135deg,#b45309,#f59e0b);
          color: #1a0a00; font-size: 14px; font-weight: 700;
          font-family: 'Sora', sans-serif; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 6px 20px rgba(180,83,9,0.3);
          transition: all 0.2s;
        }
        .sc-post-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(180,83,9,0.45); }
        .sc-post-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        .sc-back-btn {
          width: 100%; padding: 10px;
          border-radius: 12px; border: 1px solid rgba(255,255,255,0.09);
          background: transparent; color: rgba(240,244,241,0.5);
          font-size: 12px; font-weight: 600;
          font-family: 'Sora', sans-serif; cursor: pointer;
          transition: all 0.15s; margin-top: 4px;
        }
        .sc-back-btn:hover { background: rgba(255,255,255,0.04); color: rgba(240,244,241,0.75); }

        /* Time left badge */
        .story-time-badge {
          position: absolute; bottom: 4px;
          left: 50%; transform: translateX(-50%);
          background: rgba(0,0,0,0.55);
          border-radius: 100px; padding: 1px 6px;
          font-size: 8.5px; color: rgba(255,255,255,0.7);
          font-weight: 600; white-space: nowrap;
          font-family: 'Sora', sans-serif;
        }

        .story-spinner {
          width: 16px; height: 16px;
          border: 2.5px solid rgba(26,10,0,0.25);
          border-top-color: #1a0a00;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Toast */
        .story-toast {
          position: fixed; bottom: 90px; left: 50%;
          transform: translateX(-50%);
          padding: 10px 22px; border-radius: 100px;
          background: linear-gradient(135deg,rgba(20,83,45,0.97),rgba(14,30,18,0.99));
          border: 1px solid rgba(34,197,94,0.3);
          color: #22c55e; font-size: 13px; font-weight: 600;
          font-family: 'Sora', sans-serif;
          z-index: 700; white-space: nowrap;
          animation: toast-pop 0.3s cubic-bezier(0.16,1,0.3,1);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        @keyframes toast-pop {
          from { opacity:0; transform:translateX(-50%) translateY(14px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }

        @media (max-width: 480px) {
          .story-viewer { border-radius: 0; height: 100dvh; width: 100vw; }
          .sc-choose-grid { grid-template-columns: 1fr 1fr; gap: 10px; padding: 16px; }
        }
      `}</style>

     {/* ── Stories Row ── */}
<div className="story-row">

  {/* My Story / Add Story */}
  <div
    className="story-bubble"
    onClick={() => myGroup ? openViewer(myGroup) : setCreatorOpen(true)}
  >
    <div className={`story-ring${myGroup ? (myGroup.hasUnviewed ? "" : " viewed") : " is-me"}`}>
      {myGroup ? (
        <div className="story-inner" style={{
          background: "transparent",
          overflow: "hidden",
        }}>
          {myGroup.stories[0]?.mediaType === "image" && myGroup.stories[0]?.mediaUrl
            ? <img src={myGroup.stories[0].mediaUrl} alt="my story" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : myGroup.stories[0]?.mediaType === "text"
            ? <div style={{
                width: "100%", height: "100%",
                background: myGroup.stories[0].bgGradient,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700,
                color: (myGroup.stories[0] as any).textColor || "#fff",
                padding: "4px", textAlign: "center", lineHeight: 1.2,
                overflow: "hidden",
              }}>
                {(myGroup.stories[0] as any).storyText?.slice(0, 20) || ""}
              </div>
            : myProfile.avatarUrl
            ? <img src={myProfile.avatarUrl} alt="me" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{
                width: "100%", height: "100%",
                background: avatarGrad(currentUser.uid),
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 700, color: "#fff",
              }}>{initials(myProfile.name)}</div>
          }
        </div>
      ) : (
        <div className="story-add-icon">➕</div>
      )}
    </div>
    {myGroup && (
      <div className="story-time-badge">{timeLeft(myGroup.stories[0]?.expiresAt)}</div>
    )}
    <span className="story-name me">
      {myGroup ? "My Story" : "Add Story"}
    </span>
  </div>

  {/* Add new story button if I already have stories */}
  {myGroup && (
    <div
      className="story-bubble"
      onClick={() => setCreatorOpen(true)}
    >
      <div className="story-ring is-me">
        <div className="story-add-icon">✏️</div>
      </div>
      <span className="story-name">New</span>
    </div>
  )}

  {/* Other users' stories */}
  {storyGroups
    .filter(g => g.uid !== currentUser.uid)
    .map(group => (
      <div
        key={group.uid}
        className="story-bubble"
        onClick={() => openViewer(group)}
      >
        <div className={`story-ring${group.hasUnviewed ? "" : " viewed"}`}>
          <div className="story-inner" style={{ background: "transparent", overflow: "hidden" }}>
            {group.stories[0]?.mediaType === "image" && group.stories[0]?.mediaUrl
              ? <img src={group.stories[0].mediaUrl} alt={group.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : group.stories[0]?.mediaType === "text"
              ? <div style={{
                  width: "100%", height: "100%",
                  background: group.stories[0].bgGradient,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700,
                  color: (group.stories[0] as any).textColor || "#fff",
                  padding: "4px", textAlign: "center", lineHeight: 1.2,
                  overflow: "hidden",
                }}>
                  {(group.stories[0] as any).storyText?.slice(0, 20) || ""}
                </div>
              : group.avatarUrl
              ? <img src={group.avatarUrl} alt={group.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{
                  width: "100%", height: "100%",
                  background: avatarGrad(group.uid),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 700, color: "#fff",
                }}>{initials(group.name)}</div>
            }
          </div>
        </div>
        <span className="story-name">{group.name.split(" ")[0]}</span>
      </div>
    ))}
</div>

      {/* ── Story Viewer ── */}
      {viewerOpen && viewerGroup && (() => {
        const story = viewerGroup.stories[viewerIdx];
        if (!story) return null;
        const isMe = story.uid === currentUser.uid;
        return (
          <div className="story-viewer-overlay" onClick={closeViewer}>
            <div className="story-viewer" onClick={e => e.stopPropagation()}>

              {/* Progress bars */}
              <div className="sv-progress-row">
                {viewerGroup.stories.map((_, i) => (
                  <div key={i} className="sv-prog-track">
                    <div
                      className="sv-prog-fill"
                      style={{
                        width: i < viewerIdx ? "100%"
                          : i === viewerIdx ? `${progress}%`
                          : "0%",
                        transition: i === viewerIdx ? "width 0.1s linear" : "none",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Header */}
              <div className="sv-header" style={{ top: 32 }}>
                <Avatar uid={story.uid} name={story.name} url={story.avatarUrl} size={34} radius={10} />
                <div>
                  <div className="sv-name">{story.name}</div>
                  <div className="sv-time">{timeAgo(story.createdAt)} · {timeLeft(story.expiresAt)}</div>
                </div>
                <button className="sv-close" onClick={closeViewer}>✕</button>
              </div>

              {/* Media */}
              <div style={{ width: "100%", height: "100%", background: story.bgGradient }}>
                {story.mediaType === "image" && story.mediaUrl ? (
                  <img
                    src={story.mediaUrl}
                    alt="story"
                    className="sv-media"
                  />
                ) : (
                  <div className="sv-text-slide" style={{ background: story.bgGradient }}>
                    <div
                      className="sv-text-content"
                      style={{ color: (story as any).textColor || "#fff" }}
                    >
                      {(story as any).storyText || story.caption}
                    </div>
                  </div>
                )}
              </div>

              {/* Caption (for image stories) */}
              {story.mediaType === "image" && story.caption && (
                <div className="sv-caption">{story.caption}</div>
              )}

              {/* My story: delete */}
              {isMe && (
                <button
                  className="sv-delete-btn"
                  onClick={() => { deleteStory(story.id); nextStory(); }}
                >
                  🗑️ Delete
                </button>
              )}

              {/* Views */}
              <div className="sv-views">
                👁️ {story.views.length} {story.views.length === 1 ? "view" : "views"}
              </div>

              {/* Tap zones */}
              <div
                className="sv-tap-left"
                onClick={prevStory}
                onMouseDown={() => setPaused(true)}
                onMouseUp={() => setPaused(false)}
              />
              <div
                className="sv-tap-right"
                onClick={nextStory}
                onMouseDown={() => setPaused(true)}
                onMouseUp={() => setPaused(false)}
              />
            </div>
          </div>
        );
      })()}

      {/* ── Story Creator ── */}
      {creatorOpen && (
        <div className="story-creator-overlay" onClick={resetCreator}>
          <div className="story-creator" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="sc-header">
              <span className="sc-title">
                {creatorStep === "choose" ? "Create Story" : creatorStep === "text" ? "✍️ Text Story" : "🖼️ Photo Story"}
              </span>
              <button className="sc-close" onClick={resetCreator}>✕</button>
            </div>

            {/* Step: Choose type */}
            {creatorStep === "choose" && (
              <div className="sc-choose-grid">
                <div
                  className="sc-choose-card"
                  style={{ background: "linear-gradient(135deg,#064e3b,#065f46,#047857)" }}
                  onClick={() => setCreatorStep("text")}
                >
                  <div className="sc-choose-card-icon">✍️</div>
                  <div className="sc-choose-card-label">Text Story</div>
                  <div className="sc-choose-card-sub">Share a thought or announcement</div>
                </div>
                <div
                  className="sc-choose-card"
                  style={{ background: "linear-gradient(135deg,#78350f,#b45309,#d97706)" }}
                  onClick={() => { setCreatorStep("image"); imageInputRef.current?.click(); }}
                >
                  <div className="sc-choose-card-icon">🖼️</div>
                  <div className="sc-choose-card-label">Photo Story</div>
                  <div className="sc-choose-card-sub">Share a moment from campus</div>
                </div>
              </div>
            )}

            {/* Hidden image input */}
            <input
              ref={imageInputRef}
              type="file" accept="image/*"
              style={{ display: "none" }}
              onChange={e => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 10 * 1024 * 1024) {
                  showToast("Image must be under 10MB");
                  return;
                }
                setImageFile(f);
                // Show local preview while uploading
                const reader = new FileReader();
                reader.onload = () => setImagePrev(reader.result as string);
                reader.readAsDataURL(f);
                e.target.value = "";
              }}
            />

            {/* Step: Text Story */}
            {creatorStep === "text" && (
              <>
                {/* Preview */}
                <div className="sc-preview" style={{ background: bgGradient }}>
                  <div
                    className="sc-preview-text"
                    style={{ color: textColor, minHeight: 60 }}
                  >
                    {storyText || <span style={{ opacity: 0.35 }}>Your text appears here…</span>}
                  </div>
                </div>

                <div className="sc-fields">
                  {/* Text */}
                  <div>
                    <label className="sc-label">Story Text *</label>
                    <textarea
                      className="sc-input sc-textarea"
                      placeholder="What's on your mind?"
                      value={storyText}
                      onChange={e => setStoryText(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Background */}
                  <div>
                    <label className="sc-label">Background</label>
                    <div className="sc-grad-row">
                      {STORY_GRADIENTS.map(g => (
                        <div
                          key={g.value}
                          className={`sc-grad-swatch${bgGradient === g.value ? " selected" : ""}`}
                          style={{ background: g.value }}
                          onClick={() => setBgGradient(g.value)}
                          title={g.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Text color */}
                  <div>
                    <label className="sc-label">Text Color</label>
                    <div className="sc-color-row">
                      {["#ffffff","#000000","#fde68a","#86efac","#93c5fd","#f9a8d4"].map(c => (
                        <div
                          key={c}
                          className={`sc-color-swatch${textColor === c ? " selected" : ""}`}
                          style={{ background: c, border: textColor === c ? "2.5px solid rgba(255,255,255,0.8)" : `2px solid rgba(255,255,255,0.2)` }}
                          onClick={() => setTextColor(c)}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    className="sc-post-btn"
                    onClick={handlePostStory}
                    disabled={posting || !storyText.trim()}
                  >
                    {posting ? <div className="story-spinner" /> : "📤 Share Story"}
                  </button>
                  <button className="sc-back-btn" onClick={() => setCreatorStep("choose")}>
                    ← Back
                  </button>
                </div>
              </>
            )}

            {/* Step: Photo Story */}
            {creatorStep === "image" && (
              <>
                {/* Preview */}
                <div
                  className="sc-preview"
                  style={{ background: bgGradient, cursor: "pointer" }}
                  onClick={() => imageInputRef.current?.click()}
                >
                  {imagePrev
                    ? <img src={imagePrev} alt="preview" />
                    : <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
                        <div style={{ fontSize: 40, marginBottom: 10 }}>📷</div>
                        <div style={{ fontSize: 13, fontFamily: "'Sora',sans-serif", fontWeight: 600 }}>Tap to choose photo</div>
                      </div>
                  }
                 {imagePrev && (
                    <div style={{
                      position: "absolute", top: 10, right: 10,
                      background: "rgba(0,0,0,0.55)", borderRadius: 8,
                      padding: "4px 8px", fontSize: 11, color: "#fff",
                      fontFamily: "'Sora',sans-serif", fontWeight: 600,
                      cursor: "pointer",
                    }}
                      onClick={e => {
                        e.stopPropagation();
                        setImagePrev(null);
                        setImageFile(null);
                        setTimeout(() => imageInputRef.current?.click(), 100);
                      }}
                    >📷 Change Photo</div>
                  )}
                </div>

                <div className="sc-fields">
                  {/* Caption */}
                  <div>
                    <label className="sc-label">Caption (optional)</label>
                    <input
                      className="sc-input"
                      placeholder="Add a caption…"
                      value={caption}
                      onChange={e => setCaption(e.target.value)}
                    />
                  </div>

                  <button
                    className="sc-post-btn"
                    onClick={handlePostStory}
                    disabled={posting || !imagePrev}
                  >
                    {posting
                      ? <><div className="story-spinner" /><span style={{marginLeft:8}}>Uploading…</span></>
                      : "📤 Share Story"}
                  </button>
                  <button className="sc-back-btn" onClick={() => { setCreatorStep("choose"); setImagePrev(null); setImageFile(null); }}>
                    ← Back
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="story-toast">✓ {toast}</div>}
    </>
  );
}
