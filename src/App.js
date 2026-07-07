import { useState } from 'react';
import './App.css';
import Onboarding from './Onboarding';
import Compressor from './Compressor';
import Converter from './Converter';
import Trimmer from './Trimmer';

const TABS = [
  { id: 'convert', label: 'Convert' },
  { id: 'trim', label: 'Trim' },
  { id: 'compress', label: 'Compress' },
];

const Logo = () => (
  <svg
    className="app-logo"
    width="40"
    height="40"
    viewBox="0 0 40 40"
    fill="none"
  >
    <rect width="40" height="40" rx="12" fill="url(#logo-grad)" />
    <path
      d="M12 15h16M12 20h12M12 25h8"
      stroke="#fff"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M27 22l-4 6h8l-4-6z"
      fill="#fff"
      opacity="0.85"
    />
    <defs>
      <linearGradient id="logo-grad" x1="0" y1="0" x2="40" y2="40">
        <stop offset="0%" stopColor="#ec4899" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
  </svg>
);

function App() {
  const [activeTab, setActiveTab] = useState('convert');
  const [showOnboarding, setShowOnboarding] = useState(true);

  if (showOnboarding) {
    return <Onboarding onFinish={() => setShowOnboarding(false)} />;
  }

  return (
    <main className="app">
      <header className="app-header">
        {/* <Logo /> */}
        <h1 className="app-title">File Toolkit</h1>
        <p className="app-tagline">
          Convert, Trim &amp; Compress files right in your device - Nothing leaves your device.
        </p>
      </header>

      <nav className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'compress' && <Compressor />}
      {activeTab === 'convert' && <Converter />}
      {activeTab === 'trim' && <Trimmer />}
    </main>
  );
}

export default App;
