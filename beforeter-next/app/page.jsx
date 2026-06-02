"use client";
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  OAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  setPersistence, 
  browserLocalPersistence 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  query, 
  onSnapshot, 
  serverTimestamp, 
  updateDoc, 
  deleteDoc, 
  where 
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadString, 
  getDownloadURL 
} from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const kakaoProvider = new OAuthProvider('oidc.kakao');
const db = getFirestore(app); 
const storage = getStorage(app); 

const APP_ID = 'beforeter-app';
const APP_VERSION = 'v1.0.2 (2026-05-31 배포)';

const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

const TERMS_OF_SERVICE = `
제1조 (목적)
본 약관은 "비포터(Beforeter)" (이하 "회사"라 합니다)가 제공하는 작업 리포트 생성 및 공유 서비스(이하 "서비스"라 합니다)의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

제2조 (용어의 정의)
1. "서비스"라 함은 구현되는 단말기(PC, TV, 휴대형단말기 등의 각종 유무선 장치를 포함)와 상관없이 "회원"이 이용할 수 있는 비포터 관련 제반 서비스를 의미합니다.
2. "회원"이라 함은 회사의 "서비스"에 접속하여 이 약관에 따라 "회사"와 이용계약을 체결하고 "회사"가 제공하는 "서비스"를 이용하는 고객을 말합니다.
3. "리포트"라 함은 "회원"이 "서비스"를 이용하여 생성한 텍스트, 이미지 등의 결과물을 의미합니다.

제3조 (약관의 게시와 개정)
1. "회사"는 이 약관의 내용을 "회원"이 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.
2. "회사"는 "약관의 규제에 관한 법률", "정보통신망 이용촉진 및 정보보호 등에 관한 법률" 등 관련 법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.

제4조 (이용계약 체결)
1. 이용계약은 "회원"이 되고자 하는 자가 약관의 내용에 대하여 동의를 한 다음 회원가입신청을 하고 "회사"가 이러한 신청에 대하여 승낙함으로써 체결됩니다.
2. 구글, 카카오 등 외부 플랫폼 연동을 통한 가입 시, 해당 플랫폼의 제공 정보 활용에 동의한 것으로 간주합니다.

제5조 (회원의 의무)
"회원"은 다음 행위를 하여서는 안 됩니다.
1. 타인의 정보 도용
2. "회사"가 게시한 정보의 변경
3. 허위 작업 결과물(Before/After) 업로드 및 기만 행위
4. 외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 공개 또는 게시하는 행위
`;

const PRIVACY_POLICY = `
1. 개인정보의 수집 및 이용 목적
회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며 이용 목적이 변경되는 경우에는 관련 법령에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
- 회원 가입 및 관리: 서비스 이용 의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리
- 서비스 제공: 리포트 생성, 공유 기능 제공, 맞춤형 서비스 제공
- 고충 처리: 민원인의 신원 확인, 민원사항 확인, 사실조사를 위한 연락·통지, 처리결과 통보

2. 수집하는 개인정보의 항목
- 필수항목: 이메일 주소, 이름(닉네임), 프로필 사진, 식별자(SNS 로그인 시)
- 선택항목: 사업자등록번호, 상호명, 연락처, 자기소개, 전문분야 키워드

3. 개인정보의 보유 및 이용기간
회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
- 회원 탈퇴 시까지 (단, 관계 법령에 따라 보존할 필요가 있는 경우 해당 법령에서 정한 기간 동안 보존)
`;

