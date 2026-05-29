// src/app/report/[id]/page.jsx
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase"; // 방금 만든 파이어베이스 설정 파일

const APP_ID = 'beforeter-app';

// 1️⃣ 카카오톡 봇이 URL을 읽을 때 실행되는 서버 사이드 메타태그 생성 함수
export async function generateMetadata({ params }) {
  const { id } = params; // URL에서 리포트 ID 추출 (예: /report/1234 -> id는 '1234')

  try {
    const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { title: '리포트를 찾을 수 없습니다 - 비포터' };
    }

    const report = docSnap.data();
    
    // 대표 이미지 추출 (공간 사진이 있으면 첫 번째 After 사진, 없으면 기본 이미지)
    const coverImg = (report.spaces && report.spaces.length > 0) 
      ? report.spaces[0].afterImg 
      : '[https://www.beforeter.com/default-og-image.png](https://www.beforeter.com/default-og-image.png)';

    // ✨ 이곳에서 카카오톡에 보여질 제목, 설명, 이미지를 세팅합니다.
    return {
      title: `${report.title} - 비포터`,
      description: `[${report.authorName}] 프로님의 작업 결과물을 확인해보시겠어요?`,
      openGraph: {
        title: `${report.title} - 비포터`,
        description: `[${report.authorName}] 프로님의 작업 결과물을 확인해보시겠어요?`,
        images: [coverImg],
        url: `https://www.beforeter.com/report/${id}`,
        type: 'website',
      }
    };
  } catch (error) {
    console.error("Meta tag generation error:", error);
    return { title: '비포터 (Beforeter)' };
  }
}

// 2️⃣ 실제 사용자에게 보여질 페이지 UI (서버 컴포넌트)
export default async function ReportDetailPage({ params }) {
  const { id } = params;
  
  // 서버에서 데이터를 한 번 더 불러와서 화면을 그립니다.
  const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', id);
  const docSnap = await getDoc(docRef);
  const report = docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;

  if (!report) {
    return <div className="p-10 text-center">존재하지 않거나 삭제된 리포트입니다.</div>;
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20">
      {/* 기존 App.jsx에 있던 detail 렌더링 UI를 여기에 구현합니다 */}
      <div className="p-4">
        <h1 className="text-2xl font-bold">{report.title}</h1>
        <p className="text-gray-500">작성자: {report.authorName}</p>
        
        {report.spaces?.map((sp, idx) => (
          <div key={idx} className="mt-4 p-4 bg-white rounded-lg shadow">
             <div className="flex gap-2">
                <img src={sp.beforeImg} alt="Before" className="w-1/2 object-cover rounded" />
                <img src={sp.afterImg} alt="After" className="w-1/2 object-cover rounded" />
             </div>
             {sp.desc && <p className="mt-2 text-sm">{sp.desc}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
