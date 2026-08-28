'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { DrumId, InstrumentId, NoteName } from '@/core/types';
import {
  addMelodyNote,
  adjustPitchBound,
  clearAllowedNotes,
  removeMelodyNote,
  setAllowAccidentals,
  setAllowedNotes,
  setBlocks,
  setMelodyNoteDuration,
  toggleAllowedNote,
  toggleDrumHit,
  toggleMelodyNoteLock,
  toggleDrumHitLock,
} from '@/core/ops';
import { migrateSong } from '@/core/legacy';
import { buildRangeNotes, findMelodyNoteAt } from '@/ui/grid';
import { AudioEngine, preloadPianoSamples } from '@/audio/engine';
import { audioBufferToWavBlob } from '@/audio/wav';
import { useDragInteraction } from '@/hooks/useDragInteraction';
import { authDisplayName } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { useAccount } from '@/app/components/AccountProvider';
import { useSong } from '@/hooks/useSong';
import { useDiscoveries } from '@/hooks/useDiscoveries';
import { useDiscoveryFeedback } from '@/hooks/useDiscoveryFeedback';
import { useChallengeMode } from '@/hooks/useChallengeMode';
import { supabase } from '@/lib/supabase';
import { creatureForDiscovery } from '@/creatures/catalog';
import { SaveModal } from './components/SaveModal';
import { NotePanel } from './components/NotePanel';
import { Header } from './components/Header';
import { SettingsPanel } from './components/SettingsPanel';
import { Grid } from './components/Grid';
import { DiscoveryFeedback } from './components/discovery/DiscoveryFeedback';
import { ChallengePicker } from './components/challenges/ChallengePicker';
import { ChallengeStage } from './components/challenges/ChallengeStage';
import { ChallengeCompleteModal } from './components/challenges/ChallengeCompleteModal';
import { EditorCompanion } from './components/companion/EditorCompanion';

