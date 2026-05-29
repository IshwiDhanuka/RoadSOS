import React, { useState, useEffect, useRef } from 'react';
import { HeartPulse, Droplets, Flame, Wind, Activity, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  steps: string[];
  extra?: React.ReactNode;
}

export const FirstAid: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string | null>('cpr');
  const [metronomePlaying, setMetronomePlaying] = useState(false);
  const [beatFlash, setBeatFlash] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);

  const toggleMetronome = () => {
    if (metronomePlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
      audioCtxRef.current = null;
      setMetronomePlaying(false);
      setBeatFlash(false);
    } else {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      setMetronomePlaying(true);

      const playBeep = () => {
        if (!audioCtxRef.current) return;
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        osc.connect(gain);
        gain.connect(audioCtxRef.current.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtxRef.current.currentTime);
        gain.gain.setValueAtTime(0.6, audioCtxRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtxRef.current.currentTime + 0.08);
        // Visual flash
        setBeatFlash(true);
        setTimeout(() => setBeatFlash(false), 150);
      };

      playBeep();
      intervalRef.current = window.setInterval(playBeep, 600); // 100 BPM
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const sections: Section[] = [
    {
      id: 'cpr',
      title: 'CPR — Chest Compressions',
      icon: <HeartPulse size={22} />,
      color: '#dc2626',
      steps: [
        'Check the scene for safety. Tap the person and shout "Are you OK?"',
        'Call 112 or ask someone nearby to call immediately.',
        'Place the heel of one hand on the center of the chest. Place the other hand on top, interlock fingers.',
        'Push hard and fast — 5 to 6 cm deep — at a rate of 100–120 compressions per minute.',
        'After 30 compressions, tilt the head back, lift the chin, and give 2 rescue breaths.',
        'Continue cycles of 30 compressions and 2 breaths until help arrives.',
      ],
      extra: (
        <div
          className="metronome-box"
          style={{
            borderColor: metronomePlaying ? '#dc2626' : 'var(--border)',
            backgroundColor: beatFlash ? 'rgba(220,38,38,0.08)' : 'transparent',
          }}
        >
          <div className="metronome-info">
            <strong>CPR Metronome — 100 BPM</strong>
            <span>Match each compression to the beat</span>
          </div>
          <button
            onClick={toggleMetronome}
            className={`btn ${metronomePlaying ? 'btn-danger' : 'btn-accent'}`}
          >
            <Activity size={16} />
            {metronomePlaying ? 'Stop' : 'Start'}
          </button>
        </div>
      ),
    },
    {
      id: 'bleeding',
      title: 'Severe Bleeding',
      icon: <Droplets size={22} />,
      color: '#dc2626',
      steps: [
        'Apply firm, direct pressure on the wound with a clean cloth or bandage.',
        'Do NOT remove the cloth if it soaks through — add more layers on top.',
        'If possible, elevate the injured limb above the level of the heart.',
        'Apply a tourniquet above the wound ONLY if direct pressure fails and bleeding is life-threatening.',
        'Keep the person warm and calm. Do not give them food or water.',
      ],
    },
    {
      id: 'choking',
      title: 'Choking (Adult)',
      icon: <Wind size={22} />,
      color: '#0284c7',
      steps: [
        'Ask "Are you choking? Can you cough?" — if they cannot speak or cough, act immediately.',
        'Stand behind them, lean them slightly forward.',
        'Give 5 firm back blows between the shoulder blades with the heel of your hand.',
        'If unsuccessful, give 5 abdominal thrusts (Heimlich maneuver): fist above the navel, pull sharply inward and upward.',
        'Alternate 5 back blows and 5 thrusts until the object is dislodged.',
        'If the person becomes unconscious, begin CPR.',
      ],
    },
    {
      id: 'burns',
      title: 'Burns & Scalds',
      icon: <Flame size={22} />,
      color: '#ea580c',
      steps: [
        'Cool the burn under cool (not cold) running water for at least 20 minutes.',
        'Do NOT apply ice, butter, toothpaste, or any creams.',
        'Remove clothing and jewelry near the burn area before swelling starts.',
        'Cover loosely with a clean, non-fluffy material like cling film.',
        'For chemical burns, brush off dry chemicals first, then rinse with water.',
        'Seek medical attention for burns larger than the person\'s palm.',
      ],
    },
    {
      id: 'spinal',
      title: 'Suspected Spinal Injury',
      icon: <AlertTriangle size={22} />,
      color: '#dc2626',
      steps: [
        'DO NOT move the person unless they are in immediate danger (e.g., fire, drowning).',
        'Call emergency services (112) immediately.',
        'Keep the person completely still — hold their head steady in line with their body.',
        'If they must be moved, use the log-roll technique: at least 3 people, keeping head-neck-spine aligned.',
        'Cover them with a blanket to prevent shock. Monitor breathing.',
      ],
    },
  ];

  const toggle = (id: string) => setActiveSection(activeSection === id ? null : id);

  return (
    <div className="page-container">
      <header style={{ marginBottom: '1.5rem' }}>
        <h1>First Aid Guide</h1>
        <p style={{ margin: 0 }}>Works fully offline. No network required.</p>
      </header>

      <div className="first-aid-list">
        {sections.map(sec => {
          const isOpen = activeSection === sec.id;
          return (
            <div key={sec.id} className={`first-aid-card ${isOpen ? 'open' : ''}`}>
              <button className="first-aid-header" onClick={() => toggle(sec.id)}>
                <div className="first-aid-icon" style={{ color: sec.color }}>{sec.icon}</div>
                <span className="first-aid-title">{sec.title}</span>
                {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {isOpen && (
                <div className="first-aid-body">
                  <ol className="first-aid-steps">
                    {sec.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                  {sec.extra}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
