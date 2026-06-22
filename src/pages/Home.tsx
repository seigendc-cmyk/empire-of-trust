import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listPublicCharacters } from "../lib/characterRepository";
import type { EotCharacter } from "../types";

const WELCOME_STORAGE_KEY = "welcomeSeen";
const SOUND_STORAGE_KEY = "eotWelcomeSoundEnabled";
const POSTER_SRC = "/images/eot-welcome.jpg";

type AmbientSound = {
  context: AudioContext;
  oscillators: OscillatorNode[];
  masterGain: GainNode;
  pulseTimer: number;
};

const characterZones = [
  { id: "marjo-ncube", label: "Marjo Ncube", className: "welcome-character-zone-marjo" },
  { id: "selion-ncube", label: "Selion Ncube", className: "welcome-character-zone-selion" },
  { id: "trust-ncube", label: "Trust Ncube", className: "welcome-character-zone-trust" },
  { id: "tandi-ncube", label: "Tandi Ncube", className: "welcome-character-zone-tandi" },
  { id: "gerald-ncube", label: "Gerald Ncube", className: "welcome-character-zone-gerald" },
  { id: "mamada", label: "Mamada", className: "welcome-character-zone-mamada" },
];

function readSoundPreference() {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(SOUND_STORAGE_KEY) === "true";
}

function getAudioContextClass() {
  return window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

function playSoftTap() {
  if (!readSoundPreference()) return;

  try {
    const AudioContextClass = getAudioContextClass();
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(520, now);
    oscillator.frequency.exponentialRampToValueAtTime(320, now + 0.09);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.16);
    window.setTimeout(() => context.close().catch(() => undefined), 260);
  } catch {
    // Audio should never block entering the app.
  }
}

