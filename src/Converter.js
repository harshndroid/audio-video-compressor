import React, { useEffect, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import './Converter.css';

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
const BoltIcon = (p) => (
  <Icon {...p}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor" stroke="none" />
  </Icon>
);

const AUDIO_EXTS = ['mp3', 'wav', 'aac', 'ogg', 'm4a', 'flac', 'opus', 'weba'];
const VIDEO_EXTS = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', '3gp'];
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif'];

const AUDIO_FORMATS = [
  { id: 'mp3', label: 'MP3', mime: 'audio/mpeg' },
  { id: 'wav', label: 'WAV', mime: 'audio/wav' },
  { id: 'aac', label: 'AAC', mime: 'audio/aac' },
  { id: 'ogg', label: 'OGG', mime: 'audio/ogg' },
  { id: 'flac', label: 'FLAC', mime: 'audio/flac' },
];

const VIDEO_FORMATS = [
  { id: 'mp4', label: 'MP4', mime: 'video/mp4' },
  { id: 'webm', label: 'WebM', mime: 'video/webm' },
  { id: 'avi', label: 'AVI', mime: 'video/avi' },
  { id: 'gif', label: 'GIF', mime: 'image/gif' },
  { id: 'mp3', label: 'MP3 (audio only)', mime: 'audio/mpeg' },
];

const IMAGE_FORMATS = [
  { id: 'jpeg', label: 'JPEG', mime: 'image/jpeg' },
  { id: 'png', label: 'PNG', mime: 'image/png' },
  { id: 'webp', label: 'WebP', mime: 'image/webp' },
];

const getFileCategory = (file) => {
  const ext = file.name.split('.').pop().toLowerCase();
  if (AUDIO_EXTS.includes(ext)) return 'audio';
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (VIDEO_EXTS.includes(ext)) return 'video';
  // Check MIME type as fallback
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'video';
};

const getOutputFormats = (category, inputExt) => {
  let formats;
  if (category === 'audio') formats = AUDIO_FORMATS;
  else if (category === 'image') formats = IMAGE_FORMATS;
  else formats = VIDEO_FORMATS;
  // Filter out the current format
  return formats.filter((f) => f.id !== inputExt && f.id !== (inputExt === 'jpg' ? 'jpeg' : inputExt));
};

const buildConvertArgs = (category, outputFormat, inputName, outputName) => {
  if (category === 'image') return null; // Handled via Canvas

  if (category === 'audio') {
    if (outputFormat === 'mp3') return ['-i', inputName, '-codec:a', 'libmp3lame', '-q:a', '2', outputName];
    if (outputFormat === 'wav') return ['-i', inputName, '-codec:a', 'pcm_s16le', outputName];
    if (outputFormat === 'aac') return ['-i', inputName, '-codec:a', 'aac', '-b:a', '192k', outputName];
    if (outputFormat === 'ogg') return ['-i', inputName, '-codec:a', 'libvorbis', '-q:a', '5', outputName];
    if (outputFormat === 'flac') return ['-i', inputName, '-codec:a', 'flac', outputName];
    return ['-i', inputName, outputName];
  }

  // Video
  if (outputFormat === 'mp4') return ['-i', inputName, '-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '0', '-c:a', 'aac', outputName];
  if (outputFormat === 'webm') return ['-i', inputName, '-c:v', 'libvpx', '-b:v', '1M', '-threads', '0', '-c:a', 'libvorbis', outputName];
  if (outputFormat === 'avi') return ['-i', inputName, '-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '0', outputName];
  if (outputFormat === 'gif') return ['-i', inputName, '-vf', 'fps=12,scale=480:-1:flags=lanczos', '-loop', '0', outputName];
  if (outputFormat === 'mp3') return ['-i', inputName, '-vn', '-codec:a', 'libmp3lame', '-q:a', '2', outputName];
  return ['-i', inputName, outputName];
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

const Converter = () => {
  const [inputFile, setInputFile] = useState(null);
  const [category, setCategory] = useState(null);
  const [inputExt, setInputExt] = useState('');
  const [outputFormat, setOutputFormat] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [outputSize, setOutputSize] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isConverting, setIsConverting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [error, setError] = useState(null);

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
        setError('Could not load the conversion engine. Check your connection and refresh.');
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
    const cat = getFileCategory(file);
    const ext = file.name.split('.').pop().toLowerCase();
    setCategory(cat);
    setInputExt(ext);
    setInputFile(file);
    setOutputFormat(null);
    setBlobUrl(null);
    setOutputSize(0);
    setProgress(0);
  };

  const onChooseFile = (e) => handleFile(e.target.files?.[0]);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const reset = () => {
    setInputFile(null);
    setCategory(null);
    setInputExt('');
    setOutputFormat(null);
    setBlobUrl(null);
    setOutputSize(0);
    setProgress(0);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const convertImage = async () => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        setProgress(0.5);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const mime =
          outputFormat === 'jpeg' ? 'image/jpeg' :
          outputFormat === 'png' ? 'image/png' : 'image/webp';
        canvas.toBlob(
          (blob) => {
            if (blob) {
              setProgress(1);
              resolve(blob);
            } else {
              reject(new Error('Canvas conversion failed'));
            }
          },
          mime,
          0.92
        );
      };
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = URL.createObjectURL(inputFile);
    });
  };

  const convertWithFFmpeg = async () => {
    const ffmpeg = ffmpegRef.current;
    const outputName = `output.${outputFormat}`;
    await ffmpeg.writeFile(inputFile.name, await fetchFile(inputFile));
    const args = buildConvertArgs(category, outputFormat, inputFile.name, outputName);
    await ffmpeg.exec(args);
    const data = await ffmpeg.readFile(outputName);
    const format = (category === 'audio' ? AUDIO_FORMATS : VIDEO_FORMATS).find(
      (f) => f.id === outputFormat
    );
    const blob = new Blob([data], { type: format?.mime || 'application/octet-stream' });
    return blob;
  };

  const handleConvert = async () => {
    cancelledRef.current = false;
    setError(null);
    setProgress(0);
    setIsConverting(true);

    try {
      let blob;
      if (category === 'image') {
        blob = await convertImage();
      } else {
        blob = await convertWithFFmpeg();
      }

      if (cancelledRef.current) return;

      if (blob) {
        setBlobUrl(URL.createObjectURL(blob));
        setOutputSize(blob.size);
        setProgress(1);
      }
    } catch (err) {
      if (cancelledRef.current) return;
      console.error(err);
      setError('Something went wrong during conversion. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    if (category !== 'image') {
      try {
        ffmpegRef.current.terminate();
      } catch (err) {
        console.error(err);
      }
      ffmpegRef.current = new FFmpeg();
      setFfmpegLoaded(false);
      load();
    }
    setIsConverting(false);
    setProgress(0);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = blobUrl;
    const baseName = inputFile.name.replace(/\.[^.]+$/, '');
    link.download = `${baseName}.${outputFormat}`;
    link.click();
  };

  const needsFFmpeg = category === 'audio' || category === 'video';
  const engineReady = needsFFmpeg ? ffmpegLoaded : true;
  const availableFormats = category ? getOutputFormats(category, inputExt) : [];
  const pct = Math.min(100, Math.round(progress * 100));

  const getCategoryIcon = () => {
    if (category === 'audio') return <MusicIcon />;
    if (category === 'image') return <ImageIcon />;
    return <FilmIcon />;
  };

  return (
    <div className="compressor">
      <input
        ref={inputRef}
        id="convert-file-input"
        type="file"
        hidden
        accept="audio/*,video/*,image/*"
        onChange={onChooseFile}
      />

      {error && <div className="error">{error}</div>}

      {!inputFile ? (
        <label
          htmlFor="convert-file-input"
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
            Audio, Video, or Image · convert to any format
          </div>
        </label>
      ) : (
        <>
          <div className="file-row">
            <div className="file-icon">{getCategoryIcon()}</div>
            <div className="file-meta">
              <div className="file-name">{inputFile.name}</div>
              <div className="file-sub">
                {category === 'audio' ? 'Audio' : category === 'image' ? 'Image' : 'Video'}
                {' · '}{formatBytes(inputFile.size)}
              </div>
            </div>
            {!isConverting && (
              <button className="file-clear" onClick={reset} aria-label="Remove file">
                <CloseIcon />
              </button>
            )}
          </div>

          {!blobUrl && !isConverting && (
            <div className="levels-group">
              <div className="levels-label">Convert to</div>
              <div className="format-grid">
                {availableFormats.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`format-btn${outputFormat === f.id ? ' selected' : ''}`}
                    onClick={() => setOutputFormat(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {blobUrl && (
            <div className="convert-result">
              <div className="convert-result-label">
                .{inputExt} → .{outputFormat}
              </div>
              <div className="file-sub">{formatBytes(outputSize)}</div>
            </div>
          )}

          <div className="actions">
            {blobUrl ? (
              <>
                <button className="btn btn-primary" onClick={handleDownload}>
                  <DownloadIcon /> Download
                </button>
                <button className="btn btn-ghost" onClick={reset}>
                  Convert another file
                </button>
              </>
            ) : isConverting ? (
              <>
                <div className="progress">
                  <div className="progress-head">
                    <span className="progress-label">Converting…</span>
                    <span className="progress-pct">{pct}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <button className="btn btn-stop" onClick={handleCancel}>
                  <CloseIcon /> Stop
                </button>
              </>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleConvert}
                disabled={!engineReady || !outputFormat}
              >
                {engineReady ? (
                  <>
                    <BoltIcon /> Convert
                  </>
                ) : (
                  <>
                    <span className="spinner" /> Preparing engine…
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

export default Converter;
