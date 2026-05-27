import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'
import { ThemeProvider } from '@/contexts/theme-context'
import { Toaster } from 'sonner'

const roboto = Roboto({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
  weight: ['300', '400', '500', '700'],
})

export const metadata: Metadata = {
  title: 'ResumeAI — AI-Powered Career Intelligence',
  description: 'Privacy-by-Design AI-powered resume analysis platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={roboto.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('theme');
            if (t === 'light') { document.documentElement.classList.remove('dark'); document.documentElement.classList.add('light'); }
            else { document.documentElement.classList.add('dark'); document.documentElement.classList.remove('light'); }
          } catch(e) {}
        `}} />
      </head>
      <body className={`${roboto.className} antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
