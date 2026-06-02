import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from '@vercel/analytics/react'; // 1. Vercel Analytics 추가
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 2. 브라우저 탭에 뜨는 제목을 비포터로 변경했습니다.
export const metadata: Metadata = {
  title: "비포터 - 당신의 작업 파트너",
  description: "단 2장의 사진으로 전문성을 증명하는 작업 리포트 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 3. 언어를 한국어(ko)로 변경
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        
        {/* 4. body 태그 안쪽, children 바로 아래에 Analytics 추가 */}
        <Analytics />
      </body>
    </html>
  );
}