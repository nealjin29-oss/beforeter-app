import { NextResponse } from 'next/server';
import { SolapiMessageService } from 'solapi';

export async function POST(request) {
    try {
        const body = await request.json();
        const { phone, reportTitle, reportUrl } = body;

        // 1. 필수 데이터 확인
        if (!phone || !reportUrl) {
            return NextResponse.json({ error: '필수 정보(전화번호, 링크)가 누락되었습니다.' }, { status: 400 });
        }

        // 2. 솔라피 환경변수 세팅 확인
        if (!process.env.SOLAPI_API_KEY || !process.env.SOLAPI_API_SECRET) {
            console.error("🚨 솔라피 API 키가 환경변수(.env.local)에 설정되지 않았습니다.");
            return NextResponse.json({ error: '서버 설정 오류 (솔라피 API 키 누락)' }, { status: 500 });
        }

        // 3. 솔라피 서비스 초기화
        const messageService = new SolapiMessageService(
            process.env.SOLAPI_API_KEY, 
            process.env.SOLAPI_API_SECRET
        );

        // 💡 환경변수에 하이픈(-)이 포함되어 있을 수 있으므로 숫자만 추출합니다.
        const senderNumber = process.env.SOLAPI_SENDER_NUMBER.replace(/[^0-9]/g, '');

        // 4. 알림톡 발송 요청
        // 💡 주의: 템플릿 내의 변수명은 솔라피에서 승인받은 템플릿과 100% 동일해야 발송됩니다.
        const result = await messageService.send({
            to: phone,
            from: senderNumber, // 등록된 발신번호 (하이픈 제거됨)
            kakaoOptions: {
                pfId: process.env.SOLAPI_PF_ID, // 연동된 카카오 채널 PFID
                templateId: process.env.SOLAPI_TEMPLATE_ID, // 승인받은 템플릿 ID
                
                // 💡 솔라피에 등록하신 템플릿 내용의 변수명에 맞게 매핑합니다.
                // 만약 솔라피 템플릿에 다른 이름의 변수를 쓰셨다면 아래 키 값을 맞춰주세요.
                variables: {
                    "#{작업제목}": reportTitle || "작업",
                    "#{리포트URL}": reportUrl
                }
            }
        });

        console.log(`[알림톡 발송 성공] 번호: ${phone}, 결과 ID: ${result.groupId}`);
        return NextResponse.json({ success: true, message: '알림톡 전송 완료' }, { status: 200 });

    } catch (error) {
        console.error('🚨 알림톡 전송 에러:', error);
        return NextResponse.json({ error: '알림톡 전송 실패 (서버 에러)', details: error.message }, { status: 500 });
    }
}