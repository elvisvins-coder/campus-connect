// src/components/AppShell.tsx
// Campus Connect — Taraba State University
// Full Firebase Integration: Real Posts + Real Profile

import { useState, useRef, useEffect, useCallback } from "react";
import { signOut } from "firebase/auth";
import {
  collection, addDoc, getDocs, onSnapshot, doc,
  updateDoc, arrayUnion, arrayRemove, query,
  orderBy, serverTimestamp, getDoc, setDoc, limit,
  where, deleteDoc,
} from "firebase/firestore";
import {
  ref, uploadBytes, getDownloadURL,
} from "firebase/storage";
import { auth, db, storage, messaging, getToken, onMessage } from "../firebase";
import lockIcon from "../assets/logo.png";
import { TASUNoticeBoard } from "./TASUNoticeBoard";
import { StorySystem } from "./StorySystem"
import Marketplace from "./Marketplace";
import Departments from "./Departments";
import LostAndFound from "./LostAndFound";
import DirectMessages, { startConversation } from "./DirectMessages";

// ── Nigeria States & LGAs ────────────────────────────────────────────────
const NIGERIA_STATE_LGAS: Record<string, string[]> = {
  "Abia": ["Aba North","Aba South","Arochukwu","Bende","Ikwuano","Isiala-Ngwa North","Isiala-Ngwa South","Isuikwato","Obi Nwa","Ohafia","Osisioma","Ngwa","Ugwunagbo","Ukwa East","Ukwa West","Umuahia North","Umuahia South","Umu-Neochi"],
  "Adamawa": ["Demsa","Fufore","Ganaye","Gireri","Gombi","Guyuk","Hong","Jada","Lamurde","Madagali","Maiha","Mayo-Belwa","Michika","Mubi North","Mubi South","Numan","Shelleng","Song","Toungo","Yola North","Yola South"],
  "Akwa Ibom": ["Abak","Eastern Obolo","Eket","Esit Eket","Essien Udim","Etim Ekpo","Etinan","Ibeno","Ibesikpo Asutan","Ibiono Ibom","Ika","Ikono","Ikot Abasi","Ikot Ekpene","Ini","Itu","Mbo","Mkpat Enin","Nsit Atai","Nsit Ibom","Nsit Ubium","Obot Akara","Okobo","Onna","Oron","Oruk Anam","Udung Uko","Ukanafun","Uruan","Urue-Offong/Oruko","Uyo"],
  "Anambra": ["Aguata","Anambra East","Anambra West","Anaocha","Awka North","Awka South","Ayamelum","Dunukofia","Ekwusigo","Idemili North","Idemili south","Ihiala","Njikoka","Nnewi North","Nnewi South","Ogbaru","Onitsha North","Onitsha South","Orumba North","Orumba South","Oyi"],
  "Bauchi": ["Alkaleri","Bauchi","Bogoro","Damban","Darazo","Dass","Ganjuwa","Giade","Itas/Gadau","Jama'are","Katagum","Kirfi","Misau","Ningi","Shira","Tafawa-Balewa","Toro","Warji","Zaki"],
  "Bayelsa": ["Brass","Ekeremor","Kolokuma/Opokuma","Nembe","Ogbia","Sagbama","Southern Jaw","Yenegoa"],
  "Benue": ["Ado","Agatu","Apa","Buruku","Gboko","Guma","Gwer East","Gwer West","Katsina-Ala","Konshisha","Kwande","Logo","Makurdi","Obi","Ogbadibo","Oju","Okpokwu","Ohimini","Oturkpo","Tarka","Ukum","Ushongo","Vandeikya"],
  "Borno": ["Abadam","Askira/Uba","Bama","Bayo","Biu","Chibok","Damboa","Dikwa","Gubio","Guzamala","Gwoza","Hawul","Jere","Kaga","Kala/Balge","Konduga","Kukawa","Kwaya Kusar","Mafa","Magumeri","Maiduguri","Marte","Mobbar","Monguno","Ngala","Nganzai","Shani"],
  "Cross River": ["Akpabuyo","Odukpani","Akamkpa","Biase","Abi","Ikom","Yarkur","Odubra","Boki","Ogoja","Yala","Obanliku","Obudu","Calabar South","Etung","Bekwara","Bakassi","Calabar Municipality"],
  "Delta": ["Oshimili","Aniocha","Aniocha South","Ika South","Ika North-East","Ndokwa West","Ndokwa East","Isoko south","Isoko North","Bomadi","Burutu","Ughelli South","Ughelli North","Ethiope West","Ethiope East","Sapele","Okpe","Warri North","Warri South","Uvwie","Udu","Warri Central","Ukwani","Oshimili North","Patani"],
  "Ebonyi": ["Edda","Afikpo","Onicha","Ohaozara","Abakaliki","Ishielu","lkwo","Ezza","Ezza South","Ohaukwu","Ebonyi","Ivo"],
  "Edo": ["Esan North-East","Esan Central","Esan West","Egor","Ukpoba","Central","Etsako Central","Igueben","Oredo","Ovia SouthWest","Ovia South-East","Orhionwon","Uhunmwonde","Etsako East","Esan South-East"],
  "Ekiti": ["Ado","Ekiti-East","Ekiti-West","Emure/Ise/Orun","Ekiti South-West","Ikere","Irepodun","Ijero","Ido/Osi","Oye","Ikole","Moba","Gbonyin","Efon","Ise/Orun","Ilejemeje"],
  "Enugu": ["Enugu South","Igbo-Eze South","Enugu North","Nkanu","Udi Agwu","Oji-River","Ezeagu","IgboEze North","Isi-Uzo","Nsukka","Igbo-Ekiti","Uzo-Uwani","Enugu East","Aninri","Nkanu East","Udenu"],
  "FCT": ["Abaji","Abuja Municipal","Bwari","Gwagwalada","Kuje","Kwali"],
  "Gombe": ["Akko","Balanga","Billiri","Dukku","Kaltungo","Kwami","Shomgom","Funakaye","Gombe","Nafada/Bajoga","Yamaltu/Delta"],
  "Imo": ["Aboh-Mbaise","Ahiazu-Mbaise","Ehime-Mbano","Ezinihitte","Ideato North","Ideato South","Ihitte/Uboma","Ikeduru","Isiala Mbano","Isu","Mbaitoli","Ngor-Okpala","Njaba","Nwangele","Nkwerre","Obowo","Oguta","Ohaji/Egbema","Okigwe","Orlu","Orsu","Oru East","Oru West","Owerri-Municipal","Owerri North","Owerri West"],
  "Jigawa": ["Auyo","Babura","Birni Kudu","Biriniwa","Buji","Dutse","Gagarawa","Garki","Gumel","Guri","Gwaram","Gwiwa","Hadejia","Jahun","Kafin Hausa","Kaugama Kazaure","Kiri Kasamma","Kiyawa","Maigatari","Malam Madori","Miga","Ringim","Roni","Sule-Tankarkar","Taura","Yankwashi"],
  "Kaduna": ["Birni-Gwari","Chikun","Giwa","Igabi","Ikara","Jaba","Jema'a","Kachia","Kaduna North","Kaduna South","Kagarko","Kajuru","Kaura","Kauru","Kubau","Kudan","Lere","Makarfi","Sabon-Gari","Sanga","Soba","Zango-Kataf","Zaria"],
  "Kano": ["Ajingi","Albasu","Bagwai","Bebeji","Bichi","Bunkure","Dala","Dambatta","Dawakin Kudu","Dawakin Tofa","Doguwa","Fagge","Gabasawa","Garko","Garum Mallam","Gaya","Gezawa","Gwale","Gwarzo","Kabo","Kano Municipal","Karaye","Kibiya","Kiru","Kumbotso","Ghari","Kura","Madobi","Makoda","Minjibir","Nasarawa","Rano","Rimin Gado","Rogo","Shanono","Sumaila","Takali","Tarauni","Tofa","Tsanyawa","Tudun Wada","Ungogo","Warawa","Wudil"],
  "Katsina": ["Bakori","Batagarawa","Batsari","Baure","Bindawa","Charanchi","Dandume","Danja","Dan Musa","Daura","Dutsi","Dutsin-Ma","Faskari","Funtua","Ingawa","Jibia","Kafur","Kaita","Kankara","Kankia","Katsina","Kurfi","Kusada","Mai'Adua","Malumfashi","Mani","Mashi","Matazuu","Musawa","Rimi","Sabuwa","Safana","Sandamu","Zango"],
  "Kebbi": ["Aleiro","Arewa-Dandi","Argungu","Augie","Bagudo","Birnin Kebbi","Bunza","Dandi","Fakai","Gwandu","Jega","Kalgo","Koko/Besse","Maiyama","Ngaski","Sakaba","Shanga","Suru","Wasagu/Danko","Yauri","Zuru"],
  "Kogi": ["Adavi","Ajaokuta","Ankpa","Bassa","Dekina","Ibaji","Idah","Igalamela-Odolu","Ijumu","Kabba/Bunu","Kogi","Lokoja","Mopa-Muro","Ofu","Ogori/Mangongo","Okehi","Okene","Olamabolo","Omala","Yagba East","Yagba West"],
  "Kwara": ["Asa","Baruten","Edu","Ekiti","Ifelodun","Ilorin East","Ilorin West","Irepodun","Isin","Kaiama","Moro","Offa","Oke-Ero","Oyun","Pategi"],
  "Lagos": ["Agege","Ajeromi-Ifelodun","Alimosho","Amuwo-Odofin","Apapa","Badagry","Epe","Eti-Osa","Ibeju/Lekki","Ifako-Ijaye","Ikeja","Ikorodu","Kosofe","Lagos Island","Lagos Mainland","Mushin","Ojo","Oshodi-Isolo","Shomolu","Surulere"],
  "Nasarawa": ["Akwanga","Awe","Doma","Karu","Keana","Keffi","Kokona","Lafia","Nasarawa","Nasarawa-Eggon","Obi","Toto","Wamba"],
  "Niger": ["Agaie","Agwara","Bida","Borgu","Bosso","Chanchaga","Edati","Gbako","Gurara","Katcha","Kontagora","Lapai","Lavun","Magama","Mariga","Mashegu","Mokwa","Muya","Pailoro","Rafi","Rijau","Shiroro","Suleja","Tafa","Wushishi"],
  "Ogun": ["Abeokuta North","Abeokuta South","Ado-Odo/Ota","Yewa North","Yewa South","Ewekoro","Ifo","Ijebu East","Ijebu North","Ijebu North East","Ijebu Ode","Ikenne","Imeko-Afon","Ipokia","Obafemi-Owode","Ogun Waterside","Odeda","Odogbolu","Remo North","Shagamu"],
  "Ondo": ["Akoko North East","Akoko North West","Akoko South Akure East","Akoko South West","Akure North","Akure South","Ese-Odo","Idanre","Ifedore","Ilaje","Ile-Oluji","Okeigbo","Irele","Odigbo","Okitipupa","Ondo East","Ondo West","Ose","Owo"],
  "Osun": ["Aiyedade","Aiyedire","Atakumosa East","Atakumosa West","Boluwaduro","Boripe","Ede North","Ede South","Egbedore","Ejigbo","Ife Central","Ife East","Ife North","Ife South","Ifedayo","Ifelodun","Ila","Ilesha East","Ilesha West","Irepodun","Irewole","Isokan","Iwo","Obokun","Odo-Otin","Ola-Oluwa","Olorunda","Oriade","Orolu","Osogbo"],
  "Oyo": ["Afijio","Akinyele","Atiba","Atisbo","Egbeda","Ibadan Central","Ibadan North","Ibadan North West","Ibadan South East","Ibadan South West","Ibarapa Central","Ibarapa East","Ibarapa North","Ido","Irepo","Iseyin","Itesiwaju","Iwajowa","Kajola","Lagelu","Ogbomosho North","Ogbomosho South","Ogo Oluwa","Olorunsogo","Oluyole","Ona-Ara","Orelope","Ori Ire","Oyo East","Oyo West","Saki East","Saki West","Surulere"],
  "Plateau": ["Barikin Ladi","Bassa","Bokkos","Jos East","Jos North","Jos South","Kanam","Kanke","Langtang North","Langtang South","Mangu","Mikang","Pankshin","Qua'an Pan","Riyom","Shendam","Wase"],
  "Rivers": ["Abua/Odual","Ahoada East","Ahoada West","Akuku Toru","Andoni","Asari-Toru","Bonny","Degema","Emohua","Eleme","Etche","Gokana","Ikwerre","Khana","Obio/Akpor","Ogba/Egbema/Ndoni","Ogu/Bolo","Okrika","Omumma","Opobo/Nkoro","Oyigbo","Port-Harcourt","Tai"],
  "Sokoto": ["Binji","Bodinga","Dange-shnsi","Gada","Goronyo","Gudu","Gawabawa","Illela","Isa","Kware","Kebbe","Rabah","Sabon birni","Shagari","Silame","Sokoto North","Sokoto South","Tambuwal","Tqngaza","Tureta","Wamako","Wurno","Yabo"],
  "Taraba": ["Ardo-kola","Bali","Donga","Gashaka","Cassol","Ibi","Jalingo","Karin-Lamido","Kurmi","Lau","Sardauna","Takum","Ussa","Wukari","Yorro","Zing"],
  "Yobe": ["Bade","Bursari","Damaturu","Fika","Fune","Geidam","Gujba","Gulani","Jakusko","Karasuwa","Karawa","Machina","Nangere","Nguru","Potiskum","Tarmua","Yunusari","Yusufari"],
  "Zamfara": ["Anka","Bakura","Birnin Magaji","Bukkuyum","Bungudu","Gummi","Gusau","Kaura Namoda","Maradun","Maru","Shinkafi","Talata Mafara","Tsafe","Zurmi"],
};
const NIGERIA_STATES = Object.keys(NIGERIA_STATE_LGAS).sort();

// ─────────────────────────────────────────────────────────────
// FIRESTORE COLLECTIONS (create these in Firebase console):
//   /posts        — all campus posts
//   /users/{uid}  — user profile documents
//
// FIRESTORE SECURITY RULES (paste in Firebase console):
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /posts/{post} {
//       allow read: if request.auth != null;
//       allow create: if request.auth != null;
//       allow update: if request.auth != null;
//       allow delete: if request.auth.uid == resource.data.uid;
//     }
//     match /users/{uid} {
//       allow read: if request.auth != null;
//       allow write: if request.auth.uid == uid;
// ── Admin config ─────────────────────────────────────────────
const ADMIN_UID = "PxIpEGUtJ1NmUbdfEbpvL3YBSLh2";

type EditRequest = {
  uid: string;
  name: string;
  field: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  profileLocked?: boolean;
  createdAt?: any;
};
type CBTBank = {
  id: string;
  faculty: string;
  department: string;
  course: string;
  courseCode?: string;
  title: string;
  description?: string;
  durationMinutes: number;
  questionCount: number;
  createdBy: string;
  createdAt?: any;
};
type CBTQuestion = {
  id: string;
  bankId: string;
  question: string;
  options: { label: "A"|"B"|"C"|"D"; text: string }[];
  correctAnswer: "A"|"B"|"C"|"D";
  createdAt?: any;
};
type CBTScore = {
  id: string;
  uid: string;
  bankId: string;
  bankTitle: string;
  course: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  timeTaken: number;
  answers: { questionId: string; selected: "A"|"B"|"C"|"D"|null; correct: "A"|"B"|"C"|"D"; isCorrect: boolean }[];
  createdAt?: any;
};
//     }
//   }
// }
//
// STORAGE SECURITY RULES:
// rules_version = '2';
// service firebase.storage {
//   match /b/{bucket}/o {
//     match /avatars/{uid} {
//       allow read: if request.auth != null;
//       allow write: if request.auth.uid == uid;
//     }
//   }
// }
// ─────────────────────────────────────────────────────────────
type Comment = {
  id: string;
  uid: string;
  name: string;
  avatarUrl?: string;
  faculty: string;
  level: string;
  content: string;
  createdAt: any;
};
// ── Types ─────────────────────────────────────────────────────
type UserProfile = {
  uid: string;
  name: string;
  faculty: string;
  department: string;
  level: string;
  tribe?: string;
  lga?: string;
  stateNg?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  followers?: string[];
  following?: string[];
  profileLocked?: boolean;
  fcmTokens?: string[];
  // ── Verification fields ──
  verificationStatus?: "unverified" | "pending" | "verified" | "rejected" | "blocked";
  verificationDocUrl?: string;
  verificationRegNumber?: string;
  verificationFullName?: string;
  verificationRejectedCount?: number;
  verificationRejectionReason?: string;
  createdAt?: any;
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
  isAnonymous?: boolean;
  likes: string[];
  bookmarks: string[];
  comments: number;
  shares: number;
  imageUrl?: string;
  imageUrls?: string[];
  poll?: {
    question: string;
    options: { text: string; votes: string[] }[];
  };
};




const NAV_ITEMS: { id: string; icon: string; label: string; badge?: number }[] = [
  { id: "feed",        icon: "⊞", label: "Home Feed" },
  { id: "search",      icon: "🔍", label: "Find Students" },
  { id: "notices",     icon: "📋", label: "Notice Board" },
  { id: "events",      icon: "📅", label: "Events" },
  { id: "departments", icon: "🏛️", label: "Departments" },
  { id: "cbt",         icon: "📝", label: "CBT Practice" },
  { id: "marketplace", icon: "🛍️", label: "Marketplace" },
  { id: "lostfound",   icon: "📍", label: "Lost & Found" },
  { id: "messages",    icon: "💬", label: "Messages" },
  { id: "conference",  icon: "🏛️", label: "Conference Hall" },
  { id: "profile",     icon: "👤", label: "My Profile" },
  { id: "admin",       icon: "🛡️", label: "Admin Panel" },
  { id: "settings",    icon: "⚙️", label: "Settings" },
];

const BOTTOM_NAV: { id: string; icon: string; label: string; badge?: number }[] = [
  { id: "feed",    icon: "⊞", label: "Feed" },
  { id: "search",  icon: "🔍", label: "Search" },
  { id: "messages",icon: "💬", label: "Messages" },
  { id: "notices",     icon: "📋", label: "Notices" },
  { id: "conference",  icon: "🏛️", label: "Hall" },
  { id: "profile", icon: "👤", label: "Profile" },
];

const FACULTIES = [
  "Management Sciences", "Health Science", "Agriculture", "Education",
  "Engineering", "Sciences", "Law", "Social Science", "Arts",
  "Communication and Media Studies",
];

const DEPARTMENTS: Record<string, string[]> = {
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
    "Islamic Studies",
    "Linguistics / English",
    "Linguistics / Hausa",
    "Theatre And Film Studies",
  ],
  "Communication and Media Studies": [
    "Mass Communication",
  ],
};
const LEVELS = ["100","200","300","400","500","Staff","N/A"];

const AVATAR_COLORS = [
  ["#166534","#16a34a"],["#b45309","#f59e0b"],["#1d4ed8","#3b82f6"],
  ["#7c3aed","#a78bfa"],["#be123c","#f43f5e"],["#0f766e","#14b8a6"],
];
function avatarGrad(uid: string) {
  const i = uid.split("").reduce((a,c)=>a+c.charCodeAt(0),0) % AVATAR_COLORS.length;
  return `linear-gradient(135deg,${AVATAR_COLORS[i][0]},${AVATAR_COLORS[i][1]})`;
}
function postSubtext(uid: string, faculty: string, department: string, level: string, isAnonymous?: boolean) {
  if (isAnonymous) return "";
  if (uid === ADMIN_UID) return "";
  return [faculty, department, level ? `${level}L` : ""].filter(Boolean).join(" · ");
}
function displayName(uid: string, name: string, isAnonymous?: boolean) {
  if (isAnonymous) return "Anonymous TASU Student";
  return uid === ADMIN_UID ? "Campus Connect Official" : name;
}
function initials(name: string) {
  return name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
}
function timeAgo(ts: any): string {
  if (!ts) return "just now";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now()-d.getTime())/1000);
  if (s<60)  return "just now";
  if (s<3600) return `${Math.floor(s/60)} min ago`;
  if (s<86400) return `${Math.floor(s/3600)} hr ago`;
  return `${Math.floor(s/86400)} d ago`;
}

// ── Avatar component ──────────────────────────────────────
  const Avatar = ({ uid, name, url, size=40, radius=11 }: {uid:string;name:string;url?:string;size?:number;radius?:number}) => (
    <div style={{
      width:size, height:size, borderRadius:radius, flexShrink:0,
      background: url ? "transparent" : avatarGrad(uid),
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.32, fontWeight:700, color:"#fff",
      border:"1.5px solid rgba(255,255,255,0.1)",
      overflow:"hidden",
    }}>
      {url
        ? <img src={url} alt={name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        : initials(name)}
    </div>
  );

  // ── Anonymous Mask Icon ───────────────────────────────────
const AnonMaskIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <ellipse cx="50" cy="52" rx="34" ry="42" fill="#f4f2ec"/>
    <path d="M22 46c4-3 10-5 14-3 3 2 3 6 0 8-4 3-10 3-15 0-3-2-3-4 1-5z" fill="#141414"/>
    <path d="M78 46c-4-3-10-5-14-3-3 2-3 6 0 8 4 3 10 3 15 0 3-2 3-4-1-5z" fill="#141414"/>
  </svg>
);
// ── Exam Countdown Banner ─────────────────────────────────
const ExamCountdownBanner = ({ data }: { data: { title: string; examDate: any; active: boolean } }) => {
  if (!data?.active || !data?.examDate) return null;
  const examDate = data.examDate.toDate ? data.examDate.toDate() : new Date(data.examDate);
  const daysLeft = Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  let tone = { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.25)", color: "#22c55e" };
  let message = `${daysLeft} days until ${data.title}`;

  if (daysLeft <= 0) {
    tone = { bg: "rgba(255,255,255,0.03)", border: "var(--border)", color: "var(--text-2)" };
    message = daysLeft === 0 ? `${data.title} starts today!` : `${data.title} is underway`;
  } else if (daysLeft <= 6) {
    tone = { bg: "rgba(244,63,94,0.08)", border: "rgba(244,63,94,0.25)", color: "#f43f5e" };
    message = `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left! ${data.title} is almost here`;
  } else if (daysLeft <= 14) {
    tone = { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", color: "#f59e0b" };
    message = `${daysLeft} days left — start revising for ${data.title}!`;
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 16px", borderRadius: 14, marginBottom: 16,
      background: tone.bg, border: `1px solid ${tone.border}`,
    }}>
      <span style={{ fontSize: 20 }}>📅</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: tone.color }}>{message}</span>
    </div>
  );
};
// ── Onboarding Checklist ───────────────────────────────────
const OnboardingChecklist = ({ myProfile, currentUser, onDismiss }: any) => {
  const steps = [
    { done: !!myProfile?.faculty, label: "Complete your profile" },
    { done: !!myProfile?.avatarUrl, label: "Add a profile photo" },
    { done: (myProfile?.following?.length || 0) >= 5, label: "Follow 5 coursemates" },
    { done: !!(myProfile as any)?.lastPostDate, label: "Make your first post" },
  ];
  const completedCount = steps.filter(s => s.done).length;
  const allDone = completedCount === steps.length;

  useEffect(() => {
    if (allDone) onDismiss(true); // auto-hide once everything is complete
  }, [allDone]);

  if (allDone) return null;

  return (
    <div style={{
      marginBottom: 16, padding: "16px 18px", borderRadius: 16,
      background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontFamily: "'Fraunces',serif", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
          🚀 Get Started on Campus Connect
        </div>
        <button onClick={() => onDismiss(false)} style={{
          background: "transparent", border: "none", color: "var(--text-3)",
          fontSize: 12, cursor: "pointer", padding: 4,
        }}>✕</button>
      </div>

      <div style={{
        height: 4, borderRadius: 4, background: "rgba(255,255,255,0.07)",
        overflow: "hidden", marginBottom: 14,
      }}>
        <div style={{
          height: "100%", borderRadius: 4,
          width: `${(completedCount / steps.length) * 100}%`,
          background: "linear-gradient(90deg,#166534,#22c55e,#f59e0b)",
          transition: "width 0.4s ease",
        }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700,
              background: step.done ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)",
              border: step.done ? "1.5px solid rgba(34,197,94,0.4)" : "1.5px solid var(--border)",
              color: step.done ? "var(--green-glow)" : "var(--text-3)",
            }}>
              {step.done ? "✓" : ""}
            </div>
            <span style={{
              fontSize: 12.5, color: step.done ? "var(--text-3)" : "var(--text-2)",
              textDecoration: step.done ? "line-through" : "none",
            }}>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
  // ── Post Card component ───────────────────────────────────
  const PostCard = ({
  post, idx, currentUserId, onLike, onBookmark, onComment,
  onOpenOptions, optionsPost, onShare, onDeletePost,
  onReportPost, deleteLoading, toggleBookmark, closeOptions, onVote,
  onImageClick, onViewProfile,
}: {
  post: Post; idx: number; currentUserId: string;
  onLike: (p: Post) => void;
  onVote: (p: Post, optionIndex: number) => void;
  onBookmark: (p: Post) => void;
  onComment: (p: Post) => void;
  onOpenOptions: (e: React.MouseEvent, p: Post) => void;
  optionsPost: Post | null;
  onShare: () => void;
  onDeletePost: () => void;
  onReportPost: () => void;
  deleteLoading: boolean;
  toggleBookmark: (p: Post) => void;
  closeOptions: () => void;
  onImageClick: (images: string[], index: number) => void;
  onViewProfile?: (uid: string) => void;
}) => {
    const liked      = post.likes.includes(currentUserId);
const bookmarked = post.bookmarks.includes(currentUserId);
    return (
      <article className="post-card" style={{
        animationDelay:`${idx*0.05}s`,
        ...(post.uid === ADMIN_UID ? {
          border: "1.5px solid rgba(245,158,11,0.4)",
          background: "linear-gradient(135deg,rgba(245,158,11,0.06),rgba(255,255,255,0.025))",
          boxShadow: "0 0 0 1px rgba(245,158,11,0.1)",
        } : {}),
      }}>
       <div className="post-header">
          <div
            onClick={() => !post.isAnonymous && post.uid !== ADMIN_UID && onViewProfile?.(post.uid)}
            style={{ cursor: (!post.isAnonymous && post.uid !== ADMIN_UID) ? "pointer" : "default" }}
          >
            {post.isAnonymous ? (
              <div style={{
                width:40, height:40, borderRadius:11, flexShrink:0,
                background:"linear-gradient(135deg,#18181b,#000000)",
                display:"flex", alignItems:"center", justifyContent:"center",
                border:"1.5px solid rgba(255,255,255,0.12)",
              }}><AnonMaskIcon size={26}/></div>
            ) : (
              <Avatar uid={post.uid} name={post.name} url={post.avatarUrl} size={40} radius={11}/>
            )}
          </div>
          <div className="post-meta">
            <div className="post-name-row">
<span
  className="post-name"
  style={{color: post.isAnonymous ? "#a78bfa" : "var(--text)", cursor: (!post.isAnonymous && post.uid !== ADMIN_UID) ? "pointer" : "default"}}
  onClick={() => !post.isAnonymous && post.uid !== ADMIN_UID && onViewProfile?.(post.uid)}
>{displayName(post.uid, post.name, post.isAnonymous)}</span>
              {post.uid === ADMIN_UID && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  padding: "2px 8px", borderRadius: 100,
                  background: "rgba(245,158,11,0.15)",
                  border: "1px solid rgba(245,158,11,0.35)",
                  fontSize: 9.5, fontWeight: 700,
                  color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  ✓ Official
                </span>
              )}
              {post.isAnonymous && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 8px", borderRadius: 100,
                  background: "rgba(167,139,250,0.15)",
                  border: "1px solid rgba(167,139,250,0.35)",
                  fontSize: 9.5, fontWeight: 700,
                  color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  <AnonMaskIcon size={11}/> Confession
                </span>
              )}
              {post.tag && (
                <span className={`post-tag-badge${post.tag==="Official Notice"?" official":""}`}>{post.tag}</span>
              )}
            </div>
            <div className="post-sub" style={{color:"var(--text-2)"}}>
              {postSubtext(post.uid, post.faculty, post.department, post.level, post.isAnonymous)}
            </div>
          </div>
<span className="post-time" style={{color:"var(--text-3)"}}>{timeAgo(post.createdAt)}</span>          <div style={{position:"relative",flexShrink:0}}>
            <button
              className="post-more-btn"
              aria-label="More options"
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                onOpenOptions(e, post);
              }}
            >⋯</button>
            {/* {optionsPost?.id === post.id && (
              <div className="options-menu" style={{
                position:"absolute",
                top:"100%",
                right:0,
                zIndex:451,
              }}>
                <button className="options-item" onClick={onShare}>
                  <span>🔗</span> Share post
                </button>
                <button className="options-item" onClick={() => { toggleBookmark(optionsPost); closeOptions(); }}>
                  <span>🔖</span>
                  {post.bookmarks.includes(currentUserId) ? "Remove bookmark" : "Bookmark post"}
                </button>
                <div className="options-divider" />
                {post.uid === currentUserId && (
  <button className="options-item danger" onClick={onDeletePost} disabled={deleteLoading}>
    <span>🗑️</span> {deleteLoading ? "Deleting…" : "Delete post"}
  </button>
)}
{post.uid !== currentUserId && (
  <button className="options-item danger" onClick={onReportPost}>
    <span>🚩</span> Report post
  </button>
)}
              </div>
            )} */}
          </div>          

        </div>
<div className="post-body" style={{color:"var(--text)"}}>{post.content}</div>
{/* Post images — grid layout */}
{(() => {
  const imgs = post.imageUrls?.length
    ? post.imageUrls
    : post.imageUrl
    ? [post.imageUrl]
    : [];
  if (imgs.length === 0) return null;

  const imgStyle = (h: number): React.CSSProperties => ({
    width:"100%", height:h, objectFit:"cover",
    display:"block", cursor:"pointer",
  });

  if (imgs.length === 1) return (
    <div style={{marginBottom:14,borderRadius:12,overflow:"hidden",border:"1px solid var(--border)"}}>
      <img src={imgs[0]} alt="post" style={{...imgStyle(360),maxHeight:480,height:"auto",objectFit:"contain",background:"rgba(0,0,0,0.3)"}}
        onClick={() => onImageClick(imgs, 0)}/>
    </div>
  );

  if (imgs.length === 2) return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3,marginBottom:14,borderRadius:12,overflow:"hidden",border:"1px solid var(--border)"}}>
      {imgs.map((url,i) => (
        <img key={i} src={url} alt={`post-${i}`} style={imgStyle(220)}
          onClick={() => onImageClick(imgs, i)}/>
      ))}
    </div>
  );

  if (imgs.length === 3) return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3,marginBottom:14,borderRadius:12,overflow:"hidden",border:"1px solid var(--border)"}}>
      <img src={imgs[0]} alt="post-0" style={{...imgStyle(300),gridRow:"span 2"}}
        onClick={() => onImageClick(imgs, 0)}/>
      <img src={imgs[1]} alt="post-1" style={imgStyle(148)}
        onClick={() => onImageClick(imgs, 1)}/>
      <img src={imgs[2]} alt="post-2" style={imgStyle(148)}
        onClick={() => onImageClick(imgs, 2)}/>
    </div>
  );

  if (imgs.length === 4) return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3,marginBottom:14,borderRadius:12,overflow:"hidden",border:"1px solid var(--border)"}}>
      {imgs.map((url,i) => (
        <img key={i} src={url} alt={`post-${i}`} style={imgStyle(180)}
          onClick={() => onImageClick(imgs, i)}/>
      ))}
    </div>
  );

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3,marginBottom:14,borderRadius:12,overflow:"hidden",border:"1px solid var(--border)"}}>
      {imgs.slice(0,3).map((url,i) => (
        <img key={i} src={url} alt={`post-${i}`} style={imgStyle(180)}
          onClick={() => onImageClick(imgs, i)}/>
      ))}
      {imgs[3] && (
        <img src={imgs[3]} alt="post-3" style={imgStyle(180)}
          onClick={() => onImageClick(imgs, 3)}/>
      )}
      {imgs[4] && (
        <div style={{position:"relative",cursor:"pointer"}}
          onClick={() => onImageClick(imgs, 4)}>
          <img src={imgs[4]} alt="post-4" style={imgStyle(180)}/>
          {imgs.length > 5 && (
            <div style={{
              position:"absolute",inset:0,
              background:"rgba(0,0,0,0.55)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:22,fontWeight:700,color:"#fff",
            }}>+{imgs.length - 4}</div>
          )}
        </div>
      )}
    </div>
  );
})()}

