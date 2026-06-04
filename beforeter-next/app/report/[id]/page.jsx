import App from "../../page"; // 메인 App 컴포넌트 불러오기

const PROJECT_ID = "beforeter-72de2";
const APP_ID = 'beforeter-app';

// 💡 1. 카카오톡 봇이 URL을 읽을 때 실행되는 서버 사이드 메타태그 생성기
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // 💡 [안전장치 1] 에러가 나더라도 무조건 카톡 카드를 띄워줄 '기본 세팅값'
  const fallbackOG = {
    title: '비포터 - 당신의 작업 파트너',
    description: '전문가의 작업 결과물을 지금 확인해보세요.',
    openGraph: {
      title: '비포터 - 당신의 작업 파트너',
      description: '전문가의 작업 결과물을 지금 확인해보세요.',
      images: ['https://www.beforeter.com/default-og-image.png'], // 기본 이미지
      url: `https://www.beforeter.com/report/${id}`,
      type: 'website',
    }
  };

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/artifacts/${APP_ID}/public/data/reports/${id}`;
    
    const res = await fetch(url, { cache: 'no-store' });

    // 문서를 못 찾았을 경우 빈 링크가 아닌 기본 카드를 띄움
    if (!res.ok) return fallbackOG;

    const data = await res.json();

    // 💡 [안전장치 2] 데이터가 비어있어도 절대 에러가 나지 않도록 물음표(?.) 처리
    const title = data.fields?.title?.stringValue || '작업 리포트';
    const authorName = data.fields?.authorName?.stringValue || '작업자';
    
    let coverImg = 'https://www.beforeter.com/default-og-image.png';

    // 💡 [안전장치 3] spaces 배열 파싱 시 극한의 에러 방어
    const spacesArr = data.fields?.spaces?.arrayValue?.values;
    if (spacesArr && spacesArr.length > 0) {
      const firstSpaceFields = spacesArr[0]?.mapValue?.fields;
      // After 이미지가 없으면 Before 이미지라도 가져오도록 백업 처리
      const fetchedImg = firstSpaceFields?.afterImg?.stringValue || firstSpaceFields?.beforeImg?.stringValue;
      if (fetchedImg) {
         coverImg = fetchedImg;
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
    // 💡 [안전장치 4] 최악의 서버 에러 시에도 무조건 카톡 카드는 뜨게 만듦
    return fallbackOG;
  }
}

// 💡 2. 실제 유저가 링크를 누르고 들어왔을 때는 메인 App 컴포넌트를 보여줍니다.
export default function ReportDetailPage() {
  return <App />;
}