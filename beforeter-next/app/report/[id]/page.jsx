import App from "../../page"; // 메인 App 컴포넌트 불러오기

const PROJECT_ID = "beforeter-72de2";
const APP_ID = 'beforeter-app';

// 💡 1. 카카오톡 봇이 URL을 읽을 때 실행되는 서버 사이드 메타태그 생성기
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // 💡 [안전장치 1] 에러가 나더라도 무조건 카톡 카드를 띄워줄 '기본 세팅값'
  const fallbackOG = {
    title: '비포터 - 오픈 프로필',
    description: '전문가의 신뢰할 수 있는 작업 포트폴리오를 확인해보세요.',
    openGraph: {
      title: '비포터 - 오픈 프로필',
      description: '전문가의 신뢰할 수 있는 작업 포트폴리오를 확인해보세요.',
      images: ['https://www.beforeter.com/default-og-image.png'],
      url: `https://www.beforeter.com/profile/${id}`,
      type: 'profile',
    }
  };

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/artifacts/${APP_ID}/public/data/users/${id}`;
    
    const res = await fetch(url, { cache: 'no-store' });

    // 문서를 못 찾았을 경우 빈 링크가 아닌 기본 카드를 띄움
    if (!res.ok) return fallbackOG;

    const data = await res.json();

    // 💡 [안전장치 2] 데이터가 비어있어도 절대 에러가 나지 않도록 물음표(?.) 처리
    const name = data.fields?.name?.stringValue || '작업자';
    const company = data.fields?.company?.stringValue ? `(${data.fields.company.stringValue})` : '';
    const intro = data.fields?.intro?.stringValue || '전문가의 꼼꼼한 작업 결과를 확인해보세요.';
    const coverImg = data.fields?.profilePic?.stringValue || 'https://www.beforeter.com/default-og-image.png';
    const area = data.fields?.activityArea?.stringValue ? `[주요거점: ${data.fields.activityArea.stringValue}]` : '';

    return {
      title: `${name} ${company} - 비포터 프로필`,
      description: `${area} ${intro}`,
      openGraph: {
        title: `${name} ${company} - 비포터 프로필`,
        description: `${area} ${intro}`,
        images: [coverImg],
        url: `https://www.beforeter.com/profile/${id}`,
        type: 'profile',
      }
    };
  } catch (error) {
    console.error("프로필 메타태그 생성 중 에러:", error);
    // 💡 [안전장치 4] 최악의 서버 에러 시에도 무조건 카톡 카드는 뜨게 만듦
    return fallbackOG;
  }
}

// 💡 2. 실제 접속 시에는 메인 App 컴포넌트를 보여줍니다.
export default function ProfilePage() {
  return <App />;
}