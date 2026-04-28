import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GBC Timeline',
  description: '걸즈 밴드 크라이 연대기',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