export default function Home() {
  const { locale, t } = useLocale();
  const { user, companionDiscoveryId, companionLoading } = useAccount();
  const { progress: discoveryProgress, claimDiscoveries } = useDiscoveries(user);
  const { song, setSong, songRef, canUndo, pushHistory, undo, reset } = useSong();
  const {
    activeChallengeId,
    reaction: challengeReaction,
    completed: completedChallenge,
    isPickerOpen: isChallengePickerOpen,
    openPicker: openChallengePicker,
    closePicker: closeChallengePicker,
    startChallenge,
    startRandomChallenge,
    onPlaybackStep: onChallengePlaybackStep,
    stopPlayback: stopChallengePlayback,
    completeChallenge,
    dismissCompletion: dismissChallengeCompletion,
    exitChallenge,
  } = useChallengeMode(song);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadStep, setPlayheadStep] = useState<number | null>(null);
  const [isNotePanelOpen, setIsNotePanelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isLockMode, setIsLockMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [companionReactionKey, setCompanionReactionKey] = useState(0);
  // The song loaded via ?load=<id>, so its owner can overwrite it on save.
  const [loadedSong, setLoadedSong] = useState<{
    id: string;
    title: string;
    author: string;
    description: string | null;
    userId: string | null;
    isTemplate: boolean;
  } | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<AudioEngine | null>(null);
  const {
    effects: discoveryEffects,
    revealQueue: discoveryRevealQueue,
    focus: discoveryFocus,
    captureSource: captureDiscoverySource,
    clearSource: clearDiscoverySource,
    onPlaybackStep: onDiscoveryPlaybackStep,
    clearEffects: clearDiscoveryEffects,
    dismissEffect: dismissDiscoveryEffect,
    finishReveal: finishDiscoveryReveal,
  } = useDiscoveryFeedback({
    song,
    songRef,
    currentUserId: user?.id ?? null,
    loadedSongOwnerId: loadedSong?.userId ?? null,
    claimDiscoveries,
  });

  // Tear down audio when the editor unmounts (e.g. tapping "みんなの曲" mid-play),
  // otherwise the scheduler keeps running and the song can't be stopped.
  useEffect(() => {
    return () => engineRef.current?.dispose();
  }, []);

  // The settings panel is inserted above the editor content. Wait until React
  // has committed it before scrolling, otherwise production scroll anchoring
  // can restore the old position and leave the new panel behind the header.
  useEffect(() => {
    if (!isSettingsOpen) return;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isSettingsOpen]);

  // Warm the piano-sample cache before the first user gesture so the first
  // Play/preview sounds the sampled piano, not the 8bit fallback. Keyed on the
  // pitch range: only the samples this song can sound are fetched, and widening
  // the range (or loading a wider song) pulls the added ones before the child
  // can play a note in them.
  const { minNote, maxNote } = song.constraints;
  useEffect(() => {
    preloadPianoSamples(minNote, maxNote);
  }, [minNote, maxNote]);

  // ?new=1 —「つくる」from /songs: start from a plain sheet. reset() clears
  // the song, the undo history, and the stored work, so the previous sheet
  // isn't restored (that restore is #78's protection against *accidental*
  // navigation — browser back / reload — which carries no ?new).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('new')) return;
    clearDiscoverySource();
    reset();
    window.history.replaceState({}, '', '/');
  }, [clearDiscoverySource, reset]);

  // ?load=<id> で曲を読み込む
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loadId = params.get('load');
    if (!loadId) return;
    supabase
      .from('songs')
      .select('id, title, author, description, song_data, user_id, is_template')
      .eq('id', loadId)
      .single()
      .then(({ data, error }) => {
        if (data?.song_data) {
          const migrated = migrateSong(data.song_data);
          captureDiscoverySource(migrated);
          setSong(migrated);
          setLoadedSong({
            id: data.id,
            title: data.title,
            author: data.author,
            description: data.description ?? null,
            userId: data.user_id ?? null,
            isTemplate: data.is_template ?? false,
          });
          window.history.replaceState({}, '', '/');
        } else {
          // Not found or not readable (e.g. someone else's draft, or the
          // session isn't restored yet). Say so instead of silently showing
          // an empty grid, and keep ?load in the URL so reloading after a
          // login retries the fetch.
          console.error('[BeatBubble] load failed:', error);
          setLoadFailed(true);
        }
      });
  }, [captureDiscoverySource, setSong]);

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new AudioEngine();
    }
    return engineRef.current;
  }, []);

  const reactCompanion = useCallback(() => {
    setCompanionReactionKey((current) => current + 1);
  }, []);

  const handleNoteCreate = useCallback(
    (noteName: NoteName, step: number): string | null => {
      const newSong = addMelodyNote(song, {
        startStep: step,
        durationSteps: 1,
        note: noteName,
      });
      const addedNote = newSong.melody.notes.find(
        (n) => n.startStep === step && n.note === noteName,
      );
      if (addedNote) {
        pushHistory(song);
        setSong(newSong);
        reactCompanion();
        getEngine()
          .playNotePreview(noteName, song.instrument)
          .catch((error) => console.error('Note preview failed:', error));
        return addedNote.id;
      }
      return null;
    },
    [song, setSong, getEngine, pushHistory, reactCompanion],
  );

  const handleNoteRemove = useCallback(
    (noteId: string) => {
      pushHistory(song);
      setSong((prev) => removeMelodyNote(prev, noteId));
      reactCompanion();
    },
    [song, setSong, pushHistory, reactCompanion],
  );

  const handleNoteDurationChange = useCallback(
    (noteId: string, duration: number) => {
      setSong((prev) => setMelodyNoteDuration(prev, noteId, duration));
    },
    [setSong],
  );

  const handleDrumToggle = useCallback(
    (drumId: DrumId, step: number) => {
      const wasHit = song.drums.hits.some((h) => h.drumId === drumId && h.step === step);
      pushHistory(song);
      setSong((prev) => toggleDrumHit(prev, { step, drumId }));
      reactCompanion();
      if (!wasHit) {
        getEngine()
          .playDrumPreview(drumId)
          .catch((error) => console.error('Drum preview failed:', error));
      }
    },
    [song, setSong, getEngine, pushHistory, reactCompanion],
  );

  const findNoteAt = useCallback(
    (noteName: NoteName, step: number) => findMelodyNoteAt(song, noteName, step),
    [song],
  );

  const handleDragStart = useCallback(() => {
    pushHistory(songRef.current);
  }, [pushHistory, songRef]);

  const handleToggleMelodyLock = useCallback(
    (noteName: NoteName, step: number) => {
      const note = findMelodyNoteAt(song, noteName, step);
      if (!note) return;
      pushHistory(song);
      setSong((prev) => toggleMelodyNoteLock(prev, note.id));
    },
    [song, setSong, pushHistory],
  );

  const handleToggleDrumLock = useCallback(
    (drumId: DrumId, step: number) => {
      const hit = song.drums.hits.find((h) => h.drumId === drumId && h.step === step);
      if (!hit) return;
      pushHistory(song);
      setSong((prev) => toggleDrumHitLock(prev, { step, drumId }));
    },
    [song, setSong, pushHistory],
  );

  // Lock editing is blocked only for someone else's *template*: a student must
  // not be able to unlock the fixed backing in a template they opened. Any other
  // song — fresh, your own, or someone else's non-template — stays freely
  // lockable (overwriting the saved row is still owner-only, enforced by RLS).
  const isLoadedOwner = !!user && !!loadedSong && loadedSong.userId === user.id;
  const canLock = !loadedSong || isLoadedOwner || !loadedSong.isTemplate;
  const lockActive = isLockMode && canLock;

  const { isDragging, getMelodyCellHandlers, getDrumCellHandlers, containerHandlers } =
    useDragInteraction({
      gridRef,
      gridContainerRef,
      onNoteCreate: handleNoteCreate,
      onNoteRemove: handleNoteRemove,
      onNoteDurationChange: handleNoteDurationChange,
      onDragStart: handleDragStart,
      onDrumToggle: handleDrumToggle,
      findNoteAt,
      isLockMode: lockActive,
      onToggleMelodyLock: handleToggleMelodyLock,
      onToggleDrumLock: handleToggleDrumLock,
    });

  const handlePlay = async () => {
    if (isPlaying) return;
    try {
      const engine = getEngine();
      await engine.init();
      // Before play() resolves it may briefly wait for piano samples; show
      // the playing state already so Stop stays available during the wait.
      setIsPlaying(true);
      await engine.play(
        () => songRef.current,
        (step) => {
          setPlayheadStep(step);
          onChallengePlaybackStep(step);
          if (onDiscoveryPlaybackStep(step)) {
            engine.stop();
            setIsPlaying(false);
            stopChallengePlayback();
          }
        },
      );
      // play() can bail without starting (stopped while waiting for samples,
      // or the engine was disposed mid-wait) — don't leave the UI stuck.
      if (engine.getState() !== 'playing') {
        setIsPlaying(false);
        setPlayheadStep(null);
      }
    } catch (error) {
      console.error('Failed to start audio:', error);
      setIsPlaying(false);
      setPlayheadStep(null);
    }
  };

  const handleStop = () => {
    if (engineRef.current) engineRef.current.stop();
    setIsPlaying(false);
    setPlayheadStep(null);
    clearDiscoveryEffects();
    stopChallengePlayback();
    reactCompanion();
  };

  const handleUndo = () => {
    if (!canUndo) return;
    undo();
    reactCompanion();
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const buffer = await getEngine().renderOffline(songRef.current);
      const blob = audioBufferToWavBlob(buffer);
      const url = URL.createObjectURL(blob);
      const base = (loadedSong?.title ?? 'beatbubble').trim().replace(/[\\/:*?"<>|]/g, '_');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${base || 'beatbubble'}.wav`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export WAV:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    handleStop();
    clearDiscoverySource();
    reset();
    setIsConfirmingReset(false);
  };

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) setSong((prev) => ({ ...prev, bpm: value }));
  };

  const handlePitchBoundChange = (bound: 'min' | 'max', direction: 'up' | 'down') => {
    setSong((prev) => adjustPitchBound(prev, bound, direction));
  };

  const handleBlocksChange = (direction: 'inc' | 'dec') => {
    setSong((prev) => setBlocks(prev, prev.blocks + (direction === 'inc' ? 1 : -1)));
  };

  const handleInstrumentChange = (instrument: InstrumentId) => {
    setSong((prev) => ({ ...prev, instrument }));
  };

  const handleToggleAccidentals = () => {
    setSong((prev) => setAllowAccidentals(prev, !prev.constraints.allowAccidentals));
  };

  const handleToggleSettings = () => {
    setIsSettingsOpen((prev) => !prev);
    setIsConfirmingReset(false);
  };

  const handleNoteChipClick = useCallback(
    (noteName: NoteName) => {
      const current = song.constraints.allowedNotes;
      if (current === null) {
        const withoutClicked = buildRangeNotes(song).filter((n) => n !== noteName);
        if (withoutClicked.length === 0) return;
        setSong((prev) => setAllowedNotes(prev, withoutClicked));
      } else {
        setSong((prev) => toggleAllowedNote(prev, noteName));
      }
    },
    [song, setSong],
  );

  const handleClearAllowedNotes = useCallback(() => {
    setSong((prev) => clearAllowedNotes(prev));
  }, [setSong]);

  return (
    <div
      className={`app ${isDragging ? 'dragging' : ''} ${lockActive ? 'lock-mode' : ''} ${
        discoveryFocus ? 'discovery-focus-active' : ''
      }`}
      onMouseMove={containerHandlers.onMouseMove}
      onMouseUp={containerHandlers.onMouseUp}
      onMouseLeave={containerHandlers.onMouseLeave}
      onTouchMove={containerHandlers.onTouchMove}
      onTouchEnd={containerHandlers.onTouchEnd}
      onTouchCancel={containerHandlers.onTouchCancel}
    >
      <Header
        t={t}
        isPlaying={isPlaying}
        canUndo={canUndo}
        isSettingsOpen={isSettingsOpen}
        onPlay={handlePlay}
        onStop={handleStop}
        onUndo={handleUndo}
        onToggleSettings={handleToggleSettings}
        onOpenSave={() => setIsSaveModalOpen(true)}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {loadFailed && (
        <div className="editor-notice" role="alert">
          <span>{t.loadFailed}</span>
          <button
            className="editor-notice-close"
            onClick={() => setLoadFailed(false)}
            aria-label={t.close}
          >
            ×
          </button>
        </div>
      )}

      {isSettingsOpen && (
        <SettingsPanel
          song={song}
          t={t}
          locale={locale}
          isPlaying={isPlaying}
          isNotePanelOpen={isNotePanelOpen}
          isConfirmingReset={isConfirmingReset}
          isLockMode={lockActive}
          canLock={canLock}
          onToggleLockMode={() => setIsLockMode((prev) => !prev)}
          onBpmChange={handleBpmChange}
          onPitchBoundChange={handlePitchBoundChange}
          onBlocksChange={handleBlocksChange}
          onInstrumentChange={handleInstrumentChange}
          onToggleAccidentals={handleToggleAccidentals}
          onToggleNotePanel={() => setIsNotePanelOpen((prev) => !prev)}
          onStartReset={() => setIsConfirmingReset(true)}
          onConfirmReset={handleReset}
          onCancelReset={() => setIsConfirmingReset(false)}
        />
      )}

      {isNotePanelOpen && (
        <NotePanel
          rangeNotes={buildRangeNotes(song)}
          allowedNotes={song.constraints.allowedNotes}
          locale={locale}
          onNoteClick={handleNoteChipClick}
          onClear={handleClearAllowedNotes}
        />
      )}

      <div className="discovery-chip-row">
        <button
          type="button"
          className={`challenge-open-chip ${activeChallengeId ? 'active' : ''}`}
          aria-pressed={activeChallengeId !== null}
          onClick={() => {
            handleStop();
            openChallengePicker();
          }}
        >
          <span aria-hidden="true">✦</span>
          {t.challengeOpen}
        </button>
        <Link href="/discoveries" className="discovery-chip">
          <span aria-hidden="true">✦</span>
          {t.discoveriesLink}
        </Link>
      </div>

      {activeChallengeId && (
        <ChallengeStage
          challengeId={activeChallengeId}
          reaction={challengeReaction}
          isPlaying={isPlaying}
          t={t}
          onDone={() => {
            handleStop();
            completeChallenge();
          }}
          onExit={() => {
            handleStop();
            exitChallenge();
          }}
        />
      )}

      {!companionLoading &&
        companionDiscoveryId &&
        discoveryProgress.some((item) => item.cardId === companionDiscoveryId) && (
          <EditorCompanion
            creature={creatureForDiscovery(companionDiscoveryId)}
            isPlaying={isPlaying}
            reactionKey={companionReactionKey}
            t={t}
          />
        )}

      <Grid
        song={song}
        playheadStep={playheadStep}
        locale={locale}
        gridRef={gridRef}
        gridContainerRef={gridContainerRef}
        discoveryFocus={discoveryFocus}
        getMelodyCellHandlers={getMelodyCellHandlers}
        getDrumCellHandlers={getDrumCellHandlers}
      />

      <DiscoveryFeedback
        effects={discoveryEffects}
        revealQueue={discoveryRevealQueue}
        t={t}
        onEffectEnd={dismissDiscoveryEffect}
        onRevealDone={() => {
          setPlayheadStep(null);
          finishDiscoveryReveal();
        }}
      />

      {isChallengePickerOpen && (
        <ChallengePicker
          t={t}
          onSelect={(id) => {
            handleStop();
            startChallenge(id);
          }}
          onRandom={() => {
            handleStop();
            startRandomChallenge();
          }}
          onClose={closeChallengePicker}
        />
      )}

      {completedChallenge && (
        <ChallengeCompleteModal
          completed={completedChallenge}
          t={t}
          onKeepCreating={dismissChallengeCompletion}
          onChooseAnother={openChallengePicker}
        />
      )}

      {isSaveModalOpen && (
        <SaveModal
          song={song}
          locale={locale}
          userId={user?.id ?? null}
          defaultAuthor={authDisplayName(user)}
          existing={
            user && loadedSong && loadedSong.userId === user.id
              ? {
                  id: loadedSong.id,
                  title: loadedSong.title,
                  author: loadedSong.author,
                  description: loadedSong.description,
                }
              : null
          }
          onOverwritten={(title, author) =>
            setLoadedSong((prev) => (prev ? { ...prev, title, author } : prev))
          }
          onClose={() => setIsSaveModalOpen(false)}
        />
      )}
    </div>
  );
}
