import { NextResponse } from 'next/server';
import { SolapiMessageService } from 'solapi';

// 환경 변수를 사용하여 솔라피 서비스 초기화
const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY,
  process.env.SOLAPI_API_SECRET
);

export async function POST(req) {
  try {
    const { phone, variables } = await req.json();

    const response = await messageService.send({
      to: phone,
      from: process.env.SOLAPI_SENDER_NUMBER,
      kakaoOptions: {
        pfId: process.env.SOLAPI_PF_ID,
        templateId: process.env.SOLAPI_TEMPLATE_ID,
        variables: variables 
      }
    });

    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error('알림톡 전송 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, error: error.message || '전송에 실패했습니다.' },
      { status: 500 }
    );
  }
}