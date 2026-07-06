// src/components/Marketplace.tsx
// Campus Connect — Taraba State University
// Full Firebase Marketplace: Browse, Post, Chat, Wishlist

import { useState, useRef, useEffect } from "react";
import {
  collection, addDoc, onSnapshot, doc,
  updateDoc, arrayUnion, arrayRemove, query,
  orderBy, serverTimestamp, limit, deleteDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";

// ── Types ────────────────────────────────────────────────────
type UserProfile = {
  uid: string;
  name: string;
  faculty: string;
  department: string;
  level: string;
  avatarUrl?: string;
};

type ListingCondition = "New" | "Like New" | "Good" | "Fair";

type ListingCategory =
  | "Phones"
  | "Laptops"
  | "Electronics"
  | "Clothing"
  | "Room Accessories"
  | "Other";

type Listing = {
  id: string;
  uid: string;
  sellerName: string;
  sellerFaculty: string;
  sellerAvatarUrl?: string;
  title: string;
  description: string;
  price: number;
  negotiable: boolean;
  category: ListingCategory;
  condition: ListingCondition;
  imageUrl?: string;
  whatsapp?: string;
  wishlist: string[];
  sold: boolean;
  createdAt: any;
};

// ── Constants ────────────────────────────────────────────────
const CATEGORIES: ListingCategory[] = [
  "Phones",
  "Laptops",
  "Electronics",
  "Clothing",
  "Room Accessories",
  "Other",
];

const CATEGORY_ICONS: Record<ListingCategory, string> = {
  Phones: "📱",
  Laptops: "💻",
  Electronics: "🔌",
  Clothing: "👕",
  "Room Accessories": "🛋️",
  Other: "📦",
};

const CONDITIONS: ListingCondition[] = ["New", "Like New", "Good", "Fair"];

const CONDITION_COLORS: Record<ListingCondition, string> = {
  New: "rgba(34,197,94,0.2)",
  "Like New": "rgba(96,165,250,0.2)",
  Good: "rgba(245,158,11,0.2)",
  Fair: "rgba(244,63,94,0.2)",
};

const CONDITION_TEXT: Record<ListingCondition, string> = {
  New: "#22c55e",
  "Like New": "#60a5fa",
  Good: "#f59e0b",
  Fair: "#f43f5e",
};

// ── Helpers ──────────────────────────────────────────────────
function timeAgo(ts: any): string {
  if (!ts) return "just now";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function formatPrice(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

function avatarGrad(uid: string) {
  const colors = [
    ["#166534", "#16a34a"], ["#b45309", "#f59e0b"], ["#1d4ed8", "#3b82f6"],
    ["#7c3aed", "#a78bfa"], ["#be123c", "#f43f5e"], ["#0f766e", "#14b8a6"],
  ];
  const i = uid.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  return `linear-gradient(135deg,${colors[i][0]},${colors[i][1]})`;
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Mini Avatar ──────────────────────────────────────────────
const MiniAvatar = ({ uid, name, url, size = 32 }: { uid: string; name: string; url?: string; size?: number }) => (
  <div style={{
    width: size, height: size, borderRadius: size * 0.28, flexShrink: 0,
    background: url ? "transparent" : avatarGrad(uid),
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.33, fontWeight: 700, color: "#fff",
    border: "1.5px solid rgba(255,255,255,0.1)", overflow: "hidden",
  }}>
    {url
      ? <img src={url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      : initials(name)}
  </div>
);

// ── Main Component ───────────────────────────────────────────
export default function Marketplace({ myProfile }: { myProfile: UserProfile | null }) {
  const currentUser = auth.currentUser;

  // ── State ────────────────────────────────────────────────
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<ListingCategory | "All">("All");
  const [searchVal, setSearchVal] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [activeTab, setActiveTab] = useState<"browse" | "wishlist" | "my-listings">("browse");
  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "price-low" | "price-high">("newest");

  // Composer
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formNeg, setFormNeg] = useState(false);
  const [formCat, setFormCat] = useState<ListingCategory>("Phones");
  const [formCond, setFormCond] = useState<ListingCondition>("Good");
  const [formWhatsapp, setFormWhatsapp] = useState("");
  const [formImage, setFormImage] = useState<File | null>(null);
  const [formImagePrev, setFormImagePrev] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [toast, setToast] = useState("");
  const imageRef = useRef<HTMLInputElement>(null);
  const composerInnerRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const openComposer = () => {
    setShowComposer(true);
    setTimeout(() => {
      if (composerInnerRef.current) {
        composerInnerRef.current.scrollTop = 0;
      }
    }, 50);
  };

  // ── Live Listings ────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "marketplace"), orderBy("createdAt", "desc"), limit(60));
    const unsub = onSnapshot(q, snap => {
      setListings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Listing)));
      setLoading(false);
    }, err => {
      console.error("Marketplace error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Post Listing ─────────────────────────────────────────
  const handlePost = async () => {
    if (!formTitle.trim()) { showToast("Please enter a title"); return; }
    if (!formPrice) { showToast("Please enter a price"); return; }
    if (!myProfile) { showToast("Profile not loaded"); return; }
    if (!currentUser) { showToast("Not logged in"); return; }

    setFormLoading(true);

    try {
      let imageUrl = "";

      if (formImage) {
        if (formImage.size > 2 * 1024 * 1024) {
          showToast("Image must be under 2MB");
          setFormLoading(false);
          return;
        }
        imageUrl = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.onerror = rej;
          r.readAsDataURL(formImage);
        });
      }

      await addDoc(collection(db, "marketplace"), {
        uid: currentUser.uid,
        sellerName: myProfile.name || "Anonymous",
        sellerFaculty: myProfile.faculty || "",
        sellerAvatarUrl: myProfile.avatarUrl || "",
        title: formTitle.trim(),
        description: formDesc.trim(),
        price: Number(formPrice),
        negotiable: formNeg,
        category: formCat,
        condition: formCond,
        imageUrl: imageUrl || "",
        whatsapp: formWhatsapp.trim() || "",
        wishlist: [],
        sold: false,
        createdAt: serverTimestamp(),
      });

      setFormTitle("");
      setFormDesc("");
      setFormPrice("");
      setFormNeg(false);
      setFormCat("Phones");
      setFormCond("Good");
      setFormWhatsapp("");
      setFormImage(null);
      setFormImagePrev(null);
      setShowComposer(false);
      showToast("Listing posted!");

    } catch (err) {
      console.error("Error posting:", err);
      showToast("Failed to post. Check console for details.");
    } finally {
      setFormLoading(false);
    }
  };

  // ── Toggle Wishlist ──────────────────────────────────────
  const toggleWishlist = async (listing: Listing) => {
    if (!currentUser) return;
    const ref = doc(db, "marketplace", listing.id);
    const wishlisted = listing.wishlist.includes(currentUser.uid);
    await updateDoc(ref, { wishlist: wishlisted ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) });
  };

  // ── Mark Sold ────────────────────────────────────────────
  const markSold = async (listing: Listing) => {
    await updateDoc(doc(db, "marketplace", listing.id), { sold: !listing.sold });
    showToast(listing.sold ? "Listing reactivated!" : "Marked as sold!");
    setDetailListing(null);
  };

  // ── Delete Listing ───────────────────────────────────────
  const deleteListing = async (listing: Listing) => {
    if (!window.confirm("Delete this listing?")) return;
    await deleteDoc(doc(db, "marketplace", listing.id));
    setDetailListing(null);
    showToast("Listing deleted.");
  };

  // ── Filter + Sort ────────────────────────────────────────
  const filtered = listings
    .filter(l => !l.sold || activeTab === "my-listings")
    .filter(l => activeCategory === "All" || l.category === activeCategory)
    .filter(l => !searchVal || l.title.toLowerCase().includes(searchVal.toLowerCase()) || l.description.toLowerCase().includes(searchVal.toLowerCase()))
    .filter(l => {
      if (activeTab === "wishlist") return currentUser && l.wishlist.includes(currentUser.uid);
      if (activeTab === "my-listings") return currentUser && l.uid === currentUser.uid;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      return 0; // newest is default from Firestore
    });

  const myListingsCount = listings.filter(l => currentUser && l.uid === currentUser.uid).length;
  const wishlistCount = listings.filter(l => currentUser && l.wishlist.includes(currentUser.uid)).length;

  // ── Styles ───────────────────────────────────────────────
  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 14px",
    background: "#0e1e12",
    border: "1.5px solid rgba(255,255,255,0.1)",
    borderRadius: 10, color: "#f0f4f1",
    fontSize: 13, fontFamily: "'Sora',sans-serif", outline: "none",
  };

  return (
    <div className="mkt-wrapper">
      
     <style>{`
      .mkt-wrapper{width:100%;max-width:100%;overflow-x:hidden;box-sizing:border-box;}
.mkt-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:10px;width:100%;}
.mkt-title{font-family:'Fraunces',serif;font-size:22px;font-weight:700;color:var(--text);}
.mkt-subtitle{font-size:12px;color:var(--text-3);margin-top:2px;}
.mkt-post-btn{padding:8px 14px;border-radius:100px;border:none;background:linear-gradient(135deg,#b45309,#f59e0b);color:#1a0a00;font-size:12px;font-weight:700;font-family:'Sora',sans-serif;cursor:pointer;display:flex;align-items:center;gap:5px;white-space:nowrap;flex-shrink:0;}

.mkt-tabs{display:flex;gap:4px;margin-bottom:16px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:12px;padding:4px;width:100%;box-sizing:border-box;}
.mkt-tab{flex:1;padding:8px 2px;border-radius:9px;border:none;background:transparent;color:var(--text-3);font-size:10px;font-weight:600;font-family:'Sora',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px;min-width:0;overflow:hidden;}
.mkt-tab.active{background:rgba(22,163,74,0.12);border:1px solid rgba(22,163,74,0.25);color:var(--green-glow);}
.mkt-tab-badge{padding:1px 5px;border-radius:100px;background:rgba(245,158,11,0.18);color:var(--gold-light);font-size:9px;font-weight:800;}

.mkt-search-row{display:flex;gap:6px;margin-bottom:14px;align-items:center;width:100%;box-sizing:border-box;}
.mkt-search{flex:1;min-width:0;position:relative;}
.mkt-search-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:12px;opacity:0.3;pointer-events:none;}
.mkt-search input{width:100%;padding:9px 12px 9px 32px;background:rgba(255,255,255,0.04);border:1.5px solid var(--border);border-radius:100px;color:var(--text);font-size:12px;font-family:'Sora',sans-serif;outline:none;box-sizing:border-box;}
.mkt-sort{padding:7px 8px;background:#0e1e12;border:1.5px solid var(--border);border-radius:100px;color:#f0f4f1;font-size:10px;font-family:'Sora',sans-serif;outline:none;cursor:pointer;flex-shrink:0;width:80px;}
.mkt-sort option{background:#0e1e12;color:#f0f4f1;}

.cat-scroll{display:flex;gap:6px;overflow-x:auto;padding-bottom:12px;scrollbar-width:none;width:100%;box-sizing:border-box;}
.cat-scroll::-webkit-scrollbar{display:none;}
.cat-pill{display:flex;align-items:center;gap:4px;padding:6px 11px;border-radius:100px;border:1.5px solid var(--border);background:transparent;color:var(--text-3);font-size:11px;font-weight:600;font-family:'Sora',sans-serif;cursor:pointer;white-space:nowrap;flex-shrink:0;}
.cat-pill.active{background:rgba(22,163,74,0.1);border-color:rgba(22,163,74,0.3);color:var(--green-glow);}
.cat-scroll-wrapper{position:relative;width:100%;}
.cat-scroll-wrapper::after{content:'';position:absolute;top:0;right:0;bottom:12px;width:40px;background:linear-gradient(to right,transparent,var(--dark,#060d08));pointer-events:none;border-radius:0 100px 100px 0;}

.mkt-results-count{font-size:11px;color:var(--text-3);margin-bottom:10px;}

.listings-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;width:100%;box-sizing:border-box;}

.listing-card{background:rgba(255,255,255,0.028);border:1px solid var(--border);border-radius:14px;overflow:hidden;cursor:pointer;position:relative;box-sizing:border-box;}
.listing-card.sold{opacity:0.55;}
.listing-img{width:100%;height:120px;object-fit:cover;display:block;}
.listing-img-placeholder{height:120px;background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:center;font-size:30px;}
.listing-body{padding:9px 10px 11px;}
.listing-cat-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;gap:4px;}
.listing-cat-badge{font-size:9px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.06em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;}
.listing-condition{padding:2px 6px;border-radius:100px;font-size:9px;font-weight:700;flex-shrink:0;}
.listing-title{font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.listing-price-row{display:flex;align-items:center;gap:4px;margin-bottom:6px;}
.listing-price{font-family:'Fraunces',serif;font-size:14px;font-weight:700;color:var(--gold-light);}
.listing-neg{font-size:9px;color:var(--text-3);font-style:italic;}
.listing-seller{display:flex;align-items:center;gap:5px;}
.listing-seller-name{font-size:10px;color:var(--text-3);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:none;}
.listing-time{font-size:9px;color:var(--text-3);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.listing-wish-btn{width:26px;height:26px;border-radius:7px;background:transparent;border:1px solid var(--border);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:0;}
.listing-wish-btn.wishlisted{color:#f43f5e;border-color:rgba(244,63,94,0.3);background:rgba(244,63,94,0.08);}
.sold-banner{position:absolute;top:8px;left:8px;padding:3px 8px;border-radius:100px;background:rgba(244,63,94,0.9);color:#fff;font-size:9px;font-weight:800;text-transform:uppercase;}

.composer-overlay{position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;}
.composer-sheet{position:fixed;left:0;right:0;bottom:0;width:100%;max-width:640px;margin:0 auto;height:88vh;background:#0a1510;border:1px solid rgba(255,255,255,0.07);border-bottom:none;border-radius:24px 24px 0 0;display:flex;flex-direction:column;z-index:501;}
.composer-sheet-inner{overflow-y:auto;padding:16px;flex:1;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;}
.composer-handle{width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,0.15);margin:12px auto 0;flex-shrink:0;}
.composer-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 10px;border-bottom:1px solid var(--border);flex-shrink:0;}
.composer-head-title{font-family:'Fraunces',serif;font-size:16px;font-weight:700;color:var(--text);}
.composer-close{width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid var(--border);color:var(--text-2);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.form-label{font-size:10px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.1em;display:block;margin-bottom:5px;}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:13px;}
.form-field{margin-bottom:13px;}
.toggle-row{display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;}
.toggle-track{width:34px;height:19px;border-radius:100px;border:1.5px solid var(--border);background:rgba(255,255,255,0.06);position:relative;transition:all 0.2s;flex-shrink:0;}
.toggle-track.on{background:rgba(22,163,74,0.35);border-color:rgba(22,163,74,0.5);}
.toggle-thumb{width:13px;height:13px;border-radius:50%;background:rgba(255,255,255,0.4);position:absolute;top:1.5px;left:1.5px;transition:all 0.2s;}
.toggle-track.on .toggle-thumb{left:16px;background:#22c55e;}
.img-upload-zone{border:1.5px dashed rgba(255,255,255,0.12);border-radius:12px;min-height:90px;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;background:rgba(255,255,255,0.02);width:100%;box-sizing:border-box;}
.composer-submit{width:100%;padding:13px;border-radius:12px;border:none;background:linear-gradient(135deg,#b45309,#f59e0b);color:#1a0a00;font-size:13px;font-weight:700;font-family:'Sora',sans-serif;cursor:pointer;margin-top:6px;display:flex;align-items:center;justify-content:center;gap:8px;}
.composer-submit:disabled{opacity:0.4;cursor:not-allowed;}
.composer-sheet-inner select{background:#0e1e12;color:#f0f4f1;}
.composer-sheet-inner select option{background:#0e1e12;color:#f0f4f1;}

.detail-overlay{position:fixed;inset:0;z-index:490;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;}
.detail-sheet{position:fixed;left:0;right:0;bottom:0;width:100%;max-width:640px;margin:0 auto;height:88vh;background:#0a1510;border:1px solid rgba(255,255,255,0.07);border-bottom:none;border-radius:24px 24px 0 0;display:flex;flex-direction:column;z-index:491;}
.detail-inner{overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;}
.detail-img{width:100%;max-height:240px;object-fit:contain;background:rgba(0,0,0,0.2);}
.detail-content{padding:14px 16px;}
.detail-actions{padding:10px 14px;border-top:1px solid var(--border);display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap;}
.btn-contact{flex:1;min-width:120px;padding:11px;border-radius:12px;border:none;background:linear-gradient(135deg,#166534,#16a34a);color:#fff;font-size:12px;font-weight:700;font-family:'Sora',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;text-decoration:none;}
.btn-wish{padding:11px 14px;border-radius:12px;border:1.5px solid var(--border);background:transparent;color:var(--text-2);font-size:17px;cursor:pointer;}
.btn-wish.on{border-color:rgba(244,63,94,0.4);background:rgba(244,63,94,0.1);color:#f43f5e;}
.btn-owner{padding:10px 12px;border-radius:12px;border:1.5px solid var(--border);background:transparent;color:var(--text-2);font-size:12px;font-weight:600;font-family:'Sora',sans-serif;cursor:pointer;white-space:nowrap;}

.spinner{width:14px;height:14px;border:2px solid rgba(26,10,0,0.25);border-top-color:#1a0a00;border-radius:50%;animation:spin 0.6s linear infinite;}
.skeleton{background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:8px;}
@keyframes shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
@keyframes spin{to{transform:rotate(360deg);}}

.mkt-empty{text-align:center;padding:48px 20px;color:var(--text-3);}
.mkt-empty-icon{font-size:34px;margin-bottom:10px;}
.mkt-empty-title{font-size:14px;font-weight:600;color:var(--text-2);margin-bottom:5px;}
.mkt-empty-sub{font-size:12px;line-height:1.7;}

@media screen and (min-width:600px){
  .listings-grid{grid-template-columns:repeat(3,1fr);gap:14px;}
  .listing-img,.listing-img-placeholder{height:148px;}
  .listing-title{font-size:13.5px;}
  .listing-price{font-size:17px;}
  .listing-seller-name{display:block;}
  .mkt-sort{width:140px;font-size:12px;}
}
@media screen and (min-width:900px){
  .listings-grid{grid-template-columns:repeat(4,1fr);}
}
@media screen and (max-width:380px){
  .mkt-tab{font-size:9px;padding:6px 1px;}
  .listing-img,.listing-img-placeholder{height:100px;}
  .listing-price{font-size:13px;}
  .listing-title{font-size:11px;}
  .form-row{grid-template-columns:1fr;}
}
        }
      `}</style>
      {/* ── Page Header ── */}
      <div className="mkt-header">
        <div>
          <div className="mkt-title">🛍️ Marketplace</div>
          <div className="mkt-subtitle">Buy · Sell · Trade on campus</div>
        </div>
        {myProfile && (
          <button className="mkt-post-btn" onClick={openComposer}>
            + Post Listing
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="mkt-tabs">
        <button className={`mkt-tab${activeTab === "browse" ? " active" : ""}`} onClick={() => setActiveTab("browse")}>
          🏪 Browse
        </button>
        <button className={`mkt-tab${activeTab === "wishlist" ? " active" : ""}`} onClick={() => setActiveTab("wishlist")}>
          ❤️ Saved
          {wishlistCount > 0 && <span className="mkt-tab-badge">{wishlistCount}</span>}
        </button>
        <button className={`mkt-tab${activeTab === "my-listings" ? " active" : ""}`} onClick={() => setActiveTab("my-listings")}>
          📦 Mine
          {myListingsCount > 0 && <span className="mkt-tab-badge">{myListingsCount}</span>}
        </button>
      </div>

      {/* ── Search + Sort ── */}
      <div className="mkt-search-row">
        <div className="mkt-search">
          <span className="mkt-search-icon">🔍</span>
          <input
            placeholder="Search listings…"
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
          />
        </div>
        <select className="mkt-sort" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
          <option value="newest">Newest</option>
          <option value="price-low">Price: Low → High</option>
          <option value="price-high">Price: High → Low</option>
        </select>
      </div>

      {/* ── Category Pills ── */}
      {activeTab === "browse" && (
  <div className="cat-scroll-wrapper">
  <div className="cat-scroll">
          <button
            className={`cat-pill${activeCategory === "All" ? " active" : ""}`}
            onClick={() => setActiveCategory("All")}
          >All</button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`cat-pill${activeCategory === cat ? " active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {CATEGORY_ICONS[cat]} {cat}
            </button>
          ))}
        </div>
        </div>
      )}

      {/* ── Results count ── */}
      {!loading && (
        <div className="mkt-results-count">
          {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
          {activeCategory !== "All" ? ` in ${activeCategory}` : ""}
          {searchVal ? ` matching "${searchVal}"` : ""}
        </div>
      )}

      {/* ── Grid ── */}
      {loading ? (
        <div className="listings-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="listing-card" style={{ cursor: "default" }}>
              <div className="skeleton" style={{ height: 148, width: "100%", borderRadius: 0 }} />
              <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="skeleton" style={{ height: 10, width: "50%" }} />
                <div className="skeleton" style={{ height: 13, width: "80%" }} />
                <div className="skeleton" style={{ height: 13, width: "55%" }} />
                <div className="skeleton" style={{ height: 10, width: "65%" }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mkt-empty">
          <div className="mkt-empty-icon">
            {activeTab === "wishlist" ? "❤️" : activeTab === "my-listings" ? "📦" : "🔍"}
          </div>
          <div className="mkt-empty-title">
            {activeTab === "wishlist" ? "No saved listings"
              : activeTab === "my-listings" ? "You haven't posted anything yet"
              : "No listings found"}
          </div>
          <div className="mkt-empty-sub">
            {activeTab === "wishlist" ? "Tap ❤️ on any listing to save it here."
              : activeTab === "my-listings" ? "Post your first listing to get started!"
              : "Try a different search or category."}
          </div>
        </div>
      ) : (
        <div className="listings-grid">
          {filtered.map((listing, idx) => {
            const wishlisted = currentUser ? listing.wishlist.includes(currentUser.uid) : false;
            return (
              <div
                key={listing.id}
                className={`listing-card${listing.sold ? " sold" : ""}`}
                style={{ animationDelay: `${idx * 0.04}s`, position: "relative" }}
                onClick={() => setDetailListing(listing)}
              >
                {listing.sold && <div className="sold-banner">Sold</div>}
                {listing.imageUrl
                  ? <img src={listing.imageUrl} alt={listing.title} className="listing-img" />
                  : <div className="listing-img-placeholder">{CATEGORY_ICONS[listing.category]}</div>}
                <div className="listing-body">
                  <div className="listing-cat-row">
                    <span className="listing-cat-badge">{CATEGORY_ICONS[listing.category]} {listing.category}</span>
                    <span className="listing-condition" style={{
                      background: CONDITION_COLORS[listing.condition],
                      color: CONDITION_TEXT[listing.condition],
                    }}>{listing.condition}</span>
                  </div>
                  <div className="listing-title">{listing.title}</div>
                  <div className="listing-price-row">
                    <span className="listing-price">{formatPrice(listing.price)}</span>
                    {listing.negotiable && <span className="listing-neg">negotiable</span>}
                  </div>
                  <div className="listing-seller">
                    <MiniAvatar uid={listing.uid} name={listing.sellerName} url={listing.sellerAvatarUrl} size={22} />
                    <span className="listing-seller-name">{listing.sellerName}</span>
                    <span style={{ fontSize: 10, color: "var(--text-3)", flexShrink: 0 }}>{timeAgo(listing.createdAt)}</span>
                    <button
                      className={`listing-wish-btn${wishlisted ? " wishlisted" : ""}`}
                      onClick={e => { e.stopPropagation(); toggleWishlist(listing); }}
                      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                    >{wishlisted ? "❤️" : "🤍"}</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Detail Sheet ── */}
      {detailListing && (
        <>
          <div className="detail-overlay" onClick={() => setDetailListing(null)} />
          <div className="detail-sheet">
            <div className="composer-handle" />
            <div className="composer-head">
              <span className="composer-head-title">Listing Details</span>
              <button className="composer-close" onClick={() => setDetailListing(null)}>✕</button>
            </div>
            <div className="detail-inner">
              {detailListing.imageUrl
                ? <img src={detailListing.imageUrl} alt={detailListing.title} className="detail-img" />
                : <div style={{
                    height: 160, background: "rgba(255,255,255,0.03)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56,
                  }}>
                    {CATEGORY_ICONS[detailListing.category]}
                  </div>
              }
              <div className="detail-content">
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: 100,
                    background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)",
                    fontSize: 11, color: "var(--text-3)", fontWeight: 600,
                  }}>{CATEGORY_ICONS[detailListing.category]} {detailListing.category}</span>
                  <span style={{
                    padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700,
                    background: CONDITION_COLORS[detailListing.condition],
                    color: CONDITION_TEXT[detailListing.condition],
                  }}>{detailListing.condition}</span>
                  {detailListing.sold && (
                    <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 800, background: "rgba(244,63,94,0.15)", color: "#f43f5e" }}>SOLD</span>
                  )}
                </div>

                <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 8, lineHeight: 1.3 }}>
                  {detailListing.title}
                </h2>

                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
                  <span style={{ fontFamily: "'Fraunces',serif", fontSize: 26, fontWeight: 700, color: "var(--gold-light)" }}>
                    {formatPrice(detailListing.price)}
                  </span>
                  {detailListing.negotiable && (
                    <span style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic" }}>negotiable</span>
                  )}
                </div>

                {detailListing.description && (
                  <p style={{ fontSize: 13.5, lineHeight: 1.75, color: "rgba(240,244,241,0.8)", marginBottom: 20 }}>
                    {detailListing.description}
                  </p>
                )}

                <div style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                  background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)",
                  borderRadius: 12, marginBottom: 8,
                }}>
                  <MiniAvatar uid={detailListing.uid} name={detailListing.sellerName} url={detailListing.sellerAvatarUrl} size={36} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{detailListing.sellerName}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>{detailListing.sellerFaculty} · {timeAgo(detailListing.createdAt)}</div>
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-3)" }}>
                    ❤️ {detailListing.wishlist.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="detail-actions">
              {currentUser && detailListing.uid !== currentUser.uid && !detailListing.sold && (
                detailListing.whatsapp ? (
                  <a
                    href={`https://wa.me/${detailListing.whatsapp.replace(/\D/g, "")}?text=Hi! I saw your listing for "${detailListing.title}" on TASU Campus Connect.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-contact"
                    style={{ textDecoration: "none" }}
                  >
                    💬 Contact via WhatsApp
                  </a>
                ) : (
                  <button className="btn-contact" onClick={() => showToast("Seller hasn't added WhatsApp. Try messaging them directly.")}>
                    💬 Contact Seller
                  </button>
                )
              )}

              {currentUser && detailListing.uid !== currentUser.uid && (
                <button
                  className={`btn-wish${currentUser && detailListing.wishlist.includes(currentUser.uid) ? " on" : ""}`}
                  onClick={() => toggleWishlist(detailListing)}
                  aria-label="Wishlist"
                >
                  {currentUser && detailListing.wishlist.includes(currentUser.uid) ? "❤️" : "🤍"}
                </button>
              )}

              {currentUser && detailListing.uid === currentUser.uid && (
                <>
                  <button className="btn-owner" onClick={() => markSold(detailListing)}>
                    {detailListing.sold ? "♻️ Relist" : "✅ Mark Sold"}
                  </button>
                  <button
                    className="btn-owner"
                    style={{ color: "#f43f5e", borderColor: "rgba(244,63,94,0.25)" }}
                    onClick={() => deleteListing(detailListing)}
                  >
                    🗑️ Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Composer Sheet ── */}
      {showComposer && (
        <>
          <div className="composer-overlay" onClick={() => setShowComposer(false)} />
          <div className="composer-sheet">
            <div className="composer-handle" />
            <div className="composer-head">
              <span className="composer-head-title">🛍️ Post a Listing</span>
              <button className="composer-close" onClick={() => setShowComposer(false)}>✕</button>
            </div>
            <div className="composer-sheet-inner" ref={composerInnerRef}>
              {/* Image */}
              <div className="form-field">
                <label className="form-label">Photo (optional)</label>
                <input ref={imageRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setFormImage(f);
                    setFormImagePrev(URL.createObjectURL(f));
                    e.target.value = "";
                  }} />
                <div className="img-upload-zone" onClick={() => imageRef.current?.click()}>
                  {formImagePrev
                    ? <img src={formImagePrev} alt="preview" style={{ width: "100%", height: "100%", maxHeight: 180, objectFit: "cover" }} />
                    : <div style={{ textAlign: "center", color: "var(--text-3)", padding: "24px 0" }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
                        <div style={{ fontSize: 12 }}>Tap to upload (max 2MB)</div>
                      </div>
                  }
                </div>
                {formImagePrev && (
                  <button
                    onClick={() => { setFormImage(null); setFormImagePrev(null); }}
                    style={{ marginTop: 6, fontSize: 11, color: "#f43f5e", background: "none", border: "none", cursor: "pointer", fontFamily: "'Sora',sans-serif" }}
                  >
                    ✕ Remove photo
                  </button>
                )}
              </div>

              {/* Title */}
              <div className="form-field">
                <label className="form-label">Title *</label>
                <input value={formTitle} onChange={e => setFormTitle(e.target.value)} style={inp} placeholder="e.g. iPhone 15 Pro" />
              </div>

              {/* Description */}
              <div className="form-field">
                <label className="form-label">Description</label>
                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)}
                  rows={3} style={{ ...inp, resize: "vertical", minHeight: 72, lineHeight: 1.6 }}
                  placeholder="Describe the item, its condition, availability…" />
              </div>

              {/* Price + Negotiable */}
              <div className="form-row">
                <div>
                  <label className="form-label">Price (₦) *</label>
                  <input type="number" value={formPrice} onChange={e => setFormPrice(e.target.value)}
                    style={inp} placeholder="e.g. 3500" min={0} />
                </div>
                <div>
                  <label className="form-label">Negotiable?</label>
                  <div style={{ paddingTop: 10 }}>
                    <div className="toggle-row" onClick={() => setFormNeg(o => !o)}>
                      <div className={`toggle-track${formNeg ? " on" : ""}`}>
                        <div className="toggle-thumb" />
                      </div>
                      <span style={{ fontSize: 12.5, color: formNeg ? "var(--green-glow)" : "var(--text-3)" }}>
                        {formNeg ? "Yes, negotiable" : "Fixed price"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category + Condition */}
              <div className="form-row">
                <div>
                  <label className="form-label">Category</label>
                  <select value={formCat} onChange={e => setFormCat(e.target.value as ListingCategory)} style={inp}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Condition</label>
                  <select value={formCond} onChange={e => setFormCond(e.target.value as ListingCondition)} style={inp}>
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="form-field">
                <label className="form-label">WhatsApp Number (optional)</label>
                <input value={formWhatsapp} onChange={e => setFormWhatsapp(e.target.value)}
                  style={inp} placeholder="e.g. 08012345678" />
                <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 5 }}>
                  Buyers will use this to contact you directly via WhatsApp.
                </div>
              </div>

              <button
                className="composer-submit"
                onClick={handlePost}
                disabled={formLoading}
              >
                {formLoading ? <div className="spinner" /> : "🛍️ Post Listing"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
          padding: "10px 20px", borderRadius: 100,
          background: "linear-gradient(135deg,rgba(20,83,45,0.95),rgba(14,30,18,0.98))",
          border: "1px solid rgba(34,197,94,0.3)", color: "var(--green-glow,#22c55e)",
          fontSize: 13, fontWeight: 600, fontFamily: "'Sora',sans-serif",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)", backdropFilter: "blur(20px)",
          zIndex: 600, whiteSpace: "nowrap",
          animation: "toast-in 0.3s cubic-bezier(0.16,1,0.3,1)",
        }}>✓ {toast}</div>
      )}
   </div>
  );
}