{/* Poll */}
{post.poll && (
  <div style={{
    marginBottom:14,padding:14,
    background:"rgba(255,255,255,0.03)",
    border:"1px solid rgba(96,165,250,0.18)",
    borderRadius:12,
  }}>
    <div style={{fontSize:11,fontWeight:700,color:"#60a5fa",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>
      📊 Poll
    </div>
    <div style={{fontSize:13.5,fontWeight:600,color:"var(--text)",marginBottom:12,lineHeight:1.4}}>
      {post.poll.question}
    </div>
    {(() => {
      const totalVotes = post.poll!.options.reduce((s,o)=>s+o.votes.length,0);
      const myVote     = post.poll!.options.findIndex(o=>o.votes.includes(currentUserId));
      return post.poll!.options.map((opt,i)=>{
        const pct   = totalVotes ? Math.round((opt.votes.length/totalVotes)*100) : 0;
        const voted = myVote === i;
        return (
          <button
            key={i}
           onClick={() => onVote(post, i)} // reuse onLike slot — we'll wire handleVote below
            style={{
              width:"100%",marginBottom:8,padding:"10px 14px",
              borderRadius:10,border:`1.5px solid ${voted?"rgba(96,165,250,0.5)":"rgba(255,255,255,0.08)"}`,
              background:voted?"rgba(96,165,250,0.1)":"rgba(255,255,255,0.03)",
              cursor:"pointer",textAlign:"left",position:"relative",overflow:"hidden",
            }}
          >
            {/* progress bar */}
            <div style={{
              position:"absolute",left:0,top:0,bottom:0,
              width:`${pct}%`,
              background:voted?"rgba(96,165,250,0.15)":"rgba(255,255,255,0.04)",
              transition:"width 0.4s ease",
            }}/>
            <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:12.5,fontWeight:voted?700:500,color:voted?"#93c5fd":"rgba(240,244,241,0.8)"}}>
                {voted && "✓ "}{opt.text}
              </span>
              <span style={{fontSize:11,fontWeight:600,color:"var(--text-3)"}}>{pct}%</span>
            </div>
          </button>
        );
      });
    })()}
    <div style={{fontSize:10.5,color:"var(--text-3)",marginTop:4}}>
      {post.poll!.options.reduce((s,o)=>s+o.votes.length,0)} votes
    </div>
  </div>
)}
        <div className="post-actions">
          <button className={`action-btn${liked?" liked":""}`} onClick={() => onLike(post)} aria-label={liked?"Unlike":"Like"}>
            <span className="icon">{liked?"❤️":"🤍"}</span>{post.likes.length}
          </button>
          <button className="action-btn" onClick={() => onComment(post)} aria-label="Comment">
          <span className="icon">💬</span>{post.comments}
          </button>
          <button className="action-btn" aria-label="Share">
            <span className="icon">🔗</span>{post.shares}
          </button>
          <div className="action-spacer"/>
          <button className={`action-btn${bookmarked?" bookmarked":""}`} onClick={()=>toggleBookmark(post)} aria-label="Bookmark">
            <span className="icon">🔖</span>
          </button>
        </div>
      </article>
    );
};
// ── Deleted Messages Archive ──────────────────────────────
const DeletedMessages = () => {
  const [messages,  setMessages]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState(false);

  useEffect(() => {
    if (!expanded) { setLoading(false); return; }
    const q = query(
      collection(db, "deletedMessages"),
      orderBy("deletedAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [expanded]);

  return (
    <div style={{ padding: "0 20px", marginBottom: 32 }}>
      {/* Header toggle */}
      <div
        onClick={() => setExpanded(o => !o)}
        style={{
          display:"flex", alignItems:"center",
          justifyContent:"space-between",
          padding:"14px 16px", borderRadius:14,
          background:"rgba(244,63,94,0.05)",
          border:"1px solid rgba(244,63,94,0.2)",
          cursor:"pointer", marginBottom: expanded ? 14 : 0,
        }}
      >
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <span style={{fontSize:20}}>🗑️</span>
          <div>
            <div style={{
              fontFamily:"'Fraunces',serif",
              fontSize:14, fontWeight:700,
              color:"var(--text)",
            }}>
              Deleted Messages Archive
            </div>
            <div style={{fontSize:11, color:"var(--text-3)", marginTop:1}}>
              Evidence log of all deleted conference messages
            </div>
          </div>
        </div>
        <div style={{
          fontSize:12, fontWeight:700,
          color:"#f43f5e",
          padding:"3px 10px", borderRadius:100,
          background:"rgba(244,63,94,0.1)",
          border:"1px solid rgba(244,63,94,0.2)",
        }}>
          {expanded ? "▲ Hide" : "▼ View"}
        </div>
      </div>

      {expanded && (
        <>
          {loading ? (
            [1,2,3].map(i => (
              <div key={i} className="skeleton" style={{height:80, borderRadius:12, marginBottom:10}}/>
            ))
          ) : messages.length === 0 ? (
            <div style={{
              textAlign:"center", padding:"32px 20px",
              background:"rgba(255,255,255,0.02)",
              border:"1px solid var(--border)",
              borderRadius:14,
            }}>
              <div style={{fontSize:28, marginBottom:8}}>✅</div>
              <div style={{fontSize:13, fontWeight:600, color:"var(--text-2)"}}>
                No deleted messages yet
              </div>
            </div>
          ) : (
            <>
              <div style={{
                fontSize:11, color:"var(--text-3)",
                marginBottom:10, paddingLeft:4,
              }}>
                {messages.length} deleted message{messages.length !== 1 ? "s" : ""} on record
              </div>
              {messages.map(msg => (
                <div key={msg.id} style={{
                  background:"rgba(255,255,255,0.02)",
                  border:"1px solid rgba(244,63,94,0.15)",
                  borderRadius:12, padding:"14px 16px",
                  marginBottom:10,
                }}>
                  {/* Author info */}
                  <div style={{
                    display:"flex", alignItems:"center",
                    gap:10, marginBottom:10,
                  }}>
                    <div style={{
                      width:36, height:36, borderRadius:10,
                      background: msg.avatarUrl ? "transparent" : avatarGrad(msg.uid),
                      overflow:"hidden", flexShrink:0,
                      display:"flex", alignItems:"center",
                      justifyContent:"center",
                      fontSize:12, fontWeight:700, color:"#fff",
                    }}>
                      {msg.avatarUrl
                        ? <img src={msg.avatarUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                        : initials(msg.name)}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{
                        fontSize:13, fontWeight:700, color:"var(--text)",
                      }}>
                        {msg.name}
                      </div>
                      <div style={{fontSize:11, color:"var(--text-3)"}}>
                        {msg.faculty} · {msg.level}L
                      </div>
                    </div>
                    <div style={{
                      fontSize:10, fontWeight:600,
                      color:"#f43f5e", padding:"2px 8px",
                      borderRadius:100,
                      background:"rgba(244,63,94,0.1)",
                      border:"1px solid rgba(244,63,94,0.2)",
                      flexShrink:0,
                    }}>
                      Deleted
                    </div>
                  </div>

                  {/* Message content */}
                  <div style={{
                    padding:"10px 12px", borderRadius:10,
                    background:"rgba(255,255,255,0.03)",
                    border:"1px solid var(--border)",
                    fontSize:13, color:"rgba(240,244,241,0.8)",
                    lineHeight:1.6, marginBottom:10,
                    fontStyle:"italic",
                  }}>
                    "{msg.content}"
                  </div>

                  {/* Meta info */}
                  <div style={{
                    display:"flex", flexWrap:"wrap", gap:8,
                    fontSize:10.5, color:"var(--text-3)",
                  }}>
                    <span>📅 Sent: {timeAgo(msg.createdAt)}</span>
                    <span>🗑️ Deleted: {timeAgo(msg.deletedAt)}</span>
                    <span>👤 Deleted by: {msg.deletedByName}</span>
                    <span>📍 Source: {msg.source}</span>
                  </div>
                </div>
              ))}

              {/* Clear archive button */}
              <button
                onClick={async () => {
                  if (!confirm("Permanently clear the entire deleted messages archive? This cannot be undone.")) return;
                  try {
                    const snap = await getDocs(collection(db, "deletedMessages"));
                    await Promise.allSettled(snap.docs.map(d => deleteDoc(doc(db, "deletedMessages", d.id))));
                    setMessages([]);
                  } catch {
                    alert("Failed to clear archive.");
                  }
                }}
                style={{
                  width:"100%", padding:"10px",
                  borderRadius:100, marginTop:4,
                  background:"rgba(244,63,94,0.08)",
                  border:"1px solid rgba(244,63,94,0.2)",
                  color:"#f43f5e", fontSize:12.5, fontWeight:700,
                  fontFamily:"'Sora',sans-serif", cursor:"pointer",
                }}
              >
                🗑️ Clear Archive Permanently
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
};
// ── Admin Panel ───────────────────────────────────────────────
const AdminPanel = ({
  currentUser,
  onUnlock,
  cbtAdminView,
  setCbtAdminView,
  cbtSelectedBank,
  setCbtSelectedBank,
  showToast,
}: {
  currentUser: any;
  onUnlock: (targetUid: string, requestId: string) => void;
  cbtAdminView: "banks"|"createBank"|"questions";
  setCbtAdminView: (v: "banks"|"createBank"|"questions") => void;
  cbtSelectedBank: CBTBank|null;
  setCbtSelectedBank: (b: CBTBank|null) => void;
  showToast: (msg: string) => void;
}) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [acting,   setActing]   = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("cc_dismissed_requests");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    const q = query(
      collection(db, "profileEditRequests"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleApprove = async (req: any) => {
    setActing(req.id);
    try {
      console.log("Approving request for uid:", req.uid);
      await updateDoc(doc(db, "users", req.uid), { profileLocked: false });
      console.log("profileLocked set to false for:", req.uid);
      await updateDoc(doc(db, "profileEditRequests", req.id), {
        status: "approved",
      });
      console.log("Request status set to approved:", req.id);
      onUnlock(req.uid, req.id);
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (req: any) => {
    setActing(req.id);
    try {
      await updateDoc(doc(db, "profileEditRequests", req.id), {
        status: "rejected",
      });
    } finally {
      setActing(null);
    }
  };

  const pending  = requests.filter(r => r.status === "pending");
  const resolved = requests.filter(r => r.status !== "pending" && !dismissedIds.has(r.id));

  const statusColor = (s: string) =>
    s === "approved" ? "#22c55e" : s === "rejected" ? "#f43f5e" : "#f59e0b";
  const statusBg = (s: string) =>
    s === "approved"
      ? "rgba(34,197,94,0.08)"
      : s === "rejected"
      ? "rgba(244,63,94,0.08)"
      : "rgba(245,158,11,0.08)";

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 0 60px" }}>

      {/* Header */}
      <div style={{
        padding: "24px 20px 18px",
        borderBottom: "1px solid var(--border)",
        marginBottom: 24,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 4,
        }}>
          <span style={{ fontSize: 24 }}>🛡️</span>
          <span style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 22, fontWeight: 700, color: "var(--text)",
          }}>
            Admin Panel
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-3)", lineHeight: 1.6 }}>
          Review profile edit requests from students. Approving a request unlocks
          their locked fields so they can update them once.
        </div>
      </div>
{/* ── CBT Management Section ── */}
      <div style={{ padding: "0 20px", marginBottom: 32 }}>
        <div style={{
          fontFamily: "'Fraunces',serif",
          fontSize: 15, fontWeight: 700,
          color: "var(--text)", marginBottom: 14,
          paddingTop: 4,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          📝 CBT Practice Management
        </div>
        <CBTAdmin
          currentUser={currentUser}
          cbtAdminView={cbtAdminView}
          setCbtAdminView={setCbtAdminView}
          cbtSelectedBank={cbtSelectedBank}
          setCbtSelectedBank={setCbtSelectedBank}
          showToast={showToast}
        />
      </div>
      {/* Deleted Messages Archive */}
      <DeletedMessages />
      {/* Exam Countdown Control */}
      <div style={{ padding: "0 20px" }}>
        <ExamCountdownAdmin showToast={showToast} />
      </div>

      {/* Pending requests */}
      <div style={{ padding: "0 20px" }}>
        <div style={{
          fontFamily: "'Fraunces',serif",
          fontSize: 15, fontWeight: 700,
          color: "var(--text)", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          Pending Requests
          {pending.length > 0 && (
            <span style={{
              padding: "2px 10px", borderRadius: 100,
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.25)",
              fontSize: 11, fontWeight: 700, color: "#f59e0b",
            }}>
              {pending.length}
            </span>
          )}
        </div>

        {loading ? (
          [1, 2].map(i => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid var(--border)",
              borderRadius: 16, padding: 18, marginBottom: 12,
            }}>
              <div className="skeleton" style={{ height: 12, width: "40%", marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 10, width: "70%", marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 10, width: "55%" }} />
            </div>
          ))
        ) : pending.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "40px 20px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--border)",
            borderRadius: 16, marginBottom: 20,
          }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>
              No pending requests
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 4 }}>
              All caught up! New requests will appear here.
            </div>
          </div>
        ) : (
          pending.map(req => (
            <div key={req.id} style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: 16, padding: 18, marginBottom: 12,
            }}>
              {/* Student info */}
              <div style={{
                display: "flex", alignItems: "center",
                gap: 10, marginBottom: 12,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                  background: avatarGrad(req.uid),
                  display: "flex", alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14, fontWeight: 700, color: "#fff",
                }}>
                  {initials(req.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13.5, fontWeight: 700, color: "var(--text)",
                  }}>
                    {req.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                    {req.faculty}
                  </div>
                </div>
                <span style={{
                  padding: "3px 10px", borderRadius: 100,
                  background: statusBg(req.status),
                  border: `1px solid ${statusColor(req.status)}30`,
                  fontSize: 10, fontWeight: 700,
                  color: statusColor(req.status),
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                }}>
                  {req.status}
                </span>
              </div>

              {/* Request details */}
              <div style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border)",
                borderRadius: 10, padding: "12px 14px",
                marginBottom: 14,
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700,
                  color: "var(--text-3)",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em", marginBottom: 4,
                }}>
                  Field(s) to change
                </div>
                <div style={{
                  fontSize: 13, color: "var(--gold-light)",
                  fontWeight: 600, marginBottom: 10,
                }}>
                  {req.field}
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 700,
                  color: "var(--text-3)",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em", marginBottom: 4,
                }}>
                  Reason given
                </div>
                <div style={{
                  fontSize: 13, color: "rgba(240,244,241,0.8)",
                  lineHeight: 1.65,
                }}>
                  {req.reason}
                </div>
              </div>

              {/* Time */}
              <div style={{
                fontSize: 10.5, color: "var(--text-3)", marginBottom: 14,
              }}>
                Submitted {timeAgo(req.createdAt)}
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => handleReject(req)}
                  disabled={acting === req.id}
                  style={{
                    flex: 1, padding: "9px",
                    borderRadius: 100,
                    border: "1px solid rgba(244,63,94,0.3)",
                    background: "rgba(244,63,94,0.08)",
                    color: "#f43f5e", fontSize: 12.5, fontWeight: 700,
                    fontFamily: "'Sora',sans-serif", cursor: "pointer",
                    opacity: acting === req.id ? 0.5 : 1,
                  }}
                >
                  ✕ Reject
                </button>
                <button
                  onClick={() => handleApprove(req)}
                  disabled={acting === req.id}
                  style={{
                    flex: 2, padding: "9px",
                    borderRadius: 100,
                    background: "linear-gradient(135deg,#166534,#16a34a)",
                    border: "1px solid rgba(34,197,94,0.3)",
                    color: "#fff", fontSize: 12.5, fontWeight: 700,
                    fontFamily: "'Sora',sans-serif", cursor: "pointer",
                    opacity: acting === req.id ? 0.5 : 1,
                    boxShadow: "0 4px 14px rgba(22,163,74,0.25)",
                  }}
                >
                  {acting === req.id ? "Processing…" : "✓ Approve & Unlock"}
                </button>
              </div>
            </div>
          ))
        )}
{/* ── Verification Requests ── */}
        <VerificationRequests />
        <AdminAwardsPanel showToast={showToast} />
       {/* Resolved history */}
        {resolved.length > 0 && (
          <>
            <div style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 15, fontWeight: 700,
              color: "var(--text)", margin: "28px 0 14px",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              Past Requests
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: "var(--text-3)",
                fontFamily: "'Sora',sans-serif",
              }}>
                {resolved.length} total
              </span>
              <button
                onClick={() => {
                  if (!confirm(`Clear ${resolved.length} past requests from this view? This only affects the admin dashboard.`)) return;
                  setDismissedIds(prev => {
                    const next = new Set(prev);
                    resolved.forEach(r => next.add(r.id));
                    localStorage.setItem("cc_dismissed_requests", JSON.stringify([...next]));
                    return next;
                  });
                  showToast("Past requests cleared from view.");
                }}
                style={{
                  marginLeft: "auto", padding: "4px 12px", borderRadius: 100,
                  background: "rgba(244,63,94,0.08)",
                  border: "1px solid rgba(244,63,94,0.2)",
                  color: "#f43f5e", fontSize: 11, fontWeight: 700,
                  fontFamily: "'Sora',sans-serif", cursor: "pointer",
                }}
              >
                🗑️ Clear
              </button>
            </div>
            {resolved.map(req => (
              <div key={req.id} style={{
                background: "rgba(255,255,255,0.015)",
                border: "1px solid var(--border)",
                borderRadius: 14, padding: "14px 16px",
                marginBottom: 10,
                display: "flex", gap: 12, alignItems: "center",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: avatarGrad(req.uid),
                  display: "flex", alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: "#fff",
                }}>
                  {initials(req.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: "var(--text)",
                  }}>
                    {req.name}
                  </div>
                  <div style={{
                    fontSize: 11, color: "var(--text-3)",
                    whiteSpace: "nowrap" as const,
                    overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {req.field} · {timeAgo(req.createdAt)}
                  </div>
                </div>
                <span style={{
                  padding: "3px 10px", borderRadius: 100,
                  background: statusBg(req.status),
                  border: `1px solid ${statusColor(req.status)}30`,
                  fontSize: 10, fontWeight: 700,
                  color: statusColor(req.status),
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em", flexShrink: 0,
                }}>
                  {req.status}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
  </div>
  );
};

// ── Admin Awards Panel (Monthly Silver Star) ──────────────
const getDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

const getCurrentWeekKey = () => {
  const d = new Date();
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${d.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
};

const AdminAwardsPanel = ({ showToast }: { showToast: (msg: string) => void }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const currentWeek = getCurrentWeekKey();

  const leaderboard = users
    .filter(u => u.currentWeekKey === currentWeek && (u.postsThisWeek || 0) > 0)
    .sort((a, b) => (b.postsThisWeek || 0) - (a.postsThisWeek || 0))
    .slice(0, 5);

  const handleAward = async (user: any) => {
    setAwarding(user.id);
    try {
      await updateDoc(doc(db, "users", user.id), {
        silverStars: (user.silverStars || 0) + 1,
        lastSilverAwardWeek: currentWeek,
      });
      showToast(`⭐ Silver Star awarded to ${user.name}!`);
    } catch (err) {
      showToast("Failed to award Silver Star.");
    } finally {
      setAwarding(null);
    }
  };

  const handleRevoke = async (user: any) => {
    if (!confirm(`Undo this week's Silver Star award for ${user.name}? This will remove 1 star and unlock the award button again.`)) return;
    setAwarding(user.id);
    try {
      await updateDoc(doc(db, "users", user.id), {
        silverStars: Math.max(0, (user.silverStars || 0) - 1),
        lastSilverAwardWeek: "",
      });
      showToast(`Silver Star award undone for ${user.name}.`);
    } catch (err) {
      showToast("Failed to undo award.");
    } finally {
      setAwarding(null);
    }
  };

  if (loading) return null;

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{
        fontFamily: "'Fraunces',serif",
        fontSize: 15, fontWeight: 700,
        color: "var(--text)", marginBottom: 14,
        display: "flex", alignItems: "center", gap: 8,
        paddingTop: 24, borderTop: "1px solid var(--border)",
      }}>
        ⭐ Weekly Silver Star — {currentWeek}
      </div>

      <div style={{ fontSize: 11.5, color: "var(--text-3)", marginBottom: 16, lineHeight: 1.6 }}>
        Top posters this week. Award Silver Star to the leader, or to the runner-up too if it's close. Each award locks until next week.
      </div>

      {leaderboard.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "28px 20px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--border)",
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📭</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>
            No posts yet this week
          </div>
        </div>
      ) : (
        leaderboard.map((user, idx) => {
          const alreadyAwarded = user.lastSilverAwardWeek === currentWeek;
          return (
            <div key={user.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", borderRadius: 14,
              background: "rgba(255,255,255,0.025)",
              border: "1px solid var(--border)",
              marginBottom: 10,
            }}>
              <div style={{
                width: 26, fontSize: 13, fontWeight: 700,
                color: idx === 0 ? "#f59e0b" : "var(--text-3)",
                textAlign: "center", flexShrink: 0,
              }}>
                {idx + 1}
              </div>
              <div style={{
                width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                background: avatarGrad(user.id),
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "#fff",
                overflow: "hidden",
              }}>
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : initials(user.name || "?")}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                  {user.name}
                  {user.silverStars > 0 && (
                    <span style={{ marginLeft: 6, fontSize: 11, color: "#888780" }}>
                      ⭐×{user.silverStars}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                  {user.postsThisWeek} post{user.postsThisWeek !== 1 ? "s" : ""} this week
                </div>
              </div>
              {alreadyAwarded ? (
                <button
                  onClick={() => handleRevoke(user)}
                  disabled={awarding === user.id}
                  style={{
                    padding: "7px 14px", borderRadius: 100,
                    fontSize: 11.5, fontWeight: 700,
                    fontFamily: "'Sora',sans-serif",
                    cursor: "pointer",
                    border: "1px solid rgba(244,63,94,0.3)",
                    background: "rgba(244,63,94,0.08)",
                    color: "#f43f5e",
                    opacity: awarding === user.id ? 0.5 : 1,
                    flexShrink: 0,
                  }}
                >
                  {awarding === user.id ? "…" : "↺ Undo"}
                </button>
              ) : (
                <button
                  onClick={() => handleAward(user)}
                  disabled={awarding === user.id}
                  style={{
                    padding: "7px 14px", borderRadius: 100,
                    fontSize: 11.5, fontWeight: 700,
                    fontFamily: "'Sora',sans-serif",
                    cursor: "pointer",
                    border: "1px solid rgba(245,158,11,0.4)",
                    background: "rgba(245,158,11,0.1)",
                    color: "#f59e0b",
                    opacity: awarding === user.id ? 0.5 : 1,
                    flexShrink: 0,
                  }}
                >
                  {awarding === user.id ? "…" : "⭐ Award"}
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
// ── Exam Countdown Admin Control ──────────────────────────
const ExamCountdownAdmin = ({ showToast }: { showToast: (msg: string) => void }) => {
  const [title,   setTitle]   = useState("");
  const [dateStr, setDateStr] = useState("");
  const [active,  setActive]  = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "examCountdown"), snap => {
      if (snap.exists()) {
        const data = snap.data();
        setTitle(data.title || "");
        setActive(!!data.active);
        if (data.examDate) {
          const d = data.examDate.toDate ? data.examDate.toDate() : new Date(data.examDate);
          setDateStr(d.toISOString().slice(0, 10));
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!title.trim() || !dateStr) {
      showToast("Please enter an exam title and date.");
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "examCountdown"), {
        title: title.trim(),
        examDate: new Date(dateStr),
        active,
      }, { merge: true });
      showToast("Exam countdown updated!");
    } catch {
      showToast("Failed to save exam countdown.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{
        fontFamily: "'Fraunces',serif", fontSize: 15, fontWeight: 700,
        color: "var(--text)", marginBottom: 14,
        display: "flex", alignItems: "center", gap: 8,
        paddingTop: 24, borderTop: "1px solid var(--border)",
      }}>
        📅 Exam Countdown
      </div>

      <div style={{ fontSize: 11.5, color: "var(--text-3)", marginBottom: 16, lineHeight: 1.6 }}>
        Set the exam period shown on every student's feed.
      </div>

      <label style={{fontSize:10,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:6}}>Exam Title</label>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="e.g. First Semester Exams"
        style={{
          width:"100%", padding:"10px 14px", marginBottom:14,
          background:"var(--dark-3)", border:"1.5px solid var(--border)",
          borderRadius:10, color:"var(--text)", fontSize:13,
          fontFamily:"'Sora',sans-serif", outline:"none",
        }}
      />

      <label style={{fontSize:10,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:6}}>Exam Start Date</label>
      <input
        type="date"
        value={dateStr}
        onChange={e => setDateStr(e.target.value)}
        style={{
          width:"100%", padding:"10px 14px", marginBottom:14,
          background:"var(--dark-3)", border:"1.5px solid var(--border)",
          borderRadius:10, color:"var(--text)", fontSize:13,
          fontFamily:"'Sora',sans-serif", outline:"none",
          colorScheme:"dark",
        }}
      />

      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"12px 14px", borderRadius:10,
        background:"var(--surface)", border:"1px solid var(--border)",
        marginBottom:16,
      }}>
        <span style={{fontSize:13, fontWeight:600, color:"var(--text)"}}>Show countdown to students</span>
        <div
          onClick={() => setActive(a => !a)}
          style={{
            width:46, height:26, borderRadius:13,
            background: active ? "linear-gradient(135deg,#166534,#16a34a)" : "rgba(255,255,255,0.1)",
            border: active ? "1px solid rgba(34,197,94,0.3)" : "1px solid var(--border)",
            cursor:"pointer", position:"relative", transition:"all 0.25s ease",
          }}
        >
          <div style={{
            position:"absolute", top:3, left: active ? 23 : 3,
            width:18, height:18, borderRadius:"50%", background:"#fff",
            boxShadow:"0 1px 4px rgba(0,0,0,0.3)", transition:"left 0.25s ease",
          }}/>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width:"100%", padding:"11px", borderRadius:100,
          background:"linear-gradient(135deg,#166534,#16a34a)",
          border:"1px solid rgba(34,197,94,0.3)",
          color:"#fff", fontSize:13, fontWeight:700,
          fontFamily:"'Sora',sans-serif", cursor:"pointer",
          opacity: saving ? 0.5 : 1,
        }}
      >
        {saving ? "Saving…" : "Save Countdown Settings"}
      </button>
    </div>
  );
};
// ── Verification Requests in Admin Panel ──────────────────
const VerificationRequests = () => {
  const [verRequests, setVerRequests] = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [acting,      setActing]      = useState<string|null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingUid, setRejectingUid] = useState<string|null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("cc_dismissed_verifications");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("verificationStatus", "in", ["pending", "verified", "rejected", "blocked"])
    );
    const unsub = onSnapshot(q, snap => {
      setVerRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleVerifyApprove = async (user: any) => {
    setActing(user.id);
    try {
      await updateDoc(doc(db, "users", user.id), {
        verificationStatus: "verified",
      });
    } finally {
      setActing(null);
    }
  };

  const handleVerifyReject = async (user: any) => {
    if (!rejectReason.trim()) {
      alert("Please enter a rejection reason.");
      return;
    }
    setActing(user.id);
    try {
      const rejectedCount = (user.verificationRejectedCount || 0) + 1;
      await updateDoc(doc(db, "users", user.id), {
        verificationStatus:        rejectedCount >= 2 ? "blocked" : "rejected",
        verificationRejectionReason: rejectReason.trim(),
        verificationRejectedCount: rejectedCount,
      });
      setRejectingUid(null);
      setRejectReason("");
    } finally {
      setActing(null);
    }
  };

  const pending  = verRequests.filter(r => r.verificationStatus === "pending");
  const resolved = verRequests.filter(r => r.verificationStatus !== "pending" && !dismissedIds.has(r.id));

  if (loading) return null;
  if (verRequests.length === 0) return null;

  return (
    <div style={{marginTop:32}}>
      <div style={{
        fontFamily:"'Fraunces',serif",
        fontSize:15, fontWeight:700,
        color:"var(--text)", marginBottom:14,
        display:"flex", alignItems:"center", gap:8,
        paddingTop:24, borderTop:"1px solid var(--border)",
      }}>
        🎓 Student Verification
        {pending.length > 0 && (
          <span style={{
            padding:"2px 10px", borderRadius:100,
            background:"rgba(96,165,250,0.12)",
            border:"1px solid rgba(96,165,250,0.25)",
            fontSize:11, fontWeight:700, color:"#60a5fa",
          }}>
            {pending.length} pending
          </span>
        )}
      </div>

      {pending.length === 0 ? (
        <div style={{
          textAlign:"center", padding:"28px 20px",
          background:"rgba(255,255,255,0.02)",
          border:"1px solid var(--border)",
          borderRadius:16, marginBottom:16,
        }}>
          <div style={{fontSize:24, marginBottom:8}}>✅</div>
          <div style={{fontSize:13, fontWeight:600, color:"var(--text-2)"}}>
            No pending verifications
          </div>
        </div>
      ) : (
        pending.map(user => (
          <div key={user.id} style={{
            background:"rgba(255,255,255,0.025)",
            border:"1px solid rgba(96,165,250,0.2)",
            borderRadius:16, padding:18, marginBottom:12,
          }}>
            {/* Student info */}
            <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:14}}>
              <div style={{
                width:40, height:40, borderRadius:11, flexShrink:0,
                background:avatarGrad(user.id),
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:14, fontWeight:700, color:"#fff",
              }}>
                {initials(user.name)}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13.5, fontWeight:700, color:"var(--text)"}}>
                  {user.name}
                </div>
                <div style={{fontSize:11, color:"var(--text-3)"}}>
                  {user.faculty} · {user.department}
                </div>
              </div>
              <span style={{
                padding:"3px 10px", borderRadius:100,
                background:"rgba(245,158,11,0.1)",
                border:"1px solid rgba(245,158,11,0.25)",
                fontSize:10, fontWeight:700, color:"#f59e0b",
                textTransform:"uppercase" as const,
              }}>
                pending
              </span>
            </div>

            {/* Submitted details */}
            <div style={{
              background:"rgba(255,255,255,0.03)",
              border:"1px solid var(--border)",
              borderRadius:10, padding:"12px 14px",
              marginBottom:14,
            }}>
              <div style={{fontSize:12, color:"var(--text-2)", marginBottom:6}}>
                📋 <strong>Reg No:</strong> {user.verificationRegNumber}
              </div>
              <div style={{fontSize:12, color:"var(--text-2)", marginBottom:12}}>
                👤 <strong>Name on ID:</strong> {user.verificationFullName}
              </div>
              {/* Document image */}
              {user.verificationDocUrl && (
                <>
                  <div style={{
                    fontSize:10, fontWeight:700, color:"var(--text-3)",
                    textTransform:"uppercase" as const,
                    letterSpacing:"0.08em", marginBottom:8,
                  }}>
                    Uploaded Document
                  </div>
                  <img
                    src={user.verificationDocUrl}
                    alt="verification doc"
                    style={{
                      width:"100%", maxHeight:260,
                      objectFit:"contain", borderRadius:10,
                      border:"1px solid var(--border)",
                      background:"rgba(0,0,0,0.3)", display:"block",
                      cursor:"pointer",
                    }}
                    onClick={() => window.open(user.verificationDocUrl, "_blank")}
                  />
                  <div style={{fontSize:10, color:"var(--text-3)", marginTop:4}}>
                    Click image to open full size
                  </div>
                </>
              )}
            </div>

            {/* Reject reason input */}
            {rejectingUid === user.id && (
              <div style={{marginBottom:12}}>
                <input
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Enter rejection reason…"
                  style={{
                    width:"100%", padding:"9px 14px",
                    background:"#0e1e12",
                    border:"1.5px solid rgba(244,63,94,0.3)",
                    borderRadius:10, color:"#f0f4f1",
                    fontSize:13, fontFamily:"'Sora',sans-serif",
                    outline:"none",
                  }}
                />
              </div>
            )}

            {/* Action buttons */}
            <div style={{display:"flex", gap:10}}>
              {rejectingUid === user.id ? (
                <>
                  <button
                    onClick={() => { setRejectingUid(null); setRejectReason(""); }}
                    style={{
                      flex:1, padding:"9px", borderRadius:100,
                      border:"1px solid var(--border)",
                      background:"transparent", color:"var(--text-2)",
                      fontSize:12, fontWeight:700,
                      fontFamily:"'Sora',sans-serif", cursor:"pointer",
                    }}
                  >Cancel</button>
                  <button
                    onClick={() => handleVerifyReject(user)}
                    disabled={acting === user.id || !rejectReason.trim()}
                    style={{
                      flex:2, padding:"9px", borderRadius:100,
                      border:"1px solid rgba(244,63,94,0.3)",
                      background:"rgba(244,63,94,0.1)",
                      color:"#f43f5e", fontSize:12, fontWeight:700,
                      fontFamily:"'Sora',sans-serif", cursor:"pointer",
                      opacity:(acting===user.id||!rejectReason.trim())?0.5:1,
                    }}
                  >
                    {acting === user.id ? "Rejecting…" : "Confirm Reject"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setRejectingUid(user.id)}
                    disabled={acting === user.id}
                    style={{
                      flex:1, padding:"9px", borderRadius:100,
                      border:"1px solid rgba(244,63,94,0.3)",
                      background:"rgba(244,63,94,0.08)",
                      color:"#f43f5e", fontSize:12, fontWeight:700,
                      fontFamily:"'Sora',sans-serif", cursor:"pointer",
                      opacity:acting===user.id?0.5:1,
                    }}
                  >✕ Reject</button>
                  <button
                    onClick={() => handleVerifyApprove(user)}
                    disabled={acting === user.id}
                    style={{
                      flex:2, padding:"9px", borderRadius:100,
                      background:"linear-gradient(135deg,#166534,#16a34a)",
                      border:"1px solid rgba(34,197,94,0.3)",
                      color:"#fff", fontSize:12, fontWeight:700,
                      fontFamily:"'Sora',sans-serif", cursor:"pointer",
                      opacity:acting===user.id?0.5:1,
                      boxShadow:"0 4px 14px rgba(22,163,74,0.25)",
                    }}
                  >
                    {acting === user.id ? "Verifying…" : "✓ Verify Account"}
                  </button>
                </>
              )}
            </div>
          </div>
        ))
      )}

      {/* Resolved verifications */}
      {resolved.length > 0 && (
        <>
          <div style={{
            fontFamily:"'Fraunces',serif",
            fontSize:13, fontWeight:700,
            color:"var(--text)", margin:"20px 0 10px",
            display:"flex", alignItems:"center", gap:8,
          }}>
            Past Verifications
            <button
              onClick={() => {
                if (!confirm(`Clear ${resolved.length} past verifications from this view? This only affects the admin dashboard — students' verified status will NOT change.`)) return;
                setDismissedIds(prev => {
                  const next = new Set(prev);
                  resolved.forEach(u => next.add(u.id));
                  localStorage.setItem("cc_dismissed_verifications", JSON.stringify([...next]));
                  return next;
                });
              }}
              style={{
                marginLeft:"auto", padding:"4px 12px", borderRadius:100,
                background:"rgba(244,63,94,0.08)",
                border:"1px solid rgba(244,63,94,0.2)",
                color:"#f43f5e", fontSize:11, fontWeight:700,
                fontFamily:"'Sora',sans-serif", cursor:"pointer",
              }}
            >
              🗑️ Clear
            </button>
          </div>
          {resolved.map(user => (
            <div key={user.id} style={{
              background:"rgba(255,255,255,0.015)",
              border:"1px solid var(--border)",
              borderRadius:14, padding:"12px 16px",
              marginBottom:10,
              display:"flex", gap:12, alignItems:"center",
            }}>
              <div style={{
                width:36, height:36, borderRadius:10, flexShrink:0,
                background:avatarGrad(user.id),
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:12, fontWeight:700, color:"#fff",
              }}>
                {initials(user.name)}
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:13, fontWeight:700, color:"var(--text)"}}>
                  {user.name}
                </div>
                <div style={{fontSize:11, color:"var(--text-3)"}}>
                  {user.verificationRegNumber}
                </div>
              </div>
              <span style={{
                padding:"3px 10px", borderRadius:100,
                fontSize:10, fontWeight:700,
                textTransform:"uppercase" as const,
                letterSpacing:"0.06em", flexShrink:0,
                color: user.verificationStatus === "verified" ? "#22c55e"
                     : user.verificationStatus === "blocked"  ? "#f43f5e"
                     : "#f59e0b",
                background: user.verificationStatus === "verified" ? "rgba(34,197,94,0.08)"
                           : user.verificationStatus === "blocked"  ? "rgba(244,63,94,0.08)"
                           : "rgba(245,158,11,0.08)",
                border: `1px solid ${
                  user.verificationStatus === "verified" ? "rgba(34,197,94,0.2)"
                : user.verificationStatus === "blocked"  ? "rgba(244,63,94,0.2)"
                : "rgba(245,158,11,0.2)"}`,
              }}>
                {user.verificationStatus}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
// ── Verification Gate ─────────────────────────────────────
const VerificationGate = ({
  myProfile, verRegNumber, setVerRegNumber,
  verFullName, setVerFullName,
  verDocFile, setVerDocFile,
  verDocPreview, setVerDocPreview,
  verSubmitting, handleSubmitVerification,
  verDocRef, currentUser,
}: any) => {
  const status = myProfile?.verificationStatus;

  // Blocked screen
  if (status === "blocked") return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", padding:24,
    }}>
      <div style={{
        maxWidth:420, width:"100%", textAlign:"center",
        padding:32, borderRadius:24,
        background:"rgba(244,63,94,0.06)",
        border:"1px solid rgba(244,63,94,0.2)",
      }}>
        <div style={{fontSize:48, marginBottom:16}}>🚫</div>
        <div style={{
          fontFamily:"'Fraunces',serif",
          fontSize:22, fontWeight:700,
          color:"#f43f5e", marginBottom:12,
        }}>
          Account Blocked
        </div>
        <div style={{fontSize:13, color:"rgba(244,63,94,0.8)", lineHeight:1.75}}>
          Your account has been blocked after two failed verification attempts.
          Please contact the Campus Connect admin for assistance.
        </div>
      </div>
    </div>
  );

  // Pending screen
  if (status === "pending") return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", padding:24,
    }}>
      <div style={{
        maxWidth:420, width:"100%", textAlign:"center",
        padding:32, borderRadius:24,
        background:"rgba(245,158,11,0.06)",
        border:"1px solid rgba(245,158,11,0.2)",
      }}>
        <div style={{fontSize:48, marginBottom:16}}>⏳</div>
        <div style={{
          fontFamily:"'Fraunces',serif",
          fontSize:22, fontWeight:700,
          color:"#f59e0b", marginBottom:12,
        }}>
          Verification Pending
        </div>
        <div style={{fontSize:13, color:"rgba(245,158,11,0.8)", lineHeight:1.75, marginBottom:20}}>
          Your documents have been submitted and are being reviewed by the admin.
          You will be notified instantly once your account is verified.
        </div>
        <div style={{
          padding:"12px 16px", borderRadius:12,
          background:"rgba(255,255,255,0.03)",
          border:"1px solid var(--border)",
          textAlign:"left",
        }}>
          <div style={{fontSize:10, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase" as const, letterSpacing:"0.08em", marginBottom:8}}>
            Submitted Details
          </div>
          <div style={{fontSize:12.5, color:"var(--text-2)", marginBottom:4}}>
            📋 Reg No: <strong style={{color:"var(--text)"}}>{myProfile?.verificationRegNumber}</strong>
          </div>
          <div style={{fontSize:12.5, color:"var(--text-2)"}}>
            👤 Name on ID: <strong style={{color:"var(--text)"}}>{myProfile?.verificationFullName}</strong>
          </div>
        </div>
      </div>
    </div>
  );

  // Rejected screen — can resubmit once
  if (status === "rejected") return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", padding:24, overflowY:"auto",
    }}>
      <div style={{
        maxWidth:480, width:"100%",
        padding:32, borderRadius:24,
        background:"rgba(244,63,94,0.05)",
        border:"1px solid rgba(244,63,94,0.2)",
      }}>
        <div style={{fontSize:40, marginBottom:12, textAlign:"center"}}>❌</div>
        <div style={{
          fontFamily:"'Fraunces',serif",
          fontSize:20, fontWeight:700,
          color:"#f43f5e", marginBottom:8, textAlign:"center",
        }}>
          Verification Rejected
        </div>
        {myProfile?.verificationRejectionReason && (
          <div style={{
            padding:"10px 14px", borderRadius:10, marginBottom:20,
            background:"rgba(244,63,94,0.08)",
            border:"1px solid rgba(244,63,94,0.2)",
            fontSize:12.5, color:"rgba(244,63,94,0.9)", lineHeight:1.65,
          }}>
            <strong>Reason:</strong> {myProfile.verificationRejectionReason}
          </div>
        )}
        <div style={{
          fontSize:12.5, color:"var(--text-3)", marginBottom:20,
          lineHeight:1.7, textAlign:"center",
        }}>
          ⚠️ This is your <strong style={{color:"#f59e0b"}}>last chance</strong> to re-submit.
          A second rejection will permanently block your account.
        </div>
        {/* Re-submission form */}
        <ReVerificationForm
          verRegNumber={verRegNumber} setVerRegNumber={setVerRegNumber}
          verFullName={verFullName} setVerFullName={setVerFullName}
          verDocFile={verDocFile} setVerDocFile={setVerDocFile}
          verDocPreview={verDocPreview} setVerDocPreview={setVerDocPreview}
          verSubmitting={verSubmitting}
          handleSubmitVerification={handleSubmitVerification}
          verDocRef={verDocRef}
        />
      </div>
    </div>
  );

  // Default — unverified, show submission form
  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", padding:24, overflowY:"auto",
    }}>
      <div style={{
        maxWidth:480, width:"100%",
        padding:32, borderRadius:24,
        background:"rgba(255,255,255,0.025)",
        border:"1px solid rgba(22,163,74,0.2)",
      }}>
<div style={{ marginBottom: 12, textAlign: "center" }}>
  <img
    src={lockIcon}
    alt="Campus Connect Logo"
    style={{
      width: "80px",
    height: "80px",
    objectFit: "cover",
    borderRadius: "50%"
    }}
  />
</div>        

<div style={{
          fontFamily:"'Fraunces',serif",
          fontSize:22, fontWeight:700,
          color:"var(--text)", marginBottom:8, textAlign:"center",
        }}>
          Verify Your Account
        </div>
        <div style={{
          fontSize:13, color:"var(--text-3)",
          marginBottom:24, lineHeight:1.75, textAlign:"center",
        }}>
          To access Campus Connect, you need to verify that you are a genuine
          TASU student. Upload your Student ID card or Admission Letter.
        </div>
        <ReVerificationForm
          verRegNumber={verRegNumber} setVerRegNumber={setVerRegNumber}
          verFullName={verFullName} setVerFullName={setVerFullName}
          verDocFile={verDocFile} setVerDocFile={setVerDocFile}
          verDocPreview={verDocPreview} setVerDocPreview={setVerDocPreview}
          verSubmitting={verSubmitting}
          handleSubmitVerification={handleSubmitVerification}
          verDocRef={verDocRef}
        />
      </div>
    </div>
  );
};

