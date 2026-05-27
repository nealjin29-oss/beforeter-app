import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  // === 상태(State) 관리 ===
  const [currentView, setCurrentView] = useState('feed'); // 'feed', 'login', 'mypage', 'upload'
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem('beporter_user')) || null);
  const [feedData, setFeedData] = useState(() => JSON.parse(localStorage.getItem('beporter_feeds')) || []);
  
  // 모달 및 바텀시트 상태
  const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState(false);
  const [currentPhotoTarget, setCurrentPhotoTarget] = useState(''); // 'before' or 'after'
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  
  // 업로드 폼 상태
  const [taskTitle, setTaskTitle] = useState('');
  const [beforeImg, setBeforeImg] = useState('');
  const [afterImg, setAfterImg] = useState('');
  const [feedbackText, setFeedbackText] = useState('');

  // 토스트 메시지 상태
  const [toastMsg, setToastMsg] = useState({ show: false, msg: '' });

  // 숨겨진 파일 인풋 참조 (useRef)
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // === 토스트 메시지 로직 ===
  const showToast = (msg) => {
    setToastMsg({ show: true, msg });
    setTimeout(() => {
      setToastMsg({ show: false, msg: '' });
    }, 3000);
  };

  // === 네비게이션 제어 ===
  const switchView = (view) => {
    setCurrentView(view);
    window.scrollTo(0, 0);
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const checkAuthAndUpload = () => {
    if (!currentUser) {
      showToast("로그인이 필요한 기능입니다.");
      switchView('login');
    } else {
      switchView('upload');
    }
  };

  const goToMyPage = () => {
    setIsMenuOpen(false);
    if (!currentUser) {
      showToast("로그인이 필요한 기능입니다.");
      switchView('login');
      return;
    }
    switchView('mypage');
  };

  // === 로그인 / 로그아웃 제어 ===
  const processLogin = (provider) => {
    const mockName = provider === '카카오' ? '김반장(카카오)' : '이프로(구글)';
    const user = { id: 'user_' + Date.now(), name: mockName, provider: provider };
    setCurrentUser(user);
    localStorage.setItem('beporter_user', JSON.stringify(user));
    showToast(`${provider} 계정으로 로그인 되었습니다.`);
    switchView('feed');
  };

  const processLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('beporter_user');
    showToast('로그아웃 되었습니다.');
    setIsMenuOpen(false);
    switchView('feed');
  };

  // === 사진 업로드 로직 ===
  const openPhotoSheet = (target) => {
    setCurrentPhotoTarget(target);
    setIsPhotoSheetOpen(true);
  };

  const triggerPhotoInput = (type) => {
    setIsPhotoSheetOpen(false);
    if (type === 'camera') cameraInputRef.current.click();
    else galleryInputRef.current.click();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && currentPhotoTarget) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (currentPhotoTarget === 'before') setBeforeImg(event.target.result);
        if (currentPhotoTarget === 'after') setAfterImg(event.target.result);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = ''; // 같은 파일 재선택을 위해 초기화
  };

  // === 리포트 저장 및 공유 ===
  const saveAndShareReport = () => {
    if (!taskTitle || !beforeImg || !afterImg) {
      showToast("제목과 사진(전/후)을 모두 입력해주세요!");
      return;
    }

    const newReport = {
      id: 'report_' + Date.now(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      time: "방금 전",
      title: taskTitle,
      beforeImg: beforeImg,
      afterImg: afterImg
    };

    try {
      const updatedFeeds = [newReport, ...feedData];
      setFeedData(updatedFeeds);
      localStorage.setItem('beporter_feeds', JSON.stringify(updatedFeeds));
      setIsFinishModalOpen(true);
    } catch (error) {
      showToast("용량이 초과되었습니다. (LocalStorage 제한)");
    }
  };

  const closeFinishModal = () => {
    setIsFinishModalOpen(false);
    setTaskTitle('');
    setBeforeImg('');
    setAfterImg('');
    switchView('feed');
  };

  const copyAndFinish = () => {
    const dummyLink = "https://beporter.app/report/" + Math.floor(Math.random() * 10000);
    const textarea = document.createElement('textarea');
    textarea.value = dummyLink;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast("링크가 복사되었습니다! 카톡에 붙여넣기 하세요.");
      setTimeout(closeFinishModal, 1500);
    } catch (err) {
      showToast("링크 복사에 실패했습니다.");
    } finally {
      document.body.removeChild(textarea);
    }
  };

  // === 피드백 전송 ===
  const submitFeedback = () => {
    if (!feedbackText.trim()) {
      showToast("내용을 입력해주세요.");
      return;
    }
    showToast("소중한 의견 감사합니다! 적극 반영하겠습니다. ❤️");
    setIsFeedbackModalOpen(false);
    setFeedbackText('');
  };

  // --- 화면 렌더링 헬퍼 ---
  const myFeeds = currentUser ? feedData.filter(feed => feed.authorId === currentUser.id) : [];

  return (
    <>
      <style>{`
        /* CSS in JS 렌더링 - React의 App.jsx 안에 독립적으로 위치하도록 세팅 */
        body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; color: #334155; -webkit-tap-highlight-color: transparent; }
        :root { --primary: #14b8a6; --primary-hover: #0d9488; --primary-light: #ccfbf1; --card-bg: #ffffff; --text-main: #1e293b; --text-sub: #64748b; }
        
        .app-header { position: fixed; top: 0; left: 0; width: 100%; height: 56px; background-color: var(--card-bg); display: flex; align-items: center; justify-content: space-between; padding: 0 16px; box-sizing: border-box; z-index: 50; border-bottom: 1px solid #e2e8f0; }
        .header-icon { background: none; border: none; color: var(--text-main); font-size: 24px; cursor: pointer; padding: 8px; display: flex; align-items: center; justify-content: center; }
        .header-title { font-size: 18px; font-weight: 800; color: var(--primary); letter-spacing: -0.5px; }
        .header-placeholder { width: 40px; }
        
        .view-section { padding-top: 56px; padding-bottom: 80px; min-height: 100vh; box-sizing: border-box; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* Sidebar */
        .sidebar-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 100; opacity: 0; visibility: hidden; transition: all 0.3s; }
        .sidebar-overlay.active { opacity: 1; visibility: visible; }
        .sidebar { position: fixed; top: 0; left: -280px; width: 280px; height: 100%; background: white; z-index: 101; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; box-shadow: 2px 0 12px rgba(0,0,0,0.1); }
        .sidebar.active { left: 0; }
        .sidebar-header { padding: 30px 20px; background-color: var(--primary-light); border-bottom: 1px solid #bae6fd; display: flex; align-items: center; gap: 12px; }
        .sidebar-profile-img { width: 48px; height: 48px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; color: var(--primary); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .sidebar-user-info h2 { margin: 0; color: var(--primary-hover); font-size: 18px; font-weight: 800; }
        .sidebar-user-info p { margin: 4px 0 0 0; font-size: 13px; color: var(--text-sub); }
        .sidebar-menu { list-style: none; padding: 0; margin: 0; flex: 1; }
        .sidebar-menu li { border-bottom: 1px solid #f1f5f9; }
        .sidebar-menu button { width: 100%; text-align: left; background: none; border: none; display: flex; align-items: center; padding: 18px 20px; color: var(--text-main); font-size: 16px; font-weight: 600; gap: 12px; cursor: pointer; }
        .sidebar-menu button:active { background-color: #f8fafc; }

        /* Feed */
        .feed-container { padding: 16px; max-width: 600px; margin: 0 auto; }
        .empty-state { text-align: center; padding: 60px 20px; color: var(--text-sub); display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .empty-state svg { color: #cbd5e1; width: 64px; height: 64px; }
        .feed-card { background: var(--card-bg); border-radius: 16px; padding: 16px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .feed-author { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .author-avatar { width: 36px; height: 36px; background-color: var(--primary-light); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--primary-hover); font-weight: bold; font-size: 14px; }
        .author-name { font-size: 14px; font-weight: 700; margin: 0 0 2px 0; color: var(--text-main); }
        .author-time { font-size: 12px; color: var(--text-sub); margin: 0; }
        .feed-title { font-size: 16px; font-weight: 700; margin-bottom: 12px; line-height: 1.4; }
        .feed-images { display: flex; gap: 8px; height: 180px; }
        .feed-img-wrap { flex: 1; position: relative; border-radius: 8px; overflow: hidden; background-color: #e2e8f0; }
        .feed-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .badge { position: absolute; top: 8px; left: 8px; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 800; color: white; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); }

        /* Login */
        .login-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: calc(100vh - 56px); padding: 20px; text-align: center; background: white; }
        .login-logo { width: 80px; height: 80px; background: var(--primary); border-radius: 20px; display: flex; align-items: center; justify-content: center; color: white; font-size: 40px; font-weight: bold; margin-bottom: 24px; box-shadow: 0 10px 20px rgba(20, 184, 166, 0.3); }
        .login-container h1 { font-size: 24px; color: var(--text-main); margin-bottom: 8px; }
        .login-container p { color: var(--text-sub); margin-bottom: 40px; }
        .social-btn { width: 100%; max-width: 320px; padding: 16px; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; border: none; display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 12px; transition: 0.2s; }
        .btn-kakao { background-color: #FEE500; color: rgba(0,0,0,0.85); }
        .btn-google { background-color: #ffffff; color: rgba(0,0,0,0.6); border: 1px solid #cbd5e1; }

        /* MyPage */
        .mypage-header { background: white; padding: 30px 20px; text-align: center; border-bottom: 1px solid #e2e8f0; margin-bottom: 16px; }
        .mypage-stats { display: flex; justify-content: center; gap: 40px; margin-top: 20px; }
        .stat-item { display: flex; flex-direction: column; align-items: center; }
        .stat-num { font-size: 20px; font-weight: 800; color: var(--primary); }
        .stat-label { font-size: 13px; color: var(--text-sub); margin-top: 4px; }

        /* Upload */
        .upload-container { padding: 24px 20px; max-width: 500px; margin: 0 auto; background: white; min-height: calc(100vh - 56px); }
        .input-group { margin-bottom: 28px; }
        .input-group label.title-label { display: block; font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 10px; }
        .title-input { width: 100%; padding: 16px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 16px; box-sizing: border-box; background-color: #f8fafc; }
        .title-input:focus { outline: none; border-color: var(--primary); background-color: white; box-shadow: 0 0 0 3px var(--primary-light); }
        .photo-upload { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 180px; background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; cursor: pointer; color: #64748b; font-size: 14px; font-weight: 600; box-sizing: border-box; overflow: hidden; }
        .photo-upload img.preview { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 10; }
        .photo-upload .change-text { position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 6px 10px; border-radius: 6px; font-size: 12px; z-index: 11; }
        .submit-btn { width: 100%; padding: 18px; background-color: var(--text-main); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; margin-top: 20px; cursor: pointer; }

        /* FAB & Modals */
        .fab-container { position: fixed; bottom: 24px; left: 0; width: 100%; display: flex; justify-content: center; z-index: 40; pointer-events: none; }
        .fab-btn { pointer-events: auto; background-color: var(--primary); color: white; border: none; padding: 14px 24px; border-radius: 30px; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; box-shadow: 0 6px 16px rgba(20, 184, 166, 0.4); cursor: pointer; }
        
        .bottom-sheet-overlay, .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 200; opacity: 0; visibility: hidden; transition: all 0.3s; }
        .bottom-sheet-overlay.active, .modal-overlay.active { opacity: 1; visibility: visible; }
        .bottom-sheet { position: fixed; bottom: -100%; left: 0; width: 100%; background: white; border-radius: 20px 20px 0 0; z-index: 201; padding: 24px 20px; box-sizing: border-box; transition: bottom 0.3s; }
        .bottom-sheet.active { bottom: 0; }
        .sheet-btn { width: 100%; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 16px; font-weight: 600; margin-bottom: 12px; cursor: pointer; }
        .sheet-btn.cancel { background: white; border: none; color: #ef4444; margin-top: 8px; }
        
        .modal-content { background: white; width: 90%; max-width: 360px; border-radius: 20px; padding: 28px 24px; box-sizing: border-box; text-align: center; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
        .feedback-textarea { width: 100%; height: 100px; padding: 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-family: inherit; font-size: 14px; resize: none; margin-bottom: 16px; box-sizing: border-box; }
        
        /* Toast */
        .toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(100px); background-color: #334155; color: white; padding: 12px 24px; border-radius: 30px; font-size: 14px; font-weight: 600; z-index: 1000; opacity: 0; transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55); white-space: nowrap; pointer-events: none; }
        .toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
      `}</style>

      {/* 숨겨진 파일 인풋 */}
      <div style={{ display: 'none' }}>
        <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileSelect} />
        <input type="file" accept="image/*" ref={galleryInputRef} onChange={handleFileSelect} />
      </div>

      {/* --- 사이드바 --- */}
      <div className={`sidebar-overlay ${isMenuOpen ? 'active' : ''}`} onClick={toggleMenu}></div>
      <div className={`sidebar ${isMenuOpen ? 'active' : ''}`}>
        <div className="sidebar-header">
          {currentUser ? (
            <>
              <div className="sidebar-profile-img">{currentUser.name.charAt(0)}</div>
              <div className="sidebar-user-info">
                <h2>{currentUser.name}</h2>
                <p>{currentUser.provider} 로그인 됨</p>
              </div>
            </>
          ) : (
            <>
              <div className="sidebar-profile-img" style={{ color: '#cbd5e1' }}>?</div>
              <div className="sidebar-user-info">
                <h2 style={{ color: '#94a3b8' }}>비포터</h2>
                <p>로그인 후 이용해보세요</p>
              </div>
            </>
          )}
        </div>
        <ul className="sidebar-menu">
          {currentUser ? (
            <>
              <li><button onClick={goToMyPage}>👤 마이페이지 (내 리포트)</button></li>
              <li><button onClick={() => { setIsMenuOpen(false); setIsFeedbackModalOpen(true); }}>💡 개발자에게 피드백 전송</button></li>
              <li><button onClick={processLogout} style={{ color: '#ef4444' }}>🚪 로그아웃</button></li>
            </>
          ) : (
            <>
              <li><button onClick={() => { setIsMenuOpen(false); switchView('login'); }}>🔐 로그인 / 회원가입</button></li>
              <li><button onClick={() => { setIsMenuOpen(false); setIsFeedbackModalOpen(true); }}>💡 개발자에게 피드백 전송</button></li>
            </>
          )}
        </ul>
      </div>

      {/* ==========================================
          VIEW 1: 피드 화면 (메인)
      ========================================== */}
      {currentView === 'feed' && (
        <div className="view-section">
          <header className="app-header">
            <button className="header-icon" onClick={toggleMenu}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div className="header-title">비포터 피드</div>
            <div className="header-placeholder"></div>
          </header>

          <div className="feed-container">
            {feedData.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  아직 작성된 리포트가 없습니다.<br />첫 번째 리포트를 등록해보세요!
                </p>
              </div>
            ) : (
              feedData.map((item) => (
                <div key={item.id} className="feed-card">
                  <div className="feed-author">
                    <div className="author-avatar">{item.authorName.charAt(0)}</div>
                    <div className="author-info">
                      <p className="author-name">{item.authorName}</p>
                      <p className="author-time">{item.time}</p>
                    </div>
                  </div>
                  <div className="feed-title">{item.title}</div>
                  <div className="feed-images">
                    <div className="feed-img-wrap">
                      <span className="badge" style={{ background: '#ef4444' }}>Before</span>
                      <img src={item.beforeImg} alt="Before" />
                    </div>
                    <div className="feed-img-wrap">
                      <span className="badge" style={{ background: 'var(--primary)' }}>After</span>
                      <img src={item.afterImg} alt="After" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="fab-container">
            <button className="fab-btn" onClick={checkAuthAndUpload}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              내 리포트 올리기
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          VIEW 2: 로그인 화면
      ========================================== */}
      {currentView === 'login' && (
        <div className="view-section">
          <header className="app-header">
            <button className="header-icon" onClick={() => switchView('feed')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <div className="header-title">로그인</div>
            <div className="header-placeholder"></div>
          </header>
          
          <div className="login-container">
            <div className="login-logo">B</div>
            <h1>비포터 시작하기</h1>
            <p>1분만에 가입하고 신뢰를 공유하세요</p>

            <button className="social-btn btn-kakao" onClick={() => processLogin('카카오')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c-5.52 0-10 3.58-10 8 0 2.85 1.8 5.34 4.5 6.74-.2.7-.6 2.22-.65 2.45-.06.28.1.28.24.18.12-.08 2.74-1.85 3.86-2.61.65.08 1.34.14 2.05.14 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
              </svg>
              카카오톡으로 시작하기
            </button>
            <button className="social-btn btn-google" onClick={() => processLogin('Google')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12c0-.82-.07-1.61-.2-2.38H12v4.5h5.68a5.4 5.4 0 0 1-2.34 3.55v2.95h3.79C21.34 18.57 22 15.55 22 12z"/>
              </svg>
              Google 계정으로 시작하기
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          VIEW 3: 마이페이지
      ========================================== */}
      {currentView === 'mypage' && currentUser && (
        <div className="view-section">
          <header className="app-header">
            <button className="header-icon" onClick={() => switchView('feed')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <div className="header-title">마이페이지</div>
            <div className="header-placeholder"></div>
          </header>

          <div className="mypage-header">
            <div className="sidebar-profile-img" style={{ margin: '0 auto 12px auto', width: '64px', height: '64px', fontSize: '28px' }}>
              {currentUser.name.charAt(0)}
            </div>
            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-main)' }}>{currentUser.name}</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-sub)' }}>{currentUser.provider} 연동됨</p>
            <div className="mypage-stats">
              <div className="stat-item">
                <span className="stat-num">{myFeeds.length}</span>
                <span className="stat-label">작성한 리포트</span>
              </div>
            </div>
          </div>

          <div className="feed-container">
            {myFeeds.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-sub)' }}>작성한 리포트가 없습니다.</p>
            ) : (
              myFeeds.map(item => (
                <div key={item.id} className="feed-card">
                  <div className="feed-title">{item.title}</div>
                  <div className="feed-images">
                    <div className="feed-img-wrap"><img src={item.beforeImg} alt="Before" /></div>
                    <div className="feed-img-wrap"><img src={item.afterImg} alt="After" /></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          VIEW 4: 리포트 작성 화면
      ========================================== */}
      {currentView === 'upload' && (
        <div className="view-section">
          <header className="app-header">
            <button className="header-icon" onClick={() => switchView('feed')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <div className="header-title">새 리포트 작성</div>
            <div className="header-placeholder"></div>
          </header>

          <div className="upload-container">
            <div className="input-group">
              <label className="title-label">작업 제목</label>
              <input 
                type="text" 
                className="title-input" 
                placeholder="어떤 작업을 하셨나요?" 
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="title-label">작업 전 사진 첨부해주세요.</label>
              <div className="photo-upload" onClick={() => openPhotoSheet('before')}>
                {!beforeImg && <span>📸 + 사진 추가하기</span>}
                {beforeImg && (
                  <>
                    <img className="preview" src={beforeImg} alt="작업 전" />
                    <div className="change-text">다시 선택</div>
                  </>
                )}
              </div>
            </div>
            <div className="input-group">
              <label className="title-label">작업 후 사진 첨부해주세요.</label>
              <div className="photo-upload" onClick={() => openPhotoSheet('after')}>
                {!afterImg && <span>✨ + 사진 추가하기</span>}
                {afterImg && (
                  <>
                    <img className="preview" src={afterImg} alt="작업 후" />
                    <div className="change-text">다시 선택</div>
                  </>
                )}
              </div>
            </div>
            <button className="submit-btn" onClick={saveAndShareReport}>작성 완료 및 공유하기</button>
          </div>
        </div>
      )}

      {/* ==========================================
          모달 및 시트 요소들
      ========================================== */}
      
      {/* 사진 첨부 바텀시트 */}
      <div className={`bottom-sheet-overlay ${isPhotoSheetOpen ? 'active' : ''}`} onClick={() => setIsPhotoSheetOpen(false)}></div>
      <div className={`bottom-sheet ${isPhotoSheetOpen ? 'active' : ''}`}>
        <p style={{ margin: '0 0 20px 0', fontWeight: 700, textAlign: 'center', color: 'var(--text-sub)' }}>사진 첨부 방식 선택</p>
        <button className="sheet-btn" onClick={() => triggerPhotoInput('camera')}>📷 카메라로 바로 촬영</button>
        <button className="sheet-btn" onClick={() => triggerPhotoInput('gallery')}>🖼️ 스마트폰 앨범에서 선택</button>
        <button className="sheet-btn cancel" onClick={() => setIsPhotoSheetOpen(false)}>취소</button>
      </div>

      {/* 공유 완료 모달 */}
      <div className={`modal-overlay ${isFinishModalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>리포트 작성 완료! 🎉</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-sub)', marginBottom: '20px' }}>피드에 등록되었습니다.<br/>고객에게도 공유해 보세요!</p>
          <button className="sheet-btn" style={{ background: 'var(--primary)', color: 'white', border: 'none' }} onClick={copyAndFinish}>🔗 리포트 링크 복사하기</button>
          <button className="sheet-btn cancel" onClick={closeFinishModal}>피드로 돌아가기</button>
        </div>
      </div>

      {/* 피드백 모달 */}
      <div className={`modal-overlay ${isFeedbackModalOpen ? 'active' : ''}`}>
        <div className="modal-content">
          <h3 style={{ marginTop: 0, marginBottom: '12px' }}>개발자에게 피드백 전송</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '16px' }}>불편한 점이나 추가되었으면 하는<br/>기능을 자유롭게 적어주세요!</p>
          <textarea 
            className="feedback-textarea" 
            placeholder="예: 사진을 여러 장 올리게 해주세요"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
          ></textarea>
          <button className="sheet-btn" style={{ background: 'var(--text-main)', color: 'white', border: 'none' }} onClick={submitFeedback}>보내기</button>
          <button className="sheet-btn cancel" style={{ marginTop: 0 }} onClick={() => setIsFeedbackModalOpen(false)}>취소</button>
        </div>
      </div>

      {/* 토스트 메시지 */}
      <div className={`toast ${toastMsg.show ? 'show' : ''}`}>{toastMsg.msg}</div>
    </>
  );
}