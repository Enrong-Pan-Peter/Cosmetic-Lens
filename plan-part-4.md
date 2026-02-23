## 10. Frontend Pages & Components

### 10.1 Page Structure Overview

```
src/pages/
├── index.astro                    → Redirect to /en/
├── api/
│   ├── analyze.ts                 → Product analysis endpoint
│   ├── search-product.ts          → Open Beauty Facts search
│   ├── profile.ts                 → User profile CRUD
│   └── history.ts                 → Analysis history
├── en/
│   ├── index.astro                → English home page
│   ├── chat.astro                 → English analysis page
│   ├── glossary.astro             → English glossary
│   ├── profile.astro              → User profile (auth required)
│   ├── history.astro              → Analysis history (auth required)
│   ├── login.astro                → Login page
│   ├── signup.astro               → Signup page
│   └── education/
│       ├── index.astro            → Education landing
│       └── [slug].astro           → Individual articles
└── zh/
    └── (mirrors /en/ structure)
```

### 10.2 Component Structure

```
src/components/
├── layout/
│   ├── BaseLayout.astro           → Main HTML wrapper
│   ├── Navigation.astro           → Top nav bar
│   ├── Footer.astro               → Site footer
│   └── LanguageSwitcher.jsx       → EN/ZH toggle
├── chat/
│   ├── ChatInterface.jsx          → Main chat component
│   ├── ChatMessage.jsx            → Individual message bubble
│   ├── AnalysisDisplay.jsx        → Formatted analysis result
│   ├── ProductInput.jsx           → Input form
│   └── LoadingIndicator.jsx       → Loading animation
├── glossary/
│   ├── GlossaryTable.jsx          → Searchable table
│   └── GlossaryFilters.jsx        → Search & filter controls
├── education/
│   ├── ArticleCard.jsx            → Article preview card
│   ├── FunFactCard.jsx            → Expandable fun fact
│   └── ArticleList.jsx            → Grid of articles
├── profile/
│   ├── ProfileForm.jsx            → Profile edit form
│   ├── SkinTypeSelect.jsx         → Skin type dropdown
│   ├── ConcernsSelect.jsx         → Multi-select concerns
│   └── AllergiesSelect.jsx        → Multi-select allergies
├── auth/
│   ├── LoginForm.jsx              → Login form
│   ├── SignupForm.jsx             → Signup form
│   └── AuthGuard.jsx              → Protected route wrapper
└── ui/
    ├── Button.jsx                 → Reusable button
    ├── Input.jsx                  → Reusable input
    ├── Select.jsx                 → Reusable select
    ├── Card.jsx                   → Card container
    ├── Modal.jsx                  → Modal dialog
    └── Toast.jsx                  → Notification toast
```

### 10.3 Layout Components

#### BaseLayout.astro

**File Location:** `/src/components/layout/BaseLayout.astro`

```astro
---
import Navigation from './Navigation.astro';
import Footer from './Footer.astro';
import '../styles/global.css';

export interface Props {
  title: string;
  description?: string;
  lang?: 'en' | 'zh';
  requiresAuth?: boolean;
}

const { 
  title, 
  description = '', 
  lang = 'en',
  requiresAuth = false 
} = Astro.props;

const siteName = lang === 'zh' ? '成分透视' : 'CosmeticLens';
const fullTitle = `${title} | ${siteName}`;
---

<!DOCTYPE html>
<html lang={lang === 'zh' ? 'zh-CN' : 'en'}>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content={description} />
  
  <title>{fullTitle}</title>
  
  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  
  <!-- Open Graph -->
  <meta property="og:title" content={fullTitle} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content={lang === 'zh' ? 'zh_CN' : 'en_US'} />
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&display=swap" rel="stylesheet" />
</head>
<body class="min-h-screen flex flex-col bg-gray-50">
  <Navigation lang={lang} />
  
  <main class="flex-grow">
    <slot />
  </main>
  
  <Footer lang={lang} />
  
  <!-- Auth check script for protected pages -->
  {requiresAuth && (
    <script>
      import { supabase } from '../lib/supabase';
      
      async function checkAuth() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.href = `/${document.documentElement.lang === 'zh-CN' ? 'zh' : 'en'}/login`;
        }
      }
      checkAuth();
    </script>
  )}
</body>
</html>
```

#### Navigation.astro

**File Location:** `/src/components/layout/Navigation.astro`