// ── Re-usable verification form ───────────────────────────
const ReVerificationForm = ({
  verRegNumber, setVerRegNumber,
  verFullName, setVerFullName,
  verDocFile, setVerDocFile,
  verDocPreview, setVerDocPreview,
  verSubmitting, handleSubmitVerification,
  verDocRef,
}: any) => (
  <div style={{display:"flex", flexDirection:"column", gap:14}}>
    <div>
      <label style={{
        fontSize:10, fontWeight:700, color:"var(--text-3)",
        textTransform:"uppercase" as const, letterSpacing:"0.1em",
        display:"block", marginBottom:6,
      }}>
        Registration Number *
      </label>
      <input
        value={verRegNumber}
        onChange={e => setVerRegNumber(e.target.value)}
        placeholder="e.g. TSU/FSC/CS/2024/0001"
        style={{
          width:"100%", padding:"10px 14px",
          background:"#0e1e12",
          border:"1.5px solid rgba(255,255,255,0.1)",
          borderRadius:10, color:"#f0f4f1",
          fontSize:13, fontFamily:"'Sora',sans-serif",
          outline:"none", colorScheme:"dark" as any,
        }}
      />
    </div>

    <div>
      <label style={{
        fontSize:10, fontWeight:700, color:"var(--text-3)",
        textTransform:"uppercase" as const, letterSpacing:"0.1em",
        display:"block", marginBottom:6,
      }}>
        Full Name (exactly as on ID) *
      </label>
      <input
        value={verFullName}
        onChange={e => setVerFullName(e.target.value)}
        placeholder="e.g. VIXZOO VIXMAN KAKARA"
        style={{
          width:"100%", padding:"10px 14px",
          background:"#0e1e12",
          border:"1.5px solid rgba(255,255,255,0.1)",
          borderRadius:10, color:"#f0f4f1",
          fontSize:13, fontFamily:"'Sora',sans-serif",
          outline:"none", colorScheme:"dark" as any,
        }}
      />
    </div>

    <div>
      <label style={{
        fontSize:10, fontWeight:700, color:"var(--text-3)",
        textTransform:"uppercase" as const, letterSpacing:"0.1em",
        display:"block", marginBottom:6,
      }}>
        Student ID Card or Admission Letter *
      </label>
      <input
        ref={verDocRef}
        type="file"
        accept="image/*"
        style={{display:"none"}}
        onChange={e => {
          const f = e.target.files?.[0];
          if (!f) return;
          setVerDocFile(f);
          setVerDocPreview(URL.createObjectURL(f));
        }}
      />
      {verDocPreview ? (
        <div style={{position:"relative", borderRadius:12, overflow:"hidden", border:"1px solid var(--border)"}}>
          <img src={verDocPreview} alt="doc" style={{width:"100%", maxHeight:200, objectFit:"cover", display:"block"}}/>
          <button
            onClick={() => { setVerDocFile(null); setVerDocPreview(null); }}
            style={{
              position:"absolute", top:8, right:8,
              width:28, height:28, borderRadius:50,
              background:"rgba(0,0,0,0.7)", border:"none",
              color:"#fff", fontSize:13, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}
          >✕</button>
        </div>
      ) : (
        <div
          onClick={() => verDocRef.current?.click()}
          style={{
            width:"100%", padding:"28px 20px",
            border:"2px dashed rgba(22,163,74,0.3)",
            borderRadius:12, textAlign:"center",
            cursor:"pointer", color:"var(--text-3)",
            background:"rgba(22,163,74,0.03)",
            transition:"all 0.2s",
          }}
        >
          <div style={{fontSize:28, marginBottom:8}}>📄</div>
          <div style={{fontSize:13, fontWeight:600, color:"var(--text-2)", marginBottom:4}}>
            Click to upload document
          </div>
          <div style={{fontSize:11, color:"var(--text-3)"}}>
            Student ID card or Admission Letter (image)
          </div>
        </div>
      )}
    </div>

    <button
      onClick={handleSubmitVerification}
      disabled={verSubmitting || !verRegNumber.trim() || !verFullName.trim() || !verDocFile}
      style={{
        width:"100%", padding:"12px",
        borderRadius:100,
        background:"linear-gradient(135deg,#166534,#16a34a)",
        border:"1px solid rgba(34,197,94,0.3)",
        color:"#fff", fontSize:13.5, fontWeight:700,
        fontFamily:"'Sora',sans-serif", cursor:"pointer",
        opacity:(!verRegNumber.trim()||!verFullName.trim()||!verDocFile||verSubmitting)?0.45:1,
        boxShadow:"0 4px 16px rgba(22,163,74,0.25)",
        marginTop:4,
      }}
    >
      {verSubmitting ? "Submitting…" : "Submit for Verification →"}
    </button>
  </div>
);
// ── Student Search ────────────────────────────────────────
const StudentSearch = ({
  onViewProfile,
  currentUserId,
  myProfile,
  onFollow,
  onUnfollow,
}: {
  onViewProfile: (uid: string) => void;
  currentUserId: string;
  myProfile: UserProfile | null;
  onFollow: (uid: string) => void;
  onUnfollow: (uid: string) => void;
}) => {
  const [searchVal,  setSearchVal]  = useState("");
  const [results,    setResults]    = useState<UserProfile[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [searched,   setSearched]   = useState(false);

  const handleSearch = async () => {
    if (!searchVal.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      console.log("Total users fetched:", snap.docs.length);
      
      const val = searchVal.toLowerCase();
      
      snap.docs.forEach(d => {
        const data = d.data();
        console.log("User:", data.name, "| uid:", d.id, "| faculty:", data.faculty, "| dept:", data.department);
      });

      const all = snap.docs
        .map(d => ({ ...d.data(), uid: d.id } as UserProfile))
        .filter(u => {
          const nameMatch = u.name?.toLowerCase().includes(val);
          const deptMatch = u.department?.toLowerCase().includes(val);
          const facMatch  = u.faculty?.toLowerCase().includes(val);
          const notMe     = u.uid !== currentUserId;
          console.log(`Checking ${u.name}: notMe=${notMe}, nameMatch=${nameMatch}, deptMatch=${deptMatch}, facMatch=${facMatch}`);
          return notMe && (nameMatch || deptMatch || facMatch);
        });

      console.log("Results after filter:", all.length);
      setResults(all);
    } finally {
      setLoading(false);
    }
  };

  const isFollowing = (uid: string) =>
    myProfile?.following?.includes(uid) ?? false;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 0 60px" }}>
      {/* Header */}
      <div style={{
        padding: "24px 20px 20px",
        borderBottom: "1px solid var(--border)",
        marginBottom: 24,
      }}>
        <div style={{
          fontFamily: "'Fraunces',serif",
          fontSize: 22, fontWeight: 700,
          color: "var(--text)", marginBottom: 4,
        }}>
          🔍 Find Students
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-3)", marginBottom: 16 }}>
          Search by name, department or faculty
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Search students…"
            autoFocus
            style={{
              flex: 1, padding: "10px 16px",
              background: "rgba(255,255,255,0.05)",
              border: "1.5px solid var(--border)",
              borderRadius: 100, color: "var(--text)",
              fontSize: 13, fontFamily: "'Sora',sans-serif",
              outline: "none",
            }}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !searchVal.trim()}
            style={{
              padding: "10px 20px", borderRadius: 100,
              background: "linear-gradient(135deg,#b45309,#f59e0b)",
              border: "none", color: "#1a0a00",
              fontSize: 13, fontWeight: 700,
              fontFamily: "'Sora',sans-serif",
              cursor: "pointer",
              opacity: (!searchVal.trim() || loading) ? 0.5 : 1,
            }}
          >
            {loading ? "…" : "Search"}
          </button>
        </div>
      </div>

      {/* Results */}
      <div style={{ padding: "0 20px" }}>
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} style={{
              display: "flex", gap: 12, alignItems: "center",
              padding: "14px 0",
              borderBottom: "1px solid var(--border)",
            }}>
              <div className="skeleton" style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0 }}/>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="skeleton" style={{ height: 12, width: "40%" }}/>
                <div className="skeleton" style={{ height: 10, width: "60%" }}/>
              </div>
            </div>
          ))
        ) : searched && results.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>😕</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>
              No students found
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>
              Try searching by a different name, department or faculty
            </div>
          </div>
        ) : (
          results.map(user => (
            <div key={user.uid} style={{
              display: "flex", alignItems: "center",
              gap: 12, padding: "14px 0",
              borderBottom: "1px solid var(--border)",
            }}>
              {/* Avatar — clickable */}
              <div
                onClick={() => onViewProfile(user.uid)}
                style={{
                  width: 46, height: 46, borderRadius: 13,
                  flexShrink: 0, cursor: "pointer",
                  background: user.avatarUrl ? "transparent" : avatarGrad(user.uid),
                  display: "flex", alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16, fontWeight: 700, color: "#fff",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  overflow: "hidden",
                }}
              >
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                  : initials(user.name)}
              </div>

              {/* Info — clickable */}
              <div
                style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                onClick={() => onViewProfile(user.uid)}
              >
                <div style={{
                  fontSize: 13.5, fontWeight: 700,
                  color: "var(--text)", marginBottom: 2,
                }}>
                  {user.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                  {postSubtext(user.uid, user.faculty, user.department, user.level)}
                </div>
              </div>

             {/* Follow button — hide for admin */}
              {user.uid !== ADMIN_UID && <button
                onClick={() => isFollowing(user.uid)
                  ? onUnfollow(user.uid)
                  : onFollow(user.uid)
                }
                style={{
                  padding: "7px 16px", borderRadius: 100,
                  fontSize: 12, fontWeight: 700,
                  fontFamily: "'Sora',sans-serif",
                  cursor: "pointer", flexShrink: 0,
                  border: isFollowing(user.uid)
                    ? "1px solid rgba(255,255,255,0.15)"
                    : "1px solid rgba(22,163,74,0.4)",
                  background: isFollowing(user.uid)
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(22,163,74,0.1)",
                  color: isFollowing(user.uid)
                    ? "var(--text-3)"
                    : "var(--green-glow)",
                }}
          >
                  {isFollowing(user.uid) ? "Following" : "+ Follow"}
                </button>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ── Public Profile Page ───────────────────────────────────
const PublicProfile = ({
  uid,
  currentUserId,
  myProfile,
  onFollow,
  onUnfollow,
  onBack,
  onViewProfile,
  onShowFollowers,
  onImageClick,
  onOpenMessage,
}: {
  uid: string;
  currentUserId: string;
  myProfile: UserProfile | null;
  onFollow: (uid: string) => void;
  onUnfollow: (uid: string) => void;
  onBack: () => void;
  onViewProfile: (uid: string) => void;
  onShowFollowers: (uid: string, type: "followers"|"following") => void;
  onImageClick: (images: string[], index: number) => void;
  onOpenMessage?: (uid: string) => void;
}) => {
  const [profile,  setProfile]  = useState<UserProfile|null>(null);
  const [posts,    setPosts]    = useState<Post[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    // Load profile
    const unsubProfile = onSnapshot(doc(db, "users", uid), snap => {
      if (snap.exists()) setProfile(snap.data() as UserProfile);
      setLoading(false);
    });

    // Load posts
    const q = query(
      collection(db, "posts"),
      where("uid", "==", uid),
      orderBy("createdAt", "desc")
    );
    const unsubPosts = onSnapshot(q, snap => {
      setPosts(snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Post))
        .filter(p => !(p as any).deleted)
        .filter(p => !p.isAnonymous || uid === currentUserId)
      );
    });

    return () => { unsubProfile(); unsubPosts(); };
  }, [uid]);

  const isFollowing = myProfile?.following?.includes(uid) ?? false;
  const isOwnProfile = uid === currentUserId || uid === ADMIN_UID;

  if (uid === ADMIN_UID) {
    return (
      <div style={{ maxWidth: 480, margin: "60px auto", padding: "0 20px", textAlign: "center" }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "linear-gradient(135deg,#166534,#16a34a)",
          border: "2px solid rgba(245,158,11,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 30, margin: "0 auto 20px",
        }}>
          🎓
        </div>
        <div style={{
          fontFamily: "'Fraunces',serif",
          fontSize: 20, fontWeight: 700,
          color: "var(--text)", marginBottom: 8,
        }}>
          Campus Connect Official
        </div>
        <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.7 }}>
          This is the official Campus Connect account. Its profile details aren't available for viewing.
        </div>
        <button
          onClick={onBack}
          style={{
            marginTop: 24, padding: "10px 24px", borderRadius: 100,
            border: "1px solid var(--border)",
            background: "transparent", color: "var(--text-2)",
            fontSize: 13, fontWeight: 600,
            fontFamily: "'Sora',sans-serif", cursor: "pointer",
          }}
        >
          ← Back
        </button>
      </div>
    );
  }

  if (loading) return (
    <div style={{ padding: 24 }}>
      <div className="skeleton" style={{ height: 140, borderRadius: 16, marginBottom: 60 }}/>
      <div className="skeleton" style={{ height: 20, width: "40%", marginBottom: 12 }}/>
      <div className="skeleton" style={{ height: 14, width: "60%" }}/>
    </div>
  );

  if (!profile) return (
    <div style={{ textAlign: "center", padding: 48 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>😕</div>
      <div style={{ fontSize: 14, color: "var(--text-2)" }}>Profile not found</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 0 60px" }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "12px 20px",
          background: "transparent", border: "none",
          color: "var(--text-2)", fontSize: 13, fontWeight: 600,
          fontFamily: "'Sora',sans-serif", cursor: "pointer",
        }}
      >
        ← Back
      </button>

      {/* Cover */}
      <div style={{
        height: 140,
        borderRadius: "0 0 20px 20px",
        background: (profile as any)?.coverUrl
          ? "transparent"
          : "linear-gradient(135deg,rgba(20,83,45,0.6),rgba(180,83,9,0.4))",
        border: "1px solid var(--border)", borderTop: "none",
        position: "relative", marginBottom: 64,
      }}>
        {/* Cover image */}
        {(profile as any)?.coverUrl && (
          <div style={{
            position:"absolute", inset:0,
            overflow:"hidden",
            borderRadius:"0 0 20px 20px",
          }}>
            <img
              src={(profile as any).coverUrl}
              alt="cover"
              style={{
                width:"100%", height:"100%",
                objectFit:"cover", display:"block",
              }}
            />
          </div>
        )}
        {/* Gradient overlay */}
        <div style={{
          position:"absolute", inset:0,
          background:"linear-gradient(to top,rgba(6,13,8,0.6),transparent)",
          zIndex:1,
        }}/>
        <div style={{
          position: "absolute", bottom: -48, left: 24,
          width: 88, height: 88, borderRadius: 20,
          border: "3px solid var(--dark)",
          background: profile.avatarUrl ? "transparent" : avatarGrad(uid),
          overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, fontWeight: 700, color: "#fff",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
          {profile.avatarUrl
            ? <img src={profile.avatarUrl} alt={profile.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
            : initials(profile.name)}
        </div>

        {/* Follow + Message buttons — hide for admin */}
        {!isOwnProfile && uid !== ADMIN_UID && (
          <div
  style={{
    position: "absolute",
    bottom: 16,
    right: 16,
    zIndex: 3,

    display: "flex",
    gap: 8,

    maxWidth: "calc(100% - 140px)",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  }}
>
            <button
              onClick={async () => {
                const convoId = await startConversation(currentUserId ? { uid: currentUserId } : auth.currentUser, myProfile, uid, profile);
                onOpenMessage?.(uid);
              }}
              style={{
                padding: "7px 14px", borderRadius: 100,
                fontSize: 11, fontWeight: 700,
                fontFamily: "'Sora',sans-serif", cursor: "pointer",
                border: "1.5px solid rgba(96,165,250,0.35)",
                background: "rgba(96,165,250,0.12)",
                color: "#60a5fa",
              }}
            >
              💬 Message
            </button>
            <button
              onClick={() => isFollowing ? onUnfollow(uid) : onFollow(uid)}
              style={{
                padding: "7px 14px", borderRadius: 100,
                fontSize: 11, fontWeight: 700,
                fontFamily: "'Sora',sans-serif", cursor: "pointer",
                border: isFollowing
                  ? "1.5px solid rgba(255,255,255,0.2)"
                  : "1.5px solid rgba(22,163,74,0.4)",
                background: isFollowing
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(22,163,74,0.15)",
                color: isFollowing ? "var(--text-2)" : "var(--green-glow)",
              }}
            >
              {isFollowing ? "Following" : "+ Follow"}
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: "0 20px" }}>
        {/* Name and faculty */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: "flex", alignItems: "center",
            gap: 10, marginBottom: 4, flexWrap: "wrap",
          }}>
            <span style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 22, fontWeight: 700, color: "var(--text)",
            }}>
              {profile.name}
            </span>
            {profile.faculty && (
              <span style={{
                padding: "3px 10px", borderRadius: 100,
                background: "rgba(22,163,74,0.12)",
                border: "1px solid rgba(22,163,74,0.25)",
                fontSize: 10, fontWeight: 700,
                color: "var(--green-glow)",
                textTransform: "uppercase", letterSpacing: "0.08em",
              }}>
                {profile.faculty}
              </span>
            )}
          </div>
          {profile.department && (
            <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 8 }}>
              {profile.department} · {profile.level}L
              {profile.lga ? ` · ${profile.lga}` : ""}
            </div>
          )}
          {profile.bio && (
            <div style={{
              fontSize: 13.5, color: "rgba(240,244,241,0.75)",
              lineHeight: 1.75, maxWidth: 520,
            }}>
              {profile.bio}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3,1fr)",
          background: "rgba(255,255,255,0.025)",
          border: "1px solid var(--border)",
          borderRadius: 16, overflow: "hidden", marginBottom: 24,
        }}>
          {[
            { num: posts.length, label: "Posts", onClick: undefined },
            {
              num: profile.followers?.length || 0,
              label: "Followers",
              onClick: () => onShowFollowers(uid, "followers"),
            },
            {
              num: profile.following?.length || 0,
              label: "Following",
              onClick: () => onShowFollowers(uid, "following"),
            },
          ].map((s, i) => (
            <div
              key={i}
              onClick={s.onClick}
              style={{
                textAlign: "center", padding: "16px 8px",
                borderLeft: i > 0 ? "1px solid var(--border)" : "none",
                cursor: s.onClick ? "pointer" : "default",
              }}
            >
              <div style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 24, fontWeight: 700, color: "var(--text)",
              }}>
                {s.num}
              </div>
              <div style={{
                fontSize: 10, color: s.onClick ? "var(--green-glow)" : "var(--text-3)",
                fontWeight: 600, textTransform: "uppercase",
                letterSpacing: "0.06em", marginTop: 2,
              }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <BadgesSection myProfile={profile} />

        {/* Posts */}
        <div style={{
          fontFamily: "'Fraunces',serif",
          fontSize: 15, fontWeight: 700,
          color: "var(--text)", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          Posts
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: "var(--text-3)",
            fontFamily: "'Sora',sans-serif",
          }}>
            {posts.length} total
          </span>
        </div>

        {posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-3)" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>✍️</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>
              No posts yet
            </div>
          </div>
        ) : (
          posts.map((p, idx) => (
            <PostCard
              key={p.id}
              post={p}
              idx={idx}
              currentUserId={currentUserId}
              onLike={async () => {}}
              onVote={async () => {}}
              onBookmark={async () => {}}
              onComment={() => {}}
              onOpenOptions={() => {}}
              optionsPost={null}
              onShare={() => {}}
              onDeletePost={() => {}}
              onReportPost={() => {}}
              deleteLoading={false}
              toggleBookmark={async () => {}}
              closeOptions={() => {}}
              onImageClick={onImageClick}
            />
          ))
        )}
      </div>
    </div>
  );
};
// ── Followers / Following Modal ───────────────────────────
const FollowersModal = ({
  uid,
  type,
  onClose,
  onViewProfile,
  currentUserId,
  myProfile,
  onFollow,
  onUnfollow,
}: {
  uid: string;
  type: "followers" | "following";
  onClose: () => void;
  onViewProfile: (uid: string) => void;
  currentUserId: string;
  myProfile: UserProfile | null;
  onFollow: (uid: string) => void;
  onUnfollow: (uid: string) => void;
}) => {
  const [users,   setUsers]   = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const profileSnap = await getDoc(doc(db, "users", uid));
        if (!profileSnap.exists()) return;
        const profile = profileSnap.data() as UserProfile;
        const uids = type === "followers"
          ? (profile.followers || [])
          : (profile.following || []);

        if (uids.length === 0) { setUsers([]); setLoading(false); return; }

        // Fetch all user profiles in parallel
        const profiles = await Promise.all(
          uids.map(async u => {
            const snap = await getDoc(doc(db, "users", u));
            return snap.exists() ? (snap.data() as UserProfile) : null;
          })
        );
        setUsers(profiles.filter(Boolean) as UserProfile[]);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, [uid, type]);

  const isFollowing = (targetUid: string) =>
    myProfile?.following?.includes(targetUid) ?? false;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 600,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Sheet */}
      <div style={{
        position: "fixed",
        bottom: 0, left: "50%",
        transform: "translateX(-50%)",
        width: "100%", maxWidth: 640,
        maxHeight: "80vh",
        zIndex: 601,
        background: "var(--dark-2)",
        border: "1px solid var(--border)",
        borderBottom: "none",
        borderRadius: "24px 24px 0 0",
        display: "flex", flexDirection: "column",
      }}>
        {/* Handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: "rgba(255,255,255,0.15)",
          margin: "12px auto 0", flexShrink: 0,
        }}/>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px 12px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 16, fontWeight: 700, color: "var(--text)",
          }}>
            {type === "followers" ? "👥 Followers" : "➡️ Following"}
            <span style={{
              fontSize: 13, fontWeight: 500,
              color: "var(--text-3)",
              fontFamily: "'Sora',sans-serif",
              marginLeft: 8,
            }}>
              {users.length}
            </span>
          </span>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-2)", fontSize: 14,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
          {loading ? (
            [1,2,3].map(i => (
              <div key={i} style={{
                display: "flex", gap: 12, alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid var(--border)",
              }}>
                <div className="skeleton" style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0 }}/>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="skeleton" style={{ height: 11, width: "35%" }}/>
                  <div className="skeleton" style={{ height: 10, width: "55%" }}/>
                </div>
              </div>
            ))
          ) : users.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-3)" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>
                {type === "followers" ? "👤" : "🔍"}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>
                {type === "followers" ? "No followers yet" : "Not following anyone yet"}
              </div>
            </div>
          ) : (
            users.map(user => (
              <div key={user.uid} style={{
                display: "flex", alignItems: "center",
                gap: 12, padding: "12px 0",
                borderBottom: "1px solid var(--border)",
              }}>
                {/* Avatar */}
                <div
                  onClick={() => { onClose(); onViewProfile(user.uid); }}
                  style={{
                    width: 42, height: 42, borderRadius: 12,
                    flexShrink: 0, cursor: "pointer",
                    background: user.avatarUrl ? "transparent" : avatarGrad(user.uid),
                    display: "flex", alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14, fontWeight: 700, color: "#fff",
                    border: "1.5px solid rgba(255,255,255,0.1)",
                    overflow: "hidden",
                  }}
                >
                  {user.avatarUrl
                    ? <img src={user.avatarUrl} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                    : initials(user.name)}
                </div>

                {/* Info */}
                <div
                  style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                  onClick={() => { onClose(); onViewProfile(user.uid); }}
                >
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: "var(--text)", marginBottom: 2,
                  }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                    {[user.faculty, user.department].filter(Boolean).join(" · ")}
                  </div>
                </div>

                {/* Follow button — don't show for own account */}
                {user.uid !== currentUserId && user.uid !== ADMIN_UID && (
                  <button
                    onClick={() => isFollowing(user.uid)
                      ? onUnfollow(user.uid)
                      : onFollow(user.uid)
                    }
                    style={{
                      padding: "6px 14px", borderRadius: 100,
                      fontSize: 11.5, fontWeight: 700,
                      fontFamily: "'Sora',sans-serif",
                      cursor: "pointer", flexShrink: 0,
                      border: isFollowing(user.uid)
                        ? "1px solid rgba(255,255,255,0.15)"
                        : "1px solid rgba(22,163,74,0.4)",
                      background: isFollowing(user.uid)
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(22,163,74,0.1)",
                      color: isFollowing(user.uid)
                        ? "var(--text-3)"
                        : "var(--green-glow)",
                    }}
                  >
                    {isFollowing(user.uid) ? "Following" : "+ Follow"}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
// ── Settings Page ─────────────────────────────────────────
const SettingsPage = ({
  theme, setTheme,
  notifFollowers, notifLikes, notifComments,
  toggleNotif,
  settingsEmailMode, setSettingsEmailMode,
  settingsPassMode,  setSettingsPassMode,
  newEmail,          setNewEmail,
  newPassword,       setNewPassword,
  confirmPassword,   setConfirmPassword,
  settingsLoading,
  handleChangeEmail,
  handleChangePassword,
  handleLogout,
  currentUser,
  notifPermission,
  requestPushPermission,
}: any) => {

  const Section = ({ title, icon, children }: any) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginBottom: 14,
        paddingBottom: 10,
        borderBottom: "1px solid var(--border)",
      }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{
          fontFamily: "'Fraunces',serif",
          fontSize: 16, fontWeight: 700, color: "var(--text)",
        }}>{title}</span>
      </div>
      {children}
    </div>
  );

  const SettingRow = ({ label, sublabel, children }: any) => (
    <div style={{
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 16px",
      borderRadius: 12,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      marginBottom: 10,
      gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 600, color: "var(--text)",
          marginBottom: sublabel ? 2 : 0,
        }}>
          {label}
        </div>
        {sublabel && (
          <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
            {sublabel}
          </div>
        )}
      </div>
      {children}
    </div>
  );

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 46, height: 26, borderRadius: 13,
        background: value
          ? "linear-gradient(135deg,#166534,#16a34a)"
          : "rgba(255,255,255,0.1)",
        border: value
          ? "1px solid rgba(34,197,94,0.3)"
          : "1px solid var(--border)",
        cursor: "pointer", flexShrink: 0,
        position: "relative",
        transition: "all 0.25s ease",
      }}
    >
      <div style={{
        position: "absolute",
        top: 3, left: value ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        transition: "left 0.25s ease",
      }}/>
    </div>
  );

  const fieldStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px",
    background: "var(--dark-3)",
    border: "1.5px solid var(--border)",
    borderRadius: 10, color: "var(--text)",
    fontSize: 13, fontFamily: "'Sora',sans-serif",
    outline: "none", marginBottom: 10,
    colorScheme: theme === "dark" ? "dark" : "light",
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 0 60px" }}>
      {/* Header */}
      <div style={{
        padding: "24px 20px 20px",
        borderBottom: "1px solid var(--border)",
        marginBottom: 28,
      }}>
        <div style={{
          fontFamily: "'Fraunces',serif",
          fontSize: 22, fontWeight: 700,
          color: "var(--text)", marginBottom: 4,
        }}>
          ⚙️ Settings
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>
          Manage your preferences and account
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>

        {/* ── Appearance ── */}
        <Section title="Appearance" icon="🎨">
          <SettingRow
            label="Theme"
            sublabel={theme === "dark" ? "Dark mode is on" : "Light mode is on"}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setTheme("light")}
                style={{
                  padding: "6px 14px", borderRadius: 100,
                  fontSize: 12, fontWeight: 700,
                  fontFamily: "'Sora',sans-serif", cursor: "pointer",
                  border: theme === "light"
                    ? "1.5px solid rgba(245,158,11,0.5)"
                    : "1px solid var(--border)",
                  background: theme === "light"
                    ? "rgba(245,158,11,0.12)"
                    : "transparent",
                  color: theme === "light" ? "#f59e0b" : "var(--text-3)",
                }}
              >
                ☀️ Light
              </button>
              <button
                onClick={() => setTheme("dark")}
                style={{
                  padding: "6px 14px", borderRadius: 100,
                  fontSize: 12, fontWeight: 700,
                  fontFamily: "'Sora',sans-serif", cursor: "pointer",
                  border: theme === "dark"
                    ? "1.5px solid rgba(22,163,74,0.4)"
                    : "1px solid var(--border)",
                  background: theme === "dark"
                    ? "rgba(22,163,74,0.12)"
                    : "transparent",
                  color: theme === "dark" ? "var(--green-glow)" : "var(--text-3)",
                }}
              >
                🌙 Dark
              </button>
            </div>
          </SettingRow>
        </Section>


<SettingRow
            label="Push Notifications"
            sublabel={
              notifPermission === "granted"
                ? "Enabled on this device"
                : notifPermission === "denied"
                ? "Blocked — enable in browser settings"
                : "Get notified even when app is closed"
            }
          >
            {notifPermission === "granted" ? (
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: "var(--green-glow)",
                padding: "4px 10px", borderRadius: 100,
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.25)",
              }}>✓ Active</span>
            ) : notifPermission === "denied" ? (
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: "#f43f5e",
                padding: "4px 10px", borderRadius: 100,
                background: "rgba(244,63,94,0.1)",
                border: "1px solid rgba(244,63,94,0.25)",
              }}>Blocked</span>
            ) : (
              <button
                onClick={requestPushPermission}
                style={{
                  padding: "6px 14px", borderRadius: 100,
                  fontSize: 12, fontWeight: 700,
                  fontFamily: "'Sora',sans-serif", cursor: "pointer",
                  border: "1px solid rgba(34,197,94,0.4)",
                  background: "rgba(34,197,94,0.1)",
                  color: "var(--green-glow)",
                }}
              >
                Enable
              </button>
            )}
          </SettingRow>
        {/* ── Notifications ── */}
        <Section title="Notifications" icon="🔔">
          <SettingRow
            label="New Followers"
            sublabel="When someone follows you"
          >
            <Toggle
              value={notifFollowers}
              onChange={v => toggleNotif("followers", v)}
            />
          </SettingRow>
          <SettingRow
            label="Likes"
            sublabel="When someone likes your post"
          >
            <Toggle
              value={notifLikes}
              onChange={v => toggleNotif("likes", v)}
            />
          </SettingRow>
          <SettingRow
            label="Comments"
            sublabel="When someone comments on your post"
          >
            <Toggle
              value={notifComments}
              onChange={v => toggleNotif("comments", v)}
            />
          </SettingRow>
        </Section>

        {/* ── Account ── */}
        <Section title="Account" icon="👤">
          {/* Change Email */}
          <SettingRow
            label="Email Address"
            sublabel={currentUser.email || "No email set"}
          >
            <button
              onClick={() => {
                setSettingsEmailMode((o: boolean) => !o);
                setSettingsPassMode(false);
              }}
              style={{
                padding: "6px 14px", borderRadius: 100,
                fontSize: 12, fontWeight: 700,
                fontFamily: "'Sora',sans-serif", cursor: "pointer",
                border: "1px solid rgba(245,158,11,0.3)",
                background: "rgba(245,158,11,0.08)",
                color: "#f59e0b",
              }}
            >
              Change
            </button>
          </SettingRow>

          {settingsEmailMode && (
            <div style={{
              padding: "16px",
              borderRadius: 12,
              background: "rgba(245,158,11,0.05)",
              border: "1px solid rgba(245,158,11,0.2)",
              marginBottom: 10,
            }}>
              <input
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="Enter new email address"
                type="email"
                style={fieldStyle}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { setSettingsEmailMode(false); setNewEmail(""); }}
                  style={{
                    flex: 1, padding: "9px", borderRadius: 100,
                    border: "1px solid var(--border)",
                    background: "transparent", color: "var(--text-2)",
                    fontSize: 12, fontWeight: 600,
                    fontFamily: "'Sora',sans-serif", cursor: "pointer",
                  }}
                >Cancel</button>
                <button
                  onClick={handleChangeEmail}
                  disabled={settingsLoading || !newEmail.trim()}
                  style={{
                    flex: 2, padding: "9px", borderRadius: 100,
                    background: "linear-gradient(135deg,#b45309,#f59e0b)",
                    border: "none", color: "#1a0a00",
                    fontSize: 12, fontWeight: 700,
                    fontFamily: "'Sora',sans-serif", cursor: "pointer",
                    opacity: (!newEmail.trim() || settingsLoading) ? 0.5 : 1,
                  }}
                >
                  {settingsLoading ? "Saving…" : "Update Email"}
                </button>
              </div>
            </div>
          )}

          {/* Change Password */}
          <SettingRow
            label="Password"
            sublabel="Update your login password"
          >
            <button
              onClick={() => {
                setSettingsPassMode((o: boolean) => !o);
                setSettingsEmailMode(false);
              }}
              style={{
                padding: "6px 14px", borderRadius: 100,
                fontSize: 12, fontWeight: 700,
                fontFamily: "'Sora',sans-serif", cursor: "pointer",
                border: "1px solid rgba(245,158,11,0.3)",
                background: "rgba(245,158,11,0.08)",
                color: "#f59e0b",
              }}
            >
              Change
            </button>
          </SettingRow>

          {settingsPassMode && (
            <div style={{
              padding: "16px",
              borderRadius: 12,
              background: "rgba(245,158,11,0.05)",
              border: "1px solid rgba(245,158,11,0.2)",
              marginBottom: 10,
            }}>
              <input
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New password (min 6 characters)"
                type="password"
                style={fieldStyle}
              />
              <input
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                type="password"
                style={fieldStyle}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    setSettingsPassMode(false);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  style={{
                    flex: 1, padding: "9px", borderRadius: 100,
                    border: "1px solid var(--border)",
                    background: "transparent", color: "var(--text-2)",
                    fontSize: 12, fontWeight: 600,
                    fontFamily: "'Sora',sans-serif", cursor: "pointer",
                  }}
                >Cancel</button>
                <button
                  onClick={handleChangePassword}
                  disabled={settingsLoading || !newPassword.trim() || !confirmPassword.trim()}
                  style={{
                    flex: 2, padding: "9px", borderRadius: 100,
                    background: "linear-gradient(135deg,#b45309,#f59e0b)",
                    border: "none", color: "#1a0a00",
                    fontSize: 12, fontWeight: 700,
                    fontFamily: "'Sora',sans-serif", cursor: "pointer",
                    opacity: (!newPassword.trim() || !confirmPassword.trim() || settingsLoading) ? 0.5 : 1,
                  }}
                >
                  {settingsLoading ? "Saving…" : "Update Password"}
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* ── About ── */}
        <Section title="About" icon="ℹ️">
          <SettingRow label="App Name" sublabel="Campus Connect — TASU">
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>v1.0.0</span>
          </SettingRow>
          <SettingRow label="University" sublabel="Taraba State University, Jalingo">
            <span style={{ fontSize: 16 }}>🎓</span>
          </SettingRow>
          <SettingRow label="Developer" sublabel="Built exclusively for TASU students">
            <span style={{ fontSize: 16 }}>💻</span>
          </SettingRow>
        </Section>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          style={{
            width: "100%", padding: "13px",
            borderRadius: 12,
            background: "rgba(244,63,94,0.08)",
            border: "1px solid rgba(244,63,94,0.2)",
            color: "#f43f5e", fontSize: 13.5, fontWeight: 700,
            fontFamily: "'Sora',sans-serif", cursor: "pointer",
            marginTop: 8,
          }}
        >
          🚪 Sign Out
        </button>

      </div>
    </div>
  );
};

