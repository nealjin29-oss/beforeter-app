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

// 💡 [새로운 대안] 패키지 모듈 대신 브라우저 내장 fetch API를 활용하여 EmailJS 연동

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
const googleProvider = new GoogleAuthProvider();
// 카카오 로그인을 위한 OIDC 프로바이더 설정 (Firebase 콘솔 세팅 필요)
const kakaoProvider = new OAuthProvider('oidc.kakao');
const db = getFirestore(app); 
const storage = getStorage(app); 

const APP_ID = 'beforeter-app';

// 🌟 [배포 버전 관리] 새롭게 배포하실 때마다 이 값을 변경해주세요. (예: v1.0.2)
// 이 값이 로컬스토리지의 값과 다르면 접속 시 유저에게 업데이트 알림을 띄웁니다.
const APP_VERSION = 'v1.0.2 (2026-05-31 배포)';

// 📧 EmailJS 연동 키 세팅 (EmailJS 사이트에서 발급받은 3가지 값을 여기에 넣으세요!)
const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";   // 예: service_abc123
const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID"; // 예: template_xyz789
const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY";   // 예: aBcDeFgHiJkLmNoPq

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
  // 뷰 컨트롤 및 네비게이션 상태
  const [currentView, setCurrentView] = useState('feed'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // 유저 및 데이터 상태
  const [currentUser, setCurrentUser] = useState(null); 
  const [feedData, setFeedData] = useState([]); 
  const [notifications, setNotifications] = useState([]);
  const [myFeedbacks, setMyFeedbacks] = useState([]); 
  const [appUpdateNoti, setAppUpdateNoti] = useState(null); // 앱 배포 업데이트 알림
  const [pendingBizUsers, setPendingBizUsers] = useState([]); // 사업자 검수 대기 유저 목록 (관리자용)
  
  // 로컬 스토리지 차단 목록 초기화
  const getInitialBlocked = () => {
    try {
      const stored = localStorage.getItem('beporter_blocked');
      return stored ? JSON.parse(stored) : [];
    } catch(e) {
      return [];
    }
  };
  const [blockedUsers, setBlockedUsers] = useState(getInitialBlocked());
  
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
  const [isAlimtalkSending, setIsAlimtalkSending] = useState(false); // 알림톡 전송 중 상태
  
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
  
  // 카테고리 순서 변경: 전체, 인테리어, 청소, 미용, 건설, 기타
  const categories = ['전체', '인테리어', '청소', '미용', '건설', '기타'];

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const profilePicRef = useRef(null);

  // 공용 메일 발송 함수 (EmailJS REST API 직접 호출)
  const sendEmailNotification = async (subject, message) => {
    if (EMAILJS_SERVICE_ID === "YOUR_SERVICE_ID") {
        console.warn("EmailJS 키가 아직 설정되지 않아 메일을 발송하지 못했습니다.");
        return;
    }
    
    try {
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                service_id: EMAILJS_SERVICE_ID,
                template_id: EMAILJS_TEMPLATE_ID,
                user_id: EMAILJS_PUBLIC_KEY,
                template_params: {
                    subject: subject,
                    message: message,
                }
            })
        });

        if (response.ok) {
            console.log("EmailJS 전송 성공");
        } else {
            const errorText = await response.text();
            console.error("EmailJS 전송 실패:", errorText);
        }
    } catch (error) {
        console.error("EmailJS 네트워크 전송 에러:", error);
    }
  };

  // 카카오톡 링크 공유 시 미리보기를 위한 동적 메타태그 변경 함수
  const updateMetaTags = (report) => {
    if (!report) return;
    
    // 타이틀 변경
    document.title = `${report.title} - 비포터`;
    
    // 메타 태그 업데이트 유틸
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

    // 카카오톡에 멋지게 보이기 위한 상세 정보 세팅
    const description = `[${report.authorName}] 프로님의 작업 결과물을 확인해보시겠어요? 
📅 작업일: ${report.taskDate} 
📍 장소: ${report.location || '미상'}`;
    
    const coverImg = report.spaces && report.spaces.length > 0 
      ? report.spaces[0].afterImg 
      : (report.afterImg || 'https://www.beforeter.com/default-og.png');

    // 카카오톡 스크랩봇을 위한 Open Graph 태그 강화
    setMeta('og:title', `${report.title} - 비포터`);
    setMeta('og:description', description);
    setMeta('og:image', coverImg);
    setMeta('og:type', 'website');
    setMeta('og:site_name', '비포터 (Beforeter)');
    setMeta('description', description, true); // 일반 검색엔진용
  };

  useEffect(() => {
    // 앱 버전 확인 및 신규 배포 알림 로직
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
            bizStatus: 'none', // 사업자 검수 상태: none, pending, approved, rejected
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
            
            // 💡 [EmailJS] 새로운 유저 가입 알림 메일 전송
            sendEmailNotification(
                `[비포터] 🎉 새로운 작업자 회원가입!`,
                `이름: ${userData.name}\n이메일: ${userData.email}\n가입 플랫폼: ${userData.provider}\n\n새로운 회원이 비포터에 합류했습니다. 환영해 주세요!`
            );
          }
          setCurrentUser(userData);
        } catch (error) {
          console.error("사용자 DB 연동 중 오류 발생 (권한 등):", error);
          setCurrentUser({
            id: user.uid, 
            name: user.displayName || '작업자', 
            profilePic: user.photoURL || '', 
            email: user.email || '', 
            provider: 'Google'
          });
        }
        
        // 내 알림 실시간 동기화
        try {
          const notiQ = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'notifications'), where("targetUserId", "==", user.uid));
          onSnapshot(notiQ, (snap) => {
            const notis = [];
            snap.forEach(d => notis.push({ id: d.id, ...d.data() }));
            notis.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setNotifications(notis);
          }, (err) => console.error("알림 로드 오류:", err));
        } catch (e) { console.error(e); }

        // 내가 보낸 피드백 히스토리 동기화
        try {
          const fbQ = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'feedbacks'), where("userId", "==", user.uid));
          onSnapshot(fbQ, (snap) => {
            const fbs = [];
            snap.forEach(d => fbs.push({ id: d.id, ...d.data() }));
            fbs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setMyFeedbacks(fbs);
          }, (err) => console.error("피드백 로드 오류:", err));
        } catch (e) { console.error(e); }

        // 👑 [관리자 전용] 사업자 검수 대기 목록 실시간 연동
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
      
      if (detailReport) {
        const updated = reports.find(r => r.id === detailReport.id);
        if (updated) {
            setDetailReport(updated);
            updateMetaTags(updated);
        }
      }
    }, (error) => console.error("데이터 읽기 오류:", error));
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

  const processGoogleLogin = async () => {
    if (!termsAgreed || !privacyAgreed) {
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
          triggerConfirm("Firebase 보안 알림: 현재 접속 중인 도메인이 Firebase 승인된 도메인에 등록되어 있지 않아 로그인이 차단되었습니다. Firebase 콘솔(Authentication > 설정)에서 도메인을 추가해주세요.", () => {});
      } else {
          showToast("구글 로그인에 실패했습니다."); 
      }
    }
  };

  const processKakaoLogin = async () => {
    if (!termsAgreed || !privacyAgreed) {
        return showToast("서비스 이용약관 및 개인정보 수집에 동의해주세요.");
    }
    try { 
      kakaoProvider.setCustomParameters({
        prompt: 'select_account'
      });
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, kakaoProvider); 
      showToast(`환영합니다! 카카오톡 로그인이 완료되었습니다.`); 
      switchView('feed'); 
    } catch (error) { 
      console.error("카카오 로그인 에러:", error);
      if (error.code === 'auth/unauthorized-domain') {
          triggerConfirm("Firebase 보안 알림: 현재 접속 중인 도메인이 Firebase 승인된 도메인에 등록되어 있지 않아 로그인이 차단되었습니다. Firebase 콘솔(Authentication > 설정)에서 도메인을 추가해주세요.", () => {});
      } else {
          showToast("카카오 로그인에 실패했습니다. 관리자 설정(OIDC)을 확인해주세요."); 
      }
    }
  };

  const processLogout = async () => {
    try { 
      await signOut(auth); 
      showToast('로그아웃 되었습니다.'); 
      setIsMenuOpen(false); 
      switchView('feed'); 
    } catch (error) { 
      showToast("로그아웃 실패"); 
    }
  };

  // 사업자 등록번호 포맷팅 (###-##-####)
  const formatBizNum = (value) => {
    const raw = value.replace(/[^0-9]/g, '');
    let res = '';
    if (raw.length < 4) {
      res = raw;
    } else if (raw.length < 6) {
      res = raw.substring(0, 3) + '-' + raw.substring(3);
    } else {
      res = raw.substring(0, 3) + '-' + raw.substring(3, 5) + '-' + raw.substring(5, 10);
    }
    return res;
  };

  const handleBizNumChange = (e) => {
    const formatted = formatBizNum(e.target.value);
    setEditBizNum(formatted);
  };

  const openProfileEdit = () => { 
    setEditName(currentUser.name || ''); 
    setEditCompany(currentUser.company || '');
    setEditBizNum(currentUser.bizNum || '');
    setEditProfilePic(currentUser.profilePic || ''); 
    setEditIntro(currentUser.intro || ''); 
    setEditKeywords((currentUser.keywords || []).join(', '));
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
    if (e.target.files[0]) {
      resizeAndCompressImage(e.target.files[0], setEditProfilePic, 400); 
    }
    e.target.value = ''; 
  };

  const saveProfile = async () => {
    if (!editName.trim()) return showToast("이름을 입력해주세요.");
    
    const kwdArray = editKeywords.split(',').map(k => k.trim()).filter(k => k !== '').slice(0, 5);
    
    let newBizStatus = currentUser.bizStatus || 'none';
    const isBizNumChanged = editBizNum !== currentUser.bizNum;
    
    // 사업자 번호가 변경되었고 12자리(###-##-####)를 모두 채웠다면 검수 상태로 변경
    if (isBizNumChanged && editBizNum.length === 12) {
        newBizStatus = 'pending';
    } else if (editBizNum === '') {
        newBizStatus = 'none';
    }

    const updatedUser = { 
      ...currentUser, 
      name: editName, 
      company: editCompany,
      bizNum: editBizNum,
      bizStatus: newBizStatus,
      profilePic: editProfilePic, 
      intro: editIntro, 
      keywords: kwdArray 
    };
    
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', currentUser.id), updatedUser);
      setCurrentUser(updatedUser); 
      setIsProfileModalOpen(false); 
      showToast("프로필이 저장되었습니다.");

      if (newBizStatus === 'pending') {
          // 💡 [EmailJS] 사업자 번호 제출 시 알림 메일 전송
          sendEmailNotification(
            `[비포터] 🏢 사업자 등록번호 검수 요청`,
            `사용자: ${currentUser.name} (${currentUser.id})\n상호명: ${editCompany}\n제출된 사업자등록번호: ${editBizNum}\n\n관리자 메뉴에서 검수를 진행해주세요.`
          );
          showToast("사업자 등록번호 검수가 요청되었습니다.");
      }

    } catch(e) { 
      console.error(e);
      showToast("프로필 저장에 실패했습니다."); 
    }
  };

  // 👑 [관리자 전용] 사업자 승인 및 거절 함수
  const approveBiz = async (userId, userName) => {
    triggerConfirm(`[${userName}]님의 사업자를 승인하시겠습니까?`, async () => {
        try {
            await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', userId), { bizStatus: 'approved' });
            showToast("사업자 승인 완료!");
        } catch(e) { showToast("승인 처리 실패"); }
    });
  };

  const rejectBiz = async (userId, userName) => {
    triggerConfirm(`[${userName}]님의 사업자를 거절하시겠습니까? (번호는 삭제됩니다)`, async () => {
        try {
            await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', userId), { bizStatus: 'none', bizNum: '' });
            showToast("사업자 거절 완료!");
        } catch(e) { showToast("거절 처리 실패"); }
    });
  };

  const openPhotoSheet = (index, type) => { 
    setCurrentPhotoTarget({ index, type }); 
    setIsPhotoSheetOpen(true); 
  };
  
  const triggerPhotoInput = (type) => { 
    setIsPhotoSheetOpen(false); 
    if (type === 'camera') {
      cameraInputRef.current.click(); 
    } else {
      galleryInputRef.current.click();
    }
  };
  
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && currentPhotoTarget) {
      resizeAndCompressImage(file, (compressedStr) => {
        const newSpaces = [...spaces];
        if (currentPhotoTarget.type === 'before') newSpaces[currentPhotoTarget.index].beforeImg = compressedStr;
        if (currentPhotoTarget.type === 'after') newSpaces[currentPhotoTarget.index].afterImg = compressedStr;
        setSpaces(newSpaces);
      }, 1000); 
    }
    e.target.value = ''; 
  };

  const handleSpaceDescChange = (index, type, value) => {
    const newSpaces = [...spaces];
    if(type === 'desc') newSpaces[index].desc = value;
    if(type === 'name') newSpaces[index].spaceName = value;
    setSpaces(newSpaces);
  };

  const addSpace = () => {
    setSpaces([...spaces, { id: Date.now(), spaceName: '', beforeImg: '', afterImg: '', desc: '' }]);
  };
  
  const removeSpace = (index) => { 
    const newSpaces = [...spaces]; 
    newSpaces.splice(index, 1); 
    setSpaces(newSpaces); 
  };

  const saveAndShareReport = async () => {
    if (!taskTitle || !taskDate) return showToast("작업 일자와 제목을 입력해주세요!");
    if (spaces.some(sp => !sp.beforeImg || !sp.afterImg)) return showToast("모든 공간의 Before/After 사진을 첨부해주세요!");

    setIsUploading(true); 
    showToast("클라우드에 안전하게 저장 중...");
    
    try {
      const timeStamp = Date.now();
      const snap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reports'));
      const reportNo = String(snap.size + 1).padStart(6, '0');
      
      const uploadedSpaces = await Promise.all(spaces.map(async (sp, idx) => {
          let bUrl = sp.beforeImg; 
          let aUrl = sp.afterImg;
          
          if(bUrl.startsWith('data:')) {
            const bRef = ref(storage, `reports/${currentUser.id}/${timeStamp}_${idx}_before.jpg`);
            await uploadString(bRef, bUrl, 'data_url'); 
            bUrl = await getDownloadURL(bRef);
          }
          if(aUrl.startsWith('data:')) {
            const aRef = ref(storage, `reports/${currentUser.id}/${timeStamp}_${idx}_after.jpg`);
            await uploadString(aRef, aUrl, 'data_url'); 
            aUrl = await getDownloadURL(aRef);
          }
          return { ...sp, beforeImg: bUrl, afterImg: aUrl };
      }));
      
      const docRef = await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reports'), {
        reportNo: reportNo,
        authorId: currentUser.id, 
        authorName: currentUser.name || '작업자', 
        authorCompany: currentUser.company || '',
        authorPic: currentUser.profilePic || '', 
        title: taskTitle, 
        taskDate: taskDate, 
        category: taskCategory,
        spaces: uploadedSpaces, 
        status: isPrivateUpload ? 'private' : 'public', 
        history: [], 
        comments: [], 
        likes: [],
        location: shareLocation ? currentLocation : '', 
        createdAt: serverTimestamp()
      });
      
      // 💡 [EmailJS] 새로운 리포트 등록 시 알림 메일 전송
      sendEmailNotification(
          `[비포터] 🚀 새로운 작업 리포트가 등록되었습니다!`,
          `작성자: ${currentUser.name}\n작업 제목: ${taskTitle}\n작업 일자: ${taskDate}\n카테고리: ${taskCategory}\n\n새로운 리포트가 성공적으로 업로드되었습니다.\n\n리포트 바로가기: https://www.beforeter.com/report/${docRef.id}`
      );

      setLatestReportId(docRef.id); 
      setIsFinishModalOpen(true);
    } catch (error) { 
      showToast("업로드 오류가 발생했습니다."); 
      console.error(error);
    } finally { 
      setIsUploading(false); 
    }
  };

  const openDetailView = async (reportId, isInitial = false) => {
    setCurrentView('detail'); 
    setIsDetailLoading(true); 
    setDetailViewMode('horizontal'); 
    setFlippedCards({});
    
    // 리포트를 열 때 스크롤을 항상 가장 위로 올려줍니다.
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    try {
      const docSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', reportId));
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setDetailReport(data);
        updateMetaTags(data);
        if(!isInitial) window.history.pushState({}, '', '/report/' + reportId);
      } else { 
        showToast("존재하지 않는 리포트입니다."); 
        switchView('feed'); 
      }
    } catch (err) { 
      showToast("오류가 발생했습니다."); 
      switchView('feed'); 
    } finally { 
      setIsDetailLoading(false); 
    }
  };

  const openReportEdit = () => {
    setEditDocTitle(detailReport.title); 
    setEditDocStatus(detailReport.status || 'public');
    setIsEditModalOpen(true);
  };

  const submitReportEdit = async () => {
    setIsEditModalOpen(false); 
    showToast("저장 중...");
    try {
      const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', detailReport.id);
      const newHistoryLog = { 
        date: new Date().toLocaleDateString('ko-KR') + ' ' + new Date().toLocaleTimeString('ko-KR', {hour12:false, hour:'2-digit', minute:'2-digit'}), 
        action: '제목 또는 상태 변경' 
      };
      await updateDoc(docRef, {
        title: editDocTitle, 
        status: editDocStatus,
        history: [...(detailReport.history || []), newHistoryLog]
      });
      showToast("수정되었습니다.");
    } catch (e) { 
      showToast("수정에 실패했습니다."); 
    }
  };

  const deleteReport = async () => {
    triggerConfirm("정말 이 리포트를 삭제하시겠습니까? 복구할 수 없습니다.", async () => {
      setIsEditModalOpen(false);
      try {
        await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', detailReport.id));
        showToast("삭제되었습니다."); 
        switchView('feed');
      } catch(e) { 
        showToast("삭제에 실패했습니다."); 
      }
    });
  };

  const copyLink = (id) => {
    const textarea = document.createElement('textarea'); 
    textarea.value = `https://www.beforeter.com/report/${id}`;
    document.body.appendChild(textarea); 
    textarea.select();
    try { 
      document.execCommand('copy'); 
      showToast("주소가 복사되었습니다! 카톡에 붙여넣기 하세요."); 
    } catch (err) { 
      showToast("복사 실패"); 
    } finally { 
      document.body.removeChild(textarea); 
    }
  };
  
  const copyProfileLink = (id) => {
    const textarea = document.createElement('textarea'); 
    textarea.value = `https://www.beforeter.com/profile/${id}`;
    document.body.appendChild(textarea); 
    textarea.select();
    try { 
      document.execCommand('copy'); 
      showToast("오픈 프로필 주소가 복사되었습니다!"); 
    } catch (err) { 
      showToast("복사 실패"); 
    } finally { 
      document.body.removeChild(textarea); 
    }
  };

  // 💡 알림톡 전송 함수
  const sendAlimtalk = async () => {
    if(alimtalkPhone.length < 10) {
        return showToast("올바른 연락처를 입력해주세요.");
    }
    
    setIsAlimtalkSending(true);
    showToast(`${alimtalkPhone} 번호로 알림톡 전송을 요청합니다...`);

    try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        showToast(`알림톡 전송 요청이 성공적으로 서버에 전달되었습니다. 🚀`);
        setIsAlimtalkModalOpen(false);
        setAlimtalkPhone('');
    } catch (error) {
        console.error("알림톡 전송 에러:", error);
        showToast("알림톡 전송 중 오류가 발생했습니다. 나중에 다시 시도해주세요.");
    } finally {
        setIsAlimtalkSending(false);
    }
  };

  const submitComment = async () => {
    if (!commentInput.trim()) return;
    if (!currentUser) return showToast("로그인 후 이용 가능합니다.");
    
    const newComment = { 
      id: crypto.randomUUID(), 
      authorId: currentUser.id, 
      authorName: currentUser.name, 
      authorPic: currentUser.profilePic, 
      text: commentInput.trim(), 
      createdAt: Date.now() 
    };
    
    try {
        const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', detailReport.id);
        const updatedComments = [...(detailReport.comments || []), newComment];
        await updateDoc(docRef, { comments: updatedComments });
        
        setDetailReport(prev => ({ ...prev, comments: updatedComments })); 
        setCommentInput('');
        showToast("댓글이 등록되었습니다.");
        
        if(detailReport.authorId !== currentUser.id) {
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'notifications'), {
                targetUserId: detailReport.authorId, 
                type: 'comment', 
                fromName: currentUser.name, 
                reportId: detailReport.id, 
                isRead: false, 
                createdAt: serverTimestamp()
            });
        }
    } catch(e) { 
      showToast("댓글 등록에 실패했습니다."); 
    }
  };

  const handleToggleLike = async (report, e) => {
    if (e) e.stopPropagation(); 
    if (!currentUser) return showToast("로그인 후 이용 가능합니다.");
    
    const isLiked = report.likes?.includes(currentUser.id);
    let newLikes = report.likes || [];
    
    if (isLiked) {
      newLikes = newLikes.filter(id => id !== currentUser.id);
    } else {
      newLikes.push(currentUser.id);
    }
    
    try {
        const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', report.id);
        await updateDoc(docRef, { likes: newLikes });
        
        if (detailReport && detailReport.id === report.id) {
           setDetailReport(prev => ({ ...prev, likes: newLikes }));
        }

        if(!isLiked && report.authorId !== currentUser.id) {
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'notifications'), {
                targetUserId: report.authorId, 
                type: 'like', 
                fromName: currentUser.name, 
                reportId: report.id, 
                isRead: false, 
                createdAt: serverTimestamp()
            });
        }
    } catch(err) { 
      showToast("요청 처리에 실패했습니다."); 
    }
  };

  const submitFeedback = async () => { 
    if (!feedbackText.trim()) return showToast("내용을 입력해주세요."); 
    try {
      const fbData = {
        userId: currentUser?.id || 'anonymous', 
        email: currentUser?.email || '비로그인',
        category: feedbackCategory, 
        text: feedbackText, 
        createdAt: serverTimestamp()
      };
      
      // DB 저장
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'feedbacks'), fbData);

      // 💡 [EmailJS] 피드백 이메일 전송
      sendEmailNotification(
          `[비포터] 💡 새로운 피드백 접수: ${feedbackCategory}`,
          `작성자: ${currentUser?.name || '익명'}\n이메일: ${fbData.email}\n카테고리: ${feedbackCategory}\n\n내용:\n${feedbackText}`
      );

      showToast("소중한 의견 감사합니다! 적극 검토하겠습니다. ❤️"); 
      setIsFeedbackModalOpen(false); 
      setFeedbackText(''); 
      setFeedbackCategory('기능 관련');
    } catch(e) { 
      console.error("피드백 전송 에러:", e);
      showToast("오류가 발생했습니다. 네트워크를 확인해주세요."); 
    }
  };

  const handleOpenNoti = () => {
    setIsNotiModalOpen(true);
  };

  const markAllNotisAsRead = async () => {
    if (appUpdateNoti && !appUpdateNoti.isRead) {
        localStorage.setItem('beporter_version', APP_VERSION);
        setAppUpdateNoti(prev => ({ ...prev, isRead: true }));
    }

    notifications.forEach(async (noti) => {
      if(!noti.isRead) {
        try {
          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'notifications', noti.id), { isRead: true });
        } catch (e) { console.error(e); }
      }
    });

    showToast("모두 읽음 처리되었습니다.");
  };

  const blockUser = () => {
    if(!postOptionsMenu) return;
    triggerConfirm("이 작업자의 모든 게시물을 차단하시겠습니까?", () => {
      const newBlocked = [...blockedUsers, postOptionsMenu.authorId];
      setBlockedUsers(newBlocked);
      localStorage.setItem('beporter_blocked', JSON.stringify(newBlocked));
      showToast("해당 사용자의 게시물이 차단되었습니다.");
      setPostOptionsMenu(null);
      if(currentView === 'detail') switchView('feed');
    });
  };

  const submitReportPost = async () => {
    if(!reportReason.trim()) return showToast("신고 사유를 입력해주세요.");
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reports_flagged'), {
        reporterId: currentUser.id, 
        reportId: postOptionsMenu.reportId, 
        reason: reportReason, 
        createdAt: serverTimestamp()
      });

      sendEmailNotification(
        `[비포터] 🚨 새로운 게시물 신고 접수`,
        `신고자 ID: ${currentUser.id}\n신고자 이름: ${currentUser.name}\n신고된 게시물 ID: ${postOptionsMenu.reportId}\n\n신고 사유:\n${reportReason}`
      );

      showToast("신고가 접수되었습니다. 관리자 검토 후 조치됩니다.");
      setIsReportPostModalOpen(false); 
      setReportReason(''); 
      setPostOptionsMenu(null);
    } catch(e) { 
      console.error(e);
      showToast("신고 접수에 실패했습니다. 네트워크를 확인해주세요."); 
    }
  };

  const showPublicProfile = async (authorId, forceOpen = false) => {
    if(currentUser && currentUser.id === authorId && !forceOpen) { 
      switchView('mypage'); 
      return; 
    }
    
    setIsDetailLoading(true);
    try {
      const userSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', authorId));
      if(userSnap.exists()) { 
        setPublicProfileUser(userSnap.data()); 
      } else { 
        setPublicProfileUser({ id: authorId, name: '작업자', intro: '아직 자기소개를 등록하지 않았습니다.', keywords: [], profilePic: '' }); 
      }
      setCurrentView('public-profile');
      if(!forceOpen) window.history.pushState({}, '', '/profile/' + authorId);
    } catch(e) { 
      showToast("프로필을 불러오지 못했습니다."); 
    } finally {
      setIsDetailLoading(false);
    }
  };

  const formatDisplayTime = (item) => {
    let displayStr = item.taskDate ? item.taskDate.replace(/-/g, '/') : "날짜 미상";
    if (item.location) displayStr += ` • ${item.location}`;
    return displayStr;
  };
  
  const toggleFlip = (idx) => {
    setFlippedCards(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // 피드 필터 및 파생 데이터 처리
  const publicFeeds = feedData.filter(f => f.status === 'public' && !blockedUsers.includes(f.authorId));
  const displayedFeeds = feedFilter === '전체' 
    ? publicFeeds 
    : publicFeeds.filter(f => (f.category || '기타') === feedFilter);
    
  const myFeeds = currentUser ? feedData.filter(f => f.authorId === currentUser.id) : [];
  const publicProfileFeeds = publicProfileUser ? publicFeeds.filter(f => f.authorId === publicProfileUser.id) : [];
  
  // 전체 읽지 않은 알림 개수 계산 (유저 개인 알림 + 시스템 업데이트 알림)
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
        /* 글로벌 설정 및 초기화 */
        html { 
            overflow-y: scroll; 
        }
        body { 
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif; 
            background-color: #f1f5f9; 
            margin: 0; 
            padding: 0; 
            color: #334155; 
            -webkit-tap-highlight-color: transparent; 
            overflow-x: hidden; 
        }
        
        /* 디자인 토큰 및 변수 선언 */
        :root { 
            --primary: #14b8a6; 
            --primary-hover: #0d9488; 
            --primary-light: #ccfbf1; 
            --card-bg: #ffffff; 
            --text-main: #1e293b; 
            --text-sub: #64748b; 
            --danger: #ef4444;
            --kakao: #FEE500;
            --kakao-text: #000000;
        }
        
        /* 레이아웃 컨테이너 */
        .app-wrapper { 
            max-width: 480px; 
            margin: 0 auto; 
            min-height: 100vh; 
            background-color: #ffffff; 
            box-shadow: 0 0 20px rgba(0,0,0,0.05); 
            position: relative; 
            display: flex; 
            flex-direction: column;
        }
        
        /* 헤더 스타일링 */
        .app-header { 
            position: sticky; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 56px; 
            background-color: var(--card-bg); 
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            padding: 0 16px; 
            z-index: 50; 
            border-bottom: 1px solid #e2e8f0; 
            box-sizing: border-box;
        }
        
        .header-icon { 
            background: none; 
            border: none; 
            color: var(--text-main); 
            font-size: 24px; 
            cursor: pointer; 
            padding: 8px; 
            position: relative; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            border-radius: 50%;
            transition: background-color 0.2s;
        }
        
        .header-icon:active {
            background-color: #f1f5f9;
        }
        
        .header-title { 
            font-size: 18px; 
            font-weight: 800; 
            color: var(--primary); 
            letter-spacing: -0.5px; 
            cursor: pointer; 
        }
        
        .view-section { 
            padding-bottom: 100px; 
            flex: 1; 
            box-sizing: border-box; 
            background: #ffffff; 
            display: flex;
            flex-direction: column;
        }
        
        /* 컴포넌트: 브랜드 훅 카드 (배너) */
        .brand-hook-card { 
            background: linear-gradient(135deg, #0d9488, #14b8a6); 
            color: white; 
            padding: 20px; 
            border-radius: 16px; 
            margin-bottom: 16px; 
            box-shadow: 0 10px 15px -3px rgba(20,184,166,0.2); 
            text-align: left; 
            min-height: 94px; 
            box-sizing: border-box; 
            display: flex; 
            flex-direction: column; 
            justify-content: center;
        }
        
        @keyframes fadeSlide { 
            from { opacity: 0; transform: translateX(20px); } 
            to { opacity: 1; transform: translateX(0); } 
        }
        
        .brand-hook-card h3 { 
            margin: 0 0 6px 0; 
            font-size: 18px; 
            font-weight: 800; 
        }
        
        .brand-hook-card p { 
            margin: 0; 
            font-size: 13px; 
            opacity: 0.9; 
            line-height: 1.4; 
        }
        
        /* 컴포넌트: 필터 칩 스크롤 영역 */
        .filter-scroll { 
            display: flex; 
            gap: 8px; 
            overflow-x: auto; 
            padding: 0 20px 16px 20px; 
            margin: 0; 
            scrollbar-width: none; 
        }
        
        .filter-scroll::-webkit-scrollbar { 
            display: none; 
        }
        
        .filter-chip { 
            padding: 8px 16px; 
            border-radius: 20px; 
            font-size: 13px; 
            font-weight: 700; 
            background: #f1f5f9; 
            color: var(--text-sub); 
            border: 1px solid #e2e8f0; 
            white-space: nowrap; 
            cursor: pointer; 
            transition: 0.2s; 
        }
        
        .filter-chip.active { 
            background: var(--primary); 
            color: white; 
            border-color: var(--primary); 
            box-shadow: 0 4px 6px rgba(20,184,166,0.2); 
        }

        /* 레이아웃: 사이드바 */
        .sidebar-overlay { 
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            background: rgba(0,0,0,0.5); 
            z-index: 100; 
            opacity: 0; 
            visibility: hidden; 
            transition: all 0.3s; 
        }
        
        .sidebar-overlay.active { 
            opacity: 1; 
            visibility: visible; 
        }
        
        .sidebar { 
            position: fixed; 
            top: 0; 
            left: -280px; 
            width: 280px; 
            height: 100%; 
            background: white; 
            z-index: 101; 
            transition: all 0.3s; 
            display: flex; 
            flex-direction: column; 
            box-shadow: 2px 0 12px rgba(0,0,0,0.1); 
        }
        
        .sidebar.active { 
            left: 0; 
        }
        
        /* 컴포넌트: 피드 카드 */
        .feed-container { 
            padding: 16px; 
            flex: 1;
        }
        
        .feed-card { 
            background: var(--card-bg); 
            border-radius: 16px; 
            padding: 16px; 
            margin-bottom: 20px; 
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); 
            border: 1px solid #f1f5f9; 
            cursor: pointer; 
            position: relative; 
        }
        
        .feed-author { 
            display: flex; 
            align-items: center; 
            gap: 10px; 
            margin-bottom: 12px; 
        }
        
        .author-avatar { 
            width: 36px; 
            height: 36px; 
            background-color: var(--primary-light); 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: var(--primary-hover); 
            font-weight: bold; 
            font-size: 14px; 
            overflow: hidden; 
            cursor: pointer;
        }
        
        .author-avatar img { 
            width: 100%; 
            height: 100%; 
            object-fit: cover; 
        }
        
        .feed-title { 
            font-size: 16px; 
            font-weight: 700; 
            margin-bottom: 12px; 
            line-height: 1.4; 
        }
        
        .feed-images { 
            display: flex; 
            gap: 8px; 
            height: 160px; 
        }
        
        .feed-img-wrap { 
            flex: 1; 
            position: relative; 
            border-radius: 8px; 
            overflow: hidden; 
            background-color: #e2e8f0; 
        }
        
        .feed-img-wrap img { 
            width: 100%; 
            height: 100%; 
            object-fit: cover; 
        }
        
        .badge { 
            position: absolute; 
            top: 8px; 
            left: 8px; 
            padding: 4px 8px; 
            border-radius: 4px; 
            font-size: 11px; 
            font-weight: 800; 
            color: white; 
            background: rgba(0,0,0,0.6); 
            backdrop-filter: blur(4px); 
        }
        
        .biz-badge {
            background: var(--primary-light);
            color: var(--primary-hover);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            margin-left: 6px;
            vertical-align: middle;
        }
        
        .biz-badge.pending {
            background: #fef08a;
            color: #854d0e;
        }

        .more-opts-btn { 
            position: absolute; 
            top: 16px; 
            right: 16px; 
            background: none; 
            border: none; 
            font-size: 18px; 
            color: #cbd5e1; 
            cursor: pointer; 
        }
        
        /* 컴포넌트: 디테일 뷰 */
        .detail-card { 
            background: var(--card-bg); 
            border-radius: 16px; 
            padding: 20px; 
            margin-bottom: 20px; 
            box-shadow: 0 10px 25px rgba(0,0,0,0.05); 
            border: 1px solid var(--primary-light); 
        }
        
        .unified-desc { 
            font-size: 14px; 
            color: var(--text-main); 
            background: #f8fafc; 
            padding: 16px; 
            border-radius: 12px; 
            margin-top: 12px; 
            line-height: 1.5; 
            border: 1px solid #e2e8f0; 
        }
        
        /* 컴포넌트: 뷰 모드 컨트롤 */
        .view-mode-control { 
            display: flex; 
            background: #e2e8f0; 
            padding: 6px; 
            border-radius: 14px; 
            margin-bottom: 20px; 
            gap: 4px; 
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); 
        }
        
        .view-mode-btn { 
            flex: 1; 
            padding: 10px; 
            text-align: center; 
            font-size: 13px; 
            font-weight: 700; 
            border-radius: 10px; 
            cursor: pointer; 
            color: var(--text-sub); 
            transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
        }
        
        .view-mode-btn.active { 
            background: white; 
            color: var(--primary); 
            box-shadow: 0 4px 10px rgba(0,0,0,0.1); 
        }
        
        /* 컴포넌트: 3D 플립 카드 (한 장 보기) */
        .flip-card { 
            perspective: 1000px; 
            width: 100%; 
            height: 260px; 
            cursor: pointer; 
            border-radius: 8px; 
        }
        
        .flip-card-inner { 
            position: relative; 
            width: 100%; 
            height: 100%; 
            transition: transform 0.6s; 
            transform-style: preserve-3d; 
        }
        
        .flip-card.flipped .flip-card-inner { 
            transform: rotateY(180deg); 
        }
        
        .flip-card-front, .flip-card-back { 
            position: absolute; 
            width: 100%; 
            height: 100%; 
            backface-visibility: hidden; 
            border-radius: 8px; 
            overflow: hidden; 
            background-color: #e2e8f0; 
        }
        
        .flip-card-back { 
            transform: rotateY(180deg); 
        }
        
        .noti-badge { 
            position: absolute; 
            top: 4px; 
            right: 4px; 
            background: var(--danger); 
            color: white; 
            font-size: 10px; 
            font-weight: bold; 
            width: 16px; 
            height: 16px; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
        }

        /* 뷰: 로그인 화면 */
        .login-container { 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            height: calc(100vh - 56px); 
            padding: 20px; 
            text-align: center; 
        }
        
        .login-logo { 
            width: 80px; 
            height: 80px; 
            background: var(--primary); 
            border-radius: 20px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: white; 
            font-size: 40px; 
            font-weight: bold; 
            margin-bottom: 24px; 
        }
        
        .social-btn { 
            width: 100%; 
            max-width: 320px; 
            padding: 16px; 
            border-radius: 12px; 
            font-size: 16px; 
            font-weight: 700; 
            cursor: pointer; 
            border: 1px solid #cbd5e1; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            gap: 12px; 
            background: white; 
            margin-bottom: 12px; 
            transition: background 0.2s; 
        }
        
        .social-btn.kakao {
            background-color: var(--kakao);
            color: var(--kakao-text);
            border-color: var(--kakao);
        }
        
        .social-btn:hover { 
            filter: brightness(0.95);
        }
        
        /* 컴포넌트: 입력 폼 */
        .input-group { 
            margin-bottom: 24px; 
            text-align: left; 
        }
        
        .title-label { 
            display: block; 
            font-size: 15px; 
            font-weight: 700; 
            color: var(--text-main); 
            margin-bottom: 10px; 
        }
        
        .title-input { 
            width: 100%; 
            padding: 14px; 
            border: 1px solid #cbd5e1; 
            border-radius: 10px; 
            font-size: 15px; 
            box-sizing: border-box; 
            background-color: #f8fafc; 
            font-family: inherit; 
            margin-top: 8px; 
            transition: border-color 0.2s;
        }
        
        .title-input:focus {
            outline: none;
            border-color: var(--primary);
        }
        
        .photo-upload { 
            position: relative; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            width: 100%; 
            height: 160px; 
            background-color: #f8fafc; 
            border: 2px dashed #cbd5e1; 
            border-radius: 12px; 
            cursor: pointer; 
            color: #64748b; 
            font-size: 14px; 
            font-weight: 600; 
            overflow: hidden; 
        }
        
        .photo-upload img.preview { 
            position: absolute; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            object-fit: cover; 
            z-index: 10; 
        }
        
        /* 컴포넌트: 하단 메인 버튼 및 FAB */
        .submit-btn { 
            width: 100%; 
            padding: 18px; 
            background-color: var(--text-main); 
            color: white; 
            border: none; 
            border-radius: 12px; 
            font-size: 16px; 
            font-weight: 700; 
            margin-top: 10px; 
            cursor: pointer; 
        }

        .submit-btn:disabled {
            background-color: #94a3b8;
            cursor: not-allowed;
        }
        
        .fab-container { 
            position: fixed; 
            bottom: 24px; 
            left: 50%; 
            transform: translateX(-50%); 
            width: 100%; 
            max-width: 480px; 
            display: flex; 
            justify-content: center; 
            z-index: 40; 
            pointer-events: none; 
        }
        
        .fab-btn { 
            pointer-events: auto; 
            background-color: var(--primary); 
            color: white; 
            border: none; 
            padding: 16px 28px; 
            border-radius: 30px; 
            font-size: 16px; 
            font-weight: 700; 
            display: flex; 
            align-items: center; 
            gap: 8px; 
            box-shadow: 0 8px 20px rgba(20, 184, 166, 0.4); 
            cursor: pointer; 
        }
        
        /* 레이아웃: 모달 및 바텀 시트 */
        .modal-overlay, .bottom-sheet-overlay { 
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            background: rgba(0,0,0,0.6); 
            z-index: 200; 
            opacity: 0; 
            visibility: hidden; 
            transition: all 0.3s; 
        }
        
        .modal-overlay.active, .bottom-sheet-overlay.active { 
            opacity: 1; 
            visibility: visible; 
        }
        
        .modal-content { 
            background: white; 
            width: 90%; 
            max-width: 360px; 
            border-radius: 20px; 
            padding: 28px 24px; 
            box-sizing: border-box; 
            text-align: center; 
            position: absolute; 
            top: 50%; 
            left: 50%; 
            transform: translate(-50%, -50%); 
            max-height: 80vh; 
            overflow-y: auto; 
        }
        
        .bottom-sheet { 
            position: fixed; 
            bottom: -100%; 
            left: 50%; 
            transform: translateX(-50%); 
            width: 100%; 
            max-width: 480px; 
            background: white; 
            border-radius: 20px 20px 0 0; 
            z-index: 201; 
            padding: 24px 20px; 
            box-sizing: border-box; 
            transition: bottom 0.3s; 
        }
        
        .bottom-sheet.active { 
            bottom: 0; 
        }
        
        .sheet-btn { 
            width: 100%; 
            padding: 16px; 
            background: #f8fafc; 
            border: 1px solid #e2e8f0; 
            border-radius: 12px; 
            font-size: 16px; 
            font-weight: 600; 
            margin-bottom: 12px; 
            cursor: pointer; 
        }
        
        .sheet-btn.cancel { 
            background: white; 
            border: none; 
            color: var(--danger); 
            margin-top: 8px; 
        }
        
        /* 컴포넌트: 토스트 및 기타 */
        .toast { 
            position: fixed; 
            bottom: 30px; 
            left: 50%; 
            transform: translateX(-50%) translateY(100px); 
            background-color: #334155; 
            color: white; 
            padding: 12px 24px; 
            border-radius: 30px; 
            font-size: 14px; 
            font-weight: 600; 
            z-index: 1000; 
            opacity: 0; 
            transition: all 0.3s; 
            white-space: nowrap; 
            pointer-events: none; 
        }
        
        .toast.show { 
            transform: translateX(-50%) translateY(0); 
            opacity: 1; 
        }

        .checkbox-label { 
            display: flex; 
            align-items: center; 
            gap: 10px; 
            font-size: 14px; 
            font-weight: 600; 
            color: var(--text-main); 
            cursor: pointer; 
            padding: 16px; 
            background: #f8fafc; 
            border-radius: 12px; 
            border: 1px solid #e2e8f0; 
            margin-top: 20px; 
        }
        
        .checkbox-label input[type="checkbox"] { 
            width: 18px; 
            height: 18px; 
            accent-color: var(--primary); 
        }

        /* 컴포넌트: 하단 푸터 (Footer) */
        .common-footer {
            background-color: #f8fafc;
            padding: 32px 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            margin-top: auto;
        }
        
        .footer-links {
            margin-bottom: 16px;
            font-size: 13px;
            font-weight: 700;
            color: var(--text-sub);
        }
        
        .footer-links span {
            cursor: pointer;
        }
        
        .footer-links .divider {
            margin: 0 10px;
            color: #cbd5e1;
            cursor: default;
        }
        
        .footer-info {
            font-size: 12px;
            color: #94a3b8;
            line-height: 1.6;
        }
        
        .footer-info p {
            margin: 0 0 4px 0;
        }
        
        .footer-info .copyright {
            margin-top: 12px;
            font-weight: bold;
        }
      `}</style>
      
      {/* 시스템 카메라, 갤러리 호출용 Hidden Input */}
      <div style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
        <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileSelect} />
        <input type="file" accept="image/*" ref={galleryInputRef} onChange={handleFileSelect} />
        <input type="file" accept="image/*" ref={profilePicRef} onChange={handleProfilePicSelect} />
      </div>

      {/* 상단 공통 헤더 */}
      <header className="app-header">
        <button className="header-icon" onClick={toggleMenu}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="header-title" onClick={() => switchView('feed')}>비포터</div>
        <button className="header-icon" onClick={handleOpenNoti}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          {unreadNotis > 0 && <span className="noti-badge">{unreadNotis}</span>}
        </button>
      </header>

      {/* 공통 사이드바 메뉴 */}
      <div className={`sidebar-overlay ${isMenuOpen ? 'active' : ''}`} onClick={toggleMenu}></div>
      <div className={`sidebar ${isMenuOpen ? 'active' : ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="sidebar-header" style={{padding:'30px 20px', background:'var(--primary-light)', borderBottom:'1px solid #bae6fd'}}>
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
                    <h2 style={{margin:0, color:'var(--primary-hover)', fontSize:'18px', fontWeight:800}}>
                        {currentUser.name}
                        {currentUser.bizStatus === 'pending' && <span className="biz-badge pending">사업자 검수중</span>}
                    </h2>
                    {currentUser.company && <p style={{margin:'4px 0 0 0', fontSize:'13px', color:'var(--text-sub)'}}>{currentUser.company}</p>}
                  </div>
                </div>
              ) : (
                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                  <div style={{width:'48px', height:'48px', background:'white', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:'bold', color:'#cbd5e1'}}>?</div>
                  <div>
                    <h2 style={{margin:0, color:'#94a3b8', fontSize:'18px', fontWeight:800}}>비포터</h2>
                    <p style={{margin:0, fontSize:'13px', color:'var(--text-sub)'}}>로그인 후 이용해보세요</p>
                  </div>
                </div>
              )}
            </div>
            
            <ul style={{listStyle:'none', padding:0, margin:0, flex:1, overflowY:'auto'}}>
              <li style={{borderBottom:'1px solid #f1f5f9'}}>
                <button onClick={() => { setIsMenuOpen(false); switchView('feed'); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'18px 20px', color:'var(--text-main)', fontSize:'16px', fontWeight:600, cursor:'pointer'}}>🏠 피드 홈</button>
              </li>
              <li style={{borderBottom:'1px solid #f1f5f9'}}>
                <button onClick={() => { setIsMenuOpen(false); switchView('about'); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'18px 20px', color:'var(--text-main)', fontSize:'16px', fontWeight:600, cursor:'pointer'}}>📖 서비스 소개</button>
              </li>
              {currentUser && (
                <li style={{borderBottom:'1px solid #f1f5f9'}}>
                  <button onClick={() => { setIsMenuOpen(false); switchView('mypage'); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'18px 20px', color:'var(--text-main)', fontSize:'16px', fontWeight:600, cursor:'pointer'}}>👤 마이페이지 (내 리포트)</button>
                </li>
              )}
              {currentUser?.email === 'jinthemoon@kakao.com' && (
                <li style={{borderBottom:'1px solid #f1f5f9', background:'#fef08a'}}>
                  <button onClick={() => { setIsMenuOpen(false); switchView('admin'); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'18px 20px', color:'#854d0e', fontSize:'16px', fontWeight:800, cursor:'pointer'}}>👑 관리자 (사업자 검수)</button>
                </li>
              )}
              <li style={{borderBottom:'1px solid #f1f5f9'}}>
                <button onClick={() => { setIsMenuOpen(false); setIsFeedbackModalOpen(true); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'18px 20px', color:'var(--text-main)', fontSize:'16px', fontWeight:600, cursor:'pointer'}}>💡 개발자에게 피드백 전송</button>
              </li>
            </ul>
            
            <ul style={{listStyle:'none', padding:0, margin:0, borderTop:'1px solid #e2e8f0', background:'#f8fafc'}}>
              {currentUser ? (
                <li>
                  <button onClick={processLogout} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'20px', color:'var(--danger)', fontSize:'15px', fontWeight:700, cursor:'pointer'}}>🚪 로그아웃</button>
                </li>
              ) : (
                <li>
                  <button onClick={() => { setIsMenuOpen(false); switchView('login'); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'20px', color:'var(--text-main)', fontSize:'15px', fontWeight:700, cursor:'pointer'}}>🔐 로그인 / 회원가입</button>
                </li>
              )}
            </ul>
        </div>
      </div>

      {/* 👑 뷰: 관리자 (사업자 검수) */}
      {currentView === 'admin' && currentUser?.email === 'jinthemoon@kakao.com' && (
        <div className="view-section">
          <div style={{padding:'20px', textAlign:'center', background:'var(--primary-light)'}}>
            <h2 style={{margin:0, color:'var(--primary-hover)', fontSize:'20px'}}>사업자 검수 관리</h2>
            <p style={{margin:'8px 0 0 0', fontSize:'13px', color:'var(--text-sub)'}}>검수 대기중인 사용자 수: {pendingBizUsers.length}명</p>
          </div>
          <div className="feed-container">
            {pendingBizUsers.length === 0 ? (
                <div style={{textAlign:'center', padding:'40px 20px', color:'var(--text-sub)'}}>
                    대기 중인 검수 요청이 없습니다.
                </div>
            ) : (
                pendingBizUsers.map(user => (
                    <div key={user.id} className="feed-card" style={{border:'2px solid #fef08a'}}>
                        <div style={{display:'flex', gap:'12px', alignItems:'center', marginBottom:'16px'}}>
                            <div className="author-avatar">{user.name.charAt(0)}</div>
                            <div>
                                <h3 style={{margin:0, fontSize:'16px'}}>{user.name} <span style={{fontSize:'12px', color:'var(--text-sub)'}}>({user.email})</span></h3>
                                <p style={{margin:'4px 0 0 0', fontSize:'14px', fontWeight:'bold'}}>{user.company}</p>
                            </div>
                        </div>
                        <div style={{background:'#f8fafc', padding:'12px', borderRadius:'8px', marginBottom:'16px'}}>
                            <p style={{margin:0, fontSize:'14px', color:'var(--text-sub)'}}>제출된 사업자번호:</p>
                            <p style={{margin:'4px 0 0 0', fontSize:'18px', fontWeight:'800', letterSpacing:'1px'}}>{user.bizNum}</p>
                        </div>
                        <div style={{display:'flex', gap:'10px'}}>
                            <button className="sheet-btn" style={{margin:0, flex:1, background:'var(--danger)', color:'white', border:'none'}} onClick={() => rejectBiz(user.id, user.name)}>거절</button>
                            <button className="sheet-btn" style={{margin:0, flex:1, background:'var(--primary)', color:'white', border:'none'}} onClick={() => approveBiz(user.id, user.name)}>승인하기</button>
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* 뷰: 피드 홈 */}
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
                <p style={{ margin: 0, fontWeight: 600 }}>아직 등록된 리포트가 없습니다.</p>
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
                        <span onClick={(e) => {e.stopPropagation(); showPublicProfile(item.authorId);}} style={{cursor:'pointer'}}>
                            {item.authorName || '작업자'} <span style={{fontSize:'12px', color:'var(--primary)', fontWeight:'bold'}}>[{item.category || '기타'}]</span>
                        </span>
                        <p className="author-time">{formatDisplayTime(item)}</p>
                      </div>
                    </div>
                    
                    <div className="feed-title">{item.title}</div>
                    <div className="feed-images">
                      <div className="feed-img-wrap">
                        <span className="badge" style={{ background: 'var(--danger)' }}>Before</span>
                        <img src={renderSpaces[0].beforeImg} alt="Before" />
                      </div>
                      <div className="feed-img-wrap">
                        <span className="badge" style={{ background: 'var(--primary)' }}>After</span>
                        <img src={renderSpaces[0].afterImg} alt="After" />
                      </div>
                    </div>

                    <div style={{display:'flex', gap:'16px', fontSize:'13px', color:'var(--text-sub)', marginTop:'16px', fontWeight:'600'}}>
                        <button className="action-btn" onClick={(e) => handleToggleLike(item, e)} style={{background:'none', border:'none', padding:0, display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', color: item.likes?.includes(currentUser?.id) ? 'var(--danger)' : 'var(--text-sub)'}}>
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              내 리포트 올리기
            </button>
          </div>
        </div>
      )}

      {/* 뷰: 로그인 화면 */}
      {currentView === 'login' && (
        <div className="view-section" style={{ display:'flex', background:'white' }}>
          <div className="login-container" style={{ width:'100%', paddingBottom: '100px' }}>
            <div className="login-logo">B</div>
            <h1 style={{margin:'0 0 8px 0', color:'var(--text-main)', fontSize:'24px', fontWeight:'800'}}>비포터 시작하기</h1>
            <p style={{margin:'0 0 32px 0', color:'var(--text-sub)', fontSize:'14px'}}>1분 만에 가입하고 신뢰를 공유하세요</p>
            
            <div className="terms-box" style={{textAlign:'left', background:'#f8fafc', padding:'16px 20px', borderRadius:'16px', width:'100%', maxWidth:'320px', marginBottom:'24px', border:'1px solid #e2e8f0', boxSizing:'border-box'}}>
               <label style={{display:'flex', alignItems:'center', fontWeight:'800', color:'var(--text-main)', marginBottom:'12px', cursor:'pointer', fontSize:'15px'}}>
                 <input type="checkbox" checked={termsAgreed && privacyAgreed} onChange={(e)=>{setTermsAgreed(e.target.checked); setPrivacyAgreed(e.target.checked)}} style={{marginRight:'10px', width:'20px', height:'20px', accentColor:'var(--primary)'}} />
                 전체 약관 동의 (회원가입)
               </label>
               <hr style={{borderTop:'1px solid #cbd5e1', marginBottom:'12px', borderBottom:'none'}}/>
               <div style={{display:'flex', flexDirection:'column', gap:'12px', fontSize:'13px', color:'var(--text-sub)'}}>
                 <label style={{display:'flex', alignItems:'center', cursor:'pointer'}}>
                    <input type="checkbox" checked={termsAgreed} onChange={e=>setTermsAgreed(e.target.checked)} style={{marginRight:'8px', accentColor:'var(--primary)'}} /> 
                    (필수) <span style={{textDecoration:'underline', marginLeft:'4px'}} onClick={(e)=>{e.preventDefault(); setIsTermsModalOpen(true);}}>서비스 이용약관</span> 동의
                 </label>
                 <label style={{display:'flex', alignItems:'center', cursor:'pointer'}}>
                    <input type="checkbox" checked={privacyAgreed} onChange={e=>setPrivacyAgreed(e.target.checked)} style={{marginRight:'8px', accentColor:'var(--primary)'}} /> 
                    (필수) <span style={{textDecoration:'underline', marginLeft:'4px'}} onClick={(e)=>{e.preventDefault(); setIsTermsModalOpen(true);}}>개인정보 수집 및 이용</span> 동의
                 </label>
               </div>
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
            <p style={{fontSize:'12px', color:'#94a3b8', marginTop:'16px'}}>SNS 계정 연동 시 회원가입이 자동으로 진행됩니다.</p>
          </div>
        </div>
      )}

      {/* 뷰: 서비스 소개 */}
      {currentView === 'about' && (
        <div className="view-section" style={{background:'#ffffff', textAlign:'center'}}>
            <div style={{padding: '40px 20px'}}>
                <div style={{width:'80px', height:'80px', background:'var(--primary)', borderRadius:'20px', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'40px', fontWeight:'bold', margin:'0 auto 20px auto', boxShadow:'0 10px 20px rgba(20,184,166,0.3)'}}>B</div>
                <h1 style={{fontSize:'24px', fontWeight:'800', color:'var(--text-main)', marginBottom:'12px'}}>비포터 (Beforeter)</h1>
                <p style={{fontSize:'15px', color:'var(--text-sub)', lineHeight:'1.6', marginBottom:'40px'}}>단 2장의 사진으로 당신의 전문성을 증명하세요.<br/>고객의 신뢰를 얻는 가장 완벽한 작업 리포트 플랫폼</p>

                <div style={{textAlign:'left', display:'flex', flexDirection:'column', gap:'16px'}}>
                    <div style={{background:'#f8fafc', padding:'20px', borderRadius:'16px', border:'1px solid #e2e8f0'}}>
                        <h3 style={{margin:'0 0 8px 0', fontSize:'16px', color:'var(--primary)', display:'flex', alignItems:'center', gap:'8px'}}>⚡ 10초 완성 리포트</h3>
                        <p style={{margin:0, fontSize:'14px', color:'var(--text-sub)', lineHeight:'1.5'}}>작업 전/후 사진만 올리면 깔끔하고 전문적인 리포트가 자동으로 생성됩니다.</p>
                    </div>
                    <div style={{background:'#f8fafc', padding:'20px', borderRadius:'16px', border:'1px solid #e2e8f0'}}>
                        <h3 style={{margin:'0 0 8px 0', fontSize:'16px', color:'var(--primary)', display:'flex', alignItems:'center', gap:'8px'}}>🔗 간편한 URL 공유</h3>
                        <p style={{margin:0, fontSize:'14px', color:'var(--text-sub)', lineHeight:'1.5'}}>작업 완료 후 카카오톡으로 링크 하나만 보내면, 고객이 바로 결과를 확인할 수 있습니다.</p>
                    </div>
                    <div style={{background:'#f8fafc', padding:'20px', borderRadius:'16px', border:'1px solid #e2e8f0'}}>
                        <h3 style={{margin:'0 0 8px 0', fontSize:'16px', color:'var(--primary)', display:'flex', alignItems:'center', gap:'8px'}}>👤 나만의 오픈 프로필</h3>
                        <p style={{margin:0, fontSize:'14px', color:'var(--text-sub)', lineHeight:'1.5'}}>그동안 올린 리포트가 내 프로필에 쌓여, 자연스럽게 나의 실력을 증명하는 포트폴리오가 됩니다.</p>
                    </div>
                </div>

                <button className="submit-btn" style={{marginTop:'40px'}} onClick={() => switchView(currentUser ? 'feed' : 'login')}>
                    {currentUser ? '피드로 돌아가기' : '지금 바로 시작하기'}
                </button>
            </div>
            {renderFooter()}
        </div>
      )}

      {/* 뷰: 마이페이지 */}
      {currentView === 'mypage' && currentUser && (
        <div className="view-section">
          <div className="mypage-header" style={{background: '#f8fafc', padding: '30px 20px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', position: 'relative'}}>
            <button style={{position: 'absolute', top: '16px', right: '16px', background: 'white', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: 'var(--text-sub)'}} onClick={openProfileEdit}>
              ✏️ 프로필 수정
            </button>
            
            <div className="author-avatar" style={{margin: '0 auto 12px auto', width: '72px', height: '72px', fontSize: '28px'}} onClick={() => setSelectedImage(currentUser.profilePic)}>
              {currentUser.profilePic ? <img src={currentUser.profilePic} alt="프로필" /> : (currentUser.name || '작업자').charAt(0)}
            </div>
            
            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-main)', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                {currentUser.name}
                {currentUser.bizStatus === 'approved' && <span className="biz-badge">✅ 사업자 인증됨</span>}
                {currentUser.bizStatus === 'pending' && <span className="biz-badge pending">사업자 검수중</span>}
            </h2>
            {currentUser.company && <p style={{margin:'4px 0 0 0', fontSize:'14px', color:'var(--text-sub)'}}>{currentUser.company}</p>}
            
            <div style={{marginTop:'12px'}}>
                <p style={{fontSize:'14px', color:'var(--text-main)', margin:'0 0 8px 0', fontWeight:'600'}}>{currentUser.intro || '자기소개를 입력해주세요.'}</p>
                <div style={{display:'flex', gap:'6px', justifyContent:'center', flexWrap:'wrap'}}>
                    {(currentUser.keywords || []).map(k => <span key={k} style={{background:'var(--primary-light)', color:'var(--primary-hover)', padding:'4px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'bold'}}>#{k}</span>)}
                </div>
            </div>

            <button className="sheet-btn" style={{marginTop:'20px', padding:'12px', borderStyle:'dashed', borderColor:'var(--primary)', color:'var(--primary-hover)', background:'white', fontSize:'14px'}} onClick={() => showPublicProfile(currentUser.id, true)}>
              👀 내 오픈 프로필 미리보기
            </button>

            <div style={{display: 'flex', justifyContent: 'center', gap: '40px', marginTop: '20px'}}>
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <span style={{fontSize: '20px', fontWeight: '800', color: 'var(--primary)'}}>{myFeeds.length}</span>
                <span style={{fontSize: '13px', color: 'var(--text-sub)'}}>작성한 리포트</span>
              </div>
            </div>
          </div>
          
          <div className="feed-container">
            {myFeeds.length === 0 ? (
              <div style={{textAlign:'center', padding:'40px 20px', color:'var(--text-sub)'}}>
                <p style={{ margin: 0, fontWeight: 600 }}>작성한 리포트가 없습니다.</p>
              </div>
            ) : (
              myFeeds.map((item, idx) => {
                  const myReportIndex = myFeeds.length - idx; 
                  const renderSpaces = item.spaces && item.spaces.length > 0 ? item.spaces : [{ beforeImg: item.beforeImg, afterImg: item.afterImg }];
                  return (
                    <div key={item.id} className="feed-card" onClick={() => openDetailView(item.id)}>
                      <div style={{display:'inline-block', background:'var(--primary-light)', color:'var(--primary-hover)', fontSize:'11px', fontWeight:'800', padding:'4px 8px', borderRadius:'6px', marginBottom:'8px'}}>
                        내 리포트 {myReportIndex}
                      </div>
                      <div className="feed-title" style={{marginBottom: '10px'}}>
                        {item.status === 'private' ? '🔒 ' : ''}{item.title}
                      </div>
                      <div style={{display:'flex', gap:'16px', fontSize:'13px', color:'var(--text-sub)', marginTop:'12px', fontWeight:'600'}}>
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
          </div>
          {renderFooter()}
        </div>
      )}

      {/* 뷰: 공개 프로필 */}
      {currentView === 'public-profile' && publicProfileUser && (
        <div className="view-section">
          <div style={{background: '#f8fafc', padding: '20px 20px 30px 20px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', position: 'relative'}}>
            <button style={{position: 'absolute', top: '16px', left: '16px', background: 'white', border: '1px solid #cbd5e1', width:'36px', height:'36px', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center', cursor: 'pointer', color: 'var(--text-sub)'}} onClick={() => switchView('feed')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            
            <div className="author-avatar" style={{margin: '10px auto 12px auto', width: '72px', height: '72px', fontSize: '28px'}} onClick={() => setSelectedImage(publicProfileUser.profilePic)}>
              {publicProfileUser.profilePic ? <img src={publicProfileUser.profilePic} alt="프로필" /> : (publicProfileUser.name || '작업자').charAt(0)}
            </div>
            
            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-main)' }}>
                {publicProfileUser.name}
                {publicProfileUser.bizStatus === 'approved' && <span className="biz-badge">✅ 사업자 인증됨</span>}
            </h2>
            {publicProfileUser.company && <p style={{fontSize:'13px', color:'var(--text-sub)', marginTop:'4px'}}>{publicProfileUser.company}</p>}
            
            <div style={{marginTop:'16px'}}>
                <p style={{fontSize:'14px', color:'var(--text-main)', margin:'0 0 12px 0', fontWeight:'600'}}>{publicProfileUser.intro || '작성된 소개가 없습니다.'}</p>
                <div style={{display:'flex', gap:'6px', justifyContent:'center', flexWrap:'wrap'}}>
                    {(publicProfileUser.keywords || []).map(k => <span key={k} style={{background:'var(--primary-light)', color:'var(--primary-hover)', padding:'4px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'bold'}}>#{k}</span>)}
                </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'center', gap: '40px', marginTop: '20px'}}>
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <span style={{fontSize: '20px', fontWeight: '800', color: 'var(--primary)'}}>{publicProfileFeeds.length}</span>
                <span style={{fontSize: '13px', color: 'var(--text-sub)'}}>공개된 리포트</span>
              </div>
            </div>
            
            <button onClick={() => copyProfileLink(publicProfileUser.id)} style={{background:'white', color:'var(--text-main)', border:'1px solid #cbd5e1', padding:'8px 20px', borderRadius:'20px', fontSize:'13px', fontWeight:'700', marginTop:'24px', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:'6px'}}>
                🔗 오픈 프로필 링크 복사
            </button>
          </div>
          
          <div className="feed-container">
            {publicProfileFeeds.length === 0 ? (
              <div style={{textAlign:'center', padding:'40px 20px', color:'var(--text-sub)'}}>
                <p style={{ margin: 0, fontWeight: 600 }}>아직 공개된 리포트가 없습니다.</p>
              </div>
            ) : (
              publicProfileFeeds.map((item, idx) => {
                  const renderSpaces = item.spaces && item.spaces.length > 0 ? item.spaces : [{ beforeImg: item.beforeImg, afterImg: item.afterImg }];
                  return (
                    <div key={item.id} className="feed-card" onClick={() => openDetailView(item.id)}>
                      <div className="feed-title" style={{marginBottom: '10px'}}>{item.title}</div>
                      <div style={{display:'flex', gap:'16px', fontSize:'13px', color:'var(--text-sub)', marginBottom:'12px', fontWeight:'600'}}>
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
            <div className="view-mode-control" style={{background:'#e2e8f0'}}>
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
              <div key={sp.id} style={uploadMode === 'multi' ? {background: '#f8fafc', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '20px'} : {}}>
                {uploadMode === 'multi' && (
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
                    <input type="text" className="title-input" style={{padding:'10px', fontSize:'14px', width:'70%', marginTop:0}} placeholder="구역 이름 (예: 거실)" value={sp.spaceName} onChange={(e) => handleSpaceDescChange(index, 'name', e.target.value)} />
                    {spaces.length > 1 && <button onClick={() => removeSpace(index)} style={{background:'none', border:'none', color:'var(--danger)', fontWeight:'bold', cursor:'pointer'}}>삭제</button>}
                  </div>
                )}
                
                <div style={{display:'flex', gap:'10px', marginBottom:'16px'}}>
                    <div style={{flex:1}}>
                        <label style={{display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'8px'}}>작업 전</label>
                        <div className="photo-upload" style={{height:'120px'}} onClick={() => openPhotoSheet(index, 'before')}>
                            {!sp.beforeImg && <span>📸 + 추가</span>}
                            {sp.beforeImg && <img className="preview" src={sp.beforeImg} style={{display:'block'}} alt="전" />}
                        </div>
                    </div>
                    <div style={{flex:1}}>
                        <label style={{display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'8px'}}>작업 후</label>
                        <div className="photo-upload" style={{height:'120px'}} onClick={() => openPhotoSheet(index, 'after')}>
                            {!sp.afterImg && <span>✨ + 추가</span>}
                            {sp.afterImg && <img className="preview" src={sp.afterImg} style={{display:'block'}} alt="후" />}
                        </div>
                    </div>
                </div>
                
                <textarea className="title-input" style={{fontSize:'14px', height:'80px', resize:'none', marginTop:0}} placeholder="작업 전후 통합 상세 설명 (어떤 과정을 거쳤나요?)" value={sp.desc} onChange={(e) => handleSpaceDescChange(index, 'desc', e.target.value)}></textarea>
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
              {isUploading ? "클라우드 저장 중..." : "완료 및 공유하기"}
            </button>
          </div>
        </div>
      )}

      {/* 뷰: 리포트 상세 보기 */}
      {currentView === 'detail' && detailReport && (
        <div className="view-section" style={{paddingTop: '20px'}}>
          <div className="feed-container">
            
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
              <span style={{background:'var(--primary-light)', color:'var(--primary-hover)', padding:'6px 14px', borderRadius:'20px', fontSize:'12px', fontWeight:'bold'}}>
                {detailReport.status === 'private' ? '🔒 비공개 리포트' : '✅ 인증된 리포트'}
              </span>
              {currentUser && currentUser.id === detailReport.authorId && (
                <button onClick={openReportEdit} style={{background:'none', border:'1px solid #cbd5e1', padding:'6px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'600', cursor:'pointer'}}>⚙️ 관리</button>
              )}
            </div>
            
            <div className="detail-card" style={{position:'relative'}}>
              {detailReport.reportNo && <div style={{position:'absolute', top:'-14px', left:'20px', background:'var(--text-main)', color:'white', padding:'4px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:'800', letterSpacing:'1px', boxShadow:'0 4px 6px rgba(0,0,0,0.1)'}}>No. {detailReport.reportNo}</div>}
              <div style={{borderBottom:'1px solid #f1f5f9', paddingBottom:'16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: detailReport.reportNo ? '10px' : '0'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <div className="author-avatar" onClick={() => setSelectedImage(detailReport.authorPic)}>
                    {detailReport.authorPic ? <img src={detailReport.authorPic} alt="프로필" /> : (detailReport.authorName || '작업자').charAt(0)}
                  </div>
                  <div>
                    <span style={{fontSize:'14px', fontWeight:'bold', color:'var(--text-main)'}}>{detailReport.authorName || '작업자'}</span>
                    <p style={{fontSize:'12px', color:'var(--text-sub)', margin:0}}>{formatDisplayTime(detailReport)}</p>
                  </div>
                </div>
                <button onClick={() => showPublicProfile(detailReport.authorId)} style={{background:'#f1f5f9', color:'var(--text-main)', border:'none', padding:'6px 12px', borderRadius:'16px', fontSize:'12px', fontWeight:'700', cursor:'pointer'}}>프로필 보기</button>
              </div>
              
              <h2 style={{fontSize:'22px', fontWeight:'800', color:'var(--text-main)', margin: '16px 0 16px 0'}}>{detailReport.title}</h2>
              
              <div className="view-mode-control">
                <div className={`view-mode-btn ${detailViewMode==='horizontal'?'active':''}`} onClick={()=>setDetailViewMode('horizontal')}>가로 보기</div>
                <div className={`view-mode-btn ${detailViewMode==='vertical'?'active':''}`} onClick={()=>setDetailViewMode('vertical')}>세로 보기</div>
                <div className={`view-mode-btn ${detailViewMode==='flip'?'active':''}`} onClick={()=>setDetailViewMode('flip')}>한 장 보기</div>
              </div>
              
              {(detailViewMode === 'horizontal' || detailViewMode === 'vertical') && (
                <p style={{fontSize:'12px', color:'var(--text-sub)', textAlign:'center', marginBottom:'16px', fontWeight:'600'}}>
                  🔍 자세히 보길 원하시면 사진을 눌러보세요.
                </p>
              )}

              {(detailReport.spaces && detailReport.spaces.length > 0 ? detailReport.spaces : [{ beforeImg: detailReport.beforeImg, afterImg: detailReport.afterImg, desc: detailReport.desc }]).map((sp, idx) => (
                <div key={idx} style={{marginBottom: '24px', background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'}}>
                  {sp.spaceName && (
                    <h4 style={{margin:'0 0 16px 0', color:'var(--text-main)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                      <span style={{background:'var(--primary-light)', padding:'4px 8px', borderRadius:'6px', color:'var(--primary-hover)'}}>📍</span> {sp.spaceName}
                    </h4>
                  )}
                  
                  {detailViewMode === 'vertical' && (
                    <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                      <div className="feed-img-wrap" style={{height:'auto', minHeight:'200px', cursor:'zoom-in'}} onClick={() => setSelectedImage(sp.beforeImg)}>
                        <span className="badge" style={{background:'var(--danger)'}}>Before</span>
                        <img src={sp.beforeImg} style={{display:'block', width:'100%'}} alt="Before" />
                      </div>
                      <div className="feed-img-wrap" style={{height:'auto', minHeight:'200px', cursor:'zoom-in'}} onClick={() => setSelectedImage(sp.afterImg)}>
                        <span className="badge" style={{background:'var(--primary)'}}>After</span>
                        <img src={sp.afterImg} style={{display:'block', width:'100%'}} alt="After" />
                      </div>
                    </div>
                  )}

                  {detailViewMode === 'horizontal' && (
                    <div style={{display:'flex', gap:'8px'}}>
                      <div className="feed-img-wrap" style={{height:'180px', cursor:'zoom-in'}} onClick={() => setSelectedImage(sp.beforeImg)}>
                        <span className="badge" style={{background:'var(--danger)'}}>Before</span>
                        <img src={sp.beforeImg} style={{height:'100%', objectFit:'cover'}} alt="Before" />
                      </div>
                      <div className="feed-img-wrap" style={{height:'180px', cursor:'zoom-in'}} onClick={() => setSelectedImage(sp.afterImg)}>
                        <span className="badge" style={{background:'var(--primary)'}}>After</span>
                        <img src={sp.afterImg} style={{height:'100%', objectFit:'cover'}} alt="After" />
                      </div>
                    </div>
                  )}

                  {detailViewMode === 'flip' && (
                    <div>
                      <p style={{margin:'0 0 10px 0', fontSize:'12px', color:'var(--text-sub)', textAlign:'center', fontWeight:'600'}}>사진을 탭하여 전/후를 비교해보세요 👆</p>
                      <div className={`flip-card ${flippedCards[idx] ? 'flipped' : ''}`} onClick={() => toggleFlip(idx)}>
                        <div className="flip-card-inner">
                          <div className="flip-card-front">
                            <span className="img-label" style={{background:'var(--danger)', position:'absolute', top:'10px', left:'10px', zIndex:10, padding:'4px 8px', borderRadius:'4px', color:'white', fontSize:'11px'}}>Before</span>
                            <img src={sp.beforeImg} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="Before" />
                          </div>
                          <div className="flip-card-back">
                            <span className="img-label" style={{background:'var(--primary)', position:'absolute', top:'10px', left:'10px', zIndex:10, padding:'4px 8px', borderRadius:'4px', color:'white', fontSize:'11px'}}>After</span>
                            <img src={sp.afterImg} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="After" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {sp.desc && <div className="unified-desc"><strong>📝 작업 설명: </strong>{sp.desc}</div>}
                </div>
              ))}
            </div>
            
            <button className="submit-btn" style={{background:'var(--kakao)', color:'var(--kakao-text)', marginTop:0}} onClick={() => setIsAlimtalkModalOpen(true)}>
                💬 고객에게 카카오 알림톡 전송
            </button>
            <button className="submit-btn" style={{background:'var(--primary)', marginTop:'12px'}} onClick={() => copyLink(detailReport.id)}>
                🔗 이 리포트 링크 복사
            </button>
            <button className="submit-btn" style={{background:'white', color:'var(--text-main)', border:'1px solid #cbd5e1', marginTop:'12px'}} onClick={() => switchView('feed')}>
                목록으로 돌아가기
            </button>
            
            <div className="comment-section" style={{marginTop: '32px'}}>
              <div style={{display:'flex', alignItems:'center', gap:'16px', marginBottom:'20px'}}>
                  <h3 style={{fontSize:'16px', margin:0}}>💬 댓글 {(detailReport.comments || []).length}</h3>
                  <button onClick={(e) => handleToggleLike(detailReport, e)} style={{background:'none', border:'1px solid #e2e8f0', borderRadius:'20px', padding:'4px 12px', display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', fontSize:'14px', fontWeight:'bold', color: detailReport.likes?.includes(currentUser?.id) ? 'var(--danger)' : 'var(--text-sub)'}}>
                      {detailReport.likes?.includes(currentUser?.id) ? '❤️' : '🤍'} {(detailReport.likes || []).length}
                  </button>
              </div>

              <div>
                {(detailReport.comments || []).map((c) => (
                  <div key={c.id} style={{display:'flex', gap:'10px', marginBottom:'16px', textAlign:'left'}}>
                    <div className="author-avatar" style={{width:'32px', height:'32px'}} onClick={() => setSelectedImage(c.authorPic)}>
                        {c.authorPic ? <img src={c.authorPic} style={{width:'100%'}}/> : (c.authorName || '?').charAt(0)}
                    </div>
                    <div>
                      <div style={{fontSize:'13px', fontWeight:'bold', marginBottom:'2px'}}>{c.authorName}</div>
                      <div style={{fontSize:'14px', color:'var(--text-main)', lineHeight:'1.4'}}>{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                <input type="text" style={{flex:1, padding:'12px', border:'1px solid #cbd5e1', borderRadius:'20px', fontSize:'14px', outline:'none', background:'#f8fafc'}} placeholder="칭찬이나 궁금한 점을 남겨보세요" value={commentInput} onChange={(e) => setCommentInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && submitComment()}/>
                <button style={{background:'var(--primary)', color:'white', border:'none', padding:'0 16px', borderRadius:'20px', fontWeight:'bold', cursor:'pointer'}} onClick={submitComment}>등록</button>
              </div>
            </div>
          </div>
          {renderFooter()}
        </div>
      )}

      {/* 모달: 카카오 알림톡 전송 */}
      <div className={`modal-overlay ${isAlimtalkModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{ padding: '24px 20px', width: '90%' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '18px' }}>💬 고객에게 알림톡 전송</h3>
          <p style={{fontSize:'13px', color:'var(--text-sub)', marginBottom:'20px', lineHeight:'1.5'}}>
            작업 결과를 고객의 카카오톡으로 바로 전송합니다.<br/>고객의 휴대전화 번호를 입력해주세요.
          </p>
          <div className="input-group" style={{ marginBottom: '24px', textAlign:'left' }}>
            <label className="title-label" style={{ fontSize: '13px' }}>받는 사람 연락처</label>
            <input type="tel" className="title-input" style={{ padding: '12px' }} placeholder="숫자만 입력 (예: 01012345678)" value={alimtalkPhone} onChange={(e) => setAlimtalkPhone(e.target.value.replace(/[^0-9]/g, ''))} />
          </div>
          <button className="sheet-btn" disabled={isAlimtalkSending} style={{ background: 'var(--kakao)', color: 'var(--kakao-text)', border: 'none', fontWeight:'800' }} onClick={sendAlimtalk}>
            {isAlimtalkSending ? '전송 처리 중...' : '전송하기'}
          </button>
          <button className="sheet-btn cancel" onClick={() => setIsAlimtalkModalOpen(false)}>닫기</button>
        </div>
      </div>

      {/* 모달: 이용약관 및 개인정보처리방침 */}
      <div className={`modal-overlay ${isTermsModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{ padding: '24px 20px', width: '95%', maxHeight:'85vh' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>이용약관 및 정책</h3>
          
          <div style={{textAlign:'left', height:'50vh', overflowY:'auto', background:'#f8fafc', padding:'16px', borderRadius:'12px', border:'1px solid #e2e8f0', fontSize:'12px', lineHeight:'1.6', color:'var(--text-sub)'}}>
            <h4 style={{color:'var(--text-main)', marginTop:0}}>서비스 이용약관</h4>
            <pre style={{whiteSpace:'pre-wrap', fontFamily:'inherit', margin:0}}>{TERMS_OF_SERVICE}</pre>
            <hr style={{margin:'20px 0', borderTop:'1px solid #cbd5e1', borderBottom:'none'}}/>
            <h4 style={{color:'var(--text-main)', marginTop:0}}>개인정보처리방침</h4>
            <pre style={{whiteSpace:'pre-wrap', fontFamily:'inherit', margin:0}}>{PRIVACY_POLICY}</pre>
          </div>

          <button className="sheet-btn" style={{ background: 'var(--text-main)', color: 'white', border: 'none', marginTop:'20px' }} onClick={() => setIsTermsModalOpen(false)}>확인</button>
        </div>
      </div>

      {/* 리포트 관리(수정/삭제) 모달 */}
      <div className={`modal-overlay ${isEditModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{ padding: '24px 20px', width: '90%' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>리포트 관리</h3>
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
          <button className="sheet-btn" style={{ background: 'var(--primary)', color: 'white', border: 'none' }} onClick={submitReportEdit}>변경사항 저장</button>
          <button className="sheet-btn" style={{ background: 'var(--danger)', color: 'white', border: 'none' }} onClick={deleteReport}>🚨 이 리포트 삭제하기</button>
          <button className="sheet-btn cancel" onClick={() => setIsEditModalOpen(false)}>닫기</button>
        </div>
      </div>
      
      {/* 프로필 수정 모달 */}
      <div className={`modal-overlay ${isProfileModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{ padding: '24px 20px', width: '100%', maxHeight:'85vh', overflowY:'auto' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>프로필 편집</h3>
          
          <div className="author-avatar" style={{width:'80px', height:'80px', borderRadius:'50%', background:'#e2e8f0', margin:'0 auto 20px auto', position:'relative', fontSize:'24px'}} onClick={() => profilePicRef.current.click()}>
            {editProfilePic ? <img src={editProfilePic} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="프로필" /> : (editName || '작업자').charAt(0)}
            <div style={{position: 'absolute', bottom: 0, left: 0, width: '100%', height: '30%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px'}}>📷</div>
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
            <label className="title-label" style={{ fontSize: '13px' }}>
                사업자 등록번호 
                {(currentUser && currentUser.bizStatus === 'pending') && <span style={{color:'#d97706', fontSize:'11px', marginLeft:'6px'}}>(검수중)</span>}
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

      {/* 알림 모달 */}
      <div className={`modal-overlay ${isNotiModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{maxHeight:'80vh', overflowY:'auto'}}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>🔔 알림센터</h3>
          
          {/* 시스템 업데이트 알림 */}
          {appUpdateNoti && (
             <div style={{padding:'16px', borderBottom:'1px solid #f1f5f9', background: appUpdateNoti.isRead ? 'transparent' : '#f0fdfa', borderRadius:'8px', marginBottom:'12px', textAlign:'left'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                    <div>
                        <p style={{margin:0, fontSize:'14px', color: appUpdateNoti.isRead ? 'var(--text-sub)' : 'var(--primary-hover)', fontWeight:'bold', marginBottom:'6px'}}>
                            📢 {appUpdateNoti.fromName}
                        </p>
                        <p style={{margin:0, fontSize:'13px', color:'var(--text-main)', lineHeight:'1.5'}}>
                            {appUpdateNoti.text}
                        </p>
                    </div>
                    {appUpdateNoti.isRead && <span style={{fontSize:'11px', color:'#94a3b8', whiteSpace:'nowrap', marginLeft:'8px'}}>읽음</span>}
                </div>
             </div>
          )}

          {notifications.length === 0 && (!appUpdateNoti) ? (
            <div style={{padding:'40px 0'}}>
              <p style={{fontSize:'14px', color:'var(--text-sub)', margin:0}}>새로운 알림이 없습니다.</p>
            </div>
          ) : (
            <div style={{textAlign:'left'}}>
              {notifications.map(n => (
                <div key={n.id} style={{padding:'12px', borderBottom:'1px solid #f1f5f9', background: n.isRead ? 'transparent' : '#f0fdfa', borderRadius:'8px', marginBottom:'8px'}}>
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                    <p style={{margin:0, fontSize:'13px', color: n.isRead ? 'var(--text-sub)' : 'var(--text-main)'}}>
                        <strong>{n.fromName}</strong>님이 {n.type === 'like' ? '회원님의 리포트를 좋아합니다 ❤️' : '회원님의 리포트에 댓글을 남겼습니다 💬'}
                    </p>
                    {n.isRead && <span style={{fontSize:'11px', color:'#94a3b8', whiteSpace:'nowrap', marginLeft:'8px'}}>읽음</span>}
                  </div>
                </div>
              ))}
              <button className="sheet-btn" style={{marginTop:'16px', fontSize:'14px'}} onClick={markAllNotisAsRead}>모두 읽음 처리</button>
            </div>
          )}
          <button className="sheet-btn cancel" onClick={() => setIsNotiModalOpen(false)}>닫기</button>
        </div>
      </div>

      <div className={`bottom-sheet-overlay ${postOptionsMenu ? 'active' : ''}`} onClick={() => setPostOptionsMenu(null)}></div>
      <div className={`bottom-sheet ${postOptionsMenu ? 'active' : ''}`}>
        <p style={{ margin: '0 0 20px 0', fontWeight: 700, textAlign: 'center' }}>게시물 옵션</p>
        <button className="sheet-btn" onClick={() => { setPostOptionsMenu(null); setIsReportPostModalOpen(true); }}>🚨 이 게시물 신고하기</button>
        <button className="sheet-btn" style={{color:'var(--danger)'}} onClick={blockUser}>🚫 이 작업자 차단하기</button>
        <button className="sheet-btn cancel" onClick={() => setPostOptionsMenu(null)}>취소</button>
      </div>

      <div className={`modal-overlay ${isReportPostModalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <h3 style={{ marginTop: 0, marginBottom: '12px' }}>게시물 신고</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '16px' }}>신고 사유를 구체적으로 적어주세요. 관리자 검토 후 조치되며 Firestore DB에 저장됩니다.</p>
          <textarea className="title-input" style={{height:'100px', resize:'none', marginBottom:'16px'}} placeholder="신고 사유 입력..." value={reportReason} onChange={(e) => setReportReason(e.target.value)}></textarea>
          <button className="sheet-btn" style={{ background: 'var(--danger)', color: 'white', border: 'none' }} onClick={submitReportPost}>신고 접수</button>
          <button className="sheet-btn cancel" onClick={() => { setIsReportPostModalOpen(false); setReportReason(''); }}>취소</button>
        </div>
      </div>

      <div className={`modal-overlay ${isFeedbackModalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <h3 style={{ marginTop: 0, marginBottom: '12px' }}>개발자에게 피드백 전송</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '16px' }}>작성하신 피드백은 안전하게 저장되며, 앱 개선에 활용됩니다.</p>
          
          <select className="title-input" style={{ marginBottom: '12px', padding: '12px', fontSize: '14px', width: '100%', cursor: 'pointer' }} value={feedbackCategory} onChange={(e) => setFeedbackCategory(e.target.value)}>
            <option value="기능 관련">⚙️ 기능 관련</option>
            <option value="오류 제보">🚨 오류 제보</option>
            <option value="디자인">🎨 디자인</option>
            <option value="기타">💬 기타</option>
          </select>
          <textarea className="title-input" style={{height:'100px', resize:'none', marginBottom:'16px'}} placeholder="자유롭게 적어주세요!" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)}></textarea>
          
          <button className="sheet-btn" style={{ background: 'var(--text-main)', color: 'white', border: 'none', marginBottom:'24px' }} onClick={submitFeedback}>보내기</button>
          
          <div style={{textAlign:'left', borderTop:'1px solid #e2e8f0', paddingTop:'16px'}}>
            <h4 style={{fontSize:'14px', color:'var(--text-main)', margin:'0 0 12px 0'}}>내가 보낸 피드백 내역 ({myFeedbacks.length}건)</h4>
            <div style={{maxHeight:'150px', overflowY:'auto'}}>
              {myFeedbacks.length === 0 ? (
                <p style={{fontSize:'13px', color:'var(--text-sub)', textAlign:'center'}}>전송한 피드백이 없습니다.</p>
              ) : (
                myFeedbacks.map(fb => (
                  <div key={fb.id} style={{background:'#f8fafc', padding:'10px', borderRadius:'8px', marginBottom:'8px'}}>
                    <div style={{fontSize:'12px', fontWeight:'bold', color:'var(--primary)'}}>[{fb.category}]</div>
                    <div style={{fontSize:'13px', color:'var(--text-main)', marginTop:'4px'}}>{fb.text}</div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <button className="sheet-btn cancel" onClick={() => setIsFeedbackModalOpen(false)}>닫기</button>
        </div>
      </div>

      <div className={`bottom-sheet-overlay ${isPhotoSheetOpen ? 'active' : ''}`} onClick={() => setIsPhotoSheetOpen(false)}></div>
      <div className={`bottom-sheet ${isPhotoSheetOpen ? 'active' : ''}`}>
        <p style={{ margin: '0 0 20px 0', fontWeight: 700, textAlign: 'center' }}>사진 첨부 방식 선택</p>
        <button className="sheet-btn" onClick={() => triggerPhotoInput('camera')}>📷 카메라로 바로 촬영</button>
        <button className="sheet-btn" onClick={() => triggerPhotoInput('gallery')}>🖼️ 스마트폰 앨범에서 선택</button>
        <button className="sheet-btn cancel" onClick={() => setIsPhotoSheetOpen(false)}>취소</button>
      </div>

      <div className={`modal-overlay ${selectedImage ? 'active' : ''}`} onClick={() => setSelectedImage(null)} style={{zIndex: 1000}}>
        {selectedImage && (
          <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box'}}>
            <img src={selectedImage} alt="확대된 이미지" style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', background:'white'}} />
            <button style={{position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer'}}>×</button>
          </div>
        )}
      </div>

      <div className={`modal-overlay ${isFinishModalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>리포트 작성 완료! 🎉</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-sub)', marginBottom: '20px' }}>피드에 등록되었습니다.<br/>고객에게 공유해 보세요!</p>
          <button className="sheet-btn" style={{ background: 'var(--kakao)', color: 'var(--kakao-text)', border: 'none', fontWeight:'800' }} onClick={() => {setIsFinishModalOpen(false); setIsAlimtalkModalOpen(true);}}>💬 고객에게 카카오 알림톡 전송</button>
          <button className="sheet-btn" style={{ background: 'var(--primary)', color: 'white', border: 'none' }} onClick={() => { copyLink(latestReportId); setTimeout(() => { setIsFinishModalOpen(false); setTaskTitle(''); setTaskDate(getToday()); setSpaces([{...defaultSpace}]); setIsPrivateUpload(false); switchView('feed'); }, 1500); }}>🔗 카톡용 리포트 링크 복사</button>
          <button className="sheet-btn cancel" onClick={() => { setIsFinishModalOpen(false); setTaskTitle(''); setTaskDate(getToday()); setSpaces([{...defaultSpace}]); setIsPrivateUpload(false); switchView('feed'); }}>피드로 가기</button>
        </div>
      </div>

      <div className={`modal-overlay ${confirmDialog.show ? 'active' : ''}`}>
        <div className="modal-content" style={{width:'80%', maxWidth:'320px', padding:'24px 20px'}}>
            <h3 style={{marginTop:0, marginBottom:'16px', fontSize:'16px', color:'var(--text-main)', lineHeight:'1.5'}}>{confirmDialog.msg}</h3>
            <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                <button className="sheet-btn cancel" style={{flex:1, margin:0, background:'#f1f5f9', color:'var(--text-main)'}} onClick={() => setConfirmDialog({show:false, msg:'', onConfirm:null})}>취소</button>
                <button className="sheet-btn" style={{flex:1, margin:0, background:'var(--danger)', color:'white', border:'none'}} onClick={confirmDialog.onConfirm}>확인</button>
            </div>
        </div>
      </div>

      <div className={`toast ${toastMsg.show ? 'show' : ''}`}>{toastMsg.msg}</div>
    </div>
  );
}