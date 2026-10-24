import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SugarWorkshopScene, type WorkshopLightingMode, type SceneInspectionData } from './scene/SugarWorkshopScene';
import { Header } from './components/Header';
import { InteractionOverlay } from './components/InteractionOverlay';
import { StoryProgressOverlay } from './components/StoryProgressOverlay';
import { InspectionModal } from './components/InspectionModal';
import { CraftsmanshipModal } from './components/CraftsmanshipModal';
import { ExportModal } from './components/ExportModal';
import { sugarAudio } from './utils/audio';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SugarWorkshopScene | null>(null);

  // App States
  const [scale, setScale] = useState<number>(1.0);
  const [isHeld, setIsHeld] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [creationProgress, setCreationProgress] = useState<number>(1.0);
  const [lightingMode, setLightingMode] = useState<WorkshopLightingMode>('warm_workshop');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Modals
  const [isInspectOpen, setIsInspectOpen] = useState<boolean>(false);
  const [isCraftStoryOpen, setIsCraftStoryOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [inspectionData, setInspectionData] = useState<SceneInspectionData | null>(null);

  // Initialize 3D Scene
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    // Check URL parameters for ?autostart=1 (skip intro animation straight to interactive scene)
    const urlParams = new URLSearchParams(window.location.search);
    const autostart = urlParams.get('autostart') === '1';

    const workshopScene = new SugarWorkshopScene(containerRef.current, canvasRef.current, { autostart });
    sceneRef.current = workshopScene;
    (window as unknown as { __scene: SugarWorkshopScene }).__scene = workshopScene;

    workshopScene.onStateChange = () => {
      setScale(workshopScene.scaleController.scale);
      setIsHeld(workshopScene.scaleController.isHeld);
      setIsCreating(workshopScene.isCreating);
      setCreationProgress(workshopScene.creationProgress);
      setIsLoaded(workshopScene.isModelLoaded);
    };

    workshopScene.onCreationComplete = () => {
      setIsCreating(false);
      setCreationProgress(1.0);
    };

    workshopScene.onInspectUpdate = (data) => {
      setInspectionData(data);
      setScale(data.scale);
      setIsHeld(data.isHeld);
    };

    const handleResize = () => {
      workshopScene.handleResize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      workshopScene.destroy();
      sceneRef.current = null;
    };
  }, []);

  // Update creation progress timer
  useEffect(() => {
    if (!isCreating) return;
    const interval = setInterval(() => {
      if (sceneRef.current) {
        setCreationProgress(sceneRef.current.creationProgress);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isCreating]);

  // Lighting Mode Change
  const handleLightingChange = useCallback((mode: WorkshopLightingMode) => {
    setLightingMode(mode);
    sceneRef.current?.setLightingMode(mode);
  }, []);

  // Sound Toggle
  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      sugarAudio.enabled = next;
      if (next) {
        sugarAudio.startWorkshopAmbience();
        sugarAudio.playSugarChime(0);
      } else {
        sugarAudio.stopBreath();
      }
      return next;
    });
  }, []);

  // Replay Story Sequence
  const handleReplayStory = useCallback(() => {
    if (!sceneRef.current || isCreating) return;
    setIsCreating(true);
    sceneRef.current.startCreationSequence();
  }, [isCreating]);

  // Skip Story Sequence
  const handleSkipStory = useCallback(() => {
    if (!sceneRef.current) return;
    sceneRef.current.skipCreationSequence();
    setIsCreating(false);
  }, []);

  // Angle Presets
  const handleAngleChange = useCallback((angle: 'front' | 'side' | 'back' | 'reset') => {
    if (!sceneRef.current) return;
    if (angle === 'front') {
      sceneRef.current.setRotationTarget(0, 0);
    } else if (angle === 'side') {
      sceneRef.current.setRotationTarget(Math.PI / 2, 0);
    } else if (angle === 'back') {
      sceneRef.current.setRotationTarget(Math.PI, 0);
    } else if (angle === 'reset') {
      sceneRef.current.resetView();
    }
    sugarAudio.playWoodTap();
  }, []);

  // Button-based Breathing Press Start / End
  const handlePressStart = useCallback(() => {
    sceneRef.current?.setBlowingHeld(true);
  }, []);

  const handlePressEnd = useCallback(() => {
    sceneRef.current?.setBlowingHeld(false);
  }, []);

  // High-res Screenshot capture
  const handleCaptureAngle = useCallback((angle: 'front' | 'side' | 'back'): string => {
    if (!sceneRef.current) return '';
    return sceneRef.current.captureView(angle);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden bg-[#160e08] select-none font-serif text-[#fceddb]"
    >
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        id="scene"
        tabIndex={0}
        role="button"
        aria-label="3D吹糖人互动场景：长按拖动可360度旋转，长按吹气按钮或按空格键吹气膨胀"
        className="w-full h-full block cursor-grab active:cursor-grabbing outline-none"
      />

      {/* Top Header & Navigation */}
      <Header
        lightingMode={lightingMode}
        onLightingChange={handleLightingChange}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onReplayStory={handleReplayStory}
        onOpenInspect={() => setIsInspectOpen(true)}
        onOpenCraftStory={() => setIsCraftStoryOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        isCreating={isCreating}
      />

      {/* Creation Animation Story Overlay (Scene 02) */}
      {isCreating && (
        <StoryProgressOverlay progress={creationProgress} onSkip={handleSkipStory} />
      )}

      {/* Interactive Controls & Breathing Island (Scene 03) */}
      <InteractionOverlay
        scale={scale}
        isHeld={isHeld}
        onPressStart={handlePressStart}
        onPressEnd={handlePressEnd}
        onAngleChange={handleAngleChange}
        isCreating={isCreating}
      />

      {/* Loading Screen until 3D assets ready */}
      {!isLoaded && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#170e08] text-amber-200">
          <div className="w-16 h-16 rounded-full border-2 border-amber-600/30 border-t-amber-400 animate-spin mb-4" />
          <h2 className="text-xl font-serif tracking-widest text-[#ffeacc] mb-1">
            正在点燃铜炉，融化麦芽饴糖…
          </h2>
          <p className="text-xs text-stone-400 font-sans tracking-wide">
            装载原始 3D 造型部件与琥珀光泽材质中
          </p>
        </div>
      )}

      {/* Modals */}
      <InspectionModal
        isOpen={isInspectOpen}
        onClose={() => setIsInspectOpen(false)}
        data={inspectionData}
        onCaptureAngle={handleCaptureAngle}
      />

      <CraftsmanshipModal
        isOpen={isCraftStoryOpen}
        onClose={() => setIsCraftStoryOpen(false)}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
