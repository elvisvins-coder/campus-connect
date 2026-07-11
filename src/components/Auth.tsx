// src/components/Auth.tsx
import { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import lockIcon from "../assets/logo.png";
import { useNavigate } from "react-router-dom";
/* ── TASU Data ── */
const tasuFaculties: Record<string, string[]> = {
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

const levels        = ["100","200","300","400","500","600","Postgraduate","Part-Time"];
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

type SignupData = {
  name: string; surname: string; email: string;
  faculty: string; department: string; level: string;
  stateNg: string; lga: string; phone: string; password: string;
};

const INIT: SignupData = { name:"", surname:"", email:"", faculty:"", department:"", level:"", stateNg:"", lga:"",phone: "", password:"" };

export default function Auth() {
  const [loginEmail,    setLoginEmail]    = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showSignup,    setShowSignup]    = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [focused,       setFocused]       = useState<string|null>(null);
  const [showPw,        setShowPw]        = useState(false);
  const [signupData,    setSignupData]    = useState<SignupData>(INIT);
  const [step,          setStep]          = useState(1); // signup stepper
  const [showWelcome,   setShowWelcome]   = useState(false);
  const [welcomeName,   setWelcomeName]   = useState("");
  const [welcomeFaculty,setWelcomeFaculty]= useState("");
  const [welcomeDept,   setWelcomeDept]   = useState("");
  const [welcomeLevel,  setWelcomeLevel]  = useState("");
  const navigate = useNavigate();
  const departments = signupData.faculty ? tasuFaculties[signupData.faculty] ?? [] : [];


 const handleLogin = async () => {
  if (!loginEmail || !loginPassword) return alert("Enter email & password!");
  setLoading(true);
  try {
    await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    navigate("/dashboard");
  } catch (err: any) {
    const code = err.code;
    const messages: Record<string, string> = {
      "auth/invalid-login-credentials": "❌ Incorrect email or password. Please try again.",
      "auth/user-not-found":            "❌ No account found with this email.",
      "auth/wrong-password":            "❌ Wrong password. Please try again.",
      "auth/invalid-email":             "❌ That doesn't look like a valid email address.",
      "auth/user-disabled":             "🚫 This account has been disabled. Contact support.",
      "auth/too-many-requests":         "⏳ Too many failed attempts. Please wait a moment and try again.",
      "auth/network-request-failed":    "🌐 Network error. Check your internet connection and try again.",
    };
    alert(messages[code] || "❌ Sign in failed. Please check your details and try again.");
  } finally {
    setLoading(false);
  }
};

 const handleSignup = async () => {
  if (!step2Valid) return;
  setLoading(true);
  try {
   const cred = await createUserWithEmailAndPassword(auth, signupData.email, signupData.password);
    await setDoc(doc(db, "users", cred.user.uid), {
      uid:                   cred.user.uid,
      name:                  `${signupData.name} ${signupData.surname}`,
      faculty:               signupData.faculty,
      department:            signupData.department,
      level:                 signupData.level,
      stateNg:               signupData.stateNg,
      lga:                   signupData.lga,
      bio:                   "",
      avatarUrl:              "",
      followers:              [],
      following:              [],
      postsThisMonth:         0,
      silverStars:            0,
      lastSilverAwardMonth:   "",
      onboardingDismissed:    false,
      createdAt:              new Date(),
    });
    setWelcomeName(signupData.name);
    setWelcomeFaculty(signupData.faculty);
    setWelcomeDept(signupData.department);
    setWelcomeLevel(signupData.level);
    setShowWelcome(true);
    setShowSignup(false);
    setSignupData(INIT);
    setStep(1);
 } catch (err: any) {
    const code = err.code;
    const messages: Record<string, string> = {
      "auth/email-already-in-use":   "❌ An account with this email already exists. Please  Login instead.",
      "auth/invalid-email":          "❌ That doesn't look like a valid email address.",
      "auth/weak-password":          "❌ Password is too weak. Use at least 6 characters.",
      "auth/network-request-failed": "🌐 Network error. Check your internet connection and try again.",
    };
    alert(messages[code] || "❌ Registration failed. Please try again.");
  } finally {
    setLoading(false);
  }
};

  const handleChange = (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "faculty") setSignupData(p => ({ ...p, faculty: value, department: "" }));
    else setSignupData(p => ({ ...p, [name]: value }));
  };

  // Step 1: name + email + password
  // Step 2: faculty + dept + level + LGA + tribe
  const step1Valid = signupData.name && signupData.surname && signupData.email && signupData.password;
  const step2Valid = signupData.faculty && signupData.department && signupData.level && signupData.stateNg && signupData.lga;

  if (showWelcome) return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      background:"#060d08",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:24,
    }}>
      <style>{`
        @keyframes welcome-in {
          from { opacity:0; transform:scale(0.96); }
          to   { opacity:1; transform:scale(1); }
        }
        @keyframes welcome-float {
          0%,100% { transform:translateY(0); }
          50%      { transform:translateY(-10px); }
        }
        @keyframes welcome-glow {
          0%,100% { box-shadow:0 0 40px rgba(22,163,74,0.3); }
          50%      { box-shadow:0 0 80px rgba(22,163,74,0.6); }
        }
        @keyframes welcome-bar {
          from { width:0%; }
          to   { width:100%; }
        }
        @keyframes confetti-fall {
          0%   { transform:translateY(-20px) rotate(0deg); opacity:1; }
          100% { transform:translateY(100vh) rotate(720deg); opacity:0; }
        }
      `}</style>

      {/* Confetti */}
      {[...Array(18)].map((_,i) => (
        <div key={i} style={{
          position:"absolute",
          left:`${(i * 37 + 11) % 100}%`,
          top:`-20px`,
          width: i%3===0 ? 10 : i%3===1 ? 7 : 5,
          height: i%3===0 ? 10 : i%3===1 ? 7 : 5,
          borderRadius: i%2===0 ? "50%" : 2,
          background: ["#22c55e","#f59e0b","#60a5fa","#f43f5e","#a78bfa"][i%5],
          animation:`confetti-fall ${2.5 + (i*0.15)}s ease-in ${i*0.08}s both`,
          zIndex:1,
        }}/>
      ))}

      {/* Orbs */}
      <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{
          position:"absolute", width:500, height:500, borderRadius:"50%",
          background:"radial-gradient(circle,rgba(20,83,45,0.45),transparent 70%)",
          top:-200, left:-150, filter:"blur(90px)",
        }}/>
        <div style={{
          position:"absolute", width:350, height:350, borderRadius:"50%",
          background:"radial-gradient(circle,rgba(180,83,9,0.2),transparent 70%)",
          bottom:-100, right:-80, filter:"blur(80px)",
        }}/>
      </div>

      {/* Content */}
      <div style={{
        position:"relative", zIndex:2,
        display:"flex", flexDirection:"column",
        alignItems:"center", textAlign:"center",
        maxWidth:420,
        animation:"welcome-in 0.6s cubic-bezier(0.16,1,0.3,1) both",
      }}>
        <div style={{
          width:100, height:100, borderRadius:28,
          background:"linear-gradient(135deg,#166534,#16a34a)",
          border:"2px solid rgba(245,158,11,0.3)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:48, marginBottom:28,
          animation:"welcome-float 3s ease-in-out infinite, welcome-glow 3s ease-in-out infinite",
        }}>🎓</div>

        <div style={{
          fontSize:13, fontWeight:700,
          color:"#f59e0b", letterSpacing:"0.2em",
          textTransform:"uppercase", marginBottom:12,
          fontFamily:"'Sora',sans-serif",
        }}>Welcome to</div>

        <div style={{
          fontFamily:"'Fraunces',serif",
          fontSize:36, fontWeight:800,
          color:"#f0f4f1", letterSpacing:"-0.02em",
          lineHeight:1.1, marginBottom:8,
        }}>Campus Connect</div>

        <div style={{
          fontFamily:"'Fraunces',serif",
          fontSize:18, fontWeight:600,
          color:"#22c55e", marginBottom:20,
          letterSpacing:"0.04em",
        }}>TSU · Jalingo</div>

        <div style={{
          fontSize:14, fontWeight:500,
          color:"rgba(240,244,241,0.6)",
          fontFamily:"'Sora',sans-serif",
          marginBottom:32, lineHeight:1.7,
        }}>
          Hey <strong style={{color:"#f0f4f1"}}>{welcomeName}</strong>, your account is ready! 🎉<br/>
          You're now part of the TSU student community.
        </div>

        <div style={{
          display:"flex", gap:10, flexWrap:"wrap",
          justifyContent:"center", marginBottom:36,
        }}>
          {[
            { icon:"🏛️", label: welcomeFaculty },
            { icon:"📚", label: welcomeDept },
            { icon:"📊", label: `${welcomeLevel} Level` },
          ].map((item,i) => (
            <div key={i} style={{
              padding:"6px 14px", borderRadius:100,
              background:"rgba(255,255,255,0.05)",
              border:"1px solid rgba(255,255,255,0.1)",
              fontSize:11.5, fontWeight:600,
              color:"rgba(240,244,241,0.7)",
              fontFamily:"'Sora',sans-serif",
              display:"flex", alignItems:"center", gap:6,
            }}>
              {item.icon} {item.label}
            </div>
          ))}
        </div>

        <div style={{
          width:"100%", height:4, borderRadius:4,
          background:"rgba(255,255,255,0.07)",
          overflow:"hidden", marginBottom:14,
        }}>
          <div style={{
            height:"100%", borderRadius:4,
            background:"linear-gradient(90deg,#166534,#22c55e,#f59e0b)",
            animation:"welcome-bar 3s linear forwards",
          }}/>
        </div>
        <div style={{
          fontSize:11.5, color:"rgba(240,244,241,0.35)",
          fontFamily:"'Sora',sans-serif",
        }}>
          Taking you to your dashboard…
        </div>

        {/* Auto redirect */}
        {(() => { setTimeout(() => navigate("/dashboard"), 3000); return null; })()}
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,300&display=swap');

        /* ── CSS reset within auth scope ── */
        .auth-shell *, .auth-shell *::before, .auth-shell *::after {
          box-sizing: border-box;
        }

        /* ── Card ── */
        .auth-shell {
          width: 100%;
          max-width: 440px;
          background: rgba(6,13,8,0.78);
          backdrop-filter: blur(32px) saturate(1.3);
          -webkit-backdrop-filter: blur(32px) saturate(1.3);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 24px;
          padding: 40px 36px;
          box-shadow:
            0 0 0 1px rgba(22,163,74,0.08),
            0 32px 80px rgba(0,0,0,0.55),
            inset 0 1px 0 rgba(255,255,255,0.06);
          animation: auth-pop 0.6s cubic-bezier(0.16,1,0.3,1) both;
          position: relative;
          overflow: hidden;
        }
        /* top accent line */
        .auth-shell::before {
          content: '';
          position: absolute;
          top: 0; left: 20%; right: 20%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(245,158,11,0.5), transparent);
        }
        @keyframes auth-pop {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ── Tabs (Login / Sign Up) ── */
        .auth-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 4px;
          margin-bottom: 32px;
        }
        .auth-tab {
          padding: 10px;
          border: none;
          border-radius: 10px;
          background: transparent;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.4);
          font-family: 'Sora', sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .auth-tab.active {
          background: rgba(22,163,74,0.15);
          border: 1px solid rgba(22,163,74,0.28);
          color: #fff;
        }

        /* ── Brand row ── */
        .auth-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
        }
        .auth-brand-logo {
          width: 48px; height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, #ffffff, #ffffff);
          border: 1px solid rgba(245,158,11,0.25);
          box-shadow: 0 0 0 1px rgba(22,163,74,0.2), 0 8px 24px rgba(14,83,45,0.45);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .auth-brand-logo img { width: 30px; height: 30px; object-fit: contain; }
        .auth-brand-text { flex: 1; }
        .auth-brand-title {
          font-family: 'Fraunces', serif;
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.02em;
          line-height: 1.1;
          margin: 0 0 2px;
        }
        .auth-brand-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          font-weight: 500;
          margin: 0;
        }
        .auth-verified-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          background: rgba(22,163,74,0.12);
          border: 1px solid rgba(22,163,74,0.25);
          border-radius: 100px;
          font-size: 10.5px;
          font-weight: 600;
          color: #4ade80;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .auth-verified-pill::before {
          content: '';
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px #22c55e;
          display: block;
        }

        /* ── Field label ── */
        .field-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(245,158,11,0.7);
          margin-bottom: 6px;
          font-family: 'Sora', sans-serif;
        }

        /* ── Input base ── */
        .field-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .field-icon {
          position: absolute;
          left: 14px;
          font-size: 14px;
          pointer-events: none;
          z-index: 1;
          opacity: 0.45;
        }

        .auth-input, .auth-select {
          width: 100%;
          padding: 13px 14px 13px 40px;
          background: rgba(255,255,255,0.05);
          border: 1.5px solid rgba(255,255,255,0.09);
          border-radius: 12px;
          color: #f8fafc;
          font-size: 13.5px;
          font-family: 'Sora', sans-serif;
          font-weight: 400;
          outline: none;
          transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
          -webkit-appearance: none;
          appearance: none;
        }
        .auth-input:focus, .auth-select:focus {
          background: rgba(22,163,74,0.08);
          border-color: rgba(245,158,11,0.5);
          box-shadow: 0 0 0 3px rgba(245,158,11,0.1), 0 4px 16px rgba(0,0,0,0.2);
        }
        .auth-input::placeholder { color: rgba(255,255,255,0.25); }
        .auth-select:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .auth-select option { background: #0a1510; color: #f8fafc; }

        /* select chevron */
        .auth-select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23f59e0b' d='M6 8L1.5 3h9z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          background-size: 11px;
          padding-right: 36px;
          cursor: pointer;
        }

        /* pw toggle */
        .pw-toggle {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          color: rgba(255,255,255,0.35);
          font-size: 13px;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          transition: color 0.2s;
          font-family: 'Sora', sans-serif;
        }
        .pw-toggle:hover { color: rgba(255,255,255,0.7); }

        /* ── Row helpers ── */
        .field-row  { display: flex; flex-direction: column; gap: 0; }
        .grid-2     { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .stack-14   { display: flex; flex-direction: column; gap: 14px; }
        .stack-10   { display: flex; flex-direction: column; gap: 10px; }

        /* ── Divider ── */
        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.07);
        }
        .divider-text {
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          font-weight: 500;
          white-space: nowrap;
          font-family: 'Sora', sans-serif;
        }

        /* ── Stepper ── */
        .stepper {
          display: flex;
          align-items: center;
          gap: 0;
          margin-bottom: 24px;
        }
        .step-item {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }
        .step-dot {
          width: 28px; height: 28px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px;
          font-weight: 700;
          flex-shrink: 0;
          transition: all 0.3s ease;
          border: 2px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.3);
          background: rgba(255,255,255,0.04);
          font-family: 'Sora', sans-serif;
        }
        .step-dot.active {
          background: linear-gradient(135deg, #166534, #16a34a);
          border-color: rgba(34,197,94,0.4);
          color: #fff;
          box-shadow: 0 0 0 4px rgba(22,163,74,0.15);
        }
        .step-dot.done {
          background: rgba(22,163,74,0.15);
          border-color: rgba(22,163,74,0.35);
          color: #4ade80;
        }
        .step-label {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.3);
          font-family: 'Sora', sans-serif;
        }
        .step-label.active { color: rgba(255,255,255,0.8); }
        .step-connector {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.08);
          margin: 0 8px;
        }

        /* ── Scrollable signup form ── */
        .scroll-area {
          max-height: 340px;
          overflow-y: auto;
          padding-right: 6px;
          margin-right: -6px;
        }
        .scroll-area::-webkit-scrollbar { width: 3px; }
        .scroll-area::-webkit-scrollbar-thumb {
          background: rgba(245,158,11,0.3);
          border-radius: 3px;
        }
        .scroll-area::-webkit-scrollbar-track { background: transparent; }

        /* ── Buttons ── */
        .btn-primary {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #b45309, #f59e0b);
          color: #1a0a00;
          font-size: 14px;
          font-weight: 700;
          font-family: 'Sora', sans-serif;
          cursor: pointer;
          transition: all 0.22s ease;
          box-shadow: 0 4px 20px rgba(180,83,9,0.35), 0 0 0 1px rgba(245,158,11,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          letter-spacing: 0.01em;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(180,83,9,0.5), 0 0 0 1px rgba(245,158,11,0.35);
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .btn-secondary {
          width: 100%;
          padding: 13px;
          border-radius: 12px;
          border: 1.5px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.65);
          font-size: 13px;
          font-weight: 600;
          font-family: 'Sora', sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.18);
          color: #fff;
        }

        .btn-text {
          background: none;
          border: none;
          color: rgba(245,158,11,0.85);
          font-size: 12.5px;
          font-weight: 600;
          font-family: 'Sora', sans-serif;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
          padding: 0;
          transition: color 0.2s;
        }
        .btn-text:hover { color: #fde68a; }

        /* ── Spinner ── */
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(26,10,0,0.3);
          border-top-color: #1a0a00;
          border-radius: 50%;
          animation: spin 0.65s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Footer note ── */
        .auth-footer {
          text-align: center;
          margin-top: 18px;
          font-size: 11px;
          color: rgba(255,255,255,0.2);
          font-family: 'Sora', sans-serif;
        }

        /* ── Forgot row ── */
        .forgot-row {
          display: flex;
          justify-content: flex-end;
          margin-top: -4px;
          margin-bottom: 4px;
        }

        /* ── Responsive card ── */
        @media (max-width: 480px) {
          .auth-shell { padding: 28px 20px; border-radius: 20px; }
          .grid-2 { grid-template-columns: 1fr; }
        }
      `}</style>

      
      <div className="auth-shell">

        {/* Tab switcher */}
        <div className="auth-tabs">
          <button
            className={`auth-tab${!showSignup ? " active" : ""}`}
            onClick={() => { setShowSignup(false); setStep(1); }}
          >Sign In</button>
          <button
            className={`auth-tab${showSignup ? " active" : ""}`}
            onClick={() => { setShowSignup(true); setStep(1); }}
          >Create Account</button>
        </div>

        {/* Brand row */}
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <img src={lockIcon} alt="TASU" />
          </div>
          <div className="auth-brand-text">
            <p className="auth-brand-title">Campus Connect</p>
            <p className="auth-brand-sub">TSU Campus</p>
          </div>
          <div className="auth-verified-pill">Verified</div>
        </div>

        {/* ── LOGIN VIEW ── */}
        {!showSignup && (
          <div className="stack-14">

            {/* Heading */}
            <div style={{marginBottom: 4}}>
              <h2 style={{fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:700, color:"#fff", letterSpacing:"-0.02em", margin:"0 0 4px"}}>
                Welcome back 👋
              </h2>
              <p style={{fontSize:12.5, color:"rgba(255,255,255,0.4)", margin:0, fontFamily:"'Sora',sans-serif"}}>
                Sign in to your Campus Connect account
              </p>
            </div>

            {/* Email */}
            <div className="field-row">
              <label className="field-label">Personal Email</label>
              <div className="field-wrap">
                <span className="field-icon">✉️</span>
                <input
                  type="email"
                  placeholder="you@gmail.com"
                  className="auth-input"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div className="field-row">
              <label className="field-label">Password</label>
              <div className="field-wrap">
                <span className="field-icon">🔒</span>
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Enter your password"
                  className="auth-input"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  style={{paddingRight: 52}}
                />
                <button className="pw-toggle" onClick={() => setShowPw(p => !p)}>
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Forgot */}
            <div className="forgot-row">
              <button
                className="btn-text"
                onClick={async () => {
                  if (!loginEmail.trim()) {
                    alert("Please enter your email address above first, then click Forgot password.");
                    return;
                  }
                  try {
                    const { sendPasswordResetEmail } = await import("firebase/auth");
                    await sendPasswordResetEmail(auth, loginEmail.trim());
                    alert(`✅ Password reset email sent to ${loginEmail}. Check your inbox.`);
                  } catch (err: any) {
                    const messages: Record<string, string> = {
                      "auth/user-not-found":  "❌ No account found with this email.",
                      "auth/invalid-email":   "❌ That doesn't look like a valid email address.",
                    };
                    alert(messages[err.code] || "❌ Failed to send reset email. Please try again.");
                  }
                }}
              >
                Forgot password?
              </button>
            </div>

            {/* CTA */}
            <button className="btn-primary" onClick={handleLogin} disabled={loading}>
              {loading && <div className="spinner" />}
              {loading ? "Logging in…" : "Login →"}
            </button>

            <div className="divider">
              <span className="divider-text">New to Campus Connect?</span>
            </div>

            <button className="btn-secondary" onClick={() => { setShowSignup(true); setStep(1); }}>
              🎓 Create Campus Connect Account
            </button>

            <div className="auth-footer">
              Exclusive to TSU students
            </div>
          </div>
        )}

        {/* ── SIGNUP VIEW ── */}
        {showSignup && (
          <>
            {/* Heading */}
            <div style={{marginBottom: 20}}>
              <h2 style={{fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:700, color:"#fff", letterSpacing:"-0.02em", margin:"0 0 4px"}}>
                Join TSU Campus Connect
              </h2>
              <p style={{fontSize:12, color:"rgba(255,255,255,0.38)", margin:0, fontFamily:"'Sora',sans-serif"}}>
                Step {step} of 2 — {step === 1 ? "Personal details" : "Academic profile"}
              </p>
            </div>

            {/* Stepper */}
            <div className="stepper">
              <div className="step-item">
                <div className={`step-dot ${step === 1 ? "active" : "done"}`}>
                  {step > 1 ? "✓" : "1"}
                </div>
                <span className={`step-label ${step === 1 ? "active" : ""}`}>Personal</span>
              </div>
              <div className="step-connector" />
              <div className="step-item">
                <div className={`step-dot ${step === 2 ? "active" : ""}`}>2</div>
                <span className={`step-label ${step === 2 ? "active" : ""}`}>Academic</span>
              </div>
            </div>

            {/* STEP 1 */}
            {step === 1 && (
              <div className="stack-14">
                <div className="grid-2">
                  <div className="field-row">
                    <label className="field-label">First Name</label>
                    <div className="field-wrap">
                      <span className="field-icon">👤</span>
                      <input name="name" placeholder="Gavi" className="auth-input"
                        value={signupData.name} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="field-row">
                    <label className="field-label">Surname</label>
                    <div className="field-wrap">
                      <span className="field-icon">👤</span>
                      <input name="surname" placeholder="Gavison" className="auth-input"
                        value={signupData.surname} onChange={handleChange} />
                    </div>
                  </div>
                </div>

                <div className="field-row">
                  <label className="field-label">Personal Email</label>
                  <div className="field-wrap">
                    <span className="field-icon">✉️</span>
                    <input name="email" type="email" placeholder="you@gmail.com" className="auth-input"
                      value={signupData.email} onChange={handleChange} />
                  </div>
                </div>

                <div className="field-row">
                  <label className="field-label">Password</label>
                  <div className="field-wrap">
                    <span className="field-icon">🔒</span>
                    <input name="password" type={showPw ? "text" : "password"} placeholder="Min. 6 characters"
                      className="auth-input" style={{paddingRight: 52}}
                      value={signupData.password} onChange={handleChange} />
                    <button className="pw-toggle" onClick={() => setShowPw(p => !p)}>
                      {showPw ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div style={{display:"flex", flexDirection:"column", gap:10, marginTop:4}}>
                  <button className="btn-primary" disabled={!step1Valid} onClick={() => setStep(2)}>
                    Continue →
                  </button>
                  <button className="btn-secondary" onClick={() => { setShowSignup(false); setStep(1); }}>
                    ← Back to Sign In
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <div className="scroll-area">
                  <div className="stack-14">

                    <div className="field-row">
                      <label className="field-label">Faculty</label>
                      <div className="field-wrap">
                        <span className="field-icon">🏛️</span>
                        <select name="faculty" className="auth-select" style={{paddingLeft:40}}
                          value={signupData.faculty} onChange={handleChange}>
                          <option value="">Select faculty</option>
                          {Object.keys(tasuFaculties).map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="field-row">
                      <label className="field-label">Department</label>
                      <div className="field-wrap">
                        <span className="field-icon">📖</span>
                        <select name="department" className="auth-select" style={{paddingLeft:40}}
                          value={signupData.department} onChange={handleChange}
                          disabled={!signupData.faculty}>
                          <option value="">{signupData.faculty ? "Select department" : "Choose faculty first"}</option>
                          {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="field-row">
                      <label className="field-label">Current Level</label>
                      <div className="field-wrap">
                        <span className="field-icon">🎓</span>
                        <select name="level" className="auth-select" style={{paddingLeft:40}}
                          value={signupData.level} onChange={handleChange}>
                          <option value="">Select level</option>
                          {levels.map(l => <option key={l} value={l}>{l} Level</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="field-row">
                      <label className="field-label">State of Origin</label>
                      <div className="field-wrap">
                        <span className="field-icon">🗺️</span>
                        <select name="stateNg" className="auth-select" style={{paddingLeft:40}}
                          value={signupData.stateNg}
                          onChange={e => setSignupData(p => ({ ...p, stateNg: e.target.value, lga: "" }))}>
                          <option value="">Select state</option>
                          {NIGERIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="field-row">
                      <label className="field-label">LGA</label>
                      <div className="field-wrap">
                        <span className="field-icon">📍</span>
                        <select name="lga" className="auth-select" style={{paddingLeft:40}}
                          value={signupData.lga}
                          onChange={handleChange}
                          disabled={!signupData.stateNg}>
                          <option value="">{signupData.stateNg ? "Select LGA" : "Select a state first"}</option>
                          {(NIGERIA_STATE_LGAS[signupData.stateNg] || []).map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{display:"flex", flexDirection:"column", gap:10, marginTop:18}}>
                  <button className="btn-primary" onClick={handleSignup} disabled={loading || !step2Valid}>
                    {loading && <div className="spinner" />}
                    {loading ? "Creating Account…" : "🎓 Create Account"}
                  </button>
                  <button className="btn-secondary" onClick={() => setStep(1)}>
                    ← Back
                  </button>
                </div>

                <div className="auth-footer">
                  By signing up you agree to the TASU Connect terms
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}