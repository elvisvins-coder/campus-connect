// src/components/Departments.tsx
// Campus Connect — TASU Department Hub
// Shows: Department Info, Posts, Students, Discussion Board

import { useState, useEffect, useRef } from "react";
import {
  collection, query, where, orderBy, onSnapshot,
  getDocs, addDoc, serverTimestamp, limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { auth } from "../firebase";

const ADMIN_UID = "PxIpEGUtJ1NmUbdfEbpvL3YBSLh2";

// ── Types ─────────────────────────────────────────────────────
type UserProfile = {
  uid: string;
  name: string;
  faculty: string;
  department: string;
  level: string;
  bio?: string;
  avatarUrl?: string;
};

type Post = {
  id: string;
  uid: string;
  name: string;
  faculty: string;
  department: string;
  level: string;
  avatarUrl?: string;
  createdAt: any;
  content: string;
  tag?: string;
  likes: string[];
  bookmarks: string[];
  comments: number;
  imageUrl?: string;
};

type ChatMessage = {
  id: string;
  uid: string;
  name: string;
  avatarUrl?: string;
  level: string;
  content: string;
  createdAt: any;
};

type DeptInfo = {
  name: string;
  faculty: string;
  description: string;
  icon: string;
  color: string;
};

// ── Faculty → Department mapping ──────────────────────────────
const FACULTY_DEPT_MAP: Record<string, string[]> = {
  "Management Sciences": [
    "Accounting",
    "Business Administration",
    "Economics",
    "Public Administration",
    "Tourism Studies",
  ],
  "Health Science": [
    "Medical Laboratory Science",
    "Nursing / Nursing Science",
    "Public Health",
    "Environmental Health Science",
  ],
  "Agriculture": [
    "Agricultural and Bio-Resources Engineering",
    "Agricultural Economics and Extension",
    "Agricultural Science and Education",
    "Agriculture",
    "Agronomy",
    "Animal Science",
    "Forestry And Wildlife Management",
    "Zoology",
  ],
  "Education": [
    "Business Education",
    "Education and Biology",
    "Education and Chemistry",
    "Education and Christian Religious Studies",
    "Education and Computer Science",
    "Education and Economics",
    "Education and English Language",
    "Education and Geography",
    "Education and Hausa",
    "Education and History",
    "Education and Integrated Science",
    "Education and Islamic Studies",
    "Education and Mathematics",
    "Education and Physics",
    "Education and Political Science",
    "Education and Science",
    "Education and Social Science",
    "Education Arts",
    "Educational Administration and Planning",
    "Guidance and Counseling",
    "Home Economics and Education",
    "Human Kinetics",
    "Library and Information Science",
    "Primary Education Studies",
    "Teacher Education Science",
    "Technology Education",
  ],
  "Engineering": [
    "Civil Engineering",
    "Electrical / Electronics Engineering",
    "Mechanical Engineering",
  ],
  "Sciences": [
    "Botany",
    "Chemistry",
    "Computer Science",
    "Mathematics",
    "Physics",
    "Statistics",
  ],
  "Law": [
    "Law",
  ],
  "Social Science": [
    "Geography",
    "Peace Studies And Conflict Resolution",
    "Political Science and International Relations",
    "Psychology",
    "Sociology",
  ],
  "Arts": [
    "Arabic Studies",
    "Christian Religious Knowledge / Studies",
    "Christian Religious Studies (CRS)",
    "English Language",
    "French",
    "Hausa",
    "History and Archaology",
    "History and Archeology",
    "Islamic Studies",
    "Linguistics / English",
    "Linguistics / Hausa",
    "Theatre And Film Studies",
  ],
  "Communication and Media Studies": [
    "Mass Communication",
  ],
};

// Faculty display order (my faculty first is handled dynamically)
const FACULTY_ORDER = [
  "Management Sciences",
  "Health Science",
  "Agriculture",
  "Education",
  "Engineering",
  "Sciences",
  "Law",
  "Social Science",
  "Arts",
  "Communication and Media Studies",
];

const FACULTY_ICONS: Record<string, string> = {
  "Management Sciences": "📊",
  "Health Science": "🏥",
  "Agriculture": "🌾",
  "Education": "📚",
  "Engineering": "⚙️",
  "Sciences": "🔬",
  "Law": "⚖️",
  "Social Science": "🌍",
  "Arts": "🎭",
  "Communication and Media Studies": "📡",
};

const FACULTY_COLORS: Record<string, [string, string]> = {
  "Management Sciences": ["#1d4ed8", "#3b82f6"],
  "Health Science":      ["#be123c", "#f43f5e"],
  "Agriculture":         ["#166534", "#22c55e"],
  "Education":           ["#0f766e", "#14b8a6"],
  "Engineering":         ["#7c3aed", "#a78bfa"],
  "Sciences":            ["#0369a1", "#38bdf8"],
  "Law":                 ["#78350f", "#f59e0b"],
  "Social Science":      ["#065f46", "#34d399"],
  "Arts":                ["#831843", "#f472b6"],
  "Communication and Media Studies": ["#1e3a5f", "#60a5fa"],
};

// ── Helpers ───────────────────────────────────────────────────
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

// Dept descriptions
function getDeptDescription(dept: string, faculty: string): string {
  const descriptions: Record<string, string> = {
    "Computer Science": "Covers algorithms, software engineering, AI, networks, and systems design. Prepares students for careers in tech and software development.",
    "Law": "A rigorous programme covering constitutional, civil, criminal, and international law. Students are prepared for the Nigerian Bar and legal practice.",
    "Mass Communication": "Trains students in journalism, broadcasting, public relations, and digital media. Focus on ethics, storytelling, and modern media platforms.",
    "Nursing / Nursing Science": "Combines clinical training with healthcare theory. Students develop skills in patient care, pharmacology, and community health.",
    "Accounting": "Covers financial reporting, auditing, taxation, and management accounting aligned with ICAN and ACCA standards.",
    "Mechanical Engineering": "Focuses on design, manufacturing, thermodynamics, and fluid mechanics. Strong emphasis on practical workshops and projects.",
    "Civil Engineering": "Covers structural analysis, transportation, geotechnics, and environmental engineering for infrastructure development.",
    "Electrical / Electronics Engineering": "Covers power systems, digital electronics, control systems, and telecommunications engineering.",
    "Medical Laboratory Science": "Trains students in clinical laboratory methods, diagnostics, and biomedical analysis across haematology, microbiology, and biochemistry.",
    "Public Health": "Studies epidemiology, health policy, environmental health, and disease prevention at community and national levels.",
    "Agriculture": "An interdisciplinary programme covering crop science, animal husbandry, soil management, and agricultural economics.",
    "Economics": "Examines micro and macroeconomic theory, econometrics, development economics, and economic policy in the Nigerian context.",
    "Business Administration": "Covers management, entrepreneurship, operations, marketing, and organisational behaviour for future business leaders.",
    "Mathematics": "Pure and applied mathematics including analysis, algebra, numerical methods, and mathematical modelling.",
    "Physics": "From classical mechanics to quantum physics and optics. Strong laboratory component for experimental skills.",
    "Chemistry": "Covers organic, inorganic, physical, and analytical chemistry with well-equipped labs for practical training.",
    "English Language": "Studies literature, linguistics, creative writing, and communication. A foundation for journalism, education, and law.",
    "Political Science and International Relations": "Examines governance, foreign policy, global institutions, and Nigerian political systems.",
    "Sociology": "Studies social structures, culture, gender, development, and social change in Nigerian and global contexts.",
    "History and Archaology": "Covers pre-colonial, colonial, and post-independence Nigerian and African history alongside archaeological methods.",
  };
  return descriptions[dept] ||
    `The ${dept} department, under the Faculty of ${faculty}, offers comprehensive academic training and research opportunities for students at TASU.`;
}

// ── Mini Avatar ───────────────────────────────────────────────
const Avatar = ({ uid, name, url, size = 36, radius = 10 }: { uid: string; name: string; url?: string; size?: number; radius?: number }) => (
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

// ── Tabs ──────────────────────────────────────────────────────
type Tab = "info" | "posts" | "students" | "chat";

// ── Main Component ────────────────────────────────────────────
export default function Departments({ myProfile }: { myProfile: UserProfile | null }) {
  const currentUser = auth.currentUser;
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [searchVal, setSearchVal] = useState("");

  // Data states
  const [deptPosts, setDeptPosts] = useState<Post[]>([]);
  const [deptStudents, setDeptStudents] = useState<UserProfile[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Build ordered faculty list — myProfile's faculty first
  const myFaculty = myProfile?.faculty;
  const orderedFaculties = myFaculty && FACULTY_ORDER.includes(myFaculty)
    ? [myFaculty, ...FACULTY_ORDER.filter(f => f !== myFaculty)]
    : FACULTY_ORDER;

  // Filter faculties/depts by search
  const filteredFaculties = orderedFaculties.filter(f => {
    if (!searchVal) return true;
    const sv = searchVal.toLowerCase();
    return (
      f.toLowerCase().includes(sv) ||
      (FACULTY_DEPT_MAP[f] || []).some(d => d.toLowerCase().includes(sv))
    );
  });

  // ── Load posts for selected dept ──────────────────────────
  useEffect(() => {
    if (!selectedDept || activeTab !== "posts") return;
    setPostsLoading(true);
    setDeptPosts([]);
    const q = query(
      collection(db, "posts"),
      where("department", "==", selectedDept),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    const unsub = onSnapshot(q, snap => {
      setDeptPosts(snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Post))
        .filter(p => !(p as any).deleted)
      );
      setPostsLoading(false);
    }, () => setPostsLoading(false));
    return () => unsub();
  }, [selectedDept, activeTab]);

  // ── Load students for selected dept (same level only) ────
  useEffect(() => {
    if (!selectedDept || activeTab !== "students") return;
    setStudentsLoading(true);
    setDeptStudents([]);
    const q = myProfile?.level
      ? query(
          collection(db, "users"),
          where("department", "==", selectedDept),
          where("level", "==", myProfile.level),
          limit(50)
        )
      : query(
          collection(db, "users"),
          where("department", "==", selectedDept),
          limit(50)
        );
    getDocs(q).then(snap => {
      setDeptStudents(
        snap.docs
          .map(d => d.data() as UserProfile)
          .filter(u => u.uid !== ADMIN_UID)
      );
      setStudentsLoading(false);
    }).catch(() => setStudentsLoading(false));
  }, [selectedDept, activeTab, myProfile?.level]);

  // ── Load chat for selected dept ───────────────────────────
useEffect(() => {
    if (!selectedDept || activeTab !== "chat") return;
    if (myProfile?.department !== selectedDept) return;
    setChatLoading(true);
    setChatMessages([]);
    const q = query(
      collection(db, "dept_chats", selectedDept, "messages"),
      orderBy("createdAt", "asc"),
      limit(80)
    );
    const unsub = onSnapshot(q, snap => {
      setChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
      setChatLoading(false);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }, () => setChatLoading(false));
    return () => unsub();
  }, [selectedDept, activeTab]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── Send chat message ─────────────────────────────────────
  const sendChat = async () => {
    if (!chatInput.trim() || !myProfile || !selectedDept || !currentUser) return;
    setChatSending(true);
    try {
      await addDoc(collection(db, "dept_chats", selectedDept, "messages"), {
        uid: currentUser.uid,
        name: myProfile.name,
        avatarUrl: myProfile.avatarUrl || "",
        level: myProfile.level,
        content: chatInput.trim(),
        createdAt: serverTimestamp(),
      });
      setChatInput("");
      chatInputRef.current?.focus();
    } finally {
      setChatSending(false);
    }
  };

  // ── Open department ───────────────────────────────────────
  const openDept = (dept: string, faculty: string) => {
    setSelectedDept(dept);
    setSelectedFaculty(faculty);
    setActiveTab("info");
    setDeptPosts([]);
    setDeptStudents([]);
    setChatMessages([]);
  };

  const closeDept = () => {
    setSelectedDept(null);
    setSelectedFaculty(null);
  };

  const [c1, c2] = selectedFaculty ? (FACULTY_COLORS[selectedFaculty] || ["#166534", "#22c55e"]) : ["#166534", "#22c55e"];

  // ── Render: Department Detail View ────────────────────────
  if (selectedDept && selectedFaculty) {
    return (
      <>
        <style>{DEPT_STYLES}</style>
        <div className="dept-detail-wrap">

          {/* Hero banner */}
          <div className="dept-hero" style={{
            background: `linear-gradient(135deg, ${c1}55, ${c2}22)`,
            borderBottom: `1px solid ${c2}33`,
          }}>
            <button className="dept-back-btn" onClick={closeDept}>
              ← Back
            </button>
            <div className="dept-hero-icon" style={{ background: `linear-gradient(135deg,${c1},${c2})` }}>
              {FACULTY_ICONS[selectedFaculty] || "🏛️"}
            </div>
            <div>
              <div className="dept-hero-name">{selectedDept}</div>
              <div className="dept-hero-faculty">
                <span style={{
                  padding: "3px 10px", borderRadius: 100,
                  background: `${c1}44`, border: `1px solid ${c2}55`,
                  fontSize: 10, fontWeight: 700, color: c2,
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}>
                  {selectedFaculty}
                </span>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="dept-tabs-bar">
            {(["info", "posts", "students", "chat"] as Tab[]).map(tab => (
              <button
                key={tab}
                className={`dept-tab${activeTab === tab ? " active" : ""}`}
                onClick={() => setActiveTab(tab)}
                style={activeTab === tab ? { borderBottomColor: c2, color: c2 } : {}}
              >
                {tab === "info" && "ℹ️ Info"}
                {tab === "posts" && "📝 Posts"}
                {tab === "students" && "👥 Students"}
                {tab === "chat" && "💬 Chat"}
{tab === "chat" && myProfile?.department !== selectedDept && (
  <span style={{ fontSize: 9, marginLeft: 4, opacity: 0.5 }}>🔒</span>
)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="dept-tab-content">

            {/* ── INFO ── */}
            {activeTab === "info" && (
              <div className="dept-info-grid">
                <div className="dept-info-card">
                  <div className="dept-info-card-title">📖 About this Department</div>
                  <p className="dept-info-desc">{getDeptDescription(selectedDept, selectedFaculty)}</p>
                </div>
                <div className="dept-info-card">
                  <div className="dept-info-card-title">🏛️ Faculty</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: `linear-gradient(135deg,${c1},${c2})`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                    }}>{FACULTY_ICONS[selectedFaculty] || "🏛️"}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{selectedFaculty}</div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                        {(FACULTY_DEPT_MAP[selectedFaculty] || []).length} departments
                      </div>
                    </div>
                  </div>
                </div>
                <div className="dept-info-card">
                  <div className="dept-info-card-title">🎓 Level Structure</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {(["Engineering", "Agriculture", "Law", "Health Science"].includes(selectedFaculty)
                      ? ["100L", "200L", "300L", "400L", "500L"]
                      : ["100L", "200L", "300L", "400L"]
                    ).map(lvl => (
                      <span key={lvl} style={{
                        padding: "4px 12px", borderRadius: 100, fontSize: 11, fontWeight: 600,
                        background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
                        color: "var(--text-2)",
                      }}>{lvl}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 8 }}>
                    {["Engineering", "Agriculture", "Law", "Health Science"].includes(selectedFaculty)
                      ? "5-year programme"
                      : "4-year programme"}
                  </div>
                </div>
                <div className="dept-info-card">
                  <div className="dept-info-card-title">⚡ Quick Actions</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                    {[
                      { icon: "📝", label: "See department posts", tab: "posts" as Tab },
                      { icon: "👥", label: "Meet your coursemates", tab: "students" as Tab },
                      { icon: "💬", label: "Join the discussion board", tab: "chat" as Tab },
                    ].map(({ icon, label, tab }) => (
                      <button key={tab} onClick={() => setActiveTab(tab)} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                        background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
                        color: "var(--text-2)", fontSize: 12.5, fontWeight: 500,
                        fontFamily: "'Sora',sans-serif", textAlign: "left", transition: "all 0.15s",
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                      >
                        <span style={{ fontSize: 16 }}>{icon}</span> {label}
                        <span style={{ marginLeft: "auto", opacity: 0.4, fontSize: 12 }}>→</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── POSTS ── */}
            {activeTab === "posts" && (
              <div className="dept-posts-list">
                {postsLoading ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="dept-post-skeleton">
                      <div className="skel" style={{ width: 38, height: 38, borderRadius: 10 }} />
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                        <div className="skel" style={{ height: 11, width: "40%" }} />
                        <div className="skel" style={{ height: 11, width: "90%" }} />
                        <div className="skel" style={{ height: 11, width: "70%" }} />
                      </div>
                    </div>
                  ))
                ) : deptPosts.length === 0 ? (
                  <div className="dept-empty">
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📝</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>No posts yet from this department</div>
                    <div style={{ fontSize: 11.5, marginTop: 4 }}>Be the first to post something!</div>
                  </div>
                ) : (
                  deptPosts.map((post, idx) => (
                    <article key={post.id} className="dept-mini-post" style={{ animationDelay: `${idx * 0.04}s` }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                        <Avatar uid={post.uid} name={post.name} url={post.avatarUrl} size={36} radius={10} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{post.name}</span>
                            {post.tag && (
                              <span style={{
                                padding: "1px 7px", borderRadius: 100, fontSize: 9, fontWeight: 700,
                                background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)",
                                color: "#f59e0b", textTransform: "uppercase",
                              }}>{post.tag}</span>
                            )}
                          </div>
                          <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>
                            {post.level ? `${post.level}L` : ""} · {timeAgo(post.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(240,244,241,0.82)", marginBottom: 10 }}>
                        {post.content}
                      </div>
                      {post.imageUrl && (
                        <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 10, border: "1px solid var(--border)" }}>
                          <img src={post.imageUrl} alt="post" style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block" }} />
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 14, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                        <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>❤️ {post.likes.length}</span>
                        <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>💬 {post.comments}</span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            )}

            {/* ── STUDENTS ── */}
            {activeTab === "students" && (
              <div className="dept-students-grid">
                {studentsLoading ? (
                  [1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="dept-student-card-skel">
                      <div className="skel" style={{ width: 52, height: 52, borderRadius: 14, margin: "0 auto 10px" }} />
                      <div className="skel" style={{ height: 10, width: "60%", margin: "0 auto 6px" }} />
                      <div className="skel" style={{ height: 8, width: "40%", margin: "0 auto" }} />
                    </div>
                  ))
                ) : deptStudents.length === 0 ? (
                  <div className="dept-empty" style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>No students found</div>
                    <div style={{ fontSize: 11.5, marginTop: 4 }}>Students who set this department in their profile will appear here.</div>
                  </div>
                ) : (
                  deptStudents.map((student, idx) => (
                    <div key={student.uid} className="dept-student-card" style={{ animationDelay: `${idx * 0.04}s` }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: 14, margin: "0 auto 10px",
                        background: student.avatarUrl ? "transparent" : avatarGrad(student.uid),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 17, fontWeight: 700, color: "#fff",
                        border: "2px solid rgba(255,255,255,0.1)", overflow: "hidden",
                      }}>
                        {student.avatarUrl
                          ? <img src={student.avatarUrl} alt={student.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : initials(student.name)}
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)", textAlign: "center", marginBottom: 4 }}>
                        {student.name}
                      </div>
                      {student.level && (
                        <div style={{
                          display: "inline-block", padding: "2px 8px", borderRadius: 100,
                          background: `${c1}33`, border: `1px solid ${c2}44`,
                          fontSize: 9.5, fontWeight: 700, color: c2,
                          textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
                        }}>{student.level}L</div>
                      )}
                      {student.bio && (
                        <div style={{
                          fontSize: 10.5, color: "var(--text-3)", lineHeight: 1.5,
                          textAlign: "center", overflow: "hidden",
                          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                        }}>{student.bio}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── CHAT ── */}
            {activeTab === "chat" && (() => {
              const levelChatMessages = chatMessages.filter(m => m.level === myProfile?.level);
              return (
              <div className="dept-chat-wrap">
                <div className="dept-chat-messages">
                  {chatLoading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
                      <div className="dept-spinner" />
                    </div>
                  ) : levelChatMessages.length === 0 ? (
                    <div className="dept-empty">
                      <div style={{ fontSize: 32, marginBottom: 10 }}>💬</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>No messages yet</div>
                      <div style={{ fontSize: 11.5, marginTop: 4 }}>
                        {myProfile?.level
                          ? `Start the ${myProfile.level}L ${selectedDept} discussion!`
                          : `Start the ${selectedDept} discussion!`}
                      </div>
                    </div>
                  ) : (
                    levelChatMessages.map((msg, idx) => {
                      const isMe = msg.uid === currentUser?.uid;
                      return (
                        <div key={msg.id} className={`dept-chat-msg${isMe ? " me" : ""}`} style={{ animationDelay: `${Math.min(idx, 10) * 0.03}s` }}>
                          {!isMe && <Avatar uid={msg.uid} name={msg.name} url={msg.avatarUrl} size={30} radius={8} />}
                          <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                            {!isMe && (
                              <div style={{ fontSize: 10.5, color: "var(--text-3)", marginBottom: 3, paddingLeft: 2 }}>
                                {msg.name}{msg.level ? ` · ${msg.level}L` : ""}
                              </div>
                            )}
                            <div className={`dept-chat-bubble${isMe ? " me" : ""}`} style={isMe ? { background: `linear-gradient(135deg,${c1},${c2})` } : {}}>
                              {msg.content}
                            </div>
                            <div style={{ fontSize: 9.5, color: "var(--text-3)", marginTop: 3, paddingLeft: 2, paddingRight: 2 }}>
                              {timeAgo(msg.createdAt)}
                            </div>
                          </div>
                          {isMe && <Avatar uid={msg.uid} name={msg.name} url={msg.avatarUrl} size={30} radius={8} />}
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>
                {myProfile?.department === selectedDept ? (
  <div className="dept-chat-composer">
    <Avatar uid={currentUser?.uid || ""} name={myProfile?.name || ""} url={myProfile?.avatarUrl} size={32} radius={9} />
    <input
      ref={chatInputRef}
      className="dept-chat-input"
      placeholder={`Message ${selectedDept}…`}
      value={chatInput}
      onChange={e => setChatInput(e.target.value)}
      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
    />
    <button
      className="dept-chat-send"
      onClick={sendChat}
      disabled={!chatInput.trim() || chatSending}
      style={{ background: `linear-gradient(135deg,${c1},${c2})` }}
    >
      {chatSending ? <div className="dept-spinner" style={{ width: 12, height: 12, borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} /> : "➤"}
    </button>
  </div>
) : (
  <div style={{
    padding: "14px 16px",
    borderTop: "1px solid var(--border)",
    background: "rgba(6,13,8,0.6)",
    textAlign: "center",
    fontSize: 12,
    color: "var(--text-3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  }}>
    🔒 Only <strong style={{ color: "var(--text-2)" }}>{myProfile?.level ? `${myProfile.level}L ${selectedDept}` : selectedDept}</strong> students can send messages here
  </div>
)}
              </div>
              );
            })()}

          </div>
        </div>
      </>
    );
  }

  // ── Render: Faculty / Department Browser ──────────────────
  return (
    <>
      <style>{DEPT_STYLES}</style>
      <div className="dept-browser-wrap">

        {/* Header */}
        <div className="dept-browser-header">
          <div>
            <div className="dept-browser-title">Departments</div>
            <div className="dept-browser-sub">
              {myProfile?.department
                ? <>You're in <strong style={{ color: "var(--green-glow)" }}>{myProfile.department}</strong> · your faculty shown first</>
                : "Browse all faculties and departments at TASU"
              }
            </div>
          </div>
          <div className="dept-search-wrap">
            <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 13, opacity: 0.35 }}>🔍</span>
            <input
              className="dept-search-input"
              placeholder="Search department…"
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
            />
          </div>
        </div>

        {/* Faculty sections */}
        {filteredFaculties.map(faculty => {
          const depts = (FACULTY_DEPT_MAP[faculty] || []).filter(d =>
            !searchVal || d.toLowerCase().includes(searchVal.toLowerCase()) || faculty.toLowerCase().includes(searchVal.toLowerCase())
          );
          if (depts.length === 0) return null;
          const [fc1, fc2] = FACULTY_COLORS[faculty] || ["#166534", "#22c55e"];
          const isMyFaculty = faculty === myFaculty;

          return (
            <div key={faculty} className="dept-faculty-section">
              <div className="dept-faculty-header" style={{ borderLeft: `3px solid ${fc2}` }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                  background: `linear-gradient(135deg,${fc1},${fc2})`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                }}>{FACULTY_ICONS[faculty] || "🏛️"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="dept-faculty-name">{faculty}</span>
                    {isMyFaculty && (
                      <span style={{
                        padding: "2px 8px", borderRadius: 100, fontSize: 9, fontWeight: 700,
                        background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)",
                        color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.08em",
                      }}>My Faculty</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 1 }}>
                    {depts.length} department{depts.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              <div className="dept-cards-grid">
                {depts.map((dept, idx) => {
                  const isMyDept = dept === myProfile?.department;
                  return (
                    <button
                      key={dept}
                      className={`dept-card${isMyDept ? " my-dept" : ""}`}
                      style={{
                        animationDelay: `${idx * 0.03}s`,
                        borderColor: isMyDept ? `${fc2}66` : undefined,
                      }}
                      onClick={() => openDept(dept, faculty)}
                    >
                      {isMyDept && (
                        <div style={{
                          position: "absolute", top: 8, right: 8,
                          width: 8, height: 8, borderRadius: "50%",
                          background: fc2, boxShadow: `0 0 8px ${fc2}`,
                        }} />
                      )}
                      <div style={{
                        width: 34, height: 34, borderRadius: 10, marginBottom: 10,
                        background: `linear-gradient(135deg,${fc1}88,${fc2}66)`,
                        border: `1px solid ${fc2}44`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                      }}>{FACULTY_ICONS[faculty] || "🏛️"}</div>
                      <div className="dept-card-name">{dept}</div>
                      <div className="dept-card-arrow">→</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredFaculties.length === 0 && (
          <div className="dept-empty">
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>No departments found</div>
            <div style={{ fontSize: 11.5, marginTop: 4 }}>Try a different search term</div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────
const DEPT_STYLES = `
  .dept-browser-wrap {
    max-width: 680px;
    margin: 0 auto;
    padding: 0 0 48px;
  }
  .dept-browser-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }
  .dept-browser-title {
    font-family: 'Fraunces', serif;
    font-size: 22px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.01em;
    margin-bottom: 4px;
  }
  .dept-browser-sub {
    font-size: 12px;
    color: var(--text-3);
    line-height: 1.5;
  }
  .dept-search-wrap {
    position: relative;
    flex-shrink: 0;
  }
  .dept-search-input {
    padding: 9px 14px 9px 36px;
    background: rgba(255,255,255,0.05);
    border: 1.5px solid var(--border);
    border-radius: 100px;
    color: var(--text);
    font-size: 12.5px;
    font-family: 'Sora', sans-serif;
    outline: none;
    width: 200px;
    transition: all 0.2s;
  }
  .dept-search-input::placeholder { color: var(--text-3); }
  .dept-search-input:focus { border-color: rgba(245,158,11,0.35); background: rgba(255,255,255,0.07); }

  .dept-faculty-section {
    margin-bottom: 28px;
  }
  .dept-faculty-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    margin-bottom: 12px;
    background: rgba(255,255,255,0.025);
    border-radius: 12px;
    border: 1px solid var(--border);
    border-left-width: 3px;
  }
  .dept-faculty-name {
    font-family: 'Fraunces', serif;
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
  }

  .dept-cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 10px;
  }
  .dept-card {
    position: relative;
    padding: 14px 14px 12px;
    background: rgba(255,255,255,0.025);
    border: 1px solid var(--border);
    border-radius: 14px;
    cursor: pointer;
    text-align: left;
    transition: all 0.18s;
    font-family: 'Sora', sans-serif;
    animation: dept-card-in 0.35s cubic-bezier(0.16,1,0.3,1) both;
  }
  @keyframes dept-card-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .dept-card:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.14);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
  }
  .dept-card.my-dept {
    background: rgba(34,197,94,0.04);
  }
  .dept-card-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.4;
    margin-bottom: 6px;
  }
  .dept-card-arrow {
    font-size: 11px;
    color: var(--text-3);
    transition: all 0.15s;
  }
  .dept-card:hover .dept-card-arrow {
    color: var(--text-2);
    transform: translateX(2px);
  }

  /* ── Detail view ── */
  .dept-detail-wrap {
    max-width: 680px;
    margin: 0 auto;
    padding-bottom: 48px;
  }
  .dept-hero {
    padding: 20px 20px 18px;
    border-radius: 0 0 18px 18px;
    margin-bottom: 0;
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }
  .dept-back-btn {
    position: absolute;
    top: 70px;
    left: 16px;
    padding: 6px 14px;
    border-radius: 100px;
    background: rgba(255,255,255,0.08);
    border: 1px solid var(--border);
    color: var(--text-2);
    font-size: 12px;
    font-weight: 600;
    font-family: 'Sora', sans-serif;
    cursor: pointer;
    transition: all 0.15s;
    z-index: 10;
  }
  .dept-back-btn:hover { background: rgba(255,255,255,0.12); color: var(--text); }
  .dept-hero-icon {
    width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 24px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    margin-top: 28px;
  }
  .dept-hero-name {
    font-family: 'Fraunces', serif;
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
    line-height: 1.2;
    margin-bottom: 6px;
    margin-top: 28px;
  }
  .dept-hero-faculty { display: flex; gap: 6px; flex-wrap: wrap; }

  .dept-tabs-bar {
    display: flex;
    border-bottom: 1px solid var(--border);
    margin-bottom: 20px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .dept-tabs-bar::-webkit-scrollbar { display: none; }
  .dept-tab {
    padding: 12px 16px;
    font-size: 12.5px;
    font-weight: 600;
    font-family: 'Sora', sans-serif;
    color: var(--text-3);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
    margin-bottom: -1px;
  }
  .dept-tab:hover { color: var(--text-2); }
  .dept-tab.active { color: var(--green-glow); border-bottom-color: var(--green-glow); }

  .dept-tab-content { padding: 0 4px; }

  /* Info */
  .dept-info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .dept-info-card {
    background: rgba(255,255,255,0.025);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 16px;
  }
  .dept-info-card:first-child { grid-column: 1 / -1; }
  .dept-info-card-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
  }
  .dept-info-desc {
    font-size: 13px;
    line-height: 1.75;
    color: rgba(240,244,241,0.78);
  }

  /* Posts */
  .dept-posts-list { display: flex; flex-direction: column; gap: 12px; }
  .dept-mini-post {
    background: rgba(255,255,255,0.025);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px;
    animation: dept-card-in 0.35s cubic-bezier(0.16,1,0.3,1) both;
    transition: border-color 0.2s;
  }
  .dept-mini-post:hover { border-color: rgba(255,255,255,0.1); }
  .dept-post-skeleton { display: flex; gap: 12px; padding: 14px; background: rgba(255,255,255,0.02); border-radius: 14px; border: 1px solid var(--border); }
  .skel {
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
    border-radius: 6px;
  }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  /* Students */
  .dept-students-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 10px;
  }
  .dept-student-card {
    background: rgba(255,255,255,0.025);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 16px 12px;
    text-align: center;
    animation: dept-card-in 0.35s cubic-bezier(0.16,1,0.3,1) both;
    transition: all 0.15s;
  }
  .dept-student-card:hover { background: rgba(255,255,255,0.04); transform: translateY(-2px); }
  .dept-student-card-skel {
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 16px 12px;
  }

  /* Chat */
  .dept-chat-wrap {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 280px);
    min-height: 400px;
    background: rgba(255,255,255,0.01);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
  }
  .dept-chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .dept-chat-messages::-webkit-scrollbar { width: 3px; }
  .dept-chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
  .dept-chat-msg {
    display: flex;
    gap: 8px;
    align-items: flex-end;
    animation: dept-card-in 0.25s cubic-bezier(0.16,1,0.3,1) both;
  }
  .dept-chat-msg.me { flex-direction: row-reverse; }
  .dept-chat-bubble {
    padding: 9px 13px;
    border-radius: 4px 14px 14px 14px;
    background: rgba(255,255,255,0.06);
    border: 1px solid var(--border);
    font-size: 13px;
    line-height: 1.55;
    color: rgba(240,244,241,0.88);
    word-break: break-word;
  }
  .dept-chat-bubble.me {
    border-radius: 14px 4px 14px 14px;
    border: none;
    color: #fff;
  }
  .dept-chat-composer {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 12px 14px;
    border-top: 1px solid var(--border);
    background: rgba(6,13,8,0.6);
  }
  .dept-chat-input {
    flex: 1;
    padding: 9px 14px;
    background: rgba(255,255,255,0.05);
    border: 1.5px solid var(--border);
    border-radius: 100px;
    color: var(--text);
    font-size: 13px;
    font-family: 'Sora', sans-serif;
    outline: none;
    transition: all 0.2s;
  }
  .dept-chat-input::placeholder { color: var(--text-3); }
  .dept-chat-input:focus { border-color: rgba(245,158,11,0.35); background: rgba(255,255,255,0.07); }
  .dept-chat-send {
    width: 36px; height: 36px;
    border-radius: 100px;
    border: none;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: all 0.15s;
    box-shadow: 0 3px 12px rgba(0,0,0,0.3);
  }
  .dept-chat-send:hover:not(:disabled) { transform: scale(1.08); }
  .dept-chat-send:disabled { opacity: 0.4; cursor: not-allowed; }

  .dept-empty {
    text-align: center;
    padding: 48px 24px;
    color: var(--text-3);
  }
  .dept-spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.1);
    border-top-color: rgba(255,255,255,0.6);
    border-radius: 50%;
    animation: spin 0.65s linear infinite;
    display: inline-block;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 599px) {
    .dept-info-grid { grid-template-columns: 1fr; }
    .dept-info-card:first-child { grid-column: auto; }
    .dept-cards-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
    .dept-students-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
    .dept-browser-header { flex-direction: column; }
    .dept-search-input { width: 100%; }
    .dept-search-wrap { width: 100%; }
    .dept-back-btn { top: 62px; left: 12px; }
    .dept-hero { padding: 16px 16px 14px; }
    .dept-hero-name { font-size: 17px; }
    .dept-chat-wrap { height: calc(100vh - 240px); }
  }
`;