export default function Home() {
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(readSoundPreference);
  const [characters, setCharacters] = useState<EotCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<EotCharacter | null>(null);
  const ambientRef = useRef<AmbientSound | null>(null);

  const stopAmbientSound = useCallback(() => {
    const ambient = ambientRef.current;
    if (!ambient) return;

    window.clearInterval(ambient.pulseTimer);
    ambient.masterGain.gain.setTargetAtTime(0.0001, ambient.context.currentTime, 0.08);
    window.setTimeout(() => {
      ambient.oscillators.forEach((oscillator) => {
        try {
          oscillator.stop();
        } catch {
          // The oscillator may already be stopped during route changes.
        }
      });
      ambient.context.close().catch(() => undefined);
    }, 180);
    ambientRef.current = null;
  }, []);

  const startAmbientSound = useCallback(() => {
    if (ambientRef.current) return;

    try {
      const AudioContextClass = getAudioContextClass();
      if (!AudioContextClass) return;

      const context = new AudioContextClass();
      const masterGain = context.createGain();
      const filter = context.createBiquadFilter();
      const oscillators = [110, 165, 220].map((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = index === 0 ? "sine" : "triangle";
        oscillator.frequency.setValueAtTime(frequency, context.currentTime);
        gain.gain.setValueAtTime(index === 0 ? 0.18 : 0.07, context.currentTime);
        oscillator.connect(gain);
        gain.connect(filter);
        oscillator.start();
        return oscillator;
      });

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(520, context.currentTime);
      masterGain.gain.setValueAtTime(0.0001, context.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.025, context.currentTime + 1.2);
      filter.connect(masterGain);
      masterGain.connect(context.destination);

      const pulseTimer = window.setInterval(() => {
        const now = context.currentTime;
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setValueAtTime(0.018, now);
        masterGain.gain.linearRampToValueAtTime(0.028, now + 0.25);
        masterGain.gain.linearRampToValueAtTime(0.018, now + 1.6);
      }, 5200);

      ambientRef.current = { context, oscillators, masterGain, pulseTimer };
      context.resume().catch(() => undefined);
    } catch {
      ambientRef.current = null;
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SOUND_STORAGE_KEY, String(soundEnabled));
    if (soundEnabled) startAmbientSound();
    if (!soundEnabled) stopAmbientSound();
    return undefined;
  }, [soundEnabled, startAmbientSound, stopAmbientSound]);

  useEffect(() => stopAmbientSound, [stopAmbientSound]);

  useEffect(() => {
    listPublicCharacters().then(setCharacters).catch(() => setCharacters([]));
  }, []);

  const enterEmpire = useCallback(() => {
    if (leaving) return;
    playSoftTap();
    localStorage.setItem(WELCOME_STORAGE_KEY, "true");
    setLeaving(true);
    window.setTimeout(() => navigate("/home"), 800);
  }, [leaving, navigate]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((current) => !current);
  }, []);

  const openCharacter = useCallback((characterId: string) => {
    const character = characters.find((item) => item.id === characterId);
    if (character) setSelectedCharacter(character);
  }, [characters]);

  return (
    <section className={`welcome-screen ${leaving ? "welcome-screen-leaving" : ""}`} aria-label="Empire of Trust welcome">
      <div className="welcome-poster-frame">
        <img className="welcome-poster-image" src={POSTER_SRC} alt="" />
        {characterZones.map((zone) => (
          <button
            key={zone.id}
            className={`welcome-character-zone ${zone.className}`}
            type="button"
            aria-label={`Open ${zone.label} details`}
            onClick={() => openCharacter(zone.id)}
            onTouchEnd={(event) => event.currentTarget.blur()}
          />
        ))}
        <button className="welcome-enter-hitbox" type="button" aria-label="Enter the Empire" onClick={enterEmpire} onTouchEnd={(event) => event.currentTarget.blur()} />
      </div>
      <button className="welcome-sound-toggle" type="button" aria-label={soundEnabled ? "Mute welcome sound" : "Enable welcome sound"} aria-pressed={soundEnabled} onClick={toggleSound}>
        <span className="welcome-speaker-icon" aria-hidden="true">{soundEnabled ? "ON" : "OFF"}</span>
      </button>
      {selectedCharacter && <CharacterPanel character={selectedCharacter} onClose={() => setSelectedCharacter(null)} />}
    </section>
  );
}

function CharacterPanel({ character, onClose }: { character: EotCharacter; onClose: () => void }) {
  const traits = character.coreTraits?.length ? character.coreTraits : character.strengths?.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean) ?? [];

  return (
    <div className="welcome-character-panel-wrap" role="presentation" onClick={onClose}>
      <article className="welcome-character-panel" role="dialog" aria-modal="true" aria-labelledby="welcome-character-name" onClick={(event) => event.stopPropagation()}>
        <button className="welcome-character-close" type="button" aria-label="Close character details" onClick={onClose}>x</button>
        <p className="welcome-character-eyebrow">{character.archetype || "Empire Player"}</p>
        <h2 id="welcome-character-name">{character.displayName || character.name}</h2>
        <dl className="welcome-character-facts">
          <div>
            <dt>Age</dt>
            <dd>{character.age || "-"}</dd>
          </div>
          <div>
            <dt>Archetype</dt>
            <dd>{character.archetype || "Key Player"}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{character.position || character.role || character.occupation || "John Ekeniah Empire"}</dd>
          </div>
        </dl>
        <p className="welcome-character-bio">{character.shortBiography || character.biography || character.backstory}</p>
        {traits.length > 0 && (
          <div className="welcome-character-traits">
            {traits.slice(0, 4).map((trait) => <span key={trait}>{trait}</span>)}
          </div>
        )}
        {(character.signatureQuote || character.memorableQuotes?.[0]) && (
          <blockquote>{character.signatureQuote || character.memorableQuotes?.[0]}</blockquote>
        )}
        <Link className="welcome-character-link" to={`/characters/${character.id}`}>
          View Full Character
        </Link>
      </article>
    </div>
  );
}
