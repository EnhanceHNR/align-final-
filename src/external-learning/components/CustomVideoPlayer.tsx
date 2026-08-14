import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, ChevronRight, Check } from 'lucide-react';

interface CustomVideoPlayerProps {
  src: string;
}

const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ src }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsView, setSettingsView] = useState<'main' | 'speed'>('main');

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 2500);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', resetTimer);
      container.addEventListener('mouseleave', () => { if (isPlaying) setShowControls(false); });
    }
    resetTimer();

    return () => {
      clearTimeout(timeout);
      if (container) {
        container.removeEventListener('mousemove', resetTimer);
        container.removeEventListener('mouseleave', () => {});
      }
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      setCurrentTime(current);
      setProgress((current / total) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = (Number(e.target.value) / 100) * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
    }
    setProgress(Number(e.target.value));
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
        // iOS Safari native fullscreen support
        (videoRef.current as any).webkitEnterFullscreen();
      } else {
        containerRef.current?.requestFullscreen().catch(err => console.log(err));
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const handleSpeedChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSettingsMenu(false);
      setTimeout(() => setSettingsView('main'), 300); // reset view after closing
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full bg-black group overflow-hidden flex items-center justify-center"
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        autoPlay
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        controls={false} // Disable native controls completely
      />

      {/* Custom Controls Overlay */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        onClick={e => e.stopPropagation()} // Prevent toggling play when interacting with controls
      >
        {/* Progress Bar */}
        <div className="relative w-full h-1.5 bg-white/30 cursor-pointer mb-4 group-hover/progress:h-2 transition-all rounded-full">
          <div 
            className="absolute top-0 left-0 h-full bg-sky-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={progress} 
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="hover:text-sky-400 transition-colors">
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>
            <button onClick={toggleMute} className="hover:text-sky-400 transition-colors">
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <div className="text-xs font-medium tracking-wide">
              {formatTime(currentTime)} <span className="text-white/50">/</span> {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-4 relative">
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(!showSettingsMenu); setSettingsView('main'); }} 
                className={`hover:text-sky-400 transition-colors p-1 rounded-full ${showSettingsMenu ? 'text-sky-400 rotate-45' : 'text-white'} transition-all duration-300`}
              >
                <Settings size={20} />
              </button>
              
              {showSettingsMenu && (
                <div 
                  className="absolute bottom-full right-0 mb-4 bg-black/90 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[220px] z-50 text-white transform origin-bottom-right animate-in fade-in zoom-in-95 duration-200"
                  onClick={e => e.stopPropagation()}
                >
                  {settingsView === 'main' ? (
                    <div className="py-2">
                      <button 
                        onClick={() => setSettingsView('speed')}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <Play size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                          <span className="text-sm font-medium">Playback speed</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 group-hover:text-white transition-colors">
                          {playbackRate === 1 ? 'Normal' : `${playbackRate}x`}
                          <ChevronRight size={14} />
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="py-2">
                      <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 mb-1">
                        <button 
                          onClick={() => setSettingsView('main')}
                          className="hover:text-sky-400 transition-colors"
                        >
                          <ChevronRight size={16} className="rotate-180" />
                        </button>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Playback Speed</span>
                      </div>
                      <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                          <button
                            key={rate}
                            onClick={() => handleSpeedChange(rate)}
                            className="w-full flex items-center px-4 py-2.5 hover:bg-white/10 transition-colors"
                          >
                            <div className="w-6 flex justify-center">
                              {playbackRate === rate && <Check size={14} className="text-sky-400" />}
                            </div>
                            <span className={`text-sm ${playbackRate === rate ? 'text-sky-400 font-bold' : 'text-slate-200'}`}>
                              {rate === 1 ? 'Normal' : rate}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button onClick={toggleFullscreen} className="hover:text-sky-400 transition-colors">
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Big Play Button Overlay when paused */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 p-4 rounded-full backdrop-blur-sm border border-white/10">
            <Play size={48} className="text-white fill-white ml-2" />
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomVideoPlayer;