// ── Badges Section ────────────────────────────────────────
const BadgesSection = ({ myProfile }: { myProfile: UserProfile | null }) => {
  const silverStars = (myProfile as any)?.silverStars || 0;
  const postsThisWeek = (myProfile as any)?.postsThisWeek || 0;
  const currentStreak = (myProfile as any)?.currentStreak || 0;

  if (silverStars === 0 && postsThisWeek === 0 && currentStreak === 0) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontFamily: "'Fraunces',serif",
        fontSize: 15, fontWeight: 700,
        color: "var(--text)", marginBottom: 14,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        🏅 Badges
      </div>

      <div style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid var(--border)",
        borderRadius: 12, padding: "16px",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: silverStars > 0 ? "#F1EFE8" : "rgba(255,255,255,0.04)",
          border: `2.5px solid ${silverStars > 0 ? "#888780" : "rgba(255,255,255,0.08)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, flexShrink: 0,
          filter: silverStars > 0 ? "none" : "grayscale(1)",
          opacity: silverStars > 0 ? 1 : 0.4,
        }}>
          ⭐
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>
            Silver Star{silverStars !== 1 ? "s" : ""}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
            {silverStars > 0
              ? `Awarded ${silverStars} time${silverStars !== 1 ? "s" : ""} for top monthly poster`
              : "Awarded to top poster of the month"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 6 }}>
            {postsThisWeek} post{postsThisWeek !== 1 ? "s" : ""} this week
          </div>
        </div>
        {silverStars > 0 && (
          <div style={{
            fontSize: 18, fontWeight: 700,
            color: "#888780", flexShrink: 0,
          }}>
            ×{silverStars}
          </div>
        )}
      </div>

      {currentStreak > 0 && (
        <div style={{
          background: "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.2)",
          borderRadius: 12, padding: "16px",
          display: "flex", alignItems: "center", gap: 16,
          marginTop: 10,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(245,158,11,0.15)",
            border: "2.5px solid rgba(245,158,11,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, flexShrink: 0,
          }}>🔥</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>
              {currentStreak}-Day Posting Streak
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
              Post today to keep your streak alive
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b", flexShrink: 0 }}>
            {currentStreak}
          </div>
        </div>
      )}
    </div>
  );
};
// ── CBT Practice Browser ──────────────────────────────────
const CBTBrowser = ({
  myProfile,
  onStartExam,
}: {
  myProfile: UserProfile | null;
  onStartExam: (bank: CBTBank) => void;
}) => {
  const [step,       setStep]       = useState<"faculty"|"department"|"course"|"banks">("faculty");
  const [selFaculty,  setSelFaculty]  = useState("");
  const [selCourse,   setSelCourse]   = useState("");
  const [banks,      setBanks]      = useState<CBTBank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);

  // Get unique list of courses for the selected faculty+department from cbtBanks
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [loadingCourses,   setLoadingCourses]   = useState(false);

  useEffect(() => {
    if (step !== "course" || !selFaculty) return;
    setLoadingCourses(true);
    const q = query(
      collection(db, "cbtBanks"),
      where("faculty", "==", selFaculty)
    );
    getDocs(q).then(snap => {
      const courses = Array.from(new Set(snap.docs.map(d => d.data().course as string)));
      setAvailableCourses(courses.sort());
      setLoadingCourses(false);
    }).catch(() => setLoadingCourses(false));
  }, [step, selFaculty]);

  useEffect(() => {
    if (step !== "banks" || !selCourse) return;
    setLoadingBanks(true);
    const q = query(
      collection(db, "cbtBanks"),
      where("faculty", "==", selFaculty),
      where("course", "==", selCourse)
    );
    const unsub = onSnapshot(q, snap => {
      setBanks(snap.docs.map(d => ({ id: d.id, ...d.data() } as CBTBank)));
      setLoadingBanks(false);
    }, () => setLoadingBanks(false));
    return () => unsub();
  }, [step, selFaculty, selCourse]);

  const Crumb = () => (
    <div style={{
      display:"flex", alignItems:"center", gap:6,
      fontSize:11.5, color:"var(--text-3)", marginBottom:18,
      flexWrap:"wrap",
    }}>
      <span
        onClick={() => { setStep("faculty"); setSelFaculty(""); setSelCourse(""); }}
        style={{cursor:"pointer", color: step==="faculty" ? "var(--green-glow)" : "var(--text-3)"}}
      >📝 CBT Practice</span>
      {selFaculty && <>
        <span>›</span>
        <span
          onClick={() => { setStep("course"); setSelCourse(""); }}
          style={{cursor:"pointer", color: step==="course" ? "var(--green-glow)" : "var(--text-3)"}}
        >{selFaculty}</span>
      </>}
      {selCourse && <>
        <span>›</span>
        <span style={{color:"var(--green-glow)"}}>{selCourse}</span>
      </>}
    </div>
  );

  const OptionCard = ({ label, sub, onClick }: { label:string; sub?:string; onClick:()=>void }) => (
    <div
      onClick={onClick}
      style={{
        padding:"16px 18px", borderRadius:14,
        background:"var(--surface)", border:"1px solid var(--border)",
        cursor:"pointer", marginBottom:10,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        transition:"all 0.15s",
      }}
    >
      <div>
        <div style={{fontSize:13.5, fontWeight:700, color:"var(--text)"}}>{label}</div>
        {sub && <div style={{fontSize:11, color:"var(--text-3)", marginTop:2}}>{sub}</div>}
      </div>
      <span style={{fontSize:16, color:"var(--text-3)"}}>›</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 0 60px" }}>
      {/* Header */}
      <div style={{
        padding: "24px 20px 18px",
        borderBottom: "1px solid var(--border)",
        marginBottom: 24,
      }}>
        <div style={{
          fontFamily: "'Fraunces',serif",
          fontSize: 22, fontWeight: 700,
          color: "var(--text)", marginBottom: 4,
        }}>
          📝 CBT Practice
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>
          Practice past questions by faculty and course
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>
        <Crumb />

        {/* Step 1: Faculty */}
        {step === "faculty" && (
          <>
            <div style={{fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12}}>
              Select Faculty
            </div>
            {FACULTIES.map(f => (
              <OptionCard
                key={f}
                label={f}
               onClick={() => { setSelFaculty(f); setStep("course"); }}
              />
            ))}
          </>
        )}

        

        {/* Step 3: Course */}
        {step === "course" && (
          <>
            <div style={{fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12}}>
              Select Course
            </div>
            {loadingCourses ? (
              [1,2,3].map(i => (
                <div key={i} className="skeleton" style={{height:56, borderRadius:14, marginBottom:10}}/>
              ))
            ) : availableCourses.length === 0 ? (
              <div style={{textAlign:"center", padding:"40px 20px"}}>
                <div style={{fontSize:30, marginBottom:10}}>📭</div>
                <div style={{fontSize:13, fontWeight:600, color:"var(--text-2)"}}>
                  No courses available yet
                </div>
                <div style={{fontSize:11.5, color:"var(--text-3)", marginTop:6}}>
                  Admin hasn't added any question banks for {selFaculty} yet
                </div>
              </div>
            ) : (
              availableCourses.map(c => (
                <OptionCard
                  key={c}
                  label={c}
                  onClick={() => { setSelCourse(c); setStep("banks"); }}
                />
              ))
            )}
          </>
        )}

        {/* Step 4: Exam banks for the course */}
        {step === "banks" && (
          <>
            <div style={{fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12}}>
              Available Practice Tests
            </div>
            {loadingBanks ? (
              [1,2].map(i => (
                <div key={i} className="skeleton" style={{height:80, borderRadius:14, marginBottom:10}}/>
              ))
            ) : banks.length === 0 ? (
              <div style={{textAlign:"center", padding:"40px 20px"}}>
                <div style={{fontSize:30, marginBottom:10}}>📭</div>
                <div style={{fontSize:13, fontWeight:600, color:"var(--text-2)"}}>
                  No practice tests yet
                </div>
                <div style={{fontSize:11.5, color:"var(--text-3)", marginTop:6}}>
                  Check back later — admin is still adding questions
                </div>
              </div>
            ) : (
              banks.map(bank => (
                <div key={bank.id} style={{
                  padding:"16px 18px", borderRadius:14,
                  background:"var(--surface)", border:"1px solid rgba(34,197,94,0.2)",
                  marginBottom:10,
                }}>
                  <div style={{fontSize:14, fontWeight:700, color:"var(--text)", marginBottom:4}}>
                    {bank.title}
                  </div>
                  {bank.description && (
                    <div style={{fontSize:11.5, color:"var(--text-3)", marginBottom:10, lineHeight:1.5}}>
                      {bank.description}
                    </div>
                  )}
                  <div style={{display:"flex", gap:14, marginBottom:14, fontSize:11.5, color:"var(--text-2)"}}>
                    <span>📋 {bank.questionCount} questions</span>
                    <span>⏱️ {bank.durationMinutes} min</span>
                  </div>
                 <button
                    onClick={() => onStartExam(bank)}
                    style={{
                      width:"100%", padding:"10px",
                      borderRadius:100,
                      background:"linear-gradient(135deg,#166534,#16a34a)",
                      border:"1px solid rgba(34,197,94,0.3)",
                      color:"#fff", fontSize:13, fontWeight:700,
                      fontFamily:"'Sora',sans-serif", cursor:"pointer",
                      boxShadow:"0 4px 14px rgba(22,163,74,0.25)",
                    }}
                  >
                    ▶ Start Exam
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
};
// ── CBT Admin Management ──────────────────────────────────
const CBTAdmin = ({
  currentUser,
  cbtAdminView, setCbtAdminView,
  cbtSelectedBank, setCbtSelectedBank,
  showToast,
}: {
  currentUser: any;
  cbtAdminView: "banks"|"createBank"|"questions";
  setCbtAdminView: (v: "banks"|"createBank"|"questions") => void;
  cbtSelectedBank: CBTBank|null;
  setCbtSelectedBank: (b: CBTBank|null) => void;
  showToast: (msg: string) => void;
}) => {
  const [banks,   setBanks]   = useState<CBTBank[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit bank form state
  const [newFaculty,    setNewFaculty]    = useState("");
  const [newCourse,     setNewCourse]     = useState("");
  const [newTitle,      setNewTitle]      = useState("");
  const [newDesc,       setNewDesc]       = useState("");
  const [newDuration,   setNewDuration]   = useState("30");
  const [creatingBank,  setCreatingBank]  = useState(false);
  const [editingBankId, setEditingBankId] = useState<string|null>(null);
  useEffect(() => {
    const q = query(collection(db, "cbtBanks"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setBanks(snap.docs.map(d => ({ id: d.id, ...d.data() } as CBTBank)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

 const handleCreateBank = async () => {
    if (!newFaculty || !newCourse.trim() || !newTitle.trim() || !newDuration) {
      showToast("Please fill in all required fields.");
      return;
    }
    setCreatingBank(true);
    try {
      if (editingBankId) {
        // Update existing bank
        await updateDoc(doc(db, "cbtBanks", editingBankId), {
          faculty: newFaculty,
          course: newCourse.trim(),
          title: newTitle.trim(),
          description: newDesc.trim(),
          durationMinutes: parseInt(newDuration) || 30,
        });
        showToast("Question bank updated!");
      } else {
        // Create new bank
        await addDoc(collection(db, "cbtBanks"), {
          faculty: newFaculty,
          course: newCourse.trim(),
          title: newTitle.trim(),
          description: newDesc.trim(),
          durationMinutes: parseInt(newDuration) || 30,
          questionCount: 0,
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
        });
        showToast("Question bank created!");
      }
      setNewFaculty(""); setNewCourse("");
      setNewTitle(""); setNewDesc(""); setNewDuration("30");
      setEditingBankId(null);
      setTimeout(() => setCbtAdminView("banks"), 100);
    } catch (err) {
      showToast("Failed to save bank.");
    } finally {
      setCreatingBank(false);
    }
  };

  const handleOpenEdit = (bank: CBTBank) => {
    setNewFaculty(bank.faculty);
    setNewCourse(bank.course);
    setNewTitle(bank.title);
    setNewDesc(bank.description || "");
    setNewDuration(String(bank.durationMinutes));
    setEditingBankId(bank.id);
    setCbtAdminView("createBank");
  };

  const handleDeleteBank = async (bankId: string) => {
    if (!confirm("Delete this question bank and ALL its questions? This cannot be undone.")) return;
    try {
      // Delete all questions in this bank first
      const qSnap = await getDocs(query(collection(db, "cbtQuestions"), where("bankId", "==", bankId)));
      await Promise.all(qSnap.docs.map(d => deleteDoc(doc(db, "cbtQuestions", d.id))));
      // Delete the bank itself
      await deleteDoc(doc(db, "cbtBanks", bankId));
      showToast("Question bank deleted.");
    } catch (err) {
      showToast("Failed to delete bank.");
    }
  };

  const fieldStyle: React.CSSProperties = {
    width:"100%", padding:"10px 14px",
    background:"var(--dark-3)",
    border:"1.5px solid var(--border)",
    borderRadius:10, color:"var(--text)",
    fontSize:13, fontFamily:"'Sora',sans-serif",
    outline:"none", marginBottom:12,
  };

  // ── View: List of question banks ──
  if (cbtAdminView === "banks") {
    return (
      <div>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16}}>
          <div style={{fontSize:13, fontWeight:700, color:"var(--text)"}}>
            Question Banks ({banks.length})
          </div>
          <button
            onClick={() => setCbtAdminView("createBank")}
            style={{
              padding:"8px 16px", borderRadius:100,
              background:"linear-gradient(135deg,#166534,#16a34a)",
              border:"1px solid rgba(34,197,94,0.3)",
              color:"#fff", fontSize:12, fontWeight:700,
              fontFamily:"'Sora',sans-serif", cursor:"pointer",
            }}
          >
            + New Bank
          </button>
        </div>

        {loading ? (
          [1,2].map(i => <div key={i} className="skeleton" style={{height:80, borderRadius:14, marginBottom:10}}/>)
        ) : banks.length === 0 ? (
          <div style={{textAlign:"center", padding:"40px 20px"}}>
            <div style={{fontSize:30, marginBottom:10}}>📭</div>
            <div style={{fontSize:13, fontWeight:600, color:"var(--text-2)"}}>No question banks yet</div>
            <div style={{fontSize:11.5, color:"var(--text-3)", marginTop:6}}>Click "+ New Bank" to create your first one</div>
          </div>
        ) : (
          banks.map(bank => (
            <div key={bank.id} style={{
              padding:"16px 18px", borderRadius:14,
              background:"var(--surface)", border:"1px solid var(--border)",
              marginBottom:10,
            }}>
             <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8}}>
                <div>
                  <div style={{fontSize:14, fontWeight:700, color:"var(--text)"}}>{bank.title}</div>
                  <div style={{fontSize:11, color:"var(--text-3)", marginTop:2}}>
                    {bank.faculty} · {bank.course}
                  </div>
                </div>
                <div style={{display:"flex", gap:6, flexShrink:0}}>
                  <button
                    onClick={() => handleOpenEdit(bank)}
                    style={{
                      padding:"4px 10px", borderRadius:100,
                      background:"rgba(245,158,11,0.1)",
                      border:"1px solid rgba(245,158,11,0.25)",
                      color:"#f59e0b", fontSize:11, fontWeight:700,
                      fontFamily:"'Sora',sans-serif", cursor:"pointer",
                    }}
                  >✏️</button>
                  <button
                    onClick={() => handleDeleteBank(bank.id)}
                    style={{
                      padding:"4px 10px", borderRadius:100,
                      background:"rgba(244,63,94,0.1)",
                      border:"1px solid rgba(244,63,94,0.25)",
                      color:"#f43f5e", fontSize:11, fontWeight:700,
                      fontFamily:"'Sora',sans-serif", cursor:"pointer",
                    }}
                  >🗑️</button>
                </div>
              </div>
              <div style={{display:"flex", gap:14, fontSize:11.5, color:"var(--text-2)", marginBottom:12}}>
                <span>📋 {bank.questionCount} questions</span>
                <span>⏱️ {bank.durationMinutes} min</span>
              </div>
              <button
                onClick={() => { setCbtSelectedBank(bank); setCbtAdminView("questions"); }}
                style={{
                  width:"100%", padding:"9px",
                  borderRadius:100,
                  background:"rgba(245,158,11,0.1)",
                  border:"1px solid rgba(245,158,11,0.3)",
                  color:"#f59e0b", fontSize:12.5, fontWeight:700,
                  fontFamily:"'Sora',sans-serif", cursor:"pointer",
                }}
              >
                Manage Questions →
              </button>
            </div>
          ))
        )}
      </div>
    );
  }

  // ── View: Create new bank ──
 if (cbtAdminView === "createBank") {
    return (
      <div>
        <button
          onClick={() => {
            setCbtAdminView("banks");
            setEditingBankId(null);
            setNewFaculty(""); setNewCourse("");
            setNewTitle(""); setNewDesc(""); setNewDuration("30");
          }}
          style={{
            background:"transparent", border:"none",
            color:"var(--text-2)", fontSize:12.5, fontWeight:600,
            cursor:"pointer", marginBottom:16,
            fontFamily:"'Sora',sans-serif",
          }}
        >← Back to banks</button>

        <div style={{fontSize:15, fontWeight:700, color:"var(--text)", marginBottom:16}}>
          {editingBankId ? "Edit Question Bank" : "Create Question Bank"}
        </div>

        <label style={{fontSize:10, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6}}>Faculty *</label>
<select value={newFaculty} onChange={e => setNewFaculty(e.target.value)} style={fieldStyle}>
            <option value="">Select faculty</option>
          {FACULTIES.map(f => <option key={f}>{f}</option>)}
        </select>

        

        <label style={{fontSize:10, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6}}>Course Name *</label>
        <input value={newCourse} onChange={e => setNewCourse(e.target.value)} placeholder="e.g. Data Structures and Algorithms" style={fieldStyle}/>

        <label style={{fontSize:10, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6}}>Exam Title *</label>
        <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. CSC201 Mock Test 1" style={fieldStyle}/>

        <label style={{fontSize:10, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6}}>Description (optional)</label>
        <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} placeholder="Brief description of this practice test…" style={{...fieldStyle, resize:"vertical", minHeight:56}}/>

        <label style={{fontSize:10, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6}}>Duration (minutes) *</label>
        <input type="number" min="1" value={newDuration} onChange={e => setNewDuration(e.target.value)} style={fieldStyle}/>

        <button
          onClick={handleCreateBank}
          disabled={creatingBank}
          style={{
            width:"100%", padding:"12px", marginTop:8,
            borderRadius:100,
            background:"linear-gradient(135deg,#166534,#16a34a)",
            border:"1px solid rgba(34,197,94,0.3)",
            color:"#fff", fontSize:13.5, fontWeight:700,
            fontFamily:"'Sora',sans-serif", cursor:"pointer",
            opacity: creatingBank ? 0.5 : 1,
          }}
        >
          {creatingBank
            ? (editingBankId ? "Saving…" : "Creating…")
            : (editingBankId ? "Save Changes" : "Create Question Bank")}
        </button>
      </div>
    );
  }

  // ── View: Manage questions in a bank ──
  if (cbtAdminView === "questions" && cbtSelectedBank) {
    return (
      <CBTQuestionManager
        bank={cbtSelectedBank}
        onBack={() => { setCbtAdminView("banks"); setCbtSelectedBank(null); }}
        showToast={showToast}
      />
    );
  }

  return null;
};
// ── CBT Question Manager ──────────────────────────────────
const CBTQuestionManager = ({
  bank,
  onBack,
  showToast,
}: {
  bank: CBTBank;
  onBack: () => void;
  showToast: (msg: string) => void;
}) => {
  const [questions, setQuestions] = useState<CBTQuestion[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [mode,      setMode]      = useState<"list"|"form"|"bulk">("list");

  // Single question form state
  const [qText,     setQText]     = useState("");
  const [optA,       setOptA]     = useState("");
  const [optB,       setOptB]     = useState("");
  const [optC,       setOptC]     = useState("");
  const [optD,       setOptD]     = useState("");
  const [correct,    setCorrect]  = useState<"A"|"B"|"C"|"D">("A");
  const [saving,     setSaving]   = useState(false);
    const [editingQuestionId, setEditingQuestionId] = useState<string|null>(null);

  // Bulk paste state
  const [bulkText,    setBulkText]    = useState("");
  const [bulkSaving,  setBulkSaving]  = useState(false);
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "cbtQuestions"), where("bankId", "==", bank.id));
    const unsub = onSnapshot(q, snap => {
      setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() } as CBTQuestion)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [bank.id]);

  const updateBankCount = async (count: number) => {
    await updateDoc(doc(db, "cbtBanks", bank.id), { questionCount: count });
  };

  const resetForm = () => {
    setQText(""); setOptA(""); setOptB(""); setOptC(""); setOptD("");
    setCorrect("A");
    setEditingQuestionId(null);
  };

  const handleOpenEditQuestion = (q: CBTQuestion) => {
    setQText(q.question);
    setOptA(q.options.find(o => o.label === "A")?.text || "");
    setOptB(q.options.find(o => o.label === "B")?.text || "");
    setOptC(q.options.find(o => o.label === "C")?.text || "");
    setOptD(q.options.find(o => o.label === "D")?.text || "");
    setCorrect(q.correctAnswer);
    setEditingQuestionId(q.id);
    setMode("form");
  };
  

  const handleAddQuestion = async () => {
    if (!qText.trim() || !optA.trim() || !optB.trim() || !optC.trim() || !optD.trim()) {
      showToast("Please fill in the question and all 4 options.");
      return;
    }
    setSaving(true);
    try {
      if (editingQuestionId) {
        // Update existing question — no bank count change needed
        await updateDoc(doc(db, "cbtQuestions", editingQuestionId), {
          question: qText.trim(),
          options: [
            { label: "A", text: optA.trim() },
            { label: "B", text: optB.trim() },
            { label: "C", text: optC.trim() },
            { label: "D", text: optD.trim() },
          ],
          correctAnswer: correct,
        });
        showToast("Question updated!");
      } else {
        // Create new question
        await addDoc(collection(db, "cbtQuestions"), {
          bankId: bank.id,
          question: qText.trim(),
          options: [
            { label: "A", text: optA.trim() },
            { label: "B", text: optB.trim() },
            { label: "C", text: optC.trim() },
            { label: "D", text: optD.trim() },
          ],
          correctAnswer: correct,
          createdAt: serverTimestamp(),
        });
        await updateBankCount(questions.length + 1);
        showToast("Question added!");
      }
      resetForm();
      setMode("list");
    } catch (err) {
      showToast(editingQuestionId ? "Failed to update question." : "Failed to add question.");
    } finally {
      setSaving(false);
    }
  };

 const handleDeleteQuestion = async (qId: string) => {
    if (!confirm("Delete this question?")) return;
    try {
      console.log("Attempting to delete question:", qId);
      await deleteDoc(doc(db, "cbtQuestions", qId));
      console.log("✅ deleteDoc succeeded");
      await updateBankCount(Math.max(0, questions.length - 1));
      console.log("✅ updateBankCount succeeded");
      showToast("Question deleted.");
    } catch (err: any) {
      console.error("❌ DELETE FAILED:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      showToast("Failed to delete question.");
    }
  };

  // ── Bulk paste parsing ──
  // Expected format per question block, separated by blank lines:
  // Q: What is...?
  // A) Option one
  // B) Option two
  // C) Option three
  // D) Option four
  // Answer: B
  const parseBulkText = (text: string) => {
    const blocks = text.trim().split(/\n\s*\n/).filter(b => b.trim());
    const parsed: any[] = [];
    for (const block of blocks) {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
      const qLine = lines.find(l => /^Q[:.]?\s*/i.test(l));
      const aLine = lines.find(l => /^A[):.]?\s*/i.test(l));
      const bLine = lines.find(l => /^B[):.]?\s*/i.test(l));
      const cLine = lines.find(l => /^C[):.]?\s*/i.test(l));
      const dLine = lines.find(l => /^D[):.]?\s*/i.test(l));
      const ansLine = lines.find(l => /^Answer[:.]?\s*/i.test(l));

      if (!qLine || !aLine || !bLine || !cLine || !dLine || !ansLine) continue;

      const question = qLine.replace(/^Q[:.]?\s*/i, "").trim();
      const a = aLine.replace(/^A[):.]?\s*/i, "").trim();
      const b = bLine.replace(/^B[):.]?\s*/i, "").trim();
      const c = cLine.replace(/^C[):.]?\s*/i, "").trim();
      const d = dLine.replace(/^D[):.]?\s*/i, "").trim();
      const ansRaw = ansLine.replace(/^Answer[:.]?\s*/i, "").trim().toUpperCase();
      const ans = ["A","B","C","D"].includes(ansRaw) ? ansRaw : "A";

      parsed.push({
        question, a, b, c, d, correctAnswer: ans,
      });
    }
    return parsed;
  };

  const handlePreviewBulk = () => {
    const parsed = parseBulkText(bulkText);
    if (parsed.length === 0) {
      showToast("Couldn't parse any questions. Check the format.");
      return;
    }
    setBulkPreview(parsed);
  };

  const handleSubmitBulk = async () => {
    if (bulkPreview.length === 0) {
      showToast("Click Preview first to validate your questions.");
      return;
    }
    setBulkSaving(true);
    try {
      await Promise.all(bulkPreview.map(p =>
        addDoc(collection(db, "cbtQuestions"), {
          bankId: bank.id,
          question: p.question,
          options: [
            { label: "A", text: p.a },
            { label: "B", text: p.b },
            { label: "C", text: p.c },
            { label: "D", text: p.d },
          ],
          correctAnswer: p.correctAnswer,
          createdAt: serverTimestamp(),
        })
      ));
      await updateBankCount(questions.length + bulkPreview.length);
      showToast(`${bulkPreview.length} questions added!`);
      setBulkText("");
      setBulkPreview([]);
      setMode("list");
    } catch (err) {
      showToast("Failed to add bulk questions.");
    } finally {
      setBulkSaving(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width:"100%", padding:"10px 14px",
    background:"var(--dark-3)",
    border:"1.5px solid var(--border)",
    borderRadius:10, color:"var(--text)",
    fontSize:13, fontFamily:"'Sora',sans-serif",
    outline:"none", marginBottom:12,
  };

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          background:"transparent", border:"none",
          color:"var(--text-2)", fontSize:12.5, fontWeight:600,
          cursor:"pointer", marginBottom:16,
          fontFamily:"'Sora',sans-serif",
        }}
      >← Back to banks</button>

      <div style={{fontSize:15, fontWeight:700, color:"var(--text)", marginBottom:2}}>
        {bank.title}
      </div>
      <div style={{fontSize:11.5, color:"var(--text-3)", marginBottom:18}}>
        {questions.length} questions · {bank.durationMinutes} min
      </div>

      {/* Mode tabs */}
      <div style={{display:"flex", gap:8, marginBottom:18}}>
        {(["list","form","bulk"] as const).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setBulkPreview([]); if (m !== "form") resetForm(); }}
            style={{
              padding:"7px 14px", borderRadius:100,
              fontSize:11.5, fontWeight:700,
              fontFamily:"'Sora',sans-serif", cursor:"pointer",
              border: mode === m ? "1.5px solid rgba(34,197,94,0.4)" : "1px solid var(--border)",
              background: mode === m ? "rgba(22,163,74,0.1)" : "transparent",
              color: mode === m ? "var(--green-glow)" : "var(--text-3)",
            }}
          >
{m === "list" ? `📋 Questions (${questions.length})` : m === "form" ? (editingQuestionId ? "✏️ Editing" : "➕ Add One") : "📥 Bulk Paste"}          </button>
        ))}
      </div>

      {/* ── List mode ── */}
      {mode === "list" && (
        loading ? (
          [1,2].map(i => <div key={i} className="skeleton" style={{height:60, borderRadius:12, marginBottom:10}}/>)
        ) : questions.length === 0 ? (
          <div style={{textAlign:"center", padding:"40px 20px"}}>
            <div style={{fontSize:28, marginBottom:10}}>📝</div>
            <div style={{fontSize:13, fontWeight:600, color:"var(--text-2)"}}>No questions yet</div>
            <div style={{fontSize:11.5, color:"var(--text-3)", marginTop:6}}>Add your first question using the tabs above</div>
          </div>
        ) : (
          questions.map((q, idx) => (
            <div key={q.id} style={{
              padding:"14px 16px", borderRadius:12,
              background:"var(--surface)", border:"1px solid var(--border)",
              marginBottom:10,
            }}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:12.5, fontWeight:600, color:"var(--text)", marginBottom:8}}>
                    {idx + 1}. {q.question}
                  </div>
                  {q.options.map(opt => (
                    <div key={opt.label} style={{
                      fontSize:11.5, marginBottom:3,
                      color: opt.label === q.correctAnswer ? "var(--green-glow)" : "var(--text-3)",
                      fontWeight: opt.label === q.correctAnswer ? 700 : 400,
                    }}>
                      {opt.label === q.correctAnswer && "✓ "}{opt.label}) {opt.text}
                    </div>
                  ))}
                </div>
                <div style={{display:"flex", gap:6, flexShrink:0}}>
                  <button
                    onClick={() => handleOpenEditQuestion(q)}
                    style={{
                      padding:"4px 10px", borderRadius:100,
                      background:"rgba(245,158,11,0.1)",
                      border:"1px solid rgba(245,158,11,0.25)",
                      color:"#f59e0b", fontSize:11, fontWeight:700,
                      fontFamily:"'Sora',sans-serif", cursor:"pointer",
                    }}
                  >✏️</button>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    style={{
                      padding:"4px 10px", borderRadius:100,
                      background:"rgba(244,63,94,0.1)",
                      border:"1px solid rgba(244,63,94,0.25)",
                      color:"#f43f5e", fontSize:11, fontWeight:700,
                      fontFamily:"'Sora',sans-serif", cursor:"pointer",
                    }}
                  >🗑️</button>
                </div>
              </div>
            </div>
          ))
        )
      )}

      {/* ── Single form mode ── */}
      {mode === "form" && (
        <div>
          <label style={{fontSize:10, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6}}>Question *</label>
          <textarea value={qText} onChange={e => setQText(e.target.value)} rows={2} placeholder="Enter the question…" style={{...fieldStyle, resize:"vertical", minHeight:56}}/>

          {(["A","B","C","D"] as const).map(label => (
            <div key={label}>
              <label style={{fontSize:10, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6}}>
                Option {label} *
              </label>
              <input
                value={label === "A" ? optA : label === "B" ? optB : label === "C" ? optC : optD}
                onChange={e => {
                  const v = e.target.value;
                  if (label === "A") setOptA(v);
                  if (label === "B") setOptB(v);
                  if (label === "C") setOptC(v);
                  if (label === "D") setOptD(v);
                }}
                placeholder={`Enter option ${label}…`}
                style={fieldStyle}
              />
            </div>
          ))}

          <label style={{fontSize:10, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6}}>Correct Answer *</label>
          <div style={{display:"flex", gap:8, marginBottom:16}}>
            {(["A","B","C","D"] as const).map(label => (
              <button
                key={label}
                onClick={() => setCorrect(label)}
                style={{
                  flex:1, padding:"10px", borderRadius:10,
                  fontSize:13, fontWeight:700,
                  fontFamily:"'Sora',sans-serif", cursor:"pointer",
                  border: correct === label ? "1.5px solid rgba(34,197,94,0.5)" : "1px solid var(--border)",
                  background: correct === label ? "rgba(22,163,74,0.12)" : "transparent",
                  color: correct === label ? "var(--green-glow)" : "var(--text-3)",
                }}
              >{label}</button>
            ))}
          </div>

          <button
            onClick={handleAddQuestion}
            disabled={saving}
            style={{
              width:"100%", padding:"12px",
              borderRadius:100,
              background:"linear-gradient(135deg,#166534,#16a34a)",
              border:"1px solid rgba(34,197,94,0.3)",
              color:"#fff", fontSize:13.5, fontWeight:700,
              fontFamily:"'Sora',sans-serif", cursor:"pointer",
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving
              ? (editingQuestionId ? "Saving…" : "Adding…")
              : (editingQuestionId ? "Save Changes" : "+ Add Question")}
          </button>
          {editingQuestionId && (
            <button
              onClick={() => { resetForm(); }}
              style={{
                width:"100%", padding:"10px", marginTop:8,
                borderRadius:100,
                background:"transparent",
                border:"1px solid var(--border)",
                color:"var(--text-2)", fontSize:12.5, fontWeight:600,
                fontFamily:"'Sora',sans-serif", cursor:"pointer",
              }}
            >
              Cancel Editing
            </button>
          )}
        </div>
      )}

      {/* ── Bulk paste mode ── */}
      {mode === "bulk" && (
        <div>
          <div style={{
            padding:"12px 14px", borderRadius:10, marginBottom:14,
            background:"rgba(96,165,250,0.06)", border:"1px solid rgba(96,165,250,0.2)",
            fontSize:11.5, color:"var(--text-2)", lineHeight:1.7,
          }}>
            <strong>Format:</strong> Paste questions separated by a blank line, like this:
            <pre style={{
              marginTop:8, padding:10, borderRadius:8,
              background:"rgba(0,0,0,0.2)", fontSize:11,
              whiteSpace:"pre-wrap", fontFamily:"monospace",
              color:"var(--text-3)",
            }}>{`Q: What is 2 + 2?
A) 3
B) 4
C) 5
D) 6
Answer: B

