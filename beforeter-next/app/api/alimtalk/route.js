// 버튼 클릭 시 호출되는 함수 예시
const handleSendAlimtalk = async () => {
  try {
    const res = await fetch('/api/send-alimtalk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // 헤더를 추가해 주세요
      },
      body: JSON.stringify({
        phone: '01063496088', // 실제 전송할 번호
        variables: {
          '#{이름}': '홍길동',
          '#{서비스명}': '비포터'
        }
      })
    });

    const data = await res.json();
    console.log('결과:', data);
  } catch (error) {
    console.error('전송 실패:', error);
  }
};