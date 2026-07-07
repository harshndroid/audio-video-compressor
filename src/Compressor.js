import React, { useEffect, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import imageCompression from 'browser-image-compression';
import { PDFDocument } from 'pdf-lib';
import './Compressor.css';

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

const UploadIcon = (p) => (
  <Icon {...p}>
    <path d="M12 16V4" />
    <path d="m6 10 6-6 6 6" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </Icon>
);
const MusicIcon = (p) => (
  <Icon {...p}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </Icon>
);
const FilmIcon = (p) => (
  <Icon {...p}>
    <rect x="2" y="4" width="20" height="16" rx="3" />
    <path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none" />
  </Icon>
);
const ImageIcon = (p) => (
  <Icon {...p}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-4-4L5 21" />
  </Icon>
);
const FileIcon = (p) => (
  <Icon {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </Icon>
);
const DownloadIcon = (p) => (
  <Icon {...p}>
    <path d="M12 4v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M5 20h14" />
  </Icon>
);
const CloseIcon = (p) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);
const ArrowIcon = (p) => (
  <Icon {...p}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Icon>
);
const BoltIcon = (p) => (
  <Icon {...p}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor" stroke="none" />
  </Icon>
);

const AUDIO_EXTS = ['mp3', 'wav', 'aac', 'ogg', 'm4a', 'flac', 'opus', 'weba'];
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif'];
const PDF_EXTS = ['pdf'];

const LEVELS = [
  { id: 'low', label: 'Low', desc: 'Best quality' },
  { id: 'medium', label: 'Medium', desc: 'Balanced' },
  { id: 'high', label: 'High', desc: 'Smaller file' },
  { id: 'ultra', label: 'Ultra', desc: 'Smallest file' },
];

const AUDIO_BITRATE = { low: '160k', medium: '96k', high: '48k', ultra: '16k' };

const VIDEO_PRESET = {
  low: { crf: '23', preset: 'ultrafast' },
  medium: { crf: '28', preset: 'ultrafast' },
  high: { crf: '32', preset: 'ultrafast', scale: 'iw/2:-2' },
  ultra: { crf: '36', preset: 'ultrafast', scale: 'iw/4:-2' },
};

const IMAGE_OPTIONS = {
  low: { maxSizeMB: 10, quality: 0.85, maxWidthOrHeight: undefined },
  medium: { maxSizeMB: 4, quality: 0.7, maxWidthOrHeight: 2048 },
  high: { maxSizeMB: 1.5, quality: 0.5, maxWidthOrHeight: 1600 },
  ultra: { maxSizeMB: 0.5, quality: 0.3, maxWidthOrHeight: 1024 },
};

const buildArgs = (fileType, level, inputName, outputName) => {
  if (fileType === 'audio') {
    return ['-i', inputName, '-b:a', AUDIO_BITRATE[level], outputName];
  }
  const { crf, preset, scale } = VIDEO_PRESET[level];
  const args = ['-i', inputName, '-c:v', 'libx264', '-crf', crf, '-preset', preset, '-threads', '0'];
  if (scale) args.push('-vf', `scale=${scale}`);
  args.push('-c:a', 'aac', '-b:a', '128k');
  args.push(outputName);
  return args;
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

const formatDuration = (s) => {
  if (!s || !isFinite(s)) return null;
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${sec}`;
};

const getFileType = (file) => {
  const ext = file.name.split('.').pop().toLowerCase();
  if (AUDIO_EXTS.includes(ext)) return 'audio';
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (PDF_EXTS.includes(ext)) return 'pdf';
  return 'video';
};

const getFileTypeLabel = (type) => {
  switch (type) {
    case 'audio': return 'Audio';
    case 'video': return 'Video';
    case 'image': return 'Image';
    case 'pdf': return 'PDF';
    default: return 'File';
  }
};

const getFileIcon = (type) => {
  switch (type) {
    case 'audio': return <MusicIcon />;
    case 'video': return <FilmIcon />;
    case 'image': return <ImageIcon />;
    case 'pdf': return <FileIcon />;
    default: return <FileIcon />;
  }
};

const Compressor = () => {
  const [fileType, setFileType] = useState(null);
  const [inputFile, setInputFile] = useState(null);
  const [inputFileSize, setInputFileSize] = useState(0);
  const [inputFileDuration, setInputFileDuration] = useState(0);
  const [outputFileSize, setOutputFileSize] = useState(0);
  const [blobUrl, setBlobUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [level, setLevel] = useState('medium');

  const ffmpegRef = useRef(new FFmpeg());
  const inputRef = useRef(null);
  const didLoad = useRef(false);
  const cancelledRef = useRef(false);

  const load = async () => {
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on('progress', ({ progress }) => {
      setProgress(Math.min(1, Math.max(0, progress)));
    });
    try {
      // Try multi-threaded core first (requires COOP/COEP headers)
      const mtBase = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${mtBase}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${mtBase}/ffmpeg-core.wasm`, 'application/wasm'),
        workerURL: await toBlobURL(`${mtBase}/ffmpeg-core.worker.js`, 'text/javascript'),
      });
      setFfmpegLoaded(true);
    } catch (mtErr) {
      console.warn('Multi-threaded FFmpeg failed, falling back to single-threaded:', mtErr);
      try {
        const stBase = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await ffmpegRef.current.load({
          coreURL: await toBlobURL(`${stBase}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${stBase}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        setFfmpegLoaded(true);
      } catch (stErr) {
        console.error(stErr);
        setError(
          'Could not load the compression engine. Check your connection and refresh.'
        );
      }
    }
  };

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    load();
  }, []);

  const handleFile = (file) => {
    if (!file) return;
    setError(null);
    const type = getFileType(file);
    setFileType(type);
    setInputFile(file);
    setInputFileSize(file.size);
    setInputFileDuration(0);
    setOutputFileSize(0);
    setBlobUrl(null);
    setProgress(0);

    if (type === 'audio' || type === 'video') {
      const element = document.createElement(type);
      element.preload = 'metadata';
      element.onloadedmetadata = () => setInputFileDuration(element.duration);
      element.src = URL.createObjectURL(file);
    }
  };

  const onChooseFile = (e) => handleFile(e.target.files?.[0]);

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const reset = () => {
    setFileType(null);
    setInputFile(null);
    setInputFileSize(0);
    setInputFileDuration(0);
    setOutputFileSize(0);
    setBlobUrl(null);
    setProgress(0);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  // ─── Audio/Video compression via FFmpeg ───
  const compressAudioVideo = async () => {
    const ffmpeg = ffmpegRef.current;
    await ffmpeg.writeFile(inputFile.name, await fetchFile(inputFile));
    const outputFileName =
      fileType === 'audio' ? 'output_audio.mp3' : 'output_video.mp4';
    const args = buildArgs(fileType, level, inputFile.name, outputFileName);
    console.log('FFmpeg args:', args);
    const exitCode = await ffmpeg.exec(args);
    if (exitCode !== 0) {
      throw new Error(`Compression failed (exit code ${exitCode}). Try a lower compression level.`);
    }
    const data = await ffmpeg.readFile(outputFileName);
    const blob = new Blob([data], {
      type: fileType === 'audio' ? 'audio/mp3' : 'video/mp4',
    });
    return blob;
  };

  // ─── Image compression ───
  const compressImage = async () => {
    const opts = IMAGE_OPTIONS[level];
    const options = {
      maxSizeMB: opts.maxSizeMB,
      initialQuality: opts.quality,
      useWebWorker: true,
      onProgress: (p) => setProgress(p / 100),
    };
    if (opts.maxWidthOrHeight) {
      options.maxWidthOrHeight = opts.maxWidthOrHeight;
    }
    const compressedFile = await imageCompression(inputFile, options);
    return compressedFile;
  };

  // ─── PDF compression ───
  const compressPDF = async () => {
    setProgress(0.1);
    const arrayBuffer = await inputFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    setProgress(0.4);

    // Strip metadata for smaller file
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');

    setProgress(0.7);

    // Serialize with object streams for better compression
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    setProgress(1);

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    return blob;
  };

  const handleCompression = async () => {
    cancelledRef.current = false;
    setError(null);
    setProgress(0);
    setIsCompressing(true);

    try {
      let blob;
      if (fileType === 'audio' || fileType === 'video') {
        blob = await compressAudioVideo();
      } else if (fileType === 'image') {
        blob = await compressImage();
      } else if (fileType === 'pdf') {
        blob = await compressPDF();
      }

      if (cancelledRef.current) return;

      if (blob) {
        setBlobUrl(URL.createObjectURL(blob));
        setOutputFileSize(blob.size);
        setProgress(1);
      }
    } catch (err) {
      if (cancelledRef.current) return;
      console.error(err);
      setError(err.message || 'Something went wrong while compressing. Please try again.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    if (fileType === 'audio' || fileType === 'video') {
      try {
        ffmpegRef.current.terminate();
      } catch (err) {
        console.error(err);
      }
      ffmpegRef.current = new FFmpeg();
      setFfmpegLoaded(false);
      load();
    }
    setIsCompressing(false);
    setProgress(0);
  };

  const getOutputExtension = () => {
    if (fileType === 'audio') return 'mp3';
    if (fileType === 'video') return 'mp4';
    if (fileType === 'pdf') return 'pdf';
    const ext = inputFile?.name.split('.').pop().toLowerCase();
    if (['png', 'webp', 'gif'].includes(ext)) return ext;
    return 'jpg';
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = blobUrl;
    const baseName = inputFile.name.replace(/\.[^.]+$/, '');
    link.download = `${baseName}_compressed.${getOutputExtension()}`;
    link.click();
  };

  const needsFFmpeg = fileType === 'audio' || fileType === 'video';
  const engineReady = needsFFmpeg ? ffmpegLoaded : true;

  const durationLabel = formatDuration(inputFileDuration);
  const reduction =
    inputFileSize && outputFileSize
      ? Math.round((100 * (inputFileSize - outputFileSize)) / inputFileSize)
      : 0;
  const pct = Math.min(100, Math.round(progress * 100));

  return (
    <div className="compressor">
      <input
        ref={inputRef}
        id="file-input"
        type="file"
        hidden
        accept="audio/*,video/*,image/*,.pdf"
        onChange={onChooseFile}
      />

      {error && <div className="error">{error}</div>}

      {!inputFile ? (
        <label
          htmlFor="file-input"
          className={`dropzone${isDragging ? ' dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
        >
          <UploadIcon className="dropzone-icon" />
          <div className="dropzone-title">Drop a file here, or click to browse</div>
          <div className="dropzone-sub">
            Audio, Video, Image, or PDF · processed locally, never uploaded
          </div>
        </label>
      ) : (
        <>
          <div className="file-row">
            <div className="file-icon">
              {getFileIcon(fileType)}
            </div>
            <div className="file-meta">
              <div className="file-name">{inputFile.name}</div>
              <div className="file-sub">
                {getFileTypeLabel(fileType)}
                {durationLabel ? ` · ${durationLabel}` : ''}
              </div>
            </div>
            {!isCompressing && (
              <button
                className="file-clear"
                onClick={reset}
                aria-label="Remove file"
              >
                <CloseIcon />
              </button>
            )}
          </div>

          <div className="sizes">
            <div className="size-card">
              <div className="size-label">Before</div>
              <div className="size-value before">
                {formatBytes(inputFileSize)}
              </div>
            </div>
            {blobUrl && (
              <>
                <ArrowIcon className="size-arrow" />
                <div className="size-card">
                  <div className="size-label">After</div>
                  <div className="size-value after">
                    {formatBytes(outputFileSize)}
                  </div>
                </div>
              </>
            )}
          </div>

          {blobUrl && reduction > 0 && (
            <div className="reduction">{reduction}% smaller</div>
          )}

          {!blobUrl && (
            <div className="levels-group">
              <div className="levels-label">Compression level</div>
              <div className="levels">
                {LEVELS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className={`level${level === l.id ? ' selected' : ''}`}
                    onClick={() => setLevel(l.id)}
                    disabled={isCompressing}
                  >
                    <span className="level-name">{l.label}</span>
                    <span className="level-desc">{l.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="actions">
            {blobUrl ? (
              <>
                <button className="btn btn-primary" onClick={handleDownload}>
                  <DownloadIcon /> Download
                </button>
                <button className="btn btn-ghost" onClick={reset}>
                  Compress another file
                </button>
              </>
            ) : isCompressing ? (
              <>
                <div className="progress">
                  <div className="progress-head">
                    <span className="progress-label">Compressing…</span>
                    <span className="progress-pct">{pct}%</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <button className="btn btn-stop" onClick={handleCancel}>
                  <CloseIcon /> Stop
                </button>
              </>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleCompression}
                disabled={!engineReady}
              >
                {engineReady ? (
                  <>
                    <BoltIcon /> Compress
                  </>
                ) : (
                  <>
                    <span className="spinner" /> Stopping...
                  </>
                )}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Compressor;
