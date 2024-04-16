import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import Compressor from './Compressor';
import SampleAudio from './assets/sample_audio.mp3';
// import ReactPlayer from 'react-player';

// let tempVideos = [];
const VIDEOS_ARRAY = [
  // links
  // '215510-00350-M-0012.mp4', // 220030
  '220000-00102-M-0012.mp4',
  '220142-00112-M-0012.mp4',
  '220334-00110-M-0012.mp4', // 220500
  '220524-00117-M-0012.mp4',
];

const videoToPlay = { start: 220020, end: 220518 };

function App() {
  const playerRef = useRef(null);
  const [playerPlaying, setPlayerPlaying] = useState(true);
  const [isReady, setIsReady] = React.useState(false);
  const [vidIndex, setVidIndex] = useState(0);
  const [tempVideos, setTempVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const videoEl = useRef(null);

  const handleLoadedMetadata = (e) => {
    console.log('======e', e);
    const video = videoEl.current;
    if (!video) return;
    console.log(`The video is ${video.duration} seconds long.`, { video });
  };
  const getTimings = () => {
    return VIDEOS_ARRAY.map((ele) => {
      const subEles = ele.split('-');
      return Number(subEles[0]);
    });
  };

  useEffect(() => {
    const timings = getTimings();

    const videoStartTime = videoToPlay.start;
    const videoEndTime = videoToPlay.end;

    let startBoundary, endBoundary;
    let startIndex = timings.findIndex((ele) => ele >= videoStartTime);
    console.log('=========', timings, startIndex);

    // startIndex > 0 && remove this if requested videoStartTime is before all videos present
    if (startIndex > 0 && !timings.includes(videoStartTime)) {
      startIndex = startIndex - 1;
    }
    if (startIndex >= 0) startBoundary = startIndex;

    let endIndex = timings.findIndex((ele) => ele >= videoEndTime);
    if (endIndex > 0 && !timings.includes(videoEndTime)) {
      endIndex = endIndex - 1;
    }
    if (endIndex >= 0) endBoundary = endIndex;

    let _temp = [];
    for (let i = startBoundary; i <= endBoundary; i++) {
      // convert startBoundary time (215510) and actual video start time (220030) in seconds
      // actual video start time (220030)
      const seconds = Number(
        videoStartTime.toString()[4] + videoStartTime.toString()[5]
      );
      const minutes = Number(
        videoStartTime.toString()[2] + videoStartTime.toString()[3]
      );
      const hours = Number(
        videoStartTime.toString()[0] + videoStartTime.toString()[1]
      );
      // calc for startBoundary time (220000)
      const _seconds = Number(
        timings[startBoundary].toString()[4] +
          timings[startBoundary].toString()[5]
      );
      const _minutes = Number(
        timings[startBoundary].toString()[2] +
          timings[startBoundary].toString()[3]
      );
      const _hours = Number(
        timings[startBoundary].toString()[0] +
          timings[startBoundary].toString()[1]
      );

      let startDuration =
        hours * 3600 +
        minutes * 60 +
        seconds -
        (_hours * 3600 + _minutes * 60 + _seconds);
      let endDuration = 0;
      if (i > startBoundary) {
        startDuration = 0;
      }
      if (i === endBoundary) {
        console.log('end boundary reached');
        // calc for actual video start time (220122)
        // get 01:22 = 82 sec and subtract actual start time
        const seconds1 = Number(
          videoEndTime.toString()[4] + videoEndTime.toString()[5]
        );
        const minutes1 = Number(
          videoEndTime.toString()[2] + videoEndTime.toString()[3]
        );
        const hours1 = Number(
          videoEndTime.toString()[0] + videoEndTime.toString()[1]
        );
        // calc for startBoundary time (220000)
        const _seconds1 = Number(
          timings[endBoundary].toString()[4] +
            timings[endBoundary].toString()[5]
        );
        const _minutes1 = Number(
          timings[endBoundary].toString()[2] +
            timings[endBoundary].toString()[3]
        );
        const _hours1 = Number(
          timings[endBoundary].toString()[0] +
            timings[endBoundary].toString()[1]
        );

        endDuration =
          hours1 * 3600 +
          minutes1 * 60 +
          seconds1 -
          (_hours1 * 3600 + _minutes1 * 60 + _seconds1);
      }

      _temp.push({
        videoChunkLink: VIDEOS_ARRAY[i],
        ...(startDuration && { playParticularVideoChunkFrom: startDuration }), // seconds
        ...(i === endBoundary && {
          playParticularVideoChunkTill: endDuration + 1,
        }), // seconds
      });
    }

    setTempVideos(_temp);
    setLoading(false);
    // window.tempVideos = tempVideos;
    console.log('tempVideos', _temp);
  }, []);

  useEffect(() => {}, [playerPlaying]);
  const onReady = useCallback(
    (vid) => {
      console.log('on ready', isReady, vidIndex);
      if (!isReady) {
        console.log('=====index', vid[vidIndex]);
        let timeToStart = 0;
        if (vid[vidIndex].playParticularVideoChunkFrom !== undefined) {
          timeToStart = vid[vidIndex].playParticularVideoChunkFrom;
        }
        if (vid[vidIndex].playParticularVideoChunkFrom !== undefined) {
          timeToStart = vid[vidIndex].playParticularVideoChunkFrom;
        }
        playerRef.current.seekTo(timeToStart, 'seconds');
        setPlayerPlaying(true);
        setIsReady(true);
      }
    },
    [isReady]
  );
  const clickNext = () => {
    setVidIndex((val) => val + 1);
  };

  console.log(tempVideos);
  if (loading) return <div>loading...</div>;
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
