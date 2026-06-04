"use client";
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  OAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  setPersistence, 
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  deleteUser
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

// 💡 Next.js 빌더가 환경변수를 올바르게 치환하면서도 브라우저 오류를 막는 안전한 선언
let firebaseConfig;
if (typeof __firebase_config !== 'undefined' && __firebase_config) {
  firebaseConfig = JSON.parse(__firebase_config); // 캔버스 미리보기용
} else {
  // 실제 로컬 및 Vercel 구동용 환경변수 직접 할당
  firebaseConfig = {
    apiKey: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_API_KEY : '',
    authDomain: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN : '',
    projectId: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID : '',
    storageBucket: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET : '',
    messagingSenderId: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID : '',
    appId: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_APP_ID : ''
  };
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
auth.languageCode = 'ko'; // 카카오 로그인 및 이메일 인증 언어를 한국어로 강제 고정
const googleProvider = new GoogleAuthProvider();
const kakaoProvider = new OAuthProvider('oidc.kakao');
const db = getFirestore(app); 
const storage = getStorage(app); 

const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'beforeter-app';
const APP_VERSION = 'v1.0.4 (2026-06-03 배포)';

const EMAILJS_SERVICE_ID = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID : "";
const EMAILJS_TEMPLATE_ID = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID : "";
const EMAILJS_PUBLIC_KEY = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY : "";

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
- 필수항목: 이메일 주소, 이름(닉네임), 프로필 사진, 전화번호, 식별자(SNS 로그인 시)
- 선택항목: 사업자등록번호, 상호명, 연락처, 자기소개, 전문분야 키워드

3. 개인정보의 보유 및 이용기간
회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
- 회원 탈퇴 시까지 (단, 관계 법령에 따라 보존할 필요가 있는 경우 해당 법령에서 정한 기간 동안 보존)
`;

export default function App() {
  // 뷰 컨트롤 및 네비게이션 상태
  const [currentView, setCurrentView] = useState('feed'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // 인증 폼 상태 (로그인 / 회원가입)
  const [authMode, setAuthMode] = useState('login'); 
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState(''); 
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [phoneVerifyCode, setPhoneVerifyCode] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  // 유저 및 데이터 상태
  const [currentUser, setCurrentUser] = useState(null); 
  const [feedData, setFeedData] = useState([]); 
  const [notifications, setNotifications] = useState([]);
  const [myFeedbacks, setMyFeedbacks] = useState([]); 
  const [appUpdateNoti, setAppUpdateNoti] = useState(null); 
  const [pendingBizUsers, setPendingBizUsers] = useState([]); 
  
  // 로컬 스토리지 차단 목록 초기화
  const [blockedUsers, setBlockedUsers] = useState([]);
  
  useEffect(() => {
    try {
      const stored = localStorage.getItem('beporter_blocked');
      if (stored) setBlockedUsers(JSON.parse(stored));
    } catch(e) {}
  }, []);
  
  // 모달 및 UI 상태
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
  
  // 슬라이딩 배너 상태
  const banners = [
    { title: "10초 완성 나만의 작업리포트 🚀", desc: "사진 2장으로 나를 증명하다 비포터" },
    { title: "고객 신뢰도 200% 상승 📈", desc: "깔끔한 리포트로 전문성을 어필하세요" },
    { title: "내 작업의 가치를 높이다 ✨", desc: "비포터와 함께 더 많은 고객을 만나세요" }
  ];
  const [bannerIdx, setBannerIdx] = useState(0);

  // 날짜 유틸리티
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
  const [editPhone, setEditPhone] = useState(''); 

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
    if (!EMAILJS_SERVICE_ID || EMAILJS_SERVICE_ID === "YOUR_SERVICE_ID") return;
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
        if (!response.ok) console.error("EmailJS 전송 실패");
    } catch (error) {
        console.error("EmailJS 네트워크 전송 에러:", error);
    }
  };

  const updateMetaTags = (report) => {
    if (!report) return;
    document.title = `${report.title} - 비포터`;
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
    const timer = setInterval(() => {
      setBannerIdx(prev => (prev + 1) % banners.length);
    }, 3500);
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
            provider: user.providerData[0]?.providerId === 'oidc.kakao' ? 'Kakao' : (user.providerData[0]?.providerId === 'password' ? 'Email' : 'Google'),
            phone: ''
          };
          
          if (userSnap.exists()) {
            userData = { ...userData, ...userSnap.data(), id: user.uid };
          } else {
            if (userData.provider !== 'Email') {
              await setDoc(userRef, userData);
              sendEmailNotification(
                  `[비포터] 🎉 새로운 작업자 회원가입!`,
                  `이름: ${userData.name}\n이메일: ${userData.email}\n가입 플랫폼: ${userData.provider}\n\n새로운 회원이 비포터에 합류했습니다.`
              );
            }
          }
          setCurrentUser(userData);
        } catch (error) {
          console.error("사용자 DB 연동 중 오류 발생:", error);
          setCurrentUser({
            id: user.uid, 
            name: user.displayName || '작업자', 
            profilePic: user.photoURL || '', 
            email: user.email || '', 
            provider: 'Google'
          });
        }
        
        try {
          const notiQ = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'notifications'), where("targetUserId", "==", user.uid));
          onSnapshot(notiQ, (snap) => {
            const notis = [];
            snap.forEach(d => notis.push({ id: d.id, ...d.data() }));
            notis.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setNotifications(notis);
          }, (err) => console.error("알림 로드 오류:", err));
        } catch (e) { console.error(e); }

        try {
          const fbQ = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'feedbacks'), where("userId", "==", user.uid));
          onSnapshot(fbQ, (snap) => {
            const fbs = [];
            snap.forEach(d => fbs.push({ id: d.id, ...d.data() }));
            fbs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setMyFeedbacks(fbs);
          }, (err) => console.error("피드백 로드 오류:", err));
        } catch (e) { console.error(e); }

        if (user.email === 'jinthemoon@kakao.com') {
            try {
                const adminQ = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'users'), where("bizStatus", "==", "pending"));
                onSnapshot(adminQ, (snap) => {
                    const pUsers = [];
                    snap.forEach(d => pUsers.push({ id: d.id, ...d.data() }));
                    setPendingBizUsers(pUsers);
                });
            } catch (e) { console.error("관리자 로드 오류:", e); }
        }

      } else { 
        setCurrentUser(null); 
        setNotifications([]); 
        setMyFeedbacks([]);
        setPendingBizUsers([]);
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
    }, (error) => {
      console.error("데이터 읽기 오류:", error);
    });
    return () => unsubscribe();
  }, []); 

  useEffect(() => {
    if (detailReport && feedData.length > 0) {
      const updated = feedData.find(r => r.id === detailReport.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(detailReport)) {
          setDetailReport(updated);
          updateMetaTags(updated);
      }
    }
  }, [feedData]);

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
            } catch (e) { 
              setCurrentLocation('경기도 수원시'); 
            }
          },
          (err) => setCurrentLocation('위치 권한 거부됨')
        );
      } else { 
        setCurrentLocation('위치 기능 미지원 기기'); 
      }
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
    setCurrentView(view); 
    window.scrollTo(0, 0); 
  };
  
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  
  const checkAuthAndAction = (cb) => { 
    if (!currentUser) { 
      showToast("로그인이 필요합니다."); 
      switchView('login'); 
    } else {
      cb();
    }
  };
  
  const triggerConfirm = (msg, action) => {
    setConfirmDialog({ show: true, msg, onConfirm: () => { action(); setConfirmDialog({show: false, msg:'', onConfirm:null}); } });
  };

  const handleSendVerification = () => {
    if(authPhone.length < 10) return showToast("올바른 휴대폰 번호를 입력해주세요.");
    setIsCodeSent(true);
    showToast("인증번호가 발송되었습니다. (테스트용: 123456)");
  };

  const handleVerifyCode = () => {
    if(phoneVerifyCode === '123456') {
        setIsPhoneVerified(true);
        showToast("휴대폰 인증이 완료되었습니다.");
    } else {
        showToast("인증번호가 일치하지 않습니다.");
    }
  };

  const processEmailSignup = async () => {
    if (!termsAgreed || !privacyAgreed) return showToast("서비스 이용약관 및 개인정보 수집에 동의해주세요.");
    if (!authName.trim() || !authPhone.trim() || !authEmail.trim() || !authPassword) {
        return showToast("모든 정보를 올바르게 입력해주세요.");
    }
    if (!isPhoneVerified) return showToast("휴대폰 인증을 완료해주세요.");
    if (authPassword !== authPasswordConfirm) return showToast("비밀번호가 일치하지 않습니다.");
    if (authPassword.length < 6) return showToast("비밀번호는 6자리 이상이어야 합니다.");

    try {
        await setPersistence(auth, browserLocalPersistence);
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        const user = userCredential.user;
        
        const newUserData = {
            id: user.uid,
            name: authName,
            phone: authPhone, 
            email: authEmail,
            provider: 'Email',
            company: '',
            bizNum: '',
            bizStatus: 'none',
            affiliation: '',
            profilePic: '',
            intro: '',
            keywords: [],
            createdAt: serverTimestamp()
        };

        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', user.uid), newUserData);
        
        sendEmailNotification(
            `[비포터] 🎉 정식 회원가입 완료!`,
            `이름: ${authName}\n연락처: ${authPhone}\n이메일: ${authEmail}\n\n이메일 기반 정식 회원가입이 완료되었습니다.`
        );

        showToast(`${authName}님, 비포터에 오신 것을 환영합니다!`);
        switchView('feed');
    } catch(error) {
        console.error("회원가입 에러:", error);
        if(error.code === 'auth/email-already-in-use') showToast("이미 사용 중인 이메일입니다.");
        else showToast("회원가입에 실패했습니다.");
    }
  };

  const processEmailLogin = async () => {
    if (!authEmail.trim() || !authPassword) return showToast("이메일과 비밀번호를 입력해주세요.");
    try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
        showToast("환영합니다!");
        switchView('feed');
    } catch(error) {
        console.error("로그인 에러:", error);
        showToast("아이디 또는 비밀번호를 확인해주세요.");
    }
  };

  const processGoogleLogin = async () => {
    if (authMode === 'signup' && (!termsAgreed || !privacyAgreed)) {
        return showToast("서비스 이용약관 및 개인정보 수집에 동의해주세요.");
    }
    try { 
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider); 
      showToast(`환영합니다! 구글 로그인이 완료되었습니다.`); 
      switchView('feed'); 
    } catch (error) { 
      console.error("구글 로그인 에러:", error);
      if (error.code === 'auth/unauthorized-domain') {
          triggerConfirm("Firebase 보안 알림: 승인된 도메인에 등록되어 있지 않아 차단되었습니다.", () => {});
      } else {
          showToast("구글 로그인에 실패했습니다."); 
      }
    }
  };

  const processKakaoLogin = async () => {
    if (authMode === 'signup' && (!termsAgreed || !privacyAgreed)) {
        return showToast("서비스 이용약관 및 개인정보 수집에 동의해주세요.");
    }
    try { 
      kakaoProvider.setCustomParameters({ prompt: 'select_account' });
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, kakaoProvider); 
      showToast(`환영합니다! 카카오톡 로그인이 완료되었습니다.`); 
      switchView('feed'); 
    } catch (error) { 
      console.error("카카오 로그인 에러:", error);
      if (error.code === 'auth/unauthorized-domain') {
          triggerConfirm("Firebase 보안 알림: 승인된 도메인에 등록되어 있지 않아 차단되었습니다.", () => {});
      } else {
          showToast("카카오 디벨로퍼스 설정(Redirect URI 등)을 확인해 주세요."); 
      }
    }
  };

  const processLogout = async () => {
    try { 
      await signOut(auth); 
      setAuthEmail('');
      setAuthPassword('');
      setAuthPasswordConfirm('');
      setAuthName('');
      setAuthPhone('');
      setPhoneVerifyCode('');
      setIsCodeSent(false);
      setIsPhoneVerified(false);
      
      showToast('로그아웃 되었습니다.'); 
      setIsMenuOpen(false); 
      switchView('feed'); 
    } catch (error) { 
      showToast("로그아웃 실패"); 
    }
  };

  const deleteAccount = async () => {
    triggerConfirm("정말 탈퇴하시겠습니까? 작성한 데이터는 삭제되지 않습니다.", async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', user.uid));
                await deleteUser(user);
                showToast("회원 탈퇴가 완료되었습니다.");
                setIsMenuOpen(false);
                switchView('feed');
            }
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/requires-recent-login') {
                showToast("보안을 위해 다시 로그인한 후 탈퇴해 주세요.");
                processLogout();
            } else {
                showToast("탈퇴 처리 중 오류가 발생했습니다.");
            }
        }
    });
  };

  const formatBizNum = (value) => {
    const raw = value.replace(/[^0-9]/g, '');
    let res = '';
    if (raw.length < 4) res = raw;
    else if (raw.length < 6) res = raw.substring(0, 3) + '-' + raw.substring(3);
    else res = raw.substring(0, 3) + '-' + raw.substring(3, 5) + '-' + raw.substring(5, 10);
    return res;
  };

  const handleBizNumChange = (e) => setEditBizNum(formatBizNum(e.target.value));

  const openProfileEdit = () => { 
    setEditName(currentUser.name || ''); 
    setEditCompany(currentUser.company || '');
    setEditBizNum(currentUser.bizNum || '');
    setEditProfilePic(currentUser.profilePic || ''); 
    setEditIntro(currentUser.intro || ''); 
    setEditKeywords((currentUser.keywords || []).join(', '));
    setEditPhone(currentUser.phone || ''); 
    setIsProfileModalOpen(true); 
  };

  const resizeAndCompressImage = (file, callback, maxWidth = 800) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image(); 
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width; 
        let height = img.height;
        if (width > maxWidth) { 
          height *= maxWidth / width; 
          width = maxWidth; 
        }
        canvas.width = width; 
        canvas.height = height;
        const ctx = canvas.getContext('2d'); 
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
    reader.readAsDataURL(file);
  };

  const handleProfilePicSelect = (e) => { 
    if (e.target.files[0]) { resizeAndCompressImage(e.target.files[0], setEditProfilePic, 400); }
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
      bizStatus: newBizStatus, profilePic: editProfilePic, intro: editIntro, keywords: kwdArray,
      phone: editPhone
    };
    
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', currentUser.id), updatedUser);
      setCurrentUser(updatedUser); 
      setIsProfileModalOpen(false); 
      showToast("프로필이 저장되었습니다.");

      if (newBizStatus === 'pending') {
          sendEmailNotification(
            `[비포터] 🏢 사업자 등록번호 검수 요청`,
            `사용자: ${currentUser.name} (${currentUser.id})\n상호명: ${editCompany}\n사업자번호: ${editBizNum}`
          );
          showToast("사업자 검수가 요청되었습니다.");
      }
    } catch(e) { showToast("프로필 저장에 실패했습니다."); }
  };

  const approveBiz = async (userId, userName) => {
    triggerConfirm(`[${userName}]님의 사업자를 승인하시겠습니까?`, async () => {
        try {
            await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', userId), { bizStatus: 'approved' });
            showToast("승인 완료!");
        } catch(e) { showToast("승인 실패"); }
    });
  };

  const rejectBiz = async (userId, userName) => {
    triggerConfirm(`[${userName}]님의 사업자를 거절하시겠습니까?`, async () => {
        try {
            await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', userId), { bizStatus: 'none', bizNum: '' });
            showToast("거절 완료!");
        } catch(e) { showToast("거절 실패"); }
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
      if (file.size > 10 * 1024 * 1024) {
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
    if (spaces.some(sp => !sp.beforeImg || !sp.afterImg)) return showToast("모든 공간의 사진을 첨부해주세요!");

    setIsUploading(true); 
    showToast("저장 중...");
    
    try {
      const timeStamp = Date.now();
      
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
        authorId: currentUser.id, authorName: currentUser.name || '작업자', 
        authorCompany: currentUser.company || '', authorPic: currentUser.profilePic || '', 
        title: taskTitle, taskDate: taskDate, category: taskCategory, spaces: uploadedSpaces, 
        status: isPrivateUpload ? 'private' : 'public', history: [], comments: [], likes: [],
        location: shareLocation ? currentLocation : '', createdAt: serverTimestamp()
      });
      
      sendEmailNotification(`[비포터] 🚀 새 리포트 등록`, `작성자: ${currentUser.name}\n작업 제목: ${taskTitle}\n링크: https://www.beforeter.com/report/${docRef.id}`);
      setLatestReportId(docRef.id); setIsFinishModalOpen(true);
    } catch (error) { 
      showToast("업로드 오류가 발생했습니다."); console.error(error);
    } finally { setIsUploading(false); }
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
    } catch (e) { showToast("수정 실패"); }
  };

  const deleteReport = async () => {
    triggerConfirm("정말 이 리포트를 삭제하시겠습니까? 복구할 수 없습니다.", async () => {
      setIsEditModalOpen(false);
      try { await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', detailReport.id)); showToast("삭제 완료"); switchView('feed'); } 
      catch(e) { showToast("삭제 실패"); }
    });
  };

  const copyLink = (id) => {
    const textarea = document.createElement('textarea'); textarea.value = `https://www.beforeter.com/report/${id}`;
    document.body.appendChild(textarea); textarea.select();
    try { document.execCommand('copy'); showToast("주소가 복사되었습니다!"); } 
    catch (err) { showToast("복사 실패"); } finally { document.body.removeChild(textarea); }
  };
  
  const copyProfileLink = (id) => {
    const textarea = document.createElement('textarea'); textarea.value = `https://www.beforeter.com/profile/${id}`;
    document.body.appendChild(textarea); textarea.select();
    try { document.execCommand('copy'); showToast("프로필 주소가 복사되었습니다!"); } 
    catch (err) { showToast("복사 실패"); } finally { document.body.removeChild(textarea); }
  };

  const sendAlimtalk = async () => {
    if(alimtalkPhone.length < 10) return showToast("올바른 연락처를 입력해주세요.");
    
    setIsAlimtalkSending(true); 
    showToast(`${alimtalkPhone} 번호로 알림톡 전송을 요청합니다...`);

    try {
        const response = await fetch('/api/alimtalk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: alimtalkPhone,
                reportTitle: detailReport.title,
                reportUrl: `https://www.beforeter.com/report/${detailReport.id}`
            })
        });

        if (response.ok) {
            showToast(`알림톡이 성공적으로 전송되었습니다! 🚀`);
            setIsAlimtalkModalOpen(false); 
            setAlimtalkPhone('');
        } else {
            throw new Error('API 전송 실패');
        }
    } catch (error) { 
        console.error(error);
        showToast("알림톡 전송 중 오류가 발생했습니다. (서버 연결 필요)"); 
    } finally { 
        setIsAlimtalkSending(false); 
    }
  };

  const submitComment = async () => {
    if (!commentInput.trim()) return;
    if (!currentUser) return showToast("로그인 후 이용 가능합니다.");
    const newComment = { id: crypto.randomUUID(), authorId: currentUser.id, authorName: currentUser.name, authorPic: currentUser.profilePic, text: commentInput.trim(), createdAt: Date.now() };
    try {
        const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', detailReport.id);
        const updatedComments = [...(detailReport.comments || []), newComment];
        await updateDoc(docRef, { comments: updatedComments });
        setDetailReport(prev => ({ ...prev, comments: updatedComments })); setCommentInput(''); showToast("댓글이 등록되었습니다.");
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
    } catch(err) { showToast("요청 실패"); }
  };

  const submitFeedback = async () => { 
    if (!feedbackText.trim()) return showToast("내용을 입력해주세요."); 
    try {
      const fbData = { userId: currentUser?.id || 'anonymous', email: currentUser?.email || '비로그인', category: feedbackCategory, text: feedbackText, createdAt: serverTimestamp() };
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'feedbacks'), fbData);
      sendEmailNotification(`[비포터] 💡 피드백 접수`, `내용:\n${feedbackText}`);
      showToast("소중한 의견 감사합니다!"); setIsFeedbackModalOpen(false); setFeedbackText(''); setFeedbackCategory('기능 관련');
    } catch(e) { showToast("오류 발생"); }
  };

  const handleOpenNoti = () => setIsNotiModalOpen(true);
  const markAllNotisAsRead = async () => {
    if (appUpdateNoti && !appUpdateNoti.isRead) { localStorage.setItem('beporter_version', APP_VERSION); setAppUpdateNoti(prev => ({ ...prev, isRead: true })); }
    notifications.forEach(async (noti) => { if(!noti.isRead) { try { await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'notifications', noti.id), { isRead: true }); } catch (e) {} } });
    showToast("모두 읽음 처리 완료");
  };

  const blockUser = () => {
    if(!postOptionsMenu) return;
    triggerConfirm("이 작업자의 게시물을 차단하시겠습니까?", () => {
      const newBlocked = [...blockedUsers, postOptionsMenu.authorId];
      setBlockedUsers(newBlocked); localStorage.setItem('beporter_blocked', JSON.stringify(newBlocked));
      showToast("해당 사용자가 차단되었습니다."); setPostOptionsMenu(null); if(currentView === 'detail') switchView('feed');
    });
  };

  const submitReportPost = async () => {
    if(!reportReason.trim()) return showToast("신고 사유를 입력해주세요.");
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reports_flagged'), { reporterId: currentUser.id, reportId: postOptionsMenu.reportId, reason: reportReason, createdAt: serverTimestamp() });
      showToast("신고 접수 완료."); setIsReportPostModalOpen(false); setReportReason(''); setPostOptionsMenu(null);
    } catch(e) { showToast("신고 실패"); }
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

  const isSignupValid = authName.trim() && authEmail.trim() && authPassword.length >= 6 && termsAgreed && privacyAgreed;
  const isLoginValid = authEmail.trim() && authPassword.trim();

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
        /* 💡 화면 너비 출렁임(Jumping) 방지용 뷰포트 고정 속성 */
        html { overflow-y: scroll; overflow-x: hidden; width: 100vw; }
        body { 
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif; 
            background-color: #f1f5f9; margin: 0; padding: 0; color: #111827; 
            -webkit-tap-highlight-color: transparent; overflow-x: hidden; 
        }
        
        :root { 
            --primary: #000000; --primary-hover: #333333; --primary-light: #f9fafb; 
            --card-bg: #ffffff; --text-main: #111827; --text-sub: #6b7280; 
            --danger: #dc2626; --kakao: #FEE500; --kakao-text: #000000; --border: #e5e7eb;
            --hancom-focus: #111827; 
        }
        
        .app-wrapper { 
            max-width: 480px; width: 100%; margin: 0 auto; min-height: 100vh; 
            background-color: #ffffff; position: relative; display: flex; flex-direction: column; 
            overflow-x: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.05);
        }
        
        .app-header { 
            position: sticky; top: 0; left: 0; width: 100%; height: 56px; background-color: var(--card-bg); 
            display: flex; align-items: center; justify-content: space-between; padding: 0 16px; 
            z-index: 50; border-bottom: 1px solid var(--border); box-sizing: border-box;
        }
        
        .header-icon { background: none; border: none; color: var(--text-main); font-size: 24px; cursor: pointer; padding: 8px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: 0.2s; }
        .header-icon:active { background-color: var(--primary-light); }
        .header-title { font-size: 18px; font-weight: 900; color: var(--primary); letter-spacing: -0.5px; cursor: pointer; }
        
        .view-section { padding-bottom: 100px; flex: 1; box-sizing: border-box; background: #ffffff; display: flex; flex-direction: column; }
        
        .brand-hook-card { background: var(--primary); color: white; padding: 20px; border-radius: 8px; margin-bottom: 16px; text-align: left; min-height: 94px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; border: 1px solid var(--primary); }
        .brand-hook-card h3 { margin: 0 0 6px 0; font-size: 18px; font-weight: 800; }
        .brand-hook-card p { margin: 0; font-size: 13px; opacity: 0.9; line-height: 1.4; }
        
        .filter-scroll { display: flex; gap: 8px; overflow-x: auto; padding: 0 20px 16px 20px; margin: 0; scrollbar-width: none; }
        .filter-scroll::-webkit-scrollbar { display: none; }
        .filter-chip { padding: 8px 16px; border-radius: 4px; font-size: 13px; font-weight: 700; background: var(--card-bg); color: var(--text-sub); border: 1px solid var(--border); white-space: nowrap; cursor: pointer; transition: 0.2s; }
        .filter-chip.active { background: var(--primary); color: white; border-color: var(--primary); }

        .sidebar-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 100; opacity: 0; visibility: hidden; transition: all 0.3s; }
        .sidebar-overlay.active { opacity: 1; visibility: visible; }
        .sidebar { position: fixed; top: 0; left: -280px; width: 280px; height: 100%; background: white; z-index: 101; transition: all 0.3s; display: flex; flex-direction: column; border-right: 1px solid var(--border); }
        .sidebar.active { left: 0; }
        
        .feed-container { padding: 16px; flex: 1; }
        .feed-card { background: var(--card-bg); border-radius: 8px; padding: 16px; margin-bottom: 20px; border: 1px solid var(--border); cursor: pointer; position: relative; }
        .feed-author { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .author-avatar { width: 36px; height: 36px; background-color: var(--primary-light); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--text-main); font-weight: bold; font-size: 14px; overflow: hidden; cursor: pointer; border: 1px solid var(--border); }
        .author-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .feed-title { font-size: 16px; font-weight: 800; margin-bottom: 12px; line-height: 1.4; }
        .feed-images { display: flex; gap: 8px; height: 160px; }
        .feed-img-wrap { flex: 1; position: relative; border-radius: 4px; overflow: hidden; background-color: var(--primary-light); border: 1px solid var(--border); }
        .feed-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
        
        .badge { position: absolute; top: 8px; left: 8px; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 800; color: white; background: rgba(0,0,0,0.8); z-index: 10;}
        .biz-badge { background: var(--text-main); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-left: 6px; vertical-align: middle; }
        .biz-badge.pending { background: var(--primary-light); color: var(--text-sub); border: 1px solid var(--border); }
        .more-opts-btn { position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 18px; color: var(--text-sub); cursor: pointer; }
        
        .detail-card { background: var(--card-bg); border-radius: 8px; padding: 20px; margin-bottom: 20px; border: 1px solid var(--border); }
        .unified-desc { font-size: 14px; color: var(--text-main); background: var(--primary-light); padding: 16px; border-radius: 4px; margin-top: 12px; line-height: 1.5; border: 1px solid var(--border); }
        
        .view-mode-control { display: flex; background: var(--primary-light); padding: 4px; border-radius: 4px; margin-bottom: 20px; gap: 4px; border: 1px solid var(--border); }
        .view-mode-btn { flex: 1; padding: 10px; text-align: center; font-size: 13px; font-weight: 700; border-radius: 4px; cursor: pointer; color: var(--text-sub); transition: 0.2s; }
        .view-mode-btn.active { background: white; color: var(--text-main); border: 1px solid var(--border); }
        
        .flip-card { perspective: 1000px; width: 100%; height: 260px; cursor: pointer; border-radius: 4px; }
        .flip-card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s; transform-style: preserve-3d; }
        .flip-card.flipped .flip-card-inner { transform: rotateY(180deg); }
        .flip-card-front, .flip-card-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 4px; overflow: hidden; background-color: var(--primary-light); border: 1px solid var(--border); }
        .flip-card-back { transform: rotateY(180deg); }
        .noti-badge { position: absolute; top: 4px; right: 4px; background: var(--danger); color: white; font-size: 10px; font-weight: bold; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }

        .login-container { display: flex; flex-direction: column; align-items: stretch; justify-content: flex-start; height: 100%; padding: 40px 24px; text-align: left; box-sizing: border-box; max-width: 400px; margin: 0 auto; background: white;}
        .auth-tabs { display: flex; margin-bottom: 32px; border-bottom: 2px solid var(--border); }
        .auth-tabs button { flex: 1; background: none; border: none; padding: 14px 0; font-size: 16px; font-weight: 800; color: var(--text-sub); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: 0.2s; }
        .auth-tabs button.active-tab { color: var(--text-main); border-bottom: 2px solid var(--text-main); }
        .auth-form { display: flex; flex-direction: column; width: 100%; }

        .social-btn { width: 100%; padding: 14px; border-radius: 6px; font-size: 15px; font-weight: 700; cursor: pointer; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; gap: 12px; background: white; margin-bottom: 12px; color: var(--text-main); transition: 0.2s; }
        .social-btn.kakao { background-color: var(--kakao); color: var(--kakao-text); border-color: var(--kakao); }
        .social-btn:hover { filter: brightness(0.95); }
        
        .input-group { margin-bottom: 20px; text-align: left; width: 100%; }
        .title-label { display: block; font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 8px; }
        
        .title-input { width: 100%; height: 48px; border: 1px solid var(--border); border-radius: 6px; font-size: 15px; padding: 0 16px; box-sizing: border-box; background-color: #ffffff; font-family: inherit; color: var(--text-main); transition: border-color 0.2s, box-shadow 0.2s; }
        .title-input::placeholder { color: #a1a1aa; }
        .title-input:focus { outline: none; border-color: var(--hancom-focus); box-shadow: 0 0 0 1px var(--hancom-focus); }
        .title-input:disabled { background-color: #f3f4f6; cursor: not-allowed; color: #9ca3af;}

        .verify-flex { display: flex; gap: 8px; }
        .verify-btn { height: 48px; padding: 0 16px; background-color: white; border: 1px solid var(--text-main); color: var(--text-main); border-radius: 6px; font-size: 14px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: 0.2s;}
        .verify-btn:hover { background-color: #f9fafb; }
        .verify-btn:disabled { border-color: var(--border); color: #a1a1aa; cursor: not-allowed; background: white; }
        .verify-btn.success { background-color: #f0fdf4; border-color: #16a34a; color: #16a34a; }
        
        .photo-upload { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 160px; background-color: var(--primary-light); border: 1px dashed var(--text-sub); border-radius: 4px; cursor: pointer; color: var(--text-sub); font-size: 14px; font-weight: 700; overflow: hidden; }
        .photo-upload img.preview { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 10; }
        
        .submit-btn { width: 100%; height: 52px; background-color: var(--text-main); color: white; border: 1px solid var(--text-main); border-radius: 6px; font-size: 16px; font-weight: 800; margin-top: 10px; cursor: pointer; transition: 0.2s; }
        .submit-btn:disabled { background-color: #e5e7eb; border-color: #e5e7eb; color: #9ca3af; cursor: not-allowed; }
        
        .fab-container { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; display: flex; justify-content: center; z-index: 40; pointer-events: none; }
        .fab-btn { pointer-events: auto; background-color: var(--text-main); color: white; border: 1px solid var(--text-main); padding: 16px 28px; border-radius: 4px; font-size: 15px; font-weight: 800; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); cursor: pointer; }
        
        .modal-overlay, .bottom-sheet-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 200; opacity: 0; visibility: hidden; transition: all 0.3s; }
        .modal-overlay.active, .bottom-sheet-overlay.active { opacity: 1; visibility: visible; }
        .modal-content { background: white; width: 90%; max-width: 360px; border-radius: 8px; padding: 28px 24px; box-sizing: border-box; text-align: center; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); max-height: 80vh; overflow-y: auto; border: 1px solid var(--border); }
        .bottom-sheet { position: fixed; bottom: -100%; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; background: white; border-radius: 8px 8px 0 0; z-index: 201; padding: 24px 20px; box-sizing: border-box; transition: bottom 0.3s; border-top: 1px solid var(--border); border-left: 1px solid var(--border); border-right: 1px solid var(--border); }
        .bottom-sheet.active { bottom: 0; }
        .sheet-btn { width: 100%; padding: 16px; background: var(--primary-light); border: 1px solid var(--border); border-radius: 4px; font-size: 15px; font-weight: 700; margin-bottom: 12px; cursor: pointer; color: var(--text-main); }
        .sheet-btn.cancel { background: white; border: 1px solid var(--border); color: var(--text-sub); margin-top: 8px; }
        
        .toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(100px); background-color: var(--text-main); color: white; padding: 12px 24px; border-radius: 4px; font-size: 14px; font-weight: 700; z-index: 1000; opacity: 0; transition: all 0.3s; white-space: nowrap; pointer-events: none; }
        .toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }

        .checkbox-label { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; font-weight: 600; color: var(--text-sub); cursor: pointer; margin-bottom: 12px; }
        .checkbox-label input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--text-main); flex-shrink: 0; margin-top: 2px; }

        .common-footer { background-color: var(--primary-light); padding: 32px 20px; border-top: 1px solid var(--border); text-align: center; margin-top: auto; }
        .footer-links { margin-bottom: 16px; font-size: 13px; font-weight: 800; color: var(--text-sub); }
        .footer-links span { cursor: pointer; }
        .footer-links .divider { margin: 0 10px; color: var(--border); cursor: default; }
        .footer-info { font-size: 12px; color: #9ca3af; line-height: 1.6; }
        .footer-info p { margin: 0 0 4px 0; }
        .footer-info .copyright { margin-top: 12px; font-weight: 800; color: var(--text-sub); }
      `}</style>
      
      <div style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
        <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileSelect} />
        <input type="file" accept="image/*" ref={galleryInputRef} onChange={handleFileSelect} />
        <input type="file" accept="image/*" ref={profilePicRef} onChange={handleProfilePicSelect} />
      </div>

      <header className="app-header">
        <button className="header-icon" onClick={toggleMenu}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <div className="header-title" onClick={() => switchView('feed')}>비포터</div>
        <button className="header-icon" onClick={handleOpenNoti}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          {unreadNotis > 0 && <span className="noti-badge">{unreadNotis}</span>}
        </button>
      </header>

      <div className={`sidebar-overlay ${isMenuOpen ? 'active' : ''}`} onClick={toggleMenu}></div>
      <div className={`sidebar ${isMenuOpen ? 'active' : ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="sidebar-header" style={{padding:'30px 20px', background:'var(--primary-light)', borderBottom:'1px solid var(--border)'}}>
              {currentUser ? (
                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                  <div className="author-avatar" style={{width:'48px', height:'48px', fontSize:'20px', background:'white'}} onClick={() => {setIsMenuOpen(false); setSelectedImage(currentUser.profilePic);}}>
                    {currentUser.profilePic ? (
                      <img src={currentUser.profilePic} alt="프로필" />
                    ) : (
                      (currentUser.name || '작업자').charAt(0)
                    )}
                  </div>
                  <div>
                    <h2 style={{margin:0, color:'var(--text-main)', fontSize:'18px', fontWeight:900}}>
                        {currentUser.name}
                        {currentUser.bizStatus === 'pending' && <span className="biz-badge pending">검수중</span>}
                    </h2>
                    {currentUser.company && <p style={{margin:'4px 0 0 0', fontSize:'13px', color:'var(--text-sub)'}}>{currentUser.company}</p>}
                  </div>
                </div>
              ) : (
                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                  <div style={{width:'48px', height:'48px', background:'white', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:'bold', color:'var(--border)', border:'1px solid var(--border)'}}>?</div>
                  <div>
                    <h2 style={{margin:0, color:'var(--text-main)', fontSize:'18px', fontWeight:900}}>비포터</h2>
                    <p style={{margin:0, fontSize:'13px', color:'var(--text-sub)'}}>로그인 후 이용해보세요</p>
                  </div>
                </div>
              )}
            </div>
            
            <ul style={{listStyle:'none', padding:0, margin:0, flex:1, overflowY:'auto'}}>
              <li style={{borderBottom:'1px solid var(--border)'}}>
                <button onClick={() => { setIsMenuOpen(false); switchView('feed'); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'18px 20px', color:'var(--text-main)', fontSize:'15px', fontWeight:700, cursor:'pointer'}}>🏠 피드 홈</button>
              </li>
              <li style={{borderBottom:'1px solid var(--border)'}}>
                <button onClick={() => { setIsMenuOpen(false); switchView('about'); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'18px 20px', color:'var(--text-main)', fontSize:'15px', fontWeight:700, cursor:'pointer'}}>📖 서비스 소개</button>
              </li>
              {currentUser && (
                <li style={{borderBottom:'1px solid var(--border)'}}>
                  <button onClick={() => { setIsMenuOpen(false); switchView('mypage'); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'18px 20px', color:'var(--text-main)', fontSize:'15px', fontWeight:700, cursor:'pointer'}}>👤 마이페이지</button>
                </li>
              )}
              {currentUser?.email === 'jinthemoon@kakao.com' && (
                <li style={{borderBottom:'1px solid var(--border)', background:'#fef08a'}}>
                  <button onClick={() => { setIsMenuOpen(false); switchView('admin'); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'18px 20px', color:'#854d0e', fontSize:'15px', fontWeight:800, cursor:'pointer'}}>👑 관리자 (사업자 검수)</button>
                </li>
              )}
              <li style={{borderBottom:'1px solid var(--border)'}}>
                <button onClick={() => { setIsMenuOpen(false); checkAuthAndAction(() => setIsFeedbackModalOpen(true)); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'18px 20px', color:'var(--text-main)', fontSize:'15px', fontWeight:700, cursor:'pointer'}}>💡 피드백 전송</button>
              </li>
            </ul>
            
            <ul style={{listStyle:'none', padding:0, margin:0, borderTop:'1px solid var(--border)', background:'var(--primary-light)'}}>
              {currentUser ? (
                <li>
                  <button onClick={processLogout} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'20px', color:'var(--text-main)', fontSize:'14px', fontWeight:800, cursor:'pointer'}}>🚪 로그아웃</button>
                </li>
              ) : (
                <li>
                  <button onClick={() => { setIsMenuOpen(false); switchView('login'); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'20px', color:'var(--text-main)', fontSize:'14px', fontWeight:800, cursor:'pointer'}}>🔐 로그인 / 회원가입</button>
                </li>
              )}
            </ul>
        </div>
      </div>

      {currentView === 'admin' && currentUser?.email === 'jinthemoon@kakao.com' && (
        <div className="view-section">
          <div style={{padding:'20px', textAlign:'center', background:'var(--primary-light)', borderBottom:'1px solid var(--border)'}}>
            <h2 style={{margin:0, color:'var(--text-main)', fontSize:'20px', fontWeight:900}}>사업자 검수 관리</h2>
            <p style={{margin:'8px 0 0 0', fontSize:'13px', color:'var(--text-sub)'}}>대기중: {pendingBizUsers.length}명</p>
          </div>
          <div className="feed-container">
            {pendingBizUsers.length === 0 ? (
                <div style={{textAlign:'center', padding:'40px 20px', color:'var(--text-sub)', fontWeight:700}}>
                    대기 중인 요청이 없습니다.
                </div>
            ) : (
                pendingBizUsers.map(user => (
                    <div key={user.id} className="feed-card" style={{border:'2px solid var(--text-main)'}}>
                        <div style={{display:'flex', gap:'12px', alignItems:'center', marginBottom:'16px'}}>
                            <div className="author-avatar">{user.name.charAt(0)}</div>
                            <div>
                                <h3 style={{margin:0, fontSize:'16px'}}>{user.name} <span style={{fontSize:'12px', color:'var(--text-sub)'}}>({user.email})</span></h3>
                                <p style={{margin:'4px 0 0 0', fontSize:'14px', fontWeight:'700'}}>{user.company}</p>
                            </div>
                        </div>
                        <div style={{background:'var(--primary-light)', padding:'12px', borderRadius:'4px', marginBottom:'16px', border:'1px solid var(--border)'}}>
                            <p style={{margin:0, fontSize:'13px', color:'var(--text-sub)'}}>제출된 사업자번호:</p>
                            <p style={{margin:'4px 0 0 0', fontSize:'16px', fontWeight:'900', letterSpacing:'1px'}}>{user.bizNum}</p>
                        </div>
                        <div style={{display:'flex', gap:'10px'}}>
                            <button className="sheet-btn cancel" style={{margin:0, flex:1}} onClick={() => rejectBiz(user.id, user.name)}>거절</button>
                            <button className="sheet-btn" style={{margin:0, flex:1, background:'var(--text-main)', color:'white', border:'none'}} onClick={() => approveBiz(user.id, user.name)}>승인하기</button>
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>
      )}

      {currentView === 'feed' && (
        <div className="view-section">
          <div className="feed-container" style={{paddingBottom:0}}>
            <div className="brand-hook-card" key={bannerIdx} style={{animation: 'fadeSlide 0.5s ease'}}>
              <h3>{banners[bannerIdx].title}</h3>
              <p>{banners[bannerIdx].desc}</p>
            </div>
          </div>
          
          <div className="filter-scroll">
            {categories.map(cat => (
              <div key={cat} className={`filter-chip ${feedFilter === cat ? 'active' : ''}`} onClick={() => setFeedFilter(cat)}>{cat}</div>
            ))}
          </div>

          <div className="feed-container" style={{paddingTop:0}}>
            {displayedFeeds.length === 0 ? (
              <div style={{textAlign:'center', padding:'40px 20px', color:'var(--text-sub)', display:'flex', flexDirection:'column', alignItems:'center', gap:'12px'}}>
                <p style={{ margin: 0, fontWeight: 700 }}>아직 등록된 리포트가 없습니다.</p>
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
                        <span onClick={(e) => {e.stopPropagation(); showPublicProfile(item.authorId);}} style={{cursor:'pointer', fontWeight:800}}>
                            {item.authorName || '작업자'} <span style={{fontSize:'12px', color:'var(--text-sub)'}}>[{item.category || '기타'}]</span>
                        </span>
                        <p style={{margin:'2px 0 0 0', fontSize:'12px', color:'var(--text-sub)', fontWeight:600}}>{formatDisplayTime(item)}</p>
                      </div>
                    </div>
                    
                    <div className="feed-title">{item.title}</div>
                    <div className="feed-images">
                      <div className="feed-img-wrap">
                        <span className="badge" style={{ background: 'var(--text-main)' }}>Before</span>
                        <img src={renderSpaces[0].beforeImg} alt="Before" />
                      </div>
                      <div className="feed-img-wrap">
                        <span className="badge" style={{ background: 'white', color:'var(--text-main)' }}>After</span>
                        <img src={renderSpaces[0].afterImg} alt="After" />
                      </div>
                    </div>

                    <div style={{display:'flex', gap:'16px', fontSize:'13px', color:'var(--text-sub)', marginTop:'16px', fontWeight:'700'}}>
                        <button className="action-btn" onClick={(e) => handleToggleLike(item, e)} style={{background:'none', border:'none', padding:0, display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', color: item.likes?.includes(currentUser?.id) ? 'var(--text-main)' : 'var(--text-sub)'}}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill={item.likes?.includes(currentUser?.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> 
                            {(item.likes || []).length}
                        </button>
                        <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                            {(item.comments || []).length}
                        </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          
          {renderFooter()}

          <div className="fab-container">
            <button className="fab-btn" onClick={() => checkAuthAndAction(() => switchView('upload'))}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              내 리포트 올리기
            </button>
          </div>
        </div>
      )}

      {currentView === 'login' && (
        <div className="view-section" style={{ display:'flex', background:'white' }}>
          <div className="login-container">
            <div style={{width:'64px', height:'64px', background:'var(--text-main)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'32px', fontWeight:'900', marginBottom:'20px'}}>B</div>
            <h1 style={{margin:'0 0 8px 0', color:'var(--text-main)', fontSize:'24px', fontWeight:'900', letterSpacing:'-0.5px'}}>
                {authMode === 'login' ? '비포터 시작하기' : '정식 회원가입'}
            </h1>
            <p style={{margin:'0 0 32px 0', color:'var(--text-sub)', fontSize:'14px'}}>
                {authMode === 'login' ? '1분 만에 가입하고 신뢰를 공유하세요.' : '전문적인 작업 리포트를 만들어보세요.'}
            </p>
            
            <div className="auth-tabs">
                <button className={authMode === 'login' ? 'active-tab' : 'tab'} onClick={() => setAuthMode('login')}>로그인</button>
                <button className={authMode === 'signup' ? 'active-tab' : 'tab'} onClick={() => setAuthMode('signup')}>이메일 회원가입</button>
            </div>

            {authMode === 'signup' ? (
                <div className="auth-form">
                    <div className="input-group">
                        <label className="title-label">이름</label>
                        <input type="text" className="title-input" placeholder="실명을 입력해주세요 (필수)" value={authName} onChange={(e)=>setAuthName(e.target.value)} />
                    </div>
                    
                    <div className="input-group">
                        <label className="title-label">이메일 주소</label>
                        <input type="email" className="title-input" placeholder="example@email.com" value={authEmail} onChange={(e)=>setAuthEmail(e.target.value)} />
                    </div>

                    <div className="input-group">
                        <label className="title-label">비밀번호</label>
                        <input type="password" className="title-input" placeholder="6자리 이상 입력" value={authPassword} onChange={(e)=>setAuthPassword(e.target.value)} />
                    </div>

                    <div className="input-group">
                        <label className="title-label">비밀번호 확인</label>
                        <input type="password" className="title-input" placeholder="비밀번호를 한번 더 입력해주세요" value={authPasswordConfirm} onChange={(e)=>setAuthPasswordConfirm(e.target.value)} />
                        {authPasswordConfirm.length > 0 && (
                            <p style={{fontSize:'12px', marginTop:'6px', color: authPassword === authPasswordConfirm ? '#16a34a' : 'var(--danger)'}}>
                                {authPassword === authPasswordConfirm ? '✓ 비밀번호가 일치합니다.' : '비밀번호가 일치하지 않습니다.'}
                            </p>
                        )}
                    </div>

                    <div style={{background: 'var(--primary-light)', border: '1px solid var(--border)', padding: '16px', borderRadius: '6px', marginBottom: '24px'}}>
                        <label className="checkbox-label" style={{margin:0, borderBottom:'1px solid var(--border)', paddingBottom:'12px', marginBottom:'12px'}}>
                            <input type="checkbox" checked={termsAgreed && privacyAgreed} onChange={(e)=>{setTermsAgreed(e.target.checked); setPrivacyAgreed(e.target.checked)}} />
                            <span style={{fontWeight:'800', color:'var(--text-main)'}}>전체 약관 동의 (필수)</span>
                        </label>
                        <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                            <label className="checkbox-label" style={{margin:0, padding:0, border:'none', background:'transparent'}}>
                                <input type="checkbox" checked={termsAgreed} onChange={e=>setTermsAgreed(e.target.checked)} /> 
                                <span>(필수) <span style={{textDecoration:'underline'}} onClick={(e)=>{e.preventDefault(); setIsTermsModalOpen(true);}}>서비스 이용약관</span> 동의</span>
                            </label>
                            <label className="checkbox-label" style={{margin:0, padding:0, border:'none', background:'transparent'}}>
                                <input type="checkbox" checked={privacyAgreed} onChange={e=>setPrivacyAgreed(e.target.checked)} /> 
                                <span>(필수) <span style={{textDecoration:'underline'}} onClick={(e)=>{e.preventDefault(); setIsTermsModalOpen(true);}}>개인정보 수집 및 이용</span> 동의</span>
                            </label>
                        </div>
                    </div>
                    
                    <button className="submit-btn" disabled={!isSignupValid} onClick={processEmailSignup}>가입 완료 및 시작하기</button>
                </div>
            ) : (
                <div className="auth-form">
                    <div className="input-group">
                        <label className="title-label">이메일 주소</label>
                        <input type="email" className="title-input" placeholder="이메일 입력" value={authEmail} onChange={(e)=>setAuthEmail(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label className="title-label">비밀번호</label>
                        <input type="password" className="title-input" placeholder="비밀번호 입력" value={authPassword} onChange={(e)=>setAuthPassword(e.target.value)} />
                    </div>
                    <button className="submit-btn" disabled={!isLoginValid} onClick={processEmailLogin}>로그인</button>
                </div>
            )}

            <div style={{display:'flex', alignItems:'center', width:'100%', margin:'24px 0', color:'var(--text-sub)', fontSize:'12px', fontWeight:'700'}}>
                <div style={{flex:1, height:'1px', background:'var(--border)'}}></div>
                <span style={{padding:'0 16px'}}>또는 간편 로그인</span>
                <div style={{flex:1, height:'1px', background:'var(--border)'}}></div>
            </div>

            <button className="social-btn kakao" onClick={processKakaoLogin}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3c-5.52 0-10 3.58-10 8 0 2.85 1.8 5.34 4.5 6.74-.2.7-.6 2.22-.65 2.45-.06.28.1.28.24.18.12-.08 2.74-1.85 3.86-2.61.65.08 1.34.14 2.05.14 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
              </svg>
              카카오톡으로 계속하기
            </button>

            <button className="social-btn" onClick={processGoogleLogin}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12c0-.82-.07-1.61-.2-2.38H12v4.5h5.68a5.4 5.4 0 0 1-2.34 3.55v2.95h3.79C21.34 18.57 22 15.55 22 12z"/>
              </svg>
              Google 계정으로 계속하기
            </button>
            <p style={{fontSize:'12px', color:'var(--text-sub)', marginTop:'16px', fontWeight:'600'}}>SNS 계정 연동 시 회원가입이 자동으로 진행됩니다.</p>
          </div>
        </div>
      )}

      {/* 💡 [수정됨] 서비스 소개 섹션 전면 개편 (정부지원사업 공고 맞춤형 어필) */}
      {currentView === 'about' && (
        <div className="view-section" style={{background:'#ffffff', textAlign:'center'}}>
            <div style={{padding: '40px 20px', maxWidth: '440px', margin: '0 auto'}}>
                <div style={{width:'80px', height:'80px', background:'var(--text-main)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'40px', fontWeight:'900', margin:'0 auto 24px auto'}}>B</div>
                <h1 style={{fontSize:'24px', fontWeight:'900', color:'var(--text-main)', marginBottom:'12px'}}>동네 사장님을 위한 든든한 무기, 비포터</h1>
                <p style={{fontSize:'15px', color:'var(--text-sub)', lineHeight:'1.6', marginBottom:'48px', fontWeight:'600'}}>
                    플랫폼 수수료에 지친 로컬 소상공인 여러분,<br/>
                    이제 오직 <b>'실력'</b> 하나로 정당한 가치를 인정받으세요.
                </p>

                <div style={{textAlign:'left', display:'flex', flexDirection:'column', gap:'20px'}}>
                    <div style={{background:'var(--primary-light)', padding:'24px', borderRadius:'12px', border:'1px solid var(--border)'}}>
                        <h3 style={{margin:'0 0 12px 0', fontSize:'17px', color:'var(--text-main)', fontWeight:'900'}}>01. 실력은 있는데 마케팅이 막막하신가요? 🍋</h3>
                        <p style={{margin:0, fontSize:'14px', color:'var(--text-sub)', lineHeight:'1.6', fontWeight:'600'}}>
                            청소, 인테리어, 미용 등 오프라인 서비스는 시공 전까지 실력을 알 수 없는 대표적인 '레몬 마켓'입니다. 비포터는 단 10초 만에 작성되는 Before/After 리포트를 통해 사장님의 실력을 직관적으로 증명하고 고객의 불안을 완전히 해소합니다.
                        </p>
                    </div>
                    <div style={{background:'var(--primary-light)', padding:'24px', borderRadius:'12px', border:'1px solid var(--border)'}}>
                        <h3 style={{margin:'0 0 12px 0', fontSize:'17px', color:'var(--text-main)', fontWeight:'900'}}>02. 오프라인 노동의 디지털 자산화 💾</h3>
                        <p style={{margin:0, fontSize:'14px', color:'var(--text-sub)', lineHeight:'1.6', fontWeight:'600'}}>
                            현장에서 땀 흘려 일한 훌륭한 결과물들을 휴대폰 사진첩에만 방치하지 마세요. 비포터로 작성된 리포트는 투명한 데이터가 되어 차곡차곡 쌓이며, 사장님만의 가장 강력한 '신뢰 자산'이자 영업 무기가 됩니다.
                        </p>
                    </div>
                    <div style={{background:'var(--primary-light)', padding:'24px', borderRadius:'12px', border:'1px solid var(--border)'}}>
                        <h3 style={{margin:'0 0 12px 0', fontSize:'17px', color:'var(--text-main)', fontWeight:'900'}}>03. 수수료 없는 완전한 독립 생태계 💸</h3>
                        <p style={{margin:0, fontSize:'14px', color:'var(--text-sub)', lineHeight:'1.6', fontWeight:'600'}}>
                            대형 매칭 플랫폼의 과도한 수수료와 출혈 경쟁에 지치셨나요? 비포터가 제공하는 '오픈 프로필'로 나만의 독자적인 포트폴리오를 구축하세요. 인스타그램, 블로그 등 어디서든 고객을 직접 유치하고 지역 기반의 탄탄한 성장을 이뤄낼 수 있습니다.
                        </p>
                    </div>
                </div>

                <button className="submit-btn" style={{marginTop:'48px', height:'56px'}} onClick={() => switchView(currentUser ? 'feed' : 'login')}>
                    {currentUser ? '피드로 돌아가기' : '비포터와 함께 시작하기'}
                </button>
            </div>
            {renderFooter()}
        </div>
      )}

      {/* 💡 [수정됨] 뷰: 마이페이지 - 피드백 탭 추가 및 기능 고도화 */}
      {currentView === 'mypage' && currentUser && (
        <div className="view-section">
          <div className="mypage-header" style={{background: 'var(--card-bg)', padding: '30px 20px 0 20px', textAlign: 'center', position: 'relative'}}>
            <button style={{position: 'absolute', top: '16px', right: '16px', background: 'white', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', color: 'var(--text-main)'}} onClick={openProfileEdit}>
              프로필 수정
            </button>
            
            <div className="author-avatar" style={{margin: '0 auto 12px auto', width: '72px', height: '72px', fontSize: '28px'}} onClick={() => setSelectedImage(currentUser.profilePic)}>
              {currentUser.profilePic ? <img src={currentUser.profilePic} alt="프로필" /> : (currentUser.name || '작업자').charAt(0)}
            </div>
            
            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-main)', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontWeight: '900' }}>
                {currentUser.name}
                {currentUser.bizStatus === 'approved' && <span className="biz-badge">사업자 인증됨</span>}
                {currentUser.bizStatus === 'pending' && <span className="biz-badge pending">사업자 검수중</span>}
            </h2>
            {currentUser.company && <p style={{margin:'4px 0 0 0', fontSize:'14px', color:'var(--text-sub)', fontWeight:'600'}}>{currentUser.company}</p>}
            
            <p style={{margin:'8px 0 0 0', fontSize:'13px', color:'var(--text-sub)', fontWeight:'700'}}>
              📧 {currentUser.email || '이메일 없음'} &nbsp;|&nbsp; 🔗 {currentUser.provider === 'Email' ? '이메일' : currentUser.provider} 가입
            </p>

            <div style={{marginTop:'12px'}}>
                <p style={{fontSize:'14px', color:'var(--text-main)', margin:'0 0 8px 0', fontWeight:'700'}}>{currentUser.intro || '자기소개를 입력해주세요.'}</p>
                <div style={{display:'flex', gap:'6px', justifyContent:'center', flexWrap:'wrap'}}>
                    {(currentUser.keywords || []).map(k => <span key={k} style={{background:'var(--primary-light)', color:'var(--text-main)', border:'1px solid var(--border)', padding:'4px 10px', borderRadius:'4px', fontSize:'12px', fontWeight:'800'}}>#{k}</span>)}
                </div>
            </div>

            <button className="sheet-btn" style={{marginTop:'20px', padding:'12px', border:'1px solid var(--text-main)', color:'var(--text-main)', background:'white', fontSize:'14px'}} onClick={() => showPublicProfile(currentUser.id, true)}>
              내 오픈 프로필 미리보기
            </button>

            {/* 마이페이지 탭 전환 버튼 */}
            <div style={{display: 'flex', marginTop: '24px'}}>
              <button 
                style={{flex: 1, padding: '16px 0', fontWeight: '800', fontSize: '15px', transition: '0.2s', color: myPageTab === 'reports' ? 'var(--text-main)' : 'var(--text-sub)', borderBottom: myPageTab === 'reports' ? '3px solid var(--text-main)' : '3px solid transparent'}} 
                onClick={() => setMyPageTab('reports')}>
                내 리포트 ({myFeeds.length})
              </button>
              <button 
                style={{flex: 1, padding: '16px 0', fontWeight: '800', fontSize: '15px', transition: '0.2s', color: myPageTab === 'feedbacks' ? 'var(--text-main)' : 'var(--text-sub)', borderBottom: myPageTab === 'feedbacks' ? '3px solid var(--text-main)' : '3px solid transparent'}} 
                onClick={() => setMyPageTab('feedbacks')}>
                보낸 피드백 ({myFeedbacks.length})
              </button>
            </div>
          </div>
          
          <div className="feed-container">
            {myPageTab === 'reports' ? (
                <>
                {myFeeds.length === 0 ? (
                  <div style={{textAlign:'center', padding:'40px 20px', color:'var(--text-sub)'}}>
                    <p style={{ margin: 0, fontWeight: 700 }}>작성한 리포트가 없습니다.</p>
                  </div>
                ) : (
                  myFeeds.map((item, idx) => {
                      const renderSpaces = item.spaces && item.spaces.length > 0 ? item.spaces : [{ beforeImg: item.beforeImg, afterImg: item.afterImg }];
                      return (
                        <div key={item.id} className="feed-card" onClick={() => openDetailView(item.id)}>
                          <div className="feed-title" style={{marginBottom: '10px'}}>
                            {item.status === 'private' ? '🔒 ' : ''}{item.title}
                          </div>
                          <div style={{display:'flex', gap:'16px', fontSize:'13px', color:'var(--text-sub)', marginTop:'12px', fontWeight:'700'}}>
                            <span>📅 {item.taskDate?.replace(/-/g, '.')}</span>
                            <span>❤️ {(item.likes || []).length}</span>
                            <span>💬 {(item.comments || []).length}</span>
                          </div>
                          <div className="feed-images" style={{marginTop:'12px'}}>
                            <div className="feed-img-wrap"><img src={renderSpaces[0].beforeImg} alt="Before" /></div>
                            <div className="feed-img-wrap"><img src={renderSpaces[0].afterImg} alt="After" /></div>
                          </div>
                        </div>
                      )
                    })
                )}
                </>
            ) : (
                <>
                {myFeedbacks.length === 0 ? (
                  <div style={{textAlign:'center', padding:'40px 20px', color:'var(--text-sub)'}}>
                    <p style={{ margin: 0, fontWeight: 700 }}>전송한 피드백 내역이 없습니다.</p>
                  </div>
                ) : (
                  myFeedbacks.map(fb => (
                    <div key={fb.id} style={{background:'white', padding:'16px', borderRadius:'8px', marginBottom:'12px', border:'1px solid var(--border)', boxShadow:'0 2px 4px rgba(0,0,0,0.02)'}}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                            <div style={{fontSize:'12px', fontWeight:'900', color:'var(--primary)', background:'var(--primary-light)', padding:'4px 8px', borderRadius:'4px'}}>[{fb.category}]</div>
                            <div style={{fontSize:'12px', color:'var(--text-sub)', fontWeight:'600'}}>
                                {fb.createdAt?.toDate ? fb.createdAt.toDate().toLocaleDateString('ko-KR') : '방금 전'}
                            </div>
                        </div>
                        <div style={{fontSize:'14px', color:'var(--text-main)', lineHeight:'1.5', fontWeight:'600'}}>{fb.text}</div>
                    </div>
                  ))
                )}
                </>
            )}

            <div style={{ marginTop: '40px', paddingBottom: '20px', textAlign: 'center' }}>
                <button onClick={deleteAccount} style={{ background: 'none', border: 'none', color: 'var(--text-sub)', fontSize: '13px', textDecoration: 'underline', cursor: 'pointer', fontWeight:'600' }}>회원 탈퇴 처리</button>
            </div>
          </div>
          {renderFooter()}
        </div>
      )}

      {currentView === 'public-profile' && publicProfileUser && (
        <div className="view-section">
          <div style={{background: 'var(--card-bg)', padding: '20px 20px 30px 20px', textAlign: 'center', borderBottom: '1px solid var(--border)', position: 'relative'}}>
            <button style={{position: 'absolute', top: '16px', left: '16px', background: 'white', border: '1px solid var(--border)', width:'36px', height:'36px', borderRadius: '4px', display:'flex', alignItems:'center', justifyContent:'center', cursor: 'pointer', color: 'var(--text-main)'}} onClick={() => switchView('feed')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            
            <div className="author-avatar" style={{margin: '10px auto 12px auto', width: '72px', height: '72px', fontSize: '28px'}} onClick={() => setSelectedImage(publicProfileUser.profilePic)}>
              {publicProfileUser.profilePic ? <img src={publicProfileUser.profilePic} alt="프로필" /> : (publicProfileUser.name || '작업자').charAt(0)}
            </div>
            
            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-main)', fontWeight:'900' }}>
                {publicProfileUser.name}
                {publicProfileUser.bizStatus === 'approved' && <span className="biz-badge">사업자 인증됨</span>}
            </h2>
            {publicProfileUser.company && <p style={{fontSize:'13px', color:'var(--text-sub)', marginTop:'4px', fontWeight:'600'}}>{publicProfileUser.company}</p>}
            
            <div style={{marginTop:'16px'}}>
                <p style={{fontSize:'14px', color:'var(--text-main)', margin:'0 0 12px 0', fontWeight:'700'}}>{publicProfileUser.intro || '작성된 소개가 없습니다.'}</p>
                <div style={{display:'flex', gap:'6px', justifyContent:'center', flexWrap:'wrap'}}>
                    {(publicProfileUser.keywords || []).map(k => <span key={k} style={{background:'var(--primary-light)', border:'1px solid var(--border)', color:'var(--text-main)', padding:'4px 10px', borderRadius:'4px', fontSize:'12px', fontWeight:'800'}}>#{k}</span>)}
                </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'center', gap: '40px', marginTop: '20px'}}>
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <span style={{fontSize: '20px', fontWeight: '900', color: 'var(--text-main)'}}>{publicProfileFeeds.length}</span>
                <span style={{fontSize: '13px', color: 'var(--text-sub)', fontWeight:'700'}}>공개된 리포트</span>
              </div>
            </div>
            
            <button onClick={() => copyProfileLink(publicProfileUser.id)} style={{background:'white', color:'var(--text-main)', border:'1px solid var(--text-main)', padding:'8px 20px', borderRadius:'4px', fontSize:'13px', fontWeight:'800', marginTop:'24px', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:'6px'}}>
                🔗 오픈 프로필 링크 복사
            </button>
          </div>
          
          <div className="feed-container">
            {publicProfileFeeds.length === 0 ? (
              <div style={{textAlign:'center', padding:'40px 20px', color:'var(--text-sub)', fontWeight: 700}}>
                아직 공개된 리포트가 없습니다.
              </div>
            ) : (
              publicProfileFeeds.map((item, idx) => {
                  const renderSpaces = item.spaces && item.spaces.length > 0 ? item.spaces : [{ beforeImg: item.beforeImg, afterImg: item.afterImg }];
                  return (
                    <div key={item.id} className="feed-card" onClick={() => openDetailView(item.id)}>
                      <div className="feed-title" style={{marginBottom: '10px'}}>{item.title}</div>
                      <div style={{display:'flex', gap:'16px', fontSize:'13px', color:'var(--text-sub)', marginBottom:'12px', fontWeight:'700'}}>
                        <span>📅 {item.taskDate?.replace(/-/g, '.')}</span>
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

      {/* 뷰: 리포트 작성 */}
      {currentView === 'upload' && (
        <div className="view-section">
          <div className="upload-container" style={{padding:'24px 20px'}}>
            <div className="view-mode-control" style={{background:'var(--primary-light)'}}>
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
            
            <div className="input-group">
              <label className="title-label">전체 작업 제목</label>
              <input type="text" className="title-input" placeholder="어떤 작업을 하셨나요?" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
            </div>
            
            {spaces.map((sp, index) => (
              <div key={sp.id} style={uploadMode === 'multi' ? {background: '#ffffff', padding: '16px', border: '1px solid var(--border)', borderRadius: '4px', marginBottom: '20px'} : {}}>
                {uploadMode === 'multi' && (
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
                    <input type="text" className="title-input" style={{padding:'10px', fontSize:'14px', width:'70%', marginTop:0}} placeholder="구역 이름 (예: 거실)" value={sp.spaceName} onChange={(e) => handleSpaceDescChange(index, 'name', e.target.value)} />
                    {spaces.length > 1 && <button onClick={() => removeSpace(index)} style={{background:'none', border:'none', color:'var(--danger)', fontWeight:'bold', cursor:'pointer'}}>삭제</button>}
                  </div>
                )}
                
                <div style={{display:'flex', gap:'10px', marginBottom:'16px'}}>
                    <div style={{flex:1}}>
                        <label style={{display:'block', fontSize:'13px', fontWeight:'700', marginBottom:'8px'}}>작업 전</label>
                        <div className="photo-upload" style={{height:'120px'}} onClick={() => openPhotoSheet(index, 'before')}>
                            {!sp.beforeImg && <span>+ 사진 추가</span>}
                            {sp.beforeImg && <img className="preview" src={sp.beforeImg} style={{display:'block'}} alt="전" />}
                        </div>
                    </div>
                    <div style={{flex:1}}>
                        <label style={{display:'block', fontSize:'13px', fontWeight:'700', marginBottom:'8px'}}>작업 후</label>
                        <div className="photo-upload" style={{height:'120px'}} onClick={() => openPhotoSheet(index, 'after')}>
                            {!sp.afterImg && <span>+ 사진 추가</span>}
                            {sp.afterImg && <img className="preview" src={sp.afterImg} style={{display:'block'}} alt="후" />}
                        </div>
                    </div>
                </div>
                
                <textarea className="title-input" style={{fontSize:'14px', height:'80px', resize:'none', marginTop:0}} placeholder="상세 설명 (어떤 과정을 거쳤나요?)" value={sp.desc} onChange={(e) => handleSpaceDescChange(index, 'desc', e.target.value)}></textarea>
              </div>
            ))}
            
            {uploadMode === 'multi' && (
              <button className="sheet-btn" style={{borderStyle:'dashed'}} onClick={addSpace}>+ 공간 추가하기</button>
            )}

            <div style={{marginTop: '32px', marginBottom: '8px'}}>
                <label className="checkbox-label" style={{margin:0}}>
                  <input type="checkbox" checked={isPrivateUpload} onChange={(e) => setIsPrivateUpload(e.target.checked)} />
                  이 리포트를 비공개로 저장 (링크 있는 사람만 열람)
                </label>
            </div>

            <button className="submit-btn" onClick={saveAndShareReport} disabled={isUploading}>
              {isUploading ? "클라우드 저장 중..." : "완료 및 등록하기"}
            </button>
          </div>
        </div>
      )}

      {currentView === 'detail' && detailReport && (
        <div className="view-section" style={{paddingTop: '20px'}}>
          <div className="feed-container">
            
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
              <span style={{background:'var(--primary-light)', color:'var(--text-main)', border:'1px solid var(--border)', padding:'6px 14px', borderRadius:'4px', fontSize:'12px', fontWeight:'700'}}>
                {detailReport.status === 'private' ? '🔒 비공개 리포트' : '✅ 인증된 리포트'}
              </span>
              {currentUser && currentUser.id === detailReport.authorId && (
                <button onClick={openReportEdit} style={{background:'none', border:'1px solid var(--border)', padding:'6px 12px', borderRadius:'4px', fontSize:'12px', fontWeight:'700', cursor:'pointer'}}>관리</button>
              )}
            </div>
            
            <div className="detail-card" style={{position:'relative'}}>
              <div style={{borderBottom:'1px solid var(--border)', paddingBottom:'16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <div className="author-avatar" style={{border:'1px solid var(--border)'}} onClick={() => setSelectedImage(detailReport.authorPic)}>
                    {detailReport.authorPic ? <img src={detailReport.authorPic} alt="프로필" /> : (detailReport.authorName || '작업자').charAt(0)}
                  </div>
                  <div>
                    <span style={{fontSize:'15px', fontWeight:'800', color:'var(--text-main)'}}>{detailReport.authorName || '작업자'}</span>
                    <p style={{fontSize:'12px', color:'var(--text-sub)', margin:0, fontWeight:'600'}}>{formatDisplayTime(detailReport)}</p>
                  </div>
                </div>
                <button onClick={() => showPublicProfile(detailReport.authorId)} style={{background:'var(--primary-light)', color:'var(--text-main)', border:'1px solid var(--border)', padding:'6px 12px', borderRadius:'4px', fontSize:'12px', fontWeight:'800', cursor:'pointer'}}>프로필 보기</button>
              </div>
              
              <h2 style={{fontSize:'22px', fontWeight:'900', color:'var(--text-main)', margin: '16px 0 16px 0'}}>{detailReport.title}</h2>
              
              <div className="view-mode-control">
                <div className={`view-mode-btn ${detailViewMode==='horizontal'?'active':''}`} onClick={()=>setDetailViewMode('horizontal')}>가로 보기</div>
                <div className={`view-mode-btn ${detailViewMode==='vertical'?'active':''}`} onClick={()=>setDetailViewMode('vertical')}>세로 보기</div>
                <div className={`view-mode-btn ${detailViewMode==='flip'?'active':''}`} onClick={()=>setDetailViewMode('flip')}>한 장 보기</div>
              </div>
              
              {(detailViewMode === 'horizontal' || detailViewMode === 'vertical') && (
                <p style={{fontSize:'12px', color:'var(--text-sub)', textAlign:'center', marginBottom:'16px', fontWeight:'700'}}>
                  사진을 눌러 확대해보세요.
                </p>
              )}

              {(detailReport.spaces && detailReport.spaces.length > 0 ? detailReport.spaces : [{ beforeImg: detailReport.beforeImg, afterImg: detailReport.afterImg, desc: detailReport.desc }]).map((sp, idx) => (
                <div key={idx} style={{marginBottom: '24px', background: '#fff', padding: '16px', borderRadius: '4px', border: '1px solid var(--border)'}}>
                  {sp.spaceName && (
                    <h4 style={{margin:'0 0 16px 0', color:'var(--text-main)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight:'900'}}>
                      <span style={{background:'var(--text-main)', padding:'4px 8px', borderRadius:'4px', color:'white', fontSize:'11px'}}>📍</span> {sp.spaceName}
                    </h4>
                  )}
                  
                  {detailViewMode === 'vertical' && (
                    <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                      <div className="feed-img-wrap" style={{height:'auto', minHeight:'200px', cursor:'zoom-in'}} onClick={() => setSelectedImage(sp.beforeImg)}>
                        <span className="badge" style={{background:'var(--text-main)'}}>Before</span>
                        <img src={sp.beforeImg} style={{display:'block', width:'100%'}} alt="Before" />
                      </div>
                      <div className="feed-img-wrap" style={{height:'auto', minHeight:'200px', cursor:'zoom-in'}} onClick={() => setSelectedImage(sp.afterImg)}>
                        <span className="badge" style={{background:'white', color:'var(--text-main)'}}>After</span>
                        <img src={sp.afterImg} style={{display:'block', width:'100%'}} alt="After" />
                      </div>
                    </div>
                  )}

                  {detailViewMode === 'horizontal' && (
                    <div style={{display:'flex', gap:'8px'}}>
                      <div className="feed-img-wrap" style={{height:'180px', cursor:'zoom-in'}} onClick={() => setSelectedImage(sp.beforeImg)}>
                        <span className="badge" style={{background:'var(--text-main)'}}>Before</span>
                        <img src={sp.beforeImg} style={{height:'100%', objectFit:'cover'}} alt="Before" />
                      </div>
                      <div className="feed-img-wrap" style={{height:'180px', cursor:'zoom-in'}} onClick={() => setSelectedImage(sp.afterImg)}>
                        <span className="badge" style={{background:'white', color:'var(--text-main)'}}>After</span>
                        <img src={sp.afterImg} style={{height:'100%', objectFit:'cover'}} alt="After" />
                      </div>
                    </div>
                  )}

                  {detailViewMode === 'flip' && (
                    <div>
                      <p style={{margin:'0 0 10px 0', fontSize:'12px', color:'var(--text-sub)', textAlign:'center', fontWeight:'700'}}>사진을 탭하여 전/후를 비교해보세요 👆</p>
                      <div className={`flip-card ${flippedCards[idx] ? 'flipped' : ''}`} onClick={() => toggleFlip(idx)}>
                        <div className="flip-card-inner">
                          <div className="flip-card-front">
                            <span className="img-label" style={{background:'var(--text-main)', position:'absolute', top:'10px', left:'10px', zIndex:10, padding:'4px 8px', borderRadius:'4px', color:'white', fontSize:'11px', fontWeight:'800'}}>Before</span>
                            <img src={sp.beforeImg} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="Before" />
                          </div>
                          <div className="flip-card-back">
                            <span className="img-label" style={{background:'white', border:'1px solid var(--text-main)', position:'absolute', top:'10px', left:'10px', zIndex:10, padding:'4px 8px', borderRadius:'4px', color:'var(--text-main)', fontSize:'11px', fontWeight:'800'}}>After</span>
                            <img src={sp.afterImg} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="After" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {sp.desc && <div className="unified-desc"><strong>작업 설명: </strong>{sp.desc}</div>}
                </div>
              ))}
            </div>
            
            <button className="submit-btn" style={{background:'var(--kakao)', color:'var(--kakao-text)', border:'none', marginTop:0}} onClick={() => setIsAlimtalkModalOpen(true)}>
                카카오 알림톡 전송
            </button>
            <button className="submit-btn" style={{marginTop:'12px'}} onClick={() => copyLink(detailReport.id)}>
                이 리포트 링크 복사
            </button>
            <button className="submit-btn" style={{background:'white', color:'var(--text-main)', marginTop:'12px'}} onClick={() => switchView('feed')}>
                목록으로 돌아가기
            </button>
            
            <div className="comment-section" style={{marginTop: '32px'}}>
              <div style={{display:'flex', alignItems:'center', gap:'16px', marginBottom:'20px'}}>
                  <h3 style={{fontSize:'16px', margin:0, fontWeight:'900'}}>댓글 {(detailReport.comments || []).length}</h3>
                  <button onClick={(e) => handleToggleLike(detailReport, e)} style={{background:'none', border:'1px solid var(--border)', borderRadius:'4px', padding:'4px 12px', display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', fontSize:'14px', fontWeight:'800', color: detailReport.likes?.includes(currentUser?.id) ? 'var(--text-main)' : 'var(--text-sub)'}}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill={detailReport.likes?.includes(currentUser?.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> 
                      {(detailReport.likes || []).length}
                  </button>
              </div>

              <div>
                {(detailReport.comments || []).map((c) => (
                  <div key={c.id} style={{display:'flex', gap:'10px', marginBottom:'16px', textAlign:'left'}}>
                    <div className="author-avatar" style={{width:'32px', height:'32px', border:'1px solid var(--border)'}} onClick={() => setSelectedImage(c.authorPic)}>
                        {c.authorPic ? <img src={c.authorPic} style={{width:'100%'}}/> : (c.authorName || '?').charAt(0)}
                    </div>
                    <div>
                      <div style={{fontSize:'13px', fontWeight:'800', marginBottom:'4px'}}>{c.authorName}</div>
                      <div style={{fontSize:'14px', color:'var(--text-main)', lineHeight:'1.4', fontWeight:'500'}}>{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                <input type="text" style={{flex:1, padding:'12px', border:'1px solid var(--border)', borderRadius:'4px', fontSize:'14px', outline:'none', background:'var(--primary-light)', color:'var(--text-main)'}} placeholder="댓글을 남겨보세요" value={commentInput} onChange={(e) => setCommentInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && submitComment()}/>
                <button style={{background:'var(--text-main)', color:'white', border:'none', padding:'0 16px', borderRadius:'4px', fontWeight:'800', cursor:'pointer'}} onClick={submitComment}>등록</button>
              </div>
            </div>
          </div>
          {renderFooter()}
        </div>
      )}

      {/* 모달: 카카오 알림톡 전송 */}
      <div className={`modal-overlay ${isAlimtalkModalOpen ? 'active' : ''}`} style={{zIndex: 999}}>
        <div className="modal-content" style={{ padding: '24px 20px', width: '90%' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '18px', fontWeight:'900' }}>고객에게 알림톡 전송</h3>
          <p style={{fontSize:'13px', color:'var(--text-sub)', marginBottom:'20px', lineHeight:'1.5', fontWeight:'600'}}>
            작업 결과를 고객의 카카오톡으로 바로 전송합니다.<br/>고객의 휴대전화 번호를 입력해주세요.
          </p>
          <div className="input-group" style={{ marginBottom: '24px', textAlign:'left' }}>
            <label className="title-label" style={{ fontSize: '13px' }}>받는 사람 연락처</label>
            <input type="tel" className="title-input" style={{ padding: '12px' }} placeholder="숫자만 입력 (예: 01012345678)" value={alimtalkPhone} onChange={(e) => setAlimtalkPhone(e.target.value.replace(/[^0-9]/g, ''))} />
          </div>
          <button className="sheet-btn" disabled={isAlimtalkSending} style={{ background: 'var(--kakao)', color: 'var(--kakao-text)', border: 'none', fontWeight:'900' }} onClick={sendAlimtalk}>
            {isAlimtalkSending ? '전송 처리 중...' : '전송하기'}
          </button>
          <button className="sheet-btn cancel" onClick={() => setIsAlimtalkModalOpen(false)}>닫기</button>
        </div>
      </div>

      {/* 모달: 이용약관 및 개인정보처리방침 */}
      <div className={`modal-overlay ${isTermsModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{ padding: '24px 20px', width: '95%', maxHeight:'85vh' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight:'900' }}>이용약관 및 정책</h3>
          
          <div style={{textAlign:'left', height:'50vh', overflowY:'auto', background:'var(--primary-light)', padding:'16px', borderRadius:'4px', border:'1px solid var(--border)', fontSize:'12px', lineHeight:'1.6', color:'var(--text-sub)'}}>
            <h4 style={{color:'var(--text-main)', marginTop:0}}>서비스 이용약관</h4>
            <pre style={{whiteSpace:'pre-wrap', fontFamily:'inherit', margin:0}}>{TERMS_OF_SERVICE}</pre>
            <hr style={{margin:'20px 0', borderTop:'1px solid var(--border)', borderBottom:'none'}}/>
            <h4 style={{color:'var(--text-main)', marginTop:0}}>개인정보처리방침</h4>
            <pre style={{whiteSpace:'pre-wrap', fontFamily:'inherit', margin:0}}>{PRIVACY_POLICY}</pre>
          </div>

          <button className="sheet-btn" style={{ background: 'var(--text-main)', color: 'white', border: 'none', marginTop:'20px' }} onClick={() => setIsTermsModalOpen(false)}>확인</button>
        </div>
      </div>

      {/* 리포트 관리(수정/삭제) 모달 */}
      <div className={`modal-overlay ${isEditModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{ padding: '24px 20px', width: '90%' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight:'900' }}>리포트 관리</h3>
          <div className="input-group" style={{ marginBottom: '16px', textAlign:'left' }}>
            <label className="title-label" style={{ fontSize: '13px' }}>제목 수정</label>
            <input type="text" className="title-input" style={{ padding: '12px' }} value={editDocTitle} onChange={(e) => setEditDocTitle(e.target.value)} />
          </div>
          <div className="input-group" style={{ marginBottom: '24px', textAlign:'left' }}>
            <label className="title-label" style={{ fontSize: '13px' }}>공개 상태</label>
            <select className="title-input" style={{ padding: '12px' }} value={editDocStatus} onChange={(e) => setEditDocStatus(e.target.value)}>
              <option value="public">공개 (모두가 볼 수 있음)</option>
              <option value="private">비공개 (링크가 있는 사람만)</option>
            </select>
          </div>
          <button className="sheet-btn" style={{ background: 'var(--text-main)', color: 'white', border: 'none' }} onClick={submitReportEdit}>변경사항 저장</button>
          <button className="sheet-btn" style={{ background: 'white', color: 'var(--danger)', border: '1px solid var(--danger)' }} onClick={deleteReport}>이 리포트 삭제하기</button>
          <button className="sheet-btn cancel" onClick={() => setIsEditModalOpen(false)}>닫기</button>
        </div>
      </div>
      
      {/* 프로필 수정 모달 */}
      <div className={`modal-overlay ${isProfileModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{ padding: '24px 20px', width: '100%', maxHeight:'85vh', overflowY:'auto' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight:'900' }}>프로필 편집</h3>
          
          <div className="author-avatar" style={{width:'80px', height:'80px', borderRadius:'4px', background:'var(--primary-light)', margin:'0 auto 20px auto', position:'relative', fontSize:'24px', border:'1px solid var(--border)'}} onClick={() => profilePicRef.current.click()}>
            {editProfilePic ? <img src={editProfilePic} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="프로필" /> : (editName || '작업자').charAt(0)}
            <div style={{position: 'absolute', bottom: 0, left: 0, width: '100%', height: '30%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight:'800'}}>사진 변경</div>
          </div>
          
          <div className="input-group" style={{ marginBottom: '16px' }}>
            <label className="title-label" style={{ fontSize: '13px' }}>이름</label>
            <input type="text" className="title-input" style={{ padding: '12px' }} value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div className="input-group" style={{ marginBottom: '16px' }}>
            <label className="title-label" style={{ fontSize: '13px' }}>상호</label>
            <input type="text" className="title-input" style={{ padding: '12px' }} placeholder="예: 김반장 클린" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} />
          </div>
          
          <div className="input-group" style={{ marginBottom: '16px' }}>
            <label className="title-label" style={{ fontSize: '13px' }}>연락처 (휴대폰 번호)</label>
            <input type="tel" className="title-input" style={{ padding: '12px' }} placeholder="숫자만 입력 (예: 01012345678)" value={editPhone} onChange={(e) => setEditPhone(e.target.value.replace(/[^0-9]/g, ''))} />
          </div>

          <div className="input-group" style={{ marginBottom: '16px' }}>
            <label className="title-label" style={{ fontSize: '13px' }}>
                사업자 등록번호 
                {(currentUser && currentUser.bizStatus === 'pending') && <span style={{color:'var(--text-sub)', fontSize:'11px', marginLeft:'6px'}}>(검수중)</span>}
            </label>
            <input 
                type="text" 
                className="title-input" 
                style={{ padding: '12px' }} 
                placeholder="숫자만 입력 시 하이픈 자동 생성" 
                value={editBizNum} 
                maxLength={12}
                onChange={handleBizNumChange} 
            />
          </div>
          <div className="input-group" style={{ marginBottom: '16px' }}>
            <label className="title-label" style={{ fontSize: '13px' }}>간단 자기소개</label>
            <input type="text" className="title-input" style={{ padding: '12px' }} placeholder="고객에게 어필할 한 줄 소개" value={editIntro} onChange={(e) => setEditIntro(e.target.value)} />
          </div>
          <div className="input-group" style={{ marginBottom: '24px' }}>
            <label className="title-label" style={{ fontSize: '13px' }}>전문 분야 키워드 (쉼표 구분)</label>
            <input type="text" className="title-input" style={{ padding: '12px' }} placeholder="예: 입주청소, 에어컨, 꼼꼼함" value={editKeywords} onChange={(e) => setEditKeywords(e.target.value)} />
          </div>
          
          <button className="sheet-btn" style={{ background: 'var(--text-main)', color: 'white', border: 'none' }} onClick={saveProfile}>저장하기</button>
          <button className="sheet-btn cancel" onClick={() => setIsProfileModalOpen(false)}>취소</button>
        </div>
      </div>

      {/* 💡 [수정됨] 버전 번호만 표시하는 깔끔해진 알림 모달 */}
      <div className={`modal-overlay ${isNotiModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{maxHeight:'80vh', overflowY:'auto'}}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontWeight:'900' }}>알림센터</h3>
          
          {notifications.length === 0 ? (
            <div style={{padding:'40px 0'}}>
              <p style={{fontSize:'14px', color:'var(--text-sub)', margin:0, fontWeight:'700'}}>새로운 알림이 없습니다.</p>
            </div>
          ) : (
            <div style={{textAlign:'left'}}>
              {notifications.map(n => (
                <div key={n.id} style={{padding:'12px', borderBottom:'1px solid var(--border)', background: n.isRead ? 'transparent' : 'var(--primary-light)', borderRadius:'4px', marginBottom:'8px', border: n.isRead ? 'none' : '1px solid var(--border)'}}>
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                    <p style={{margin:0, fontSize:'13px', color: n.isRead ? 'var(--text-sub)' : 'var(--text-main)', fontWeight:'600'}}>
                        <strong>{n.fromName}</strong>님이 {n.type === 'like' ? '회원님의 리포트를 좋아합니다.' : '회원님의 리포트에 댓글을 남겼습니다.'}
                    </p>
                    {n.isRead && <span style={{fontSize:'11px', color:'var(--text-sub)', whiteSpace:'nowrap', marginLeft:'8px'}}>읽음</span>}
                  </div>
                </div>
              ))}
              <button className="sheet-btn" style={{marginTop:'16px', fontSize:'14px'}} onClick={markAllNotisAsRead}>모두 읽음 처리</button>
            </div>
          )}
          
          {/* 하단 버전 정보 */}
          <div style={{marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: '12px', color: 'var(--text-sub)', fontWeight: '600'}}>
             현재 앱 버전: {APP_VERSION}
          </div>
          
          <button className="sheet-btn cancel" onClick={() => setIsNotiModalOpen(false)}>닫기</button>
        </div>
      </div>

      <div className={`bottom-sheet-overlay ${postOptionsMenu ? 'active' : ''}`} onClick={() => setPostOptionsMenu(null)}></div>
      <div className={`bottom-sheet ${postOptionsMenu ? 'active' : ''}`}>
        <p style={{ margin: '0 0 20px 0', fontWeight: 900, textAlign: 'center' }}>게시물 옵션</p>
        <button className="sheet-btn" onClick={() => { setPostOptionsMenu(null); setIsReportPostModalOpen(true); }}>게시물 신고하기</button>
        <button className="sheet-btn" style={{color:'var(--danger)'}} onClick={blockUser}>이 작업자 차단하기</button>
        <button className="sheet-btn cancel" onClick={() => setPostOptionsMenu(null)}>취소</button>
      </div>

      <div className={`modal-overlay ${isReportPostModalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontWeight:'900' }}>게시물 신고</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '16px', fontWeight:'600' }}>신고 사유를 구체적으로 적어주세요. 관리자 검토 후 조치되며 Firestore DB에 저장됩니다.</p>
          <textarea className="title-input" style={{height:'100px', resize:'none', marginBottom:'16px'}} placeholder="신고 사유 입력..." value={reportReason} onChange={(e) => setReportReason(e.target.value)}></textarea>
          <button className="sheet-btn" style={{ background: 'var(--danger)', color: 'white', border: 'none' }} onClick={submitReportPost}>신고 접수</button>
          <button className="sheet-btn cancel" onClick={() => { setIsReportPostModalOpen(false); setReportReason(''); }}>취소</button>
        </div>
      </div>

      <div className={`modal-overlay ${isFeedbackModalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontWeight:'900' }}>개발자에게 피드백 전송</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '16px', fontWeight:'600' }}>작성하신 피드백은 안전하게 저장되며, 앱 개선에 활용됩니다.</p>
          
          <select className="title-input" style={{ marginBottom: '12px', padding: '12px', fontSize: '14px', width: '100%', cursor: 'pointer' }} value={feedbackCategory} onChange={(e) => setFeedbackCategory(e.target.value)}>
            <option value="기능 관련">기능 관련</option>
            <option value="오류 제보">오류 제보</option>
            <option value="디자인">디자인</option>
            <option value="기타">기타</option>
          </select>
          <textarea className="title-input" style={{height:'100px', resize:'none', marginBottom:'16px'}} placeholder="자유롭게 적어주세요!" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)}></textarea>
          
          <button className="sheet-btn" style={{ background: 'var(--text-main)', color: 'white', border: 'none', marginBottom:'24px' }} onClick={submitFeedback}>보내기</button>
          <button className="sheet-btn cancel" onClick={() => setIsFeedbackModalOpen(false)}>닫기</button>
        </div>
      </div>

      <div className={`bottom-sheet-overlay ${isPhotoSheetOpen ? 'active' : ''}`} onClick={() => setIsPhotoSheetOpen(false)}></div>
      <div className={`bottom-sheet ${isPhotoSheetOpen ? 'active' : ''}`}>
        <p style={{ margin: '0 0 20px 0', fontWeight: 900, textAlign: 'center' }}>사진 첨부 방식 선택</p>
        <button className="sheet-btn" onClick={() => triggerPhotoInput('camera')}>카메라로 바로 촬영</button>
        <button className="sheet-btn" onClick={() => triggerPhotoInput('gallery')}>스마트폰 앨범에서 선택</button>
        <button className="sheet-btn cancel" onClick={() => setIsPhotoSheetOpen(false)}>취소</button>
      </div>

      <div className={`modal-overlay ${selectedImage ? 'active' : ''}`} onClick={() => setSelectedImage(null)} style={{zIndex: 1000}}>
        {selectedImage && (
          <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box'}}>
            <img src={selectedImage} alt="확대된 이미지" style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px', background:'white'}} />
            <button style={{position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.8)', color: 'white', border: 'none', borderRadius: '4px', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer'}}>×</button>
          </div>
        )}
      </div>

      <div className={`modal-overlay ${isFinishModalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontWeight:'900' }}>리포트 작성 완료!</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-sub)', marginBottom: '20px', fontWeight:'600' }}>피드에 등록되었습니다.<br/>고객에게 공유해 보세요!</p>
          <button className="sheet-btn" style={{ background: 'var(--kakao)', color: 'var(--kakao-text)', border: 'none', fontWeight:'900' }} onClick={() => {setIsFinishModalOpen(false); setIsAlimtalkModalOpen(true);}}>고객에게 카카오 알림톡 전송</button>
          <button className="sheet-btn" style={{ background: 'var(--text-main)', color: 'white', border: 'none' }} onClick={() => { copyLink(latestReportId); setTimeout(() => { setIsFinishModalOpen(false); setTaskTitle(''); setTaskDate(getToday()); setSpaces([{...defaultSpace}]); setIsPrivateUpload(false); switchView('feed'); }, 1500); }}>카톡용 리포트 링크 복사</button>
          <button className="sheet-btn cancel" onClick={() => { setIsFinishModalOpen(false); setTaskTitle(''); setTaskDate(getToday()); setSpaces([{...defaultSpace}]); setIsPrivateUpload(false); switchView('feed'); }}>피드로 가기</button>
        </div>
      </div>

      <div className={`modal-overlay ${confirmDialog.show ? 'active' : ''}`} style={{zIndex: 1000}}>
        <div className="modal-content" style={{width:'80%', maxWidth:'320px', padding:'24px 20px'}}>
            <h3 style={{marginTop:0, marginBottom:'16px', fontSize:'16px', color:'var(--text-main)', lineHeight:'1.5', fontWeight:'800'}}>{confirmDialog.msg}</h3>
            <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                <button className="sheet-btn cancel" style={{flex:1, margin:0, background:'var(--primary-light)', color:'var(--text-main)'}} onClick={() => setConfirmDialog({show:false, msg:'', onConfirm:null})}>취소</button>
                <button className="sheet-btn" style={{flex:1, margin:0, background:'var(--text-main)', color:'white', border:'none'}} onClick={confirmDialog.onConfirm}>확인</button>
            </div>
        </div>
      </div>

      <div className={`toast ${toastMsg.show ? 'show' : ''}`}>{toastMsg.msg}</div>
    </div>
  );
}