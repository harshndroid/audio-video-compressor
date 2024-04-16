import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import Compressor from './Compressor';
import SampleAudio from './assets/sample_audio.mp3';

const videoToPlay = { start: 220020, end: 220518 };

function App() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '50%',
        height: '60%',
        color: 'white',
      }}
    >
      <a
        href={SampleAudio}
        download="sample_audio.mp3"
        style={{
          color: '#cad5ebc4',
          textAlign: 'center',
          marginBottom: 20,
          textUnderlinePosition: 'under',
        }}
      >
        Click here and download sample audio!
      </a>
      <Compressor />
      {/* <div>
        <ReactPlayer
          ref={playerRef}
          style={{ height: 800, width: 800 }}
          playing={playerPlaying}
          muted
          url={require(`./assets/${tempVideos[vidIndex].videoChunkLink}`)}
          controls
          onReady={() => onReady(tempVideos)}
          onProgress={(p) => {
            console.log(
              'on progress',
              Math.floor(p.playedSeconds),
              tempVideos[vidIndex].playParticularVideoChunkTill
            );
            if (
              tempVideos[vidIndex].playParticularVideoChunkTill !== undefined &&
              Math.floor(p.playedSeconds) ===
                tempVideos[vidIndex].playParticularVideoChunkTill
            ) {
              console.log('====stop playing');
              setPlayerPlaying(false);
            }
          }}
          onEnded={() => {
            setIsReady(false);
            console.log('on ended', vidIndex + 1, tempVideos.length);
            vidIndex + 1 !== tempVideos.length && clickNext();
          }}
        />
      </div> */}
    </div>
  );
}

export default App;
