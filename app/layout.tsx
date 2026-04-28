import type { Metadata } from 'next'
import { Noto_Serif_KR } from 'next/font/google'
import './globals.css'

const notoSerifKR = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-serif-kr',
  preload: true,
})

export const metadata: Metadata = {
  title: 'GBC Timeline',
  description: '걸즈 밴드 크라이 연대기',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={notoSerifKR.variable}>
      <body>{children}</body>
    </html>
  )
}