Q: Capital of Nigeria?
A) Lagos
B) Kano
C) Abuja
D) Enugu
Answer: C`}</pre>
          </div>

          <textarea
            value={bulkText}
            onChange={e => { setBulkText(e.target.value); setBulkPreview([]); }}
            rows={10}
            placeholder="Paste your questions here…"
            style={{...fieldStyle, resize:"vertical", minHeight:200, fontFamily:"monospace", fontSize:12}}
          />

          <button
            onClick={handlePreviewBulk}
            style={{
              width:"100%", padding:"10px", marginBottom:10,
              borderRadius:100,
              background:"rgba(245,158,11,0.1)",
              border:"1px solid rgba(245,158,11,0.3)",
              color:"#f59e0b", fontSize:12.5, fontWeight:700,
              fontFamily:"'Sora',sans-serif", cursor:"pointer",
            }}
          >
            👁️ Preview ({bulkText.trim() ? parseBulkText(bulkText).length : 0} questions detected)
          </button>

          {bulkPreview.length > 0 && (
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11.5, fontWeight:700, color:"var(--green-glow)", marginBottom:8}}>
                ✓ {bulkPreview.length} questions ready to import
              </div>
              {bulkPreview.slice(0, 3).map((p, i) => (
                <div key={i} style={{
                  padding:"10px 12px", borderRadius:10, marginBottom:6,
                  background:"var(--surface)", border:"1px solid var(--border)",
                  fontSize:11.5, color:"var(--text-2)",
                }}>
                  {i+1}. {p.question} <span style={{color:"var(--green-glow)"}}>(Answer: {p.correctAnswer})</span>
                </div>
              ))}
              {bulkPreview.length > 3 && (
                <div style={{fontSize:11, color:"var(--text-3)", textAlign:"center"}}>
                  + {bulkPreview.length - 3} more…
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSubmitBulk}
            disabled={bulkSaving || bulkPreview.length === 0}
            style={{
              width:"100%", padding:"12px",
              borderRadius:100,
              background:"linear-gradient(135deg,#166534,#16a34a)",
              border:"1px solid rgba(34,197,94,0.3)",
              color:"#fff", fontSize:13.5, fontWeight:700,
              fontFamily:"'Sora',sans-serif", cursor:"pointer",
              opacity: (bulkSaving || bulkPreview.length === 0) ? 0.5 : 1,
            }}
          >
            {bulkSaving ? "Importing…" : `Import ${bulkPreview.length} Questions`}
          </button>
        </div>
      )}
    </div>
  );
};
// ── CBT Exam Session ──────────────────────────────────────
const CBTExam = ({
  bank,
  currentUser,
  myProfile,
  onExit,
  showToast,
}: {
  bank: CBTBank;
  currentUser: any;
  myProfile: any;
  onExit: () => void;
  showToast: (msg: string) => void;
}) => {
  const [questions,   setQuestions]   = useState<CBTQuestion[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [started,     setStarted]     = useState(false);
  const [currentIdx,  setCurrentIdx]  = useState(0);
  const [answers,     setAnswers]     = useState<Record<string, "A"|"B"|"C"|"D"|null>>({});
  const [timeLeft,    setTimeLeft]    = useState(bank.durationMinutes * 60);
  const [submitted,   setSubmitted]   = useState(false);
  const [result,      setResult]      = useState<CBTScore|null>(null);
  const [savingScore, setSavingScore] = useState(false);
  const startTimeRef = useRef<number>(0);
  const timerRef     = useRef<any>(null);

  // Load questions
  useEffect(() => {
    const q = query(
      collection(db, "cbtQuestions"),
      where("bankId", "==", bank.id)
    );
    getDocs(q).then(snap => {
      const qs = snap.docs.map(d => ({ id: d.id, ...d.data() } as CBTQuestion));
      // Shuffle questions for each session
      const shuffled = [...qs].sort(() => Math.random() - 0.5);
      setQuestions(shuffled);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [bank.id]);

  // Timer
  useEffect(() => {
    if (!started || submitted) return;
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [started, submitted]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleSelect = (qId: string, option: "A"|"B"|"C"|"D") => {
    setAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const handleSubmit = async () => {
    if (submitted) return;
    clearInterval(timerRef.current);
    setSubmitted(true);

    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    let score = 0;
    const answerDetails = questions.map(q => {
      const selected = answers[q.id] || null;
      const isCorrect = selected === q.correctAnswer;
      if (isCorrect) score++;
      return {
        questionId: q.id,
        selected,
        correct: q.correctAnswer,
        isCorrect,
      };
    });

    const total      = questions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed     = percentage >= 50;

    const scoreData: Omit<CBTScore, "id"> = {
      uid:       currentUser.uid,
      bankId:    bank.id,
      bankTitle: bank.title,
      course:    bank.course,
      score,
      total,
      percentage,
      passed,
      timeTaken,
      answers:   answerDetails,
      createdAt: serverTimestamp(),
    };

    setSavingScore(true);
    try {
      const docRef = await addDoc(collection(db, "cbtScores"), scoreData);
      setResult({ ...scoreData, id: docRef.id, createdAt: new Date() });
    } catch (err) {
      showToast("Score saved locally — couldn't sync to cloud.");
      setResult({ ...scoreData, id: "local", createdAt: new Date() });
    } finally {
      setSavingScore(false);
    }
  };

  const answeredCount = Object.values(answers).filter(Boolean).length;
  const currentQ = questions[currentIdx];

  // ── Loading screen ──
  if (loading) return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>📝</div>
      <div style={{ fontSize: 13, color: "var(--text-2)" }}>Loading questions…</div>
    </div>
  );

  // ── No questions ──
  if (!loading && questions.length === 0) return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>😕</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>No questions available yet</div>
      <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 6, marginBottom: 20 }}>
        Admin hasn't added questions to this bank yet.
      </div>
      <button onClick={onExit} style={{
        padding: "9px 20px", borderRadius: 100,
        background: "var(--surface)", border: "1px solid var(--border)",
        color: "var(--text-2)", fontSize: 12, fontWeight: 600,
        fontFamily: "'Sora',sans-serif", cursor: "pointer",
      }}>← Go Back</button>
    </div>
  );

  // ── Pre-exam screen ──
  if (!started) return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 0 60px" }}>
      <button onClick={onExit} style={{
        background: "transparent", border: "none",
        color: "var(--text-2)", fontSize: 12.5, fontWeight: 600,
        cursor: "pointer", padding: "16px 20px",
        fontFamily: "'Sora',sans-serif",
      }}>← Back</button>

      <div style={{ padding: "0 20px" }}>
        <div style={{
          textAlign: "center", padding: "32px 20px",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 20, marginBottom: 20,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
          <div style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 22, fontWeight: 700,
            color: "var(--text)", marginBottom: 8,
          }}>
            {bank.title}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-3)", marginBottom: 20 }}>
            {bank.course} · {bank.faculty}
          </div>
          {[
            { icon: "📋", label: "Questions", value: `${questions.length}` },
            { icon: "⏱️", label: "Duration", value: `${bank.durationMinutes} minutes` },
            { icon: "🎯", label: "Pass Mark", value: "50% and above" },
            { icon: "📊", label: "Scoring", value: "End of exam" },
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", padding: "12px 16px",
              borderRadius: 10, marginBottom: 8,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border)",
            }}>
              <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>
                {item.icon} {item.label}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {bank.description && (
          <div style={{
            padding: "12px 16px", borderRadius: 12, marginBottom: 20,
            background: "rgba(96,165,250,0.06)",
            border: "1px solid rgba(96,165,250,0.15)",
            fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.7,
          }}>
            ℹ️ {bank.description}
          </div>
        )}

        <div style={{
          padding: "12px 16px", borderRadius: 12, marginBottom: 24,
          background: "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.2)",
          fontSize: 12, color: "var(--text-2)", lineHeight: 1.7,
        }}>
          ⚠️ Once you start the exam, the timer begins and cannot be paused.
          Make sure you have a stable internet connection before starting.
        </div>

        <button
          onClick={() => setStarted(true)}
          style={{
            width: "100%", padding: "14px",
            borderRadius: 100,
            background: "linear-gradient(135deg,#166534,#16a34a)",
            border: "1px solid rgba(34,197,94,0.3)",
            color: "#fff", fontSize: 14, fontWeight: 700,
            fontFamily: "'Sora',sans-serif", cursor: "pointer",
            boxShadow: "0 6px 20px rgba(22,163,74,0.3)",
          }}
        >
          ▶ Start Exam
        </button>
      </div>
    </div>
  );

  // ── Results screen ──
  if (submitted && result) return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 0 60px" }}>
      <div style={{ padding: "24px 20px" }}>
        {/* Score card */}
        <div style={{
          textAlign: "center", padding: "32px 20px",
          borderRadius: 20, marginBottom: 24,
          background: result.passed
            ? "linear-gradient(135deg,rgba(20,83,45,0.3),rgba(22,163,74,0.1))"
            : "linear-gradient(135deg,rgba(127,29,29,0.3),rgba(244,63,94,0.1))",
          border: `1px solid ${result.passed ? "rgba(34,197,94,0.3)" : "rgba(244,63,94,0.3)"}`,
        }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>
            {result.passed ? "🎉" : "😢"}
          </div>
          <div style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 28, fontWeight: 700,
            color: result.passed ? "var(--green-glow)" : "#f43f5e",
            marginBottom: 6,
          }}>
            {result.passed ? "Congratulations!" : "Better luck next time"}
          </div>
          <div style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 48, fontWeight: 800,
            color: "var(--text)", marginBottom: 4,
          }}>
            {result.percentage}%
          </div>
          <div style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 20 }}>
            {result.score} out of {result.total} correct
          </div>
          <div style={{
            display: "inline-block",
            padding: "6px 20px", borderRadius: 100,
            background: result.passed ? "rgba(34,197,94,0.15)" : "rgba(244,63,94,0.15)",
            border: `1px solid ${result.passed ? "rgba(34,197,94,0.3)" : "rgba(244,63,94,0.3)"}`,
            fontSize: 13, fontWeight: 700,
            color: result.passed ? "var(--green-glow)" : "#f43f5e",
          }}>
            {result.passed ? "✓ PASSED" : "✗ FAILED"}
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10, marginBottom: 24,
        }}>
          {[
            { label: "Correct", value: result.score, color: "var(--green-glow)" },
            { label: "Wrong", value: result.total - result.score, color: "#f43f5e" },
            { label: "Time", value: `${Math.floor(result.timeTaken/60)}m ${result.timeTaken%60}s`, color: "var(--text-2)" },
          ].map((stat, i) => (
            <div key={i} style={{
              textAlign: "center", padding: "14px 8px",
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 12,
            }}>
              <div style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 22, fontWeight: 700,
                color: stat.color, marginBottom: 4,
              }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Answer review */}
        <div style={{
          fontFamily: "'Fraunces',serif",
          fontSize: 15, fontWeight: 700,
          color: "var(--text)", marginBottom: 14,
        }}>
          Answer Review
        </div>

        {questions.map((q, idx) => {
          const ans = result.answers.find(a => a.questionId === q.id);
          const isCorrect = ans?.isCorrect ?? false;
          const selected  = ans?.selected ?? null;
          return (
            <div key={q.id} style={{
              padding: "14px 16px", borderRadius: 14,
              background: "var(--surface)",
              border: `1px solid ${isCorrect ? "rgba(34,197,94,0.25)" : "rgba(244,63,94,0.25)"}`,
              marginBottom: 10,
            }}>
              <div style={{
                display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10,
              }}>
                <span style={{
                  fontSize: 14, flexShrink: 0,
                  marginTop: 1,
                }}>
                  {isCorrect ? "✅" : "❌"}
                </span>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.5 }}>
                  {idx + 1}. {q.question}
                </div>
              </div>
              {q.options.map(opt => {
                const isSelected = opt.label === selected;
                const isRight    = opt.label === q.correctAnswer;
                let bg    = "transparent";
                let color = "var(--text-3)";
                let border = "1px solid transparent";
                if (isRight)    { bg = "rgba(34,197,94,0.08)";  color = "var(--green-glow)"; border = "1px solid rgba(34,197,94,0.25)"; }
                if (isSelected && !isRight) { bg = "rgba(244,63,94,0.08)"; color = "#f43f5e"; border = "1px solid rgba(244,63,94,0.25)"; }
                return (
                  <div key={opt.label} style={{
                    padding: "8px 12px", borderRadius: 8,
                    marginBottom: 4, fontSize: 12,
                    fontWeight: isRight || isSelected ? 700 : 400,
                    background: bg, color, border,
                  }}>
                    {opt.label}) {opt.text}
                    {isRight && " ✓"}
                    {isSelected && !isRight && " ✗"}
                  </div>
                );
              })}
            </div>
          );
        })}

        <button
          onClick={onExit}
          style={{
            width: "100%", padding: "13px", marginTop: 16,
            borderRadius: 100,
            background: "linear-gradient(135deg,#b45309,#f59e0b)",
            border: "none", color: "#1a0a00",
            fontSize: 13.5, fontWeight: 700,
            fontFamily: "'Sora',sans-serif", cursor: "pointer",
          }}
        >
          ← Back to Practice
        </button>
      </div>
    </div>
  );

  // ── Active exam screen ──
  const totalQ    = questions.length;
  const timerPct  = (timeLeft / (bank.durationMinutes * 60)) * 100;
  const timerColor = timerPct > 30 ? "var(--green-glow)" : timerPct > 10 ? "#f59e0b" : "#f43f5e";

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 0 80px" }}>
      {/* Top bar */}
      <div style={{
        position: "sticky", top: "var(--topbar-h)",
        zIndex: 10, padding: "12px 20px",
        background: "var(--dark-2)",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 12,
      }}>
        {/* Progress */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>
            Question {currentIdx + 1} of {totalQ} · {answeredCount} answered
          </div>
          <div style={{
            height: 4, borderRadius: 2,
            background: "var(--border)", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: 2,
              background: "var(--green-glow)",
              width: `${((currentIdx + 1) / totalQ) * 100}%`,
              transition: "width 0.3s ease",
            }}/>
          </div>
        </div>

        {/* Timer */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 100,
          background: "var(--surface)",
          border: `1px solid ${timerColor}40`,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13 }}>⏱️</span>
          <span style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 16, fontWeight: 800,
            color: timerColor,
          }}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* Question */}
      {currentQ && (
        <div style={{ padding: "24px 20px" }}>
          <div style={{
            padding: "20px", borderRadius: 16,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            marginBottom: 20,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700,
              color: "var(--text-3)",
              textTransform: "uppercase",
              letterSpacing: "0.08em", marginBottom: 10,
            }}>
              Question {currentIdx + 1}
            </div>
            <div style={{
              fontSize: 15, fontWeight: 600,
              color: "var(--text)", lineHeight: 1.65,
            }}>
              {currentQ.question}
            </div>
          </div>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {currentQ.options.map(opt => {
              const isSelected = answers[currentQ.id] === opt.label;
              return (
                <button
                  key={opt.label}
                  onClick={() => handleSelect(currentQ.id, opt.label)}
                  style={{
                    padding: "14px 16px", borderRadius: 12,
                    textAlign: "left", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 12,
                    border: isSelected
                      ? "2px solid rgba(34,197,94,0.6)"
                      : "1.5px solid var(--border)",
                    background: isSelected
                      ? "rgba(22,163,74,0.1)"
                      : "var(--surface)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    display: "flex", alignItems: "center",
                    justifyContent: "center", flexShrink: 0,
                    fontSize: 13, fontWeight: 700,
                    background: isSelected
                      ? "rgba(34,197,94,0.2)"
                      : "rgba(255,255,255,0.06)",
                    border: isSelected
                      ? "1.5px solid rgba(34,197,94,0.5)"
                      : "1.5px solid var(--border)",
                    color: isSelected ? "var(--green-glow)" : "var(--text-3)",
                  }}>
                    {opt.label}
                  </div>
                  <span style={{
                    fontSize: 13.5, fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? "var(--text)" : "var(--text-2)",
                    lineHeight: 1.5,
                  }}>
                    {opt.text}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <button
              onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              style={{
                flex: 1, padding: "12px",
                borderRadius: 100,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-2)", fontSize: 13, fontWeight: 700,
                fontFamily: "'Sora',sans-serif",
                cursor: currentIdx === 0 ? "not-allowed" : "pointer",
                opacity: currentIdx === 0 ? 0.4 : 1,
              }}
            >
              ← Previous
            </button>
            {currentIdx < totalQ - 1 ? (
              <button
                onClick={() => setCurrentIdx(i => Math.min(totalQ - 1, i + 1))}
                style={{
                  flex: 1, padding: "12px",
                  borderRadius: 100,
                  background: "linear-gradient(135deg,#166534,#16a34a)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  color: "#fff", fontSize: 13, fontWeight: 700,
                  fontFamily: "'Sora',sans-serif", cursor: "pointer",
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={() => handleSubmit()}
                disabled={savingScore}
                style={{
                  flex: 1, padding: "12px",
                  borderRadius: 100,
                  background: "linear-gradient(135deg,#b45309,#f59e0b)",
                  border: "none", color: "#1a0a00",
                  fontSize: 13, fontWeight: 700,
                  fontFamily: "'Sora',sans-serif", cursor: "pointer",
                  opacity: savingScore ? 0.5 : 1,
                }}
              >
                {savingScore ? "Submitting…" : "Submit Exam ✓"}
              </button>
            )}
          </div>

          {/* Question dots navigator */}
          <div style={{
            display: "flex", flexWrap: "wrap",
            gap: 6, justifyContent: "center",
          }}>
            {questions.map((q, i) => (
              <div
                key={i}
                onClick={() => setCurrentIdx(i)}
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  display: "flex", alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10, fontWeight: 700,
                  cursor: "pointer",
                  background: i === currentIdx
                    ? "rgba(34,197,94,0.2)"
                    : answers[q.id]
                    ? "rgba(34,197,94,0.08)"
                    : "var(--surface)",
                  border: i === currentIdx
                    ? "2px solid var(--green-glow)"
                    : answers[q.id]
                    ? "1.5px solid rgba(34,197,94,0.3)"
                    : "1.5px solid var(--border)",
                  color: i === currentIdx
                    ? "var(--green-glow)"
                    : answers[q.id]
                    ? "var(--green-glow)"
                    : "var(--text-3)",
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Submit all button (visible from any question) */}
          {answeredCount > 0 && currentIdx < totalQ - 1 && (
            <button
              onClick={() => handleSubmit()}
              disabled={savingScore}
              style={{
                width: "100%", padding: "11px", marginTop: 16,
                borderRadius: 100,
                background: "transparent",
                border: "1.5px solid rgba(245,158,11,0.4)",
                color: "#f59e0b", fontSize: 12.5, fontWeight: 700,
                fontFamily: "'Sora',sans-serif", cursor: "pointer",
              }}
            >
              Submit Now ({answeredCount}/{totalQ} answered)
            </button>
          )}
        </div>
      )}
    </div>
  );
};
const inputStyle: React.CSSProperties = {
  width:"100%", padding:"9px 14px",
  background:"#0e1e12",
  border:"1.5px solid rgba(255,255,255,0.1)",
  borderRadius:10, color:"#f0f4f1",
  fontSize:13, fontFamily:"'Sora',sans-serif",
  outline:"none",
  colorScheme:"dark",
};
const ProfilePage = ({
  myProfile, editMode, setEditMode,
  editName, setEditName, editBio, setEditBio,
  editFaculty, setEditFaculty, editDept, setEditDept,
  editLevel, setEditLevel, editLga, setEditLga,
  editStateNg, setEditStateNg,
  editPhone, setEditPhone,
  currentUserEmail,
  avatarPreview, profileSaving, handleSaveProfile,
  handleAvatarChange, avatarRef, profilePosts,
  coverPreview, handleCoverChange, coverRef, 
  setShowEditRequest,
  onImageClick,
  onShowFollowers,
  currentUser, optionsPost, deleteLoading,
  toggleLike, handleVote, toggleBookmark,
  openComments, openOptions, handleSharePost,
  handleDeletePost, handleReportPost, closeOptions,
}: any) => {
  const myAvatarUrl = myProfile?.avatarUrl;
  const myInitials  = myProfile ? initials(myProfile.name) : "?";
  const profile     = myProfile;

  return (
    <div style={{maxWidth:640, width:"100%", margin:"0 auto", padding:"0 0 40px"}}>
      {/* Cover */}
      <div style={{
        height:140,
        borderRadius:"0 0 20px 20px",
        background:(coverPreview || (myProfile as any)?.coverUrl)
          ? "transparent"
          : "linear-gradient(135deg,rgba(20,83,45,0.6),rgba(180,83,9,0.4))",
        border:"1px solid var(--border)", borderTop:"none",
        position:"relative", marginBottom:64,
        display:"flex", alignItems:"flex-end", padding:"0 20px 16px",
        }}>
       {/* Cover image */}
        {(coverPreview || (myProfile as any)?.coverUrl) && (
          <div style={{
            position:"absolute", inset:0,
            overflow:"hidden",
            borderRadius:"0 0 20px 20px",
          }}>
            <img
              src={coverPreview || (myProfile as any)?.coverUrl}
              alt="cover"
              style={{
                width:"100%", height:"100%",
                objectFit:"cover", display:"block",
              }}
            />
          </div>
        )}
        {/* Gradient overlay */}
        <div style={{
          position:"absolute", inset:0,
          background:"linear-gradient(to top,rgba(6,13,8,0.6),transparent)",
          zIndex:1,
          pointerEvents:"none",
        }}/>
        {/* Cover edit button */}
        {editMode && (
          <div style={{position:"absolute", top:12, right:12, zIndex:2}}>
            <input
              ref={coverRef}
              type="file"
              accept="image/*"
              style={{display:"none"}}
              onChange={handleCoverChange}
            />
            <button
              onClick={() => coverRef.current?.click()}
              style={{
                padding:"6px 12px", borderRadius:100,
                background:"rgba(0,0,0,0.55)",
                border:"1px solid rgba(255,255,255,0.2)",
                color:"#fff", fontSize:11.5, fontWeight:600,
                fontFamily:"'Sora',sans-serif", cursor:"pointer",
                backdropFilter:"blur(8px)",
                display:"flex", alignItems:"center", gap:6,
              }}
            >
              📷 Edit Cover
            </button>
          </div>
        )}
        {/* Avatar */}
        <div style={{
          position:"absolute", bottom:-48, left:24,
          width:88, height:88, borderRadius:20,
          border:"3px solid var(--dark)",
          background: myAvatarUrl ? "transparent" : avatarGrad(currentUser.uid),
          overflow:"hidden", cursor: editMode ? "pointer" : "default",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:28, fontWeight:700, color:"#fff",
          boxShadow:"0 4px 20px rgba(0,0,0,0.4)",
          zIndex:2,
        }} onClick={()=>editMode && avatarRef.current?.click()}>
          {(avatarPreview||myAvatarUrl)
            ? <img src={avatarPreview||myAvatarUrl} alt="avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            : myInitials}
          {editMode && (
            <div style={{
              position:"absolute", inset:0,
              background:"rgba(0,0,0,0.55)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:20,
            }}>📷</div>
          )}
        </div>
        <input ref={avatarRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleAvatarChange}/>
        {/* Save/Edit buttons */}
        <div
  style={{
    position: "absolute",
    bottom: 16,
    right: 16,
    zIndex: 3,

    display: "flex",
    gap: 8,
    alignItems: "center",
    maxWidth: "calc(100% - 140px)",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  }}
>
          {editMode ? (
            <>
              <button onClick={()=>setEditMode(false)} style={{
                padding:"7px 16px", borderRadius:100, border:"1px solid var(--border)",
                background:"transparent", color:"var(--text-2)", fontSize:12, fontWeight:600,
                fontFamily:"'Sora',sans-serif", cursor:"pointer",
              }}>Cancel</button>
              <button onClick={handleSaveProfile} disabled={profileSaving} style={{
                padding:"7px 18px", borderRadius:100, border:"none",
                background:"linear-gradient(135deg,#b45309,#f59e0b)",
                color:"#1a0a00", fontSize:12, fontWeight:700,
                fontFamily:"'Sora',sans-serif", cursor:"pointer",
                opacity:profileSaving?0.6:1,
              }}>{profileSaving?"Saving…":"Save Profile"}</button>
            </>
          ):(
            <button onClick={()=>setEditMode(true)} style={{
              padding:"7px 14px", borderRadius:100,
              border:"1.5px solid rgba(22,163,74,0.4)",
              background:"rgba(22,163,74,0.1)", color:"var(--green-glow)",
              fontSize:11, fontWeight:700, fontFamily:"'Sora',sans-serif", cursor:"pointer",
            }}>✏️ Edit</button>
          )}
        </div>
      </div>

      <div style={{padding:"0 20px"}}>
        {editMode ? (
          <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:28}}>
            {myProfile?.profileLocked ? (
  
  <div style={{
    padding:"14px 16px",
    borderRadius:12,
    background:"rgba(244,63,94,0.07)",
    border:"1px solid rgba(244,63,94,0.2)",
  }}>
    <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
      <span style={{fontSize:18,flexShrink:0}}>🔒</span>
      <div>
        <div style={{fontSize:12.5,fontWeight:700,color:"#f43f5e",marginBottom:3}}>
          Profile Locked
        </div>
        <div style={{fontSize:11.5,color:"rgba(244,63,94,0.8)",lineHeight:1.6}}>
          Your name, LGA, faculty and department were locked after your first save. Only an admin can change these with a valid reason from you.
        </div>
      </div>
    </div>
    <button
      onClick={() => setShowEditRequest(true)}
      style={{
        width:"100%", padding:"8px 14px", borderRadius:8,
        background:"rgba(244,63,94,0.1)",
        border:"1px solid rgba(244,63,94,0.3)",
        color:"#f43f5e", fontSize:12, fontWeight:700,
        fontFamily:"'Sora',sans-serif", cursor:"pointer",
      }}
    >
      📝 Request Edit from Admin
    </button>
  </div>
) : (
  <div style={{
    padding:"12px 16px",
    borderRadius:12,
    background:"rgba(245,158,11,0.07)",
    border:"1px solid rgba(245,158,11,0.2)",
    display:"flex",
    gap:10,
    alignItems:"flex-start",
  }}>
    <span style={{fontSize:18,flexShrink:0}}>⚠️</span>
    <div>
      <div style={{fontSize:12.5,fontWeight:700,color:"#f59e0b",marginBottom:3}}>
        One-Time Profile Setup
      </div>
      <div style={{fontSize:11.5,color:"rgba(245,158,11,0.8)",lineHeight:1.6}}>
        Please fill in your details carefully. Your name, LGA, faculty and department will be <strong style={{color:"#f59e0b"}}>permanently locked</strong> after you save and cannot be changed later.
      </div>
    </div>
  </div>
)}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:6}}>Full Name *</label>
                <input value={editName} onChange={e=>!myProfile?.profileLocked && setEditName(e.target.value)} style={{...inputStyle, opacity: myProfile?.profileLocked ? 0.5 : 1, cursor: myProfile?.profileLocked ? "not-allowed" : "text"}} placeholder="Your name" readOnly={!!myProfile?.profileLocked}/>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:6}}>State</label>
                <select
                  value={editStateNg}
                  onChange={e => { if (!myProfile?.profileLocked) { setEditStateNg(e.target.value); setEditLga(""); } }}
                  disabled={!!myProfile?.profileLocked}
                  style={{...inputStyle, opacity: myProfile?.profileLocked ? 0.5 : 1, cursor: myProfile?.profileLocked ? "not-allowed" : "pointer"}}
                >
                  <option value="">Select State</option>
                  {NIGERIA_STATES.map(s => <option key={s} value={s} style={{background:"#0e1e12",color:"#f0f4f1"}}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:6}}>LGA</label>
                <select
                  value={editLga}
                  onChange={e => !myProfile?.profileLocked && setEditLga(e.target.value)}
                  disabled={!!myProfile?.profileLocked || !editStateNg}
                  style={{...inputStyle, opacity: (myProfile?.profileLocked || !editStateNg) ? 0.5 : 1, cursor: (myProfile?.profileLocked || !editStateNg) ? "not-allowed" : "pointer"}}
                >
                  <option value="">{editStateNg ? "Select LGA" : "Select a state first"}</option>
                  {(NIGERIA_STATE_LGAS[editStateNg] || []).map(l => <option key={l} value={l} style={{background:"#0e1e12",color:"#f0f4f1"}}>{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:6}}>Bio</label>
              <textarea value={editBio} onChange={e=>setEditBio(e.target.value)} rows={3}
                style={{...inputStyle,resize:"vertical",minHeight:72,lineHeight:1.6}} placeholder="Tell the campus about yourself…"/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:6}}>Email Address</label>
                <input
                  value={currentUserEmail}
                  readOnly
                  style={{...inputStyle, opacity:0.5, cursor:"not-allowed"}}
                  placeholder="your@email.com"
                />
                <div style={{fontSize:10,color:"var(--text-3)",marginTop:4}}>🔒 Linked to your account</div>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:6}}>Phone Number</label>
                <div style={{display:"flex",alignItems:"center",gap:0}}>
                  <div style={{
                    padding:"9px 10px",
                    background:"rgba(255,255,255,0.04)",
                    border:"1.5px solid rgba(255,255,255,0.1)",
                    borderRight:"none",
                    borderRadius:"10px 0 0 10px",
                    fontSize:12.5,fontWeight:700,
                    color:"var(--text-2)",
                    whiteSpace:"nowrap",flexShrink:0,
                  }}>🇳🇬 +234</div>
                  <input
                    value={editPhone}
                    onChange={e => {
                      // Only allow digits, max 10 digits after +234
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setEditPhone(digits);
                    }}
                    style={{
                      ...inputStyle,
                      borderRadius:"0 10px 10px 0",
                      borderLeft:"1px solid rgba(255,255,255,0.06)",
                    }}
                    placeholder="8012345678"
                    type="tel"
                    inputMode="numeric"
                  />
                </div>
                <div style={{fontSize:10,color:"var(--text-3)",marginTop:4}}>
                  Enter 10-digit number after +234
                </div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 80px",gap:12}}>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:6}}>Faculty</label>
                <select value={editFaculty} onChange={e=>{if(!myProfile?.profileLocked){setEditFaculty(e.target.value);setEditDept("");}}} style={{...inputStyle, opacity: myProfile?.profileLocked ? 0.5 : 1, cursor: myProfile?.profileLocked ? "not-allowed" : "pointer"}} disabled={!!myProfile?.profileLocked}>
  <option value="">Select faculty</option>
  {FACULTIES.map(f=><option key={f}>{f}</option>)}
</select>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:6}}>Department</label>
                <select value={editDept} onChange={e=>!myProfile?.profileLocked && setEditDept(e.target.value)} style={{...inputStyle, opacity: myProfile?.profileLocked ? 0.5 : 1, cursor: myProfile?.profileLocked ? "not-allowed" : "pointer"}} disabled={!!myProfile?.profileLocked || !editFaculty}>
  <option value="">Select dept</option>
  {(DEPARTMENTS[editFaculty]||[]).map(d=><option key={d}>{d}</option>)}
</select>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"var(--text-3)",textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:6}}>Level</label>
                <select value={editLevel} onChange={e=>setEditLevel(e.target.value)} style={inputStyle}>
                  <option value="">Lvl</option>
                  {LEVELS.map(l=><option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>
        ):(
          <div style={{marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4,flexWrap:"wrap"}}>
              <span style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:700,color:"var(--text)"}}>{profile?.name}</span>
              {profile?.faculty && (
                <span style={{
                  padding:"3px 10px",borderRadius:100,
                  background:"rgba(22,163,74,0.12)",border:"1px solid rgba(22,163,74,0.25)",
                  fontSize:10,fontWeight:700,color:"var(--green-glow)",
                  textTransform:"uppercase",letterSpacing:"0.08em",
                }}>{profile.faculty}</span>
              )}
            </div>
            {profile?.department && (
              <div style={{fontSize:12,color:"var(--text-3)",marginBottom:8}}>
                {profile.department} · {profile.level}L {profile.lga ? `· ${profile.lga}` : ""}
              </div>
            )}
            <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:8}}>
              {currentUser.email && (
                <div style={{
                  display:"flex",alignItems:"center",gap:6,
                  padding:"4px 10px",borderRadius:100,
                  background:"rgba(255,255,255,0.04)",
                  border:"1px solid var(--border)",
                  fontSize:11.5,color:"var(--text-3)",
                }}>
                  ✉️ {currentUser.email}
                </div>
              )}
              {(myProfile as any)?.phone && (
                <div style={{
                  display:"flex",alignItems:"center",gap:6,
                  padding:"4px 10px",borderRadius:100,
                  background:"rgba(255,255,255,0.04)",
                  border:"1px solid var(--border)",
                  fontSize:11.5,color:"var(--text-3)",
                }}>
                  📞 {(myProfile as any).phone}
                </div>
              )}
            </div>
            {profile?.bio && (
              <div style={{fontSize:13.5,color:"rgba(240,244,241,0.75)",lineHeight:1.75,marginBottom:16,maxWidth:520}}>{profile.bio}</div>
            )}
            {!profile?.faculty && (
              <div style={{
                padding:"12px 16px",borderRadius:12,marginBottom:16,
                background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",
                fontSize:12.5,color:"var(--gold-light)",lineHeight:1.6,
              }}>
                👋 Welcome! Complete your profile so classmates can find you.
                <button onClick={()=>setEditMode(true)} style={{
                  marginLeft:10,padding:"4px 12px",borderRadius:100,
                  border:"1px solid rgba(245,158,11,0.4)",background:"transparent",
                  color:"var(--gold-light)",fontSize:11,fontWeight:700,
                  fontFamily:"'Sora',sans-serif",cursor:"pointer",
                }}>Complete now →</button>
              </div>
            )}
          </div>
        )}

       <div style={{
          display:"grid",gridTemplateColumns:"repeat(3,1fr)",
          background:"rgba(255,255,255,0.025)",border:"1px solid var(--border)",
          borderRadius:16,overflow:"hidden",marginBottom:24,
        }}>
          {[
            {num:profilePosts.length,label:"Posts",onClick:undefined},
            {num:profile?.followers?.length||0,label:"Followers",onClick:()=>onShowFollowers(currentUser.uid,"followers")},
            {num:profile?.following?.length||0,label:"Following",onClick:()=>onShowFollowers(currentUser.uid,"following")},
          ].map((s,i)=>(
            <div key={i} onClick={s.onClick} style={{
              textAlign:"center",padding:"16px 8px",
              borderLeft:i>0?"1px solid var(--border)":"none",
              cursor:s.onClick?"pointer":"default",
            }}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:700,color:"var(--text)"}}>{s.num}</div>
              <div style={{fontSize:10,color:s.onClick?"var(--green-glow)":"var(--text-3)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em",marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>

        {!editMode && (
          <>
            <BadgesSection myProfile={myProfile} />
            <div style={{
              fontFamily:"'Fraunces',serif",fontSize:15,fontWeight:700,
              color:"var(--text)",marginBottom:14,
              display:"flex",alignItems:"center",gap:8,
            }}>
              My Posts
              <span style={{fontSize:11,fontWeight:600,color:"var(--text-3)",fontFamily:"'Sora',sans-serif"}}>
                {profilePosts.length} total
              </span>
            </div>
            {profilePosts.length === 0 ? (
              <div style={{textAlign:"center",padding:"32px 16px",color:"var(--text-3)"}}>
                <div style={{fontSize:28,marginBottom:10}}>✍️</div>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text-2)"}}>No posts yet</div>
                <div style={{fontSize:11.5,marginTop:4}}>Share something with the campus!</div>
              </div>
            ):(
              profilePosts.map((p: Post, idx: number) => (
                <PostCard
                  key={p.id}
                  post={p}
                  idx={idx}
                  currentUserId={currentUser.uid}
                  onLike={toggleLike}
                  onVote={handleVote}
                  onBookmark={toggleBookmark}
                  onComment={openComments}
                  onOpenOptions={openOptions}
                  optionsPost={optionsPost}
                  onShare={handleSharePost}
                  onDeletePost={handleDeletePost}
                  onReportPost={handleReportPost}
                  deleteLoading={deleteLoading}
                  toggleBookmark={toggleBookmark}
                  closeOptions={closeOptions}
                  onImageClick={onImageClick}
                  onViewProfile={undefined}
                
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
};
// ── Conference Hall ───────────────────────────────────────
type HallMessage = {
  id: string;
  uid: string;
  name: string;
  avatarUrl?: string;
  faculty: string;
  level: string;
  content: string;
  createdAt: any;
  replyTo?: {
    id: string;
    name: string;
    content: string;
  };
  reactions?: Record<string, string[]>; // emoji -> [uid, uid, ...]
  deleted?: boolean;
};

const ConferenceHall = ({
  currentUser,
  myProfile,
}: {
  currentUser: any;
  myProfile: UserProfile | null;
}) => {
  const [messages,     setMessages]     = useState<HallMessage[]>([]);
  const [msgText,      setMsgText]      = useState("");
  const [sending,      setSending]      = useState(false);
  const [loading,      setLoading]      = useState(true);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const [onlineCount,  setOnlineCount]  = useState(0);
  const [replyTo,      setReplyTo]      = useState<{id:string;name:string;content:string}|null>(null);
  const [showEmojiFor, setShowEmojiFor] = useState<string|null>(null);

  // Live messages
  useEffect(() => {
    const q = query(
      collection(db, "conferenceHall"),
      orderBy("createdAt", "asc"),
      limit(100)
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as HallMessage)));
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsub();
  }, []);

  // Track online presence with heartbeat
  useEffect(() => {
    if (!currentUser?.uid) return;
    const presenceRef = doc(db, "conferencePresence", currentUser.uid);

    const beat = () => setDoc(presenceRef, {
      uid: currentUser.uid,
      name: myProfile?.name || "",
      lastSeen: serverTimestamp(),
    }, { merge: true });

    beat(); // initial heartbeat
    const heartbeatInterval = setInterval(beat, 20000); // every 20s

    // Count users seen in the last 60 seconds (ignore stale docs)
    const unsub = onSnapshot(collection(db, "conferencePresence"), snap => {
      const cutoff = Date.now() - 60000;
      const activeCount = snap.docs.filter(d => {
        const ts = d.data().lastSeen?.toMillis?.();
        return ts && ts >= cutoff;
      }).length;
      setOnlineCount(activeCount);
    });

    return () => {
      clearInterval(heartbeatInterval);
      unsub();
    };
  }, [currentUser?.uid]);

  // Auto scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!msgText.trim() || !myProfile) return;
    setSending(true);
    try {
      await addDoc(collection(db, "conferenceHall"), {
        uid:       currentUser.uid,
        name:      myProfile.name,
        avatarUrl: myProfile.avatarUrl || "",
        faculty:   myProfile.faculty,
        level:     myProfile.level,
        content:   msgText.trim(),
        createdAt: serverTimestamp(),
        ...(replyTo ? { replyTo } : {}),
        reactions: {},
      });
      setMsgText("");
      setReplyTo(null);
      inputRef.current?.focus();
    } finally {
      setSending(false);
    }
  };

  const isMe = (uid: string) => uid === currentUser.uid;
  const isAdmin = currentUser.uid === ADMIN_UID;

  const EMOJIS = ["❤️","😂","😮","😢","👍","🔥","🎉","💯"];

  const handleReact = async (msgId: string, emoji: string) => {
    const msgRef = doc(db, "conferenceHall", msgId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) return;
    const reactions = msgSnap.data().reactions || {};
    const uids: string[] = reactions[emoji] || [];
    const alreadyReacted = uids.includes(currentUser.uid);
    await updateDoc(msgRef, {
      [`reactions.${emoji}`]: alreadyReacted
        ? arrayRemove(currentUser.uid)
        : arrayUnion(currentUser.uid),
    });
    setShowEmojiFor(null);
  };

  // Group consecutive messages from same user
  const grouped = messages.map((msg, i) => ({
    ...msg,
    isFirst: i === 0 || messages[i-1].uid !== msg.uid,
    isLast:  i === messages.length-1 || messages[i+1].uid !== msg.uid,
  }));

  return (
    <div style={{
      maxWidth:640, margin:"0 auto",
      display:"flex", flexDirection:"column",
      height:"calc(100vh - var(--topbar-h) - var(--bottom-nav-h))",
    }}>
      {/* Header */}
      <div style={{
        padding:"16px 20px",
        borderBottom:"1px solid var(--border)",
        background:"var(--dark-2)",
        flexShrink:0,
      }}>
        <div style={{display:"flex", alignItems:"center", gap:12}}>
          <div style={{
            width:44, height:44, borderRadius:14,
            background:"linear-gradient(135deg,#166534,#16a34a)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:22, flexShrink:0,
            boxShadow:"0 4px 14px rgba(22,163,74,0.3)",
          }}>🏛️</div>
          <div style={{flex:1}}>
            <div style={{
              fontFamily:"'Fraunces',serif",
              fontSize:17, fontWeight:700, color:"var(--text)",
              marginBottom:2,
            }}>Conference Hall</div>
            <div style={{display:"flex", alignItems:"center", gap:6}}>
              <div style={{
                width:6, height:6, borderRadius:"50%",
                background:"#22c55e",
                boxShadow:"0 0 6px rgba(34,197,94,0.7)",
              }}/>
              <span style={{fontSize:11.5, color:"var(--text-3)", fontWeight:500}}>
                {onlineCount} student{onlineCount !== 1 ? "s" : ""} online · All departments
              </span>
            </div>
          </div>
          <div style={{display:"flex", alignItems:"center", gap:8}}>
            <div style={{
              padding:"4px 12px", borderRadius:100,
              background:"rgba(22,163,74,0.1)",
              border:"1px solid rgba(22,163,74,0.25)",
              fontSize:10.5, fontWeight:700,
              color:"var(--green-glow)",
              textTransform:"uppercase" as const,
              letterSpacing:"0.08em",
            }}>Live</div>
            {isAdmin && (
              <button
                onClick={async () => {
                  if (!confirm("Delete ALL messages in the Conference Hall? This cannot be undone.")) return;
                  try {
                    const snap = await getDocs(collection(db, "conferenceHall"));
                    await Promise.allSettled(snap.docs.map(async d => {
                      const data = d.data();
                      await setDoc(doc(db, "deletedMessages", d.id), {
                        uid:           data.uid || "",
                        name:          data.name || "",
                        avatarUrl:     data.avatarUrl || "",
                        faculty:       data.faculty || "",
                        level:         data.level || "",
                        content:       data.content || "",
                        createdAt:     data.createdAt || null,
                        deletedAt:     serverTimestamp(),
                        deletedBy:     currentUser.uid,
                        deletedByName: "Admin (Clear All)",
                        source:        "conferenceHall",
                      });
                      await deleteDoc(doc(db, "conferenceHall", d.id));
                    }));
                  } catch {
                    // silently ignore
                  }
                }}
                style={{
                  padding:"4px 12px", borderRadius:100,
                  background:"rgba(244,63,94,0.1)",
                  border:"1px solid rgba(244,63,94,0.25)",
                  fontSize:10.5, fontWeight:700,
                  color:"#f43f5e", cursor:"pointer",
                  fontFamily:"'Sora',sans-serif",
                  letterSpacing:"0.06em",
                }}
              >
                🗑️ Clear All
              </button>
            )}
          </div>
        </div>

        {/* Info bar */}
        <div style={{
          marginTop:12, padding:"8px 12px",
          borderRadius:10,
          background:"rgba(96,165,250,0.06)",
          border:"1px solid rgba(96,165,250,0.15)",
          fontSize:11.5, color:"rgba(96,165,250,0.8)",
          lineHeight:1.6,
        }}>
          🎓 Welcome to the TASU Conference Hall — a space for all students to discuss general campus matters respectfully.
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex:1, overflowY:"auto",
        padding:"16px 20px",
        display:"flex", flexDirection:"column",
        gap:2,
      }}>
        {loading ? (
          [1,2,3,4].map(i => (
            <div key={i} style={{
              display:"flex", gap:10, marginBottom:12,
              justifyContent: i%2===0 ? "flex-end" : "flex-start",
            }}>
              {i%2!==0 && <div className="skeleton" style={{width:34,height:34,borderRadius:10,flexShrink:0}}/>}
              <div style={{display:"flex",flexDirection:"column",gap:4,maxWidth:"65%"}}>
                <div className="skeleton" style={{height:10,width:80}}/>
                <div className="skeleton" style={{height:40,borderRadius:12}}/>
              </div>
            </div>
          ))
        ) : messages.length === 0 ? (
          <div style={{
            flex:1, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            textAlign:"center", padding:"40px 20px",
            color:"var(--text-3)",
          }}>
            <div style={{fontSize:48, marginBottom:16}}>🏛️</div>
            <div style={{
              fontFamily:"'Fraunces',serif",
              fontSize:18, fontWeight:700,
              color:"var(--text-2)", marginBottom:8,
            }}>
              The hall is quiet
            </div>
            <div style={{fontSize:12.5, lineHeight:1.7}}>
              Be the first to start a discussion!<br/>
              All TASU students can join in.
            </div>
          </div>
        ) : (
          grouped.map((msg) => {
            const mine = isMe(msg.uid);
            return (
              <div key={msg.id} style={{
                display:"flex",
                flexDirection: mine ? "row-reverse" : "row",
                alignItems:"flex-end",
                gap:8,
                marginBottom: msg.isLast ? 10 : 2,
              }}>
                {/* Avatar — only show on last message in group */}
                {!mine && (
                  <div style={{width:32, flexShrink:0}}>
                    {msg.isLast && (
                      <div style={{
                        width:32, height:32, borderRadius:9,
                        background: msg.uid === ADMIN_UID
                          ? "linear-gradient(135deg,#166534,#16a34a)"
                          : msg.avatarUrl ? "transparent" : avatarGrad(msg.uid),
                        overflow:"hidden",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:11, fontWeight:700, color:"#fff",
                        flexShrink:0,
                      }}>
                        {msg.uid === ADMIN_UID
                        ? <img src={lockIcon} alt="Campus Connect" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                        : msg.avatarUrl
                        ? <img src={msg.avatarUrl} alt={msg.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                        : initials(msg.name)}
                      </div>
                    )}
                  </div>
                )}

                <div style={{
                  display:"flex", flexDirection:"column",
                  alignItems: mine ? "flex-end" : "flex-start",
                  maxWidth:"72%",
                }}>
                  {/* Name + faculty — only on first message in group */}
                  {!mine && msg.isFirst && (
                    <div style={{
                      fontSize:10.5, fontWeight:700,
                      color: msg.uid === ADMIN_UID ? "var(--green-glow)" : "var(--text-2)",
                      marginBottom:3,
                      marginLeft:2,
                      display:"flex", alignItems:"center", gap:6,
                    }}>
                      {msg.uid === ADMIN_UID ? "Campus Connect Official" : msg.name}
                      {msg.uid === ADMIN_UID ? (
                        <span style={{
                          fontSize:9, fontWeight:700,
                          color:"var(--green-glow)",
                          padding:"1px 6px", borderRadius:100,
                          background:"rgba(34,197,94,0.1)",
                          border:"1px solid rgba(34,197,94,0.25)",
                          textTransform:"uppercase" as const,
                          letterSpacing:"0.06em",
                        }}>Official</span>
                      ) : (
                        <span style={{
                          fontSize:10, fontWeight:500,
                          color:"var(--text-3)",
                        }}>
                          {msg.faculty} · {msg.level}L
                        </span>
                      )}
                    </div>
                  )}

                 {/* Bubble */}
                  <div style={{position:"relative", display:"inline-block", maxWidth:"100%"}}>
                    <div style={{
                      padding:"9px 13px",
                      borderRadius: mine
                        ? (msg.isFirst ? "16px 4px 16px 16px" : "16px 4px 4px 16px")
                        : (msg.isFirst ? "4px 16px 16px 16px" : "4px 16px 16px 4px"),
                      background: mine
                        ? "linear-gradient(135deg,#166534,#16a34a)"
                        : "rgba(255,255,255,0.06)",
                      border: mine
                        ? "1px solid rgba(34,197,94,0.3)"
                        : "1px solid rgba(255,255,255,0.08)",
                      fontSize:13.5,
                      color: mine ? "#fff" : "var(--text)",
                      lineHeight:1.55,
                      wordBreak:"break-word" as const,
                      boxShadow: mine ? "0 4px 14px rgba(22,163,74,0.2)" : "none",
                      paddingRight: (isAdmin || mine) ? "36px" : "13px",
                    }}>
                      {/* Reply preview */}
                      {msg.replyTo && (
                        <div style={{
                          padding:"6px 10px", marginBottom:6,
                          borderRadius:8,
                          background: mine ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.08)",
                          borderLeft:"3px solid",
                          borderLeftColor: mine ? "rgba(255,255,255,0.5)" : "var(--green-glow)",
                          fontSize:11.5,
                        }}>
                          <div style={{
                            fontWeight:700, marginBottom:2,
                            color: mine ? "rgba(255,255,255,0.8)" : "var(--green-glow)",
                          }}>
                            ↩ {msg.replyTo.name}
                          </div>
                          <div style={{
                            color: mine ? "rgba(255,255,255,0.6)" : "var(--text-3)",
                            whiteSpace:"nowrap", overflow:"hidden",
                            textOverflow:"ellipsis", maxWidth:200,
                          }}>
                            {msg.replyTo.content}
                          </div>
                        </div>
                      )}
                      {msg.content}
                    </div>

                    {/* Delete button — admin sees all, users see own only */}
                    {(isAdmin || mine) && (
                      <button
                        onClick={async () => {
                          if (!confirm(
                            isAdmin && !mine
                              ? `Delete this message from ${msg.name}?`
                              : "Delete your message?"
                          )) return;
                          try {
                            await setDoc(doc(db, "deletedMessages", msg.id), {
                              uid:           msg.uid,
                              name:          msg.name,
                              avatarUrl:     msg.avatarUrl || "",
                              faculty:       msg.faculty,
                              level:         msg.level,
                              content:       msg.content,
                              createdAt:     msg.createdAt,
                              deletedAt:     serverTimestamp(),
                              deletedBy:     currentUser.uid,
                              deletedByName: isAdmin && !mine ? "Admin" : msg.name,
                              source:        "conferenceHall",
                            });
                            await deleteDoc(doc(db, "conferenceHall", msg.id));
                          } catch (err) {
                            console.error("Delete error:", err);
                            alert("Failed to delete message.");
                          }
                        }}
                        title="Delete message"
                        style={{
                          position:"absolute",
                          top:"50%", right:8,
                          transform:"translateY(-50%)",
                          width:20, height:20,
                          borderRadius:"50%",
                          background:"rgba(244,63,94,0.15)",
                          border:"1px solid rgba(244,63,94,0.3)",
                          color:"#f43f5e",
                          fontSize:10, cursor:"pointer",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          padding:0, lineHeight:1,
                          opacity:0.7,
                          transition:"opacity 0.2s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                        onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}
                      >
                        ✕
                      </button>
                    )}

                    {/* Action buttons — reply + emoji */}
                    <div style={{
                      position:"absolute",
                      top:"50%", transform:"translateY(-50%)",
                      [mine ? "left" : "right"]: "calc(100% + 6px)",
                      display:"flex", gap:4,
                      opacity:0.7,
                    }}>
                      {/* Reply button */}
                      <button
                        onClick={() => setReplyTo({
                          id: msg.id,
                          name: msg.uid === ADMIN_UID ? "Campus Connect Official" : msg.name,
                          content: msg.content,
                        })}
                        title="Reply"
                        style={{
                          width:24, height:24, borderRadius:"50%",
                          background:"rgba(255,255,255,0.08)",
                          border:"1px solid rgba(255,255,255,0.12)",
                          color:"var(--text-3)", fontSize:11,
                          cursor:"pointer", display:"flex",
                          alignItems:"center", justifyContent:"center",
                        }}
                      >↩</button>
                      {/* Emoji button */}
                      <button
                        onClick={() => setShowEmojiFor(showEmojiFor === msg.id ? null : msg.id)}
                        title="React"
                        style={{
                          width:24, height:24, borderRadius:"50%",
                          background:"rgba(255,255,255,0.08)",
                          border:"1px solid rgba(255,255,255,0.12)",
                          color:"var(--text-3)", fontSize:11,
                          cursor:"pointer", display:"flex",
                          alignItems:"center", justifyContent:"center",
                        }}
                      >😊</button>
                    </div>

                    {/* Emoji picker */}
                    {showEmojiFor === msg.id && (
                      <div style={{
                        position:"absolute",
                        bottom:"calc(100% + 6px)",
                        [mine ? "right" : "left"]: 0,
                        background:"rgba(14,30,18,0.97)",
                        border:"1px solid rgba(255,255,255,0.12)",
                        borderRadius:12, padding:"8px 10px",
                        display:"flex", gap:6, flexWrap:"wrap",
                        zIndex:10, maxWidth:180,
                        boxShadow:"0 8px 24px rgba(0,0,0,0.4)",
                      }}>
                        {EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleReact(msg.id, emoji)}
                            style={{
                              background:"transparent", border:"none",
                              fontSize:18, cursor:"pointer",
                              padding:"2px 4px", borderRadius:6,
                              transition:"transform 0.15s",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.3)")}
                            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                          >{emoji}</button>
                        ))}
                      </div>
                    )}

                    {/* Reaction display */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div style={{
                        display:"flex", flexWrap:"wrap", gap:4, marginTop:4,
                      }}>
                        {Object.entries(msg.reactions)
                          .filter(([, uids]) => (uids as string[]).length > 0)
                          .map(([emoji, uids]) => (
                            <button
                              key={emoji}
                              onClick={() => handleReact(msg.id, emoji)}
                              style={{
                                padding:"2px 7px", borderRadius:100,
                                background: (uids as string[]).includes(currentUser.uid)
                                  ? "rgba(34,197,94,0.15)"
                                  : "rgba(255,255,255,0.06)",
                                border: (uids as string[]).includes(currentUser.uid)
                                  ? "1px solid rgba(34,197,94,0.3)"
                                  : "1px solid rgba(255,255,255,0.1)",
                                fontSize:11, cursor:"pointer",
                                display:"flex", alignItems:"center", gap:4,
                                color:"var(--text-2)",
                                fontFamily:"'Sora',sans-serif",
                              }}
                            >
                              {emoji} <span style={{fontSize:10}}>{(uids as string[]).length}</span>
                            </button>
                          ))}
                      </div>
                    )}

                    {/* Delete button */}
                    {(isAdmin || mine) && (
                    
                      <button
                        onClick={async () => {
                          if (!confirm(
                            isAdmin && !mine
                              ? `Delete this message from ${msg.name}?`
                              : "Delete your message?"
                          )) return;
                          try {
                            // Archive to deletedMessages before deleting
                            await setDoc(doc(db, "deletedMessages", msg.id), {
                              ...msg,
                              deletedAt: serverTimestamp(),
                              deletedBy: currentUser.uid,
                              deletedByName: isAdmin ? "Admin" : msg.name,
                              source: "conferenceHall",
                            });
                            await deleteDoc(doc(db, "conferenceHall", msg.id));
                          } catch {
                            alert("Failed to delete message.");
                          }
                        }}
                        title="Delete message"
                        style={{
                          position:"absolute",
                          top:"50%", right:8,
                          transform:"translateY(-50%)",
                          width:20, height:20,
                          borderRadius:"50%",
                          background:"rgba(244,63,94,0.15)",
                          border:"1px solid rgba(244,63,94,0.3)",
                          color:"#f43f5e",
                          fontSize:10, cursor:"pointer",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          padding:0, lineHeight:1,
                          opacity:0.7,
                          transition:"opacity 0.2s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                        onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Time — only on last message */}
                  {msg.isLast && (
                    <div style={{
                      fontSize:9.5, color:"var(--text-3)",
                      marginTop:3, marginLeft:2, marginRight:2,
                    }}>
                      {timeAgo(msg.createdAt)}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Composer */}
      {/* Reply preview bar */}
      {replyTo && (
        <div style={{
          padding:"8px 16px",
          borderTop:"1px solid var(--border)",
          background:"rgba(22,163,74,0.05)",
          display:"flex", alignItems:"center",
          justifyContent:"space-between", gap:10,
          flexShrink:0,
        }}>
          <div style={{
            borderLeft:"3px solid var(--green-glow)",
            paddingLeft:10, flex:1, minWidth:0,
          }}>
            <div style={{fontSize:11, fontWeight:700, color:"var(--green-glow)", marginBottom:2}}>
              ↩ Replying to {replyTo.name}
            </div>
            <div style={{
              fontSize:11.5, color:"var(--text-3)",
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
            }}>
              {replyTo.content}
            </div>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            style={{
              width:22, height:22, borderRadius:"50%",
              background:"rgba(255,255,255,0.08)",
              border:"1px solid rgba(255,255,255,0.12)",
              color:"var(--text-3)", fontSize:12,
              cursor:"pointer", flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}
          >✕</button>
        </div>
      )}

      <div style={{
        padding:"12px 16px",
        borderTop:"1px solid var(--border)",
        background:"var(--dark-2)",
        flexShrink:0,
        display:"flex", gap:10, alignItems:"center",
      }}>
        <Avatar
          uid={currentUser.uid}
          name={myProfile?.name || ""}
          url={myProfile?.avatarUrl}
          size={34}
          radius={10}
        />
        <input
          ref={inputRef}
          value={msgText}
          onChange={e => setMsgText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
          placeholder="Share your thoughts with the hall…"
          style={{
            flex:1, padding:"10px 14px",
            background:"rgba(255,255,255,0.05)",
            border:"1.5px solid var(--border)",
            borderRadius:100, color:"var(--text)",
            fontSize:13, fontFamily:"'Sora',sans-serif",
            outline:"none",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!msgText.trim() || sending}
          style={{
            width:40, height:40, borderRadius:100,
            background:"linear-gradient(135deg,#166534,#16a34a)",
            border:"1px solid rgba(34,197,94,0.3)",
            color:"#fff", fontSize:16, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            flexShrink:0,
            opacity:(!msgText.trim()||sending) ? 0.4 : 1,
            boxShadow:"0 4px 12px rgba(22,163,74,0.3)",
            transition:"all 0.2s",
          }}
        >
          {sending ? <div className="spinner" style={{borderColor:"rgba(255,255,255,0.3)",borderTopColor:"#fff"}}/> : "➤"}
        </button>
      </div>
    </div>
  );
};

// ── Coming Soon ───────────────────────────────────────────
const ComingSoon = ({
  icon, title, description,
}: {
  icon: string;
  title: string;
  description: string;
}) => (
  <div style={{
    maxWidth:640, margin:"0 auto",
    display:"flex", flexDirection:"column",
    alignItems:"center", justifyContent:"center",
    textAlign:"center",
    padding:"60px 24px",
    minHeight:"60vh",
  }}>
    {/* Glow orb */}
    <div style={{
      position:"relative", marginBottom:32,
    }}>
      <div style={{
        position:"absolute", inset:-20,
        borderRadius:"50%",
        background:"radial-gradient(circle,rgba(22,163,74,0.15),transparent 70%)",
        filter:"blur(10px)",
      }}/>
      <div style={{
        width:90, height:90, borderRadius:24,
        background:"linear-gradient(135deg,rgba(20,83,45,0.6),rgba(22,163,74,0.2))",
        border:"1px solid rgba(22,163,74,0.25)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:40, position:"relative",
        boxShadow:"0 8px 32px rgba(22,163,74,0.15)",
      }}>
        {icon}
      </div>
    </div>

    {/* Title */}
    <div style={{
      fontFamily:"'Fraunces',serif",
      fontSize:26, fontWeight:800,
      color:"var(--text)", marginBottom:8,
      letterSpacing:"-0.02em",
    }}>
      {title}
    </div>

    {/* Coming soon badge */}
    <div style={{
      display:"inline-flex", alignItems:"center", gap:6,
      padding:"4px 14px", borderRadius:100,
      background:"rgba(245,158,11,0.1)",
      border:"1px solid rgba(245,158,11,0.25)",
      fontSize:11, fontWeight:700,
      color:"#f59e0b", marginBottom:20,
      letterSpacing:"0.1em", textTransform:"uppercase" as const,
    }}>
      <div style={{
        width:6, height:6, borderRadius:"50%",
        background:"#f59e0b",
        boxShadow:"0 0 6px rgba(245,158,11,0.7)",
      }}/>
      Coming Soon
    </div>

    {/* Description */}
    <div style={{
      fontSize:13.5, color:"var(--text-3)",
      lineHeight:1.8, maxWidth:340, marginBottom:32,
    }}>
      {description}
    </div>

    {/* Info card */}
    <div style={{
      padding:"16px 20px", borderRadius:16,
      background:"rgba(255,255,255,0.02)",
      border:"1px solid var(--border)",
      maxWidth:340, width:"100%",
    }}>
      <div style={{
        fontSize:11, fontWeight:700,
        color:"var(--text-3)", textTransform:"uppercase" as const,
        letterSpacing:"0.1em", marginBottom:10,
      }}>
        What to expect
      </div>
      <div style={{
        display:"flex", flexDirection:"column", gap:8,
      }}>
        {[
          "🔔 You'll be notified when it goes live",
          "🔒 Access requires verified student account",
          
        ].map((item, i) => (
          <div key={i} style={{
            fontSize:12, color:"var(--text-2)",
            display:"flex", alignItems:"center", gap:8,
            textAlign:"left",
          }}>
            {item}
          </div>
        ))}
      </div>
    </div>

    {/* Bottom note */}
    <div style={{
      marginTop:28, fontSize:11.5,
      color:"var(--text-3)", lineHeight:1.7,
    }}>
      Campus Connect · TASU · Jalingo
    </div>
  </div>
);
// ─────────────────────────────────────────────────────────────
export default function AppShell({ currentUser }: { currentUser: import("firebase/auth").User }) {

  // ── State ────────────────────────────────────────────────
  const [activeNav,      setActiveNav]      = useState("feed");
  const [posts,          setPosts]          = useState<Post[]>([]);
  const [viewingProfile, setViewingProfile] = useState<string|null>(null);
  const [showFollowers,  setShowFollowers]  = useState<{uid:string; type:"followers"|"following"}|null>(null);
  const [myProfile,   setMyProfile]   = useState<UserProfile|null>(null);
  const [draftText,   setDraftText]   = useState("");
  const [draftTag,    setDraftTag]    = useState("");
  const [postLoading, setPostLoading] = useState(false);
  const [postsLoading,setPostsLoading]= useState(true);
  const [shellReady, setShellReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightOpen,   setRightOpen]   = useState(false);
  const [searchVal,   setSearchVal]   = useState("");
  const [searchOpen,  setSearchOpen]  = useState(false);

  // Profile editing
  const [editMode,    setEditMode]    = useState(false);
  const [editName,    setEditName]    = useState("");
  const [editBio,     setEditBio]     = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
const [notifOpen, setNotifOpen] = useState(false);
const notifRef = useRef<HTMLDivElement>(null);
  const [editFaculty, setEditFaculty] = useState("");
  const [editDept,    setEditDept]    = useState("");
  const [editLevel,   setEditLevel]   = useState("");
  const [editLga,       setEditLga]       = useState("");
  const [editStateNg,   setEditStateNg]   = useState("");
  const [editPhone,     setEditPhone]     = useState("");
  const [coverFile,     setCoverFile]     = useState<File|null>(null);
  const [coverPreview,  setCoverPreview]  = useState<string|null>(null);
  const [avatarFile,  setAvatarFile]  = useState<File|null>(null);
  const [avatarPreview,setAvatarPreview]=useState<string|null>(null);
  const [profileSaving,setProfileSaving]=useState(false);
  const [profilePosts, setProfilePosts]=useState<Post[]>([]);
  // Comment sheet state
const [commentPost,    setCommentPost]    = useState<Post | null>(null);
const [comments,       setComments]       = useState<Comment[]>([]);
const [commentText,    setCommentText]    = useState("");
const [commentLoading, setCommentLoading] = useState(false);
const [commentsLoading,setCommentsLoading]= useState(false);
const commentInputRef = useRef<HTMLInputElement>(null);
// Post options menu
  const [optionsPost,   setOptionsPost]   = useState<Post | null>(null);
  const [optionsPos,    setOptionsPos]    = useState({ x: 0, y: 0 });
  const [deleteLoading, setDeleteLoading] = useState(false);
  // Image & Poll composer state
const [composerImages,    setComposerImages]    = useState<File[]>([]);
const [composerImagePrevs,setComposerImagePrevs]= useState<string[]>([]);
const [showPoll,         setShowPoll]         = useState(false);
const [pollQuestion,     setPollQuestion]     = useState("");
const [pollOptions,      setPollOptions]      = useState(["", ""]);
const [postAnonymous,    setPostAnonymous]    = useState(false);
// Edit request modal state
  const [showEditRequest,     setShowEditRequest]     = useState(false);
  const [editRequestField,    setEditRequestField]    = useState("");
  const [editRequestReason,   setEditRequestReason]   = useState("");
  const [editRequestSending,  setEditRequestSending]  = useState(false);
  
  // Settings state
// CBT Admin state
  const [cbtAdminView, setCbtAdminView] = useState<"banks"|"createBank"|"questions">("banks");
  const [cbtSelectedBank, setCbtSelectedBank] = useState<CBTBank|null>(null);
  
  // CBT Exam state
  const [examBank,    setExamBank]    = useState<CBTBank|null>(null);
  const [examActive,  setExamActive]  = useState(false);
const [examCountdown, setExamCountdown] = useState<{title:string; examDate:any; active:boolean} | null>(null);
  const [dmUnreadCount, setDmUnreadCount] = useState(0);
  const [theme, setTheme] = useState<"dark"|"light">(
    () => (localStorage.getItem("cc_theme") as "dark"|"light") || "dark"
  );
  const [notifFollowers, setNotifFollowers] = useState(
    () => localStorage.getItem("cc_notif_followers") !== "false"
  );
  const [notifLikes, setNotifLikes] = useState(
    () => localStorage.getItem("cc_notif_likes") !== "false"
  );
  const [notifComments, setNotifComments] = useState(
    () => localStorage.getItem("cc_notif_comments") !== "false"
  );
  const [settingsEmailMode,   setSettingsEmailMode]   = useState(false);
  const [settingsPassMode,    setSettingsPassMode]    = useState(false);
  const [newEmail,            setNewEmail]            = useState("");
  const [newPassword,         setNewPassword]         = useState("");
  const [confirmPassword,     setConfirmPassword]     = useState("");
  const [settingsLoading,     setSettingsLoading]     = useState(false);
// Verification state
  const [verRegNumber,    setVerRegNumber]    = useState("");
  const [verFullName,     setVerFullName]     = useState("");
  const [verDocFile,      setVerDocFile]      = useState<File|null>(null);
  const [verDocPreview,   setVerDocPreview]   = useState<string|null>(null);
  const [verSubmitting,   setVerSubmitting]   = useState(false);
  const verDocRef = useRef<HTMLInputElement>(null);
const composerImageRef = useRef<HTMLInputElement>(null);
  const textRef    = useRef<HTMLTextAreaElement>(null);
  const avatarRef  = useRef<HTMLInputElement>(null);
  const coverRef   = useRef<HTMLInputElement>(null);

  // ── Boot: load / create profile ──────────────────────────
 useEffect(() => {
    // STEP 1: One-time check — only creates a profile if it truly doesn't exist.
    // This runs ONCE per login and never runs again inside the live listener,
    // preventing any race condition from overwriting real data.
    const initProfile = async () => {
      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (!snap.exists()) {
          const base: UserProfile = {
            uid: currentUser.uid,
            name: currentUser.displayName || "New Student",
            faculty: "",
            department: "",
            level: "",
            bio: "",
            avatarUrl: currentUser.photoURL || "",
            followers: [],
            following: [],
            profileLocked: false,
            createdAt: serverTimestamp(),
          };
          await setDoc(doc(db, "users", currentUser.uid), {
            ...base,
            onboardingDismissed: false,
          });
          setEditMode(true);
        }
      } catch (err) {
        console.error("Error initializing profile:", err);
      }
    };
    initProfile();

    // STEP 2: Live listener — READ ONLY. Never creates or overwrites anything.
    const unsub = onSnapshot(
      doc(db, "users", currentUser.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          if (data.profileLocked === undefined && data.faculty) {
            updateDoc(doc(db, "users", currentUser.uid), {
              profileLocked: true,
            }).catch(err => console.error("Error writing profileLocked:", err));
            data.profileLocked = true;
          }
          setMyProfile(data);
        }
      },
      (err) => {
        console.error("Profile listener error:", err);
      }
    );
    return () => unsub();
  }, [currentUser.uid]);

  // ── Exam countdown listener ────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "examCountdown"), snap => {
      setExamCountdown(snap.exists() ? (snap.data() as any) : null);
    });
    return () => unsub();
  }, []);

  // ── Unread DM count ─────────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid)
    );
    const unsub = onSnapshot(q, snap => {
      const unreadCount = snap.docs.filter(d => (d.data().unreadBy || []).includes(currentUser.uid)).length;
      setDmUnreadCount(unreadCount);
    }, (err) => console.error("Unread DM count error:", err));
    return () => unsub();
  }, [currentUser.uid]);
  // ── Live feed ─────────────────────────────────────────────
  useEffect(()=>{
    const q = query(collection(db,"posts"), orderBy("createdAt","desc"), limit(40));
    const unsub = onSnapshot(q, 
 snap => {
    const arr: Post[] = snap.docs.map(d=>({id:d.id,...d.data()} as Post));
    setPosts(arr);
    setPostsLoading(false);
    setTimeout(() => setShellReady(true), 300);
  },
 error => {
    console.error("Feed error:", error);
    setPostsLoading(false);
    setTimeout(() => setShellReady(true), 300);
  }
);
    return () => unsub();
  },[]);

  // ── Profile posts ─────────────────────────────────────────
  
  useEffect(()=>{
    if (activeNav !== "profile") return;
    const q = query(
      collection(db,"posts"),
      where("uid","==",currentUser.uid),
      orderBy("createdAt","desc")
    );
    const unsub = onSnapshot(q, 
  snap => {
    setProfilePosts(snap.docs.map(d=>({id:d.id,...d.data()} as Post)));
  },
  error => {
    console.error("Profile posts error:", error);
    // Keep existing posts visible on error
  }
);
    return ()=>unsub();
  },[activeNav, currentUser.uid]);

  useEffect(() => {
    const q = query(
      collection(db, "notifications", currentUser.uid, "items"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(q, snap => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [currentUser.uid]);

  useEffect(() => {
    if (!notifOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

  // ── Auto-resize textarea ──────────────────────────────────
  useEffect(()=>{
    if (!textRef.current) return;
    textRef.current.style.height = "auto";
    textRef.current.style.height = textRef.current.scrollHeight+"px";
  },[draftText]);

// ── Apply theme ───────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("cc_theme", theme);
    const root = document.documentElement;
    if (theme === "light") {
      root.setAttribute("data-theme", "light");
      root.style.setProperty("--dark",      "#f0f4f0");
      root.style.setProperty("--dark-2",    "#e8ede8");
      root.style.setProperty("--dark-3",    "#dde5dd");
      root.style.setProperty("--surface",   "rgba(0,0,0,0.06)");
      root.style.setProperty("--surface-2", "rgba(0,0,0,0.10)");
      root.style.setProperty("--border",    "rgba(0,0,0,0.12)");
      root.style.setProperty("--text",      "#0a1a0c");
      root.style.setProperty("--text-2",    "rgba(10,26,12,0.75)");
      root.style.setProperty("--text-3",    "rgba(10,26,12,0.5)");
      document.body.style.background = "#f0f4f0";
      document.body.style.color = "#0a1a0c";
    } else {
      root.removeAttribute("data-theme");
      root.style.setProperty("--dark",      "#060d08");
      root.style.setProperty("--dark-2",    "#0a1510");
      root.style.setProperty("--dark-3",    "#0e1e12");
      root.style.setProperty("--surface",   "rgba(255,255,255,0.04)");
      root.style.setProperty("--surface-2", "rgba(255,255,255,0.07)");
      root.style.setProperty("--border",    "rgba(255,255,255,0.07)");
      root.style.setProperty("--text",      "#f0f4f1");
      root.style.setProperty("--text-2",    "rgba(240,244,241,0.55)");
      root.style.setProperty("--text-3",    "rgba(240,244,241,0.3)");
      document.body.style.background = "#060d08";
      document.body.style.color = "#f0f4f1";
    }
  }, [theme]);
  // ── Body scroll lock ──────────────────────────────────────
  useEffect(()=>{
    document.body.style.overflow = (sidebarOpen||rightOpen) ? "hidden" : "";
    return ()=>{ document.body.style.overflow=""; };
  },[sidebarOpen,rightOpen]);

 // ── Populate edit fields when profile loads ───────────────
  useEffect(()=>{
    if (!myProfile) return;
    if (!editMode) return;
    setEditName(myProfile.name||"");
    setEditBio(myProfile.bio||"");
    setEditFaculty(myProfile.faculty||"");
    setEditDept(myProfile.department||"");
    setEditLevel(myProfile.level||"");
    setEditLga(myProfile.lga||"");
    setEditStateNg((myProfile as any).stateNg||"");
    setEditPhone(((myProfile as any).phone || "").replace(/^\+234/, ""));
  },[editMode]);

  // ── Image viewer state ────────────────────────────────────
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex,  setViewerIndex]  = useState(0);
  const [viewerOpen,   setViewerOpen]   = useState(false);

  const openViewer = (images: string[], index: number) => {
    setViewerImages(images);
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const closeViewer = () => setViewerOpen(false);

  const viewerNext = () => setViewerIndex(i => (i + 1) % viewerImages.length);
  const viewerPrev = () => setViewerIndex(i => (i - 1 + viewerImages.length) % viewerImages.length);

  // Keyboard navigation
  useEffect(() => {
    if (!viewerOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") viewerNext();
      if (e.key === "ArrowLeft")  viewerPrev();
      if (e.key === "Escape")     closeViewer();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [viewerOpen, viewerImages]);
  // ── Watch for admin unlock and open edit mode instantly ───
  useEffect(()=>{
    if (!myProfile) return;
    if (myProfile.profileLocked === false && myProfile.faculty) {
      setActiveNav("profile");
      setEditMode(true);
      showToast("✅ Admin approved — you can now edit your profile.");
    }
  }, [myProfile?.profileLocked]);

  // ── Watch for account verification ───────────────────────
  const prevVerStatusRef = useRef<string|undefined>(undefined);
  useEffect(() => {
    if (!myProfile) return;
    const prev = prevVerStatusRef.current;
    const curr = myProfile.verificationStatus;
    if (prev !== undefined && prev !== "verified" && curr === "verified") {
      showToast("🎉 Your account has been verified! Welcome to Campus Connect.");
      setActiveNav("feed");
    }
    prevVerStatusRef.current = curr;
  }, [myProfile?.verificationStatus]);

  /// ── Auto-open edit mode when admin unlocks profile ────────
  const prevLockedRef = useRef<boolean | undefined>(undefined);
  const hasHandledUnlockRef = useRef(false);

  useEffect(() => {
    if (!myProfile) return;

    const isUnlocked = myProfile.profileLocked === false && myProfile.faculty !== "";
    const wasLocked  = prevLockedRef.current;

    // Case 1: Fresh login — profile is already unlocked when we first load it
    if (prevLockedRef.current === undefined && isUnlocked && !hasHandledUnlockRef.current) {
      hasHandledUnlockRef.current = true;
      setActiveNav("profile");
      setEditMode(true);
      showToast("✅ Admin approved your request — you can now edit your profile.");
    }

    // Case 2: Already logged in — admin approves in real time
    if (wasLocked === true && isUnlocked && !hasHandledUnlockRef.current) {
      hasHandledUnlockRef.current = true;
      setActiveNav("profile");
      setEditMode(true);
      showToast("✅ Admin approved your request — you can now edit your profile.");
    }

    // Case 3: Profile got re-locked (after student saves) — reset so next unlock works
    if (myProfile.profileLocked === true) {
      hasHandledUnlockRef.current = false;
    }

    prevLockedRef.current = myProfile.profileLocked;
  }, [myProfile?.profileLocked, myProfile?.faculty]);

  // ── FCM Push Notification Setup ───────────────────────────
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const requestPushPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission !== "granted") {
        showToast("Notifications blocked. Enable them in browser settings.");
        return;
      }
      const token = await getToken(messaging, {
        vapidKey: "BHqZGj-2_0tTY5J56B8PjkrUllVAgJs_GB6r6aesjwY5QyMMHap3QxNgx6FRywfPPdS8a0xwOufF5WIiTUgWHNg",
      });
      if (token) {
        await updateDoc(doc(db, "users", currentUser.uid), {
          fcmTokens: arrayUnion(token),
        });
        showToast("🔔 Push notifications enabled!");
        console.log("✅ FCM token saved to Firestore");
      }
    } catch (err) {
      console.error("FCM setup error:", err);
      showToast("Failed to enable notifications.");
    }
  };

  // Handle foreground messages
  useEffect(() => {
    const unsubMessage = onMessage(messaging, (payload) => {
      if (payload.notification) {
        showToast(`🔔 ${payload.notification.title}: ${payload.notification.body}`);
      }
    });
    return () => unsubMessage();
  }, []);
  // ── Handlers ──────────────────────────────────────────────
  const handleLogout = async () => { await signOut(auth); };
const markNotifsRead = async () => {
  const unread = notifications.filter(n => !n.read);
  await Promise.all(
    unread.map(n =>
      updateDoc(doc(db, "notifications", currentUser.uid, "items", n.id), { read: true })
    )
  );
};

const pushNotification = async (
  toUid: string,
  type: "like" | "comment" | "follow",
  extra?: { preview?: string; postId?: string }
) => {
  if (toUid === currentUser.uid) return;
  await addDoc(collection(db, "notifications", toUid, "items"), {
    type,
    fromUid:       currentUser.uid,
    fromName:      myProfile?.name || "Someone",
    fromAvatarUrl: myProfile?.avatarUrl || "",
    preview:       extra?.preview || "",
    postId:        extra?.postId  || "",
    read:          false,
    createdAt:     serverTimestamp(),
  });
};
 const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "campus_connect");
    formData.append("cloud_name", "djibsjyqg");
    formData.append("folder", "campus_posts");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/djibsjyqg/image/upload",
      { method: "POST", body: formData }
    );

    if (!res.ok) throw new Error("Image upload failed");
    const data = await res.json();
    return data.secure_url;
  };

  const handlePost = async () => {
    if (!draftText.trim() && composerImages.length === 0 && !(showPoll && pollQuestion.trim())) return;
    if (!myProfile) return;
    setPostLoading(true);
    try {
     // Upload all images to Cloudinary in parallel
      const validFiles = composerImages.filter(file => {
        if (file.size > 5 * 1024 * 1024) {
          showToast(`${file.name} is over 5MB and was skipped.`);
          return false;
        }
        return true;
      });

      const imageUrls: string[] = (
        await Promise.all(
          validFiles.map(async file => {
            try {
              return await uploadToCloudinary(file);
            } catch {
              showToast(`Failed to upload ${file.name}. Skipped.`);
              return null;
            }
          })
        )
      ).filter(Boolean) as string[];

      const pollData = showPoll && pollQuestion.trim()
        ? {
            question: pollQuestion.trim(),
            options: pollOptions
              .filter(o => o.trim())
              .map(o => ({ text: o.trim(), votes: [] })),
          }
        : null;

      await addDoc(collection(db, "posts"), {
        uid:        currentUser.uid,
        name:       myProfile.name,
        faculty:    myProfile.faculty,
        department: myProfile.department,
        level:      myProfile.level,
        avatarUrl:  myProfile.avatarUrl || "",
        content:    draftText.trim(),
        tag:        draftTag || null,
        isAnonymous: postAnonymous,
        likes:      [],
        bookmarks:  [],
        comments:   0,
        shares:     0,
        imageUrl:   imageUrls[0] || null,
        imageUrls:  imageUrls.length > 0 ? imageUrls : null,
        poll:       pollData,
        createdAt:  serverTimestamp(),
      });

      // Increment postsThisWeek (resets automatically when the week rolls over)
      const currentWeekKey = getCurrentWeekKey();
      const storedWeekKey = (myProfile as any)?.currentWeekKey;
      const newWeeklyCount = storedWeekKey === currentWeekKey ? ((myProfile as any)?.postsThisWeek || 0) + 1 : 1;

      // Compute posting streak
      const today = getDateStr(new Date());
      const yesterday = getDateStr(new Date(Date.now() - 86400000));
      const lastPostDate = (myProfile as any)?.lastPostDate;
      const prevStreak = (myProfile as any)?.currentStreak || 0;
      let newStreak = prevStreak;
      if (lastPostDate === today) {
        newStreak = prevStreak; // already posted today, unchanged
      } else if (lastPostDate === yesterday) {
        newStreak = prevStreak + 1; // continuing the streak
      } else {
        newStreak = 1; // missed a day (or first ever post) — restart
      }

      await updateDoc(doc(db, "users", currentUser.uid), {
        postsThisWeek: newWeeklyCount,
        currentWeekKey: currentWeekKey,
        currentStreak: newStreak,
        lastPostDate: today,
      });

      if (newStreak !== prevStreak && STREAK_MILESTONES.includes(newStreak)) {
        showToast(`🔥 ${newStreak}-day posting streak! Keep it up!`);
      }

      // Reset
      setDraftText("");
      setDraftTag("");
      setComposerImages([]);
      setComposerImagePrevs([]);
      setShowPoll(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setPostAnonymous(false);
    } finally {
      setPostLoading(false);
    }
  };
 const toggleLike = async (post: Post) => {
    const ref2 = doc(db,"posts",post.id);
    const uid  = currentUser.uid;
    const liked = post.likes.includes(uid);
    await updateDoc(ref2,{ likes: liked ? arrayRemove(uid) : arrayUnion(uid) });
    if (!liked) {
      pushNotification(post.uid, "like", { postId: post.id });
    }
  };

  const toggleBookmark = async (post: Post) => {
    const ref2    = doc(db,"posts",post.id);
    const uid     = currentUser.uid;
    const marked  = post.bookmarks.includes(uid);
    await updateDoc(ref2,{ bookmarks: marked ? arrayRemove(uid) : arrayUnion(uid) });
  };

  const handleVote = async (post: Post, optionIndex: number) => {
  if (!post.poll) return;
  const uid = currentUser.uid;
  const ref2 = doc(db, "posts", post.id);
  const updatedOptions = post.poll.options.map((opt, i) => {
    const hasVoted = opt.votes.includes(uid);
    if (i === optionIndex) {
      return { ...opt, votes: hasVoted ? opt.votes.filter(v => v !== uid) : [...opt.votes, uid] };
    }
    // Remove vote from other options (single choice)
    return { ...opt, votes: opt.votes.filter(v => v !== uid) };
  });
  await updateDoc(ref2, { "poll.options": updatedOptions });
};

  // Open comment sheet + subscribe to comments in real time
const openComments = (post: Post) => {
  setCommentPost(post);
  setComments([]);
  setCommentsLoading(true);
  const q = query(
    collection(db, "posts", post.id, "comments"),
    orderBy("createdAt", "asc")
  );
  // store unsub so we can clean up when sheet closes
  (openComments as any)._unsub?.();
  const unsub = onSnapshot(q, snap => {
    setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    setCommentsLoading(false);
  });
  (openComments as any)._unsub = unsub;
  setTimeout(() => commentInputRef.current?.focus(), 300);
};

const closeComments = () => {
  (openComments as any)._unsub?.();
  setCommentPost(null);
  setComments([]);
  setCommentText("");
};
const handleAddComment = async () => {
    if (!commentText.trim() || !commentPost || !myProfile) return;
    setCommentLoading(true);
    try {
      const newComment = {
        uid:       currentUser.uid,
        name:      myProfile.name,
        avatarUrl: myProfile.avatarUrl || "",
        faculty:   myProfile.faculty,
        level:     myProfile.level,
        content:   commentText.trim(),
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "posts", commentPost.id, "comments"), newComment);
      await updateDoc(doc(db, "posts", commentPost.id), {
        comments: (commentPost.comments || 0) + 1,
      });
      pushNotification(commentPost.uid, "comment", {
        postId:  commentPost.id,
        preview: commentText.trim().slice(0, 60),
      });
      setCommentText("");
      commentInputRef.current?.focus();
    } finally {
      setCommentLoading(false);
    }
  };

  const openOptions = (e: React.MouseEvent, post: Post) => {
    e.stopPropagation();
    e.preventDefault();
    console.log("openOptions called", post.id);
    setOptionsPost(post);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setOptionsPos({ x: rect.right, y: rect.bottom + 6 });
  };

  const closeOptions = () => setOptionsPost(null);

  const handleDeletePost = async () => {
    if (!optionsPost) return;
    const isAdminDeletingOthers = optionsPost.uid !== currentUser.uid && currentUser.uid === ADMIN_UID;
    if (isAdminDeletingOthers) {
      if (!confirm(`Delete this post by ${optionsPost.name}? This can't be undone by the student.`)) return;
    }
    setDeleteLoading(true);
    try {
      await updateDoc(doc(db, "posts", optionsPost.id), {
        deleted: true,
        deletedBy: currentUser.uid,
        deletedByAdmin: isAdminDeletingOthers,
        deletedAt: serverTimestamp(),
      });
      closeOptions();
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSharePost = () => {
  if (!optionsPost) return;
  const text = `${optionsPost.name} on Campus Connect:\n\n"${optionsPost.content}"`;
  closeOptions();
  if (navigator.share) {
    navigator.share({ title: "Campus Connect", text }).catch(() => {
      navigator.clipboard.writeText(text);
      showToast("Post copied to clipboard!");
    });
  } else {
    navigator.clipboard.writeText(text);
    showToast("Post copied to clipboard!");
  }
};

  const handleReportPost = () => {
    alert("Report submitted. We'll review this post shortly.");
    closeOptions();
  };

  
   

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || !editFaculty || !editDept || !editLevel) {
      showToast("Please fill in your name, faculty, department and level.");
      return;
    }
    setProfileSaving(true);
    try {
      let avatarUrl  = myProfile?.avatarUrl  || "";
      let coverUrl   = (myProfile as any)?.coverUrl || "";
      if (avatarFile) {
        if (avatarFile.size > 2 * 1024 * 1024) {
          showToast("Avatar must be under 2MB");
          setProfileSaving(false);
          return;
        }
        try {
          const formData = new FormData();
          formData.append("file", avatarFile);
          formData.append("upload_preset", "campus_connect");
          formData.append("cloud_name", "djibsjyqg");
          formData.append("folder", "avatars");
          const res = await fetch(
            "https://api.cloudinary.com/v1_1/djibsjyqg/image/upload",
            { method: "POST", body: formData }
          );
          if (!res.ok) throw new Error("Avatar upload failed");
          const data = await res.json();
          avatarUrl = data.secure_url;
        } catch (err) {
          showToast("Avatar upload failed. Please try again.");
          setProfileSaving(false);
          return;
        }
      }

      if (coverFile) {
        if (coverFile.size > 5 * 1024 * 1024) {
          showToast("Cover photo must be under 5MB");
          setProfileSaving(false);
          return;
        }
        try {
          const formData = new FormData();
          formData.append("file", coverFile);
          formData.append("upload_preset", "campus_connect");
          formData.append("cloud_name", "djibsjyqg");
          formData.append("folder", "covers");
          const res = await fetch(
            "https://api.cloudinary.com/v1_1/djibsjyqg/image/upload",
            { method: "POST", body: formData }
          );
          if (!res.ok) throw new Error("Cover upload failed");
          const data = await res.json();
          coverUrl = data.secure_url;
        } catch (err) {
          showToast("Cover photo upload failed. Please try again.");
          setProfileSaving(false);
          return;
        }
      }

      // isFirstSave = profile has never been completed before
      const isFirstSave = !myProfile?.faculty;

      // wasUnlocked = admin unlocked this account so they can edit locked fields
      const wasUnlocked = myProfile?.faculty && !myProfile?.profileLocked;

      const updated: Partial<UserProfile> = {
        // Locked fields: only editable on first save OR if admin unlocked
        name:       (isFirstSave || wasUnlocked) ? editName.trim()  : myProfile!.name,
        faculty:    (isFirstSave || wasUnlocked) ? editFaculty       : myProfile!.faculty,
        department: (isFirstSave || wasUnlocked) ? editDept          : myProfile!.department,
        lga:        (isFirstSave || wasUnlocked) ? editLga.trim()    : (myProfile!.lga || ""),
        stateNg:    (isFirstSave || wasUnlocked) ? editStateNg       : ((myProfile as any).stateNg || ""),
        phone:      editPhone.trim() ? `+234${editPhone.trim().replace(/^0+/, "")}` : "",
        // Always editable fields
        bio:        editBio.trim(),
        level:      editLevel,
        avatarUrl,
        coverUrl,
        profileLocked: true,
      };

      await updateDoc(doc(db, "users", currentUser.uid), updated);
      setMyProfile(prev => prev ? { ...prev, ...updated } : null);
      setAvatarFile(null);
      setAvatarPreview(null);
      setCoverFile(null);
      setCoverPreview(null);
      setEditMode(false);
      showToast(wasUnlocked ? "Profile updated and re-locked." : "Profile saved!");
    } finally {
      setProfileSaving(false);
    }
  };
