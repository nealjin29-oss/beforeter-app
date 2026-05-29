import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, doc, getDoc, setDoc, query, onSnapshot, serverTimestamp, updateDoc, deleteDoc, where } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

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
const provider = new GoogleAuthProvider();
const db = getFirestore(app); 
const storage = getStorage(app); 

const APP_ID = 'beforeter-app';

export default function App() {
  // 뷰 컨트롤 및 네비게이션 상태
  const [currentView, setCurrentView] = useState('feed'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // 유저 및 데이터 상태
  const [currentUser, setCurrentUser] = useState(null); 
  const [feedData, setFeedData] = useState([]); 
  const [notifications, setNotifications] = useState([]);
  const [myFeedbacks, setMyFeedbacks] = useState([]); 
  
  // 로컬 스토리지 안전한 초기화 (차단된 유저 목록)
  const getInitialBlocked = () => {
    try {
      const stored = localStorage.getItem('beporter_blocked');
      return stored ? JSON.parse(stored) : [];
    } catch(e) {
      return [];
    }
  };
  const [blockedUsers, setBlockedUsers] = useState(getInitialBlocked());
  
  // 모달 및 바텀시트 상태
  const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState(false);
  const [currentPhotoTarget, setCurrentPhotoTarget] = useState(null); 
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false); 
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); 
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNotiModalOpen, setIsNotiModalOpen] = useState(false);
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

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIdx(prev => (prev + 1) % banners.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [banners.length]);

  const getToday = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };
  
  // 작성 폼 상태
  const [taskDate, setTaskDate] = useState(getToday());
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState('기타');
  const [uploadMode, setUploadMode] = useState('single'); 
  const [isPrivateUpload, setIsPrivateUpload] = useState(false); // 5번 기능: 비공개 저장 상태
  const defaultSpace = { id: 1, spaceName: '', beforeImg: '', afterImg: '', desc: '' };
  const [spaces, setSpaces] = useState([{...defaultSpace}]);
  
  // 피드백 및 기타 상태
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('기능 관련');
  const [toastMsg, setToastMsg] = useState({ show: false, msg: '' });
  const [shareLocation, setShareLocation] = useState(true);
  const [currentLocation, setCurrentLocation] = useState('위치 파악 중...');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  
  // 프로필 편집 상태
  const [editName, setEditName] = useState('');
  const [editAffiliation, setEditAffiliation] = useState('');
  const [editProfilePic, setEditProfilePic] = useState('');
  const [editIntro, setEditIntro] = useState('');
  const [editKeywords, setEditKeywords] = useState('');

  // 디테일 뷰 상태
  const [latestReportId, setLatestReportId] = useState('');
  const [detailReport, setDetailReport] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [editDocTitle, setEditDocTitle] = useState('');
  const [editDocStatus, setEditDocStatus] = useState('public');
  const [commentInput, setCommentInput] = useState('');
  const [detailViewMode, setDetailViewMode] = useState('horizontal'); 
  const [flippedCards, setFlippedCards] = useState({}); 
  const [selectedImage, setSelectedImage] = useState(null); 
  
  // 피드 카테고리 필터
  const [feedFilter, setFeedFilter] = useState('전체'); 
  const [reportReason, setReportReason] = useState('');
  const categories = ['전체', '건설', '미용', '인테리어', '청소', '기타'];

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const profilePicRef = useRef(null);

  // 인증 및 유저 데이터 구독
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 프로필 정보 연동
        const userRef = doc(db, 'artifacts', APP_ID, 'public', 'users', user.uid);
        const userSnap = await getDoc(userRef);
        let userData = {
          id: user.uid, 
          name: user.displayName || '작업자', 
          affiliation: '', 
          profilePic: user.photoURL || '', 
          intro: '', 
          keywords: [], 
          email: user.email || '', 
          provider: 'Google'
        };
        
        if (userSnap.exists()) {
          userData = { ...userData, ...userSnap.data(), id: user.uid };
        } else {
          await setDoc(userRef, userData);
        }
        setCurrentUser(userData);
        
        // 내 알림 실시간 동기화
        const notiQ = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'notifications'), where("targetUserId", "==", user.uid));
        onSnapshot(notiQ, (snap) => {
          const notis = [];
          snap.forEach(d => notis.push({ id: d.id, ...d.data() }));
          notis.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
          setNotifications(notis);
        }, (err) => console.error(err));

        // 내가 보낸 피드백 히스토리 동기화
        const fbQ = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'feedbacks'), where("userId", "==", user.uid));
        onSnapshot(fbQ, (snap) => {
          const fbs = [];
          snap.forEach(d => fbs.push({ id: d.id, ...d.data() }));
          fbs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
          setMyFeedbacks(fbs);
        }, (err) => console.error(err));

      } else { 
        setCurrentUser(null); 
        setNotifications([]); 
        setMyFeedbacks([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // 피드 목록 실시간 동기화
  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reports'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reports = [];
      snapshot.forEach((doc) => reports.push({ id: doc.id, ...doc.data() }));
      reports.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setFeedData(reports);
      
      // 디테일 뷰를 보고 있는 경우 실시간 변경사항 반영
      if (detailReport) {
        const updated = reports.find(r => r.id === detailReport.id);
        if (updated) setDetailReport(updated);
      }
    }, (error) => console.error("데이터 읽기 오류:", error));
    return () => unsubscribe();
  }, [detailReport]);

  // GPS 위치 연동
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

  // 공통 헬퍼 함수
  const showToast = (msg) => { 
    setToastMsg({ show: true, msg }); 
    setTimeout(() => setToastMsg({ show: false, msg: '' }), 3000); 
  };
  
  const switchView = (view) => { 
    if (view === 'feed' && window.location.pathname.includes('/report/')) {
      window.history.pushState({}, '', '/'); 
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

  const handleLoginClick = () => { 
    setTermsAgreed(false); 
    setPrivacyAgreed(false); 
    setIsTermsModalOpen(true); 
  };

  const processLogin = async () => {
    if (!termsAgreed || !privacyAgreed) return showToast("약관에 동의해주세요.");
    try { 
      setIsTermsModalOpen(false); 
      await signInWithPopup(auth, provider); 
      showToast(`로그인 되었습니다.`); 
      switchView('feed'); 
    } catch (error) { 
      showToast("로그인에 실패했습니다."); 
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

  const openProfileEdit = () => { 
    setEditName(currentUser.name); 
    setEditAffiliation(currentUser.affiliation); 
    setEditProfilePic(currentUser.profilePic); 
    setEditIntro(currentUser.intro || ''); 
    setEditKeywords((currentUser.keywords || []).join(', '));
    setIsProfileModalOpen(true); 
  };

  // 이미지 압축 유틸리티
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
      resizeAndCompressImage(e.target.files[0], setEditProfilePic, 200); 
    }
    e.target.value = ''; 
  };

  const saveProfile = async () => {
    if (!editName.trim()) return showToast("이름을 입력해주세요.");
    
    const kwdArray = editKeywords.split(',').map(k => k.trim()).filter(k => k !== '').slice(0, 5);
    const updatedUser = { 
      ...currentUser, 
      name: editName, 
      affiliation: editAffiliation, 
      profilePic: editProfilePic, 
      intro: editIntro, 
      keywords: kwdArray 
    };
    
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'users', currentUser.id), updatedUser);
      setCurrentUser(updatedUser); 
      setIsProfileModalOpen(false); 
      showToast("프로필이 저장되었습니다.");
    } catch(e) { 
      showToast("프로필 저장에 실패했습니다."); 
    }
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
      }, 800);
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

  // 리포트 생성 (5번 기능: 비공개 여부 반영)
  const saveAndShareReport = async () => {
    if (!taskTitle || !taskDate) return showToast("작업 일자와 제목을 입력해주세요!");
    if (spaces.some(sp => !sp.beforeImg || !sp.afterImg)) return showToast("모든 공간의 Before/After 사진을 첨부해주세요!");

    setIsUploading(true); 
    showToast("클라우드에 안전하게 저장 중...");
    
    try {
      const timeStamp = Date.now();
      
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
        authorId: currentUser.id, 
        authorName: currentUser.name || '작업자', 
        authorAffiliation: currentUser.affiliation || '',
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
      
      setLatestReportId(docRef.id); 
      setIsFinishModalOpen(true);
    } catch (error) { 
      showToast("업로드 오류가 발생했습니다."); 
    } finally { 
      setIsUploading(false); 
    }
  };

  const openDetailView = async (reportId) => {
    setCurrentView('detail'); 
    setIsDetailLoading(true); 
    setDetailViewMode('horizontal'); 
    setFlippedCards({});
    
    try {
      const docSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', reportId));
      if (docSnap.exists()) {
        setDetailReport({ id: docSnap.id, ...docSnap.data() });
        window.history.pushState({}, '', '/report/' + reportId);
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
      showToast("주소가 복사되었습니다!"); 
    } catch (err) { 
      showToast("복사 실패"); 
    } finally { 
      document.body.removeChild(textarea); 
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

  // 3번 기능: 좋아요 공통 로직 (피드 및 상세 뷰에서 모두 호출 가능)
  const handleToggleLike = async (report, e) => {
    if (e) e.stopPropagation(); // 카드 클릭(상세 이동) 방지
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
        
        // 상세 뷰를 보고 있다면 실시간으로 반영하기 위해 상태 업데이트 (onSnapshot이 있지만 즉각적인 UI 반영을 위해)
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
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'feedbacks'), {
        userId: currentUser?.id || 'anonymous', 
        email: currentUser?.email || '',
        category: feedbackCategory, 
        text: feedbackText, 
        createdAt: serverTimestamp()
      });
      showToast("소중한 의견 감사합니다! 이메일로 답변 드릴게요. ❤️"); 
      setIsFeedbackModalOpen(false); 
      setFeedbackText(''); 
      setFeedbackCategory('기능 관련');
    } catch(e) { 
      showToast("오류가 발생했습니다."); 
    }
  };

  // 알림 열기
  const handleOpenNoti = () => {
    if(!currentUser) return showToast("로그인 후 이용 가능합니다.");
    setIsNotiModalOpen(true);
    
    notifications.forEach(async (noti) => {
      if(!noti.isRead) {
        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'notifications', noti.id), { isRead: true });
      }
    });
  };

  // 버그 수정: 선언 누락되었던 markAllNotisAsRead 복원
  const markAllNotisAsRead = async () => {
    notifications.forEach(async (noti) => {
      if(!noti.isRead) {
        await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'notifications', noti.id), { isRead: true });
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
      showToast("신고가 접수되었습니다. 관리자 검토 후 조치됩니다.");
      setIsReportPostModalOpen(false); 
      setReportReason(''); 
      setPostOptionsMenu(null);
    } catch(e) { 
      showToast("신고 접수에 실패했습니다."); 
    }
  };

  // 6번 기능: 타인 프로필 보기 (모달 대신 전용 뷰로 이동)
  const showPublicProfile = async (authorId) => {
    if(currentUser && currentUser.id === authorId) { 
      switchView('mypage'); 
      return; 
    }
    
    try {
      const userSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'users', authorId));
      if(userSnap.exists()) { 
        setPublicProfileUser(userSnap.data()); 
        switchView('public-profile'); // 전용 뷰로 이동
      } else { 
        setPublicProfileUser({ id: authorId, name: '알 수 없는 사용자', intro: '', keywords: [] }); 
        switchView('public-profile');
      }
    } catch(e) { 
      showToast("프로필을 불러오지 못했습니다."); 
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

  // 4번 기능: 기존 데이터(카테고리 없는 경우) '기타'로 취급하여 필터링
  const publicFeeds = feedData.filter(f => f.status === 'public' && !blockedUsers.includes(f.authorId));
  const displayedFeeds = feedFilter === '전체' 
    ? publicFeeds 
    : publicFeeds.filter(f => (f.category || '기타') === feedFilter);
    
  const myFeeds = currentUser ? feedData.filter(f => f.authorId === currentUser.id) : [];
  const publicProfileFeeds = publicProfileUser ? publicFeeds.filter(f => f.authorId === publicProfileUser.id) : [];
  const unreadNotis = notifications.filter(n => !n.isRead).length;

  return (
    <div className="app-wrapper">
      <style>{`
        body { 
          font-family: 'Pretendard', sans-serif; 
          background-color: #f1f5f9; 
          margin: 0; 
          padding: 0; 
          color: #334155; 
          -webkit-tap-highlight-color: transparent; 
          overflow-x: hidden; 
        }
        :root { 
          --primary: #14b8a6; 
          --primary-hover: #0d9488; 
          --primary-light: #ccfbf1; 
          --card-bg: #ffffff; 
          --text-main: #1e293b; 
          --text-sub: #64748b; 
        }
        
        .app-wrapper { 
          max-width: 480px; 
          margin: 0 auto; 
          min-height: 100vh; 
          background-color: #ffffff; 
          box-shadow: 0 0 20px rgba(0,0,0,0.05); 
          position: relative; 
        }
        
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
        }
        
        .header-title { 
          font-size: 18px; 
          font-weight: 800; 
          color: var(--primary); 
          letter-spacing: -0.5px; 
          cursor: pointer; 
        }
        
        .view-section { 
          padding-bottom: 90px; 
          min-height: calc(100vh - 56px); 
          box-sizing: border-box; 
          background: #ffffff;
        }
        
        .brand-hook-card { 
          background: linear-gradient(135deg, #0d9488, #14b8a6); 
          color: white; 
          padding: 20px; 
          border-radius: 16px; 
          margin-bottom: 16px; 
          box-shadow: 0 10px 15px -3px rgba(20,184,166,0.2); 
          text-align: left; 
        }
        
        @keyframes fadeSlide { 
          from { opacity: 0; transform: translateX(20px); } 
          to { opacity: 1; transform: translateX(0); } 
        }
        
        .brand-hook-card h3 { margin: 0 0 6px 0; font-size: 18px; font-weight: 800; }
        .brand-hook-card p { margin: 0; font-size: 13px; opacity: 0.9; line-height: 1.4; }
        
        /* 2번 기능: 카테고리 필터 스크롤 및 여백 개선 */
        .filter-scroll { 
          display: flex; 
          gap: 8px; 
          overflow-x: auto; 
          padding: 0 20px 16px 20px; 
          margin: 0; 
          scrollbar-width: none; 
        }
        .filter-scroll::-webkit-scrollbar { display: none; }
        
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

        .sidebar-overlay { 
          position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
          background: rgba(0,0,0,0.5); z-index: 100; opacity: 0; visibility: hidden; transition: all 0.3s; 
        }
        .sidebar-overlay.active { opacity: 1; visibility: visible; }
        
        .sidebar { 
          position: fixed; top: 0; left: -280px; width: 280px; height: 100%; 
          background: white; z-index: 101; transition: all 0.3s; display: flex; flex-direction: column; 
          box-shadow: 2px 0 12px rgba(0,0,0,0.1); 
        }
        .sidebar.active { left: 0; }
        
        .feed-container { padding: 16px; }
        .feed-card { 
          background: var(--card-bg); border-radius: 16px; padding: 16px; margin-bottom: 20px; 
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; 
          cursor: pointer; position: relative;
        }
        
        .feed-author { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .author-avatar { 
          width: 36px; height: 36px; background-color: var(--primary-light); border-radius: 50%; 
          display: flex; align-items: center; justify-content: center; color: var(--primary-hover); 
          font-weight: bold; font-size: 14px; overflow: hidden; 
        }
        .author-avatar img { width: 100%; height: 100%; object-fit: cover; }
        
        .feed-title { font-size: 16px; font-weight: 700; margin-bottom: 12px; line-height: 1.4; }
        
        .feed-images { display: flex; gap: 8px; height: 160px; }
        .feed-img-wrap { flex: 1; position: relative; border-radius: 8px; overflow: hidden; background-color: #e2e8f0; }
        .feed-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
        
        .badge { 
          position: absolute; top: 8px; left: 8px; padding: 4px 8px; border-radius: 4px; 
          font-size: 11px; font-weight: 800; color: white; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); 
        }
        
        .more-opts-btn { 
          position: absolute; top: 16px; right: 16px; background: none; border: none; 
          font-size: 18px; color: #cbd5e1; cursor: pointer; 
        }
        
        .detail-card { 
          background: var(--card-bg); border-radius: 16px; padding: 20px; margin-bottom: 20px; 
          box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid var(--primary-light); 
        }
        
        .unified-desc { 
          font-size: 14px; color: var(--text-main); background: #f8fafc; padding: 16px; 
          border-radius: 12px; margin-top: 12px; line-height: 1.5; border: 1px solid #e2e8f0; 
        }
        
        .view-mode-control { display: flex; background: #f1f5f9; padding: 4px; border-radius: 12px; margin-bottom: 20px; }
        .view-mode-btn { 
          flex: 1; padding: 10px; text-align: center; font-size: 13px; font-weight: 700; 
          border-radius: 8px; cursor: pointer; color: var(--text-sub); transition: 0.2s; 
        }
        .view-mode-btn.active { background: white; color: var(--primary); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        
        .flip-card { perspective: 1000px; width: 100%; height: 260px; cursor: pointer; border-radius: 8px; }
        .flip-card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s; transform-style: preserve-3d; }
        .flip-card.flipped .flip-card-inner { transform: rotateY(180deg); }
        .flip-card-front, .flip-card-back { 
          position: absolute; width: 100%; height: 100%; backface-visibility: hidden; 
          border-radius: 8px; overflow: hidden; background-color: #e2e8f0; 
        }
        .flip-card-back { transform: rotateY(180deg); }
        
        .noti-badge { 
          position: absolute; top: 4px; right: 4px; background: #ef4444; color: white; 
          font-size: 10px; font-weight: bold; width: 16px; height: 16px; border-radius: 50%; 
          display: flex; align-items: center; justify-content: center; 
        }

        .login-container { 
          display: flex; flex-direction: column; align-items: center; justify-content: center; 
          height: calc(100vh - 56px); padding: 20px; text-align: center; 
        }
        .login-logo { 
          width: 80px; height: 80px; background: var(--primary); border-radius: 20px; 
          display: flex; align-items: center; justify-content: center; color: white; 
          font-size: 40px; font-weight: bold; margin-bottom: 24px; 
        }
        
        .social-btn { 
          width: 100%; max-width: 320px; padding: 16px; border-radius: 12px; 
          font-size: 16px; font-weight: 700; cursor: pointer; border: 1px solid #cbd5e1; 
          display: flex; align-items: center; justify-content: center; gap: 12px; 
          background: white; margin-bottom: 12px; 
        }
        
        .input-group { margin-bottom: 24px; text-align: left; }
        .title-label { display: block; font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 10px; }
        .title-input { 
          width: 100%; padding: 14px; border: 1px solid #cbd5e1; border-radius: 10px; 
          font-size: 15px; box-sizing: border-box; background-color: #f8fafc; 
          font-family: inherit; margin-top: 8px;
        }
        
        .photo-upload { 
          position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; 
          width: 100%; height: 160px; background-color: #f8fafc; border: 2px dashed #cbd5e1; 
          border-radius: 12px; cursor: pointer; color: #64748b; font-size: 14px; font-weight: 600; overflow: hidden; 
        }
        .photo-upload img.preview { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 10; }
        
        .submit-btn { 
          width: 100%; padding: 18px; background-color: var(--text-main); color: white; 
          border: none; border-radius: 12px; font-size: 16px; font-weight: 700; 
          margin-top: 10px; cursor: pointer; 
        }
        
        .fab-container { 
          position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); 
          width: 100%; max-width: 480px; display: flex; justify-content: center; 
          z-index: 40; pointer-events: none; 
        }
        .fab-btn { 
          pointer-events: auto; background-color: var(--primary); color: white; border: none; 
          padding: 16px 28px; border-radius: 30px; font-size: 16px; font-weight: 700; 
          display: flex; align-items: center; gap: 8px; box-shadow: 0 8px 20px rgba(20, 184, 166, 0.4); cursor: pointer; 
        }
        
        .modal-overlay, .bottom-sheet-overlay { 
          position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
          background: rgba(0,0,0,0.6); z-index: 200; opacity: 0; visibility: hidden; transition: all 0.3s; 
        }
        .modal-overlay.active, .bottom-sheet-overlay.active { opacity: 1; visibility: visible; }
        
        .modal-content { 
          background: white; width: 90%; max-width: 360px; border-radius: 20px; 
          padding: 28px 24px; box-sizing: border-box; text-align: center; 
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
          max-height: 80vh; overflow-y: auto; 
        }
        
        .bottom-sheet { 
          position: fixed; bottom: -100%; left: 50%; transform: translateX(-50%); 
          width: 100%; max-width: 480px; background: white; border-radius: 20px 20px 0 0; 
          z-index: 201; padding: 24px 20px; box-sizing: border-box; transition: bottom 0.3s; 
        }
        .bottom-sheet.active { bottom: 0; }
        
        .sheet-btn { 
          width: 100%; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; 
          border-radius: 12px; font-size: 16px; font-weight: 600; margin-bottom: 12px; cursor: pointer; 
        }
        .sheet-btn.cancel { background: white; border: none; color: #ef4444; margin-top: 8px; }
        
        .toast { 
          position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(100px); 
          background-color: #334155; color: white; padding: 12px 24px; border-radius: 30px; 
          font-size: 14px; font-weight: 600; z-index: 1000; opacity: 0; transition: all 0.3s; 
          white-space: nowrap; pointer-events: none; 
        }
        .toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }

        /* 체크박스 디자인 */
        .checkbox-label {
          display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600;
          color: var(--text-main); cursor: pointer; padding: 16px; background: #f8fafc;
          border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 20px;
        }
        .checkbox-label input[type="checkbox"] {
          width: 18px; height: 18px; accent-color: var(--primary);
        }
      `}</style>
      
      <div style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
        <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileSelect} />
        <input type="file" accept="image/*" ref={galleryInputRef} onChange={handleFileSelect} />
        <input type="file" accept="image/*" ref={profilePicRef} onChange={handleProfilePicSelect} />
      </div>

      {/* 헤더 바 */}
      <header className="app-header">
        <button className="header-icon" onClick={toggleMenu}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        
        <div className="header-title" onClick={() => switchView('feed')}>비포터</div>
        
        {/* 1번 기능: 심플한 종 모양 SVG 아이콘 적용 */}
        <button className="header-icon" onClick={handleOpenNoti}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
             <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          {unreadNotis > 0 && <span className="noti-badge">{unreadNotis}</span>}
        </button>
      </header>

      {/* 좌측 슬라이드 사이드바 */}
      <div className={`sidebar-overlay ${isMenuOpen ? 'active' : ''}`} onClick={toggleMenu}></div>
      <div className={`sidebar ${isMenuOpen ? 'active' : ''}`}>
        <div className="sidebar-header" style={{padding:'30px 20px', background:'var(--primary-light)', borderBottom:'1px solid #bae6fd'}}>
          {currentUser ? (
            <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
              <div style={{width:'48px', height:'48px', background:'white', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:'bold', color:'var(--primary)', overflow:'hidden'}}>
                {currentUser.profilePic ? (
                  <img src={currentUser.profilePic} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="프로필" />
                ) : (
                  (currentUser.name || '작업자').charAt(0)
                )}
              </div>
              <div>
                <h2 style={{margin:0, color:'var(--primary-hover)', fontSize:'18px', fontWeight:800}}>{currentUser.name}</h2>
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
        
        <ul style={{listStyle:'none', padding:0, margin:0, flex:1}}>
          <li style={{borderBottom:'1px solid #f1f5f9'}}>
            <button onClick={() => { setIsMenuOpen(false); switchView('feed'); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'18px 20px', color:'var(--text-main)', fontSize:'16px', fontWeight:600, cursor:'pointer'}}>🏠 피드 홈</button>
          </li>
          {currentUser ? (
            <>
              <li style={{borderBottom:'1px solid #f1f5f9'}}>
                <button onClick={() => { setIsMenuOpen(false); switchView('mypage'); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'18px 20px', color:'var(--text-main)', fontSize:'16px', fontWeight:600, cursor:'pointer'}}>👤 마이페이지 (내 리포트)</button>
              </li>
              <li style={{borderBottom:'1px solid #f1f5f9'}}>
                <button onClick={() => { setIsMenuOpen(false); setIsFeedbackModalOpen(true); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'18px 20px', color:'var(--text-main)', fontSize:'16px', fontWeight:600, cursor:'pointer'}}>💡 개발자에게 피드백 전송</button>
              </li>
              <li>
                <button onClick={processLogout} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'18px 20px', color:'#ef4444', fontSize:'16px', fontWeight:600, cursor:'pointer'}}>🚪 로그아웃</button>
              </li>
            </>
          ) : (
            <>
              <li style={{borderBottom:'1px solid #f1f5f9'}}>
                <button onClick={() => { setIsMenuOpen(false); switchView('login'); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'18px 20px', color:'var(--text-main)', fontSize:'16px', fontWeight:600, cursor:'pointer'}}>🔐 로그인 / 회원가입</button>
              </li>
              <li>
                <button onClick={() => { setIsMenuOpen(false); checkAuthAndAction(() => setIsFeedbackModalOpen(true)); }} style={{width:'100%', textAlign:'left', background:'none', border:'none', padding:'18px 20px', color:'var(--text-main)', fontSize:'16px', fontWeight:600, cursor:'pointer'}}>💡 개발자에게 피드백 전송</button>
              </li>
            </>
          )}
        </ul>
      </div>

      {/* 뷰: 메인 피드 */}
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
              <div 
                key={cat} 
                className={`filter-chip ${feedFilter === cat ? 'active' : ''}`} 
                onClick={() => setFeedFilter(cat)}>
                {cat}
              </div>
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
                      if(e.target.closest('.more-opts-btn') || e.target.closest('.action-btn')) return;
                      openDetailView(item.id);
                  }}>
                    <button className="more-opts-btn" onClick={(e) => { 
                      e.stopPropagation(); 
                      setPostOptionsMenu({ reportId: item.id, authorId: item.authorId }); 
                    }}>
                      ⋮
                    </button>
                    
                    <div className="feed-author">
                      <div className="author-avatar">
                        {item.authorPic ? (
                          <img src={item.authorPic} alt="프로필" />
                        ) : (
                          (item.authorName || '작업자').charAt(0)
                        )}
                      </div>
                      <div>
                        {/* 4번 기능: 기존 카테고리 없던 항목 '기타' 처리 표시 */}
                        {item.authorName || '작업자'} <span style={{fontSize:'12px', color:'var(--primary)', fontWeight:'bold'}}>[{item.category || '기타'}]</span>
                        <p className="author-time">{formatDisplayTime(item)}</p>
                      </div>
                    </div>
                    
                    <div className="feed-title">{item.title}</div>
                    <div className="feed-images">
                      <div className="feed-img-wrap">
                        <span className="badge" style={{ background: '#ef4444' }}>Before</span>
                        <img src={renderSpaces[0].beforeImg} alt="Before" />
                      </div>
                      <div className="feed-img-wrap">
                        <span className="badge" style={{ background: 'var(--primary)' }}>After</span>
                        <img src={renderSpaces[0].afterImg} alt="After" />
                      </div>
                    </div>

                    {/* 3번 기능: 피드 밖에서도 좋아요/댓글 수 보이고 바로 좋아요 가능 */}
                    <div style={{display:'flex', gap:'16px', fontSize:'13px', color:'var(--text-sub)', marginTop:'16px', fontWeight:'600'}}>
                        <button 
                          className="action-btn"
                          onClick={(e) => handleToggleLike(item, e)} 
                          style={{background:'none', border:'none', padding:0, display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', color: item.likes?.includes(currentUser?.id) ? '#ef4444' : 'var(--text-sub)'}}
                        >
                            {item.likes?.includes(currentUser?.id) ? '❤️' : '🤍'} {(item.likes || []).length}
                        </button>
                        <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                            💬 {(item.comments || []).length}
                        </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          
          <div className="fab-container">
            <button className="fab-btn" onClick={() => checkAuthAndAction(() => switchView('upload'))}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              내 리포트 올리기
            </button>
          </div>
        </div>
      )}

      {/* 뷰: 로그인 */}
      {currentView === 'login' && (
        <div className="view-section" style={{ display:'flex' }}>
          <div className="login-container" style={{ width:'100%' }}>
            <div className="login-logo">B</div>
            <h1>비포터 시작하기</h1>
            <p>1분만에 가입하고 신뢰를 공유하세요</p>
            
            <button className="social-btn" onClick={handleLoginClick}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12c0-.82-.07-1.61-.2-2.38H12v4.5h5.68a5.4 5.4 0 0 1-2.34 3.55v2.95h3.79C21.34 18.57 22 15.55 22 12z"/>
              </svg>
              Google 계정으로 시작하기
            </button>
          </div>
        </div>
      )}

      {/* 뷰: 마이페이지 */}
      {currentView === 'mypage' && currentUser && (
        <div className="view-section">
          <div className="mypage-header" style={{background: '#f8fafc', padding: '30px 20px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', position: 'relative'}}>
            <button 
              style={{position: 'absolute', top: '16px', right: '16px', background: 'white', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: 'var(--text-sub)'}} 
              onClick={openProfileEdit}>
              ✏️ 프로필 수정
            </button>
            
            <div style={{margin: '0 auto 12px auto', width: '72px', height: '72px', borderRadius:'50%', overflow:'hidden', background:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize: '28px', color:'var(--primary)', fontWeight:'bold'}}>
              {currentUser.profilePic ? (
                <img src={currentUser.profilePic} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="프로필" />
              ) : (
                (currentUser.name || '작업자').charAt(0)
              )}
            </div>
            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-main)' }}>{currentUser.name}</h2>
            
            <div style={{marginTop:'12px'}}>
                <p style={{fontSize:'14px', color:'var(--text-main)', margin:'0 0 8px 0', fontWeight:'600'}}>
                  {currentUser.intro || '자기소개를 입력해주세요.'}
                </p>
                <div style={{display:'flex', gap:'6px', justifyContent:'center', flexWrap:'wrap'}}>
                    {(currentUser.keywords || []).map(k => (
                      <span key={k} style={{background:'var(--primary-light)', color:'var(--primary-hover)', padding:'4px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'bold'}}>#{k}</span>
                    ))}
                </div>
            </div>

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
              myFeeds.map(item => {
                  const renderSpaces = item.spaces && item.spaces.length > 0 ? item.spaces : [{ beforeImg: item.beforeImg, afterImg: item.afterImg }];
                  return (
                    <div key={item.id} className="feed-card" onClick={() => openDetailView(item.id)}>
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
        </div>
      )}

      {/* 6번 기능: 타인 공개 프로필 전용 뷰 (팝업 모달에서 화면 뷰로 승격) */}
      {currentView === 'public-profile' && publicProfileUser && (
        <div className="view-section">
          <div style={{background: '#f8fafc', padding: '20px 20px 30px 20px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', position: 'relative'}}>
            <button 
              style={{position: 'absolute', top: '16px', left: '16px', background: 'white', border: '1px solid #cbd5e1', width:'36px', height:'36px', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center', cursor: 'pointer', color: 'var(--text-sub)'}} 
              onClick={() => switchView('feed')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            
            <div style={{margin: '10px auto 12px auto', width: '72px', height: '72px', borderRadius:'50%', overflow:'hidden', background:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize: '28px', color:'var(--primary)', fontWeight:'bold'}}>
              {publicProfileUser.profilePic ? (
                <img src={publicProfileUser.profilePic} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="프로필" />
              ) : (
                (publicProfileUser.name || '작업자').charAt(0)
              )}
            </div>
            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-main)' }}>{publicProfileUser.name}</h2>
            <p style={{fontSize:'12px', color:'var(--text-sub)', marginTop:'4px'}}>{publicProfileUser.affiliation}</p>
            
            <div style={{marginTop:'16px'}}>
                <p style={{fontSize:'14px', color:'var(--text-main)', margin:'0 0 12px 0', fontWeight:'600'}}>
                  {publicProfileUser.intro || '작성된 소개가 없습니다.'}
                </p>
                <div style={{display:'flex', gap:'6px', justifyContent:'center', flexWrap:'wrap'}}>
                    {(publicProfileUser.keywords || []).map(k => (
                      <span key={k} style={{background:'var(--primary-light)', color:'var(--primary-hover)', padding:'4px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'bold'}}>#{k}</span>
                    ))}
                </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'center', gap: '40px', marginTop: '20px'}}>
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <span style={{fontSize: '20px', fontWeight: '800', color: 'var(--primary)'}}>{publicProfileFeeds.length}</span>
                <span style={{fontSize: '13px', color: 'var(--text-sub)'}}>공개된 리포트</span>
              </div>
            </div>
          </div>
          
          <div className="feed-container">
            {publicProfileFeeds.length === 0 ? (
              <div style={{textAlign:'center', padding:'40px 20px', color:'var(--text-sub)'}}>
                <p style={{ margin: 0, fontWeight: 600 }}>아직 공개된 리포트가 없습니다.</p>
              </div>
            ) : (
              publicProfileFeeds.map(item => {
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
        </div>
      )}

      {/* 뷰: 리포트 업로드 (작성 화면) */}
      {currentView === 'upload' && (
        <div className="view-section">
          <div className="upload-container" style={{padding:'24px 20px'}}>
            <div className="view-mode-control">
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
                    {spaces.length > 1 && (
                      <button onClick={() => removeSpace(index)} style={{background:'none', border:'none', color:'#ef4444', fontWeight:'bold', cursor:'pointer'}}>삭제</button>
                    )}
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
                
                <textarea 
                  className="title-input" 
                  style={{fontSize:'14px', height:'80px', resize:'none', marginTop:0}} 
                  placeholder="작업 전후 통합 상세 설명 (어떤 과정을 거쳤나요?)" 
                  value={sp.desc} 
                  onChange={(e) => handleSpaceDescChange(index, 'desc', e.target.value)}
                ></textarea>
              </div>
            ))}
            
            {uploadMode === 'multi' && (
              <button className="sheet-btn" style={{borderStyle:'dashed'}} onClick={addSpace}>+ 공간 추가하기</button>
            )}

            {/* 5번 기능: 비공개로 저장하기 옵션 하단 배치 */}
            <label className="checkbox-label">
              <input type="checkbox" checked={isPrivateUpload} onChange={(e) => setIsPrivateUpload(e.target.checked)} />
              이 리포트를 비공개로 저장합니다 (링크 복사로만 공유 가능)
            </label>

            <button className="submit-btn" onClick={saveAndShareReport} disabled={isUploading}>
              {isUploading ? "클라우드 저장 중..." : "완료 및 공유하기"}
            </button>
          </div>
        </div>
      )}

      {/* 뷰: 디테일(상세 뷰) */}
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
            
            <div className="detail-card">
              <div style={{borderBottom:'1px solid #f1f5f9', paddingBottom:'16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <div className="author-avatar">
                    {detailReport.authorPic ? (
                      <img src={detailReport.authorPic} alt="프로필" />
                    ) : (
                      (detailReport.authorName || '작업자').charAt(0)
                    )}
                  </div>
                  <div>
                    <span style={{fontSize:'14px', fontWeight:'bold', color:'var(--text-main)'}}>{detailReport.authorName || '작업자'}</span>
                    <p style={{fontSize:'12px', color:'var(--text-sub)', margin:0}}>{formatDisplayTime(detailReport)}</p>
                  </div>
                </div>
                {/* 6번 기능 연동: 누르면 public-profile 뷰로 이동 */}
                <button onClick={() => showPublicProfile(detailReport.authorId)} style={{background:'#f1f5f9', color:'var(--text-main)', border:'none', padding:'6px 12px', borderRadius:'16px', fontSize:'12px', fontWeight:'700', cursor:'pointer'}}>프로필 보기</button>
              </div>
              
              <h2 style={{fontSize:'22px', fontWeight:'800', color:'var(--text-main)', margin: '16px 0 16px 0'}}>{detailReport.title}</h2>
              
              <div className="view-mode-control">
                <div className={`view-mode-btn ${detailViewMode==='horizontal'?'active':''}`} onClick={()=>setDetailViewMode('horizontal')}>가로 보기</div>
                <div className={`view-mode-btn ${detailViewMode==='flip'?'active':''}`} onClick={()=>setDetailViewMode('flip')}>한 장 보기</div>
                <div className={`view-mode-btn ${detailViewMode==='vertical'?'active':''}`} onClick={()=>setDetailViewMode('vertical')}>세로 보기</div>
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
                        <span className="badge" style={{background:'#ef4444'}}>Before</span>
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
                        <span className="badge" style={{background:'#ef4444'}}>Before</span>
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
                            <span className="img-label" style={{background:'#ef4444', position:'absolute', top:'10px', left:'10px', zIndex:10, padding:'4px 8px', borderRadius:'4px', color:'white', fontSize:'11px'}}>Before</span>
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
                  {sp.desc && (
                    <div className="unified-desc">
                      <strong>📝 작업 설명: </strong>{sp.desc}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <button className="submit-btn" style={{background:'var(--primary)', marginTop:0}} onClick={() => copyLink(detailReport.id)}>🔗 이 리포트 링크 복사</button>
            <button className="submit-btn" style={{background:'white', color:'var(--text-main)', border:'1px solid #cbd5e1', marginTop:'12px'}} onClick={() => switchView('feed')}>목록으로 돌아가기</button>
            
            <div className="comment-section" style={{marginTop: '24px'}}>
              {/* 7번 기능: 상세 뷰에서 좋아요 버튼과 댓글 카운트 나란히 배치 */}
              <div style={{display:'flex', alignItems:'center', gap:'16px', marginBottom:'16px'}}>
                  <h3 style={{fontSize:'16px', margin:0}}>💬 댓글 {(detailReport.comments || []).length}</h3>
                  <button 
                    onClick={(e) => handleToggleLike(detailReport, e)} 
                    style={{
                      background:'none', border:'1px solid #e2e8f0', borderRadius:'20px', padding:'4px 12px', 
                      display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', fontSize:'14px', 
                      fontWeight:'bold', color: detailReport.likes?.includes(currentUser?.id) ? '#ef4444' : 'var(--text-sub)'
                    }}
                  >
                      {detailReport.likes?.includes(currentUser?.id) ? '❤️' : '🤍'} {(detailReport.likes || []).length}
                  </button>
              </div>

              <div>
                {(detailReport.comments || []).map((c) => (
                  <div key={c.id} style={{display:'flex', gap:'10px', marginBottom:'16px', textAlign:'left'}}>
                    <div style={{width:'32px', height:'32px', background:'var(--primary-light)', color:'var(--primary-hover)', fontWeight:'bold', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden'}}>
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
                <input 
                  type="text" 
                  style={{flex:1, padding:'12px', border:'1px solid #cbd5e1', borderRadius:'20px', fontSize:'14px', outline:'none', background:'#f8fafc'}} 
                  placeholder="칭찬이나 궁금한 점을 남겨보세요" 
                  value={commentInput} 
                  onChange={(e) => setCommentInput(e.target.value)} 
                  onKeyPress={(e) => e.key === 'Enter' && submitComment()}
                />
                <button 
                  style={{background:'var(--primary)', color:'white', border:'none', padding:'0 16px', borderRadius:'20px', fontWeight:'bold', cursor:'pointer'}} 
                  onClick={submitComment}>
                  등록
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 모달 영역들 */}
      
      {/* 프로필 수정 모달 */}
      <div className={`modal-overlay ${isProfileModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{ padding: '24px 20px', width: '100%', overflowY:'auto' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>프로필 편집</h3>
          <div className="profile-pic-edit" style={{width:'80px', height:'80px', borderRadius:'50%', background:'#e2e8f0', margin:'0 auto 20px auto', position:'relative', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', fontWeight:'bold', color:'var(--text-sub)', overflow:'hidden', cursor:'pointer'}} onClick={() => profilePicRef.current.click()}>
            {editProfilePic ? (
              <img src={editProfilePic} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="프로필" /> 
            ) : (
              (editName || '작업자').charAt(0)
            )}
            <div style={{position: 'absolute', bottom: 0, left: 0, width: '100%', height: '30%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px'}}>📷</div>
          </div>
          
          <div className="input-group" style={{ marginBottom: '16px' }}>
            <label className="title-label" style={{ fontSize: '13px' }}>이름 (상호)</label>
            <input type="text" className="title-input" style={{ padding: '12px' }} value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div className="input-group" style={{ marginBottom: '16px' }}>
            <label className="title-label" style={{ fontSize: '13px' }}>간단 자기소개</label>
            <input type="text" className="title-input" style={{ padding: '12px' }} placeholder="고객에게 어필할 한 줄 소개" value={editIntro} onChange={(e) => setEditIntro(e.target.value)} />
          </div>
          <div className="input-group" style={{ marginBottom: '24px' }}>
            <label className="title-label" style={{ fontSize: '13px' }}>전문 분야 키워드 (최대 5개, 쉼표로 구분)</label>
            <input type="text" className="title-input" style={{ padding: '12px' }} placeholder="예: 입주청소, 에어컨, 꼼꼼함" value={editKeywords} onChange={(e) => setEditKeywords(e.target.value)} />
          </div>
          
          <button className="sheet-btn" style={{ background: 'var(--text-main)', color: 'white', border: 'none' }} onClick={saveProfile}>저장하기</button>
          <button className="sheet-btn cancel" onClick={() => setIsProfileModalOpen(false)}>취소</button>
        </div>
      </div>

      {/* 1번 기능: 알림 모달 */}
      <div className={`modal-overlay ${isNotiModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{ width: '90%', maxWidth: '360px', padding: '24px 20px' }}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>새로운 알림</h3>
              <button onClick={markAllNotisAsRead} style={{background:'none', border:'none', color:'var(--primary)', fontSize:'13px', fontWeight:'bold', cursor:'pointer'}}>모두 읽음</button>
          </div>
          <div style={{maxHeight:'300px', overflowY:'auto', textAlign:'left'}}>
              {notifications.length === 0 ? (
                <p style={{textAlign:'center', color:'var(--text-sub)', fontSize:'14px'}}>알림이 없습니다.</p> 
              ) : (
                  notifications.map(n => (
                      <div key={n.id} style={{padding:'12px', background: n.isRead ? 'white' : '#f1f5f9', borderBottom:'1px solid #e2e8f0', borderRadius:'8px', marginBottom:'8px'}}>
                          <p style={{margin:0, fontSize:'14px', color:'var(--text-main)'}}>
                              <strong>{n.fromName}</strong>님이 회원님의 리포트에 {n.type === 'like' ? '하트를 눌렀습니다. ❤️' : '댓글을 남겼습니다. 💬'}
                          </p>
                      </div>
                  ))
              )}
          </div>
          <button className="sheet-btn cancel" onClick={() => setIsNotiModalOpen(false)}>닫기</button>
        </div>
      </div>

      {/* 게시물 옵션 (차단, 신고) 바텀시트 */}
      <div className={`bottom-sheet-overlay ${postOptionsMenu ? 'active' : ''}`} onClick={() => setPostOptionsMenu(null)}></div>
      <div className={`bottom-sheet ${postOptionsMenu ? 'active' : ''}`}>
        <p style={{ margin: '0 0 20px 0', fontWeight: 700, textAlign: 'center' }}>게시물 옵션</p>
        <button className="sheet-btn" onClick={() => { setPostOptionsMenu(null); setIsReportPostModalOpen(true); }}>🚨 이 게시물 신고하기</button>
        <button className="sheet-btn" style={{color:'#ef4444'}} onClick={blockUser}>🚫 이 작업자 차단하기</button>
        <button className="sheet-btn cancel" onClick={() => setPostOptionsMenu(null)}>취소</button>
      </div>

      {/* 게시물 신고 사유 작성 모달 */}
      <div className={`modal-overlay ${isReportPostModalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <h3 style={{ marginTop: 0, marginBottom: '12px' }}>게시물 신고</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '16px' }}>신고 사유를 구체적으로 적어주세요. 관리자 검토 후 조치되며 Firestore DB에 저장됩니다.</p>
          <textarea className="title-input" style={{height:'100px', resize:'none', marginBottom:'16px'}} placeholder="신고 사유 입력..." value={reportReason} onChange={(e) => setReportReason(e.target.value)}></textarea>
          <button className="sheet-btn" style={{ background: '#ef4444', color: 'white', border: 'none' }} onClick={submitReportPost}>신고 접수</button>
          <button className="sheet-btn cancel" onClick={() => { setIsReportPostModalOpen(false); setReportReason(''); }}>취소</button>
        </div>
      </div>

      {/* 개발자 피드백 전송 및 과거 내역 확인(히스토리) 모달 */}
      <div className={`modal-overlay ${isFeedbackModalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <h3 style={{ marginTop: 0, marginBottom: '12px' }}>개발자에게 피드백 전송</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '16px' }}>작성하신 피드백은 데이터베이스(feedbacks)에 안전하게 저장됩니다.</p>
          
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

      <div className={`modal-overlay ${isTermsModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{ padding: '24px 20px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>이용 약관 동의</h3>
          <div style={{ textAlign: 'left', background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: '600', marginBottom: '12px', cursor: 'pointer' }}>
              <input type="checkbox" checked={termsAgreed && privacyAgreed} onChange={(e) => { setTermsAgreed(e.target.checked); setPrivacyAgreed(e.target.checked); }} style={{marginRight:'10px', width:'18px', height:'18px', accentColor:'var(--primary)'}} />
              전체 동의하기
            </label>
            <div style={{ paddingLeft: '28px', fontSize: '13px', color: 'var(--text-sub)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label><input type="checkbox" checked={termsAgreed} onChange={(e) => setTermsAgreed(e.target.checked)} /> (필수) 서비스 이용약관 동의</label>
              <label><input type="checkbox" checked={privacyAgreed} onChange={(e) => setPrivacyAgreed(e.target.checked)} /> (필수) 개인정보 수집 및 이용 동의</label>
            </div>
          </div>
          <button className="sheet-btn" style={{ background: (termsAgreed && privacyAgreed) ? 'var(--primary)' : '#e2e8f0', color: (termsAgreed && privacyAgreed) ? 'white' : '#94a3b8', border: 'none' }} onClick={processLogin}>동의하고 로그인 계속하기</button>
          <button className="sheet-btn cancel" onClick={() => setIsTermsModalOpen(false)}>취소</button>
        </div>
      </div>

      <div className={`modal-overlay ${selectedImage ? 'active' : ''}`} onClick={() => setSelectedImage(null)} style={{zIndex: 1000}}>
        {selectedImage && (
          <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box'}}>
            <img src={selectedImage} alt="확대된 이미지" style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px'}} />
            <button style={{position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer'}}>×</button>
          </div>
        )}
      </div>

      <div className={`modal-overlay ${isFinishModalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>리포트 작성 완료! 🎉</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-sub)', marginBottom: '20px' }}>피드에 등록되었습니다.<br/>고객에게 공유해 보세요!</p>
          <button className="sheet-btn" style={{ background: 'var(--primary)', color: 'white', border: 'none' }} onClick={() => { copyLink(latestReportId); setTimeout(() => { setIsFinishModalOpen(false); setTaskTitle(''); setTaskDate(getToday()); setSpaces([{...defaultSpace}]); setIsPrivateUpload(false); switchView('feed'); }, 1500); }}>🔗 리포트 링크 복사</button>
          <button className="sheet-btn cancel" onClick={() => { setIsFinishModalOpen(false); setTaskTitle(''); setTaskDate(getToday()); setSpaces([{...defaultSpace}]); setIsPrivateUpload(false); switchView('feed'); }}>피드로 가기</button>
        </div>
      </div>

      {/* 시스템 얼럿(window.confirm) 대체 자체 모달 */}
      <div className={`modal-overlay ${confirmDialog.show ? 'active' : ''}`}>
        <div className="modal-content" style={{width:'80%', maxWidth:'320px', padding:'24px 20px'}}>
            <h3 style={{marginTop:0, marginBottom:'16px', fontSize:'16px', color:'var(--text-main)', lineHeight:'1.5'}}>{confirmDialog.msg}</h3>
            <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                <button className="sheet-btn cancel" style={{flex:1, margin:0, background:'#f1f5f9', color:'var(--text-main)'}} onClick={() => setConfirmDialog({show:false, msg:'', onConfirm:null})}>취소</button>
                <button className="sheet-btn" style={{flex:1, margin:0, background:'#ef4444', color:'white', border:'none'}} onClick={confirmDialog.onConfirm}>확인</button>
            </div>
        </div>
      </div>

      <div className={`toast ${toastMsg.show ? 'show' : ''}`}>{toastMsg.msg}</div>
    </div>
  );
}