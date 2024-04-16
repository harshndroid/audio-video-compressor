import React, { useEffect, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const Compressor = () => {
  const [fileType, setFileType] = useState(null);
  const [inputFile, setInputFile] = useState(null);
  const [inputFileSize, setInputFileSize] = useState(0);
  const [inputFileDuration, setInputFileDuration] = useState(0);
  const [outputFile, setOutputFile] = useState(null);
  const [outputFileSize, setOutputFileSize] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);

  const ffmpegRef = useRef(new FFmpeg());

  const load = async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    const ffmpeg = ffmpegRef.current;
    // ffmpeg.on('log', ({ message }) => {
    //   console.log('message', message);
    // });
    ffmpeg.on('progress', ({ time }) => {
      setProgress(time / 1000000);
    });
    // toBlobURL is used to bypass CORS issue, urls with the same
    // domain can be used directly
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        'application/wasm'
      ),
    });
  };

  const compressUsingFFmpeg = async () => {
    const ffmpeg = ffmpegRef.current;
    await ffmpeg.writeFile(inputFile.name, await fetchFile(inputFile));
    const outputFileName =
      fileType === 'audio' ? 'output_audio.mp3' : 'output_video.mp4';
    if (fileType === 'audio') {
      await ffmpeg.exec(['-i', inputFile.name, '-b:a', '12k', outputFileName]);
    } else {
      // ffmpeg -i input.mp4 -c:v libx264 -crf 28 -preset veryfast -vf "scale=iw/2:ih/2" output.mp4
      await ffmpeg.exec([
        '-i',
        inputFile.name,
        '-c:v',
        'libx264',
        '-crf',
        '28',
        '-preset',
        'veryfast',
        outputFileName,
      ]);
    }
    setIsCompressing(false);
    const data = await ffmpeg.readFile(outputFileName);
    const blob = new Blob([data], {
      type: fileType === 'audio' ? 'audio/mp3' : 'video/mp4',
    });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    setOutputFile(url);
    const filename = new File([blob], outputFileName);
    setOutputFileSize(Math.round(filename.size / 1000));
  };

  // console.log('====filetype', fileType);
  useEffect(() => {
    load();
  }, []);

  const onChooseFile = (e) => {
    const file = e.target.files[0];
    console.log('input file', file);
    file.name.split('.')[1] === 'mp3'
      ? setFileType('audio')
      : setFileType('video');

    const element =
      fileType === 'audio'
        ? document.createElement('audio')
        : document.createElement('video');

    element.onloadedmetadata = () => {
      // Access the duration once metadata is loaded
      console.log('input file duration', element.duration);
      setInputFileDuration(element.duration);
    };
    element.src = URL.createObjectURL(file);
    if (file === undefined) {
      setInputFile(null);
      setInputFileSize(0);
      setOutputFile(null);
      setOutputFileSize(0);
      return;
    }
    setInputFile(e.target.files[0]);
    setInputFileSize(Math.round(e.target.files[0].size / 1000));
    setOutputFile(null);
    setOutputFileSize(0);
  };
  const handleCompression = () => {
    setIsCompressing(true);
    compressUsingFFmpeg();
  };
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'column',
        flex: 1,
        border: '1px solid #6d778cc4',
        // margin: 20,
        paddingTop: 40,
        color: 'white',
        borderRadius: 8,
        backgroundColor: fileType === 'audio' ? '#576175c4' : '#404a5fc4',
      }}
    >
      <input
        id="actual-btn"
        type="file"
        hidden
        accept={'.mp3,audio/*' || '.mp4,video/*'}
        onChange={(e) => onChooseFile(e)}
      />
      <label
        style={{
          backgroundColor: 'white',
          // color: 'black',
          color: '#454d5fc4',
          cursor: 'pointer',
          height: 36,
          padding: '0px 16px',
          borderRadius: 4,
          fontSize: 14,
          marginTop: 10,
          boxShadow: '1px 1px 4px rgba(0,0,0,0.20)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        htmlFor="actual-btn"
      >
        Choose audio or video file
      </label>

      {inputFile && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: 20,
              justifyContent: 'space-around',
              color: '#c0bfbf',
            }}
          >
            <div>Size before compression</div>
            <div
              style={{ color: '#dc6c6c', fontWeight: 'bold', paddingLeft: 8 }}
            >
              {inputFileSize < 1024
                ? ` ${inputFileSize} KB`
                : ` ${(inputFileSize / 1000).toFixed(1)} MB`}
            </div>
          </div>
          {outputFile && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginTop: 20,
                justifyContent: 'space-around',
                color: '#c0bfbf',
              }}
            >
              <div>Size after compression</div>
              <div
                style={{ color: '#3faf3f', fontWeight: 'bold', paddingLeft: 8 }}
              >
                {outputFileSize < 1024
                  ? `${outputFileSize} KB`
                  : `${(outputFileSize / 1000).toFixed(1)} MB`}
              </div>
            </div>
          )}

          {isCompressing || progress !== 0 ? (
            <div
              style={{
                marginTop: 20,
                backgroundColor: 'white',
                height: 36,
                // width: 3 * Math.floor(inputFileDuration),
                width: 200,
                borderRadius: 4,
                boxShadow: '1px 1px 4px rgba(0,0,0,0.20)',
                position: 'relative',
                cursor: outputFile ? 'pointer' : 'auto',
              }}
              onClick={
                outputFile
                  ? () => {
                      const link = document.createElement('a');
                      link.href = blobUrl;
                      link.download =
                        fileType === 'audio'
                          ? 'output_audio.mp3'
                          : 'output_video.mp4';
                      link.click();
                    }
                  : () => console.log('no action')
              }
            >
              <div
                style={{
                  height: '100%',
                  // width: '100%',
                  width: 200,
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  color:
                    Math.floor(progress) <= Math.floor(inputFileDuration) / 1.5
                      ? '#454d5fc4'
                      : 'white',
                  fontWeight: 'bold',
                  zIndex: 2,
                }}
              >
                {outputFile ? 'Download' : 'Compressing...'}
              </div>
              <div
                style={{
                  height: '100%',
                  backgroundColor: '#159815',
                  borderRadius: 4,
                  width: 3 * Math.floor(progress),
                  maxWidth: 200,
                  position: 'absolute',
                  zIndex: 1,
                }}
              />
            </div>
          ) : (
            <div
              style={{
                marginTop: 20,
                backgroundColor: 'white',
                // color: 'black',
                color: '#454d5fc4',
                cursor: 'pointer',
                height: 36,
                // width: 3 * Math.floor(inputFileDuration),
                width: 200,
                borderRadius: 4,
                fontSize: 12,
                fontWeight: '600',
                boxShadow: '1px 1px 4px rgba(0,0,0,0.20)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onClick={handleCompression}
            >
              Compress
            </div>
          )}
        </div>
      )}
      {outputFile && (
        <div
          style={{
            marginTop: 6,
            fontSize: 14,
            fontWeight: '500',
            color: '#3faf3f',
          }}
        >
          (File size reduced by{' '}
          {Math.round((100 * (inputFileSize - outputFileSize)) / inputFileSize)}
          %)
        </div>
      )}
    </div>
  );
};

export default Compressor;
