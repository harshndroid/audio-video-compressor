import React, { useEffect, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import './Trimmer.css';

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
const ScissorsIcon = (p) => (
  <Icon {...p}>
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" />
    <line x1="14.47" y1="14.48" x2="20" y2="20" />
    <line x1="8.12" y1="8.12" x2="12" y2="12" />
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

const AUDIO_EXTS = ['mp3', 'wav', 'aac', 'ogg', 'm4a', 'flac', 'opus', 'weba'];

const formatTime = (totalSeconds) => {
  if (!totalSeconds || !isFinite(totalSeconds)) return '0:00';
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const parseTimeInput = (str) => {
  const parts = str.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(str) || 0;
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

const Trimmer = () => {
  const [inputFile, setInputFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [mediaUrl, setMediaUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [startInput, setStartInput] = useState('0:00');
  const [endInput, setEndInput] = useState('0:00');
  const [blobUrl, setBlobUrl] = useState(null);
  const [outputSize, setOutputSize] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isTrimming, setIsTrimming] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [error, setError] = useState(null);

  const ffmpegRef = useRef(new FFmpeg());
  const inputRef = useRef(null);
  const playerRef = useRef(null);
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
        setError('Could not load the trimming engine. Check your connection and refresh.');
      }
    }
  };

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    load();
  }, []);

  // Auto-pause at end marker during playback
  useEffect(() => {
    if (isPlaying && playerRef.current && currentTime >= endTime) {
      playerRef.current.pause();
      setIsPlaying(false);
    }
  }, [currentTime, endTime, isPlaying]);

  const handleFile = (file) => {
    if (!file) return;
    setError(null);
    const ext = file.name.split('.').pop().toLowerCase();
    const type = AUDIO_EXTS.includes(ext) ? 'audio' : 'video';
    setFileType(type);
    setInputFile(file);
    setBlobUrl(null);
    setOutputSize(0);
    setProgress(0);
    setStartTime(0);
    setStartInput('0:00');
    setCurrentTime(0);
    setIsPlaying(false);

    const url = URL.createObjectURL(file);
    setMediaUrl(url);
  };

  const onMediaLoaded = () => {
    if (playerRef.current) {
      const dur = playerRef.current.duration;
      setDuration(dur);
      setEndTime(dur);
      setEndInput(formatTime(dur));
    }
  };

  const onChooseFile = (e) => handleFile(e.target.files?.[0]);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const reset = () => {
    if (playerRef.current) {
      playerRef.current.pause();
    }
    setInputFile(null);
    setFileType(null);
    setMediaUrl(null);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setStartTime(0);
    setEndTime(0);
    setStartInput('0:00');
    setEndInput('0:00');
    setBlobUrl(null);
    setOutputSize(0);
    setProgress(0);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const seekTo = (time) => {
    if (playerRef.current) {
      playerRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const markStart = () => {
    const ct = playerRef.current?.currentTime || 0;
    if (ct < endTime - 0.5) {
      setStartTime(ct);
      setStartInput(formatTime(ct));
    }
  };

  const markEnd = () => {
    const ct = playerRef.current?.currentTime || duration;
    if (ct > startTime + 0.5) {
      setEndTime(ct);
      setEndInput(formatTime(ct));
    }
  };

  const handleStartChange = (e) => {
    setStartInput(e.target.value);
    const t = parseTimeInput(e.target.value);
    if (t >= 0 && t < endTime) setStartTime(t);
  };

  const handleEndChange = (e) => {
    setEndInput(e.target.value);
    const t = parseTimeInput(e.target.value);
    if (t > startTime && t <= duration) setEndTime(t);
  };

  const handleStartBlur = () => {
    const t = parseTimeInput(startInput);
    const clamped = Math.max(0, Math.min(t, endTime - 1));
    setStartTime(clamped);
    setStartInput(formatTime(clamped));
  };

  const handleEndBlur = () => {
    const t = parseTimeInput(endInput);
    const clamped = Math.max(startTime + 1, Math.min(t, duration));
    setEndTime(clamped);
    setEndInput(formatTime(clamped));
  };

  const handleTimelineClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    const time = ratio * duration;
    seekTo(Math.max(0, Math.min(duration, time)));
  };

  const handleTrim = async () => {
    cancelledRef.current = false;
    setError(null);
    setProgress(0);
    setIsTrimming(true);
    if (playerRef.current) playerRef.current.pause();
    setIsPlaying(false);

    try {
      const ffmpeg = ffmpegRef.current;
      await ffmpeg.writeFile(inputFile.name, await fetchFile(inputFile));

      const ext = inputFile.name.split('.').pop().toLowerCase();
      const outputName = `trimmed.${ext}`;

      const trimDuration = endTime - startTime;
      const args = [
        '-ss', startTime.toFixed(2),
        '-i', inputFile.name,
        '-t', trimDuration.toFixed(2),
        '-c', 'copy',
        outputName,
      ];

      await ffmpeg.exec(args);

      if (cancelledRef.current) return;

      const data = await ffmpeg.readFile(outputName);
      const mime = fileType === 'audio' ? 'audio/mpeg' : 'video/mp4';
      const blob = new Blob([data], { type: mime });
      setBlobUrl(URL.createObjectURL(blob));
      setOutputSize(blob.size);
      setProgress(1);
    } catch (err) {
      if (cancelledRef.current) return;
      console.error(err);
      setError('Something went wrong while trimming. Please try again.');
    } finally {
      setIsTrimming(false);
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    try {
      ffmpegRef.current.terminate();
    } catch (err) {
      console.error(err);
    }
    ffmpegRef.current = new FFmpeg();
    setFfmpegLoaded(false);
    setIsTrimming(false);
    setProgress(0);
    load();
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = blobUrl;
    const baseName = inputFile.name.replace(/\.[^.]+$/, '');
    const ext = inputFile.name.split('.').pop().toLowerCase();
    link.download = `${baseName}_trimmed.${ext}`;
    link.click();
  };

  const pct = Math.min(100, Math.round(progress * 100));
  const trimDuration = endTime - startTime;

  return (
    <div className="compressor">
      <input
        ref={inputRef}
        id="trim-file-input"
        type="file"
        hidden
        accept="audio/*,video/*"
        onChange={onChooseFile}
      />

      {error && <div className="error">{error}</div>}

      {!inputFile ? (
        <label
          htmlFor="trim-file-input"
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
            Audio or Video · preview and trim to exact times
          </div>
        </label>
      ) : (
        <>
          <div className="file-row">
            <div className="file-icon">
              {fileType === 'audio' ? <MusicIcon /> : <FilmIcon />}
            </div>
            <div className="file-meta">
              <div className="file-name">{inputFile.name}</div>
              <div className="file-sub">
                {fileType === 'audio' ? 'Audio' : 'Video'}
                {duration ? ` · ${formatTime(duration)}` : ''}
                {' · '}{formatBytes(inputFile.size)}
              </div>
            </div>
            {!isTrimming && (
              <button className="file-clear" onClick={reset} aria-label="Remove file">
                <CloseIcon />
              </button>
            )}
          </div>

          {/* Media Preview */}
          {!blobUrl && mediaUrl && (
            <div className="preview-wrapper">
              {fileType === 'video' ? (
                <video
                  ref={playerRef}
                  src={mediaUrl}
                  className="preview-video"
                  controls
                  onLoadedMetadata={onMediaLoaded}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onTimeUpdate={() => {
                    if (playerRef.current) setCurrentTime(playerRef.current.currentTime);
                  }}
                  playsInline
                />
              ) : (
                <audio
                  ref={playerRef}
                  src={mediaUrl}
                  className="preview-audio-visible"
                  controls
                  onLoadedMetadata={onMediaLoaded}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onTimeUpdate={() => {
                    if (playerRef.current) setCurrentTime(playerRef.current.currentTime);
                  }}
                />
              )}
            </div>
          )}

          {/* Timeline with trim handles */}
          {!blobUrl && !isTrimming && duration > 0 && (
            <div className="trim-controls">
              {/* Clickable timeline */}
              <div className="trim-timeline" onClick={handleTimelineClick}>
                <div className="trim-track">
                  {/* Dimmed regions outside selection */}
                  <div
                    className="trim-dim"
                    style={{ left: 0, width: `${(startTime / duration) * 100}%` }}
                  />
                  <div
                    className="trim-dim"
                    style={{ left: `${(endTime / duration) * 100}%`, width: `${((duration - endTime) / duration) * 100}%` }}
                  />
                  {/* Selected range */}
                  <div
                    className="trim-range"
                    style={{
                      left: `${(startTime / duration) * 100}%`,
                      width: `${((endTime - startTime) / duration) * 100}%`,
                    }}
                  />
                  {/* Playhead */}
                  <div
                    className="trim-playhead"
                    style={{ left: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
                {/* Range sliders */}
                <input
                  type="range"
                  className="trim-slider trim-slider-start"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={startTime}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (v < endTime - 0.5) {
                      setStartTime(v);
                      setStartInput(formatTime(v));
                    }
                  }}
                />
                <input
                  type="range"
                  className="trim-slider trim-slider-end"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={endTime}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (v > startTime + 0.5) {
                      setEndTime(v);
                      setEndInput(formatTime(v));
                    }
                  }}
                />
              </div>

              {/* Mark buttons */}
              <div className="mark-buttons">
                <button className="mark-btn" onClick={markStart}>
                  Set Start
                </button>
                <div className="trim-duration-badge">
                  {formatTime(trimDuration)}
                </div>
                <button className="mark-btn" onClick={markEnd}>
                  Set End
                </button>
              </div>

              {/* Time inputs */}
              <div className="trim-inputs">
                <div className="trim-field">
                  <label className="trim-field-label">Start</label>
                  <input
                    type="text"
                    className="trim-field-input"
                    value={startInput}
                    onChange={handleStartChange}
                    onBlur={handleStartBlur}
                  />
                </div>
                <div className="trim-field">
                  <label className="trim-field-label">End</label>
                  <input
                    type="text"
                    className="trim-field-input"
                    value={endInput}
                    onChange={handleEndChange}
                    onBlur={handleEndBlur}
                  />
                </div>
              </div>
            </div>
          )}

          {blobUrl && (
            <div className="convert-result">
              <div className="convert-result-label">
                Trimmed to {formatTime(trimDuration)}
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
                  Trim another file
                </button>
              </>
            ) : isTrimming ? (
              <>
                <div className="progress">
                  <div className="progress-head">
                    <span className="progress-label">Trimming…</span>
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
                onClick={handleTrim}
                disabled={!ffmpegLoaded || trimDuration <= 0}
              >
                {ffmpegLoaded ? (
                  <>
                    <ScissorsIcon /> Trim
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

export default Trimmer;
