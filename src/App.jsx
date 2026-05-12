import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Camera, Send, CheckCircle2, Layout, ArrowRight, Smartphone, 
  FileText, Image as ImageIcon, ExternalLink, Star, Zap, MousePointer2 
} from 'lucide-react';

// --- [완료] 대표님의 실제 Firebase 설정값이 적용되었습니다 ---
const firebaseConfig = {
  apiKey: "AIzaSyA_XmIf672lF5y7VyjoK-7FIHdBITgiwnw",
  authDomain: "beforeter-72de2.firebaseapp.com",
  projectId: "beforeter-72de2",
  storageBucket: "beforeter-72de2.firebasestorage.app",
  messagingSenderId: "849691385148",
  appId: "1:849691385148:web:35b8a75e16e0b73f351239"
};

// 파이어베이스 서비스 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "beforeter-app"; // 프로젝트 식별자

const App = () => {
  const [view, setView] = useState('home');
  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // 기본 데이터 (대표님 제공 이미지 경로 적용)
  const [reportData, setReportData] = useState({
    title: '세면대 수전 교체 및 살균 세척',
    beforeImg: '/KakaoTalk_20260512_202910716.jpg', 
    beforeNote: '기존 수전 노후화로 인한 누수 및 오염 상태입니다.',
    afterImg: '/KakaoTalk_20260512_202910716_01.jpg',
    afterNote: '최신형 수전 교체 및 틈새 살균 세척을 완료했습니다.',
    generalNote: '오늘 작업 믿고 맡겨주셔서 감사합니다!',
    workerName: '수원 맥가이버 OOO'
  });

  const beforeInputRef = useRef(null);
  const afterInputRef = useRef(null);

  // [중요] Rule 3: Firestore 작업 전 익명 인증 수행
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 익명 로그인 시도
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

  const handleImageUpload = (e, type) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setReportData(prev => ({ ...prev, [type]: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  // 리포트 저장 로직 (Firestore)
  const handleSaveReport = async () => {
    if (!user) {
      alert("서버와 연결 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    setIsSaving(true);

    try {
      // [중요] Rule 1: 지정된 엄격한 경로에 데이터 저장
      // /artifacts/{appId}/public/data/{collectionName}
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), {
        ...reportData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        timestamp: new Date().toISOString()
      });
      setStep(2);
    } catch (error) {
      console.error("저장 에러:", error);
      alert("데이터 저장 중 오류가 발생했습니다. 파이어베이스 설정을 확인해 주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  const Header = () => (
    <div className="bg-white/90 backdrop-blur-md border-b sticky top-0 z-50 px-8 py-4 flex justify-between items-center shadow-sm">
      <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('home')}>
        <div className="bg-blue-600 p-2 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
          <Layout className="w-6 h-6 text-white" />
        </div>
        <h1 className="font-black text-2xl tracking-tighter text-slate-900 italic uppercase">Beforeter</h1>
      </div>
      <div className="flex gap-6 items-center font-bold">
        <button onClick={() => setView('home')} className={`text-sm ${view === 'home' ? 'text-blue-600' : 'text-slate-400'}`}>메인</button>
        <button onClick={() => setView('worker')} className={`bg-slate-900 text-white px-5 py-2 rounded-xl text-sm transition-all hover:bg-blue-600 shadow-lg active:scale-95`}>리포트 생성</button>
      </div>
    </div>
  );

  const HomeView = () => (
    <div className="animate-in fade-in duration-700 max-w-7xl mx-auto px-8 py-20 lg:py-32 grid lg:grid-cols-2 gap-16 items-center">
      <div className="space-y-8">
        <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full">
          <Zap className="w-4 h-4 text-blue-600 fill-current" />
          <span className="text-blue-700 text-xs font-black uppercase tracking-widest text-slate-800">3-Second Report Solution</span>
        </div>
        <h2 className="text-7xl font-black text-slate-900 leading-tight tracking-tighter">
          현장의 실력을 <br /> <span className="text-blue-600 underline underline-offset-8">데이터로 전송</span>하세요.
        </h2>
        <p className="text-2xl text-slate-500 leading-relaxed font-medium">
          사진 두 장으로 끝내는 전문성 증명. <br />
          **비포터**로 나만의 강력한 포트폴리오를 만드세요.
        </p>
        <button 
          onClick={() => setView('worker')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-black px-10 py-6 rounded-3xl shadow-2xl flex items-center gap-4 text-xl transition-all hover:-translate-y-2 shadow-blue-500/20"
        >
          리포트 만들기 시작 <ArrowRight className="w-7 h-7" />
        </button>
      </div>
      <div className="relative transform rotate-2 hidden lg:block">
         <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100 space-y-6">
            <div className="flex gap-4">
               <div className="aspect-square bg-slate-100 rounded-2xl flex-1 overflow-hidden">
                  <img src={reportData.beforeImg} className="w-full h-full object-cover grayscale" />
               </div>
               <div className="aspect-square bg-blue-50 rounded-2xl flex-1 overflow-hidden border-2 border-blue-500 shadow-inner">
                  <img src={reportData.afterImg} className="w-full h-full object-cover" />
               </div>
            </div>
            <div className="bg-slate-900 text-white p-5 rounded-2xl flex justify-between items-center shadow-lg">
               <span className="font-bold text-sm">카카오톡 리포트 전송 예시</span>
               <div className="bg-yellow-400 p-2 rounded-lg"><Send className="w-4 h-4 text-slate-900" /></div>
            </div>
         </div>
      </div>
    </div>
  );

  const WorkerView = () => (
    <div className="max-w-5xl mx-auto px-8 py-16 animate-in slide-in-from-bottom-8">
      {step === 1 ? (
        <div className="space-y-10">
          <div className="border-b pb-8">
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">Create Report</h2>
            <p className="text-slate-400 font-medium mt-2 italic">현장의 변화를 사진으로 기록하세요.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-300 uppercase tracking-widest italic ml-2">Phase: Before</label>
              <div onClick={() => beforeInputRef.current.click()} className="aspect-video bg-white rounded-3xl border-4 border-dashed border-slate-200 cursor-pointer overflow-hidden relative group hover:border-slate-300 transition-all shadow-sm">
                <input type="file" ref={beforeInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'beforeImg')} />
                <img src={reportData.beforeImg} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="w-12 h-12 text-white" /></div>
              </div>
              <textarea className="w-full p-5 rounded-2xl bg-white border-2 border-slate-100 h-24 resize-none font-medium shadow-sm focus:border-blue-300 outline-none text-slate-600" value={reportData.beforeNote} onChange={(e) => setReportData({...reportData, beforeNote: e.target.value})} placeholder="작업 전 상황 설명..." />
            </div>
            <div className="space-y-4">
              <label className="text-xs font-black text-blue-300 uppercase tracking-widest italic ml-2">Phase: After</label>
              <div onClick={() => afterInputRef.current.click()} className="aspect-video bg-white rounded-3xl border-4 border-dashed border-blue-200 cursor-pointer overflow-hidden relative group hover:border-blue-300 transition-all shadow-sm">
                <input type="file" ref={afterInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'afterImg')} />
                <img src={reportData.afterImg} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="w-12 h-12 text-white" /></div>
              </div>
              <textarea className="w-full p-5 rounded-2xl bg-white border-2 border-blue-100 h-24 resize-none font-bold shadow-sm focus:border-blue-400 outline-none text-slate-800" value={reportData.afterNote} onChange={(e) => setReportData({...reportData, afterNote: e.target.value})} placeholder="작업 후 결과 설명..." />
            </div>
          </div>
          <button 
            onClick={handleSaveReport} 
            disabled={isSaving}
            className={`w-full ${isSaving ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'} text-white font-black py-8 rounded-3xl text-2xl shadow-xl transition-all active:scale-95 shadow-blue-500/20`}
          >
            {isSaving ? '신뢰 데이터 저장 중...' : '카카오톡으로 전송하기'}
          </button>
        </div>
      ) : (
        <div className="text-center py-20 animate-in zoom-in">
          <div className="bg-green-100 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner"><CheckCircle2 className="w-12 h-12 text-green-600" /></div>
          <h2 className="text-6xl font-black text-slate-900 tracking-tighter italic">SUCCESS!</h2>
          <p className="text-xl text-slate-400 font-bold italic mt-4 uppercase">Data Recorded to Cloud</p>
          <div className="mt-12 flex justify-center gap-4">
            <button onClick={() => setView('home')} className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-bold shadow-xl hover:bg-slate-800 transition-all">홈으로 이동</button>
            <button onClick={() => {setStep(1); setView('worker');}} className="bg-white border-2 border-slate-200 text-slate-500 px-10 py-5 rounded-2xl font-bold hover:bg-slate-50 transition-all">새 리포트 쓰기</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-slate-50 min-h-screen font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900 antialiased">
      <Header />
      <main>{view === 'home' ? <HomeView /> : <WorkerView />}</main>
      <footer className="py-16 text-center border-t border-slate-100 mt-20 italic font-black uppercase text-slate-300 text-[10px] tracking-[0.4em]">
        Better Trust, Better Business · Beforeter
      </footer>
    </div>
  );
};

export default App;