```astro
---
import LanguageSwitcher from './LanguageSwitcher.jsx';
import { getTranslations } from '../../i18n/utils';

export interface Props {
  lang: 'en' | 'zh';
}

const { lang } = Astro.props;
const t = getTranslations(lang);
const currentPath = Astro.url.pathname;

const navLinks = [
  { href: `/${lang}/`, label: t.nav.home },
  { href: `/${lang}/chat`, label: t.nav.analyze },
  { href: `/${lang}/glossary`, label: t.nav.glossary },
  { href: `/${lang}/education`, label: t.nav.education },
];
---

<nav class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between h-16">
      <!-- Logo -->
      <div class="flex items-center">
        <a href={`/${lang}/`} class="flex items-center space-x-2">
          <span class="text-2xl">🔍</span>
          <span class="font-bold text-xl text-gray-900">
            {lang === 'zh' ? '成分透视' : 'CosmeticLens'}
          </span>
        </a>
      </div>
      
      <!-- Desktop Navigation -->
      <div class="hidden md:flex items-center space-x-8">
        {navLinks.map(link => (
          <a 
            href={link.href}
            class={`text-sm font-medium transition-colors ${
              currentPath === link.href 
                ? 'text-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {link.label}
          </a>
        ))}
      </div>
      
      <!-- Right side -->
      <div class="flex items-center space-x-4">
        <LanguageSwitcher client:load lang={lang} currentPath={currentPath} />
        
        <!-- Auth buttons (shown/hidden via JS) -->
        <div id="auth-buttons" class="hidden md:flex items-center space-x-3">
          <a 
            href={`/${lang}/login`}
            class="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            {t.nav.login}
          </a>
          <a 
            href={`/${lang}/signup`}
            class="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t.nav.signup}
          </a>
        </div>
        
        <!-- Profile dropdown (shown when logged in) -->
        <div id="profile-menu" class="hidden relative">
          <button 
            id="profile-button"
            class="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <span class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span class="text-blue-600">👤</span>
            </span>
          </button>
          <!-- Dropdown content added via JS -->
        </div>
        
        <!-- Mobile menu button -->
        <button 
          id="mobile-menu-button"
          class="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
  </div>
  
  <!-- Mobile menu -->
  <div id="mobile-menu" class="hidden md:hidden border-t border-gray-200">
    <div class="px-4 py-3 space-y-2">
      {navLinks.map(link => (
        <a 
          href={link.href}
          class={`block px-3 py-2 rounded-lg text-base font-medium ${
            currentPath === link.href 
              ? 'bg-blue-50 text-blue-600' 
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          {link.label}
        </a>
      ))}
    </div>
  </div>
</nav>

<script>
  import { supabase } from '../../lib/supabase';
  
  // Check auth state and update UI
  async function updateAuthUI() {
    const { data: { session } } = await supabase.auth.getSession();
    const authButtons = document.getElementById('auth-buttons');
    const profileMenu = document.getElementById('profile-menu');
    
    if (session) {
      authButtons?.classList.add('hidden');
      profileMenu?.classList.remove('hidden');
    } else {
      authButtons?.classList.remove('hidden');
      profileMenu?.classList.add('hidden');
    }
  }
  
  // Mobile menu toggle
  document.getElementById('mobile-menu-button')?.addEventListener('click', () => {
    document.getElementById('mobile-menu')?.classList.toggle('hidden');
  });
  
  // Initialize
  updateAuthUI();
  
  // Listen for auth changes
  supabase.auth.onAuthStateChange(() => {
    updateAuthUI();
  });
</script>
```

#### Footer.astro

**File Location:** `/src/components/layout/Footer.astro`

```astro
---
import { getTranslations } from '../../i18n/utils';

export interface Props {
  lang: 'en' | 'zh';
}

const { lang } = Astro.props;
const t = getTranslations(lang);
---

<footer class="bg-gray-900 text-gray-300">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- About -->
      <div>
        <h3 class="text-white font-semibold mb-4">{t.footer.about}</h3>
        <p class="text-sm text-gray-400 leading-relaxed">
          {t.footer.about_text}
        </p>
      </div>
      
      <!-- Links -->
      <div>
        <h3 class="text-white font-semibold mb-4">{t.footer.links}</h3>
        <ul class="space-y-2 text-sm">
          <li>
            <a href={`/${lang}/education`} class="hover:text-white transition-colors">
              {t.nav.education}
            </a>
          </li>
          <li>
            <a href={`/${lang}/glossary`} class="hover:text-white transition-colors">
              {t.nav.glossary}
            </a>
          </li>
          <li>
            <a href="#" class="hover:text-white transition-colors">
              {t.footer.privacy}
            </a>
          </li>
          <li>
            <a href="#" class="hover:text-white transition-colors">
              {t.footer.terms}
            </a>
          </li>
        </ul>
      </div>
      
      <!-- Disclaimer -->
      <div>
        <h3 class="text-white font-semibold mb-4">{t.footer.disclaimer}</h3>
        <p class="text-sm text-gray-400 leading-relaxed">
          {t.footer.disclaimer_text}
        </p>
      </div>
    </div>
    
    <div class="border-t border-gray-800 mt-8 pt-8 text-sm text-gray-500 text-center">
      {t.footer.copyright}
    </div>
  </div>
</footer>
```

#### LanguageSwitcher.jsx

**File Location:** `/src/components/layout/LanguageSwitcher.jsx`

```jsx
import { useState } from 'react';

export default function LanguageSwitcher({ lang, currentPath }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const getOtherLangPath = () => {
    const pathWithoutLang = currentPath.replace(/^\/(en|zh)/, '');
    const otherLang = lang === 'en' ? 'zh' : 'en';
    return `/${otherLang}${pathWithoutLang || '/'}`;
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <span>🌐</span>
        <span>{lang === 'en' ? 'EN' : '中文'}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <a
              href={lang === 'en' ? currentPath : getOtherLangPath()}
              className={`block px-4 py-2 text-sm rounded-t-lg ${
                lang === 'en' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              English
            </a>
            <a
              href={lang === 'zh' ? currentPath : getOtherLangPath()}
              className={`block px-4 py-2 text-sm rounded-b-lg ${
                lang === 'zh' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              中文
            </a>
          </div>
        </>
      )}
    </div>
  );
}
```

### 10.4 Chat Components

#### ChatInterface.jsx

**File Location:** `/src/components/chat/ChatInterface.jsx`

```jsx
import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ProductInput from './ProductInput';
import LoadingIndicator from './LoadingIndicator';
import { supabase } from '../../lib/supabase';

export default function ChatInterface({ lang, translations: t }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const messagesEndRef = useRef(null);
  
  // Check for authenticated user
  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    }
    getUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id || null);
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleAnalyze = async (input) => {
    if (!input.trim() || isLoading) return;
    
    setError(null);
    
    // Add user message
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: input,
          language: lang,
          userId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.data,
          cached: data.cached,
          product: data.product
        }]);
      } else {
        // Handle specific errors
        switch (data.error) {
          case 'rate_limit_exceeded':
            setError(t.chat.error_rate_limit);
            break;
          case 'product_not_found':
            setError(t.chat.error_not_found);
            break;
          default:
            setError(t.chat.error_generic);
        }
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(t.chat.error_generic);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNewChat = () => {
    setMessages([]);
    setError(null);
  };
  
  const examples = [
    t.chat.example_1,
    t.chat.example_2,
    t.chat.example_3
  ];
  
  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-4xl mx-auto">
      {/* Messages area */}
      <div className="flex-grow overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 ? (
          // Welcome screen
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {t.chat.title}
            </h1>
            <p className="text-gray-600 mb-8 max-w-lg mx-auto">
              {lang === 'zh' 
                ? '输入产品名称或粘贴成分表，获取专业的成分分析'
                : 'Enter a product name or paste an ingredient list to get a professional analysis'}
            </p>
            
            {/* Tips */}
            <div className="bg-blue-50 rounded-xl p-6 max-w-lg mx-auto mb-8 text-left">
              <h3 className="font-semibold text-blue-900 mb-3">
                {t.chat.tips_title}
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  {t.chat.tip_1}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  {t.chat.tip_2}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  {t.chat.tip_3}
                </li>
              </ul>
            </div>
            
            {/* Example buttons */}
            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-3">{t.chat.examples_title}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {examples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnalyze(example)}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Login prompt for anonymous users */}
            {!userId && (
              <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
                <a href={`/${lang}/login`} className="text-blue-600 hover:underline">
                  {t.nav.login}
                </a>
                {' '}{t.chat.login_prompt}
              </div>
            )}
          </div>
        ) : (
          // Chat messages
          <>
            {messages.map((message, index) => (
              <ChatMessage 
                key={index}
                message={message}
                lang={lang}
              />
            ))}
            
            {isLoading && (
              <LoadingIndicator text={t.chat.analyzing} />
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Input area */}
      <div className="border-t border-gray-200 bg-white p-4">
        {messages.length > 0 && (
          <div className="flex justify-end mb-3">
            <button
              onClick={handleNewChat}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              {t.chat.new_chat}
            </button>
          </div>
        )}
        
        <ProductInput
          onSubmit={handleAnalyze}
          isLoading={isLoading}
          placeholder={t.chat.placeholder}
          buttonText={t.chat.analyze_button}
        />
      </div>
    </div>
  );
}
```

#### ChatMessage.jsx

**File Location:** `/src/components/chat/ChatMessage.jsx`

```jsx
import AnalysisDisplay from './AnalysisDisplay';

export default function ChatMessage({ message, lang }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Avatar */}
        <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            {isUser ? '👤' : '🔍'}
          </div>
          
          <div className={`flex-grow ${isUser ? 'text-right' : ''}`}>
            {/* Message content */}
            {isUser ? (
              <div className="inline-block bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-tr-md">
                {message.content}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md p-4 shadow-sm">
                {message.product && (
                  <div className="flex items-center gap-3 pb-3 mb-3 border-b border-gray-100">
                    {message.product.image && (
                      <img 
                        src={message.product.image} 
                        alt={message.product.name}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <div className="font-medium text-gray-900">
                        {message.product.name}
                      </div>
                      {message.product.brand && (
                        <div className="text-sm text-gray-500">
                          {message.product.brand}
                        </div>
                      )}
                    </div>
                    {message.cached && (
                      <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                        {lang === 'zh' ? '缓存结果' : 'Cached'}
                      </span>
                    )}
                  </div>
                )}
                
                <AnalysisDisplay 
                  content={message.content}
                  lang={lang}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### AnalysisDisplay.jsx

**File Location:** `/src/components/chat/AnalysisDisplay.jsx`

```jsx
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function AnalysisDisplay({ content, lang }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="relative">
      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 p-1"
        title={lang === 'zh' ? '复制' : 'Copy'}
      >
        {copied ? (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
      
      {/* Markdown content */}
      <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700">
        <ReactMarkdown
          components={{
            // Custom table styling
            table: ({ children }) => (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-gray-50">{children}</thead>
            ),
            th: ({ children }) => (
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-2 text-sm text-gray-700 border-t border-gray-100">
                {children}
              </td>
            ),
            // Emoji headers
            h2: ({ children }) => (
              <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3 flex items-center gap-2">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">
                {children}
              </h3>
            ),
            // Strong for ingredient names
            strong: ({ children }) => (
              <strong className="font-semibold text-gray-900">{children}</strong>
            ),
            // Warning boxes (detect by emoji)
            p: ({ children }) => {
              const text = children?.toString() || '';
              if (text.includes('⚠️') || text.includes('🚫')) {
                return (
                  <p className="bg-amber-50 border-l-4 border-amber-400 p-3 my-2 text-amber-800">
                    {children}
                  </p>
                );
              }
              if (text.includes('✅')) {
                return (
                  <p className="text-green-700">{children}</p>
                );
              }
              if (text.includes('❌')) {
                return (
                  <p className="text-red-700">{children}</p>
                );
              }
              return <p>{children}</p>;
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
```

#### ProductInput.jsx

**File Location:** `/src/components/chat/ProductInput.jsx`

```jsx
import { useState } from 'react';

export default function ProductInput({ onSubmit, isLoading, placeholder, buttonText }) {
  const [input, setInput] = useState('');
  const [isMultiline, setIsMultiline] = useState(false);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSubmit(input.trim());
      setInput('');
      setIsMultiline(false);
    }
  };
  
  const handleKeyDown = (e) => {
    // Submit on Enter (unless Shift is held for multiline)
    if (e.key === 'Enter' && !e.shiftKey && !isMultiline) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);
    // Auto-detect if input looks like ingredient list (contains commas or newlines)
    setIsMultiline(value.includes(',') || value.includes('\n'));
  };
  
  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-end gap-3">
        <div className="flex-grow relative">
          {isMultiline ? (
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          ) : (
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          )}
          
          {/* Toggle multiline button */}
          <button
            type="button"
            onClick={() => setIsMultiline(!isMultiline)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            title={isMultiline ? 'Single line' : 'Paste ingredient list'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMultiline ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="hidden sm:inline">...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden sm:inline">{buttonText}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
```

#### LoadingIndicator.jsx

**File Location:** `/src/components/chat/LoadingIndicator.jsx`

```jsx
export default function LoadingIndicator({ text }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
        🔍
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-gray-500 text-sm">{text}</span>
        </div>
      </div>
    </div>
  );
}
```

### 10.5 Glossary Components

#### GlossaryTable.jsx

**File Location:** `/src/components/glossary/GlossaryTable.jsx`

```jsx
import { useState, useMemo } from 'react';

export default function GlossaryTable({ entries, categories, lang, translations: t }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortField, setSortField] = useState('inci_name');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    let result = entries;
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(entry => 
        entry.inci_name.toLowerCase().includes(searchLower) ||
        entry.chinese_name.includes(search) ||
        entry.aliases_en?.some(a => a.toLowerCase().includes(searchLower)) ||
        entry.aliases_zh?.some(a => a.includes(search)) ||
        (lang === 'zh' ? entry.function_zh : entry.function_en)?.toLowerCase().includes(searchLower)
      );
    }
    
    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(entry => entry.category === selectedCategory);
    }
    
    // Sort
    result = [...result].sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
    
    return result;
  }, [entries, search, selectedCategory, sortField, sortDirection, lang]);
  
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };
  
  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return lang === 'zh' ? category?.name_zh : category?.name_en;
  };
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-grow relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.glossary.search_placeholder}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        {/* Category filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          <option value="all">{t.glossary.all_categories}</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {lang === 'zh' ? category.name_zh : category.name_en}
            </option>
          ))}
        </select>
      </div>
      
      {/* Results count */}
      <div className="text-sm text-gray-500">
        {t.glossary.showing} {filteredEntries.length} {t.glossary.of} {entries.length} {t.glossary.ingredients}
      </div>
      
      {/* Table */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {t.glossary.no_results}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('inci_name')}
                >
                  {t.glossary.columns.inci}
                  <SortIcon field="inci_name" />
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('chinese_name')}
                >
                  {t.glossary.columns.chinese}
                  <SortIcon field="chinese_name" />
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('category')}
                >
                  {t.glossary.columns.category}
                  <SortIcon field="category" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.glossary.columns.function}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEntries.map((entry, index) => (
                <tr 
                  key={entry.inci_name}
                  id={entry.inci_name.toLowerCase().replace(/\s+/g, '-')}
                  className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {entry.inci_name}
                    </div>
                    {entry.aliases_en?.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {entry.aliases_en.join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900">{entry.chinese_name}</div>
                    {entry.aliases_zh?.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {entry.aliases_zh.join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                      {getCategoryName(entry.category)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {lang === 'zh' ? entry.function_zh : entry.function_en}
                    {entry.notes_en && (
                      <div className="text-xs text-gray-500 mt-1 italic">
                        {lang === 'zh' ? entry.notes_zh : entry.notes_en}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

### 10.6 Education Components

#### FunFactCard.jsx

**File Location:** `/src/components/education/FunFactCard.jsx`

```jsx
import { useState } from 'react';

export default function FunFactCard({ fact, glossaryPath, lang }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div 
      className={`bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-md ${
        isExpanded ? 'shadow-md' : ''
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <span className="text-2xl">{fact.icon}</span>
        <h3 className="flex-grow font-medium text-gray-900">
          {fact.title}
        </h3>
        <span className={`text-amber-600 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
      
      {/* Expandable content */}
      <div className={`overflow-hidden transition-all duration-300 ${
        isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-4 pb-4">
          <p className="text-gray-700 leading-relaxed mb-3">
            {fact.content}
          </p>
          
          {fact.ingredient_link && (
            <a
              href={`${glossaryPath}#${fact.ingredient_link}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900 font-medium"
            >
              {lang === 'zh' ? '在成分词典中查看' : 'View in glossary'}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### ArticleCard.jsx

**File Location:** `/src/components/education/ArticleCard.jsx`

```jsx
export default function ArticleCard({ article, lang, basePath }) {
  return (
    <a 
      href={`${basePath}/${article.slug}`}
      className="group block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
    >
      {/* Image placeholder */}
      {article.image ? (
        <img 
          src={article.image} 
          alt={article.title}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
          <span className="text-4xl">📚</span>
        </div>
      )}
      
      {/* Content */}
      <div className="p-5">
        {/* Category badge */}
        {article.category && (
          <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full mb-3">
            {article.category}
          </span>
        )}
        
        <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
          {article.title}
        </h3>
        
        <p className="text-gray-600 text-sm line-clamp-2 mb-4">
          {article.description}
        </p>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{article.readingTime} {lang === 'zh' ? '分钟阅读' : 'min read'}</span>
          <span className="text-blue-600 group-hover:translate-x-1 transition-transform">
            →
          </span>
        </div>
      </div>
    </a>
  );
}
```

### 10.7 Profile Components

#### ProfileForm.jsx

**File Location:** `/src/components/profile/ProfileForm.jsx`

```jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function ProfileForm({ lang, translations: t }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  
  const [profile, setProfile] = useState({
    skin_type: '',
    sensitivity: '',
    allergies: [],
    allergies_other: '',
    concerns: [],
    is_pregnant: false,
    price_preference: 'none',
    preferred_language: lang
  });
  
  // Load profile on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const response = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        const { data } = await response.json();
        if (data) {
          setProfile(prev => ({ ...prev, ...data }));
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadProfile();
  }, []);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage({ type: 'error', text: t.profile.login_required });
        return;
      }
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(profile)
      });
      
      const { success } = await response.json();
      
      if (success) {
        setMessage({ type: 'success', text: t.profile.saved });
      } else {
        setMessage({ type: 'error', text: t.profile.save_error });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: t.profile.save_error });
    } finally {
      setSaving(false);
    }
  };
  
  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };
  
  const toggleArrayItem = (field, item) => {
    setProfile(prev => {
      const current = prev[field] || [];
      const updated = current.includes(item)
        ? current.filter(i => i !== item)
        : [...current, item];
      return { ...prev, [field]: updated };
    });
  };
  
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded-lg w-full" />
        <div className="h-10 bg-gray-200 rounded-lg w-full" />
        <div className="h-10 bg-gray-200 rounded-lg w-full" />
      </div>
    );
  }
  
  const skinTypes = [
    { value: 'oily', label: t.skin_types.oily },
    { value: 'dry', label: t.skin_types.dry },
    { value: 'combination', label: t.skin_types.combination },
    { value: 'normal', label: t.skin_types.normal }
  ];
  
  const sensitivityLevels = [
    { value: 'low', label: t.sensitivity_levels.low },
    { value: 'medium', label: t.sensitivity_levels.medium },
    { value: 'high', label: t.sensitivity_levels.high }
  ];
  
  const concerns = [
    { value: 'acne', label: t.concerns.acne },
    { value: 'aging', label: t.concerns.aging },
    { value: 'hyperpigmentation', label: t.concerns.hyperpigmentation },
    { value: 'dehydration', label: t.concerns.dehydration },
    { value: 'dryness', label: t.concerns.dryness },
    { value: 'oiliness', label: t.concerns.oiliness },
    { value: 'redness', label: t.concerns.redness },
    { value: 'large_pores', label: t.concerns.large_pores },
    { value: 'dullness', label: t.concerns.dullness },
    { value: 'texture', label: t.concerns.texture }
  ];
  
  const allergens = [
    { value: 'fragrance', label: t.allergens.fragrance },
    { value: 'essential_oils', label: t.allergens.essential_oils },
    { value: 'alcohol', label: t.allergens.alcohol },
    { value: 'sulfates', label: t.allergens.sulfates },
    { value: 'parabens', label: t.allergens.parabens },
    { value: 'silicones', label: t.allergens.silicones }
  ];
  
  const priceRanges = [
    { value: 'budget', label: t.price_ranges.budget },
    { value: 'mid', label: t.price_ranges.mid },
    { value: 'luxury', label: t.price_ranges.luxury },
    { value: 'none', label: t.price_ranges.no_preference }
  ];
  
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Skin Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t.profile.skin_type}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {skinTypes.map(type => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleChange('skin_type', type.value)}
              className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                profile.skin_type === type.value
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Sensitivity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t.profile.sensitivity}
        </label>
        <div className="space-y-2">
          {sensitivityLevels.map(level => (
            <label
              key={level.value}
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                profile.sensitivity === level.value
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="sensitivity"
                value={level.value}
                checked={profile.sensitivity === level.value}
                onChange={(e) => handleChange('sensitivity', e.target.value)}
                className="sr-only"
              />
              <span className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                profile.sensitivity === level.value
                  ? 'border-blue-600'
                  : 'border-gray-300'
              }`}>
                {profile.sensitivity === level.value && (
                  <span className="w-2 h-2 bg-blue-600 rounded-full" />
                )}
              </span>
              <span className="text-sm text-gray-700">{level.label}</span>
            </label>
          ))}
        </div>
      </div>
      
      {/* Concerns */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t.profile.concerns}
        </label>
        <div className="flex flex-wrap gap-2">
          {concerns.map(concern => (
            <button
              key={concern.value}
              type="button"
              onClick={() => toggleArrayItem('concerns', concern.value)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                profile.concerns?.includes(concern.value)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {concern.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Allergies */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t.profile.allergies}
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {allergens.map(allergen => (
            <button
              key={allergen.value}
              type="button"
              onClick={() => toggleArrayItem('allergies', allergen.value)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                profile.allergies?.includes(allergen.value)
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {allergen.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={profile.allergies_other || ''}
          onChange={(e) => handleChange('allergies_other', e.target.value)}
          placeholder={t.profile.allergies_other}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      {/* Pregnancy */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={profile.is_pregnant}
            onChange={(e) => handleChange('is_pregnant', e.target.checked)}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div>
            <span className="font-medium text-gray-900">{t.profile.pregnant}</span>
            <p className="text-sm text-gray-500">{t.profile.pregnant_desc}</p>
          </div>
        </label>
      </div>
      
      {/* Price Preference */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t.profile.price_range}
        </label>
        <select
          value={profile.price_preference}
          onChange={(e) => handleChange('price_preference', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          {priceRanges.map(range => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}
      
      {/* Submit */}
      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? t.profile.saving : t.profile.save}
      </button>
    </form>
  );
}
```

---

## 11. LLM Integration & Prompting

### 11.1 LLM Integration Overview

The LLM integration is the core of CosmeticLens, responsible for generating accurate, helpful product analyses. This section covers the detailed implementation.

### 11.2 Supabase Client Setup

**File Location:** `/src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role (for API routes only)
export function createServerClient() {
  return createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
```

### 11.3 Gemini API Integration

**File Location:** `/src/lib/gemini.ts`

```typescript
interface GeminiRequest {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}

interface GeminiResponse {
  success: boolean;
  content?: string;
  error?: string;
}

export async function callGemini({
  systemPrompt,
  userMessage,
  temperature = 0.7,
  maxTokens = 4096
}: GeminiRequest): Promise<GeminiResponse> {
  const apiKey = import.meta.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('GEMINI_API_KEY not configured');
    return { success: false, error: 'API key not configured' };
  }
  
  // Combine system prompt and user message
  const fullPrompt = `${systemPrompt}\n\n---\n\n${userMessage}`;
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: fullPrompt }]
          }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            topP: 0.95,
            topK: 40
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_ONLY_HIGH'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_ONLY_HIGH'
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_ONLY_HIGH'
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_ONLY_HIGH'
            }
          ]
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return { 
        success: false, 
        error: `API error: ${response.status}` 
      };
    }
    
    const data = await response.json();
    
    // Check for blocked content
    if (data.candidates?.[0]?.finishReason === 'SAFETY') {
      return { 
        success: false, 
        error: 'Content was blocked by safety filters' 
      };
    }
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      return { 
        success: false, 
        error: 'No content in response' 
      };
    }
    
    return { success: true, content };
    
  } catch (error) {
    console.error('Gemini API error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Retry wrapper for rate limiting
export async function callGeminiWithRetry(
  request: GeminiRequest,
  maxRetries = 3
): Promise<GeminiResponse> {
  let lastError: string | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await callGemini(request);
    
    if (result.success) {
      return result;
    }
    
    lastError = result.error;
    
    // If rate limited, wait and retry
    if (result.error?.includes('429') || result.error?.includes('rate')) {
      const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }
    
    // For other errors, don't retry
    break;
  }
  
  return { success: false, error: lastError };
}
```

### 11.4 Prompt Builder

**File Location:** `/src/lib/prompt.ts`

```typescript
import systemPromptTemplate from '../data/system-prompt.md?raw';
import ingredientsDatabase from '../data/ingredients-database.json';

export type Language = 'en' | 'zh';

export interface UserProfile {
  skin_type?: string;
  sensitivity?: string;
  allergies?: string[];
  allergies_other?: string;
  concerns?: string[];
  is_pregnant?: boolean;
  price_preference?: string;
}

export interface ProductContext {
  productName: string;
  productBrand?: string;
  ingredients: string;
  claims?: string[];
}

// Build the complete system prompt
export function buildSystemPrompt(
  language: Language,
  userProfile?: UserProfile | null
): string {
  let prompt = systemPromptTemplate;
  
  // Replace language placeholder
  prompt = prompt.replace(/\{\{LANGUAGE\}\}/g, language);
  
  // Replace user profile placeholder
  const profileText = userProfile 
    ? formatUserProfile(userProfile, language)
    : getNoProfileText(language);
  prompt = prompt.replace('{{USER_PROFILE}}', profileText);
  
  return prompt;
}

// Format user profile for the prompt
function formatUserProfile(profile: UserProfile, language: Language): string {
  const isZh = language === 'zh';
  const lines: string[] = [];
  
  if (profile.skin_type) {
    const label = isZh ? '肤质' : 'Skin Type';
    const value = getSkinTypeLabel(profile.skin_type, language);
    lines.push(`${label}: ${value}`);
  }
  
  if (profile.sensitivity) {
    const label = isZh ? '敏感程度' : 'Sensitivity Level';
    const value = getSensitivityLabel(profile.sensitivity, language);
    lines.push(`${label}: ${value}`);
  }
  
  if (profile.allergies?.length || profile.allergies_other) {
    const label = isZh ? '已知过敏/敏感成分' : 'Known Allergies/Sensitivities';
    const allergyLabels = profile.allergies?.map(a => getAllergenLabel(a, language)) || [];
    if (profile.allergies_other) {
      allergyLabels.push(profile.allergies_other);
    }
    lines.push(`${label}: ${allergyLabels.join(', ')}`);
  }
  
  if (profile.concerns?.length) {
    const label = isZh ? '肌肤问题' : 'Skin Concerns';
    const concernLabels = profile.concerns.map(c => getConcernLabel(c, language));
    lines.push(`${label}: ${concernLabels.join(', ')}`);
  }
  
  if (profile.is_pregnant) {
    const text = isZh ? '孕期/哺乳期: 是 (请标注应避免的成分)' : 'Pregnant/Nursing: Yes (please flag ingredients to avoid)';
    lines.push(text);
  }
  
  if (profile.price_preference && profile.price_preference !== 'none') {
    const label = isZh ? '价格偏好' : 'Price Preference';
    const value = getPriceLabel(profile.price_preference, language);
    lines.push(`${label}: ${value}`);
  }
  
  if (lines.length === 0) {
    return getNoProfileText(language);
  }
  
  const header = isZh ? '用户档案:' : 'User Profile:';
  return `${header}\n${lines.join('\n')}`;
}

function getNoProfileText(language: Language): string {
  return language === 'zh'
    ? '用户未提供个人档案。请提供适合大多数用户的通用分析，并在适当时注明可能不适合某些肤质的情况。'
    : 'No user profile provided. Please provide general analysis suitable for most users, noting when something may not suit certain skin types.';
}

// Build the user message with product context
export function buildUserMessage(
  context: ProductContext,
  ingredientData: any[]
): string {
  let message = `Please analyze this cosmetic product:\n\n`;
  
  message += `**Product Name:** ${context.productName}\n`;
  
  if (context.productBrand) {
    message += `**Brand:** ${context.productBrand}\n`;
  }
  
  message += `\n**Ingredient List:**\n${context.ingredients}\n`;
  
  if (context.claims?.length) {
    message += `\n**Marketing Claims:**\n${context.claims.join('\n')}\n`;
  }
  
  if (ingredientData.length > 0) {
    message += `\n**Relevant Ingredient Data from Knowledge Base:**\n`;
    message += '```json\n';
    message += JSON.stringify(ingredientData, null, 2);
    message += '\n```\n';
  }
  
  message += `\nPlease provide a comprehensive analysis following your instructions.`;
  
  return message;
}

// Find matching ingredients in our database
export function findIngredientData(ingredientList: string): any[] {
  // Parse ingredient list
  const ingredients = ingredientList
    .split(/[,\n]/)
    .map(i => i.trim().toLowerCase())
    .filter(i => i.length > 0)
    .slice(0, 40); // Limit to first 40 ingredients
  
  const matches: any[] = [];
  const matchedIds = new Set<string>();
  
  for (const ingredient of ingredients) {
    // Skip very short terms
    if (ingredient.length < 3) continue;
    
    // Search in database
    for (const dbIngredient of ingredientsDatabase.ingredients) {
      // Skip if already matched
      if (matchedIds.has(dbIngredient.id)) continue;
      
      // Check various name fields
      const isMatch = 
        dbIngredient.inci_name.toLowerCase() === ingredient ||
        dbIngredient.chinese_name === ingredient ||
        dbIngredient.aliases_en?.some((a: string) => a.toLowerCase() === ingredient) ||
        dbIngredient.aliases_zh?.some((a: string) => a === ingredient) ||
        // Partial match for common variations
        ingredient.includes(dbIngredient.inci_name.toLowerCase()) ||
        dbIngredient.inci_name.toLowerCase().includes(ingredient);
      
      if (isMatch) {
        // Add simplified version for context (not the full entry)
        matches.push({
          id: dbIngredient.id,
          inci_name: dbIngredient.inci_name,
          chinese_name: dbIngredient.chinese_name,
          category: dbIngredient.category,
          functions: dbIngredient.functions,
          effective_concentration: dbIngredient.effective_concentration,
          evidence_level: dbIngredient.evidence_level,
          skin_types: dbIngredient.skin_types,
          concerns_addressed: dbIngredient.concerns_addressed,
          interactions: dbIngredient.interactions,
          irritation_potential: dbIngredient.irritation_potential,
          pregnancy_safe: dbIngredient.pregnancy_safe,
          notes_en: dbIngredient.notes_en,
          notes_zh: dbIngredient.notes_zh
        });
        matchedIds.add(dbIngredient.id);
        break;
      }
    }
  }
  
  return matches;
}

// Helper functions for label translations
function getSkinTypeLabel(type: string, lang: Language): string {
  const labels: Record<string, Record<Language, string>> = {
    oily: { en: 'Oily', zh: '油性' },
    dry: { en: 'Dry', zh: '干性' },
    combination: { en: 'Combination', zh: '混合性' },
    normal: { en: 'Normal', zh: '中性' }
  };
  return labels[type]?.[lang] || type;
}

function getSensitivityLabel(level: string, lang: Language): string {
  const labels: Record<string, Record<Language, string>> = {
    low: { en: 'Low', zh: '低' },
    medium: { en: 'Medium', zh: '中' },
    high: { en: 'High', zh: '高' }
  };
  return labels[level]?.[lang] || level;
}

function getAllergenLabel(allergen: string, lang: Language): string {
  const labels: Record<string, Record<Language, string>> = {
    fragrance: { en: 'Fragrance', zh: '香精' },
    essential_oils: { en: 'Essential Oils', zh: '精油' },
    alcohol: { en: 'Drying Alcohols', zh: '干性酒精' },
    sulfates: { en: 'Sulfates', zh: '硫酸盐' },
    parabens: { en: 'Parabens', zh: '对羟基苯甲酸酯' },
    silicones: { en: 'Silicones', zh: '硅油' }
  };
  return labels[allergen]?.[lang] || allergen;
}

function getConcernLabel(concern: string, lang: Language): string {
  const labels: Record<string, Record<Language, string>> = {
    acne: { en: 'Acne', zh: '痘痘' },
    aging: { en: 'Aging', zh: '抗老' },
    hyperpigmentation: { en: 'Dark spots', zh: '色斑' },
    dehydration: { en: 'Dehydration', zh: '缺水' },
    dryness: { en: 'Dryness', zh: '干燥' },
    oiliness: { en: 'Excess oil', zh: '出油' },
    redness: { en: 'Redness', zh: '泛红' },
    large_pores: { en: 'Large pores', zh: '毛孔粗大' },
    dullness: { en: 'Dullness', zh: '暗沉' },
    texture: { en: 'Uneven texture', zh: '肤质不均' }
  };
  return labels[concern]?.[lang] || concern;
}

function getPriceLabel(price: string, lang: Language): string {
  const labels: Record<string, Record<Language, string>> = {
    budget: { en: 'Budget-friendly', zh: '平价' },
    mid: { en: 'Mid-range', zh: '中档' },
    luxury: { en: 'Luxury', zh: '高端' }
  };
  return labels[price]?.[lang] || price;
}
```

### 11.5 Open Beauty Facts Integration

**File Location:** `/src/lib/openbeautyfacts.ts`

```typescript
interface ProductSearchResult {
  product_name: string;
  brands?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  ingredients_text_zh?: string;
  image_url?: string;
  categories?: string;
}

interface SearchResponse {
  count: number;
  products: ProductSearchResult[];
}

const BASE_URL = 'https://world.openbeautyfacts.org';
const USER_AGENT = 'CosmeticLens/1.0 (https://cosmeticlens.com)';

export async function searchProduct(query: string): Promise<ProductSearchResult | null> {
  try {
    const url = new URL(`${BASE_URL}/cgi/search.pl`);
    url.searchParams.set('search_terms', query);
    url.searchParams.set('json', '1');
    url.searchParams.set('page_size', '5');
    url.searchParams.set('fields', 'product_name,brands,ingredients_text,ingredients_text_en,image_url,categories');
    
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': USER_AGENT
      }
    });
    
    if (!response.ok) {
      console.error('Open Beauty Facts error:', response.status);
      return null;
    }
    
    const data: SearchResponse = await response.json();
    
    if (!data.products || data.products.length === 0) {
      return null;
    }
    
    // Return the best match (first result with ingredients)
    const productWithIngredients = data.products.find(p => 
      p.ingredients_text || p.ingredients_text_en
    );
    
    return productWithIngredients || data.products[0];
    
  } catch (error) {
    console.error('Open Beauty Facts search error:', error);
    return null;
  }
}

export async function getProductByBarcode(barcode: string): Promise<ProductSearchResult | null> {
  try {
    const url = `${BASE_URL}/api/v0/product/${barcode}.json`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (data.status !== 1 || !data.product) {
      return null;
    }
    
    return data.product;
    
  } catch (error) {
    console.error('Open Beauty Facts barcode lookup error:', error);
    return null;
  }
}

// Extract the best available ingredient list
export function extractIngredients(product: ProductSearchResult, preferredLang: 'en' | 'zh' = 'en'): string | null {
  // Try language-specific first
  if (preferredLang === 'en' && product.ingredients_text_en) {
    return product.ingredients_text_en;
  }
  
  // Fall back to generic
  if (product.ingredients_text) {
    return product.ingredients_text;
  }
  
  return null;
}
```

### 11.6 Complete Analysis Pipeline

**File Location:** `/src/lib/analyzer.ts`

```typescript
import { callGeminiWithRetry } from './gemini';
import { buildSystemPrompt, buildUserMessage, findIngredientData, type UserProfile, type Language } from './prompt';
import { searchProduct, extractIngredients } from './openbeautyfacts';
import { createServerClient } from './supabase';

export interface AnalysisRequest {
  productName?: string;
  ingredients?: string;
  language: Language;
  userId?: string | null;
}

export interface AnalysisResult {
  success: boolean;
  data?: string;
  cached?: boolean;
  product?: {
    name: string;
    brand?: string;
    image?: string;
  };
  error?: string;
  errorCode?: string;
}

export async function analyzeProduct(request: AnalysisRequest): Promise<AnalysisResult> {
  const { productName, ingredients, language, userId } = request;
  const supabase = createServerClient();
  
  // Normalize product name for cache lookup
  const normalizedName = productName?.toLowerCase().trim();
  
  // ========================================
  // 1. CHECK CACHE
  // ========================================
  if (normalizedName) {
    const { data: cached } = await supabase
      .from('analysis_cache')
      .select('*')
      .eq('product_name_normalized', normalizedName)
      .gt('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .single();
    
    if (cached) {
      const cachedResult = language === 'zh' 
        ? cached.analysis_result_zh 
        : cached.analysis_result_en;
      
      if (cachedResult) {
        return {
          success: true,
          data: cachedResult,
          cached: true
        };
      }
    }
  }
  
  // ========================================
  // 2. GET INGREDIENTS
  // ========================================
  let ingredientList = ingredients;
  let productData: any = null;
  
  if (!ingredientList && productName) {
    // Search Open Beauty Facts
    productData = await searchProduct(productName);
    
    if (productData) {
      ingredientList = extractIngredients(productData, language);
    }
    
    if (!ingredientList) {
      return {
        success: false,
        error: 'Could not find ingredient information for this product. Please paste the ingredient list directly.',
        errorCode: 'product_not_found'
      };
    }
  }
  
  if (!ingredientList) {
    return {
      success: false,
      error: 'No ingredients provided',
      errorCode: 'missing_input'
    };
  }
  
  // ========================================
  // 3. LOAD USER PROFILE
  // ========================================
  let userProfile: UserProfile | null = null;
  
  if (userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    userProfile = profile;
  }
  
  // ========================================
  // 4. FIND INGREDIENT DATA
  // ========================================
  const ingredientData = findIngredientData(ingredientList);
  
  // ========================================
  // 5. BUILD PROMPTS
  // ========================================
  const systemPrompt = buildSystemPrompt(language, userProfile);
  const userMessage = buildUserMessage(
    {
      productName: productName || 'Unknown Product',
      productBrand: productData?.brands,
      ingredients: ingredientList
    },
    ingredientData
  );
  
  // ========================================
  // 6. CALL LLM
  // ========================================
  const llmResult = await callGeminiWithRetry({
    systemPrompt,
    userMessage,
    temperature: 0.7,
    maxTokens: 4096
  });
  
  if (!llmResult.success || !llmResult.content) {
    return {
      success: false,
      error: 'Failed to analyze product. Please try again.',
      errorCode: 'analysis_failed'
    };
  }
  
  // ========================================
  // 7. CACHE RESULT
  // ========================================
  if (normalizedName) {
    const cacheField = language === 'zh' ? 'analysis_result_zh' : 'analysis_result_en';
    
    await supabase
      .from('analysis_cache')
      .upsert({
        product_name_normalized: normalizedName,
        [cacheField]: llmResult.content,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'product_name_normalized'
      });
  }
  
  // ========================================
  // 8. SAVE TO HISTORY
  // ========================================
  if (userId) {
    await supabase.from('analysis_history').insert({
      user_id: userId,
      product_name: productName || 'Pasted Ingredients',
      product_brand: productData?.brands,
      ingredients_raw: ingredientList,
      analysis_result: llmResult.content,
      language
    });
  }
  
  // ========================================
  // 9. RETURN RESULT
  // ========================================
  return {
    success: true,
    data: llmResult.content,
    cached: false,
    product: productData ? {
      name: productData.product_name,
      brand: productData.brands,
      image: productData.image_url
    } : undefined
  };
}
```

---

## End of Part 4

**This file is saved as: `/home/claude/plan-part-4.md`**

**Part 4 covers:**
- Section 10: Frontend Pages & Components
  - Layout components (BaseLayout, Navigation, Footer, LanguageSwitcher)
  - Chat components (ChatInterface, ChatMessage, AnalysisDisplay, ProductInput, LoadingIndicator)
  - Glossary components (GlossaryTable)
  - Education components (FunFactCard, ArticleCard)
  - Profile components (ProfileForm)
- Section 11: LLM Integration & Prompting
  - Supabase client setup
  - Gemini API integration with retry logic
  - Prompt builder with user profile formatting
  - Open Beauty Facts integration
  - Complete analysis pipeline

**Character count: ~52,000 characters**

**Next Part (Part 5) will cover:**
- Section 12: MVP Implementation Plan (detailed step-by-step)
- Section 13: Full Implementation Phases
- Section 14: Complete File Structure
- Section 15: Deployment Guide
- Section 16: Testing Checklist
- Section 17: Future Enhancements
- Appendices (sample articles, additional resources)

---
