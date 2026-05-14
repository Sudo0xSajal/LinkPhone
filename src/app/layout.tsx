import type { Metadata } from "next";
import { Inter } from "next/font/google";
// @ts-expect-error Next.js handles global CSS side-effect imports at build time
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LinkPhone – Remote Device Control",
  description: "Monitor and control your Android devices remotely.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('lp-theme') || 'dark';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                "dark:bg-slate-800 dark:text-white bg-white text-slate-900 border dark:border-white/10 border-slate-200",
              error:   "dark:bg-red-900/80   bg-red-50",
              success: "dark:bg-green-900/80 bg-green-50",
            },
          }}
        />
      </body>
    </html>
  );
}