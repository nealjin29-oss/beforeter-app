import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Firebase가 세팅된 경로 (없다면 맞게 수정)
import App from "../../page"; // 메인 App.jsx 컴포넌트를 불러옵니다.

const APP_ID = 'beforeter-app';

// 💡 1. 카카오톡 봇이 URL을 읽을 때 실행되는 서버 사이드 메타태그 생성기
export async function generateMetadata({ params }) {
  const { id } = params;

  try {
    const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reports', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { title: '리포트를 찾을 수 없습니다 - 비포터' };
    }

    const report = docSnap.data();
    const coverImg = (report.spaces && report.spaces.length > 0) 
      ? report.spaces[0].afterImg 
      : 'https://www.beforeter.com/default-og-image.png';

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
    return { title: '비포터 (Beforeter)' };
  }
}

// 💡 2. 사용자에게는 기존의 훌륭한 App 컴포넌트를 그대로 보여줍니다.
export default function ReportDetailPage() {
  return <App />;
}