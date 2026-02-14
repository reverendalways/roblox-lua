"use client";

import { Geist, Geist_Mono } from "next/font/google";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { Navbar } from "../components/ProfileDropdown";
import OnlineStatusPinger from "../components/OnlineStatusPinger";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <html lang="en">
        <head>

          <script async src="https://www.googletagmanager.com/gtag/js?id=G-B2KF3BR6FL"></script>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-B2KF3BR6FL');
              `,
            }}
          />

          <title>Roblox Scripts & Exploits – ScriptVoid.com</title>
          <meta name="title" content="Roblox Scripts & Exploits – ScriptVoid.com" />
          <meta name="description" content="A modern website packed with dozens of features for the Roblox exploiting community. Search, discover, and upload the best scripts for your favorite Roblox experiences" />
          <meta name="keywords" content="Roblox scripts, Roblox script hub, exploiting scripts, exploit scripts, Roblox exploit community, Roblox exploits, script sharing" />

          <meta name="author" content="ScriptVoid" />
          <meta name="robots" content="index, follow" />
          <meta name="language" content="English" />
          <meta name="revisit-after" content="7 days" />

          <meta property="og:type" content="website" />
          <meta property="og:url" content={`${BASE_URL}/`} />
          <meta property="og:title" content="Roblox Scripts & Exploits – ScriptVoid" />
          <meta property="og:description" content="A modern website packed with dozens of features for the Roblox exploiting community. Search, discover, and upload the best scripts for your favorite Roblox experiences" />
          <meta property="og:image" content={`${BASE_URL}/og-image.webp`} />
          <meta property="og:site_name" content="ScriptVoid" />

          <meta property="twitter:card" content="summary_large_image" />
          <meta property="twitter:url" content={`${BASE_URL}/`} />
          <meta property="twitter:title" content="Roblox Scripts & Exploits – ScriptVoid" />
          <meta property="twitter:description" content="A modern website packed with dozens of features for the Roblox exploiting community. Search, discover, and upload the best scripts for your favorite Roblox experiences" />
          <meta property="twitter:image" content={`${BASE_URL}/og-image.webp`} />

          <link rel="icon" type="image/x-icon" href="/favicon.ico?v=6" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=6" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon.png?v=6" />
          <link rel="apple-touch-icon" sizes="180x180" href="/favicon.png?v=6" />
          <link rel="shortcut icon" href="/favicon.ico?v=6" />
          <link rel="icon" href="/favicon.ico?v=6" />
          <meta name="msapplication-TileImage" content="/favicon.png?v=6" />
          <meta name="theme-color" content="#1f2937" />
          <meta name="msapplication-TileColor" content="#1f2937" />

          <link rel="stylesheet" href="https://unpkg.com/nprogress@0.2.0/nprogress.css" />
          <style dangerouslySetInnerHTML={{
            __html: `
              #nprogress {
                pointer-events: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
                z-index: 9999;
              }
              #nprogress .bar {
                background: #3b82f6;
                position: fixed;
                z-index: 9999;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
              }
              #nprogress .peg {
                display: block;
                position: absolute;
                right: 0px;
                width: 100px;
                height: 100%;
                box-shadow: 0 0 10px #3b82f6, 0 0 5px #3b82f6;
                opacity: 1.0;
                transform: rotate(3deg) translate(0px, -4px);
              }
            `
          }} />

          <meta name="theme-color" content="#1f2937" />
          <meta name="msapplication-TileColor" content="#1f2937" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />

          <link rel="canonical" href={`${BASE_URL}/`} />

          <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3047097254491310" crossOrigin="anonymous"></script>

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": "ScriptVoid",
                "description": "The best place to find and share Roblox scripts. Upload your own scripts, discover new ones, and connect with the exploiting community.",
                "url": BASE_URL,
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": `${BASE_URL}/home?search={search_term_string}`,
                  "query-input": "required name=search_term_string"
                },
                "publisher": {
                  "@type": "Organization",
                  "name": "ScriptVoid",
                  "logo": {
                    "@type": "ImageObject",
                    "url": `${BASE_URL}/favicon.png`
                  }
                }
              })
            }}
          />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900`}
        >

          <script src="https://unpkg.com/nprogress@0.2.0/nprogress.js"></script>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                NProgress.configure({
                  showSpinner: false,
                  speed: 0,
                  minimum: 0
                });

                window.showLoadingBar = () => NProgress.start();
                window.hideLoadingBar = () => NProgress.done();
              `
            }}
          />

          <div className="min-h-screen flex flex-col bg-gray-900">
            <div className="flex-shrink-0">
              <Navbar />
            </div>
            <main className="flex-1">{children}</main>
            <OnlineStatusPinger />
            <footer className="bg-gray-800 text-gray-300 text-xs sm:text-sm">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center gap-4">
                <span className="font-semibold whitespace-nowrap sm:order-1">
                  ScriptVoid © All Rights Reserved
                </span>
                <nav className="flex sm:flex-1 items-center justify-center gap-6 sm:order-2">
                  <a
                    href="/rules"
                    className="hover:text-white transition-colors"
                  >
                    Rules
                  </a>
                  <a
                    href="/upload"
                    className="hover:text-white transition-colors"
                  >
                    Creator
                  </a>
                  <a
                    href="https://discord.gg/3WwQsq78mE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Discord
                  </a>
                </nav>
                <div className="text-gray-400 font-semibold whitespace-nowrap sm:order-3">
                  #1 Script Sharing Platform
                </div>
              </div>
            </footer>
          </div>
        </body>
      </html>
    </AuthProvider>
  );
}