const handleSubmitEditRequest = async () => {
    if (!editRequestReason.trim() || !myProfile) return;
    setEditRequestSending(true);
    try {
      await addDoc(collection(db, "profileEditRequests"), {
        uid:       currentUser.uid,
        name:      myProfile.name,
        faculty:   myProfile.faculty,
        field:     editRequestField || "name / faculty / department / LGA",
        reason:    editRequestReason.trim(),
        status:    "pending",
        createdAt: serverTimestamp(),
      });
      setShowEditRequest(false);
      setEditRequestReason("");
      setEditRequestField("");
      showToast("Request submitted! Admin will review shortly.");
    } finally {
      setEditRequestSending(false);
    }
  };
const handleSubmitVerification = async () => {
    if (!verRegNumber.trim() || !verFullName.trim() || !verDocFile) {
      showToast("Please fill in all fields and upload your document.");
      return;
    }
    if (!myProfile) return;
    setVerSubmitting(true);
    try {
      // Check if registration number is already used by another account
      const regQuery = query(
        collection(db, "users"),
        where("verificationRegNumber", "==", verRegNumber.trim())
      );
      const regSnap = await getDocs(regQuery);
      const alreadyUsed = regSnap.docs.some(d => d.id !== currentUser.uid);
      if (alreadyUsed) {
        showToast("This registration number is already linked to another account.");
        setVerSubmitting(false);
        return;
      }

      // Upload document to Cloudinary
      const formData = new FormData();
      formData.append("file", verDocFile);
      formData.append("upload_preset", "campus_connect");
      formData.append("cloud_name", "djibsjyqg");
      formData.append("folder", "verification_docs");
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/djibsjyqg/image/upload",
        { method: "POST", body: formData }
      );
      if (!res.ok) throw new Error("Document upload failed");
      const data = await res.json();
      const docUrl = data.secure_url;

      // Update user profile with verification details
      await updateDoc(doc(db, "users", currentUser.uid), {
        verificationStatus:    "pending",
        verificationDocUrl:    docUrl,
        verificationRegNumber: verRegNumber.trim(),
        verificationFullName:  verFullName.trim(),
      });

      showToast("Verification submitted! Admin will review shortly.");
      setVerRegNumber("");
      setVerFullName("");
      setVerDocFile(null);
      setVerDocPreview(null);
    } catch (err) {
      showToast("Submission failed. Please try again.");
    } finally {
      setVerSubmitting(false);
    }
  };
 const handleFollow = async (targetUid: string) => {
    if (targetUid === currentUser.uid) return;
    if (myProfile?.following?.includes(targetUid)) return;
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        following: arrayUnion(targetUid),
      });
      await updateDoc(doc(db, "users", targetUid), {
        followers: arrayUnion(currentUser.uid),
      });
      pushNotification(targetUid, "follow");
    } catch (err) {
      showToast("Failed to follow. Please try again.");
    }
  };

  const handleUnfollow = async (targetUid: string) => {
    if (targetUid === currentUser.uid) return;
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        following: arrayRemove(targetUid),
      });
      await updateDoc(doc(db, "users", targetUid), {
        followers: arrayRemove(currentUser.uid),
      });
    } catch (err) {
      showToast("Failed to unfollow. Please try again.");
    }
  };
  const toggleNotif = (
    key: "followers"|"likes"|"comments",
    val: boolean
  ) => {
    localStorage.setItem(`cc_notif_${key}`, String(val));
    if (key === "followers") setNotifFollowers(val);
    if (key === "likes")     setNotifLikes(val);
    if (key === "comments")  setNotifComments(val);
    showToast(val ? `${key} notifications on` : `${key} notifications off`);
  };
  const openPublicProfile = (uid: string) => {
    setViewingProfile(uid);
  };

  const closePublicProfile = () => {
    setViewingProfile(null);
  };
  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      showToast("Please enter a new email.");
      return;
    }
    setSettingsLoading(true);
    try {
      const { updateEmail } = await import("firebase/auth");
      await updateEmail(currentUser, newEmail.trim());
      showToast("Email updated successfully!");
      setSettingsEmailMode(false);
      setNewEmail("");
    } catch (err: any) {
      if (err.code === "auth/requires-recent-login") {
        showToast("Please log out and log back in first, then try again.");
      } else {
        showToast("Failed to update email: " + err.message);
      }
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) {
      showToast("Please enter a new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters.");
      return;
    }
    setSettingsLoading(true);
    try {
      const { updatePassword } = await import("firebase/auth");
      await updatePassword(currentUser, newPassword.trim());
      showToast("Password updated successfully!");
      setSettingsPassMode(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      if (err.code === "auth/requires-recent-login") {
        showToast("Please log out and log back in first, then try again.");
      } else {
        showToast("Failed to update password: " + err.message);
      }
    } finally {
      setSettingsLoading(false);
    }
  };
  const handleAdminUnlock = async (targetUid: string) => {
    if (currentUser.uid !== ADMIN_UID) return;
    await updateDoc(doc(db, "users", targetUid), { profileLocked: false });
    showToast("Profile unlocked for that user.");
  };


  const [toast, setToast] = useState("");
