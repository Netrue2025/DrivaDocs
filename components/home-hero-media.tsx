"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

const fallbackHeroImage = "/images/drivadocs-hero.png";
const remoteHeroVideo = "https://netrue.io/media/DrivaDocsHeroVideo.mp4";
const localHeroVideo = "/videos/drivadocs-hero-fallback.mp4";

export function HomeHeroMedia() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState(remoteHeroVideo);
  const [playing, setPlaying] = useState(false);

  const playVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, []);

  useEffect(() => {
    playVideo();
  }, [playVideo]);

  return (
    <>
      <Image
        src={fallbackHeroImage}
        alt="DrivaDocs vehicle documentation and home office delivery service"
        fill
        priority
        sizes="100vw"
        className={`absolute inset-0 object-cover object-center transition-opacity duration-700 ${playing ? "opacity-0" : "opacity-100"}`}
      />
      <video
        key={videoSrc}
        ref={videoRef}
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        poster={fallbackHeroImage}
        onLoadedData={playVideo}
        onCanPlay={playVideo}
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          if (videoSrc !== localHeroVideo) setVideoSrc(localHeroVideo);
        }}
        className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ${playing ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}
