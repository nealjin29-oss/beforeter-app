// app/report/[id]/page.jsx (서버 컴포넌트)
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ReportDetailClient from './ReportDetailClient'; // 실제 화면을 그리는 클라이언트 컴포넌트

// 💡 여기서 메타태그를 서버에서 미리 렌더링하여 카카오톡에 전달합니다!
export async function generateMetadata({ params }) {
  const { id } = params;
  const docRef = doc(db, 'artifacts', 'beforeter-app', 'public', 'data', 'reports', id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    const coverImg = data.spaces?.[0]?.afterImg || '디폴트이미지URL';
    
    return {
      title: `${data.title} - 비포터`,
      description: `[${data.authorName}] 프로님의 작업 결과물을 확인해보세요!`,
      openGraph: {
        images: [coverImg], // 카카오톡 썸네일로 뜰 이미지
      },
    }
  }
  return { title: '비포터 리포트' }
}

export default async function ReportPage({ params }) {
  // 클라이언트 컴포넌트에 id만 넘겨서 화면을 그리게 합니다.
  return <ReportDetailClient reportId={params.id} />
}
