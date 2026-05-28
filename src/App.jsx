import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, doc, getDoc, query, onSnapshot, serverTimestamp, updateDoc, deleteDoc } from "firebase/firestore";
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

// Firestore 보안 규칙에 맞춘 고정 경로
const APP_ID = 'beforeter-app';

export default function App() {
  const [currentView, setCurrentView] = useState('feed'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); 
  const [feedData, setFeedData] = useState([]); 
  
  const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState(false);
  const [currentPhotoTarget, setCurrentPhotoTarget] = useState(null); // { index, type }
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false); 
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); 
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false); 
  
  const getToday = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };
  
  const [taskDate, setTaskDate] = useState(getToday());
  const [taskTitle, setTaskTitle] = useState('');
  const [uploadMode, setUploadMode] = useState('single'); 
  
  // 다중 업로드를 위한 spaces 배열 상태 (단건도 1개의 space로 처리)
  const defaultSpace = { id: 1, spaceName: '', beforeImg: '', afterImg: '', beforeDesc: '', afterDesc: '' };
  const [spaces, setSpaces] = useState([{...defaultSpace}]);
  
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('기능 관련');
  const [toastMsg, setToastMsg] = useState({ show: false, msg: '' });

  const [shareLocation, setShareLocation] = useState(true);
  const [currentLocation, setCurrentLocation] = useState('위치 파악 중...');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAffiliation, setEditAffiliation] = useState('');
  const [editProfilePic, setEditProfilePic] = useState('');

  const [latestReportId, setLatestReportId] = useState('');
  const [detailReport, setDetailReport] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  
  const [editDocTitle, setEditDocTitle] = useState('');
  const [editDocStatus, setEditDocStatus] = useState('public');

  const [commentInput, setCommentInput] = useState('');
  const [detailViewMode, setDetailViewMode] = useState('horizontal'); // horizontal 디폴트로 변경
  const [flippedCards, setFlippedCards] = useState({}); // Flip 모드용 카드 상태
  const [selectedImage, setSelectedImage] = useState(null); // 사진 확대용 상태

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const profilePicRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const savedProfiles = JSON.parse(localStorage.getItem('beporter_profiles')) || {};
        const userProfile = savedProfiles[user.uid] || {};
        setCurrentUser({ 
          id: user.uid, name: userProfile.name || user.displayName || '작업자', 
          affiliation: userProfile.affiliation || '', profilePic: userProfile.profilePic || user.photoURL || '', 
          email: user.email || '', provider: 'Google' 
        });
      } else { setCurrentUser(null); }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'reports'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reports = [];
      snapshot.forEach((doc) => reports.push({ id: doc.id, ...doc.data() }));
      reports.sort((a, b) => {
        const timeA = a.createdAt ? (typeof a.createdAt.toMillis === 'function' ? a.createdAt.toMillis() : 0) : 0;
        const timeB = b.createdAt ? (typeof b.createdAt.toMillis === 'function' ? b.createdAt.toMillis() : 0) : 0;
        return timeB - timeA;
      });
      setFeedData(reports);
      
      // 현재 열려있는 디테일 뷰 동기화 (댓글, 수정사항 실시간 반영)
      if (detailReport) {
        const updated = reports.find(r => r.id === detailReport.id);
        if (updated) setDetailReport(updated);
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
              const dong = address.suburb || address.town || address.village || address.city_district || address.borough || "수원시 권선구";
              const city = address.city || address.province || "경기도";
              setCurrentLocation(`${city} ${dong}`.trim());
            } catch (e) { setCurrentLocation('경기도 수원시 권선구'); }
          },
          (err) => setCurrentLocation('위치 권한 거부됨 (브라우저 설정을 확인하세요)')
        );
      } else { setCurrentLocation('위치 기능을 지원하지 않는 기기입니다.'); }
    }
  }, [currentView, shareLocation]);

  useEffect(() => {
    const checkSharedLink = async () => {
      const path = window.location.pathname;
      if (path.includes('/report/')) {
        const parts = path.split('/report/');
        const reportId = parts[parts.length - 1];
        if (reportId) openDetailView(reportId);
      }
    };
    checkSharedLink();
  }, []);

  const openDetailView = async (reportId) => {
    setCurrentView('detail'); 
    setIsDetailLoading(true); 
    setDetailViewMode('horizontal'); // horizontal 디폴트로 변경
    setFlippedCards({});
    try {
      const docSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', reportId));
      if (docSnap.exists()) {
        setDetailReport({ id: docSnap.id, ...docSnap.data() });
        window.history.pushState({}, '', '/report/' + reportId);
      } else { 
        showToast("존재하지 않는 리포트입니다."); 
        setCurrentView('feed'); 
      }
    } catch (err) { 
      showToast("오류가 발생했습니다."); 
      setCurrentView('feed'); 
    } finally { 
      setIsDetailLoading(false); 
    }
  };

  const showToast = (msg) => { setToastMsg({ show: true, msg }); setTimeout(() => setToastMsg({ show: false, msg: '' }), 3000); };
  
  const switchView = (view) => { 
    if (view === 'feed' && window.location.pathname.includes('/report/')) window.history.pushState({}, '', '/'); 
    setCurrentView(view); window.scrollTo(0, 0); 
  };
  
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const checkAuthAndAction = (cb) => { if (!currentUser) { showToast("로그인이 필요합니다."); switchView('login'); } else cb(); };
  const handleLoginClick = () => { setTermsAgreed(false); setPrivacyAgreed(false); setIsTermsModalOpen(true); };
  const handleAgreeAll = (e) => { setTermsAgreed(e.target.checked); setPrivacyAgreed(e.target.checked); };
  
  const processLogin = async () => {
    if (!termsAgreed || !privacyAgreed) return showToast("약관에 동의해주세요.");
    try { setIsTermsModalOpen(false); await signInWithPopup(auth, provider); showToast(`로그인 되었습니다.`); switchView('feed'); } 
    catch (error) { showToast("로그인 실패"); }
  };

  const processLogout = async () => {
    try { await signOut(auth); showToast('로그아웃 되었습니다.'); setIsMenuOpen(false); switchView('feed'); } 
    catch (error) { showToast("로그아웃 실패"); }
  };

  const openProfileEdit = () => { setEditName(currentUser.name); setEditAffiliation(currentUser.affiliation); setEditProfilePic(currentUser.profilePic); setIsProfileModalOpen(true); };

  // 이미지 압축 (워터마크 삭제됨)
  const resizeAndCompressImage = (file, callback, maxWidth = 800) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image(); img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width; let height = img.height;
        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d'); 
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
    reader.readAsDataURL(file);
  };

  const handleProfilePicSelect = (e) => { if (e.target.files[0]) resizeAndCompressImage(e.target.files[0], setEditProfilePic, 200); e.target.value = ''; };

  const saveProfile = () => {
    if (!editName.trim()) return showToast("이름을 입력해주세요.");
    const updatedUser = { ...currentUser, name: editName, affiliation: editAffiliation, profilePic: editProfilePic };
    const savedProfiles = JSON.parse(localStorage.getItem('beporter_profiles')) || {};
    savedProfiles[currentUser.id] = { name: editName, affiliation: editAffiliation, profilePic: editProfilePic };
    localStorage.setItem('beporter_profiles', JSON.stringify(savedProfiles));
    setCurrentUser(updatedUser); setIsProfileModalOpen(false); showToast("저장되었습니다.");
  };

  const openPhotoSheet = (index, type) => { setCurrentPhotoTarget({ index, type }); setIsPhotoSheetOpen(true); };
  const triggerPhotoInput = (type) => { setIsPhotoSheetOpen(false); if (type === 'camera') cameraInputRef.current.click(); else galleryInputRef.current.click(); };
  
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
    e.target.value = ''; // 모바일 환경 씹힘 방지 초기화
  };

  const handleSpaceDescChange = (index, type, value) => {
    const newSpaces = [...spaces];
    if(type === 'before') newSpaces[index].beforeDesc = value;
    if(type === 'after') newSpaces[index].afterDesc = value;
    if(type === 'name') newSpaces[index].spaceName = value;
    setSpaces(newSpaces);
  };

  const addSpace = () => {
    setSpaces([...spaces, { id: Date.now(), spaceName: '', beforeImg: '', afterImg: '', beforeDesc: '', afterDesc: '' }]);
  };
  const removeSpace = (index) => {
    const newSpaces = [...spaces];
    newSpaces.splice(index, 1);
    setSpaces(newSpaces);
  };

  const saveAndShareReport = async () => {
    if (!taskTitle || !taskDate) return showToast("작업 일자와 제목을 입력해주세요!");
    
    // 유효성 검사
    const hasEmptyPhoto = spaces.some(sp => !sp.beforeImg || !sp.afterImg);
    if (hasEmptyPhoto) return showToast("모든 공간의 Before/After 사진을 첨부해주세요!");

    setIsUploading(true); showToast("클라우드에 안전하게 저장 중...");
    try {
      const timeStamp = Date.now();
      
      // 모든 공간의 이미지 업로드 처리 병렬 실행
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
        authorId: currentUser.id, authorName: currentUser.name || '작업자', authorAffiliation: currentUser.affiliation || '',
        authorPic: currentUser.profilePic || '', title: taskTitle, taskDate: taskDate,
        spaces: uploadedSpaces, // 다중 공간 구조체 저장
        status: 'public', history: [], comments: [],
        location: shareLocation ? currentLocation : '', createdAt: serverTimestamp()
      });
      setLatestReportId(docRef.id); setIsFinishModalOpen(true);
    } catch (error) {
      showToast("업로드 오류가 발생했습니다.");
    } finally { setIsUploading(false); }
  };

  const closeFinishModal = () => { 
    setIsFinishModalOpen(false); setTaskTitle(''); setTaskDate(getToday()); 
    setSpaces([{...defaultSpace}]); setUploadMode('single');
    switchView('feed'); 
  };
  
  // copyAndFinish 함수 추가
  const copyAndFinish = () => {
    const textarea = document.createElement('textarea'); 
    textarea.value = `https://www.beforeter.com/report/${latestReportId}`;
    document.body.appendChild(textarea); 
    textarea.select();
    try { 
        document.execCommand('copy'); 
        showToast("주소가 복사되었습니다!"); 
        setTimeout(closeFinishModal, 1500); 
    } 
    catch (err) { showToast("복사 실패"); } 
    finally { document.body.removeChild(textarea); }
  };

  const copyLink = (id) => {
    const textarea = document.createElement('textarea'); textarea.value = `https://www.beforeter.com/report/${id}`;
    document.body.appendChild(textarea); textarea.select();
    try { document.execCommand('copy'); showToast("주소가 복사되었습니다!"); } 
    catch (err) { showToast("복사 실패"); } finally { document.body.removeChild(textarea); }
  };

  const openReportEdit = () => {
    setEditDocTitle(detailReport.title); setEditDocStatus(detailReport.status || 'public');
    setIsEditModalOpen(true);
  };

  const submitReportEdit = async () => {
    setIsEditModalOpen(false); showToast("저장 중...");
    try {
      const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', detailReport.id);
      const newHistoryLog = { 
        date: new Date().toLocaleDateString('ko-KR') + ' ' + new Date().toLocaleTimeString('ko-KR', {hour12:false, hour:'2-digit', minute:'2-digit'}), 
        action: '제목 또는 상태 변경' 
      };
      await updateDoc(docRef, {
        title: editDocTitle, status: editDocStatus,
        history: [...(detailReport.history || []), newHistoryLog]
      });
      showToast("수정되었습니다.");
    } catch (e) { showToast("수정에 실패했습니다."); }
  };

  const deleteReport = async () => {
    if(!window.confirm("정말 이 리포트를 삭제하시겠습니까? 복구할 수 없습니다.")) return;
    setIsEditModalOpen(false);
    try {
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', detailReport.id));
      showToast("삭제되었습니다."); switchView('feed');
    } catch(e) { showToast("삭제 실패"); }
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
        // 로컬 상태 즉시 갱신
        setDetailReport(prev => ({ ...prev, comments: updatedComments }));
        setCommentInput('');
        showToast("댓글이 등록되었습니다.");
    } catch(e) { showToast("댓글 등록에 실패했습니다."); }
  };

  const submitFeedback = () => { 
    if (!feedbackText.trim()) return showToast("내용을 입력해주세요."); 
    showToast("소중한 의견 감사합니다! 답변은 이메일로 보내드릴게요. ❤️"); 
    setIsFeedbackModalOpen(false); 
    setFeedbackText(''); 
    setFeedbackCategory('기능 관련');
  };

  const formatDisplayTime = (item) => {
    let displayStr = item.taskDate ? item.taskDate.replace(/-/g, '/') : "날짜 미상";
    if (item.location) displayStr += ` • ${item.location}`;
    return displayStr;
  };

  const toggleFlip = (idx) => {
    setFlippedCards(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const myFeeds = currentUser ? feedData.filter(f => f.authorId === currentUser.id) : [];

  const getUserTier = (count) => {
    if (count >= 500) return { name: '🌈 무지개 장갑', color: 'linear-gradient(90deg, #ef4444, #eab308, #22c55e, #3b82f6)', text: 'white' };
    if (count >= 400) return { name: '🔴 빨간 장갑', color: '#ef4444', text: 'white' };
    if (count >= 300) return { name: '🔵 파란 장갑', color: '#3b82f6', text: 'white' };
    if (count >= 200) return { name: '🟢 초록 장갑', color: '#22c55e', text: 'white' };
    if (count >= 100) return { name: '🟡 노란 장갑', color: '#eab308', text: 'white' };
    return { name: '⚪ 흰 장갑', color: '#94a3b8', text: 'white' };
  };
  const userTier = getUserTier(myFeeds.length);

  const renderAuthorBadge = (authorId, authorName) => {
    const count = feedData.filter(f => f.authorId === authorId).length;
    const tier = getUserTier(count);
    return (
      <span className="author-name">
        {authorName || '작업자'}
        <span style={{background: tier.color, color: tier.text, fontSize: '10px', padding: '2px 6px', borderRadius: '10px', marginLeft: '6px', fontWeight: 'bold', letterSpacing: '-0.5px'}}>
          {tier.name}
        </span>
      </span>
    );
  };

  const getSpacesToRender = (report) => {
    if (report.spaces && report.spaces.length > 0) return report.spaces;
    return [{ id: 1, spaceName: '', beforeImg: report.beforeImg, afterImg: report.afterImg, beforeDesc: report.beforeDesc, afterDesc: report.afterDesc }];
  };

  return (
    <div className="app-wrapper">
      <style>{`
        body { font-family: 'Pretendard', sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; color: #334155; -webkit-tap-highlight-color: transparent; overflow-x: hidden; }
        :root { --primary: #14b8a6; --primary-hover: #0d9488; --primary-light: #ccfbf1; --card-bg: #ffffff; --text-main: #1e293b; --text-sub: #64748b; }
        .app-wrapper { max-width: 480px; margin: 0 auto; min-height: 100vh; background-color: #ffffff; box-shadow: 0 0 20px rgba(0,0,0,0.05); position: relative; }
        .app-header { position: sticky; top: 0; left: 0; width: 100%; height: 56px; background-color: var(--card-bg); display: flex; align-items: center; justify-content: space-between; padding: 0 16px; z-index: 50; border-bottom: 1px solid #e2e8f0; }
        .header-icon { background: none; border: none; color: var(--text-main); font-size: 24px; cursor: pointer; padding: 8px; display: flex; align-items: center; justify-content: center; }
        .header-title { font-size: 18px; font-weight: 800; color: var(--primary); letter-spacing: -0.5px; cursor:pointer; }
        .view-section { padding-bottom: 90px; min-height: calc(100vh - 56px); box-sizing: border-box; background: #ffffff;}
        .brand-hook-card { background: linear-gradient(135deg, #0d9488, #14b8a6); color: white; padding: 20px; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 10px 15px -3px rgba(20,184,166,0.2); text-align: left; }
        .brand-hook-card h3 { margin: 0 0 6px 0; font-size: 18px; font-weight: 800; }
        .brand-hook-card p { margin: 0; font-size: 13px; opacity: 0.9; line-height: 1.4; }
        .sidebar-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 100; opacity: 0; visibility: hidden; transition: all 0.3s; }
        .sidebar-overlay.active { opacity: 1; visibility: visible; }
        .sidebar { position: fixed; top: 0; left: -280px; width: 280px; height: 100%; background: white; z-index: 101; transition: all 0.3s; display: flex; flex-direction: column; box-shadow: 2px 0 12px rgba(0,0,0,0.1); }
        .sidebar.active { left: 0; }
        .sidebar-header { padding: 30px 20px; background-color: var(--primary-light); border-bottom: 1px solid #bae6fd; display: flex; align-items: center; gap: 12px; }
        .sidebar-profile-img { width: 48px; height: 48px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; color: var(--primary); overflow: hidden; }
        .sidebar-profile-img img { width: 100%; height: 100%; object-fit: cover; }
        .sidebar-user-info h2 { margin: 0; color: var(--primary-hover); font-size: 18px; font-weight: 800; }
        .sidebar-user-info p { margin: 4px 0 0 0; font-size: 13px; color: var(--text-sub); }
        .sidebar-menu { list-style: none; padding: 0; margin: 0; flex: 1; }
        .sidebar-menu li { border-bottom: 1px solid #f1f5f9; }
        .sidebar-menu button { width: 100%; text-align: left; background: none; border: none; display: flex; align-items: center; padding: 18px 20px; color: var(--text-main); font-size: 16px; font-weight: 600; gap: 12px; cursor: pointer; }
        .feed-container { padding: 16px; }
        .empty-state { text-align: center; padding: 40px 20px; color: var(--text-sub); display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .empty-state svg { color: #cbd5e1; width: 48px; height: 48px; }
        .feed-card { background: var(--card-bg); border-radius: 16px; padding: 16px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; cursor: pointer; transition: transform 0.2s;}
        .feed-card:active { transform: scale(0.98); }
        .detail-card { background: var(--card-bg); border-radius: 16px; padding: 20px; margin-bottom: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid var(--primary-light); }
        .feed-author { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .author-avatar { width: 36px; height: 36px; background-color: var(--primary-light); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--primary-hover); font-weight: bold; font-size: 14px; overflow: hidden; }
        .author-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .author-name { font-size: 14px; font-weight: 700; margin: 0 0 2px 0; color: var(--text-main); display: flex; align-items: center;}
        .author-time { font-size: 12px; color: var(--text-sub); margin: 0; }
        .feed-title { font-size: 16px; font-weight: 700; margin-bottom: 12px; line-height: 1.4; }
        .feed-images { display: flex; gap: 8px; height: 160px; }
        .feed-img-wrap { flex: 1; position: relative; border-radius: 8px; overflow: hidden; background-color: #e2e8f0; }
        .feed-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .badge { position: absolute; top: 8px; left: 8px; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 800; color: white; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); }
        .login-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: calc(100vh - 56px); padding: 20px; text-align: center; }
        .login-logo { width: 80px; height: 80px; background: var(--primary); border-radius: 20px; display: flex; align-items: center; justify-content: center; color: white; font-size: 40px; font-weight: bold; margin-bottom: 24px; }
        .login-container h1 { font-size: 24px; color: var(--text-main); margin-bottom: 8px; }
        .login-container p { color: var(--text-sub); margin-bottom: 40px; }
        .social-btn { width: 100%; max-width: 320px; padding: 16px; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; gap: 12px; background: white; margin-bottom: 12px; }
        .terms-box { text-align: left; background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 24px; }
        .terms-label { display: flex; align-items: center; font-size: 14px; font-weight: 600; margin-bottom: 12px; cursor: pointer; }
        .terms-label input { margin-right: 10px; width: 18px; height: 18px; accent-color: var(--primary); }
        .terms-sub { padding-left: 28px; font-size: 13px; color: var(--text-sub); display: flex; flex-direction: column; gap: 10px; }
        .upload-container { padding: 24px 20px; background: white; }
        .input-group { margin-bottom: 24px; text-align: left; }
        .title-label { display: block; font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 10px; }
        .title-input { width: 100%; padding: 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 15px; box-sizing: border-box; background-color: #f8fafc; font-family: inherit; margin-top:8px;}
        .photo-upload { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 160px; background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; cursor: pointer; color: #64748b; font-size: 14px; font-weight: 600; overflow: hidden; }
        .photo-upload img.preview { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 10; }
        .photo-upload .change-text { position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 6px 10px; border-radius: 6px; font-size: 12px; z-index: 11; }
        .submit-btn { width: 100%; padding: 18px; background-color: var(--text-main); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; margin-top: 10px; cursor: pointer; }
        .submit-btn:disabled { background-color: #cbd5e1; cursor: not-allowed; }
        .mypage-header { background: #f8fafc; padding: 30px 20px; text-align: center; border-bottom: 1px solid #e2e8f0; position: relative; }
        .profile-edit-btn { position: absolute; top: 16px; right: 16px; background: white; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; cursor: pointer; color: var(--text-sub); }
        .tier-badge { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 800; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .tier-info-btn { background: rgba(0,0,0,0.1); color: inherit; width: 16px; height: 16px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; cursor: pointer; border: none; }
        .mypage-stats { display: flex; justify-content: center; gap: 40px; margin-top: 16px; }
        .stat-item { display: flex; flex-direction: column; align-items: center; }
        .stat-num { font-size: 20px; font-weight: 800; color: var(--primary); }
        .stat-label { font-size: 13px; color: var(--text-sub); }
        .profile-pic-edit { width: 80px; height: 80px; border-radius: 50%; background: #e2e8f0; margin: 0 auto 20px auto; position: relative; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: var(--text-sub); overflow: hidden; cursor: pointer; }
        .profile-pic-edit img { width: 100%; height: 100%; object-fit: cover; }
        .profile-pic-overlay { position: absolute; bottom: 0; left: 0; width: 100%; height: 30%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; }
        .fab-container { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; display: flex; justify-content: center; z-index: 40; pointer-events: none; }
        .fab-btn { pointer-events: auto; background-color: var(--primary); color: white; border: none; padding: 16px 28px; border-radius: 30px; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; box-shadow: 0 8px 20px rgba(20, 184, 166, 0.4); cursor: pointer; }
        .bottom-sheet-overlay, .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 200; opacity: 0; visibility: hidden; transition: all 0.3s; }
        .bottom-sheet-overlay.active, .modal-overlay.active { opacity: 1; visibility: visible; }
        .bottom-sheet { position: fixed; bottom: -100%; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; background: white; border-radius: 20px 20px 0 0; z-index: 201; padding: 24px 20px; box-sizing: border-box; transition: bottom 0.3s; }
        .bottom-sheet.active { bottom: 0; }
        .sheet-btn { width: 100%; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 16px; font-weight: 600; margin-bottom: 12px; cursor: pointer; }
        .sheet-btn.cancel { background: white; border: none; color: #ef4444; margin-top: 8px; }
        .modal-content { background: white; width: 90%; max-width: 360px; border-radius: 20px; padding: 28px 24px; box-sizing: border-box; text-align: center; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
        .feedback-textarea { width: 100%; height: 100px; padding: 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-family: inherit; font-size: 14px; resize: none; margin-bottom: 16px; box-sizing: border-box; }
        .toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(100px); background-color: #334155; color: white; padding: 12px 24px; border-radius: 30px; font-size: 14px; font-weight: 600; z-index: 1000; opacity: 0; transition: all 0.3s; white-space: nowrap; pointer-events: none; }
        .toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
        
        /* 뷰 모드 및 세그먼트 컨트롤 */
        .view-mode-control { display:flex; background:#f1f5f9; padding:4px; border-radius:12px; margin-bottom:20px; }
        .view-mode-btn { flex:1; padding:10px; text-align:center; font-size:13px; font-weight:700; border-radius:8px; cursor:pointer; color:var(--text-sub); transition: 0.2s; }
        .view-mode-btn.active { background:white; color:var(--primary); box-shadow:0 2px 4px rgba(0,0,0,0.05); }
        .segment-control { display:flex; background:#f1f5f9; padding:4px; border-radius:12px; margin-bottom:24px; }
        .segment-btn { flex:1; padding:10px; text-align:center; font-size:14px; font-weight:700; border-radius:8px; cursor:pointer; color:var(--text-sub); }
        .segment-btn.active { background:white; color:var(--primary); box-shadow:0 2px 4px rgba(0,0,0,0.05); }
        
        /* 공간 블록 (다중 정돈) */
        .space-block { background: #f8fafc; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px; }
        .history-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; margin-top: 16px; font-size: 12px; color: var(--text-sub); text-align: left; }
        
        /* 플립 카드 애니메이션 */
        .flip-card { perspective: 1000px; width: 100%; height: 260px; cursor: pointer; border-radius: 8px; }
        .flip-card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s; transform-style: preserve-3d; }
        .flip-card.flipped .flip-card-inner { transform: rotateY(180deg); }
        .flip-card-front, .flip-card-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 8px; overflow: hidden; background-color: #e2e8f0; }
        .flip-card-back { transform: rotateY(180deg); }
        .img-label { position: absolute; top: 10px; left: 10px; z-index: 10; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; color: white; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); }

        /* 댓글 영역 */
        .comment-section { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 24px; }
        .comment-item { display: flex; gap: 10px; margin-bottom: 16px; text-align: left; }
        .comment-avatar { width: 32px; height: 32px; background: var(--primary-light); color: var(--primary-hover); font-weight: bold; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .comment-input-wrap { display: flex; gap: 10px; margin-top: 20px; }
        .comment-input { flex: 1; padding: 12px; border: 1px solid #cbd5e1; border-radius: 20px; font-size: 14px; outline: none; background: #f8fafc;}
        .comment-submit { background: var(--primary); color: white; border: none; padding: 0 16px; border-radius: 20px; font-weight: bold; cursor: pointer; }
      `}</style>
      
      {/* 사진 씹힘 에러 방지를 위해 숨김처리만 확실하게 한 input들 */}
      <div style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
        <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileSelect} />
        <input type="file" accept="image/*" ref={galleryInputRef} onChange={handleFileSelect} />
        <input type="file" accept="image/*" ref={profilePicRef} onChange={handleProfilePicSelect} />
      </div>

      <header className="app-header">
        <button className="header-icon" onClick={toggleMenu}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg></button>
        <div className="header-title" onClick={() => switchView('feed')}>비포터</div><div className="header-placeholder"></div>
      </header>

      <div className={`sidebar-overlay ${isMenuOpen ? 'active' : ''}`} onClick={toggleMenu}></div>
      <div className={`sidebar ${isMenuOpen ? 'active' : ''}`}>
        <div className="sidebar-header">
          {currentUser ? (
            <><div className="sidebar-profile-img">{currentUser.profilePic ? <img src={currentUser.profilePic} alt="프로필" /> : (currentUser.name || '작업자').charAt(0)}</div>
              <div className="sidebar-user-info"><h2>{currentUser.name}</h2><p>{currentUser.affiliation ? currentUser.affiliation : `${currentUser.provider} 로그인`}</p></div>
            </>
          ) : (
            <><div className="sidebar-profile-img" style={{ color: '#cbd5e1' }}>?</div>
              <div className="sidebar-user-info"><h2 style={{ color: '#94a3b8' }}>비포터</h2><p>로그인 후 이용해보세요</p></div>
            </>
          )}
        </div>
        <ul className="sidebar-menu">
          <li><button onClick={() => { setIsMenuOpen(false); switchView('feed'); }}>🏠 피드 홈</button></li>
          {currentUser ? (
            <><li><button onClick={() => { setIsMenuOpen(false); switchView('mypage'); }}>👤 마이페이지 (내 리포트)</button></li>
              <li><button onClick={() => { setIsMenuOpen(false); setIsFeedbackModalOpen(true); }}>💡 개발자에게 피드백 전송</button></li>
              <li><button onClick={processLogout} style={{ color: '#ef4444' }}>🚪 로그아웃</button></li></>
          ) : (
            <><li><button onClick={() => { setIsMenuOpen(false); switchView('login'); }}>🔐 로그인 / 회원가입</button></li>
              <li><button onClick={() => { setIsMenuOpen(false); checkAuthAndAction(() => setIsFeedbackModalOpen(true)); }}>💡 개발자에게 피드백 전송</button></li></>
          )}
        </ul>
      </div>

      {currentView === 'feed' && (
        <div className="view-section">
          <div className="feed-container">
            <div className="brand-hook-card"><h3>10초 완성 나만의 작업리포트 🚀</h3><p>사진 2장으로 나를 증명하다 비포터</p></div>
            {feedData.filter(f => f.status === 'public').length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <p style={{ margin: 0, fontWeight: 600 }}>아직 등록된 리포트가 없습니다.<br />아래 버튼을 눌러 첫 리포트를 올려보세요!</p>
              </div>
            ) : (
              feedData.filter(f => f.status === 'public').map((item) => {
                const renderSpaces = getSpacesToRender(item);
                return (
                  <div key={item.id} className="feed-card" onClick={() => openDetailView(item.id)}>
                    <div className="feed-author">
                      <div className="author-avatar">{item.authorPic ? <img src={item.authorPic} alt="프로필" /> : (item.authorName || '작업자').charAt(0)}</div>
                      <div className="author-info">
                        {renderAuthorBadge(item.authorId, item.authorName)}
                        <p className="author-time">{formatDisplayTime(item)}</p>
                      </div>
                    </div>
                    <div className="feed-title">{item.status === 'private' ? '🔒 비공개 리포트' : item.title}</div>
                    <div className="feed-images">
                      <div className="feed-img-wrap"><span className="badge" style={{ background: '#ef4444' }}>Before</span><img src={renderSpaces[0].beforeImg} alt="Before" /></div>
                      <div className="feed-img-wrap"><span className="badge" style={{ background: 'var(--primary)' }}>After</span><img src={renderSpaces[0].afterImg} alt="After" /></div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          <div className="fab-container"><button className="fab-btn" onClick={() => checkAuthAndAction(() => switchView('upload'))}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>내 리포트 올리기</button></div>
        </div>
      )}

      {currentView === 'login' && (
        <div className="view-section" style={{ display:'flex' }}>
          <div className="login-container" style={{ width:'100%' }}>
            <div className="login-logo">B</div><h1>비포터 시작하기</h1><p>1분만에 가입하고 신뢰를 공유하세요</p>
            <button className="social-btn" onClick={handleLoginClick}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12c0-.82-.07-1.61-.2-2.38H12v4.5h5.68a5.4 5.4 0 0 1-2.34 3.55v2.95h3.79C21.34 18.57 22 15.55 22 12z"/></svg>Google 계정으로 시작하기</button>
          </div>
        </div>
      )}

      {currentView === 'mypage' && currentUser && (
        <div className="view-section">
          <div className="mypage-header">
            <button className="profile-edit-btn" onClick={openProfileEdit}>✏️ 프로필 수정</button>
            <div className="sidebar-profile-img" style={{ margin: '0 auto 12px auto', width: '72px', height: '72px', fontSize: '28px' }}>
              {currentUser.profilePic ? <img src={currentUser.profilePic} alt="프로필" /> : (currentUser.name || '작업자').charAt(0)}
            </div>
            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-main)' }}>{currentUser.name}</h2>
            <div className="tier-badge" style={{ background: userTier.color, color: userTier.text }}>
              {userTier.name} 
              <button className="tier-info-btn" onClick={() => setIsTierModalOpen(true)}>?</button>
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: 'var(--text-sub)' }}>{currentUser.affiliation ? currentUser.affiliation : '소속을 등록해주세요'}</p>
            <div className="mypage-stats">
              <div className="stat-item"><span className="stat-num">{myFeeds.length}</span><span className="stat-label">작성한 리포트</span></div>
            </div>
          </div>
          <div className="feed-container">
            {myFeeds.length === 0 ? (
              <div className="empty-state" style={{ paddingTop: '40px' }}><p style={{ margin: 0, fontWeight: 600 }}>작성한 리포트가 없습니다.</p><button className="sheet-btn" style={{ background: 'var(--primary)', color: 'white', border: 'none', maxWidth: '200px', marginTop: '10px' }} onClick={() => switchView('upload')}>✍️ 새 리포트 작성하기</button></div>
            ) : (
              myFeeds.map(item => {
                const renderSpaces = getSpacesToRender(item);
                return (
                  <div key={item.id} className="feed-card" onClick={() => openDetailView(item.id)}>
                    <div className="feed-title" style={{marginBottom: '10px'}}>{item.status === 'private' ? '🔒 ' : ''}{item.title}</div>
                    
                    {/* 개선된 마이페이지 리포트 정보 (날짜, 사진 수, 댓글 수) */}
                    <div style={{display:'flex', gap:'12px', fontSize:'12px', color:'var(--text-sub)', marginBottom:'12px', fontWeight:'600'}}>
                      <span>📅 {item.taskDate ? item.taskDate.replace(/-/g, '.') : '날짜 미상'}</span>
                      <span>📸 사진 {renderSpaces.length * 2}장</span>
                      <span>💬 댓글 {(item.comments || []).length}개</span>
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

      {currentView === 'upload' && (
        <div className="view-section">
          <div className="upload-container">
            <div className="segment-control">
              <div className={`segment-btn ${uploadMode==='single'?'active':''}`} onClick={() => { setUploadMode('single'); setSpaces([spaces[0] || defaultSpace]); }}>단건 등록</div>
              <div className={`segment-btn ${uploadMode==='multi'?'active':''}`} onClick={() => setUploadMode('multi')}>여러 건 등록</div>
            </div>
            
            <div className="input-group"><label className="title-label">작업 일자</label><input type="date" className="title-input" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} /></div>
            <div className="input-group"><label className="title-label">전체 작업 제목</label><input type="text" className="title-input" placeholder="어떤 작업을 하셨나요?" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} /></div>
            
            {spaces.map((sp, index) => (
              <div key={sp.id} className={uploadMode === 'multi' ? 'space-block' : ''}>
                {uploadMode === 'multi' && (
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
                    <input type="text" className="title-input" style={{padding:'10px', fontSize:'14px', width:'70%', marginTop:0}} placeholder="구역 이름 (예: 거실)" value={sp.spaceName} onChange={(e) => handleSpaceDescChange(index, 'name', e.target.value)} />
                    {spaces.length > 1 && <button onClick={() => removeSpace(index)} style={{background:'none', border:'none', color:'#ef4444', fontWeight:'bold', cursor:'pointer'}}>삭제</button>}
                  </div>
                )}
                <div className="input-group" style={{marginBottom: uploadMode === 'multi' ? '16px' : '24px'}}>
                  <label className="title-label" style={{fontSize: uploadMode === 'multi' ? '13px' : '15px'}}>작업 전 (Before)</label>
                  <div className="photo-upload" onClick={() => openPhotoSheet(index, 'before')}>
                    {!sp.beforeImg && <span>📸 + 사진 추가</span>}{sp.beforeImg && <><img className="preview" src={sp.beforeImg} alt="작업 전" /><div className="change-text">다시 선택</div></>}
                  </div>
                  <input type="text" className="title-input" style={{fontSize:'14px'}} placeholder="작업 전 상태 설명 (선택)" value={sp.beforeDesc} onChange={(e) => handleSpaceDescChange(index, 'before', e.target.value)} />
                </div>
                <div className="input-group" style={{marginBottom: uploadMode === 'multi' ? '0' : '24px'}}>
                  <label className="title-label" style={{fontSize: uploadMode === 'multi' ? '13px' : '15px'}}>작업 후 (After)</label>
                  <div className="photo-upload" onClick={() => openPhotoSheet(index, 'after')}>
                    {!sp.afterImg && <span>✨ + 사진 추가</span>}{sp.afterImg && <><img className="preview" src={sp.afterImg} alt="작업 후" /><div className="change-text">다시 선택</div></>}
                  </div>
                  <input type="text" className="title-input" style={{fontSize:'14px'}} placeholder="작업 후 상태 설명 (선택)" value={sp.afterDesc} onChange={(e) => handleSpaceDescChange(index, 'after', e.target.value)} />
                </div>
              </div>
            ))}
            
            {uploadMode === 'multi' && (
              <button className="sheet-btn" style={{borderStyle:'dashed'}} onClick={addSpace}>+ 공간 추가하기</button>
            )}

            <div className="input-group" style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop:'24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="title-label" style={{ margin: 0 }}>현재 위치 공유</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ fontSize: '14px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}><input type="radio" checked={shareLocation} onChange={() => setShareLocation(true)} style={{ marginRight: '6px', accentColor: 'var(--primary)' }} /> 예</label>
                  <label style={{ fontSize: '14px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}><input type="radio" checked={!shareLocation} onChange={() => setShareLocation(false)} style={{ marginRight: '6px', accentColor: 'var(--primary)' }} /> 아니오</label>
                </div>
              </div>
              {shareLocation && <p style={{ fontSize: '13px', color: 'var(--primary-hover)', margin: 0, fontWeight: '600' }}>📍 {currentLocation}</p>}
            </div>
            <button className="submit-btn" onClick={saveAndShareReport} disabled={isUploading}>{isUploading ? "클라우드 저장 중..." : "완료 및 공유하기"}</button>
          </div>
        </div>
      )}

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
            
            {/* 해결 1: 상세 뷰 전용 클래스 detail-card로 변경 (전체가 클릭되는 오류 방지) */}
            <div className="detail-card">
              <div className="feed-author" style={{borderBottom:'1px solid #f1f5f9', paddingBottom:'16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <div className="author-avatar">{detailReport.authorPic ? <img src={detailReport.authorPic} alt="프로필" /> : (detailReport.authorName || '작업자').charAt(0)}</div>
                  <div className="author-info">
                    {renderAuthorBadge(detailReport.authorId, detailReport.authorName)}
                    <p className="author-time">{formatDisplayTime(detailReport)}</p>
                  </div>
                </div>
                <button onClick={() => showToast('작업자 상세 프로필 기능은 준비중입니다.')} style={{background:'#f1f5f9', color:'var(--text-main)', border:'none', padding:'6px 12px', borderRadius:'16px', fontSize:'12px', fontWeight:'700', cursor:'pointer'}}>프로필 보기</button>
              </div>
              
              <h2 style={{fontSize:'22px', fontWeight:'800', color:'var(--text-main)', margin: '16px 0 16px 0'}}>{detailReport.title}</h2>
              
              {/* 해결 2: 작업자 소개 영역 */}
              <div style={{background:'#f8fafc', padding:'16px', borderRadius:'12px', marginBottom:'24px', border:'1px solid #e2e8f0'}}>
                <p style={{fontSize:'14px', fontWeight:'700', margin:'0 0 8px 0', color:'var(--text-main)'}}>👨‍🔧 작업자 소개</p>
                <p style={{fontSize:'13px', color:'var(--text-sub)', margin:0, lineHeight:'1.5'}}>
                  {detailReport.authorAffiliation ? `${detailReport.authorAffiliation} 소속 전문가입니다.` : '신뢰와 정성을 다하는 비포터 인증 전문가입니다.'}<br/>
                  다년간의 경험과 노하우로 최고의 결과물을 제공해 드립니다.
                </p>
              </div>
              
              {/* === 뷰 모드 컨트롤러 === */}
              <div className="view-mode-control">
                <div className={`view-mode-btn ${detailViewMode==='horizontal'?'active':''}`} onClick={()=>setDetailViewMode('horizontal')}>가로 보기</div>
                <div className={`view-mode-btn ${detailViewMode==='flip'?'active':''}`} onClick={()=>setDetailViewMode('flip')}>한 장 보기</div>
                <div className={`view-mode-btn ${detailViewMode==='vertical'?'active':''}`} onClick={()=>setDetailViewMode('vertical')}>세로 보기</div>
              </div>
              
              {(detailViewMode === 'horizontal' || detailViewMode === 'vertical') && (
                <p style={{fontSize:'12px', color:'var(--text-sub)', textAlign:'center', marginBottom:'16px', fontWeight:'600'}}>🔍 자세히 보길 원하시면 사진을 눌러보세요.</p>
              )}

              {/* 다중/단건 공간별 렌더링 및 뷰 모드 적용 */}
              {getSpacesToRender(detailReport).map((sp, idx) => (
                <div key={idx} style={{marginBottom: '24px', background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'}}>
                  {sp.spaceName && (
                    <h4 style={{margin:'0 0 16px 0', color:'var(--text-main)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                      <span style={{background:'var(--primary-light)', padding:'4px 8px', borderRadius:'6px', color:'var(--primary-hover)'}}>📍</span> {sp.spaceName}
                    </h4>
                  )}
                  
                  {/* 세로 보기 */}
                  {detailViewMode === 'vertical' && (
                    <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                      <div>
                        <p style={{margin:'0 0 8px 4px', fontSize:'13px', fontWeight:'bold', color:'#ef4444'}}>■ 작업 전 (Before)</p>
                        <div className="feed-img-wrap" style={{height:'auto', minHeight:'200px', cursor:'zoom-in'}} onClick={() => setSelectedImage(sp.beforeImg)}><img src={sp.beforeImg} style={{display:'block', width:'100%'}} /></div>
                        {sp.beforeDesc && <p style={{fontSize:'14px', color:'var(--text-main)', background:'#f8fafc', padding:'12px', borderRadius:'8px', margin:'8px 0 0 0'}}>{sp.beforeDesc}</p>}
                      </div>
                      <div>
                        <p style={{margin:'0 0 8px 4px', fontSize:'13px', fontWeight:'bold', color:'var(--primary)'}}>■ 작업 후 (After)</p>
                        <div className="feed-img-wrap" style={{height:'auto', minHeight:'200px', cursor:'zoom-in'}} onClick={() => setSelectedImage(sp.afterImg)}><img src={sp.afterImg} style={{display:'block', width:'100%'}} /></div>
                        {sp.afterDesc && <p style={{fontSize:'14px', color:'var(--text-main)', background:'#f8fafc', padding:'12px', borderRadius:'8px', margin:'8px 0 0 0'}}>{sp.afterDesc}</p>}
                      </div>
                    </div>
                  )}

                  {/* 가로 보기 */}
                  {detailViewMode === 'horizontal' && (
                    <div style={{display:'flex', gap:'8px'}}>
                      <div style={{flex: 1}}>
                        <p style={{margin:'0 0 8px 0', fontSize:'12px', fontWeight:'bold', color:'#ef4444'}}>■ Before</p>
                        <div className="feed-img-wrap" style={{height:'180px', cursor:'zoom-in'}} onClick={() => setSelectedImage(sp.beforeImg)}><img src={sp.beforeImg} style={{height:'100%', objectFit:'cover'}} /></div>
                        {sp.beforeDesc && <p style={{fontSize:'12px', color:'var(--text-main)', background:'#f8fafc', padding:'8px', borderRadius:'6px', margin:'8px 0 0 0', wordBreak:'keep-all'}}>{sp.beforeDesc}</p>}
                      </div>
                      <div style={{flex: 1}}>
                        <p style={{margin:'0 0 8px 0', fontSize:'12px', fontWeight:'bold', color:'var(--primary)'}}>■ After</p>
                        <div className="feed-img-wrap" style={{height:'180px', cursor:'zoom-in'}} onClick={() => setSelectedImage(sp.afterImg)}><img src={sp.afterImg} style={{height:'100%', objectFit:'cover'}} /></div>
                        {sp.afterDesc && <p style={{fontSize:'12px', color:'var(--text-main)', background:'#f8fafc', padding:'8px', borderRadius:'6px', margin:'8px 0 0 0', wordBreak:'keep-all'}}>{sp.afterDesc}</p>}
                      </div>
                    </div>
                  )}

                  {/* 한 장 보기 (플립) */}
                  {detailViewMode === 'flip' && (
                    <div>
                      <p style={{margin:'0 0 10px 0', fontSize:'12px', color:'var(--text-sub)', textAlign:'center', fontWeight:'600'}}>사진을 탭하여 전/후를 비교해보세요 👆</p>
                      <div className={`flip-card ${flippedCards[idx] ? 'flipped' : ''}`} onClick={() => toggleFlip(idx)}>
                        <div className="flip-card-inner">
                          <div className="flip-card-front">
                            <span className="img-label" style={{background:'#ef4444'}}>Before</span>
                            <img src={sp.beforeImg} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                          </div>
                          <div className="flip-card-back">
                            <span className="img-label" style={{background:'var(--primary)'}}>After</span>
                            <img src={sp.afterImg} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                          </div>
                        </div>
                      </div>
                      {(sp.beforeDesc || sp.afterDesc) && (
                        <div style={{marginTop:'12px', padding:'12px', background:'#f8fafc', borderRadius:'8px', fontSize:'13px', color:'var(--text-main)'}}>
                          <strong style={{color: !flippedCards[idx] ? '#ef4444' : 'var(--primary)', marginRight:'6px'}}>
                            {!flippedCards[idx] ? 'Before:' : 'After:'}
                          </strong>
                          {!flippedCards[idx] ? (sp.beforeDesc || '작업 전 설명이 없습니다.') : (sp.afterDesc || '작업 후 설명이 없습니다.')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* 무결성 로그(히스토리) */}
              {detailReport.history && detailReport.history.length > 0 && (
                <div className="history-box">
                  <strong>📜 리포트 수정 내역 (무결성 로그)</strong>
                  {detailReport.history.map((h, i) => <div key={i} style={{marginTop:'4px'}}>[{h.date}] {h.action}됨</div>)}
                </div>
              )}
            </div>
            
            <button className="submit-btn" style={{background:'var(--primary)', marginTop:0}} onClick={() => copyLink(detailReport.id)}>🔗 이 리포트 링크 복사</button>
            <button className="submit-btn" style={{background:'white', color:'var(--text-main)', border:'1px solid #cbd5e1', marginTop:'12px'}} onClick={() => switchView('feed')}>목록으로 돌아가기</button>
            
            {/* 댓글 섹션 */}
            <div className="comment-section">
              <h3 style={{fontSize:'16px', margin:'0 0 16px 0'}}>💬 댓글 {(detailReport.comments || []).length}</h3>
              <div className="comment-list">
                {(detailReport.comments || []).map((c) => (
                  <div key={c.id} className="comment-item">
                    <div className="comment-avatar">{c.authorPic ? <img src={c.authorPic} style={{width:'100%'}}/> : c.authorName.charAt(0)}</div>
                    <div>
                      <div style={{fontSize:'13px', fontWeight:'bold', marginBottom:'2px'}}>{c.authorName}</div>
                      <div style={{fontSize:'14px', color:'var(--text-main)', lineHeight:'1.4'}}>{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="comment-input-wrap">
                <input type="text" className="comment-input" placeholder="칭찬이나 궁금한 점을 남겨보세요" value={commentInput} onChange={(e) => setCommentInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && submitComment()}/>
                <button className="comment-submit" onClick={submitComment}>등록</button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 모달 영역 */}
      <div className={`modal-overlay ${isTermsModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{ padding: '24px 20px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>이용 약관 동의</h3>
          <div className="terms-box">
            <label className="terms-label"><input type="checkbox" checked={termsAgreed && privacyAgreed} onChange={handleAgreeAll} />전체 동의하기</label>
            <div className="terms-sub">
              <label><input type="checkbox" checked={termsAgreed} onChange={(e) => setTermsAgreed(e.target.checked)} /> (필수) 서비스 이용약관 동의</label>
              <label><input type="checkbox" checked={privacyAgreed} onChange={(e) => setPrivacyAgreed(e.target.checked)} /> (필수) 개인정보 수집 및 이용 동의</label>
            </div>
          </div>
          <button className="sheet-btn" style={{ background: (termsAgreed && privacyAgreed) ? 'var(--primary)' : '#e2e8f0', color: (termsAgreed && privacyAgreed) ? 'white' : '#94a3b8', border: 'none' }} onClick={processLogin}>동의하고 로그인 계속하기</button>
          <button className="sheet-btn cancel" onClick={() => setIsTermsModalOpen(false)}>취소</button>
        </div>
      </div>

      <div className={`modal-overlay ${isProfileModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{ padding: '24px 20px', width: '100%' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>프로필 수정</h3>
          <div className="profile-pic-edit" onClick={() => profilePicRef.current.click()}>{editProfilePic ? <img src={editProfilePic} alt="프로필" /> : (editName || '작업자').charAt(0)}<div className="profile-pic-overlay">📷</div></div>
          <div className="input-group" style={{ marginBottom: '16px' }}><label className="title-label" style={{ fontSize: '13px' }}>이름 (닉네임)</label><input type="text" className="title-input" style={{ padding: '12px' }} value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
          <div className="input-group" style={{ marginBottom: '24px' }}><label className="title-label" style={{ fontSize: '13px' }}>소속 (상호)</label><input type="text" className="title-input" style={{ padding: '12px' }} placeholder="예: 김반장 클린" value={editAffiliation} onChange={(e) => setEditAffiliation(e.target.value)} /></div>
          <button className="sheet-btn" style={{ background: 'var(--text-main)', color: 'white', border: 'none' }} onClick={saveProfile}>저장하기</button>
          <button className="sheet-btn cancel" onClick={() => setIsProfileModalOpen(false)}>취소</button>
        </div>
      </div>

      <div className={`modal-overlay ${isTierModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{ padding: '24px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '18px' }}>비포터 장갑 등급이란?</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '20px' }}>작성한 리포트 수에 따라 장갑 색상이 변합니다.<br/>고객에게 더 큰 신뢰를 보여주세요!</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>⚪ 흰 장갑 <span style={{ fontWeight: 'normal', color: 'var(--text-sub)', fontSize: '13px' }}>(0~99회)</span></div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>🟡 노란 장갑 <span style={{ fontWeight: 'normal', color: 'var(--text-sub)', fontSize: '13px' }}>(100~199회)</span></div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>🟢 초록 장갑 <span style={{ fontWeight: 'normal', color: 'var(--text-sub)', fontSize: '13px' }}>(200~299회)</span></div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>🔵 파란 장갑 <span style={{ fontWeight: 'normal', color: 'var(--text-sub)', fontSize: '13px' }}>(300~399회)</span></div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>🔴 빨간 장갑 <span style={{ fontWeight: 'normal', color: 'var(--text-sub)', fontSize: '13px' }}>(400~499회)</span></div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>🌈 무지개 장갑 <span style={{ fontWeight: 'normal', color: 'var(--text-sub)', fontSize: '13px' }}>(500회 이상)</span></div>
          </div>
          <button className="sheet-btn cancel" style={{ marginTop: 0 }} onClick={() => setIsTierModalOpen(false)}>닫기</button>
        </div>
      </div>

      <div className={`bottom-sheet-overlay ${isPhotoSheetOpen ? 'active' : ''}`} onClick={() => setIsPhotoSheetOpen(false)}></div>
      <div className={`bottom-sheet ${isPhotoSheetOpen ? 'active' : ''}`}>
        <p style={{ margin: '0 0 20px 0', fontWeight: 700, textAlign: 'center' }}>사진 첨부 방식 선택</p>
        <button className="sheet-btn" onClick={() => triggerPhotoInput('camera')}>📷 카메라로 바로 촬영</button>
        <button className="sheet-btn" onClick={() => triggerPhotoInput('gallery')}>🖼️ 스마트폰 앨범에서 선택</button>
        <button className="sheet-btn cancel" onClick={() => setIsPhotoSheetOpen(false)}>취소</button>
      </div>

      <div className={`modal-overlay ${isFinishModalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>리포트 작성 완료! 🎉</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-sub)', marginBottom: '20px' }}>피드에 등록되었습니다.<br/>고객에게 공유해 보세요!</p>
          <button className="sheet-btn" style={{ background: 'var(--primary)', color: 'white', border: 'none' }} onClick={copyAndFinish}>🔗 리포트 링크 복사</button>
          <button className="sheet-btn cancel" onClick={closeFinishModal}>피드로 가기</button>
        </div>
      </div>
      
      {/* 리포트 관리 모달 */}
      <div className={`modal-overlay ${isEditModalOpen ? 'active' : ''}`}>
        <div className="modal-content" style={{width:'90%', maxWidth:'400px'}}>
          <h3 style={{marginTop:0, marginBottom:'20px'}}>리포트 관리</h3>
          <div className="input-group" style={{marginBottom:'12px'}}><label className="title-label" style={{fontSize:'13px'}}>제목 수정</label><input type="text" className="title-input" style={{padding:'10px'}} value={editDocTitle} onChange={e=>setEditDocTitle(e.target.value)} /></div>
          <div className="input-group" style={{marginBottom:'24px'}}><label className="title-label" style={{fontSize:'13px'}}>공개 상태</label><select className="title-input" style={{padding:'10px'}} value={editDocStatus} onChange={e=>setEditDocStatus(e.target.value)}><option value="public">전체 공개 (피드 노출)</option><option value="private">비공개 (링크가 있는 사람만)</option></select></div>
          <div style={{display:'flex', gap:'8px'}}>
            <button className="sheet-btn" style={{flex:1, margin:0, background:'var(--text-main)', color:'white', border:'none'}} onClick={submitReportEdit}>저장</button>
            <button className="sheet-btn" style={{flex:1, margin:0, background:'#ef4444', color:'white', border:'none'}} onClick={deleteReport}>삭제</button>
          </div>
          <button className="sheet-btn cancel" onClick={()=>setIsEditModalOpen(false)}>닫기</button>
        </div>
      </div>

      <div className={`modal-overlay ${isFeedbackModalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <h3 style={{ marginTop: 0, marginBottom: '12px' }}>개발자에게 피드백 전송</h3>
          {currentUser && currentUser.email && (
            <div style={{ fontSize: '13px', color: 'var(--text-main)', marginBottom: '12px', textAlign: 'left', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: '600' }}>
              ✉️ 발신자: {currentUser.email}
            </div>
          )}
          <select 
            className="title-input" 
            style={{ marginBottom: '12px', padding: '12px', fontSize: '14px', width: '100%', cursor: 'pointer' }}
            value={feedbackCategory}
            onChange={(e) => setFeedbackCategory(e.target.value)}
          >
            <option value="기능 관련">⚙️ 기능 관련</option>
            <option value="오류 제보">🚨 오류 제보</option>
            <option value="서비스 확대">🚀 서비스 확대</option>
            <option value="디자인">🎨 디자인</option>
            <option value="기타">💬 기타</option>
          </select>
          <textarea className="feedback-textarea" placeholder="자유롭게 적어주세요!" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)}></textarea>
          <button className="sheet-btn" style={{ background: 'var(--text-main)', color: 'white', border: 'none' }} onClick={submitFeedback}>보내기</button>
          <button className="sheet-btn cancel" onClick={() => setIsFeedbackModalOpen(false)}>취소</button>
        </div>
      </div>

      {/* 이미지 확대 모달 */}
      <div className={`modal-overlay ${selectedImage ? 'active' : ''}`} onClick={() => setSelectedImage(null)} style={{zIndex: 1000}}>
        {selectedImage && (
          <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box'}}>
            <img src={selectedImage} alt="확대된 이미지" style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px'}} />
            <button style={{position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer'}}>×</button>
          </div>
        )}
      </div>

      <div className={`toast ${toastMsg.show ? 'show' : ''}`}>{toastMsg.msg}</div>
    </div>
  );
}