const showToast = (msg: string) => {
  setToast(msg);
  setTimeout(() => setToast(""), 3000);
};

  const filteredPosts = posts.filter(p =>
  !(p as any).deleted &&
  p.content?.trim() &&
  (
    !searchVal ||
    p.content.toLowerCase().includes(searchVal.toLowerCase()) ||
    p.name.toLowerCase().includes(searchVal.toLowerCase())
  )
);
  const profile = myProfile;
  const myInitials = profile ? initials(profile.name) : "?";
  const myAvatarUrl = profile?.avatarUrl;

  
  

  
   // ─────────────────────────────────────────────────────────
   return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,300&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        :root{
          --green:#14532d;--green-mid:#166534;--green-light:#16a34a;--green-glow:#22c55e;
          --gold:#b45309;--gold-mid:#d97706;--gold-light:#f59e0b;--gold-pale:#fde68a;
          --dark:#060d08;--dark-2:#0a1510;--dark-3:#0e1e12;
          --surface:rgba(255,255,255,0.04);--surface-2:rgba(255,255,255,0.07);
          --border:rgba(255,255,255,0.07);--border-gold:rgba(245,158,11,0.18);
          --text:#f0f4f1;--text-2:rgba(240,244,241,0.55);--text-3:rgba(240,244,241,0.3);
          --radius:14px;--radius-lg:20px;
          --sidebar-w:248px;--right-w:296px;--topbar-h:58px;--bottom-nav-h:64px;
          --transition:all 0.2s cubic-bezier(0.4,0,0.2,1);
        }
        html{height:100%;}
        body{min-height:100%;background:var(--dark);color:var(--text);font-family:'Sora',sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px;}
        ::-webkit-scrollbar-track{background:transparent;}

        .app-scene{position:fixed;inset:0;z-index:0;pointer-events:none;background:var(--dark);}
        .app-scene::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(22,163,74,0.025)1px,transparent 1px),linear-gradient(90deg,rgba(22,163,74,0.025)1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(ellipse 70% 60% at 30% 0%,black 20%,transparent 100%);}
        .scene-orb{position:absolute;border-radius:50%;filter:blur(110px);}
        .orb-a{width:600px;height:600px;background:radial-gradient(circle,rgba(20,83,45,0.4),transparent 70%);top:-240px;left:-120px;animation:orb-drift 20s ease-in-out infinite alternate;}
        .orb-b{width:420px;height:420px;background:radial-gradient(circle,rgba(180,83,9,0.15),transparent 70%);bottom:-100px;right:0;animation:orb-drift 16s ease-in-out infinite alternate-reverse;}
        @keyframes orb-drift{from{transform:translate(0,0) scale(1);}to{transform:translate(30px,20px) scale(1.08);}}
        @keyframes shell-spin{to{transform:rotate(360deg);}}
        @keyframes shell-bar{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
        @keyframes shell-blink{0%,100%{opacity:1;}50%{opacity:0.3;}}

        .topbar{position:fixed;top:0;left:0;right:0;z-index:300;height:var(--topbar-h);display:flex;align-items:center;padding:0 16px;gap:12px;background:rgba(6,13,8,0.88);backdrop-filter:blur(28px) saturate(1.3);border-bottom:1px solid var(--border);}
        .topbar::after{content:'';position:absolute;bottom:-1px;left:15%;right:15%;height:1px;background:linear-gradient(90deg,transparent,rgba(34,197,94,0.2),transparent);}
        .hamburger-btn{width:36px;height:36px;border-radius:10px;background:var(--surface);border:1px solid var(--border);display:none;align-items:center;justify-content:center;cursor:pointer;font-size:16px;flex-shrink:0;color:var(--text-2);transition:var(--transition);}
        .hamburger-btn:hover{background:var(--surface-2);}
        .topbar-logo{display:flex;align-items:center;gap:10px;flex-shrink:0;text-decoration:none;width:var(--sidebar-w);}
        .logo-mark img {width: 40px; height: 40px; object-fit: contain; border-radius:10px;}
        .logo-text-wrap{display:flex;flex-direction:column;}
        .logo-text{font-family:'Fraunces',serif;font-size:15px;font-weight:700;color:var(--text);letter-spacing:-0.01em;white-space:nowrap;}
        .logo-sub{font-size:9px;font-weight:600;color:var(--gold-light);letter-spacing:0.12em;text-transform:uppercase;}
        .topbar-search{flex:1;max-width:460px;margin:0 auto;position:relative;}
        .topbar-search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:13px;opacity:0.35;pointer-events:none;}
        .topbar-search input{width:100%;padding:9px 14px 9px 38px;background:rgba(255,255,255,0.05);border:1.5px solid var(--border);border-radius:100px;color:var(--text);font-size:13px;font-family:'Sora',sans-serif;outline:none;transition:var(--transition);}
        .topbar-search input::placeholder{color:var(--text-3);}
        .topbar-search input:focus{border-color:rgba(245,158,11,0.35);background:rgba(255,255,255,0.07);}
        .mobile-search-bar{display:none;position:fixed;top:var(--topbar-h);left:0;right:0;z-index:290;padding:10px 14px;background:rgba(6,13,8,0.96);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);animation:slide-down 0.2s ease;}
        .mobile-search-bar.open{display:block;}
        @keyframes slide-down{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}
        .mobile-search-bar input{width:100%;padding:10px 16px;background:rgba(255,255,255,0.06);border:1.5px solid var(--border);border-radius:100px;color:var(--text);font-size:14px;font-family:'Sora',sans-serif;outline:none;}
        .mobile-search-bar input:focus{border-color:rgba(245,158,11,0.35);}
        .topbar-actions{display:flex;align-items:center;gap:6px;margin-left:auto;flex-shrink:0;}
        .topbar-btn{width:36px;height:36px;border-radius:10px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;transition:var(--transition);position:relative;flex-shrink:0;color:var(--text-2);}
        .topbar-btn:hover{background:var(--surface-2);border-color:rgba(255,255,255,0.14);}
        .topbar-badge{position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:var(--gold-light);color:#1a0a00;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid var(--dark);}
        .topbar-search-btn{display:none;}
        .topbar-right-toggle{display:none;}
        .topbar-avatar{width:34px;height:34px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;cursor:pointer;border:1.5px solid rgba(34,197,94,0.3);box-shadow:0 0 0 2px rgba(34,197,94,0.1);transition:var(--transition);overflow:hidden;}
        .topbar-avatar:hover{transform:scale(1.06);}

        .app-layout{position:relative;display:grid;grid-template-columns:var(--sidebar-w) 1fr var(--right-w);grid-template-areas:"sidebar feed right";min-height:100vh;padding-top:var(--topbar-h);}

        .sidebar{grid-area:sidebar;position:sticky;top:var(--topbar-h);height:calc(100vh - var(--topbar-h));overflow-y:auto;overflow-x:hidden;padding:28px 12px 32px;border-right:1px solid var(--border);background:rgba(6,13,8,0.6);display:flex;flex-direction:column;gap:4px;}
        .sidebar-section-label{font-size:9.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-3);padding:12px 12px 6px;}
        .nav-item{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:12px;cursor:pointer;transition:var(--transition);border:1px solid transparent;position:relative;}
        .nav-item:hover{background:var(--surface);border-color:var(--border);}
        .nav-item.active{background:rgba(22,163,74,0.1);border-color:rgba(22,163,74,0.2);}
        .nav-item.active .nav-label{color:#fff;font-weight:600;}
        .nav-icon{font-size:16px;width:22px;text-align:center;flex-shrink:0;}
        .nav-label{font-size:13px;font-weight:500;color:var(--text-2);flex:1;}
        .nav-badge{padding:2px 7px;border-radius:100px;background:var(--gold-light);color:#1a0a00;font-size:10px;font-weight:800;}
        .nav-active-bar{position:absolute;left:0;top:25%;bottom:25%;width:3px;border-radius:0 3px 3px 0;background:linear-gradient(to bottom,var(--green-glow),var(--gold-light));opacity:0;transition:opacity 0.2s;}
        .nav-item.active .nav-active-bar{opacity:1;}

        .identity-card{background:linear-gradient(135deg,rgba(20,83,45,0.25),rgba(180,83,9,0.1));border:1px solid rgba(22,163,74,0.2);border-radius:var(--radius-lg);padding:16px;position:relative;overflow:visible;margin-bottom:16px;}
        .identity-card::before{content:'';position:absolute;top:0;left:15%;right:15%;height:1px;background:linear-gradient(90deg,transparent,rgba(34,197,94,0.4),transparent);}
        .identity-faculty-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:100px;background:rgba(22,163,74,0.12);border:1px solid rgba(22,163,74,0.25);font-size:9.5px;font-weight:700;color:var(--green-glow);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;}
        .identity-name{font-family:'Fraunces',serif;font-size:16px;font-weight:700;color:var(--text);margin-bottom:2px;}
        .identity-sub{font-size:11px;color:var(--text-3);margin-bottom:12px;}
        .identity-stats{display:grid;grid-template-columns:1fr 1fr 1fr;}
        .identity-stat{text-align:center;}
        .identity-stat+.identity-stat{border-left:1px solid var(--border);}
        .identity-stat-num{font-family:'Fraunces',serif;font-size:20px;font-weight:700;color:var(--text);}
        .identity-stat-label{font-size:9.5px;color:var(--text-3);font-weight:500;text-transform:uppercase;letter-spacing:0.06em;}
        .sidebar-user{margin-top:24px;padding-top:16px;padding-bottom:24px;border-top:1px solid var(--border);}
        .sidebar-user-card{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:var(--surface);border:1px solid var(--border);cursor:pointer;transition:var(--transition);}
        .sidebar-user-card:hover{border-color:rgba(34,197,94,0.2);}
        .sidebar-user-name{font-size:13px;font-weight:600;color:var(--text);line-height:1.2;}
        .sidebar-user-dept{font-size:10.5px;color:var(--text-3);}
        .sidebar-user-dot{width:7px;height:7px;border-radius:50%;background:var(--green-glow);box-shadow:0 0 6px var(--green-glow);margin-left:auto;flex-shrink:0;}
        .logout-btn{margin-top:8px;width:100%;padding:9px;border-radius:10px;background:rgba(244,63,94,0.08);border:1px solid rgba(244,63,94,0.2);color:#f43f5e;font-size:12px;font-weight:600;font-family:'Sora',sans-serif;cursor:pointer;transition:var(--transition);}
        .logout-btn:hover{background:rgba(244,63,94,0.15);}

        .main-feed{grid-area:feed;padding:24px 28px 32px;max-width:680px;width:100%;margin:0 auto;display:flex;flex-direction:column;}

        .stories-row{display:flex;gap:10px;align-items:center;padding-bottom:20px;overflow-x:auto;scrollbar-width:none;}
        .stories-row::-webkit-scrollbar{display:none;}
        .story-item{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;flex-shrink:0;transition:transform 0.2s ease;}
        .story-item:hover{transform:translateY(-3px);}
        .story-ring{width:58px;height:58px;border-radius:50%;padding:2.5px;background:conic-gradient(var(--green-glow),var(--gold-light),var(--green-glow));display:flex;align-items:center;justify-content:center;}
        .story-ring.is-me{background:rgba(255,255,255,0.08);border:2px dashed rgba(255,255,255,0.2);padding:0;}
        .story-avatar{width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;color:#fff;border:2.5px solid var(--dark);overflow:hidden;}
        .story-me-icon{width:100%;height:100%;border-radius:50%;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;font-size:22px;}
        .story-name{font-size:10px;font-weight:500;color:var(--text-2);max-width:58px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

        .composer{background:rgba(255,255,255,0.03);border:1.5px solid var(--border);border-radius:var(--radius-lg);padding:18px;margin-bottom:20px;transition:border-color 0.2s;}
        .composer:focus-within{border-color:rgba(245,158,11,0.3);}
        .composer-top{display:flex;gap:12px;align-items:flex-start;}
        .composer-textarea{flex:1;background:transparent;border:none;outline:none;resize:none;color:var(--text);font-size:14px;font-family:'Sora',sans-serif;line-height:1.65;min-height:58px;max-height:220px;overflow-y:auto;}
        .composer-textarea::placeholder{color:rgba(255,255,255,0.22);}
        .composer-divider{height:1px;background:var(--border);margin:14px 0;}
        .composer-actions{display:flex;align-items:center;gap:4px;flex-wrap:wrap;}
        .composer-tool{padding:7px 10px;border-radius:8px;background:transparent;border:1px solid transparent;color:var(--text-3);font-size:15px;cursor:pointer;transition:var(--transition);}
        .composer-tool:hover{background:var(--surface);border-color:var(--border);color:var(--text-2);}
.tag-select{padding:6px 10px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid var(--border);color:var(--text-2);font-size:11px;font-family:'Sora',sans-serif;outline:none;cursor:pointer;colorScheme:dark;}
        .tag-select option{background:#0e1e12;color:#f0f4f1;}        .composer-pill{margin-left:auto;padding:8px 20px;border-radius:100px;background:linear-gradient(135deg,var(--gold),var(--gold-light));color:#1a0a00;font-size:12.5px;font-weight:700;font-family:'Sora',sans-serif;border:none;cursor:pointer;transition:var(--transition);display:flex;align-items:center;gap:6px;box-shadow:0 4px 16px rgba(180,83,9,0.3);white-space:nowrap;}
        .composer-pill:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(180,83,9,0.45);}
        .composer-pill:disabled{opacity:0.4;cursor:not-allowed;transform:none;}

        .feed-section-header{display:flex;align-items:center;gap:10px;padding-bottom:14px;flex-wrap:wrap;}
        .feed-section-title{font-family:'Fraunces',serif;font-size:16px;font-weight:700;color:var(--text);letter-spacing:-0.01em;}
        .feed-tabs{display:flex;gap:4px;margin-left:auto;}
        .feed-tab{padding:5px 13px;border-radius:100px;font-size:11.5px;font-weight:600;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text-3);font-family:'Sora',sans-serif;transition:var(--transition);}
        .feed-tab.active{background:rgba(22,163,74,0.12);border-color:rgba(22,163,74,0.28);color:var(--green-glow);}

        .post-card{background:rgba(255,255,255,0.025);border:1px solid var(--border);border-radius:var(--radius-lg);padding:18px;margin-bottom:14px;transition:border-color 0.2s,transform 0.2s;animation:post-in 0.4s cubic-bezier(0.16,1,0.3,1) both;}
        @keyframes post-in{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
        .post-card:hover{border-color:rgba(255,255,255,0.1);}
        .post-header{display:flex;align-items:flex-start;gap:11px;margin-bottom:12px;}
        .post-meta{flex:1;min-width:0;}
        .post-name-row{display:flex;align-items:center;gap:7px;margin-bottom:2px;flex-wrap:wrap;}
        .post-name{font-size:13.5px;font-weight:700;color:var(--text);line-height:1;}
        .post-tag-badge{padding:2px 8px;border-radius:100px;font-size:9.5px;font-weight:700;letter-spacing:0.05em;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.25);color:var(--gold-light);text-transform:uppercase;white-space:nowrap;}
        .post-tag-badge.official{background:rgba(22,163,74,0.12);border-color:rgba(22,163,74,0.28);color:var(--green-glow);}
        .post-sub{font-size:11px;color:var(--text-3);font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .post-time{font-size:11px;color:var(--text-3);white-space:nowrap;flex-shrink:0;}
        .post-more-btn{width:28px;height:28px;border-radius:8px;background:transparent;border:1px solid transparent;color:var(--text-3);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:var(--transition);flex-shrink:0;}
        .post-more-btn:hover{background:var(--surface);border-color:var(--border);color:var(--text-2);}
        .post-body{font-size:13.5px;line-height:1.75;color:rgba(240,244,241,0.85);margin-bottom:14px;}
        .post-actions{display:flex;align-items:center;gap:2px;padding-top:10px;border-top:1px solid var(--border);flex-wrap:wrap;}
        .action-btn{display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:10px;background:transparent;border:none;color:var(--text-3);font-size:12px;font-weight:500;font-family:'Sora',sans-serif;cursor:pointer;transition:var(--transition);white-space:nowrap;}
        .action-btn:hover{background:var(--surface);color:var(--text-2);}
        .action-btn.liked{color:#f43f5e;}
        .action-btn.bookmarked{color:var(--gold-light);}
        .action-btn .icon{font-size:15px;}
        .action-spacer{flex:1;}

        .skeleton{background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:8px;}
        @keyframes shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}

        .right-panel{grid-area:right;position:sticky;top:var(--topbar-h);height:calc(100vh - var(--topbar-h));overflow-y:auto;overflow-x:hidden;padding:24px 20px;border-left:1px solid var(--border);display:flex;flex-direction:column;gap:20px;}
        .right-card{background:rgba(255,255,255,0.025);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px;}
        .right-card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
        .right-card-title{font-family:'Fraunces',serif;font-size:14px;font-weight:700;color:var(--text);}
        .right-card-action{font-size:11px;font-weight:600;color:var(--gold-light);cursor:pointer;background:none;border:none;font-family:'Sora',sans-serif;}
        .right-card-action:hover{text-decoration:underline;}
        .trend-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;cursor:pointer;transition:var(--transition);}
        .trend-item:hover{background:var(--surface);}
        .trend-rank{font-size:10px;font-weight:700;color:var(--text-3);width:14px;text-align:right;flex-shrink:0;}
        .trend-info{flex:1;min-width:0;}
        .trend-tag{font-size:12.5px;font-weight:700;color:var(--text);}
        .trend-posts{font-size:10.5px;color:var(--text-3);margin-top:1px;}
        .trend-fire{font-size:12px;flex-shrink:0;}
        .event-item{display:flex;gap:11px;align-items:flex-start;padding:10px;border-radius:10px;cursor:pointer;transition:var(--transition);}
        .event-item:hover{background:var(--surface);}
        .event-date-pill{display:flex;flex-direction:column;align-items:center;padding:6px 10px;border-radius:10px;flex-shrink:0;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);min-width:44px;}
        .event-date-mon{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;}
        .event-date-day{font-size:18px;font-weight:800;font-family:'Fraunces',serif;line-height:1;color:var(--text);}
        .event-info{flex:1;min-width:0;}
        .event-title{font-size:12.5px;font-weight:600;color:var(--text);line-height:1.3;}
        .event-meta{font-size:10.5px;color:var(--text-3);margin-top:3px;}
        .right-footer{font-size:10px;color:var(--text-3);line-height:1.7;padding:0 4px;}

        .spinner{width:14px;height:14px;border:2px solid rgba(26,10,0,0.25);border-top-color:#1a0a00;border-radius:50%;animation:spin 0.6s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg);}}

        
        @keyframes fade-in{from{opacity:0;}to{opacity:1;}}

        .bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;z-index:300;height:var(--bottom-nav-h);background:rgba(6,13,8,0.95);backdrop-filter:blur(28px);border-top:1px solid var(--border);padding:0 4px;align-items:center;justify-content:space-around;}
        .bottom-nav-item{display:flex;flex-direction:column;align-items:center;gap:3px;flex:1;padding:8px 4px;cursor:pointer;border-radius:12px;transition:var(--transition);position:relative;}
        .bottom-nav-item.active{background:rgba(22,163,74,0.1);}
        .bottom-nav-icon{font-size:20px;line-height:1;}
        .bottom-nav-label{font-size:9px;font-weight:600;color:var(--text-3);letter-spacing:0.02em;}
        .bottom-nav-item.active .bottom-nav-label{color:var(--green-glow);}
        .bottom-nav-badge{position:absolute;top:4px;right:calc(50% - 16px);width:15px;height:15px;border-radius:50%;background:var(--gold-light);color:#1a0a00;font-size:8px;font-weight:800;display:flex;align-items:center;justify-content:center;border:1.5px solid var(--dark);}

        @media (max-width:1279px){:root{--right-w:260px;--sidebar-w:220px;}}
        @media (max-width:1023px){
          :root{--sidebar-w:260px;--right-w:280px;}
          .app-layout{grid-template-columns:1fr;grid-template-areas:"feed";}
          .sidebar{position:fixed!important;top:var(--topbar-h);left:0;width:var(--sidebar-w);height:calc(100vh - var(--topbar-h));z-index:400;transform:translateX(-100%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);border-right:1px solid rgba(255,255,255,0.12);background:rgba(6,13,8,0.98);backdrop-filter:blur(20px);pointer-events:auto;}
          .sidebar.open{transform:translateX(0);}
          .right-panel{position:fixed!important;top:var(--topbar-h);right:0;width:var(--right-w);height:calc(100vh - var(--topbar-h));z-index:360;transform:translateX(100%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);border-left:1px solid rgba(255,255,255,0.12);background:rgba(6,13,8,0.98);backdrop-filter:blur(20px);}
          .right-panel.open{transform:translateX(0);}
          .hamburger-btn{display:flex;}
          .topbar-right-toggle{display:flex;}
          .topbar-logo{width:auto;}
          .main-feed{padding:20px 24px 32px;max-width:100%;}
        }
        @media (max-width:767px){
  .main-feed{padding:16px 16px calc(var(--bottom-nav-h) + 16px);max-width:100%;width:100%;overflow-x:hidden;}
          .bottom-nav{display:flex;}
          .topbar-search{display:none;}
          .topbar-search-btn{display:flex;}
        }
        @media (max-width:599px){
          :root{--topbar-h:52px;--bottom-nav-h:60px;}
          .topbar{padding:0 12px;gap:8px;}
          .logo-text-wrap{display:none;}
          .topbar-logo{width:auto;}
            .main-feed{padding:12px 12px calc(var(--bottom-nav-h) + 12px);width:100%;max-width:100%;overflow-x:hidden;}
          .composer{padding:14px;}
          .post-card{padding:14px;border-radius:16px;}
          .post-body{font-size:13px;}
          .feed-section-header{flex-wrap:nowrap;}
          .feed-tabs{gap:3px;overflow-x:auto;scrollbar-width:none;}
          .feed-tabs::-webkit-scrollbar{display:none;}
          .feed-tab{white-space:nowrap;padding:5px 10px;font-size:11px;}
          .action-btn{padding:6px 8px;font-size:11px;}
        }
        @media (max-width:379px){
  .main-feed{padding:10px 10px calc(var(--bottom-nav-h) + 10px);width:100%;max-width:100%;overflow-x:hidden;}          .post-card{padding:12px;margin-bottom:10px;}
        }

        /* Profile page responsive */
        @media (max-width:520px){
  .profile-form-grid{grid-template-columns:1fr!important;}
  .profile-form-triple{grid-template-columns:1fr 1fr!important;}
}

/* ── Post Options Menu ── */
.options-overlay{display:none;position:fixed;inset:0;z-index:450;}
.options-overlay.open{display:block;}
.options-menu{
  position:fixed;z-index:452;
  background:rgba(14,30,18,0.97);
  border:1px solid rgba(255,255,255,0.12);
  border-radius:14px;
  padding:6px;
  min-width:210px;
  box-shadow:0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(34,197,94,0.08);
  backdrop-filter:blur(20px);
  animation:options-in 0.18s cubic-bezier(0.16,1,0.3,1);
  transform-origin:top right;
}
@keyframes options-in{
  from{opacity:0;transform:scale(0.92) translateY(-4px);}
  to{opacity:1;transform:scale(1) translateY(0);}
}
.options-item{
  display:flex;align-items:center;gap:10px;
  padding:10px 14px;border-radius:10px;cursor:pointer;
  font-size:13px;font-weight:500;color:rgba(240,244,241,0.75);
  transition:all 0.15s ease;border:none;background:transparent;
  width:100%;font-family:'Sora',sans-serif;text-align:left;
  letter-spacing:0.01em;
}
.options-item:hover{
  background:rgba(255,255,255,0.07);
  color:#f0f4f1;
  padding-left:18px;
}
.options-item span{font-size:15px;}
.options-item.danger{color:rgba(244,63,94,0.85);}
.options-item.danger:hover{
  background:rgba(244,63,94,0.1);
  color:#f43f5e;
  padding-left:18px;
}
.options-divider{height:1px;background:rgba(255,255,255,0.07);margin:4px 6px;}
        /* ── Comment Sheet ── */
.comment-sheet-overlay {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 400;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(4px);
  animation: fade-in 0.2s ease;
}
.comment-sheet-overlay.open { display: block; }

.comment-sheet {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 640px;
  max-height: 82vh;
  z-index: 401;
  background: var(--dark-2);
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: 24px 24px 0 0;
  display: flex;
  flex-direction: column;
  animation: sheet-up 0.32s cubic-bezier(0.16,1,0.3,1);
}
@keyframes sheet-up {
  from { transform: translateX(-50%) translateY(100%); }
  to   { transform: translateX(-50%) translateY(0); }
}
.comment-sheet-handle {
  width: 36px; height: 4px;
  border-radius: 2px;
  background: rgba(255,255,255,0.15);
  margin: 12px auto 0;
  flex-shrink: 0;
}
.comment-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.comment-sheet-title {
  font-family: 'Fraunces', serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}
.comment-sheet-close {
  width: 30px; height: 30px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-size: 14px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: var(--transition);
}
.comment-sheet-close:hover { background: var(--surface-2); }

.comment-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.comment-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  animation: post-in 0.3s cubic-bezier(0.16,1,0.3,1) both;
}
.comment-bubble {
  flex: 1;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  border-radius: 4px 14px 14px 14px;
  padding: 10px 14px;
}
.comment-author {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 2px;
}
.comment-author-sub {
  font-size: 10.5px;
  color: var(--text-3);
  margin-bottom: 6px;
}
.comment-text {
  font-size: 13px;
  line-height: 1.65;
  color: rgba(240,244,241,0.82);
}
.comment-time {
  font-size: 10px;
  color: var(--text-3);
  margin-top: 6px;
}
.comment-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-3);
}
.comment-composer {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
  background: var(--dark-2);
  border-radius: 0 0 0 0;
}
.comment-input {
  flex: 1;
  padding: 10px 14px;
  background: rgba(255,255,255,0.05);
  border: 1.5px solid var(--border);
  border-radius: 100px;
  color: var(--text);
  font-size: 13px;
  font-family: 'Sora', sans-serif;
  outline: none;
  transition: var(--transition);
}
.comment-input::placeholder { color: var(--text-3); }
.comment-input:focus { border-color: rgba(245,158,11,0.35); background: rgba(255,255,255,0.07); }
.comment-send-btn {
  width: 38px; height: 38px;
  border-radius: 100px;
  background: linear-gradient(135deg, var(--gold), var(--gold-light));
  border: none;
  color: #1a0a00;
  font-size: 16px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: var(--transition);
  box-shadow: 0 4px 12px rgba(180,83,9,0.3);
}
.comment-send-btn:hover:not(:disabled) { transform: scale(1.08); }
.comment-send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

@media (max-width: 767px) {
  .comment-sheet { max-height: 88vh; }
}

.toast{
  position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
  padding:10px 20px;border-radius:100px;
  background:linear-gradient(135deg,rgba(20,83,45,0.95),rgba(14,30,18,0.98));
  border:1px solid rgba(34,197,94,0.3);
  color:var(--green-glow);font-size:13px;font-weight:600;
  font-family:'Sora',sans-serif;letter-spacing:0.02em;
  box-shadow:0 8px 32px rgba(0,0,0,0.4),0 0 0 1px rgba(34,197,94,0.1);
  backdrop-filter:blur(20px);
  z-index:500;white-space:nowrap;
  animation:toast-in 0.3s cubic-bezier(0.16,1,0.3,1);
}
  
