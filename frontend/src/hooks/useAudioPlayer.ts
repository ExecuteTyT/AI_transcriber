import { useCallback, useEffect, useRef, useState } from "react";

interface UseAudioPlayerResult {
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  rate: number;
  /** Не null когда <audio> упал (load/decode/network) — обычно после истечения presigned URL. */
  error: MediaError | null;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  skip: (delta: number) => void;
  setRate: (rate: number) => void;
}

export function useAudioPlayer(src: string | null | undefined): UseAudioPlayerResult {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRateState] = useState(1);
  const [error, setError] = useState<MediaError | null>(null);

  // Сбрасываем error при смене src — новый URL получает чистый старт.
  useEffect(() => {
    setError(null);
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoad = () => {
      setDuration(audio.duration || 0);
      setError(null);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnd = () => setIsPlaying(false);
    const onError = () => {
      // Ошибка <audio>: чаще всего MEDIA_ERR_NETWORK (S3 presigned истёк → 403)
      // или MEDIA_ERR_SRC_NOT_SUPPORTED (CORS / неверный content-type).
      // Логируем явно, чтобы было видно в console при отладке у пользователя.
      const err = audio.error;
      if (err) {
        // eslint-disable-next-line no-console
        console.error("[audio] load failed:", { code: err.code, message: err.message, src });
        setError(err);
      }
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoad);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoad);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("error", onError);
    };
  }, [src]);

  const play = useCallback(() => {
    audioRef.current?.play().catch((err) => {
      // play() rejects если src недоступен (404/403/CORS). Молча игнорировать
      // нельзя — пользователь видит, что кнопка ничего не делает.
      // eslint-disable-next-line no-console
      console.error("[audio] play() rejected:", err);
    });
  }, []);
  const pause = useCallback(() => audioRef.current?.pause(), []);
  const toggle = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) play();
    else pause();
  }, [play, pause]);
  const seek = useCallback((seconds: number) => {
    if (audioRef.current) audioRef.current.currentTime = seconds;
  }, []);
  const skip = useCallback(
    (delta: number) => {
      if (!audioRef.current) return;
      audioRef.current.currentTime = Math.max(
        0,
        Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + delta)
      );
    },
    []
  );
  const setRate = useCallback((r: number) => {
    setRateState(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
  }, []);

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    rate,
    error,
    play,
    pause,
    toggle,
    seek,
    skip,
    setRate,
  };
}