export default function App() {
  const [currentView, setCurrentView] = useState('feed'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [currentUser, setCurrentUser] = useState(null); 
  const [feedData, setFeedData] = useState([]); 
  const [notifications, setNotifications] = useState([]);
  const [myFeedbacks, setMyFeedbacks] = useState([]); 
  const [appUpdateNoti, setAppUpdateNoti] = useState(null); 
  const [pendingBizUsers, setPendingBizUsers] = useState([]); 
  
  const getInitialBlocked = () => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('beporter_blocked');
      return stored ? JSON.parse(stored) : [];
    } catch(e) {
      return [];
    }
  };
  const [blockedUsers, setBlockedUsers] = useState(getInitialBlocked());
  
  const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState(false);
  const [currentPhotoTarget, setCurrentPhotoTarget] = useState(null); 
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); 
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNotiModalOpen, setIsNotiModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isAlimtalkModalOpen, setIsAlimtalkModalOpen] = useState(false);
  const [isAlimtalkSending, setIsAlimtalkSending] = useState(false); 
  
  const [postOptionsMenu, setPostOptionsMenu] = useState(null); 
  const [isReportPostModalOpen, setIsReportPostModalOpen] = useState(false);
  const [publicProfileUser, setPublicProfileUser] = useState(null); 
  const [isUploading, setIsUploading] = useState(false); 
  const [confirmDialog, setConfirmDialog] = useState({ show: false, msg: '', onConfirm: null });
  
  const banners = [
    { title: "나를 증명하는 포트폴리오", desc: "10초 완성 비포터 리포트" },
    { title: "고객 신뢰도 200% 상승", desc: "깔끔한 리포트로 전문성을 어필하세요" },
    { title: "가치를 높이는 확실한 방법", desc: "Before & After, 결과를 보여주세요" }
  ];
  const [bannerIdx, setBannerIdx] = useState(0);

  const getToday = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };
  
  const [taskDate, setTaskDate] = useState(getToday());
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState('기타');
  const [uploadMode, setUploadMode] = useState('single'); 
  const [isPrivateUpload, setIsPrivateUpload] = useState(false); 
  const defaultSpace = { id: 1, spaceName: '', beforeImg: '', afterImg: '', desc: '' };
  const [spaces, setSpaces] = useState([{...defaultSpace}]);
  
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('기능 관련');
  const [toastMsg, setToastMsg] = useState({ show: false, msg: '' });
  const [shareLocation, setShareLocation] = useState(true);
  const [currentLocation, setCurrentLocation] = useState('위치 파악 중...');
  
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState(''); 
  const [editBizNum, setEditBizNum] = useState(''); 
  const [editProfilePic, setEditProfilePic] = useState('');
  const [editIntro, setEditIntro] = useState('');
  const [editKeywords, setEditKeywords] = useState('');

  const [latestReportId, setLatestReportId] = useState('');
  const [detailReport, setDetailReport] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [editDocTitle, setEditDocTitle] = useState('');
  const [editDocStatus, setEditDocStatus] = useState('public');
  const [commentInput, setCommentInput] = useState('');
  const [detailViewMode, setDetailViewMode] = useState('horizontal'); 
  const [flippedCards, setFlippedCards] = useState({}); 
  const [selectedImage, setSelectedImage] = useState(null); 
  const [alimtalkPhone, setAlimtalkPhone] = useState('');
  
  const [feedFilter, setFeedFilter] = useState('전체'); 
  const [reportReason, setReportReason] = useState('');
  
  const categories = ['전체', '인테리어', '청소', '미용', '건설', '기타'];

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const profilePicRef = useRef(null);

  const sendEmailNotification = async (subject, message) => {
    if (!EMAILJS_SERVICE_ID) {
        console.warn("EmailJS 키가 설정되지 않아 메일을 발송하지 못했습니다.");
        return;
    }
    
    try {
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_id: EMAILJS_SERVICE_ID,
                template_id: EMAILJS_TEMPLATE_ID,
                user_id: EMAILJS_PUBLIC_KEY,
                template_params: { subject: subject, message: message }
            })
        });
        if (response.ok) console.log("EmailJS 전송 성공");
        else console.error("EmailJS 전송 실패:", await response.text());
    } catch (error) {
        console.error("EmailJS 네트워크 전송 에러:", error);
    }
  };

  const updateMetaTags = (report) => {
    if (!report) return;
    document.title = `${report.title} - 비포터`;
    const setMeta = (property, content, isName = false) => {
      let element = document.querySelector(`meta[${isName ? 'name' : 'property'}="${property}"]`);
      if (!element) {
        element = document.createElement('meta');
        if (isName) element.setAttribute('name', property);
        else element.setAttribute('property', property);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    const description = `[${report.authorName}] 프로님의 작업 결과물을 확인해보시겠어요?\n📅 작업일: ${report.taskDate}\n📍 장소: ${report.location || '미상'}`;
    const coverImg = report.spaces && report.spaces.length > 0 ? report.spaces[0].afterImg : (report.afterImg || 'https://www.beforeter.com/default-og.png');

    setMeta('og:title', `${report.title} - 비포터`);
    setMeta('og:description', description);
    setMeta('og:image', coverImg);
    setMeta('og:type', 'website');
    setMeta('og:site_name', '비포터');
    setMeta('description', description, true);
  };

  useEffect(() => {
    const storedVersion = localStorage.getItem('beporter_version');
    if (storedVersion !== APP_VERSION) {
        setAppUpdateNoti({
            id: 'sys_update_' + Date.now(),
            type: 'system',
            fromName: '비포터 관리자',
            text: `새로운 버전이 배포되었습니다! (${APP_VERSION}) 🚀`,
            isRead: false
        });
    }

    const handleRouting = async (path, isPop = false) => {
        if (path === '/' || path === '') {
            setCurrentView('feed');
            document.title = "비포터 - 당신의 작업 파트너";
        } else if (path.startsWith('/report/')) {
            const rid = path.split('/report/')[1];
            if(rid) {
                setCurrentView('detail');
                setIsDetailLoading(true);
                try {
                    const docSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', rid));
                    if(docSnap.exists()) {
                        const reportData = { id: docSnap.id, ...docSnap.data() };
                        setDetailReport(reportData);
                        updateMetaTags(reportData);
                    }
                    else { showToast("존재하지 않는 리포트입니다."); setCurrentView('feed'); }
                } catch(e) { showToast("오류가 발생했습니다."); setCurrentView('feed'); }
                finally { setIsDetailLoading(false); }
            }
        } else if (path.startsWith('/profile/')) {
            const uid = path.split('/profile/')[1];
            if(uid) {
                setCurrentView('public-profile');
                setIsDetailLoading(true);
                try {
                    const userSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', uid));
                    if(userSnap.exists()) setPublicProfileUser(userSnap.data());
                    else setPublicProfileUser({ id: uid, name: '알 수 없는 사용자', intro: '', keywords: [] });
                } catch(e) { showToast("오류가 발생했습니다."); setCurrentView('feed'); }
                finally { setIsDetailLoading(false); }
            }
        }
    };

    handleRouting(window.location.pathname);
    const popStateHandler = () => handleRouting(window.location.pathname, true);
    window.addEventListener('popstate', popStateHandler);
    return () => window.removeEventListener('popstate', popStateHandler);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setBannerIdx(prev => (prev + 1) % banners.length), 3500);
    return () => clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          let userData = {
            id: user.uid, 
            name: user.displayName || '작업자', 
            company: '',
            bizNum: '',
            bizStatus: 'none',
            affiliation: '', 
            profilePic: user.photoURL || '', 
            intro: '', 
            keywords: [], 
            email: user.email || '', 
            provider: user.providerData[0]?.providerId === 'oidc.kakao' ? 'Kakao' : 'Google'
          };
          
          if (userSnap.exists()) {
            userData = { ...userData, ...userSnap.data(), id: user.uid };
          } else {
            await setDoc(userRef, userData);
            sendEmailNotification(
                `[비포터] 🎉 새로운 작업자 회원가입!`,
                `이름: ${userData.name}\n이메일: ${userData.email}\n가입 플랫폼: ${userData.provider}`
            );
          }
          setCurrentUser(userData);
        } catch (error) {
          setCurrentUser({
            id: user.uid, name: user.displayName || '작업자', profilePic: user.photoURL || '', email: user.email || '', provider: 'Google'
          });
        }
        
        try {
          const notiQ = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'notifications'), where("targetUserId", "==", user.uid));
          onSnapshot(notiQ, (snap) => {
            const notis = [];
            snap.forEach(d => notis.push({ id: d.id, ...d.data() }));
            notis.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setNotifications(notis);
          });
        } catch (e) { console.error(e); }

        try {
          const fbQ = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'feedbacks'), where("userId", "==", user.uid));
          onSnapshot(fbQ, (snap) => {
            const fbs = [];
            snap.forEach(d => fbs.push({ id: d.id, ...d.data() }));
            fbs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setMyFeedbacks(fbs);
          });
        } catch (e) { console.error(e); }

        if (user.email === 'jinthemoon@kakao.com') {
            try {
                const adminQ = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'users'), where("bizStatus", "==", "pending"));
                onSnapshot(adminQ, (snap) => {
                    const pUsers = [];
                    snap.forEach(d => pUsers.push({ id: d.id, ...d.data() }));
                    setPendingBizUsers(pUsers);
                });
            } catch (e) { console.error(e); }
        }
      } else { 
        setCurrentUser(null); setNotifications([]); setMyFeedbacks([]); setPendingBizUsers([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reports'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reports = [];
      snapshot.forEach((doc) => reports.push({ id: doc.id, ...doc.data() }));
      reports.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setFeedData(reports);
      
      if (detailReport) {
        const updated = reports.find(r => r.id === detailReport.id);
        if (updated) { setDetailReport(updated); updateMetaTags(updated); }
      }
    });
    return () => unsubscribe();
  }, [detailReport]);

  useEffect(() => {
    if (currentView === 'upload' && shareLocation) {
      setCurrentLocation('현재 위치 찾는 중 📍...');
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const { latitude, longitude } = pos.coords;
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`);
              const data = await res.json();
              const address = data.address;
              setCurrentLocation(`${address.city || address.province || "경기도"} ${address.suburb || address.town || "수원시"}`.trim());
            } catch (e) { setCurrentLocation('경기도 수원시'); }
          },
          (err) => setCurrentLocation('위치 권한 거부됨')
        );
      } else { setCurrentLocation('위치 기능 미지원 기기'); }
    }
  }, [currentView, shareLocation]);

  const showToast = (msg) => { 
    setToastMsg({ show: true, msg }); 
    setTimeout(() => setToastMsg({ show: false, msg: '' }), 3000); 
  };
  
  const switchView = (view) => { 
    if (view === 'feed' && (window.location.pathname.includes('/report/') || window.location.pathname.includes('/profile/'))) {
      window.history.pushState({}, '', '/'); 
      document.title = "비포터 - 당신의 작업 파트너";
    }
    setCurrentView(view); window.scrollTo(0, 0); 
  };
  
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  
  const checkAuthAndAction = (cb) => { 
    if (!currentUser) { showToast("로그인이 필요합니다."); switchView('login'); } 
    else { cb(); }
  };
  
  const triggerConfirm = (msg, action) => {
    setConfirmDialog({ show: true, msg, onConfirm: () => { action(); setConfirmDialog({show: false, msg:'', onConfirm:null}); } });
  };

  const processGoogleLogin = async () => {
    if (!termsAgreed || !privacyAgreed) return showToast("서비스 이용약관 및 개인정보 수집에 동의해주세요.");
    try { 
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider); 
      showToast(`환영합니다! 구글 로그인이 완료되었습니다.`); switchView('feed'); 
    } catch (error) { 
      if (error.code === 'auth/unauthorized-domain') triggerConfirm("도메인 미승인 에러", () => {});
      else showToast("구글 로그인에 실패했습니다."); 
    }
  };

  const processKakaoLogin = async () => {
    if (!termsAgreed || !privacyAgreed) return showToast("서비스 이용약관 및 개인정보 수집에 동의해주세요.");
    try { 
      kakaoProvider.setCustomParameters({ prompt: 'select_account' });
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, kakaoProvider); 
      showToast(`환영합니다! 카카오톡 로그인이 완료되었습니다.`); switchView('feed'); 
    } catch (error) { 
      if (error.code === 'auth/unauthorized-domain') triggerConfirm("도메인 미승인 에러", () => {});
      else showToast("카카오 로그인 실패"); 
    }
  };

  const processLogout = async () => {
    try { await signOut(auth); showToast('로그아웃 되었습니다.'); setIsMenuOpen(false); switchView('feed'); } 
    catch (error) { showToast("로그아웃 실패"); }
  };

  const formatBizNum = (value) => {
    const raw = value.replace(/[^0-9]/g, '');
    if (raw.length < 4) return raw;
    if (raw.length < 6) return raw.substring(0, 3) + '-' + raw.substring(3);
    return raw.substring(0, 3) + '-' + raw.substring(3, 5) + '-' + raw.substring(5, 10);
  };

  const handleBizNumChange = (e) => setEditBizNum(formatBizNum(e.target.value));

  const openProfileEdit = () => { 
    setEditName(currentUser.name || ''); setEditCompany(currentUser.company || '');
    setEditBizNum(currentUser.bizNum || ''); setEditProfilePic(currentUser.profilePic || ''); 
    setEditIntro(currentUser.intro || ''); setEditKeywords((currentUser.keywords || []).join(', '));
    setIsProfileModalOpen(true); 
  };

  const resizeAndCompressImage = (file, callback, maxWidth = 800) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image(); img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width; let height = img.height;
        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
    reader.readAsDataURL(file);
  };

  const handleProfilePicSelect = (e) => { 
    if (e.target.files[0]) resizeAndCompressImage(e.target.files[0], setEditProfilePic, 400); 
    e.target.value = ''; 
  };

  const saveProfile = async () => {
    if (!editName.trim()) return showToast("이름을 입력해주세요.");
    const kwdArray = editKeywords.split(',').map(k => k.trim()).filter(k => k !== '').slice(0, 5);
    let newBizStatus = currentUser.bizStatus || 'none';
    const isBizNumChanged = editBizNum !== currentUser.bizNum;
    
    if (isBizNumChanged && editBizNum.length === 12) newBizStatus = 'pending';
    else if (editBizNum === '') newBizStatus = 'none';

    const updatedUser = { 
      ...currentUser, name: editName, company: editCompany, bizNum: editBizNum,
      bizStatus: newBizStatus, profilePic: editProfilePic, intro: editIntro, keywords: kwdArray 
    };
    
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', currentUser.id), updatedUser);
      setCurrentUser(updatedUser); setIsProfileModalOpen(false); showToast("프로필이 저장되었습니다.");
      if (newBizStatus === 'pending') {
          sendEmailNotification(`[비포터] 🏢 사업자 번호 검수 요청`, `사용자: ${currentUser.name}`);
          showToast("사업자 번호 검수가 요청되었습니다.");
      }
    } catch(e) { showToast("프로필 저장에 실패했습니다."); }
  };

  const approveBiz = async (userId, userName) => {
    triggerConfirm(`[${userName}]님의 사업자를 승인하시겠습니까?`, async () => {
        try { await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', userId), { bizStatus: 'approved' }); showToast("승인 완료"); }
        catch(e) { showToast("승인 실패"); }
    });
  };

  const rejectBiz = async (userId, userName) => {
    triggerConfirm(`[${userName}]님의 사업자를 거절하시겠습니까?`, async () => {
        try { await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', userId), { bizStatus: 'none', bizNum: '' }); showToast("거절 완료"); }
        catch(e) { showToast("거절 실패"); }
    });
  };

  const openPhotoSheet = (index, type) => { setCurrentPhotoTarget({ index, type }); setIsPhotoSheetOpen(true); };
  
  const triggerPhotoInput = (type) => { 
    setIsPhotoSheetOpen(false); 
    if (type === 'camera') cameraInputRef.current.click(); else galleryInputRef.current.click();
  };
  
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert("이미지 용량이 너무 큽니다. 10MB 이하의 사진만 업로드 가능합니다.");
        e.target.value = ''; return;
      }
      if (currentPhotoTarget) {
        resizeAndCompressImage(file, (compressedStr) => {
          const newSpaces = [...spaces];
          if (currentPhotoTarget.type === 'before') newSpaces[currentPhotoTarget.index].beforeImg = compressedStr;
          else newSpaces[currentPhotoTarget.index].afterImg = compressedStr;
          setSpaces(newSpaces);
        }, 1000); 
      }
    }
    e.target.value = ''; 
  };

  const handleSpaceDescChange = (index, type, value) => {
    const newSpaces = [...spaces];
    if(type === 'desc') newSpaces[index].desc = value;
    if(type === 'name') newSpaces[index].spaceName = value;
    setSpaces(newSpaces);
  };

  const addSpace = () => setSpaces([...spaces, { id: Date.now(), spaceName: '', beforeImg: '', afterImg: '', desc: '' }]);
  const removeSpace = (index) => { const newSpaces = [...spaces]; newSpaces.splice(index, 1); setSpaces(newSpaces); };

  const saveAndShareReport = async () => {
    if (!taskTitle || !taskDate) return showToast("작업 일자와 제목을 입력해주세요!");
    if (spaces.some(sp => !sp.beforeImg || !sp.afterImg)) return showToast("모든 사진을 첨부해주세요!");

    setIsUploading(true); showToast("저장 중...");
    try {
      const timeStamp = Date.now();
      const snap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reports'));
      const reportNo = String(snap.size + 1).padStart(6, '0');
      
      const uploadedSpaces = await Promise.all(spaces.map(async (sp, idx) => {
          let bUrl = sp.beforeImg; let aUrl = sp.afterImg;
          if(bUrl.startsWith('data:')) {
            const bRef = ref(storage, `reports/${currentUser.id}/${timeStamp}_${idx}_before.jpg`);
            await uploadString(bRef, bUrl, 'data_url'); bUrl = await getDownloadURL(bRef);
          }
          if(aUrl.startsWith('data:')) {
            const aRef = ref(storage, `reports/${currentUser.id}/${timeStamp}_${idx}_after.jpg`);
            await uploadString(aRef, aUrl, 'data_url'); aUrl = await getDownloadURL(aRef);
          }
          return { ...sp, beforeImg: bUrl, afterImg: aUrl };
      }));
      
      const docRef = await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reports'), {
        reportNo, authorId: currentUser.id, authorName: currentUser.name || '작업자', authorCompany: currentUser.company || '',
        authorPic: currentUser.profilePic || '', title: taskTitle, taskDate, category: taskCategory, spaces: uploadedSpaces, 
        status: isPrivateUpload ? 'private' : 'public', history: [], comments: [], likes: [], location: shareLocation ? currentLocation : '', createdAt: serverTimestamp()
      });
      
      sendEmailNotification(`[비포터] 🚀 새 리포트 등록`, `작성자: ${currentUser.name}\n제목: ${taskTitle}`);
      setLatestReportId(docRef.id); setIsFinishModalOpen(true);
    } catch (error) { showToast("업로드 오류가 발생했습니다."); } finally { setIsUploading(false); }
  };

  const openDetailView = async (reportId, isInitial = false) => {
    setCurrentView('detail'); setIsDetailLoading(true); setDetailViewMode('horizontal'); setFlippedCards({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const docSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', reportId));
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setDetailReport(data); updateMetaTags(data);
        if(!isInitial) window.history.pushState({}, '', '/report/' + reportId);
      } else { showToast("존재하지 않는 리포트입니다."); switchView('feed'); }
    } catch (err) { showToast("오류가 발생했습니다."); switchView('feed'); } finally { setIsDetailLoading(false); }
  };

  const openReportEdit = () => { setEditDocTitle(detailReport.title); setEditDocStatus(detailReport.status || 'public'); setIsEditModalOpen(true); };

  const submitReportEdit = async () => {
    setIsEditModalOpen(false); showToast("저장 중...");
    try {
      const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', detailReport.id);
      const newHistoryLog = { date: new Date().toLocaleDateString('ko-KR') + ' ' + new Date().toLocaleTimeString('ko-KR', {hour12:false, hour:'2-digit', minute:'2-digit'}), action: '제목/상태 변경' };
      await updateDoc(docRef, { title: editDocTitle, status: editDocStatus, history: [...(detailReport.history || []), newHistoryLog] });
      showToast("수정되었습니다.");
    } catch (e) { showToast("수정에 실패했습니다."); }
  };

  const deleteReport = async () => {
    triggerConfirm("이 리포트를 삭제하시겠습니까?", async () => {
      setIsEditModalOpen(false);
      try { await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', detailReport.id)); showToast("삭제 완료"); switchView('feed'); } catch(e) { showToast("삭제 실패"); }
    });
  };

  const copyLink = (id) => {
    const textarea = document.createElement('textarea'); textarea.value = `https://www.beforeter.com/report/${id}`;
    document.body.appendChild(textarea); textarea.select();
    try { document.execCommand('copy'); showToast("주소가 복사되었습니다."); } catch (err) { showToast("복사 실패"); } finally { document.body.removeChild(textarea); }
  };
  
  const copyProfileLink = (id) => {
    const textarea = document.createElement('textarea'); textarea.value = `https://www.beforeter.com/profile/${id}`;
    document.body.appendChild(textarea); textarea.select();
    try { document.execCommand('copy'); showToast("프로필 주소가 복사되었습니다."); } catch (err) { showToast("복사 실패"); } finally { document.body.removeChild(textarea); }
  };

  const sendAlimtalk = async () => {
    if(alimtalkPhone.length < 10) return showToast("올바른 연락처를 입력해주세요.");
    setIsAlimtalkSending(true); showToast(`${alimtalkPhone} 님에게 전송 요청 중...`);
    try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        showToast(`전송이 완료되었습니다.`); setIsAlimtalkModalOpen(false); setAlimtalkPhone('');
    } catch (error) { showToast("전송 중 오류 발생"); } finally { setIsAlimtalkSending(false); }
  };

  const submitComment = async () => {
    if (!commentInput.trim()) return;
    if (!currentUser) return showToast("로그인 후 이용 가능합니다.");
    const newComment = { id: crypto.randomUUID(), authorId: currentUser.id, authorName: currentUser.name, authorPic: currentUser.profilePic, text: commentInput.trim(), createdAt: Date.now() };
    try {
        const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', detailReport.id);
        const updatedComments = [...(detailReport.comments || []), newComment];
        await updateDoc(docRef, { comments: updatedComments });
        setDetailReport(prev => ({ ...prev, comments: updatedComments })); setCommentInput(''); showToast("댓글 등록 완료");
        if(detailReport.authorId !== currentUser.id) {
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'notifications'), { targetUserId: detailReport.authorId, type: 'comment', fromName: currentUser.name, reportId: detailReport.id, isRead: false, createdAt: serverTimestamp() });
        }
    } catch(e) { showToast("댓글 등록 실패"); }
  };

  const handleToggleLike = async (report, e) => {
    if (e) e.stopPropagation(); 
    if (!currentUser) return showToast("로그인 후 이용 가능합니다.");
    const isLiked = report.likes?.includes(currentUser.id);
    let newLikes = report.likes || [];
    if (isLiked) newLikes = newLikes.filter(id => id !== currentUser.id); else newLikes.push(currentUser.id);
    try {
        const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', report.id);
        await updateDoc(docRef, { likes: newLikes });
        if (detailReport && detailReport.id === report.id) setDetailReport(prev => ({ ...prev, likes: newLikes }));
        if(!isLiked && report.authorId !== currentUser.id) {
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'notifications'), { targetUserId: report.authorId, type: 'like', fromName: currentUser.name, reportId: report.id, isRead: false, createdAt: serverTimestamp() });
        }
    } catch(err) { showToast("요청 처리 실패"); }
  };

  const submitFeedback = async () => { 
    if (!feedbackText.trim()) return showToast("내용을 입력해주세요."); 
    try {
      const fbData = { userId: currentUser?.id || 'anonymous', email: currentUser?.email || '비로그인', category: feedbackCategory, text: feedbackText, createdAt: serverTimestamp() };
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'feedbacks'), fbData);
      sendEmailNotification(`[비포터] 💡 피드백 접수`, `내용:\n${feedbackText}`);
      showToast("소중한 의견 감사합니다!"); setIsFeedbackModalOpen(false); setFeedbackText(''); setFeedbackCategory('기능 관련');
    } catch(e) { showToast("전송 오류"); }
  };

  const handleOpenNoti = () => setIsNotiModalOpen(true);

  const markAllNotisAsRead = async () => {
    if (appUpdateNoti && !appUpdateNoti.isRead) { localStorage.setItem('beporter_version', APP_VERSION); setAppUpdateNoti(prev => ({ ...prev, isRead: true })); }
    notifications.forEach(async (noti) => {
      if(!noti.isRead) { try { await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'notifications', noti.id), { isRead: true }); } catch (e) {} }
    });
    showToast("읽음 처리 완료");
  };

  const blockUser = () => {
    if(!postOptionsMenu) return;
    triggerConfirm("이 작업자의 게시물을 차단하시겠습니까?", () => {
      const newBlocked = [...blockedUsers, postOptionsMenu.authorId];
      setBlockedUsers(newBlocked); localStorage.setItem('beporter_blocked', JSON.stringify(newBlocked));
      showToast("차단되었습니다."); setPostOptionsMenu(null); if(currentView === 'detail') switchView('feed');
    });
  };

  const submitReportPost = async () => {
    if(!reportReason.trim()) return showToast("사유를 입력해주세요.");
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reports_flagged'), { reporterId: currentUser.id, reportId: postOptionsMenu.reportId, reason: reportReason, createdAt: serverTimestamp() });
      showToast("신고가 접수되었습니다."); setIsReportPostModalOpen(false); setReportReason(''); setPostOptionsMenu(null);
    } catch(e) { showToast("신고 접수 실패"); }
  };

  const showPublicProfile = async (authorId, forceOpen = false) => {
    if(currentUser && currentUser.id === authorId && !forceOpen) { switchView('mypage'); return; }
    setIsDetailLoading(true);
    try {
      const userSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', authorId));
      if(userSnap.exists()) setPublicProfileUser(userSnap.data()); else setPublicProfileUser({ id: authorId, name: '작업자', intro: '소개가 없습니다.', keywords: [], profilePic: '' });
      setCurrentView('public-profile');
      if(!forceOpen) window.history.pushState({}, '', '/profile/' + authorId);
    } catch(e) { showToast("프로필을 불러오지 못했습니다."); } finally { setIsDetailLoading(false); }
  };

  const formatDisplayTime = (item) => {
    let displayStr = item.taskDate ? item.taskDate.replace(/-/g, '.') : "날짜 미상";
    if (item.location) displayStr += ` • ${item.location}`;
    return displayStr;
  };
  
  const toggleFlip = (idx) => setFlippedCards(prev => ({ ...prev, [idx]: !prev[idx] }));

  const publicFeeds = feedData.filter(f => f.status === 'public' && !blockedUsers.includes(f.authorId));
  const displayedFeeds = feedFilter === '전체' ? publicFeeds : publicFeeds.filter(f => (f.category || '기타') === feedFilter);
  const myFeeds = currentUser ? feedData.filter(f => f.authorId === currentUser.id) : [];
  const publicProfileFeeds = publicProfileUser ? publicFeeds.filter(f => f.authorId === publicProfileUser.id) : [];
  const unreadNotis = notifications.filter(n => !n.isRead).length + (appUpdateNoti && !appUpdateNoti.isRead ? 1 : 0);

  const renderFooter = () => (
    <div className="common-footer">
        <div className="footer-links">
            <span onClick={() => setIsTermsModalOpen(true)}>이용약관</span>
            <span className="divider">|</span>
            <span onClick={() => setIsTermsModalOpen(true)}>개인정보처리방침</span>
        </div>
        <div className="footer-info">
            <p>상호명: 비포터 | 대표자명: 황진웅</p>
            <p>사업자등록번호: 789-05-03779</p>
            <p>통신판매업 신고: 2026-수원팔달-0431</p>
            <p>이메일: jinthemoon@kakao.com</p>
            <p className="copyright">© Beforeter. All rights reserved.</p>
        </div>
    </div>
  );

  return (
    <div className="app-wrapper">
      <style>{`
        /* 글로벌 설정 및 초기화 - T-Pirates 스타일 미니멀리즘 적용 */
        html { overflow-y: scroll; }
        body { 
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif; 
            background-color: #f3f4f6; /* 약간의 바탕색으로 콘텐츠 카드와 구분 */
            margin: 0; padding: 0; 
            color: #111; 
            -webkit-tap-highlight-color: transparent; 
            overflow-x: hidden; 
        }
        
        :root { 
            --primary: #000000; /* 메인 컬러: 완전한 검정 */
            --primary-hover: #333333; 
            --primary-light: #f9fafb; /* 극도로 옅은 회색 */
            --card-bg: #ffffff; 
            --text-main: #000000; 
            --text-sub: #666666; 
            --danger: #ef4444;
            --kakao: #FEE500;
            --kakao-text: #000000;
            --border-color: #e5e5e5;
            --border-focus: #000000;
        }
        
        .app-wrapper { 
            max-width: 480px; margin: 0 auto; min-height: 100vh; 
            background-color: #ffffff; 
            box-shadow: 0 0 40px rgba(0,0,0,0.05); /* 앱 전체 래퍼에만 부드러운 그림자 */
            position: relative; display: flex; flex-direction: column;
            border-left: 1px solid var(--border-color);
            border-right: 1px solid var(--border-color);
        }
        
        /* 헤더 스타일링 - 솔리드하고 깨끗한 라인 */
        .app-header { 
            position: sticky; top: 0; left: 0; width: 100%; height: 56px; 
            background-color: rgba(255,255,255,0.95); backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: space-between; padding: 0 16px; 
            z-index: 50; border-bottom: 1px solid var(--border-color); box-sizing: border-box;
        }
        
        .header-icon { 
            background: none; border: none; color: var(--text-main); font-size: 24px; 
            cursor: pointer; padding: 8px; border-radius: 50%; transition: background-color 0.2s;
        }
        .header-icon:active { background-color: var(--primary-light); }
        
        .header-title { 
            font-size: 18px; font-weight: 900; color: var(--primary); 
            letter-spacing: -0.5px; cursor: pointer; text-transform: uppercase; 
        }
        
        .view-section { 
            padding-bottom: 100px; flex: 1; box-sizing: border-box; 
            background: #ffffff; display: flex; flex-direction: column;
        }
        
        /* 브랜드 배너 - 강렬한 모노톤 대비 */
        .brand-hook-card { 
            background: var(--primary); color: white; 
            padding: 24px 20px; border-radius: 12px; margin-bottom: 24px; 
            text-align: left; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center;
        }
        
        .brand-hook-card h3 { margin: 0 0 8px 0; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
        .brand-hook-card p { margin: 0; font-size: 14px; opacity: 0.8; line-height: 1.5; font-weight: 400; }
        
        /* 필터 칩 */
        .filter-scroll { 
            display: flex; gap: 8px; overflow-x: auto; padding: 0 20px 16px 20px; 
            margin: 0; scrollbar-width: none; border-bottom: 1px solid var(--border-color);
        }
        .filter-scroll::-webkit-scrollbar { display: none; }
        
        .filter-chip { 
            padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 700; 
            background: #ffffff; color: var(--text-sub); border: 1px solid var(--border-color); 
            white-space: nowrap; cursor: pointer; transition: all 0.2s; 
        }
        .filter-chip.active { 
            background: var(--primary); color: white; border-color: var(--primary); 
        }

        /* 피드 카드 - 미니멀 카드 디자인 */
        .feed-container { padding: 20px; flex: 1; }
        
        .feed-card { 
            background: var(--card-bg); border-radius: 12px; padding: 20px; margin-bottom: 24px; 
            border: 1px solid var(--border-color); cursor: pointer; position: relative; 
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .feed-card:hover { border-color: var(--primary); }
        
        .feed-author { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        
        .author-avatar { 
            width: 40px; height: 40px; background-color: var(--primary-light); 
            border: 1px solid var(--border-color); border-radius: 50%; 
            display: flex; align-items: center; justify-content: center; 
            color: var(--primary); font-weight: 900; font-size: 16px; overflow: hidden; cursor: pointer;
        }
        .author-avatar img { width: 100%; height: 100%; object-fit: cover; }
        
        .feed-title { font-size: 18px; font-weight: 800; margin-bottom: 16px; line-height: 1.4; color: var(--text-main); }
        
        .feed-images { display: flex; gap: 12px; height: 180px; }
        
        .feed-img-wrap { 
            flex: 1; position: relative; border-radius: 8px; overflow: hidden; 
            background-color: var(--primary-light); border: 1px solid var(--border-color);
        }
        .feed-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
        
        /* 강렬한 뱃지 스타일 */
        .badge { 
            position: absolute; top: 10px; left: 10px; padding: 4px 10px; 
            border-radius: 4px; font-size: 11px; font-weight: 900; color: white; 
            text-transform: uppercase; letter-spacing: 0.5px;
        }
        
        .biz-badge { 
            background: var(--primary-light); color: var(--primary); border: 1px solid var(--border-color);
            padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; margin-left: 6px; vertical-align: middle; 
        }
        .biz-badge.pending { background: #fef08a; color: #854d0e; border-color: #fef08a; }

        .more-opts-btn { position: absolute; top: 20px; right: 16px; background: none; border: none; font-size: 20px; color: #999; cursor: pointer; }
        
        /* 뷰 모드 컨트롤 */
        .view-mode-control { 
            display: flex; background: var(--primary-light); padding: 4px; 
            border-radius: 8px; margin-bottom: 24px; gap: 4px; border: 1px solid var(--border-color);
        }
        
        .view-mode-btn { 
            flex: 1; padding: 12px; text-align: center; font-size: 13px; font-weight: 700; 
            border-radius: 6px; cursor: pointer; color: var(--text-sub); transition: 0.2s; 
        }
        .view-mode-btn.active { background: white; color: var(--primary); border: 1px solid var(--border-color); box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        
        /* 버튼 공통 스타일 (사각 기반 모던 버튼) */
        .submit-btn { 
            width: 100%; padding: 18px; background-color: var(--primary); color: white; 
            border: 1px solid var(--primary); border-radius: 8px; font-size: 16px; font-weight: 800; 
            margin-top: 12px; cursor: pointer; transition: all 0.2s;
        }
        .submit-btn:disabled { background-color: #999; border-color: #999; cursor: not-allowed; }
        .submit-btn:active { transform: translateY(1px); }
        
        .sheet-btn { 
            width: 100%; padding: 16px; background: white; border: 1px solid var(--border-color); 
            border-radius: 8px; font-size: 15px; font-weight: 700; margin-bottom: 12px; cursor: pointer; color: var(--text-main);
        }
        .sheet-btn.cancel { background: white; border: none; color: var(--text-sub); margin-top: 4px; text-decoration: underline; }
        
        .fab-btn { 
            pointer-events: auto; background-color: var(--primary); color: white; 
            border: none; padding: 16px 28px; border-radius: 8px; font-size: 16px; font-weight: 800; 
            display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); cursor: pointer; 
        }
        .fab-container { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); z-index: 40; pointer-events: none; }

        /* 입력 폼 */
        .title-label { display: block; font-size: 14px; font-weight: 800; color: var(--text-main); margin-bottom: 8px; }
        .title-input { 
            width: 100%; padding: 16px; border: 1px solid var(--border-color); border-radius: 8px; 
            font-size: 15px; box-sizing: border-box; background-color: #ffffff; font-family: inherit; transition: 0.2s;
        }
        .title-input:focus { outline: none; border-color: var(--border-focus); }
        
        /* 사진 업로드 박스 */
        .photo-upload { 
            position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; 
            width: 100%; height: 160px; background-color: var(--primary-light); 
            border: 1px dashed var(--border-color); border-radius: 8px; cursor: pointer; 
            color: var(--text-sub); font-size: 14px; font-weight: 700; overflow: hidden; transition: 0.2s;
        }
        .photo-upload:hover { border-color: var(--primary); color: var(--primary); }
        .photo-upload img.preview { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 10; }

        /* 기타 UI 엘리먼트 */
        .unified-desc { font-size: 14px; color: var(--text-main); background: var(--primary-light); padding: 16px; border-radius: 8px; margin-top: 16px; line-height: 1.6; border: 1px solid var(--border-color); }
        .checkbox-label { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 700; color: var(--text-main); cursor: pointer; padding: 16px; background: white; border-radius: 8px; border: 1px solid var(--border-color); }
        .checkbox-label input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--primary); }
        
        .flip-card { perspective: 1000px; width: 100%; height: 260px; cursor: pointer; border-radius: 8px; }
        .flip-card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s; transform-style: preserve-3d; }
        .flip-card.flipped .flip-card-inner { transform: rotateY(180deg); }
        .flip-card-front, .flip-card-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); background-color: var(--primary-light); }
        .flip-card-back { transform: rotateY(180deg); }
        
        .noti-badge { position: absolute; top: 4px; right: 4px; background: var(--danger); color: white; font-size: 10px; font-weight: bold; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        
        /* 모달 & 사이드바 공통 (둥근모서리 줄임) */
        .modal-overlay, .bottom-sheet-overlay, .sidebar-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 200; opacity: 0; visibility: hidden; transition: all 0.3s; }
        .modal-overlay.active, .bottom-sheet-overlay.active, .sidebar-overlay.active { opacity: 1; visibility: visible; }
        
        .sidebar { position: fixed; top: 0; left: -300px; width: 300px; height: 100%; background: white; z-index: 201; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border-right: 1px solid var(--border-color); }
        .sidebar.active { left: 0; }
        
        .modal-content { background: white; width: 90%; max-width: 380px; border-radius: 12px; padding: 32px 24px; box-sizing: border-box; text-align: center; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); max-height: 85vh; overflow-y: auto; }
        
        .bottom-sheet { position: fixed; bottom: -100%; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; background: white; border-radius: 16px 16px 0 0; z-index: 201; padding: 32px 24px; box-sizing: border-box; transition: bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .bottom-sheet.active { bottom: 0; }
        
        .toast { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%) translateY(100px); background-color: var(--text-main); color: white; padding: 14px 24px; border-radius: 8px; font-size: 14px; font-weight: 700; z-index: 1000; opacity: 0; transition: all 0.3s; white-space: nowrap; pointer-events: none; }
        .toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }

        .common-footer { background-color: white; padding: 40px 20px; border-top: 1px solid var(--border-color); text-align: center; margin-top: auto; }
        .footer-links { margin-bottom: 20px; font-size: 13px; font-weight: 800; color: var(--text-main); }
        .footer-links span { cursor: pointer; }
        .footer-links .divider { margin: 0 12px; color: var(--border-color); font-weight: normal; }
        .footer-info { font-size: 12px; color: var(--text-sub); line-height: 1.8; }
        .footer-info p { margin: 0; }
        .footer-info .copyright { margin-top: 16px; font-weight: 900; color: var(--text-main); letter-spacing: 0.5px;}
        
        /* SNS 버튼 구조 정렬 */
        .social-btn { width: 100%; max-width: 340px; padding: 18px; border-radius: 8px; font-size: 15px; font-weight: 800; cursor: pointer; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; gap: 12px; background: white; margin-bottom: 12px; transition: background 0.2s; color: var(--text-main); }
        .social-btn.kakao { background-color: var(--kakao); color: var(--kakao-text); border-color: var(--kakao); }
        .social-btn:hover { filter: brightness(0.95); }
      `}</style>
      
      {/* 시스템 카메라, 갤러리 호출용 Hidden Input (절대 수정 금지) */}
      <div style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
        <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileSelect} />
        <input type="file" accept="image/*" ref={galleryInputRef} onChange={handleFileSelect} />
        <input type="file" accept="image/*" ref={profilePicRef} onChange={handleProfilePicSelect} />
      </div>

      <header className="app-header">
        <button className="header-icon" onClick={toggleMenu}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <div className="header-title" onClick={() => switchView('feed')}>BEFORETER</div>
        <button className="header-icon" onClick={handleOpenNoti}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          {unreadNotis > 0 && <span className="noti-badge">{unreadNotis}</span>}
        </button>
      </header>

      <div className={`sidebar-overlay ${isMenuOpen ? 'active' : ''}`} onClick={toggleMenu}></div>
      <div className={`sidebar ${isMenuOpen ? 'active' : ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="sidebar-header" style={{padding:'40px 24px', background:'white', borderBottom:'1px solid var(--border-color)'}}>
              {currentUser ? (
                <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
                  <div className="author-avatar" style={{width:'56px', height:'56px', fontSize:'24px'}} onClick={() => {setIsMenuOpen(false); setSelectedImage(currentUser.profilePic);}}>
                    {currentUser.profilePic ? <img src={currentUser.profilePic} alt="프로필" /> : (currentUser.name || '작업자').charAt(0)}
                  </div>
                  <div>
                    <h2 style={{margin:0, color:'var(--text-main)', fontSize:'18px', fontWeight:900}}>
                        {currentUser.name}
                        {currentUser.bizStatus === 'pending' && <span className="biz-badge pending">검수중</span>}
                    </h2>
                    {currentUser.company && <p style={{margin:'4px 0 0 0', fontSize:'13px', color:'var(--text-sub)', fontWeight:600}}>{currentUser.company}</p>}
                  </div>
                </div>
              ) : (
                <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
                  <div style={{width:'56px', height:'56px', background:'var(--primary-light)', border:'1px solid var(--border-color)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', fontWeight:'900', color:'var(--border-color)'}}>?</div>
                  <div>
                    <h2 style={{margin:0, color:'var(--text-main)', fontSize:'18px', fontWeight:900}}>BEFORETER</h2>
                    <p style={{margin:'4px 0 0 0', fontSize:'13px', color:'var(--text-sub)', fontWeight:600}}>로그인 후 이용해보세요</p>
                  </div>
                </div>
              )}
            </div>
            
            <ul style={{listStyle:'none', padding:0, margin:0, flex:1, overflowY:'auto'}}>
              <li style={{borderBottom:'1px solid var(--border-color)'}}><button onClick={() => { setIsMenuOpen(false); switchView('feed'); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'20px 24px', color:'var(--text-main)', fontSize:'15px', fontWeight:800, cursor:'pointer'}}>HOME</button></li>
              <li style={{borderBottom:'1px solid var(--border-color)'}}><button onClick={() => { setIsMenuOpen(false); switchView('about'); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'20px 24px', color:'var(--text-main)', fontSize:'15px', fontWeight:800, cursor:'pointer'}}>ABOUT SERVICE</button></li>
              {currentUser && (
                <li style={{borderBottom:'1px solid var(--border-color)'}}><button onClick={() => { setIsMenuOpen(false); switchView('mypage'); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'20px 24px', color:'var(--text-main)', fontSize:'15px', fontWeight:800, cursor:'pointer'}}>MY PROFILE</button></li>
              )}
              {currentUser?.email === 'jinthemoon@kakao.com' && (
                <li style={{borderBottom:'1px solid var(--border-color)', background:'var(--text-main)'}}><button onClick={() => { setIsMenuOpen(false); switchView('admin'); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'20px 24px', color:'white', fontSize:'15px', fontWeight:800, cursor:'pointer'}}>ADMIN (사업자 검수)</button></li>
              )}
              <li style={{borderBottom:'1px solid var(--border-color)'}}><button onClick={() => { setIsMenuOpen(false); setIsFeedbackModalOpen(true); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'20px 24px', color:'var(--text-sub)', fontSize:'15px', fontWeight:700, cursor:'pointer'}}>의견 보내기</button></li>
            </ul>
            
            <ul style={{listStyle:'none', padding:0, margin:0, borderTop:'1px solid var(--border-color)', background:'var(--primary-light)'}}>
              {currentUser ? (
                <li><button onClick={processLogout} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'24px', color:'var(--danger)', fontSize:'14px', fontWeight:800, cursor:'pointer'}}>LOGOUT</button></li>
              ) : (
                <li><button onClick={() => { setIsMenuOpen(false); switchView('login'); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'24px', color:'var(--text-main)', fontSize:'14px', fontWeight:800, cursor:'pointer'}}>LOGIN</button></li>
              )}
            </ul>
        </div>
      </div>

      {currentView === 'admin' && currentUser?.email === 'jinthemoon@kakao.com' && (
        <div className="view-section">
          <div style={{padding:'32px 20px', textAlign:'center', borderBottom:'1px solid var(--border-color)'}}>
            <h2 style={{margin:0, color:'var(--text-main)', fontSize:'20px', fontWeight:900}}>사업자 검수 대기열</h2>
            <p style={{margin:'8px 0 0 0', fontSize:'13px', color:'var(--text-sub)', fontWeight:700}}>대기: {pendingBizUsers.length}명</p>
          </div>
          <div className="feed-container">
            {pendingBizUsers.length === 0 ? (
                <div style={{textAlign:'center', padding:'60px 20px', color:'var(--text-sub)', fontWeight:700}}>대기 중인 검수 요청이 없습니다.</div>
            ) : (
                pendingBizUsers.map(user => (
                    <div key={user.id} className="feed-card" style={{borderColor:'var(--text-main)'}}>
                        <div style={{display:'flex', gap:'12px', alignItems:'center', marginBottom:'20px'}}>
                            <div className="author-avatar">{user.name.charAt(0)}</div>
                            <div>
                                <h3 style={{margin:0, fontSize:'16px', fontWeight:800}}>{user.name} <span style={{fontSize:'12px', color:'var(--text-sub)', fontWeight:normal}}>({user.email})</span></h3>
                                <p style={{margin:'4px 0 0 0', fontSize:'14px', fontWeight:'700'}}>{user.company}</p>
                            </div>
                        </div>
                        <div style={{background:'var(--primary-light)', border:'1px solid var(--border-color)', padding:'16px', borderRadius:'8px', marginBottom:'20px'}}>
                            <p style={{margin:0, fontSize:'13px', color:'var(--text-sub)', fontWeight:700}}>제출된 번호</p>
                            <p style={{margin:'8px 0 0 0', fontSize:'18px', fontWeight:'900', letterSpacing:'1px'}}>{user.bizNum}</p>
                        </div>
                        <div style={{display:'flex', gap:'12px'}}>
                            <button className="submit-btn" style={{margin:0, flex:1, background:'white', color:'var(--danger)', border:'1px solid var(--border-color)'}} onClick={() => rejectBiz(user.id, user.name)}>거절</button>
                            <button className="submit-btn" style={{margin:0, flex:1}} onClick={() => approveBiz(user.id, user.name)}>승인</button>
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>
      )}

      {currentView === 'feed' && (
        <div className="view-section">
          <div className="feed-container" style={{paddingBottom:0, paddingTop:'24px'}}>
            <div className="brand-hook-card" key={bannerIdx}>
              <h3>{banners[bannerIdx].title}</h3>
              <p>{banners[bannerIdx].desc}</p>
            </div>
          </div>
          
          <div className="filter-scroll">
            {categories.map(cat => (
              <div key={cat} className={`filter-chip ${feedFilter === cat ? 'active' : ''}`} onClick={() => setFeedFilter(cat)}>{cat}</div>
            ))}
          </div>

          <div className="feed-container" style={{paddingTop:'24px'}}>
            {displayedFeeds.length === 0 ? (
              <div style={{textAlign:'center', padding:'60px 20px', color:'var(--text-sub)'}}>
                <p style={{ margin: 0, fontWeight: 700, fontSize:'15px' }}>등록된 리포트가 없습니다.</p>
              </div>
            ) : (
              displayedFeeds.map((item) => {
                const renderSpaces = item.spaces && item.spaces.length > 0 ? item.spaces : [{ beforeImg: item.beforeImg, afterImg: item.afterImg }];
                return (
                  <div key={item.id} className="feed-card" onClick={(e) => {
                      if(e.target.closest('.more-opts-btn') || e.target.closest('.action-btn') || e.target.closest('.author-avatar')) return;
                      openDetailView(item.id);
                  }}>
                    <button className="more-opts-btn" onClick={(e) => { e.stopPropagation(); setPostOptionsMenu({ reportId: item.id, authorId: item.authorId }); }}>⋮</button>
                    
                    <div className="feed-author">
                      <div className="author-avatar" onClick={(e) => { e.stopPropagation(); setSelectedImage(item.authorPic); }}>
                        {item.authorPic ? <img src={item.authorPic} alt="프로필" /> : (item.authorName || '작업자').charAt(0)}
                      </div>
                      <div>
                        <span onClick={(e) => {e.stopPropagation(); showPublicProfile(item.authorId);}} style={{cursor:'pointer', fontWeight:800, color:'var(--text-main)', fontSize:'15px'}}>
                            {item.authorName || '작업자'} <span style={{fontSize:'12px', color:'var(--text-sub)', fontWeight:700, marginLeft:'4px'}}>[{item.category || '기타'}]</span>
                        </span>
                        <p style={{margin:'4px 0 0 0', fontSize:'12px', color:'var(--text-sub)', fontWeight:600}}>{formatDisplayTime(item)}</p>
                      </div>
                    </div>
                    
                    <div className="feed-title">{item.title}</div>
                    <div className="feed-images">
                      <div className="feed-img-wrap">
                        <span className="badge" style={{ background: 'var(--text-main)' }}>Before</span>
                        <img src={renderSpaces[0].beforeImg} alt="Before" />
                      </div>
                      <div className="feed-img-wrap">
                        <span className="badge" style={{ background: 'var(--text-sub)', color: 'white' }}>After</span>
                        <img src={renderSpaces[0].afterImg} alt="After" />
                      </div>
                    </div>

                    <div style={{display:'flex', gap:'20px', fontSize:'13px', color:'var(--text-main)', marginTop:'20px', fontWeight:'800'}}>
                        <button className="action-btn" onClick={(e) => handleToggleLike(item, e)} style={{background:'none', border:'none', padding:0, display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', color: item.likes?.includes(currentUser?.id) ? 'var(--danger)' : 'var(--text-main)'}}>
                            {item.likes?.includes(currentUser?.id) ? '❤️' : '🤍'} {(item.likes || []).length}
                        </button>
                        <div style={{display:'flex', alignItems:'center', gap:'6px'}}>💬 {(item.comments || []).length}</div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          
          {renderFooter()}

          <div className="fab-container">
            <button className="fab-btn" onClick={() => checkAuthAndAction(() => switchView('upload'))}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              새 리포트 작성
            </button>
          </div>
        </div>
      )}

      {currentView === 'login' && (
        <div className="view-section" style={{ display:'flex', background:'white' }}>
          <div className="login-container" style={{ width:'100%', height:'calc(100vh - 56px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px' }}>
            <h1 style={{margin:'0 0 12px 0', color:'var(--text-main)', fontSize:'32px', fontWeight:'900', letterSpacing:'-1px'}}>BEFORETER</h1>
            <p style={{margin:'0 0 40px 0', color:'var(--text-sub)', fontSize:'15px', fontWeight:'600'}}>신뢰를 만드는 가장 완벽한 리포트</p>
            
            <div style={{textAlign:'left', background:'var(--primary-light)', padding:'24px', borderRadius:'8px', width:'100%', maxWidth:'340px', marginBottom:'32px', border:'1px solid var(--border-color)', boxSizing:'border-box'}}>
               <label style={{display:'flex', alignItems:'center', fontWeight:'800', color:'var(--text-main)', marginBottom:'16px', cursor:'pointer', fontSize:'15px'}}>
                 <input type="checkbox" checked={termsAgreed && privacyAgreed} onChange={(e)=>{setTermsAgreed(e.target.checked); setPrivacyAgreed(e.target.checked)}} style={{marginRight:'12px', width:'20px', height:'20px', accentColor:'var(--primary)'}} />
                 전체 약관 동의
               </label>
               <hr style={{borderTop:'1px solid var(--border-color)', marginBottom:'16px', borderBottom:'none'}}/>
               <div style={{display:'flex', flexDirection:'column', gap:'16px', fontSize:'13px', color:'var(--text-sub)', fontWeight:700}}>
                 <label style={{display:'flex', alignItems:'center', cursor:'pointer'}}>
                    <input type="checkbox" checked={termsAgreed} onChange={e=>setTermsAgreed(e.target.checked)} style={{marginRight:'12px', accentColor:'var(--primary)'}} /> 
                    (필수) <span style={{textDecoration:'underline', marginLeft:'4px'}} onClick={(e)=>{e.preventDefault(); setIsTermsModalOpen(true);}}>서비스 이용약관</span> 동의
                 </label>
                 <label style={{display:'flex', alignItems:'center', cursor:'pointer'}}>
                    <input type="checkbox" checked={privacyAgreed} onChange={e=>setPrivacyAgreed(e.target.checked)} style={{marginRight:'12px', accentColor:'var(--primary)'}} /> 
                    (필수) <span style={{textDecoration:'underline', marginLeft:'4px'}} onClick={(e)=>{e.preventDefault(); setIsTermsModalOpen(true);}}>개인정보 처리방침</span> 동의
                 </label>
               </div>
            </div>

            <button className="social-btn kakao" onClick={processKakaoLogin}>카카오 계정으로 시작</button>
            <button className="social-btn" onClick={processGoogleLogin}>Google 계정으로 시작</button>
          </div>
        </div>
      )}

      {currentView === 'about' && (
        <div className="view-section" style={{background:'#ffffff', textAlign:'center'}}>
            <div style={{padding: '60px 24px'}}>
                <h1 style={{fontSize:'32px', fontWeight:'900', color:'var(--text-main)', marginBottom:'16px', letterSpacing:'-1px'}}>BEFORETER</h1>
                <p style={{fontSize:'16px', color:'var(--text-sub)', lineHeight:'1.6', marginBottom:'48px', fontWeight:600}}>사진 2장으로 증명하는 당신의 전문성.<br/>가장 미니멀한 작업 리포트 포트폴리오.</p>

                <div style={{textAlign:'left', display:'flex', flexDirection:'column', gap:'20px'}}>
                    <div style={{padding:'24px', borderRadius:'8px', border:'1px solid var(--text-main)', background:'var(--text-main)', color:'white'}}>
                        <h3 style={{margin:'0 0 12px 0', fontSize:'18px', fontWeight:900}}>FAST & SIMPLE</h3>
                        <p style={{margin:0, fontSize:'14px', lineHeight:'1.6', opacity:0.9}}>복잡한 과정 없이 작업 전/후 사진만 등록하면, 고객에게 신뢰를 주는 리포트가 즉시 완성됩니다.</p>
                    </div>
                    <div style={{padding:'24px', borderRadius:'8px', border:'1px solid var(--border-color)', background:'white'}}>
                        <h3 style={{margin:'0 0 12px 0', fontSize:'18px', fontWeight:900, color:'var(--text-main)'}}>EASY SHARE</h3>
                        <p style={{margin:0, fontSize:'14px', lineHeight:'1.6', color:'var(--text-sub)', fontWeight:600}}>카카오톡, 문자 메시지로 단 1초 만에 작업 결과를 공유하세요.</p>
                    </div>
                    <div style={{padding:'24px', borderRadius:'8px', border:'1px solid var(--border-color)', background:'white'}}>
                        <h3 style={{margin:'0 0 12px 0', fontSize:'18px', fontWeight:900, color:'var(--text-main)'}}>MY PROFILE</h3>
                        <p style={{margin:0, fontSize:'14px', lineHeight:'1.6', color:'var(--text-sub)', fontWeight:600}}>누적된 리포트는 곧 당신의 포트폴리오가 됩니다. 오픈 프로필로 실력을 증명하세요.</p>
                    </div>
                </div>

                <button className="submit-btn" style={{marginTop:'48px'}} onClick={() => switchView(currentUser ? 'feed' : 'login')}>
                    {currentUser ? 'HOME으로 이동' : 'GET STARTED'}
                </button>
            </div>
            {renderFooter()}
        </div>
      )}

      {currentView === 'mypage' && currentUser && (
        <div className="view-section">
          <div style={{background: 'white', padding: '40px 24px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', position: 'relative'}}>
            <button style={{position: 'absolute', top: '24px', right: '24px', background: 'white', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', color: 'var(--text-main)'}} onClick={openProfileEdit}>
              EDIT PROFILE
            </button>
            
            <div className="author-avatar" style={{margin: '0 auto 20px auto', width: '80px', height: '80px', fontSize: '32px'}} onClick={() => setSelectedImage(currentUser.profilePic)}>
              {currentUser.profilePic ? <img src={currentUser.profilePic} alt="프로필" /> : (currentUser.name || '작업자').charAt(0)}
            </div>
            
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight:900, color: 'var(--text-main)', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                {currentUser.name}
                {currentUser.bizStatus === 'approved' && <span className="biz-badge">VERIFIED</span>}
            </h2>
            {currentUser.company && <p style={{margin:'8px 0 0 0', fontSize:'15px', fontWeight:700, color:'var(--text-sub)'}}>{currentUser.company}</p>}
            
            <div style={{marginTop:'24px'}}>
                <p style={{fontSize:'15px', color:'var(--text-main)', margin:'0 0 16px 0', fontWeight:'600', lineHeight:1.5}}>{currentUser.intro || '자기소개를 입력해주세요.'}</p>
                <div style={{display:'flex', gap:'8px', justifyContent:'center', flexWrap:'wrap'}}>
                    {(currentUser.keywords || []).map(k => <span key={k} style={{background:'white', border:'1px solid var(--border-color)', color:'var(--text-main)', padding:'6px 12px', borderRadius:'4px', fontSize:'12px', fontWeight:'800'}}>#{k}</span>)}
                </div>
            </div>

            <button className="sheet-btn" style={{marginTop:'32px', border:'1px solid var(--text-main)'}} onClick={() => showPublicProfile(currentUser.id, true)}>
              오픈 프로필 미리보기
            </button>

            <div style={{display: 'flex', justifyContent: 'center', gap: '48px', marginTop: '32px', borderTop:'1px solid var(--border-color)', paddingTop:'32px'}}>
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <span style={{fontSize: '24px', fontWeight: '900', color: 'var(--text-main)'}}>{myFeeds.length}</span>
                <span style={{fontSize: '13px', fontWeight: 700, color: 'var(--text-sub)', marginTop:'4px'}}>작성한 리포트</span>
              </div>
            </div>
          </div>
          
          <div className="feed-container">
            {myFeeds.length === 0 ? (
              <div style={{textAlign:'center', padding:'60px 20px', color:'var(--text-sub)', fontWeight:700}}>작성한 리포트가 없습니다.</div>
            ) : (
              myFeeds.map((item, idx) => {
                  const myReportIndex = myFeeds.length - idx; 
                  const renderSpaces = item.spaces && item.spaces.length > 0 ? item.spaces : [{ beforeImg: item.beforeImg, afterImg: item.afterImg }];
                  return (
                    <div key={item.id} className="feed-card" onClick={() => openDetailView(item.id)}>
                      <div style={{display:'inline-block', background:'var(--text-main)', color:'white', fontSize:'11px', fontWeight:'800', padding:'4px 10px', borderRadius:'4px', marginBottom:'12px'}}>
                        REPORT #{myReportIndex}
                      </div>
                      <div className="feed-title" style={{marginBottom: '16px'}}>
                        {item.status === 'private' ? '🔒 ' : ''}{item.title}
                      </div>
                      <div style={{display:'flex', gap:'20px', fontSize:'13px', color:'var(--text-sub)', marginTop:'12px', fontWeight:'800'}}>
                        <span>{item.taskDate?.replace(/-/g, '.')}</span>
                        <span>❤️ {(item.likes || []).length}</span>
                        <span>💬 {(item.comments || []).length}</span>
                      </div>
                      <div className="feed-images" style={{marginTop:'20px'}}>
                        <div className="feed-img-wrap"><img src={renderSpaces[0].beforeImg} alt="Before" /></div>
                        <div className="feed-img-wrap"><img src={renderSpaces[0].afterImg} alt="After" /></div>
                      </div>
                    </div>
                  )
                })
            )}
          </div>
          {renderFooter()}
        </div>
      )}

      {currentView === 'public-profile' && publicProfileUser && (
        <div className="view-section">
          <div style={{background: 'white', padding: '24px 24px 40px 24px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', position: 'relative'}}>
            <button style={{position: 'absolute', top: '24px', left: '24px', background: 'white', border: '1px solid var(--border-color)', width:'40px', height:'40px', borderRadius: '8px', display:'flex', alignItems:'center', justifyContent:'center', cursor: 'pointer', color: 'var(--text-main)'}} onClick={() => switchView('feed')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            
            <div className="author-avatar" style={{margin: '20px auto 20px auto', width: '88px', height: '88px', fontSize: '32px'}} onClick={() => setSelectedImage(publicProfileUser.profilePic)}>
              {publicProfileUser.profilePic ? <img src={publicProfileUser.profilePic} alt="프로필" /> : (publicProfileUser.name || '작업자').charAt(0)}
            </div>
            
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight:900, color: 'var(--text-main)' }}>
                {publicProfileUser.name}
                {publicProfileUser.bizStatus === 'approved' && <span className="biz-badge">VERIFIED</span>}
            </h2>
            {publicProfileUser.company && <p style={{fontSize:'15px', fontWeight:700, color:'var(--text-sub)', marginTop:'8px'}}>{publicProfileUser.company}</p>}
            
            <div style={{marginTop:'24px'}}>
                <p style={{fontSize:'15px', color:'var(--text-main)', margin:'0 0 16px 0', fontWeight:'600', lineHeight:1.5}}>{publicProfileUser.intro || '작성된 소개가 없습니다.'}</p>
                <div style={{display:'flex', gap:'8px', justifyContent:'center', flexWrap:'wrap'}}>
                    {(publicProfileUser.keywords || []).map(k => <span key={k} style={{background:'var(--primary-light)', border:'1px solid var(--border-color)', color:'var(--text-main)', padding:'6px 12px', borderRadius:'4px', fontSize:'12px', fontWeight:'800'}}>#{k}</span>)}
                </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'center', gap: '40px', marginTop: '32px', borderTop:'1px solid var(--border-color)', paddingTop:'32px'}}>
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <span style={{fontSize: '24px', fontWeight: '900', color: 'var(--text-main)'}}>{publicProfileFeeds.length}</span>
                <span style={{fontSize: '13px', fontWeight:700, color: 'var(--text-sub)', marginTop:'4px'}}>공개된 리포트</span>
              </div>
            </div>
            
            <button onClick={() => copyProfileLink(publicProfileUser.id)} style={{background:'var(--text-main)', color:'white', border:'none', padding:'16px 24px', borderRadius:'8px', fontSize:'14px', fontWeight:'800', marginTop:'32px', cursor:'pointer', width:'100%', maxWidth:'300px'}}>
                프로필 링크 공유하기
            </button>
          </div>
          
          <div className="feed-container">
            {publicProfileFeeds.length === 0 ? (
              <div style={{textAlign:'center', padding:'60px 20px', color:'var(--text-sub)', fontWeight:700}}>공개된 리포트가 없습니다.</div>
            ) : (
              publicProfileFeeds.map((item, idx) => {
                  const renderSpaces = item.spaces && item.spaces.length > 0 ? item.spaces : [{ beforeImg: item.beforeImg, afterImg: item.afterImg }];
                  return (
                    <div key={item.id} className="feed-card" onClick={() => openDetailView(item.id)}>
                      <div className="feed-title" style={{marginBottom: '16px'}}>{item.title}</div>
                      <div style={{display:'flex', gap:'20px', fontSize:'13px', color:'var(--text-sub)', marginBottom:'16px', fontWeight:'800'}}>
                        <span>{item.taskDate?.replace(/-/g, '.')}</span>
                        <span>❤️ {(item.likes || []).length}</span>
                        <span>💬 {(item.comments || []).length}</span>
                      </div>
                      <div className="feed-images">
                        <div className="feed-img-wrap"><img src={renderSpaces[0].beforeImg} alt="Before" /></div>
                        <div className="feed-img-wrap"><img src={renderSpaces[0].afterImg} alt="After" /></div>
                      </div>
                    </div>
                  )
                })
            )}
          </div>
          {renderFooter()}
        </div>
      )}

      {currentView === 'upload' && (
        <div className="view-section">
          <div className="upload-container" style={{padding:'32px 24px'}}>
            <div className="view-mode-control" style={{marginBottom:'32px'}}>
              <div className={`view-mode-btn ${uploadMode==='single'?'active':''}`} onClick={() => { setUploadMode('single'); setSpaces([spaces[0] || defaultSpace]); }}>단건 등록</div>
              <div className={`view-mode-btn ${uploadMode==='multi'?'active':''}`} onClick={() => setUploadMode('multi')}>여러 건 등록</div>
            </div>
            
            <div className="input-group">
                <label className="title-label">카테고리</label>
                <select className="title-input" value={taskCategory} onChange={e=>setTaskCategory(e.target.value)}>
                    {categories.filter(c => c !== '전체').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            
            <div className="input-group">
              <label className="title-label">작업 일자</label>
              <input type="date" className="title-input" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} />
            </div>
            
            <div className="input-group" style={{marginBottom:'32px'}}>
              <label className="title-label">작업 제목</label>
              <input type="text" className="title-input" placeholder="핵심 내용 한 줄 요약" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
            </div>
            
            {spaces.map((sp, index) => (
              <div key={sp.id} style={uploadMode === 'multi' ? {background: 'white', padding: '24px', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '24px'} : {}}>
                {uploadMode === 'multi' && (
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                    <input type="text" className="title-input" style={{padding:'12px', fontSize:'15px', width:'75%', marginTop:0}} placeholder="구역 이름 (예: 거실)" value={sp.spaceName} onChange={(e) => handleSpaceDescChange(index, 'name', e.target.value)} />
                    {spaces.length > 1 && <button onClick={() => removeSpace(index)} style={{background:'none', border:'none', color:'var(--danger)', fontWeight:'800', cursor:'pointer', fontSize:'14px'}}>삭제</button>}
                  </div>
                )}
                
                <div style={{display:'flex', gap:'16px', marginBottom:'20px'}}>
                    <div style={{flex:1}}>
                        <label style={{display:'block', fontSize:'14px', fontWeight:'800', marginBottom:'12px', textAlign:'center'}}>BEFORE</label>
                        <div className="photo-upload" onClick={() => openPhotoSheet(index, 'before')}>
                            {!sp.beforeImg && <span>+ 사진 등록</span>}
                            {sp.beforeImg && <img className="preview" src={sp.beforeImg} alt="전" />}
                        </div>
                    </div>
                    <div style={{flex:1}}>
                        <label style={{display:'block', fontSize:'14px', fontWeight:'800', marginBottom:'12px', textAlign:'center'}}>AFTER</label>
                        <div className="photo-upload" onClick={() => openPhotoSheet(index, 'after')}>
                            {!sp.afterImg && <span>+ 사진 등록</span>}
                            {sp.afterImg && <img className="preview" src={sp.afterImg} alt="후" />}
                        </div>
                    </div>
                </div>
                
                <textarea className="title-input" style={{height:'100px', resize:'none', marginTop:0}} placeholder="작업 상세 설명" value={sp.desc} onChange={(e) => handleSpaceDescChange(index, 'desc', e.target.value)}></textarea>
              </div>
            ))}
            
            {uploadMode === 'multi' && (
              <button className="sheet-btn" style={{borderStyle:'dashed', borderColor:'var(--text-main)', borderWidth:'2px', marginTop:'8px'}} onClick={addSpace}>+ 작업 구역 추가</button>
            )}

            <div style={{marginTop: '32px', marginBottom: '16px'}}>
                <label className="checkbox-label">
                  <input type="checkbox" checked={isPrivateUpload} onChange={(e) => setIsPrivateUpload(e.target.checked)} />
                  비공개 리포트로 저장 (링크로만 접근 가능)
                </label>
            </div>

            <button className="submit-btn" style={{marginTop:'24px'}} onClick={saveAndShareReport} disabled={isUploading}>
              {isUploading ? "업로드 진행 중..." : "리포트 발행하기"}
            </button>
          </div>
        </div>
      )}

      {currentView === 'detail' && detailReport && (
        <div className="view-section" style={{paddingTop: '24px'}}>
          <div className="feed-container">
            
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px'}}>
              <span style={{background:'var(--text-main)', color:'white', padding:'6px 12px', borderRadius:'4px', fontSize:'11px', fontWeight:'900', letterSpacing:'0.5px'}}>
                {detailReport.status === 'private' ? 'PRIVATE' : 'PUBLIC'}
              </span>
              {currentUser && currentUser.id === detailReport.authorId && (
                <button onClick={openReportEdit} style={{background:'none', border:'1px solid var(--border-color)', padding:'6px 16px', borderRadius:'6px', fontSize:'12px', fontWeight:'800', cursor:'pointer', color:'var(--text-main)'}}>관리</button>
              )}
            </div>
            
            <div style={{background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', border: '1px solid var(--border-color)', position:'relative'}}>
              {detailReport.reportNo && <div style={{position:'absolute', top:'-12px', left:'24px', background:'white', border:'1px solid var(--text-main)', color:'var(--text-main)', padding:'4px 12px', borderRadius:'4px', fontSize:'11px', fontWeight:'900', letterSpacing:'1px'}}>NO. {detailReport.reportNo}</div>}
              
              <div style={{borderBottom:'1px solid var(--border-color)', paddingBottom:'20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: detailReport.reportNo ? '12px' : '0'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <div className="author-avatar" onClick={() => setSelectedImage(detailReport.authorPic)}>
                    {detailReport.authorPic ? <img src={detailReport.authorPic} alt="프로필" /> : (detailReport.authorName || '작업자').charAt(0)}
                  </div>
                  <div>
                    <span style={{fontSize:'15px', fontWeight:'900', color:'var(--text-main)'}}>{detailReport.authorName || '작업자'}</span>
                    <p style={{fontSize:'12px', color:'var(--text-sub)', margin:'4px 0 0 0', fontWeight:700}}>{formatDisplayTime(detailReport)}</p>
                  </div>
                </div>
                <button onClick={() => showPublicProfile(detailReport.authorId)} style={{background:'white', color:'var(--text-main)', border:'1px solid var(--border-color)', padding:'8px 16px', borderRadius:'6px', fontSize:'12px', fontWeight:'800', cursor:'pointer'}}>프로필</button>
              </div>
              
              <h2 style={{fontSize:'24px', fontWeight:'900', color:'var(--text-main)', margin: '24px 0 24px 0', lineHeight:1.4}}>{detailReport.title}</h2>
              
              <div className="view-mode-control">
                <div className={`view-mode-btn ${detailViewMode==='horizontal'?'active':''}`} onClick={()=>setDetailViewMode('horizontal')}>가로 분할</div>
                <div className={`view-mode-btn ${detailViewMode==='vertical'?'active':''}`} onClick={()=>setDetailViewMode('vertical')}>세로 나열</div>
                <div className={`view-mode-btn ${detailViewMode==='flip'?'active':''}`} onClick={()=>setDetailViewMode('flip')}>슬라이드</div>
              </div>
              
              {(detailViewMode === 'horizontal' || detailViewMode === 'vertical') && (
                <p style={{fontSize:'12px', color:'var(--text-sub)', textAlign:'center', marginBottom:'24px', fontWeight:'700'}}>
                  사진을 탭하여 크게 확인할 수 있습니다.
                </p>
              )}

              {(detailReport.spaces && detailReport.spaces.length > 0 ? detailReport.spaces : [{ beforeImg: detailReport.beforeImg, afterImg: detailReport.afterImg, desc: detailReport.desc }]).map((sp, idx) => (
                <div key={idx} style={{marginBottom: '32px', background: 'var(--primary-light)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
                  {sp.spaceName && (
                    <h4 style={{margin:'0 0 16px 0', color:'var(--text-main)', fontSize: '16px', fontWeight:'900', display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <span style={{background:'var(--text-main)', width:'4px', height:'16px', borderRadius:'2px'}}></span> {sp.spaceName}
                    </h4>
                  )}
                  
                  {detailViewMode === 'vertical' && (
                    <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                      <div className="feed-img-wrap" style={{height:'auto', minHeight:'240px', cursor:'zoom-in'}} onClick={() => setSelectedImage(sp.beforeImg)}>
                        <span className="badge" style={{background:'var(--text-main)'}}>BEFORE</span>
                        <img src={sp.beforeImg} style={{display:'block', width:'100%'}} alt="Before" />
                      </div>
                      <div className="feed-img-wrap" style={{height:'auto', minHeight:'240px', cursor:'zoom-in'}} onClick={() => setSelectedImage(sp.afterImg)}>
                        <span className="badge" style={{background:'white', color:'var(--text-main)', border:'1px solid var(--border-color)'}}>AFTER</span>
                        <img src={sp.afterImg} style={{display:'block', width:'100%'}} alt="After" />
                      </div>
                    </div>
                  )}

                  {detailViewMode === 'horizontal' && (
                    <div style={{display:'flex', gap:'12px'}}>
                      <div className="feed-img-wrap" style={{height:'200px', cursor:'zoom-in'}} onClick={() => setSelectedImage(sp.beforeImg)}>
                        <span className="badge" style={{background:'var(--text-main)'}}>BEFORE</span>
                        <img src={sp.beforeImg} style={{height:'100%', objectFit:'cover'}} alt="Before" />
                      </div>
                      <div className="feed-img-wrap" style={{height:'200px', cursor:'zoom-in'}} onClick={() => setSelectedImage(sp.afterImg)}>
                        <span className="badge" style={{background:'white', color:'var(--text-main)'}}>AFTER</span>
                        <img src={sp.afterImg} style={{height:'100%', objectFit:'cover'}} alt="After" />
                      </div>
                    </div>
                  )}

                  {detailViewMode === 'flip' && (
                    <div>
                      <div className={`flip-card ${flippedCards[idx] ? 'flipped' : ''}`} onClick={() => toggleFlip(idx)} style={{height:'300px'}}>
                        <div className="flip-card-inner">
                          <div className="flip-card-front">
                            <span className="badge" style={{background:'var(--text-main)'}}>BEFORE</span>
                            <img src={sp.beforeImg} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="Before" />
                          </div>
                          <div className="flip-card-back">
                            <span className="badge" style={{background:'white', color:'var(--text-main)'}}>AFTER</span>
                            <img src={sp.afterImg} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="After" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {sp.desc && <div className="unified-desc"><strong>COMMENT</strong><br/>{sp.desc}</div>}
                </div>
              ))}
            </div>
            
            <button className="submit-btn" style={{background:'var(--kakao)', color:'var(--kakao-text)', marginTop:0, border:'none'}} onClick={() => setIsAlimtalkModalOpen(true)}>
                알림톡으로 결과 전송
            </button>
            <button className="submit-btn" style={{background:'var(--text-main)', marginTop:'12px'}} onClick={() => copyLink(detailReport.id)}>
                리포트 링크 복사
            </button>
            <button className="submit-btn" style={{background:'white', color:'var(--text-main)', border:'1px solid var(--border-color)', marginTop:'12px'}} onClick={() => switchView('feed')}>
                목록으로
            </button>
            
            <div className="comment-section" style={{marginTop: '48px'}}>
              <div style={{display:'flex', alignItems:'center', gap:'16px', marginBottom:'24px'}}>
                  <h3 style={{fontSize:'18px', margin:0, fontWeight:900}}>COMMENTS {(detailReport.comments || []).length}</h3>
                  <button onClick={(e) => handleToggleLike(detailReport, e)} style={{background:'white', border:'1px solid var(--border-color)', borderRadius:'6px', padding:'6px 12px', display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', fontSize:'14px', fontWeight:'800', color: detailReport.likes?.includes(currentUser?.id) ? 'var(--danger)' : 'var(--text-main)'}}>
                      {detailReport.likes?.includes(currentUser?.id) ? '❤️' : '🤍'} {(detailReport.likes || []).length}
                  </button>
              </div>

              <div>
                {(detailReport.comments || []).map((c) => (
                  <div key={c.id} style={{display:'flex', gap:'12px', marginBottom:'20px', textAlign:'left'}}>
                    <div className="author-avatar" style={{width:'36px', height:'36px'}} onClick={() => setSelectedImage(c.authorPic)}>
                        {c.authorPic ? <img src={c.authorPic} style={{width:'100%'}}/> : (c.authorName || '?').charAt(0)}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'13px', fontWeight:'900', marginBottom:'4px', color:'var(--text-main)'}}>{c.authorName}</div>
                      <div style={{fontSize:'14px', color:'var(--text-sub)', lineHeight:'1.5', background:'white', padding:'12px', borderRadius:'8px', border:'1px solid var(--border-color)'}}>{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{display:'flex', gap:'12px', marginTop:'32px'}}>
                <input type="text" style={{flex:1, padding:'16px', border:'1px solid var(--border-color)', borderRadius:'8px', fontSize:'14px', outline:'none', background:'white'}} placeholder="댓글을 입력하세요" value={commentInput} onChange={(e) => setCommentInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && submitComment()}/>
                <button style={{background:'var(--text-main)', color:'white', border:'none', padding:'0 24px', borderRadius:'8px', fontWeight:'800', cursor:'pointer'}} onClick={submitComment}>등록</button>
              </div>
            </div>
          </div>
          {renderFooter()}
        </div>
      )}

      {/* 모달: 카카오 알림톡 전송 */}
      <div className={`modal-overlay ${isAlimtalkModalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '20px', fontWeight:900 }}>알림톡 전송</h3>
          <p style={{fontSize:'14px', color:'var(--text-sub)', marginBottom:'24px', lineHeight:'1.6', fontWeight:600}}>
            작업 결과를 고객의 카카오톡으로 전송합니다.<br/>휴대전화 번호를 입력해주세요.
          </p>
          <div className="input-group" style={{ marginBottom: '32px', textAlign:'left' }}>
            <label className="title-label">고객 연락처</label>
            <input type="tel" className="title-input" placeholder="숫자만 입력" value={alimtalkPhone} onChange={(e) => setAlimtalkPhone(e.target.value.replace(/[^0-9]/g, ''))} />
          </div>
          <button className="submit-btn" disabled={isAlimtalkSending} style={{ background: 'var(--kakao)', color: 'var(--kakao-text)', border: 'none', margin:0 }} onClick={sendAlimtalk}>
            {isAlimtalkSending ? '전송 중...' : '전송하기'}
          </button>
          <button className="sheet-btn cancel" style={{marginTop:'16px'}} onClick={() => setIsAlimtalkModalOpen(false)}>닫기</button>
        </div>
      </div>

      {/* 모달: 이용약관 */}
      <div className={`modal-overlay ${isTermsModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{ width: '95%' }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px', fontSize: '20px', fontWeight:900 }}>이용약관 및 정책</h3>
          <div style={{textAlign:'left', height:'50vh', overflowY:'auto', background:'var(--primary-light)', padding:'20px', borderRadius:'8px', border:'1px solid var(--border-color)', fontSize:'13px', lineHeight:'1.6', color:'var(--text-sub)'}}>
            <h4 style={{color:'var(--text-main)', marginTop:0, fontWeight:900}}>서비스 이용약관</h4>
            <pre style={{whiteSpace:'pre-wrap', fontFamily:'inherit', margin:0}}>{TERMS_OF_SERVICE}</pre>
            <hr style={{margin:'24px 0', borderTop:'1px solid var(--border-color)', borderBottom:'none'}}/>
            <h4 style={{color:'var(--text-main)', marginTop:0, fontWeight:900}}>개인정보처리방침</h4>
            <pre style={{whiteSpace:'pre-wrap', fontFamily:'inherit', margin:0}}>{PRIVACY_POLICY}</pre>
          </div>
          <button className="submit-btn" style={{marginTop:'24px'}} onClick={() => setIsTermsModalOpen(false)}>확인</button>
        </div>
      </div>

      <div className={`modal-overlay ${isEditModalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <h3 style={{ marginTop: 0, marginBottom: '24px', fontSize: '20px', fontWeight:900 }}>리포트 관리</h3>
          <div className="input-group">
            <label className="title-label">제목 수정</label>
            <input type="text" className="title-input" value={editDocTitle} onChange={(e) => setEditDocTitle(e.target.value)} />
          </div>
          <div className="input-group" style={{ marginBottom: '32px' }}>
            <label className="title-label">공개 상태</label>
            <select className="title-input" value={editDocStatus} onChange={(e) => setEditDocStatus(e.target.value)}>
              <option value="public">공개 (모두 열람 가능)</option>
              <option value="private">비공개 (링크 소유자만)</option>
            </select>
          </div>
          <button className="submit-btn" style={{margin:0, marginBottom:'12px'}} onClick={submitReportEdit}>저장</button>
          <button className="submit-btn" style={{ background: 'white', color: 'var(--danger)', border: '1px solid var(--border-color)', margin:0 }} onClick={deleteReport}>삭제</button>
          <button className="sheet-btn cancel" style={{marginTop:'16px'}} onClick={() => setIsEditModalOpen(false)}>닫기</button>
        </div>
      </div>
      
      <div className={`modal-overlay ${isProfileModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{ width: '100%', maxHeight:'90vh' }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px', fontSize: '20px', fontWeight:900 }}>프로필 편집</h3>
          
          <div className="author-avatar" style={{width:'88px', height:'88px', margin:'0 auto 24px auto', position:'relative', fontSize:'32px'}} onClick={() => profilePicRef.current.click()}>
            {editProfilePic ? <img src={editProfilePic} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="프로필" /> : (editName || '작업자').charAt(0)}
            <div style={{position: 'absolute', bottom: 0, left: 0, width: '100%', height: '30%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight:bold}}>EDIT</div>
          </div>
          
          <div className="input-group">
            <label className="title-label">이름</label>
            <input type="text" className="title-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="title-label">상호</label>
            <input type="text" className="title-input" placeholder="예: 김반장 클린" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="title-label">사업자 등록번호 {(currentUser && currentUser.bizStatus === 'pending') && <span style={{color:'var(--danger)', fontSize:'11px'}}>(검수중)</span>}</label>
            <input type="text" className="title-input" placeholder="숫자만 입력" value={editBizNum} maxLength={12} onChange={handleBizNumChange} />
          </div>
          <div className="input-group">
            <label className="title-label">한 줄 소개</label>
            <input type="text" className="title-input" value={editIntro} onChange={(e) => setEditIntro(e.target.value)} />
          </div>
          <div className="input-group" style={{ marginBottom: '32px' }}>
            <label className="title-label">키워드 (쉼표 구분)</label>
            <input type="text" className="title-input" placeholder="예: 입주청소, 꼼꼼함" value={editKeywords} onChange={(e) => setEditKeywords(e.target.value)} />
          </div>
          
          <button className="submit-btn" style={{margin:0}} onClick={saveProfile}>저장</button>
          <button className="sheet-btn cancel" style={{marginTop:'16px'}} onClick={() => setIsProfileModalOpen(false)}>취소</button>
        </div>
      </div>

      <div className={`modal-overlay ${isNotiModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{padding:'24px 20px'}}>
          <h3 style={{ marginTop: 0, marginBottom: '24px', fontSize:'20px', fontWeight:900 }}>NOTIFICATIONS</h3>
          
          {appUpdateNoti && (
             <div style={{padding:'16px', borderBottom:'1px solid var(--border-color)', background: appUpdateNoti.isRead ? 'transparent' : 'var(--primary-light)', borderRadius:'8px', marginBottom:'16px', textAlign:'left'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                    <div>
                        <p style={{margin:0, fontSize:'14px', color: 'var(--text-main)', fontWeight:'900', marginBottom:'8px'}}>ADMIN</p>
                        <p style={{margin:0, fontSize:'13px', color:'var(--text-sub)', lineHeight:'1.5', fontWeight:600}}>{appUpdateNoti.text}</p>
                    </div>
                </div>
             </div>
          )}

          {notifications.length === 0 && (!appUpdateNoti) ? (
            <div style={{padding:'40px 0'}}>
              <p style={{fontSize:'14px', color:'var(--text-sub)', margin:0, fontWeight:700}}>알림이 없습니다.</p>
            </div>
          ) : (
            <div style={{textAlign:'left'}}>
              {notifications.map(n => (
                <div key={n.id} style={{padding:'16px', border:'1px solid var(--border-color)', background: n.isRead ? 'white' : 'var(--primary-light)', borderRadius:'8px', marginBottom:'12px'}}>
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                    <p style={{margin:0, fontSize:'13px', color: 'var(--text-main)', fontWeight: n.isRead ? 600 : 800, lineHeight:1.5}}>
                        <strong>{n.fromName}</strong>님이 {n.type === 'like' ? '리포트를 좋아합니다.' : '리포트에 댓글을 남겼습니다.'}
                    </p>
                  </div>
                </div>
              ))}
              <button className="sheet-btn" style={{marginTop:'24px', border:'1px solid var(--text-main)'}} onClick={markAllNotisAsRead}>모두 읽음</button>
            </div>
          )}
          <button className="sheet-btn cancel" onClick={() => setIsNotiModalOpen(false)}>닫기</button>
        </div>
      </div>

      <div className={`bottom-sheet-overlay ${postOptionsMenu ? 'active' : ''}`} onClick={() => setPostOptionsMenu(null)}></div>
      <div className={`bottom-sheet ${postOptionsMenu ? 'active' : ''}`}>
        <p style={{ margin: '0 0 24px 0', fontWeight: 900, textAlign: 'center', fontSize:'18px' }}>옵션</p>
        <button className="sheet-btn" onClick={() => { setPostOptionsMenu(null); setIsReportPostModalOpen(true); }}>신고하기</button>
        <button className="sheet-btn" style={{color:'var(--danger)', borderColor:'var(--danger)'}} onClick={blockUser}>이 작업자 차단</button>
        <button className="sheet-btn cancel" style={{marginTop:'16px'}} onClick={() => setPostOptionsMenu(null)}>취소</button>
      </div>

      <div className={`modal-overlay ${isReportPostModalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize:'20px', fontWeight:900 }}>신고하기</h3>
          <textarea className="title-input" style={{height:'120px', resize:'none', marginBottom:'24px'}} placeholder="사유를 입력해주세요" value={reportReason} onChange={(e) => setReportReason(e.target.value)}></textarea>
          <button className="submit-btn" style={{ background: 'var(--danger)', border: 'none', margin:0 }} onClick={submitReportPost}>제출</button>
          <button className="sheet-btn cancel" style={{marginTop:'16px'}} onClick={() => { setIsReportPostModalOpen(false); setReportReason(''); }}>취소</button>
        </div>
      </div>

      <div className={`modal-overlay ${isFeedbackModalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <h3 style={{ marginTop: 0, marginBottom: '24px', fontSize:'20px', fontWeight:900 }}>피드백 보내기</h3>
          <select className="title-input" style={{ marginBottom: '16px', cursor: 'pointer' }} value={feedbackCategory} onChange={(e) => setFeedbackCategory(e.target.value)}>
            <option value="기능 관련">기능 관련</option>
            <option value="오류 제보">오류 제보</option>
            <option value="디자인">디자인</option>
            <option value="기타">기타</option>
          </select>
          <textarea className="title-input" style={{height:'120px', resize:'none', marginBottom:'24px'}} placeholder="자유롭게 적어주세요" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)}></textarea>
          <button className="submit-btn" style={{margin:0}} onClick={submitFeedback}>전송</button>
          <button className="sheet-btn cancel" style={{marginTop:'16px'}} onClick={() => setIsFeedbackModalOpen(false)}>닫기</button>
        </div>
      </div>

      <div className={`bottom-sheet-overlay ${isPhotoSheetOpen ? 'active' : ''}`} onClick={() => setIsPhotoSheetOpen(false)}></div>
      <div className={`bottom-sheet ${isPhotoSheetOpen ? 'active' : ''}`}>
        <p style={{ margin: '0 0 24px 0', fontWeight: 900, textAlign: 'center', fontSize:'18px' }}>업로드 방식</p>
        <button className="sheet-btn" onClick={() => triggerPhotoInput('camera')}>카메라 촬영</button>
        <button className="sheet-btn" onClick={() => triggerPhotoInput('gallery')}>앨범에서 선택</button>
        <button className="sheet-btn cancel" style={{marginTop:'16px'}} onClick={() => setIsPhotoSheetOpen(false)}>취소</button>
      </div>

      <div className={`modal-overlay ${selectedImage ? 'active' : ''}`} onClick={() => setSelectedImage(null)} style={{zIndex: 1000}}>
        {selectedImage && (
          <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', boxSizing: 'border-box'}}>
            <img src={selectedImage} alt="확대" style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', background:'white'}} />
            <button style={{position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.9)', color: 'black', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '24px', fontWeight:900, cursor: 'pointer'}}>×</button>
          </div>
        )}
      </div>

      <div className={`modal-overlay ${isFinishModalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize:'24px', fontWeight:900 }}>COMPLETED</h3>
          <p style={{ fontSize: '15px', color: 'var(--text-sub)', marginBottom: '32px', fontWeight:700 }}>리포트가 성공적으로 발행되었습니다.</p>
          <button className="submit-btn" style={{ background: 'var(--kakao)', color: 'var(--kakao-text)', border: 'none', margin:0, marginBottom:'12px' }} onClick={() => {setIsFinishModalOpen(false); setIsAlimtalkModalOpen(true);}}>알림톡으로 전송</button>
          <button className="submit-btn" style={{ margin:0 }} onClick={() => { copyLink(latestReportId); setTimeout(() => { setIsFinishModalOpen(false); setTaskTitle(''); setTaskDate(getToday()); setSpaces([{...defaultSpace}]); setIsPrivateUpload(false); switchView('feed'); }, 1500); }}>링크 복사</button>
          <button className="sheet-btn cancel" style={{marginTop:'24px'}} onClick={() => { setIsFinishModalOpen(false); setTaskTitle(''); setTaskDate(getToday()); setSpaces([{...defaultSpace}]); setIsPrivateUpload(false); switchView('feed'); }}>홈으로</button>
        </div>
      </div>

      <div className={`modal-overlay ${confirmDialog.show ? 'active' : ''}`}>
        <div className="modal-content" style={{padding:'32px 24px'}}>
            <h3 style={{marginTop:0, marginBottom:'24px', fontSize:'16px', color:'var(--text-main)', lineHeight:'1.6', fontWeight:800}}>{confirmDialog.msg}</h3>
            <div style={{display:'flex', gap:'12px'}}>
                <button className="sheet-btn" style={{flex:1, margin:0}} onClick={() => setConfirmDialog({show:false, msg:'', onConfirm:null})}>취소</button>
                <button className="submit-btn" style={{flex:1, margin:0}} onClick={confirmDialog.onConfirm}>확인</button>
            </div>
        </div>
      </div>

      <div className={`toast ${toastMsg.show ? 'show' : ''}`}>{toastMsg.msg}</div>
    </div>
  );
}