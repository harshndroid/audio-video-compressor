import { useState } from 'react';
import './Onboarding.css';

const Icon = ({ children, ...props }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {children}
  </svg>
);

const CompressIcon = (p) => (
  <Icon {...p}>
    <path d="M4 14h6v6H4z" />
    <path d="M14 4h6v6h-6z" />
    <path d="M17 17l3 3" />
    <path d="M7 7l-3-3" />
    <path d="M4 4l16 16" strokeDasharray="2 3" />
  </Icon>
);

const ConvertIcon = (p) => (
  <Icon {...p}>
    <path d="M17 3l4 4-4 4" />
    <path d="M3 11h18" />
    <path d="M7 21l-4-4 4-4" />
    <path d="M21 13H3" />
  </Icon>
);

const TrimIcon = (p) => (
  <Icon {...p}>
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" />
    <line x1="14.47" y1="14.48" x2="20" y2="20" />
    <line x1="8.12" y1="8.12" x2="12" y2="12" />
  </Icon>
);

const SLIDES = [
  {
    icon: CompressIcon,
    title: 'Compress Files',
    description: 'Shrink your files with 4 compression levels — Low, Medium, High and Ultra.',
    features: ['Audio: MP3, WAV, AAC, OGG, FLAC & more', 'Video: MP4, WebM, AVI, MOV & more', 'Images: JPEG, PNG, WebP, GIF, BMP', 'PDF: Reduce file size'],
    color: '#ec4899',
  },
  {
    icon: ConvertIcon,
    title: 'Convert Formats',
    description: 'Convert between audio, video, and image formats right in your browser.',
    features: ['Audio: MP3, WAV, AAC, OGG, FLAC', 'Video: MP4, WebM, AVI & Video to GIF', 'Images: JPEG, PNG, WebP', 'Extract audio from any video'],
    color: '#8b5cf6',
  },
  {
    icon: TrimIcon,
    title: 'Trim Audio & Video',
    description: 'Preview your media, seek to any point, and cut to precise start & end times.',
    features: ['Built-in video & audio player', 'Draggable timeline with trim handles', 'Set Start / Set End from media', 'Manual time input for precision'],
    color: '#6ee7b7',
  },
];

const Onboarding = ({ onFinish }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slide = SLIDES[currentSlide];
  const isLast = currentSlide === SLIDES.length - 1;

  const next = () => {
    if (isLast) {
      onFinish();
    } else {
      setCurrentSlide((s) => s + 1);
    }
  };

  const prev = () => {
    if (currentSlide > 0) setCurrentSlide((s) => s - 1);
  };

  const skip = () => onFinish();

  const SlideIcon = slide.icon;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        {/* Skip button */}
        <button className="onboarding-skip" onClick={skip}>
          Skip
        </button>

        {/* Icon */}
        <div className="onboarding-icon-wrap" style={{ '--accent': slide.color }}>
          <SlideIcon className="onboarding-icon" />
        </div>

        {/* Content */}
        <h2 className="onboarding-title">{slide.title}</h2>
        <p className="onboarding-desc">{slide.description}</p>

        <ul className="onboarding-features">
          {slide.features.map((f, i) => (
            <li key={i} className="onboarding-feature">
              <span className="onboarding-check" style={{ color: slide.color }}>&#10003;</span>
              {f}
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div className="onboarding-footer">
          {/* Dots */}
          <div className="onboarding-dots">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                className={`onboarding-dot${i === currentSlide ? ' active' : ''}`}
                onClick={() => setCurrentSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="onboarding-nav">
            {currentSlide > 0 && (
              <button className="onboarding-btn onboarding-btn-back" onClick={prev}>
                Back
              </button>
            )}
            <button className="onboarding-btn onboarding-btn-next" onClick={next}>
              {isLast ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>

        {/* Privacy badge */}
        <div className="onboarding-privacy">
          100% local processing - your files never leave your device
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