@keyframes toast-in{
  from{opacity:0;transform:translateX(-50%) translateY(12px);}
  to{opacity:1;transform:translateX(-50%) translateY(0);}
}
      `}</style>
{/* ── Shell Preloader ── */}
      {!shellReady && (
        <div style={{
          position:"fixed", inset:0, zIndex:9998,
          background:"#060d08",
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
          gap:20,
          animation:"none",
          transition:"opacity 0.5s ease",
          opacity: shellReady ? 0 : 1,
          pointerEvents: shellReady ? "none" : "all",
        }}>
          {/* Orbs */}
          <div style={{
            position:"absolute", inset:0, overflow:"hidden",
            pointerEvents:"none",
          }}>
            <div style={{
              position:"absolute",
              width:500, height:500, borderRadius:"50%",
              background:"radial-gradient(circle,rgba(20,83,45,0.4),transparent 70%)",
              top:-200, left:-150, filter:"blur(90px)",
            }}/>
            <div style={{
              position:"absolute",
              width:320, height:320, borderRadius:"50%",
              background:"radial-gradient(circle,rgba(180,83,9,0.18),transparent 70%)",
              bottom:-100, right:-80, filter:"blur(80px)",
            }}/>
          </div>

          {/* Logo ring */}
          <div style={{ position:"relative", width:80, height:80 }}>
            <div style={{
              position:"absolute", inset:-3, borderRadius:24,
              background:"conic-gradient(#22c55e 0deg,#166534 90deg,#f59e0b 180deg,#166534 270deg,#22c55e 360deg)",
              animation:"shell-spin 3s linear infinite",
            }}/>
            <div style={{
              position:"absolute", inset:3, borderRadius:18,
              background:"linear-gradient(135deg,#0e1e12,#166534)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:32,
            }}>🎓</div>
          </div>

          {/* Wordmark */}
          <div style={{ textAlign:"center" }}>
            <div style={{
              fontFamily:"'Fraunces',serif",
              fontSize:24, fontWeight:800,
              color:"#f0f4f1", letterSpacing:"-0.02em",
              marginBottom:4,
            }}>Campus Connect</div>
            <div style={{
              fontSize:10, fontWeight:700,
              color:"#f59e0b", letterSpacing:"0.16em",
              textTransform:"uppercase",
            }}>Loading your feed…</div>
          </div>

          {/* Progress bar */}
          <div style={{
            width:"min(280px,75vw)", height:3,
            borderRadius:3, background:"rgba(255,255,255,0.07)",
            overflow:"hidden", position:"relative",
          }}>
            <div style={{
              height:"100%", borderRadius:3, width:"100%",
              background:"linear-gradient(90deg,#166534,#22c55e,#f59e0b)",
              backgroundSize:"200% 100%",
              animation:"shell-bar 1.6s linear infinite",
            }}/>
          </div>

          {/* Bottom badge */}
          <div style={{
            position:"absolute", bottom:28,
            display:"flex", alignItems:"center", gap:7,
            padding:"5px 14px", borderRadius:100,
            background:"rgba(255,255,255,0.03)",
            border:"1px solid rgba(255,255,255,0.07)",
          }}>
            <div style={{
              width:6, height:6, borderRadius:"50%",
              background:"#22c55e",
              boxShadow:"0 0 6px rgba(34,197,94,0.7)",
              animation:"shell-blink 1.4s ease-in-out infinite",
            }}/>
            <span style={{
              fontSize:10.5, fontWeight:600,
              color:"rgba(240,244,241,0.4)",
              letterSpacing:"0.06em",
            }}>TASU · Secure Connection</span>
          </div>
        </div>
      )}
      {/* Background */}
      <div className="app-scene">
        <div className="scene-orb orb-a"/>
        <div className="scene-orb orb-b"/>
      </div>

      {/* Drawer overlay */}
      {/* Drawer overlay */}
  {(sidebarOpen || rightOpen) && (
  <div
    style={{
      position:"fixed",inset:0,zIndex:390,
      background:"rgba(15,15,15,0.65)",
    }}
    onClick={()=>{setSidebarOpen(false);setRightOpen(false);setOptionsPost(null);}}
  />
)}

      {/* Mobile search overlay */}
      <div className={`mobile-search-bar${searchOpen?" open":""}`}>
        <input
          autoFocus={searchOpen}
          placeholder="Search students, departments, notices…"
          value={searchVal}
          onChange={e=>setSearchVal(e.target.value)}
        />
      </div>

      {/* ── Top Bar ── */}
      <header className="topbar">
        <button className="hamburger-btn" onClick={()=>{setSidebarOpen(o=>!o);setRightOpen(false);}}>
          {sidebarOpen?"✕":"☰"}
        </button>
        <div className="topbar-logo">
          <div className="logo-mark"><img src={lockIcon} alt="Campus Connect" /></div>
          <div className="logo-text-wrap">
            <div className="logo-text">Campus Connect</div>
            <div className="logo-sub">TASU · Jalingo</div>
          </div>
        </div>
        <div className="topbar-search">
          <span className="topbar-search-icon">🔍</span>
          <input placeholder="Search students, departments, notices…" value={searchVal} onChange={e=>setSearchVal(e.target.value)}/>
        </div>
        <div className="topbar-actions">
          <button className="topbar-btn topbar-search-btn" onClick={()=>setSearchOpen(o=>!o)}>
            {searchOpen?"✕":"🔍"}
          </button>
          <div style={{ position: "relative" }} ref={notifRef}>
  <button
    className="topbar-btn"
    title="Notifications"
    onClick={() => {
      setNotifOpen(o => !o);
      if (!notifOpen) markNotifsRead();
    }}
  >
    🔔
    {notifications.filter(n => !n.read).length > 0 && (
      <div className="topbar-badge">
        {notifications.filter(n => !n.read).length > 9 ? "9+" : notifications.filter(n => !n.read).length}
      </div>
    )}
  </button>

  {notifOpen && (
    <div style={{
      position: "absolute", top: "calc(100% + 10px)", right: 0,
      width: 320, maxHeight: 440, overflowY: "auto",
      background: "rgba(10,21,16,0.98)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 16, zIndex: 500,
      boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
      backdropFilter: "blur(20px)",
    }}>
      <div style={{
        padding: "14px 16px 10px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{
  fontFamily: "'Fraunces',serif",
  fontSize: 15, fontWeight: 700, color: "var(--text)",
}}>Notifications</span>
{notifications.length > 0 && (
  <div style={{ display: "flex", gap: 10 }}>
    <button
      onClick={markNotifsRead}
      style={{
        fontSize: 11, fontWeight: 600, color: "var(--green-glow)",
        background: "none", border: "none", cursor: "pointer",
        fontFamily: "'Sora',sans-serif",
      }}
    >Mark all read</button>
    <button
      onClick={async () => {
        await Promise.all(
          notifications.map(n =>
            deleteDoc(doc(db, "notifications", currentUser.uid, "items", n.id))
          )
        );
      }}
      style={{
        fontSize: 11, fontWeight: 600, color: "#f43f5e",
        background: "none", border: "none", cursor: "pointer",
        fontFamily: "'Sora',sans-serif",
      }}
    >Clear all</button>
  </div>
)}
      </div>

      {notifications.length === 0 ? (
        <div style={{ padding: "36px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🔔</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>No notifications yet</div>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 4 }}>
            You'll be notified when someone likes, comments, or follows you.
          </div>
        </div>
      ) : (
        notifications.map(n => (
          <div key={n.id} style={{
            display: "flex", gap: 12, alignItems: "flex-start",
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            background: n.read ? "transparent" : "rgba(34,197,94,0.04)",
            cursor: "pointer", transition: "background 0.15s",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: avatarGrad(n.fromUid || "x"),
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, color: "#fff",
              overflow: "hidden",
            }}>
              {n.fromAvatarUrl
                ? <img src={n.fromAvatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials(n.fromName || "?")}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: "var(--text)", lineHeight: 1.5 }}>
                <strong>{n.fromName}</strong>{" "}
                {n.type === "like"    && "liked your post"}
                {n.type === "comment" && `commented: "${n.preview}"`}
                {n.type === "follow"  && "started following you"}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 3 }}>
                {timeAgo(n.createdAt)}
              </div>
            </div>
            {!n.read && (
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "var(--green-glow)",
                flexShrink: 0, marginTop: 5,
              }} />
            )}
          </div>
        ))
      )}
    </div>
  )}
</div>
          <button className="topbar-btn topbar-right-toggle" onClick={()=>{setRightOpen(o=>!o);setSidebarOpen(false);}}>
            📊
          </button>
          <div
            className="topbar-avatar"
            style={{background: myAvatarUrl ? "transparent" : avatarGrad(currentUser.uid)}}
            onClick={()=>setActiveNav("profile")}
            role="button" tabIndex={0}
          >
            {myAvatarUrl
              ? <img src={myAvatarUrl} alt="avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              : myInitials}
          </div>
        </div>
      </header>

      {/* ── App Layout ── */}
      <div className="app-layout">

        {/* ── Left Sidebar ── */}
        <aside className={`sidebar${sidebarOpen?" open":""}`}>
         <div className="identity-card">
            <div className="identity-faculty-badge">
              <span style={{width:5,height:5,borderRadius:"50%",background:"var(--green-glow)",display:"inline-block"}}/>
              {currentUser.uid === ADMIN_UID ? "Campus Connect" : (profile?.faculty||"TASU")}
            </div>
            <div className="identity-name" style={{display:"flex", alignItems:"center", gap:8}}>
              {currentUser.uid === ADMIN_UID ? "Campus Connect Official" : (profile?.name||"Loading…")}
              {currentUser.uid !== ADMIN_UID && (profile as any)?.currentStreak > 0 && (
                <span style={{
                  display:"inline-flex", alignItems:"center", gap:3,
                  padding:"2px 8px", borderRadius:100,
                  background:"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.3)",
                  fontSize:11, fontWeight:700, color:"#f59e0b",
                }}>🔥 {(profile as any).currentStreak}</span>
              )}
            </div>
            <div className="identity-sub">{currentUser.uid === ADMIN_UID ? "Official Account" : `${profile?.department||"—"} · ${profile?.level ? `${profile.level}L` : "—"}`}</div>
            <div className="identity-stats">
              <div className="identity-stat">
                <div className="identity-stat-num">{profilePosts.length}</div>
                <div className="identity-stat-label">Posts</div>
              </div>
              <div className="identity-stat">
                <div className="identity-stat-num">{profile?.followers?.length||0}</div>
                <div className="identity-stat-label">Followers</div>
              </div>
              <div className="identity-stat">
                <div className="identity-stat-num">{profile?.following?.length||0}</div>
                <div className="identity-stat-label">Following</div>
              </div>
            </div>
          </div>

          <div className="sidebar-section-label">Navigation</div>
          {NAV_ITEMS.filter(item =>
            item.id !== "admin" || currentUser.uid === ADMIN_UID
          ).map(item=>(
            <div
              key={item.id}
              className={`nav-item${activeNav===item.id?" active":""}`}
              onClick={(e)=>{
  e.stopPropagation();
  e.preventDefault();
  console.log("NAV CLICKED:", item.id);
  setActiveNav(item.id);
  setSidebarOpen(false);
}}
              role="button" tabIndex={0}
            >
              <div className="nav-active-bar"/>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.id === "messages" && dmUnreadCount > 0 && (
                <span className="nav-badge">{dmUnreadCount > 9 ? "9+" : dmUnreadCount}</span>
              )}
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </div>
          ))}

          <div className="sidebar-user">
            <div className="sidebar-user-card" onClick={(e)=>{e.stopPropagation();setActiveNav("profile");setSidebarOpen(false);}}>
              <div style={{
                width:36,height:36,borderRadius:10,flexShrink:0,
                background: myAvatarUrl ? "transparent" : avatarGrad(currentUser.uid),
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:13,fontWeight:700,color:"#fff",
                border:"1.5px solid rgba(34,197,94,0.25)",overflow:"hidden",
              }}>
                {myAvatarUrl
                  ? <img src={myAvatarUrl} alt="me" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  : myInitials}
              </div>
              <div>
                <div className="sidebar-user-name">{currentUser.uid === ADMIN_UID ? "Campus Connect Official" : (profile?.name||"…")}</div>
                <div className="sidebar-user-dept">{currentUser.uid === ADMIN_UID ? "Official Account" : `${profile?.level ? `${profile.level}L` : "—"} · ${profile?.department||"—"}`}</div>
              </div>
              <div className="sidebar-user-dot"/>
            </div>
            <button className="logout-btn" onClick={handleLogout}>🚪 Sign Out</button>
          </div>
        </aside>

        {/* ── Main Feed ── */}
<main className="main-feed">
  {/* ── Verification gate for restricted pages ── */}
  {activeNav !== "profile" &&
   activeNav !== "settings" &&
   myProfile &&
   myProfile.verificationStatus !== "verified" &&
   currentUser.uid !== ADMIN_UID ? (
    <VerificationGate
      myProfile={myProfile}
      verRegNumber={verRegNumber} setVerRegNumber={setVerRegNumber}
      verFullName={verFullName} setVerFullName={setVerFullName}
      verDocFile={verDocFile} setVerDocFile={setVerDocFile}
      verDocPreview={verDocPreview} setVerDocPreview={setVerDocPreview}
      verSubmitting={verSubmitting}
      handleSubmitVerification={handleSubmitVerification}
      verDocRef={verDocRef}
      currentUser={currentUser}
    />
  ) : activeNav === "profile" ? (
   <ProfilePage
      myProfile={myProfile}
      editMode={editMode} setEditMode={setEditMode}
      setShowEditRequest={setShowEditRequest}
      onImageClick={openViewer}
      onShowFollowers={(uid: string, type: "followers"|"following") => setShowFollowers({uid, type})}
      editName={editName} setEditName={setEditName}
      editBio={editBio} setEditBio={setEditBio}
      editFaculty={editFaculty} setEditFaculty={setEditFaculty}
      editDept={editDept} setEditDept={setEditDept}
      editLevel={editLevel} setEditLevel={setEditLevel}
      editLga={editLga} setEditLga={setEditLga}
      editStateNg={editStateNg} setEditStateNg={setEditStateNg}
      editPhone={editPhone} setEditPhone={setEditPhone}
      currentUserEmail={currentUser.email || ""}
      avatarPreview={avatarPreview}
      profileSaving={profileSaving}
      handleSaveProfile={handleSaveProfile}
      handleAvatarChange={handleAvatarChange}
      avatarRef={avatarRef}
      coverPreview={coverPreview}
      handleCoverChange={handleCoverChange}
      coverRef={coverRef}
      profilePosts={profilePosts}
      currentUser={currentUser}
      optionsPost={optionsPost}
      deleteLoading={deleteLoading}
      toggleLike={toggleLike}
      handleVote={handleVote}
      toggleBookmark={toggleBookmark}
      openComments={openComments}
      openOptions={openOptions}
      handleSharePost={handleSharePost}
      handleDeletePost={handleDeletePost}
      handleReportPost={handleReportPost}
      closeOptions={closeOptions}
    />
  ) : activeNav === "notices" ? (
    <ComingSoon icon="📋" title="Notice Board" description="Official TASU notices and announcements will appear here once activated." />
  ) : activeNav === "events" ? (
    <ComingSoon icon="📅" title="Events" description="Campus events, academic calendar and activities will appear here once activated." />
  ) : activeNav === "marketplace" ? (
    <Marketplace myProfile={myProfile} />
 ) : activeNav === "lostfound" ? (
    <LostAndFound myProfile={myProfile} />
 ) : activeNav === "departments" ? (
    <Departments myProfile={myProfile} />
) : activeNav === "conference" ? (
      <ConferenceHall
        currentUser={currentUser}
        myProfile={myProfile}
      />
    ) : activeNav === "messages" ? (
    <DirectMessages />
    ) : activeNav === "search" ? (
    viewingProfile ? (
      <PublicProfile
        uid={viewingProfile}
        currentUserId={currentUser.uid}
        myProfile={myProfile}
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
        onBack={closePublicProfile}
        onViewProfile={openPublicProfile}
        onShowFollowers={(uid, type) => setShowFollowers({ uid, type })}
        onImageClick={openViewer}
        onOpenMessage={(uid) => { setActiveNav("messages"); }}
      
      />
    ) : (
      <StudentSearch
        currentUserId={currentUser.uid}
        myProfile={myProfile}
        onViewProfile={openPublicProfile}
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
      />
    )
    ) : activeNav === "settings" ? (
    <SettingsPage
      theme={theme}
      setTheme={setTheme}
      notifFollowers={notifFollowers}
      notifLikes={notifLikes}
      notifComments={notifComments}
      toggleNotif={toggleNotif}
      settingsEmailMode={settingsEmailMode}
      setSettingsEmailMode={setSettingsEmailMode}
      settingsPassMode={settingsPassMode}
      setSettingsPassMode={setSettingsPassMode}
      newEmail={newEmail}
      setNewEmail={setNewEmail}
      newPassword={newPassword}
      setNewPassword={setNewPassword}
      confirmPassword={confirmPassword}
      setConfirmPassword={setConfirmPassword}
      settingsLoading={settingsLoading}
      handleChangeEmail={handleChangeEmail}
      handleChangePassword={handleChangePassword}
      handleLogout={handleLogout}
      currentUser={currentUser}
      notifPermission={notifPermission}
      requestPushPermission={requestPushPermission}
    />
   ) : activeNav === "cbt" ? (
    examActive && examBank ? (
      <CBTExam
        bank={examBank}
        currentUser={currentUser}
        myProfile={myProfile}
        onExit={() => { setExamActive(false); setExamBank(null); }}
        showToast={showToast}
      />
    ) : (
      <CBTBrowser
        myProfile={myProfile}
        onStartExam={(bank) => { setExamBank(bank); setExamActive(true); }}
      />
    )
  ) : activeNav === "admin" && currentUser.uid === ADMIN_UID ? (
   <AdminPanel
      currentUser={currentUser}
      onUnlock={(uid, reqId) => showToast(`Profile unlocked for ${uid}`)}
      cbtAdminView={cbtAdminView}
      setCbtAdminView={setCbtAdminView}
      cbtSelectedBank={cbtSelectedBank}
      setCbtSelectedBank={setCbtSelectedBank}
      showToast={showToast}
    />
  ) : (
    <>
      {(myProfile as any)?.onboardingDismissed === false && (
        <OnboardingChecklist
          myProfile={myProfile}
          currentUser={currentUser}
          onDismiss={(silent: boolean) => {
            updateDoc(doc(db, "users", currentUser.uid), { onboardingDismissed: true });
            if (!silent) showToast("Onboarding checklist hidden.");
          }}
        />
      )}

      {examCountdown && <ExamCountdownBanner data={examCountdown} />}

      {/* Stories */}
      <StorySystem myProfile={myProfile} />

      {/* Composer */}
      {profile && (
        <div className="composer">
          <div className="composer-top">
            <div style={{
              width:38,height:38,borderRadius:10,flexShrink:0,
              background: myAvatarUrl ? "transparent" : avatarGrad(currentUser.uid),
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:13,fontWeight:700,color:"#fff",
              border:"1.5px solid rgba(34,197,94,0.2)",overflow:"hidden",
            }}>
              {myAvatarUrl
                ? <img src={myAvatarUrl} alt="me" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                : myInitials}
            </div>
            <textarea
              ref={textRef}
              className="composer-textarea"
              placeholder={showPoll ? "Add a caption (optional)…" : "Share something with your campus community…"}
              value={draftText}
              onChange={e=>setDraftText(e.target.value)}
              rows={2}
            />
          </div>

          {postAnonymous && (
            <div style={{
              marginTop:10, padding:"8px 12px", borderRadius:10,
              background:"rgba(167,139,250,0.08)",
              border:"1px solid rgba(167,139,250,0.25)",
              fontSize:11.5, color:"#a78bfa", lineHeight:1.6,
              display:"flex", alignItems:"center", gap:8,
            }}>
              <AnonMaskIcon size={14}/> Posting as <strong>Anonymous TASU Student</strong> — your name & photo will be hidden.
            </div>
          )}

         {composerImagePrevs.length > 0 && (
            <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
              {composerImagePrevs.map((prev, i) => (
                <div key={i} style={{position:"relative",width:"calc(33% - 6px)",minWidth:80}}>
                  <img src={prev} alt={`preview-${i}`} style={{
                    width:"100%",height:90,objectFit:"cover",
                    borderRadius:10,border:"1px solid var(--border)",display:"block",
                  }}/>
                  <button
                    onClick={()=>{
                      setComposerImages(prev2 => prev2.filter((_,j) => j !== i));
                      setComposerImagePrevs(prev2 => prev2.filter((_,j) => j !== i));
                    }}
                    style={{
                      position:"absolute",top:4,right:4,
                      width:22,height:22,borderRadius:50,
                      background:"rgba(0,0,0,0.7)",border:"none",
                      color:"#fff",fontSize:11,cursor:"pointer",
                      display:"flex",alignItems:"center",justifyContent:"center",
                    }}
                  >✕</button>
                </div>
              ))}
              {composerImagePrevs.length < 5 && (
                <div
                  onClick={() => composerImageRef.current?.click()}
                  style={{
                    width:"calc(33% - 6px)",minWidth:80,height:90,
                    borderRadius:10,border:"2px dashed rgba(255,255,255,0.15)",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    cursor:"pointer",fontSize:22,color:"var(--text-3)",
                  }}
                >+</div>
              )}
            </div>
          )}

          {showPoll && (
            <div style={{
              marginTop:14,padding:14,
              background:"rgba(255,255,255,0.03)",
              border:"1px solid rgba(96,165,250,0.2)",
              borderRadius:12,
            }}>
              <div style={{fontSize:11,fontWeight:700,color:"#60a5fa",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>
                📊 Poll
              </div>
              <input
                value={pollQuestion}
                onChange={e=>setPollQuestion(e.target.value)}
                placeholder="Ask a question…"
                style={{
                  width:"100%",padding:"9px 14px",marginBottom:10,
                  background:"rgba(255,255,255,0.05)",
                  border:"1.5px solid rgba(255,255,255,0.1)",
                  borderRadius:10,color:"var(--text)",
                  fontSize:13,fontFamily:"'Sora',sans-serif",outline:"none",
                }}
              />
              {pollOptions.map((opt,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
                  <input
                    value={opt}
                    onChange={e=>{
                      const updated=[...pollOptions];
                      updated[i]=e.target.value;
                      setPollOptions(updated);
                    }}
                    placeholder={`Option ${i+1}`}
                    style={{
                      flex:1,padding:"8px 12px",
                      background:"rgba(255,255,255,0.05)",
                      border:"1.5px solid rgba(255,255,255,0.08)",
                      borderRadius:8,color:"var(--text)",
                      fontSize:12.5,fontFamily:"'Sora',sans-serif",outline:"none",
                    }}
                  />
                  {pollOptions.length > 2 && (
                    <button
                      onClick={()=>setPollOptions(pollOptions.filter((_,j)=>j!==i))}
                      style={{
                        width:26,height:26,borderRadius:50,
                        background:"rgba(244,63,94,0.12)",
                        border:"1px solid rgba(244,63,94,0.2)",
                        color:"#f43f5e",fontSize:13,cursor:"pointer",
                        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                      }}
                    >✕</button>
                  )}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <button
                  onClick={()=>setPollOptions([...pollOptions,""])}
                  style={{
                    width:"100%",padding:"7px",borderRadius:8,
                    background:"transparent",
                    border:"1px dashed rgba(255,255,255,0.12)",
                    color:"var(--text-3)",fontSize:12,
                    fontFamily:"'Sora',sans-serif",cursor:"pointer",
                    marginTop:2,
                  }}
                >+ Add option</button>
              )}
            </div>
          )}

          <div className="composer-divider"/>
          <div className="composer-actions">
           <input
              ref={composerImageRef}
              type="file"
              accept="image/*"
              multiple
              style={{display:"none"}}
              onChange={e=>{
                const files = Array.from(e.target.files || []);
                if (!files.length) return;
                const remaining = 5 - composerImages.length;
                const toAdd = files.slice(0, remaining);
                if (toAdd.length < files.length) {
                  showToast(`Max 5 images. Added ${toAdd.length} of ${files.length}.`);
                }
                setComposerImages(prev => [...prev, ...toAdd]);
                setComposerImagePrevs(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))]);
                setShowPoll(false);
                e.target.value="";
              }}
            />
            <button
              className={`composer-tool${composerImagePrevs.length>0?" active-tool":""}`}
              title="Add image (up to 5)"
              onClick={()=>{setShowPoll(false);composerImageRef.current?.click();}}
              disabled={composerImagePrevs.length >= 5}
            >🖼️ {composerImagePrevs.length > 0 && `${composerImagePrevs.length}/5`}</button>
           <button
              className={`composer-tool${showPoll?" active-tool":""}`}
              title="Create poll"
              onClick={()=>{
                setShowPoll(o=>!o);
                setComposerImages([]);
                setComposerImagePrevs([]);
              }}
            >📊</button>
            <button
              className="composer-tool"
              title={postAnonymous ? "Anonymous mode on — click to turn off" : "Post anonymously"}
              onClick={()=>setPostAnonymous(o=>!o)}
              style={{
                display:"flex", alignItems:"center", gap:5,
                ...(postAnonymous ? {
                  background:"rgba(167,139,250,0.15)",
                  border:"1px solid rgba(167,139,250,0.35)",
                  color:"#a78bfa",
                } : {}),
              }}
            ><AnonMaskIcon size={20}/>{postAnonymous ? " Anonymous" : ""}</button>
            <select
              className="tag-select"
              value={draftTag}
              onChange={e=>setDraftTag(e.target.value)}
              title="Tag your post"
            >
              <option value="">No tag</option>
              <option value="Official Notice">Official Notice</option>
              <option value="Faculty Event">Faculty Event</option>
              <option value="Campus News">Campus News</option>
              <option value="Question">Question</option>
              <option value="Marketplace">Marketplace</option>
            </select>
            <button
              className="composer-pill"
              onClick={handlePost}
             disabled={
                postLoading ||
                (!draftText.trim() && composerImagePrevs.length === 0 && !(showPoll && pollQuestion.trim() && pollOptions.filter(o=>o.trim()).length >= 2))
              }
            >
              {postLoading ? <div className="spinner"/> : "Post →"}
            </button>
          </div>
        </div>
      )}

      {/* Feed header */}
      <div className="feed-section-header">
        <span className="feed-section-title">Your Feed</span>
        <div className="feed-tabs">
          <button className="feed-tab active">For You</button>
          <button className="feed-tab">Faculty</button>
          <button className="feed-tab">Notices</button>
        </div>
      </div>

      {/* Pinned admin post */}
      {(() => {
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        const latestAdminPost = posts
          .filter(p => p.uid === ADMIN_UID && !(p as any).deleted && p.content?.trim())
          .filter(p => (p.createdAt?.toMillis?.() || 0) >= twentyFourHoursAgo)
          .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))[0];
        if (!latestAdminPost) return null;
        return (
          <div style={{ marginBottom: 14 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 10.5, fontWeight: 700, color: "#f59e0b",
              textTransform: "uppercase", letterSpacing: "0.08em",
              marginBottom: 8, paddingLeft: 4,
            }}>
              📌 Pinned
            </div>
            <PostCard
              post={latestAdminPost}
              idx={0}
              currentUserId={currentUser.uid}
              onLike={toggleLike}
              onVote={handleVote}
              onBookmark={toggleBookmark}
              onComment={openComments}
              onOpenOptions={openOptions}
              optionsPost={optionsPost}
              onShare={handleSharePost}
              onDeletePost={handleDeletePost}
              onReportPost={handleReportPost}
              deleteLoading={deleteLoading}
              toggleBookmark={toggleBookmark}
              closeOptions={closeOptions}
              onImageClick={openViewer}
              onViewProfile={(uid) => { setActiveNav("search"); openPublicProfile(uid); }}
            />
          </div>
        );
      })()}

      {/* Posts */}
      {postsLoading ? (
        [1,2,3].map(i=>(
          <div key={i} className="post-card" style={{marginBottom:14}}>
            <div style={{display:"flex",gap:12,marginBottom:14}}>
              <div className="skeleton" style={{width:40,height:40,borderRadius:11,flexShrink:0}}/>
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
                <div className="skeleton" style={{height:12,width:"40%"}}/>
                <div className="skeleton" style={{height:10,width:"60%"}}/>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              <div className="skeleton" style={{height:11,width:"100%"}}/>
              <div className="skeleton" style={{height:11,width:"85%"}}/>
              <div className="skeleton" style={{height:11,width:"70%"}}/>
            </div>
          </div>
        ))
      ) : filteredPosts.length === 0 ? (
        <div style={{textAlign:"center",padding:"48px 24px",color:"var(--text-3)"}}>
          <div style={{fontSize:32,marginBottom:12}}>🔍</div>
          <div style={{fontSize:14,fontWeight:600,color:"var(--text-2)"}}>No results found</div>
          <div style={{fontSize:12,marginTop:6}}>Try a different search term</div>
        </div>
      ) : (
        filteredPosts.map((post, idx) => (
          <PostCard
            key={post.id}
            post={post}
            idx={idx}
            currentUserId={currentUser.uid}
            onLike={toggleLike}
            onVote={handleVote}
            onBookmark={toggleBookmark}
            onComment={openComments}
            onOpenOptions={openOptions}
            optionsPost={optionsPost}
           onShare={handleSharePost}
            onDeletePost={handleDeletePost}
            onReportPost={handleReportPost}
            deleteLoading={deleteLoading}
            toggleBookmark={toggleBookmark}
            closeOptions={closeOptions}
            onImageClick={openViewer}
            onViewProfile={(uid) => { setActiveNav("search"); openPublicProfile(uid); }}
          />
        ))
      )}
    </>
  )}
</main>

{/* ── Right Panel ── */}
   
        {/* ── Right Panel ── */}
        <aside className={`right-panel${rightOpen?" open":""}`}>
          <div className="right-card">
  <div className="right-card-header">
    <span className="right-card-title">Trending on Campus</span>
  </div>
  {(() => {
    // Extract and count hashtags from all posts
    const hashtagCounts: Record<string, number> = {};
     posts.forEach(p => {
  const tags = (p.content || "").match(/#[\w]+/g) || [];
      tags.forEach(tag => {
        const t = tag.toLowerCase();
        hashtagCounts[t] = (hashtagCounts[t] || 0) + 1;
      });
    });

    const sorted = Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7);

    if (sorted.length === 0) return (
      <div style={{
        fontSize: 12, color: "var(--text-3)",
        padding: "8px 4px", lineHeight: 1.7, textAlign: "center"
      }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>💬</div>
        No hashtags yet. Students can add <strong style={{ color: "var(--text-2)" }}>#tags</strong> in their posts to appear here.
      </div>
    );

    return sorted.map(([tag, count], i) => (
      <div
        className="trend-item"
        key={tag}
        onClick={() => setSearchVal(tag)}
        style={{ cursor: "pointer" }}
      >
        <span className="trend-rank">{i + 1}</span>
        <div className="trend-info">
          <div className="trend-tag">{tag}</div>
          <div className="trend-posts">
            {count} {count === 1 ? "post" : "posts"}
          </div>
        </div>
        {count >= 3 && <span className="trend-fire">🔥</span>}
      </div>
    ));
  })()}
</div>

          <div className="right-card">
            <div className="right-card-header">
              <span className="right-card-title">Upcoming Events</span>
              <button className="right-card-action">View all</button>
            </div>
            <div className="right-card">
  <div className="right-card-header">
    <span className="right-card-title">📅 Campus Events</span>
    <button className="right-card-action" onClick={() => setActiveNav("events")}>View all</button>
  </div>
  <div style={{ fontSize: 12, color: "var(--text-3)", padding: "8px 4px", lineHeight: 1.7 }}>
    Tap <strong style={{ color: "var(--text-2)" }}>View all</strong> to see live TASU events fetched from the university website.
  </div>
</div>
          </div>

          <div className="right-footer">
            Campus Connect is exclusive to Taraba State University students and staff.<br/>
            © {new Date().getFullYear()} TASU Connect. All rights reserved.
          </div>
        </aside>
      </div>

      {/* ── Bottom Nav ── */}
      <nav className="bottom-nav">
        {BOTTOM_NAV.map(item=>(
          <div
            key={item.id}
            className={`bottom-nav-item${activeNav===item.id?" active":""}`}
            onClick={()=>setActiveNav(item.id)}
            role="button" tabIndex={0}
          >
            {item.id === "messages" && dmUnreadCount > 0 && (
              <div className="bottom-nav-badge">{dmUnreadCount > 9 ? "9+" : dmUnreadCount}</div>
            )}
            {item.badge && <div className="bottom-nav-badge">{item.badge}</div>}
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </div>
        ))}
      </nav>
      {/* ── Comment Sheet ── */}
{commentPost && (
  <div
    className="comment-sheet-overlay open"
    onClick={closeComments}
  />
)}
{commentPost && (
  <div className="comment-sheet">
    <div className="comment-sheet-handle" />

    {/* Header */}
    <div className="comment-sheet-header">
      <span className="comment-sheet-title">
        💬 Comments
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-3)", fontFamily: "'Sora',sans-serif", marginLeft: 8 }}>
          {comments.length}
        </span>
      </span>
      <button className="comment-sheet-close" onClick={closeComments}>✕</button>
    </div>

    {/* Comment list */}
    <div className="comment-list">
      {commentsLoading ? (
        [1, 2, 3].map(i => (
          <div key={i} style={{ display: "flex", gap: 10 }}>
            <div className="skeleton" style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="skeleton" style={{ height: 10, width: "35%" }} />
              <div className="skeleton" style={{ height: 10, width: "80%" }} />
              <div className="skeleton" style={{ height: 10, width: "60%" }} />
            </div>
          </div>
        ))
      ) : comments.length === 0 ? (
        <div className="comment-empty">
          <div style={{ fontSize: 28, marginBottom: 10 }}>💬</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>No comments yet</div>
          <div style={{ fontSize: 11.5, marginTop: 4 }}>Be the first to share your thoughts!</div>
        </div>
      ) : (
        comments.map((c, idx) => (
          <div key={c.id} className="comment-item" style={{ animationDelay: `${idx * 0.04}s` }}>
            <Avatar uid={c.uid} name={c.name} url={c.avatarUrl} size={34} radius={10} />
            <div className="comment-bubble">
              <div className="comment-author">{displayName(c.uid, c.name)}</div>
              <div className="comment-author-sub">
                {c.uid === ADMIN_UID ? "" : [c.faculty, c.level ? `${c.level}L` : ""].filter(Boolean).join(" · ")}
              </div>
              <div className="comment-text">{c.content}</div>
              <div className="comment-time">{timeAgo(c.createdAt)}</div>
            </div>
          </div>
        ))
      )}
    </div>

    {/* Composer */}
    <div className="comment-composer">
      <Avatar uid={currentUser.uid} name={myProfile?.name || ""} url={myAvatarUrl} size={34} radius={10} />
      <input
        ref={commentInputRef}
        className="comment-input"
        placeholder="Write a comment…"
        value={commentText}
        onChange={e => setCommentText(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); }}}
      />
      <button
        className="comment-send-btn"
        onClick={handleAddComment}
        disabled={!commentText.trim() || commentLoading}
        aria-label="Send comment"
      >
        {commentLoading ? <div className="spinner" style={{ borderColor: "rgba(26,10,0,0.25)", borderTopColor: "#1a0a00" }} /> : "➤"}
      </button>
     </div>
  </div>
)}

    {/* ── Post Options Menu ── */}
    
    {optionsPost && (
      <>
        <div
          style={{position:"fixed",inset:0,zIndex:451}}
          onClick={closeOptions}
        />
        <div
          className="options-menu"
          style={{
            top:  Math.min(optionsPos.y, window.innerHeight - 220),
            left: Math.min(optionsPos.x - 200, window.innerWidth - 216),
          }}
        >
          <button className="options-item" onClick={handleSharePost}>
            <span>🔗</span> Share post
          </button>
          <button className="options-item" onClick={() => { toggleBookmark(optionsPost); closeOptions(); }}>
            <span>🔖</span>
            {optionsPost.bookmarks.includes(currentUser.uid) ? "Remove bookmark" : "Bookmark post"}
          </button>
          <div className="options-divider" />
          {(optionsPost.uid === currentUser.uid || currentUser.uid === ADMIN_UID) && (
            <button className="options-item danger" onClick={handleDeletePost} disabled={deleteLoading}>
              <span>🗑️</span> {deleteLoading ? "Deleting…" : (optionsPost.uid === currentUser.uid ? "Delete post" : "Delete post (Admin)")}
            </button>
          )}
         {optionsPost.uid !== currentUser.uid && currentUser.uid !== ADMIN_UID && (
            <button className="options-item danger" onClick={handleReportPost}>
              <span>🚩</span> Report post
            </button>
          )}
        </div>
      </>
    )}
{/* ── Edit Request Modal ── */}
    {showEditRequest && (
      <>
        <div
          style={{
            position:"fixed",inset:0,zIndex:500,
            background:"rgba(0,0,0,0.65)",
            backdropFilter:"blur(5px)",
          }}
          onClick={() => setShowEditRequest(false)}
        />
        <div style={{
          position:"fixed",
          top:"50%", left:"50%",
          transform:"translate(-50%,-50%)",
          width:"min(430px, 92vw)",
          zIndex:501,
          background:"#0a1510",
          border:"1px solid rgba(244,63,94,0.25)",
          borderRadius:20,
          padding:"26px 24px",
          boxShadow:"0 24px 64px rgba(0,0,0,0.7)",
        }}>
          <div style={{
            fontFamily:"'Fraunces',serif",
            fontSize:18,fontWeight:700,
            color:"var(--text)",marginBottom:6,
          }}>
            📝 Request Profile Edit
          </div>
          <div style={{
            fontSize:12.5,color:"var(--text-3)",
            marginBottom:20,lineHeight:1.75,
          }}>
            Your locked fields can only be changed by the admin. Describe what you need to change and why — your request will be reviewed.
          </div>

          <label style={{
            fontSize:10,fontWeight:700,color:"var(--text-3)",
            textTransform:"uppercase",letterSpacing:"0.1em",
            display:"block",marginBottom:6,
          }}>
            What field(s) do you want changed?
          </label>
          <input
            value={editRequestField}
            onChange={e => setEditRequestField(e.target.value)}
            placeholder="e.g. Name, Faculty, Department, LGA…"
            style={{
              width:"100%",padding:"9px 14px",
              background:"#0e1e12",
              border:"1.5px solid rgba(255,255,255,0.1)",
              borderRadius:10,color:"#f0f4f1",
              fontSize:13,fontFamily:"'Sora',sans-serif",
              outline:"none",marginBottom:14,
              colorScheme:"dark",
            }}
          />

          <label style={{
            fontSize:10,fontWeight:700,color:"var(--text-3)",
            textTransform:"uppercase",letterSpacing:"0.1em",
            display:"block",marginBottom:6,
          }}>
            Reason for change *
          </label>
          <textarea
            value={editRequestReason}
            onChange={e => setEditRequestReason(e.target.value)}
            rows={4}
            placeholder="Explain why this change is needed (e.g. name change after marriage, transferred to a new department)…"
            style={{
              width:"100%",padding:"9px 14px",
              background:"#0e1e12",
              border:"1.5px solid rgba(255,255,255,0.1)",
              borderRadius:10,color:"#f0f4f1",
              fontSize:13,fontFamily:"'Sora',sans-serif",
              outline:"none",resize:"vertical",
              minHeight:100,lineHeight:1.65,
              colorScheme:"dark",
            }}
          />

          <div style={{display:"flex",gap:10,marginTop:18}}>
            <button
              onClick={() => { setShowEditRequest(false); setEditRequestReason(""); setEditRequestField(""); }}
              style={{
                flex:1,padding:"10px",borderRadius:100,
                border:"1px solid var(--border)",
                background:"transparent",color:"var(--text-2)",
                fontSize:12.5,fontWeight:600,
                fontFamily:"'Sora',sans-serif",cursor:"pointer",
              }}
            >Cancel</button>
            <button
              onClick={handleSubmitEditRequest}
              disabled={!editRequestReason.trim() || editRequestSending}
              style={{
                flex:2,padding:"10px",borderRadius:100,
                background:"linear-gradient(135deg,#b45309,#f59e0b)",
                border:"none",color:"#1a0a00",
                fontSize:12.5,fontWeight:700,
                fontFamily:"'Sora',sans-serif",cursor:"pointer",
                opacity:(!editRequestReason.trim()||editRequestSending)?0.45:1,
                transition:"opacity 0.2s",
              }}
            >
              {editRequestSending ? "Sending…" : "Submit Request →"}
            </button>
          </div>
        </div>
      </>
    )}
    {/* ── Image Viewer / Slideshow ── */}
    {viewerOpen && (
      <>
        {/* Backdrop */}
        <div
          onClick={closeViewer}
          style={{
            position:"fixed",inset:0,zIndex:600,
            background:"rgba(0,0,0,0.92)",
            backdropFilter:"blur(8px)",
          }}
        />

        {/* Viewer */}
        <div style={{
          position:"fixed",inset:0,zIndex:601,
          display:"flex",alignItems:"center",justifyContent:"center",
          pointerEvents:"none",
        }}>
          {/* Close button */}
          <button
            onClick={closeViewer}
            style={{
              position:"fixed",top:20,right:20,
              width:40,height:40,borderRadius:50,
              background:"rgba(255,255,255,0.1)",
              border:"1px solid rgba(255,255,255,0.2)",
              color:"#fff",fontSize:18,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",
              pointerEvents:"auto",zIndex:602,
              transition:"background 0.2s",
            }}
          >✕</button>

          {/* Counter */}
          <div style={{
            position:"fixed",top:24,left:"50%",
            transform:"translateX(-50%)",
            fontSize:12,fontWeight:600,
            color:"rgba(255,255,255,0.6)",
            fontFamily:"'Sora',sans-serif",
            zIndex:602,pointerEvents:"none",
          }}>
            {viewerIndex + 1} / {viewerImages.length}
          </div>

          {/* Left arrow */}
          {viewerImages.length > 1 && (
            <button
              onClick={viewerPrev}
              style={{
                position:"fixed",left:16,
                width:44,height:44,borderRadius:50,
                background:"rgba(255,255,255,0.1)",
                border:"1px solid rgba(255,255,255,0.15)",
                color:"#fff",fontSize:20,cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",
                pointerEvents:"auto",zIndex:602,
                transition:"background 0.2s",
              }}
            >‹</button>
          )}

          {/* Image */}
          <img
            src={viewerImages[viewerIndex]}
            alt={`image-${viewerIndex}`}
            style={{
              maxWidth:"92vw",maxHeight:"88vh",
              objectFit:"contain",
              borderRadius:12,
              pointerEvents:"auto",
              userSelect:"none",
              transition:"opacity 0.2s ease",
            }}
          />

          {/* Right arrow */}
          {viewerImages.length > 1 && (
            <button
              onClick={viewerNext}
              style={{
                position:"fixed",right:16,
                width:44,height:44,borderRadius:50,
                background:"rgba(255,255,255,0.1)",
                border:"1px solid rgba(255,255,255,0.15)",
                color:"#fff",fontSize:20,cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",
                pointerEvents:"auto",zIndex:602,
                transition:"background 0.2s",
              }}
            >›</button>
          )}

          {/* Dot indicators */}
          {viewerImages.length > 1 && (
            <div style={{
              position:"fixed",bottom:28,left:"50%",
              transform:"translateX(-50%)",
              display:"flex",gap:6,
              pointerEvents:"auto",zIndex:602,
            }}>
              {viewerImages.map((_,i) => (
                <div
                  key={i}
                  onClick={() => setViewerIndex(i)}
                  style={{
                    width: i === viewerIndex ? 20 : 7,
                    height:7,borderRadius:4,cursor:"pointer",
                    background: i === viewerIndex
                      ? "#fff"
                      : "rgba(255,255,255,0.3)",
                    transition:"all 0.25s ease",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </>
    )}
    {/* ── Followers / Following Modal ── */}
    {showFollowers && (
      <FollowersModal
        uid={showFollowers.uid}
        type={showFollowers.type}
        onClose={() => setShowFollowers(null)}
        onViewProfile={(uid) => {
          setShowFollowers(null);
          setActiveNav("search");
          setViewingProfile(uid);
        }}
        currentUserId={currentUser.uid}
        myProfile={myProfile}
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
      />
    )}
    {toast && <div className="toast">&#10003; {toast}</div>}
    </>
  );
}