import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, 
  GoogleAuthProvider, signInWithPopup, signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, serverTimestamp, getDocs 
} from 'firebase/firestore';
import { 
  Camera, Send, Check, ArrowRight, Menu, Plus, MessageCircle, 
  LogOut, UserCircle, Phone
} from 'lucide-react';

// --- 파이어베이스 설정 ---
const firebaseConfig = {
  apiKey: "AIzaSyA_XmIf672lF5y7VyjoK-7FIHdBITgiwnw",
  authDomain: "beforeter-72de2.firebaseapp.com",
  projectId: "beforeter-72de2",
  storageBucket: "beforeter-72de2.firebasestorage.app",
  messagingSenderId: "849691385148",
  appId: "1:849691385148:web:35b8a75e16e0b73f351239"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "beforeter-app";

// --- 컴포넌트 외부에 스타일 정의 (리렌더링 방지) ---
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap');
    * { font-family: 'Gowun Dodum', sans-serif !important; }
    body { background-color: #ffffff; color: #111111; overflow-x: hidden; }
    .dark-glass-nav { background-color: rgba(24, 24, 27, 0.85); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.05); }
    .soft-shadow { box-shadow: 0 30px 60px -10px rgba(0,0,0,0.08); }
    .input-clean { border-bottom: 1px solid #e2e8f0; border-radius: 0; background: transparent; padding-left: 0; padding-right: 0; }
    .input-clean:focus { border-bottom-color: #000; box-shadow: none; outline: none; }
    ::selection { background-color: #000; color: #fff; }
    @keyframes float-slow { 0%, 100% { transform: translateY(0px) rotate(-3deg); } 50% { transform: translateY(-20px) rotate(1deg); } }
    @keyframes float-medium { 0%, 100% { transform: translateY(0px) rotate(4deg); } 50% { transform: translateY(-15px) rotate(-1deg); } }
    @keyframes float-fast { 0%, 100% { transform: translateY(0px) rotate(-2deg); } 50% { transform: translateY(-25px) rotate(2deg); } }
    .animate-float-slow { animation: float-slow 7s ease-in-out infinite; }
    .animate-float-medium { animation: float-medium 6s ease-in-out infinite; }
    .animate-float-fast { animation: float-fast 5s ease-in-out infinite; }
  `}</style>
);

const App = () => {
  const [view, setView] = useState('home'); // home, worker, mypage
  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [myReports, setMyReports] = useState([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  
  // 리포트 데이터 상태 (초기화 상태)
  const getInitialReportData = () => ({
    title: '',
    beforeImg: '', 
    beforeNote: '',
    afterImg: '',
    afterNote: '',
    phoneNumber: '', // 고객 연락처 추가
  });

  const [reportData, setReportData] = useState(getInitialReportData());

  const beforeInputRef = useRef(null);
  const afterInputRef = useRef(null);

  // 스크롤 감지
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 인증 상태 리스너 (처음엔 익명, 이후 구글 연동)
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("인증 에러:", err);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 마이페이지 데이터 불러오기
  useEffect(() => {
    if (view === 'mypage' && user && !user.isAnonymous) {
      const fetchMyReports = async () => {
        setIsLoadingReports(true);
        try {
          const querySnapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'reports'));
          const reports = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.userId === user.uid) {
              reports.push({ id: doc.id, ...data });
            }
          });
          // 최신순 정렬
          reports.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
          setMyReports(reports);
        } catch (error) {
          console.error("리포트 불러오기 에러:", error);
        } finally {
          setIsLoadingReports(false);
        }
      };
      fetchMyReports();
    }
  }, [view, user]);

  const handleImageUpload = (e, type) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 2) { // 2MB 제한
        alert("사진 용량이 너무 큽니다. 2MB 이하의 사진을 사용해 주세요.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setReportData(prev => ({ ...prev, [type]: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  // 구글 로그인 핸들러
  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("구글 로그인 실패:", error);
      if (error.code === 'auth/unauthorized-domain') {
        alert("테스트 환경(Canvas)에서는 파이어베이스 승인 도메인 설정이 필요합니다.\n임시로 익명 계정 상태를 유지합니다.");
      } else if (error.code !== 'auth/popup-closed-by-user') {
        alert("구글 로그인 중 오류가 발생했습니다.");
      }
    }
  };

  // 프로 요금제 클릭 트래킹 핸들러 (의향 테스트)
  const handleProClick = async () => {
    alert("지금은 모든 기능을 무료로 사용하실 수 있습니다! 편하게 이용해주세요 😊");
    try {
      if (user) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'pro_plan_clicks'), {
          userId: user.uid,
          userEmail: user.email || '익명 테스터',
          clickedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("유료 플랜 클릭 트래킹 에러:", error);
    }
    // 클릭 후 자연스럽게 작성 페이지로 이동
    setView('worker');
    setStep(1);
  };

  // 리포트 전송 핸들러
  const handleSaveReport = async () => {
    // 1. 필수값 검증
    if (!reportData.title || !reportData.beforeImg || !reportData.afterImg || !reportData.phoneNumber) {
      alert("작업 제목, 전/후 사진, 그리고 고객의 휴대폰 번호는 필수입니다.");
      return;
    }

    // 2. 구글 로그인 체크 (안되어 있으면 팝업)
    let currentUser = user;
    if (!currentUser || currentUser.isAnonymous) {
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        currentUser = result.user;
      } catch (error) {
        console.error("구글 로그인 팝업 실패:", error);
        // 테스트 환경을 고려한 안전장치(Fallback)
        if (error.code === 'auth/unauthorized-domain') {
          alert("현재 도메인이 승인되지 않아 구글 로그인을 건너뜁니다.\n(테스트용 익명 계정으로 전송을 진행합니다.)");
          currentUser = user; // 익명 사용자로 계속 진행
        } else if (error.code === 'auth/popup-closed-by-user') {
          return; // 로그인 창 닫음
        } else {
          alert("리포트를 전송하려면 로그인이 필요합니다.");
          return;
        }
      }
    }

    // 3. 데이터 저장
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), {
        ...reportData,
        userId: currentUser.uid,
        userEmail: currentUser.email || '익명 테스터',
        createdAt: serverTimestamp()
      });
      setStep(2);
    } catch (error) {
      console.error("저장 에러:", error);
      alert("데이터 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 폼 초기화 후 새 리포트 작성
  const handleResetForm = () => {
    setReportData(getInitialReportData());
    setStep(1);
    setView('worker');
  };

  // --- UI 렌더링 함수들 (포커스 잃음 방지를 위해 함수 형태로 호출) ---

  const renderNavbar = () => (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-8 lg:px-12 py-6 flex justify-between items-center ${isScrolled ? 'dark-glass-nav py-4 shadow-xl' : 'bg-transparent'}`}>
      <div className="flex items-center cursor-pointer opacity-90 hover:opacity-100 transition-opacity" onClick={() => setView('home')}>
        <img 
          src="/image_64851b.png" 
          alt="Beforeter Logo" 
          className={`h-7 w-auto object-contain transition-all duration-500 ${isScrolled ? 'brightness-0 invert' : ''}`} 
        />
      </div>
      <div className={`hidden md:flex items-center gap-10 font-medium text-sm tracking-[0.2em] uppercase transition-colors duration-500 ${isScrolled ? 'text-gray-300' : 'text-gray-400'}`}>
        <a href="#reference" className={`transition-colors duration-300 ${isScrolled ? 'hover:text-white' : 'hover:text-black'}`}>Reference</a>
        <a href="#pricing" className={`transition-colors duration-300 ${isScrolled ? 'hover:text-white' : 'hover:text-black'}`}>Price</a>
        
        {/* 마이페이지 & 로그인/로그아웃 버튼 */}
        {user && !user.isAnonymous ? (
          <>
            <button onClick={() => setView('mypage')} className={`transition-colors duration-300 flex items-center gap-2 ${isScrolled ? 'hover:text-white' : 'hover:text-black'}`}>
              <UserCircle className="w-4 h-4" /> 마이페이지
            </button>
            <button onClick={() => signOut(auth)} className={`transition-colors duration-300 flex items-center gap-2 ${isScrolled ? 'hover:text-white' : 'hover:text-black'}`}>
              로그아웃
            </button>
          </>
        ) : (
          <button onClick={handleGoogleLogin} className={`transition-colors duration-300 flex items-center gap-2 ${isScrolled ? 'hover:text-white' : 'hover:text-black'}`}>
            <UserCircle className="w-4 h-4" /> 로그인
          </button>
        )}

        <button 
          onClick={() => { setView('worker'); setStep(1); }} 
          className={`font-bold border-b pb-0.5 transition-all duration-300 ${isScrolled ? 'text-white border-white/30 hover:border-white' : 'text-black border-transparent hover:border-black'}`}
        >
          Try now
        </button>
      </div>
      <button className={`md:hidden opacity-80 transition-colors ${isScrolled ? 'text-white' : 'text-black'}`}>
        <Menu className="w-6 h-6" />
      </button>
    </nav>
  );

  const renderHomeView = () => (
    <div className="animate-in fade-in duration-1000 overflow-hidden relative">
      <section className="relative w-full max-w-7xl mx-auto px-8 pt-56 pb-40 min-h-[85vh] flex flex-col items-center justify-center">
        {/* 1. 카카오톡 알림톡 목업 */}
        <div className="absolute top-32 left-[-5%] lg:left-[5%] w-64 md:w-72 bg-[#FEE500] rounded-[2rem] p-5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] animate-float-slow -z-10 opacity-30 lg:opacity-90">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 bg-white rounded-[1rem] flex items-center justify-center shadow-sm"><MessageCircle className="w-6 h-6 text-black" /></div>
            <div className="space-y-1"><p className="text-sm font-bold text-black leading-tight">작업 완료 리포트</p><p className="text-xs text-black/70 font-medium">비포터 알림톡 도착</p></div>
          </div>
        </div>

        {/* 2. Before 리포트 목업 */}
        <div className="absolute bottom-20 left-[5%] lg:left-[15%] w-56 md:w-64 bg-white rounded-[2.5rem] p-4 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] animate-float-medium -z-10 opacity-30 lg:opacity-80 border border-gray-100">
          <div className="space-y-3">
            <div className="flex justify-between items-center px-2 pb-2 border-b border-gray-50"><div className="h-2 w-12 bg-gray-200 rounded-full" /><span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Before</span></div>
            <div className="aspect-square rounded-2xl overflow-hidden grayscale opacity-70 bg-gray-100 flex items-center justify-center">
               <Camera className="w-8 h-8 text-gray-300" />
            </div>
            <div className="h-2 w-3/4 bg-gray-100 rounded-full mx-2 mt-2" />
          </div>
        </div>

        {/* 3. After 리포트 목업 */}
        <div className="absolute top-40 right-[-10%] lg:right-[5%] w-60 md:w-72 bg-white rounded-[2.5rem] p-5 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] animate-float-fast -z-10 opacity-40 lg:opacity-100 border border-gray-100">
           <div className="flex justify-between items-center px-2 pb-3"><span className="text-[10px] font-bold text-black uppercase tracking-widest">After Result</span><Check className="w-4 h-4 text-green-500" /></div>
           <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-4 shadow-inner bg-blue-50 flex items-center justify-center border-2 border-black">
              <span className="text-sm font-bold">완벽한 결과물</span>
           </div>
           <div className="space-y-2 px-1"><div className="h-3 w-4/5 bg-black rounded-full" /><div className="h-2 w-1/2 bg-gray-200 rounded-full" /></div>
        </div>

        {/* Main Text Content */}
        <div className="text-center space-y-16 relative z-10 bg-white/40 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none p-10 lg:p-0 rounded-[3rem]">
          <h2 className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold text-black tracking-tighter leading-[1.15]">
            단 두 장의 사진. <br />
            <span className="text-gray-400 font-normal">가장 압도적인 증명.</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-600 font-normal max-w-2xl mx-auto leading-[1.8] tracking-tight">
            불필요한 설명은 모두 덜어냈습니다. <br/>
            비포터는 전문가의 정직한 땀방울을 가장 직관적이고 아름답게 기록합니다.
          </p>
          <button 
            onClick={() => { setView('worker'); setStep(1); }}
            className="bg-black text-white px-12 py-5 rounded-full text-lg hover:bg-gray-800 transition-all active:scale-95 flex items-center gap-3 mx-auto shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)]"
          >
            리포트 작성하기 <ArrowRight className="w-5 h-5 opacity-70" />
          </button>
        </div>
      </section>
      
      <section id="reference" className="py-40 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-8 grid lg:grid-cols-2 gap-24 items-center">
          <div className="space-y-16">
            <div className="space-y-6">
              <span className="text-[10px] text-gray-400 uppercase tracking-[0.4em]">The Evidence</span>
              <h3 className="text-4xl md:text-5xl font-bold text-black tracking-tighter leading-tight">
                설명이 필요 없는 <br/>
                가장 완벽한 증명.
              </h3>
              <p className="text-gray-500 text-lg leading-[1.8] font-normal pt-4">
                앱 설치도, 복잡한 링크도 필요 없습니다. <br/>
                정갈하게 가공된 리포트 한 장이 고객의 스마트폰으로 <br/>
                즉시 전송되어 당신의 실력을 증명합니다.
              </p>
            </div>
            
            <div className="space-y-10 pt-4">
              <div className="space-y-2">
                <h4 className="font-bold text-black text-lg">간결함의 미학</h4>
                <p className="text-gray-400 text-sm">현장의 전과 후, 오직 두 가지에만 집중합니다.</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-black text-lg">영구적인 아카이브</h4>
                <p className="text-gray-400 text-sm">전송된 모든 리포트는 전문가의 자산으로 자동 축적됩니다.</p>
              </div>
            </div>
          </div>

          {/* Minimal Reference Card */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[340px] bg-white rounded-[2rem] soft-shadow border border-gray-100 overflow-hidden hover:-translate-y-2 transition-transform duration-500">
              <div className="p-8 space-y-8 flex flex-col">
                <div className="text-center space-y-2 pb-6 border-b border-gray-100">
                  <h4 className="text-xl font-bold tracking-tighter uppercase">Work Report</h4>
                  <p className="text-[10px] text-gray-400 tracking-widest uppercase">ID: BFT-0512</p>
                </div>
                
                <div className="space-y-10">
                  <div className="space-y-4 text-center">
                    <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-50">
                      <img src={reportData.beforeImg} className="w-full h-full object-cover grayscale opacity-60" />
                    </div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em]">Before</span>
                  </div>
                  
                  <div className="space-y-4 text-center">
                    <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-50">
                      <img src={reportData.afterImg} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] font-bold text-black uppercase tracking-[0.2em]">After</span>
                  </div>
                </div>

                <div className="pt-8 text-center border-t border-gray-100">
                  <p className="text-xs text-black">"의뢰해주셔서 감사합니다."</p>
                  <p className="text-[10px] text-gray-400 mt-2">{reportData.workerName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-5xl mx-auto px-8 py-40 border-t border-gray-100">
        <div className="text-center space-y-4 mb-24">
          <h3 className="text-3xl font-bold tracking-tighter uppercase">Price</h3>
          <p className="text-gray-400 text-sm tracking-[0.2em] uppercase">Simple & Transparent</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-4xl mx-auto">
          <div className="p-12 md:p-16 bg-gray-50/50 rounded-[2rem] text-center space-y-8 transition-colors hover:bg-gray-50">
            <h4 className="text-lg text-gray-400 tracking-widest uppercase">Basic</h4>
            <p className="text-5xl font-bold">₩0</p>
            <ul className="text-gray-500 text-sm space-y-4 pt-4">
              <li>월 10건 리포트 생성</li>
              <li>1주일 데이터 보관</li>
            </ul>
            <div className="pt-8">
              <button onClick={() => { setView('worker'); setStep(1); }} className="text-sm font-bold border-b border-black pb-1 hover:text-gray-500 hover:border-gray-500 transition-all">시작하기</button>
            </div>
          </div>
          
          <div className="p-12 md:p-16 bg-zinc-900 text-white rounded-[2rem] text-center space-y-8 soft-shadow hover:bg-black transition-colors">
            <h4 className="text-lg text-gray-400 tracking-widest uppercase">Pro</h4>
            <p className="text-5xl font-bold">₩9,900</p>
            <ul className="text-gray-300 text-sm space-y-4 pt-4">
              <li>무제한 리포트 생성</li>
              <li>클라우드 영구 보관</li>
            </ul>
            <div className="pt-8">
              <button onClick={handleProClick} className="text-sm font-bold border-b border-white pb-1 hover:text-gray-300 hover:border-gray-300 transition-all">시작하기</button>
            </div>
          </div>
        </div>
      </section>
      
      <section className="py-40 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-8 text-center space-y-16">
           <div className="space-y-6">
              <span className="text-[10px] text-gray-400 uppercase tracking-[0.4em]">The Evidence</span>
              <h3 className="text-4xl md:text-5xl font-bold text-black tracking-tighter leading-tight">
                백 마디 말보다 확실한 <br/>한 장의 리포트.
              </h3>
           </div>
           <p className="text-gray-500 text-lg">지금 바로 경험해보세요. 버튼 하나로 모든 작업이 포트폴리오가 됩니다.</p>
        </div>
      </section>
    </div>
  );

  const renderWorkerView = () => (
    <div className="max-w-3xl mx-auto px-8 py-40 animate-in slide-in-from-bottom-8 duration-700">
      {step === 1 ? (
        <div className="space-y-20">
          <div className="space-y-6">
            <button 
              onClick={() => setView('home')} 
              className="inline-flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-black hover:scale-105 transition-all shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)]"
            >
              ← Back to Home
            </button>
            <h2 className="text-4xl md:text-5xl font-bold text-black tracking-tighter pt-4">리포트 작성하기</h2>
          </div>

          <div className="space-y-12">
            {/* 제목 입력 */}
            <div className="space-y-4 border-b border-gray-100 pb-8">
              <label className="text-sm font-bold text-black tracking-widest">작업 제목</label>
              <input 
                type="text"
                className="w-full py-4 text-3xl font-bold text-black input-clean placeholder:text-gray-300" 
                value={reportData.title} 
                onChange={(e) => setReportData({...reportData, title: e.target.value})} 
                placeholder="예) 세면대 수전 교체 작업" 
              />
            </div>

            {/* Before */}
            <div className="space-y-6">
              <div onClick={() => beforeInputRef.current.click()} className="aspect-video bg-gray-50 rounded-3xl cursor-pointer overflow-hidden relative group transition-all hover:bg-gray-100 border border-gray-200">
                <input type="file" ref={beforeInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'beforeImg')} />
                {reportData.beforeImg ? (
                  <img src={reportData.beforeImg} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-10 h-10 text-gray-400" />
                    <span className="text-sm font-bold text-gray-500 tracking-widest">작업 전 사진</span>
                  </div>
                )}
              </div>
              <input 
                className="w-full py-4 text-gray-600 text-base input-clean" 
                value={reportData.beforeNote} 
                onChange={(e) => setReportData({...reportData, beforeNote: e.target.value})} 
                placeholder="사진에 대한 설명을 남겨주세요." 
              />
            </div>

            {/* After */}
            <div className="space-y-6">
              <div onClick={() => afterInputRef.current.click()} className="aspect-video bg-gray-50 rounded-3xl cursor-pointer overflow-hidden relative group transition-all soft-shadow border-2 border-transparent hover:border-black">
                <input type="file" ref={afterInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'afterImg')} />
                {reportData.afterImg ? (
                  <img src={reportData.afterImg} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-10 h-10 text-black" />
                    <span className="text-sm font-bold text-black tracking-widest">작업 후 사진</span>
                  </div>
                )}
              </div>
              <input 
                className="w-full py-4 text-black font-medium text-base input-clean" 
                value={reportData.afterNote} 
                onChange={(e) => setReportData({...reportData, afterNote: e.target.value})} 
                placeholder="사진에 대한 설명을 남겨주세요." 
              />
            </div>

            {/* 연락처 입력 (전송 전 필수) */}
            <div className="bg-gray-50 p-8 rounded-3xl space-y-4">
              <label className="text-sm font-bold text-black tracking-widest flex items-center gap-2">
                <Phone className="w-4 h-4" /> 고객 휴대폰 번호
              </label>
              <input 
                type="tel"
                className="w-full py-4 px-6 rounded-2xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none text-lg" 
                value={reportData.phoneNumber} 
                onChange={(e) => setReportData({...reportData, phoneNumber: e.target.value})} 
                placeholder="010-0000-0000" 
              />
              <p className="text-xs text-gray-400">입력하신 번호로 리포트가 전송됩니다.</p>
            </div>
          </div>

          <div className="pt-6">
            <button 
              onClick={handleSaveReport} 
              disabled={isSaving}
              className={`w-full ${isSaving ? 'bg-gray-200 text-gray-400' : 'bg-black text-white hover:bg-gray-800'} py-6 rounded-full text-lg font-bold transition-all active:scale-95 shadow-xl`}
            >
              {isSaving ? '전송 중...' : '전송하기'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-32 animate-in zoom-in duration-700 space-y-10">
          <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-black/30">
            <Check className="w-12 h-12 text-white" />
          </div>
          <div className="space-y-4">
            <h2 className="text-5xl font-bold text-black tracking-tighter">전송 완료</h2>
            <p className="text-gray-500 font-normal text-lg">고객님께 리포트가 성공적으로 발송되었습니다.</p>
          </div>
          <div className="pt-12 flex flex-col gap-4 items-center">
            {/* 리프레시 버튼 (새 리포트 작성) */}
            <button onClick={handleResetForm} className="bg-black text-white px-12 py-5 rounded-full font-bold text-lg hover:bg-gray-800 transition-all shadow-xl w-full max-w-sm">
              새 리포트 작성하기
            </button>
            <button onClick={() => setView('mypage')} className="text-sm font-bold border-b border-transparent hover:border-black pb-1 transition-all mt-4 text-gray-500 hover:text-black">
              내 보관함 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderMyPageView = () => (
    <div className="max-w-5xl mx-auto px-8 py-40 animate-in fade-in duration-700">
      <div className="space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-gray-100 pb-10">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-black tracking-tighter">마이페이지</h2>
            {user && !user.isAnonymous ? (
              <p className="text-gray-500">반갑습니다, <span className="font-bold text-black">{user.email || '익명 테스터'}</span>님!</p>
            ) : (
              <p className="text-gray-500">로그인이 필요합니다.</p>
            )}
          </div>
          {user && !user.isAnonymous && (
             <div className="bg-gray-50 px-6 py-3 rounded-2xl">
               <span className="text-xs text-gray-400 uppercase tracking-widest block mb-1">Total Reports</span>
               <span className="text-2xl font-bold">{myReports.length}</span>
             </div>
          )}
        </div>

        {!user || user.isAnonymous ? (
          <div className="text-center py-32 bg-gray-50 rounded-[3rem] space-y-6">
            <UserCircle className="w-16 h-16 text-gray-300 mx-auto" />
            <p className="text-gray-500">리포트 보관함을 보려면 로그인이 필요합니다.</p>
            <button onClick={handleGoogleLogin} className="bg-black text-white px-8 py-4 rounded-full font-bold hover:bg-gray-800">
              구글로 로그인하기
            </button>
          </div>
        ) : isLoadingReports ? (
          <div className="text-center py-20 text-gray-400">데이터를 불러오는 중입니다...</div>
        ) : myReports.length === 0 ? (
          <div className="text-center py-32 bg-gray-50 rounded-[3rem]">
             <p className="text-gray-500 mb-6">아직 작성하신 리포트가 없습니다.</p>
             <button onClick={() => { setView('worker'); setStep(1); }} className="border-b border-black font-bold pb-1">첫 리포트 작성하기</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {myReports.map((report) => (
              <div key={report.id} className="bg-white border border-gray-100 rounded-[2rem] p-6 soft-shadow hover:shadow-xl transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="font-bold text-xl leading-tight truncate pr-4">{report.title}</h3>
                  <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full whitespace-nowrap">
                    {report.createdAt ? new Date(report.createdAt.toMillis()).toLocaleDateString() : '방금 전'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-50 relative">
                    <img src={report.beforeImg} className="w-full h-full object-cover grayscale opacity-70" />
                    <span className="absolute bottom-2 left-2 text-[10px] bg-white/80 px-2 py-0.5 rounded-md font-bold">Before</span>
                  </div>
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-50 relative">
                    <img src={report.afterImg} className="w-full h-full object-cover" />
                    <span className="absolute bottom-2 left-2 text-[10px] bg-black text-white px-2 py-0.5 rounded-md font-bold">After</span>
                  </div>
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-2 border-t border-gray-50 pt-4">
                  <Phone className="w-4 h-4" /> {report.phoneNumber}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white min-h-screen selection:bg-gray-200 antialiased scroll-smooth">
      <GlobalStyles />
      {renderNavbar()}
      <main>
        {view === 'home' && renderHomeView()}
        {view === 'worker' && renderWorkerView()}
        {view === 'mypage' && renderMyPageView()}
      </main>
      <footer className="py-24 text-center border-t border-gray-50 mt-20">
        <p className="text-gray-300 text-[10px] tracking-[0.5em] uppercase">Beforeter</p>
      </footer>
    </div>
  );
};

export default App;