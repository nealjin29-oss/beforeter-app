import App from "../../page"; 

const PROJECT_ID = "beforeter-72de2";
const APP_ID = 'beforeter-app';

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

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

    if (!res.ok) return fallbackOG;

    const data = await res.json();

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
    return fallbackOG;
  }
}

export default function ProfilePage() {
  return <App />;
}