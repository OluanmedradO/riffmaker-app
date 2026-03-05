import { Project } from "@/src/domain/types/project";
import { Riff } from "@/src/domain/types/riff";
import { metronome } from "@/src/domain/services/metronome";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Play, Stop } from "phosphor-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useTheme } from '@/src/shared/theme/ThemeProvider';

interface ProjectPreviewBannerProps {
  project: Project | null;
  riffs: Riff[];
  onPlayingRiffChange?: (riffId: string | null) => void;
  onPlaybackProgress?: (globalMs: number) => void;
}

export function ProjectPreviewBanner({ project, riffs, onPlayingRiffChange, onPlaybackProgress }: ProjectPreviewBannerProps) {
  const theme = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Metronome / Count-in States
  const hasBpm = !!project?.bpm;
  const [useClick, setUseClick] = useState(false);
  const [useCountIn, setUseCountIn] = useState(true);
  const [isCountingIn, setIsCountingIn] = useState(false);
  const countInBeatsRef = useRef(0);
  const countInTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filter only playable riffs based on sections
  const playableRiffs = (project?.sections || []).flatMap(sec => {
    return sec.riffIds.map(id => riffs.find(r => r.id === id))
      .filter((r): r is Riff => r !== undefined && !!r.audioUri && !r.corrupted)
      .map((r, i, arr) => ({
        riff: r,
        sectionName: sec.name,
        indexInSection: i + 1,
        totalInSection: arr.length
      }));
  });

  const currentItem = playableRiffs[currentIndex];
  const audioPlayer = useAudioPlayer(currentItem?.riff.audioUri ?? null, {
    updateInterval: 100,
  });
  const status = useAudioPlayerStatus(audioPlayer);

  // Initialize Metronome Sound
  useEffect(() => {
    metronome.init();
    return () => metronome.dispose();
  }, []);

  const clearCountInTimer = () => {
    if (countInTimerRef.current) {
      clearInterval(countInTimerRef.current);
      countInTimerRef.current = null;
    }
  };

  const startActualPlayback = () => {
    setIsCountingIn(false);
    clearCountInTimer();
    
    // Stop metronome if click is disabled. If enabled, it stays playing alongside
    if (!useClick) {
      metronome.stop();
    }
    
    if (status.isLoaded) {
      audioPlayer.play();
    }
  };

  // Keep track of accumulated past duration
  const [accumulatedMs, setAccumulatedMs] = useState(0);

  // Emit progress to parent and calculate Active Marker
  const [activeMarker, setActiveMarker] = useState<any>(null);

  useEffect(() => {
    if (isPlaying && !isCountingIn && status.isLoaded) {
       const globalMs = accumulatedMs + status.currentTime;
       if (onPlaybackProgress) onPlaybackProgress(globalMs);

       // Find the most recent marker that has passed
       if (project?.markers) {
          const currentMarker = [...project.markers]
            .reverse()
            .find(m => globalMs >= m.timestampMs && globalMs < m.timestampMs + 4000); // Highlight lasts 4 seconds
          
          setActiveMarker(currentMarker || null);
       }
    } else {
       setActiveMarker(null);
    }
  }, [status, isPlaying, isCountingIn, accumulatedMs, onPlaybackProgress, project?.markers]);

  useEffect(() => {
    if (isPlaying && !isCountingIn && status.isLoaded && !status.playing && !status.didJustFinish) {
       audioPlayer.play();
    }
    
    if (isPlaying && !isCountingIn && status.didJustFinish) {
      if (currentIndex < playableRiffs.length - 1) {
         setAccumulatedMs(prev => prev + (currentItem?.riff.duration || 0));
         setCurrentIndex((prev) => prev + 1);
      } else {
         // Finished the whole project
         setIsPlaying(false);
         setCurrentIndex(0);
         setAccumulatedMs(0);
         audioPlayer.seekTo(0);
         onPlayingRiffChange?.(null);
         if (onPlaybackProgress) onPlaybackProgress(0);
         metronome.stop();
      }
    }
  }, [status, isPlaying, isCountingIn, currentIndex, playableRiffs.length, audioPlayer, onPlayingRiffChange, currentItem, onPlaybackProgress]);

  useEffect(() => {
    if (isPlaying && !isCountingIn) {
      onPlayingRiffChange?.(playableRiffs[currentIndex]?.riff.id || null);
    } else {
      onPlayingRiffChange?.(null);
    }
  }, [isPlaying, isCountingIn, currentIndex, playableRiffs, onPlayingRiffChange]);

  const handleToggle = () => {
    if (isPlaying) {
      setIsPlaying(false);
      setIsCountingIn(false);
      clearCountInTimer();
      audioPlayer.pause();
      metronome.stop();
      if (onPlaybackProgress) onPlaybackProgress(accumulatedMs + (status.isLoaded ? status.currentTime : 0));
    } else {
      setIsPlaying(true);
      
      if (hasBpm && (useCountIn || useClick)) {
         metronome.setBpm(project.bpm!);
         metronome.start();
         
         if (useCountIn) {
            setIsCountingIn(true);
            countInBeatsRef.current = 0;
            const msPerBeat = 60000 / project.bpm!;
            
            // Interval to track count-in beats (4 beats = 1 measure)
            countInTimerRef.current = setInterval(() => {
               countInBeatsRef.current += 1;
               if (countInBeatsRef.current >= 4) {
                  startActualPlayback();
               }
            }, msPerBeat);
         } else {
            startActualPlayback();
         }
      } else {
         startActualPlayback();
      }
    }
  };

  if (playableRiffs.length === 0) return null;

  return (
    <Pressable 
      onPress={handleToggle}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderRadius: 16,
          marginBottom: 20,
          marginHorizontal: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 4,
        }, 
        { 
          backgroundColor: theme.primary, 
          opacity: pressed ? 0.8 : 1,
          flexDirection: "column",
          alignItems: "stretch"
        }
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {isPlaying ? (
            <Stop size={20} color={theme.primaryForeground} weight="fill" />
          ) : (
            <Play size={20} color={theme.primaryForeground} weight="fill" />
          )}
          <Text style={{ color: theme.primaryForeground, fontWeight: "bold", fontSize: 16 }}>
            {isPlaying ? (isCountingIn ? "Count-in..." : "Parar Preview") : "Preview do Projeto"}
          </Text>
        </View>

        {isPlaying && !isCountingIn && currentItem && (
          <View style={{ backgroundColor: "rgba(0,0,0,0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
             <Text style={{ color: theme.primaryForeground, fontWeight: "bold", fontSize: 12 }}>
               {currentItem.sectionName} · {currentItem.indexInSection}/{currentItem.totalInSection}
             </Text>
          </View>
        )}
      </View>

      {hasBpm && !isPlaying && (
        <View style={{ marginTop: 16, flexDirection: "row", gap: 16, paddingHorizontal: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
             <Switch 
               value={useClick} 
               onValueChange={setUseClick} 
               trackColor={{ true: theme.primaryForeground + "80", false: "rgba(0,0,0,0.2)" }}
               thumbColor={useClick ? theme.card : theme.muted}
             />
             <Text style={{ color: theme.primaryForeground, fontSize: 14 }}>Click</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
             <Switch 
               value={useCountIn} 
               onValueChange={setUseCountIn} 
               trackColor={{ true: theme.primaryForeground + "80", false: "rgba(0,0,0,0.2)" }}
               thumbColor={useCountIn ? theme.card : theme.muted}
             />
             <Text style={{ color: theme.primaryForeground, fontSize: 14 }}>Count-in</Text>
          </View>
        </View>
      )}

      {isPlaying && !isCountingIn && activeMarker && (
         <View style={[styles.subtitleContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.subtitleText, { color: theme.primary }]} numberOfLines={2}>
              {activeMarker.text}
            </Text>
         </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  subtitleContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitleText: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 20,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  }
});


