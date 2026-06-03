import App from "../../page"; // 메인 App 컴포넌트 불러오기

// 💡 1. 카카오톡 봇이 URL을 읽을 때 실행되는 서버 사이드 메타태그 생성기
// Firebase SDK를 쓰지 않고 REST API(fetch)를 써서 에러를 원천 차단합니다.
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  
  // 대표님의 프로젝트 ID (고정)
  const PROJECT_ID = "beforeter-72de2"; 

  try {
    // 🚀 구글 Firestore REST API를 이용해 데이터를 0.1초 만에 직접 가져옵니다.
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/artifacts/beforeter-app/public/data/reports/${id}`;
    
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      return { title: '리포트를 찾을 수 없습니다 - 비포터' };
    }

    const data = await res.json();

    // REST API 형식에 맞춰 데이터 파싱
    const title = data.fields?.title?.stringValue || '작업 리포트';
    const authorName = data.fields?.authorName?.stringValue || '작업자';
    
    // 사진이 있는 경우 After 사진 추출
    let coverImg = 'https://www.beforeter.com/default-og-image.png'; // 디폴트 썸네일
    if (data.fields?.spaces?.arrayValue?.values?.length > 0) {
      const firstSpace = data.fields.spaces.arrayValue.values[0].mapValue.fields;
      if (firstSpace.afterImg?.stringValue) {
         coverImg = firstSpace.afterImg.stringValue;
      }
    }

    return {
      title: `${title} - 비포터`,
      description: `[${authorName}] 프로님의 작업 결과물을 확인해보시겠어요?`,
      openGraph: {
        title: `${title} - 비포터`,
        description: `[${authorName}] 프로님의 작업 결과물을 확인해보시겠어요?`,
        images: [coverImg],
        url: `https://www.beforeter.com/report/${id}`,
        type: 'website',
      }
    };
  } catch (error) {
    console.error("메타태그 생성 중 에러:", error);
    // 에러 발생 시 카톡에 뜨는 최후의 보루 텍스트
    return { 
      title: '비포터 - 당신의 작업 파트너',
      description: '단 2장의 사진으로 전문성을 증명하세요.' 
    };
  }
}

// 💡 2. 실제 유저가 링크를 누르고 들어왔을 때는 메인 App 컴포넌트를 보여줍니다.
export default function ReportDetailPage() {
  return <App />;
}