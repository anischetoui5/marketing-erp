import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarketingERP",
  description: "Marketing Agency Management Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Read persisted theme from localStorage before first paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=JSON.parse(localStorage.getItem('theme')||'{}');document.documentElement.setAttribute('data-theme',t.state?.theme||'dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
