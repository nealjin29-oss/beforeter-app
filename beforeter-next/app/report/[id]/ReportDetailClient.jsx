"use client";

import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ReportDetailClient({ reportId }) {
  const [report, setReport] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      // 전달받은 reportId로 DB에서 리포트 상세 정보를 가져옵니다.
      const docSnap = await getDoc(doc(db, 'artifacts', 'beforeter-app', 'public', 'data', 'reports', reportId));
      if (docSnap.exists()) {
        setReport({ id: docSnap.id, ...docSnap.data() });
      }
    };
    fetchReport();
  }, [reportId]);

  if (!report) return <div style={{ padding: '50px', textAlign: 'center' }}>리포트를 불러오는 중이거나 삭제된 리포트입니다.</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#14b8a6' }}>{report.title}</h1>
      <p style={{ fontWeight: 'bold' }}>작성자: {report.authorName}</p>
      <p>작업일자: {report.taskDate}</p>
      
      {/* 이곳에 기존 App.jsx에 있던 'detail' 뷰의 멋진 UI 코드(사진 전/후 비교 등)를 
        가져와서 입혀주시면 마이그레이션이 완벽하게 끝납니다! 
      */}
    </div>
  );
}