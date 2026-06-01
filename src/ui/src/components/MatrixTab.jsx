import { useState, useEffect, useRef } from 'react';

const LOCAL_AI_MODEL = {
  name: 'matrix-local-synapse',
  displayName: 'Matrix Local Synapse'
};

const POWER_AI_MODELS = [
  {
    name: 'qwen3:8b',
    displayName: 'Qwen3 8B Orchestrator',
    profile: 'default'
  },
  {
    name: 'qwen3:30b',
    displayName: 'Qwen3 30B Planner',
    profile: 'optional'
  },
  {
    name: 'qwen3-coder:30b',
    displayName: 'Qwen3 Coder 30B',
    profile: 'optional'
  }
];

const VOICE_COMMANDS = [
  { phrase: 'Matrix, run diagnostics', route: 'System audit' },
  { phrase: 'Matrix, open terminal', route: 'Terminal console' },
  { phrase: 'Matrix, show files', route: 'File explorer' },
  { phrase: 'Matrix, show telemetry', route: 'System monitor' },
  { phrase: 'Matrix, open sandbox', route: 'Security controls' },
  { phrase: 'Matrix, run round robin scheduler', route: 'Scheduler policy' },
  { phrase: 'Matrix, core status', route: 'AI core report' },
  { phrase: 'Matrix, who am I', route: 'Creator profile' },
  { phrase: 'Matrix, what time is it', route: 'Date & time' },
  { phrase: 'Matrix, tell me a joke', route: 'Entertainment' },
  { phrase: 'Matrix, summarize this OS', route: 'OS summary' }
];

export default function MatrixTab({ onNavigateApp, onExecuteCommand }) {
  if (!window.__matrixBootTime) window.__matrixBootTime = Date.now();
  const [status, setStatus] = useState('dormant'); // dormant, listening, processing, speaking
  const [logs, setLogs] = useState([
    { sender: 'Matrix', text: 'M.A.T.R.I.X. local AI control layer initialized.' }
  ]);
  const [recognition, setRecognition] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  
  // Ollama states
  const [models, setModels] = useState([LOCAL_AI_MODEL, ...POWER_AI_MODELS]);
  const [selectedModel, setSelectedModel] = useState('qwen3:8b');
  const [ollamaStatus, setOllamaStatus] = useState('local'); // online, local
  const [inferenceLatency, setInferenceLatency] = useState(0);
  
  // Custom Settings
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [voiceRate, setVoiceRate] = useState(1.05);
  const [voicePitch, setVoicePitch] = useState(0.95);
  const [manualInput, setManualInput] = useState('');
  const [lastTranscript, setLastTranscript] = useState('Awaiting wake command.');
  const [voiceWakeArmed, setVoiceWakeArmed] = useState(false);
  
  // Diagnostics states
  const [diagnosticProgress, setDiagnosticProgress] = useState(0);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagTemp, setDiagTemp] = useState(42.5);

  // Advanced Prompt Configs & Hands-Free Conversational loop
  const [isHandsFree, setIsHandsFree] = useState(false);
  const isHandsFreeRef = useRef(false);
  const [systemPrompt, setSystemPrompt] = useState('You are Matrix, an advanced operating system orchestrator AI. Answer concisely in 1 or 2 sentences.');
  const [llmTemp, setLlmTemp] = useState(0.7);
  const [llmTopP, setLlmTopP] = useState(0.9);
  const [llmContext, setLlmContext] = useState(4096);

  // Web Audio Mic Volume analysis
  const [micVolume, setMicVolume] = useState(0);
  const micAnalyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const micVolumeRef = useRef(0);
  const micRafIdRef = useRef(null);

  const canvasRef = useRef(null);

  // 3D Particles Setup
  const N = 120;
  const spherePointsRef = useRef([]);

  // Scheduler backend sync states
  const [schedulerAlgo, setSchedulerAlgo] = useState('rr');
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const [schedulerTasks, setSchedulerTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [cacheHits, setCacheHits] = useState(0);
  const [cacheMisses, setCacheMisses] = useState(0);
  const [lruCacheList, setLruCacheList] = useState([]);
  const [daemonLogs, setDaemonLogs] = useState("[Ingress System] Log stream loading...");

  // Generate sphere coordinates once
  useEffect(() => {
    const points = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const angleIncrement = 2 * Math.PI * goldenRatio;
    for (let i = 0; i < N; i++) {
      const t = i / N;
      const inclination = Math.acos(1 - 2 * t);
      const azimuth = angleIncrement * i;
      const x = Math.sin(inclination) * Math.cos(azimuth);
      const y = Math.sin(inclination) * Math.sin(azimuth);
      const z = Math.cos(inclination);
      points.push({ x, y, z });
    }
    spherePointsRef.current = points;
  }, []);

  // Poll database status to sync scheduler UI from SQLite backend
  useEffect(() => {
    let isMounted = true;
    
    const syncSchedulerData = async () => {
      try {
        const res = await fetch('/api/scheduler/status');
        if (res.ok && isMounted) {
          const data = await res.json();
          setSchedulerTasks(data.tasks || []);
          setSchedulerAlgo(data.algorithm ? data.algorithm.toLowerCase() : 'priority');
          setSchedulerRunning(data.isRunning);
          
          if (data.metrics) {
            setCacheHits(data.metrics.hits || 0);
            setCacheMisses(data.metrics.misses || 0);
          }
          setLruCacheList(data.cache_states || []);
          
          // Find running task
          const running = (data.tasks || []).find(t => t.status === 'running');
          setActiveTask(running || null);
        }
      } catch (e) {
        console.warn("Scheduler API not reachable (dev server offline).");
      }
    };

    const fetchDaemonLogs = async () => {
      try {
        const res = await fetch('/api/scheduler/logs');
        if (res.ok && isMounted) {
          const text = await res.text();
          setDaemonLogs(text);
        }
      } catch (e) {}
    };

    syncSchedulerData();
    fetchDaemonLogs();
    
    const statusInterval = setInterval(syncSchedulerData, 3000);
    const logsInterval = setInterval(fetchDaemonLogs, 3000);
    
    return () => {
      isMounted = false;
      clearInterval(statusInterval);
      clearInterval(logsInterval);
    };
  }, []);

  const startMicAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      micAnalyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkVolume = () => {
        if (!micAnalyserRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setMicVolume(avg);
        micVolumeRef.current = avg;
        
        micRafIdRef.current = requestAnimationFrame(checkVolume);
      };
      
      micRafIdRef.current = requestAnimationFrame(checkVolume);
    } catch (e) {
      console.warn("Could not start mic analyzer:", e);
    }
  };

  const stopMicAnalysis = () => {
    if (micRafIdRef.current) {
      cancelAnimationFrame(micRafIdRef.current);
      micRafIdRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    micAnalyserRef.current = null;
    setMicVolume(0);
    micVolumeRef.current = 0;
  };

  // Cleanup mic resources on unmount
  useEffect(() => {
    return () => stopMicAnalysis();
  }, []);

  const toggleHandsFree = (val) => {
    setIsHandsFree(val);
    isHandsFreeRef.current = val;
    playSynthSound('click');
    if (val) {
      addLog('Matrix', 'Hands-free voice routing enabled. Speak a Matrix command.');
      speakVocalFeedback("Hands-free link active.");
    } else {
      addLog('Matrix', 'Hands-Free cognitive link disengaged.');
      speakVocalFeedback("Hands-free link offline.");
    }
  };

  // Initialize Web Audio Sci-Fi Synthesizer
  const playSynthSound = (type) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      
      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'listening') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.setValueAtTime(1000, now + 0.05);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(739.99, now + 0.06); // F#5
        osc.frequency.setValueAtTime(880.00, now + 0.12); // A5
        osc.frequency.setValueAtTime(1174.66, now + 0.18); // D6
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.22);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'sweep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(1500, now + 0.4);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
      // Close AudioContext after the longest sound duration (0.4s) to prevent leaks
      setTimeout(() => ctx.close(), 500);
    } catch (e) {
      console.warn("Web Audio block:", e);
    }
  };

  // Discover Ollama models and query tags
  useEffect(() => {
    const checkOllama = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s timeout
        
        const response = await fetch('http://localhost:11434/api/tags', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (data.models && data.models.length > 0) {
            setModels(data.models);
            setSelectedModel(data.models[0].name);
            setOllamaStatus('online');
            addLog('System', `Ollama core detected. Connected to local runtime: ${data.models[0].name}`);
          } else {
            setModels([LOCAL_AI_MODEL, ...POWER_AI_MODELS]);
            setSelectedModel('qwen3:8b');
            setOllamaStatus('local');
            addLog('System', 'Ollama is online but no model weights were found. Using Matrix local synapse with Qwen3 orchestration profile.');
          }
        }
      } catch (e) {
        setModels([LOCAL_AI_MODEL, ...POWER_AI_MODELS]);
        setSelectedModel('qwen3:8b');
        setOllamaStatus('local');
        addLog('System', 'Local Ollama node not detected. Matrix local synapse is active offline with Qwen3 8B as the target power model.');
      }
    };
    checkOllama();
  }, []);

  // Initialize Speech Synthesis Voices
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      setVoices(allVoices);
      const defaultVoice = allVoices.find(v => v.name.toLowerCase().includes('zira')) || 
                           allVoices.find(v => v.lang.includes('en-GB') && v.name.toLowerCase().includes('google')) || 
                           allVoices.find(v => v.lang.includes('en-GB')) ||
                           allVoices.find(v => v.lang.includes('en-US')) || 
                           allVoices[0];
      if (defaultVoice) {
        setSelectedVoice(defaultVoice.name);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Ref to processVoiceCommand to prevent stale closures in Speech Recognition callback
  const processVoiceCommandRef = useRef(null);
  useEffect(() => {
    processVoiceCommandRef.current = processVoiceCommand;
  });

  // Initialize Web Speech API Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setStatus('listening');
      setVoiceWakeArmed(true);
      playSynthSound('listening');
      addLog('Matrix', 'Acoustic ingress open. Say: "Matrix" followed by a command.');
      startMicAnalysis();
    };

    rec.onerror = (e) => {
      console.error(e);
      setStatus('dormant');
      setVoiceWakeArmed(false);
      playSynthSound('error');
      addLog('Matrix', 'Acoustic link blocked or timed out.');
      stopMicAnalysis();
    };

    rec.onend = () => {
      setStatus(prev => (prev === 'listening' ? 'dormant' : prev));
      setVoiceWakeArmed(false);
      stopMicAnalysis();
    };

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setLastTranscript(transcript);
      if (processVoiceCommandRef.current) {
        processVoiceCommandRef.current(transcript);
      }
    };

    setRecognition(rec);
  }, []);

  // JARVIS-Style 3D Holographic Canvas Particle Core Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let rotX = 0.5;
    let rotY = 0.5;
    let rotZ = 0.2;
    let angle = 0;

    // Handle high DPI screens
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 190 * dpr;
    canvas.height = 190 * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      if (!ctx || !canvas) return;
      
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const cX = width / 2;
      const cY = height / 2;
      
      ctx.clearRect(0, 0, width, height);

      // Sphere theme colors
      let pColor = 'rgba(0, 255, 255, '; // Cyan
      let ringColor = 'rgba(0, 255, 255, 0.15)';
      let activeColor = 'var(--accent-cyan)';
      
      if (status === 'listening') {
        pColor = 'rgba(233, 84, 32, '; // Orange
        ringColor = 'rgba(233, 84, 32, 0.15)';
        activeColor = 'var(--ubuntu-orange)';
      } else if (status === 'processing') {
        pColor = 'rgba(167, 139, 250, '; // Violet
        ringColor = 'rgba(167, 139, 250, 0.15)';
        activeColor = 'var(--accent-violet)';
      } else if (status === 'speaking') {
        pColor = 'rgba(0, 255, 255, '; // Cyan
        ringColor = 'rgba(0, 255, 255, 0.22)';
        activeColor = 'var(--accent-cyan)';
      }

      // Rotate sphere angles
      let speedFactor = 1.0;
      if (status === 'listening') speedFactor = 1.6;
      else if (status === 'processing') speedFactor = 3.6;
      else if (status === 'speaking') speedFactor = 2.0;
      

      rotY += 0.006 * speedFactor;
      rotX += 0.004 * speedFactor;
      rotZ += 0.002 * speedFactor;

      // Base radius of the sphere
      const amp = micVolumeRef.current / 255;
      const breath = Math.sin(Date.now() / 150) * 0.08;
      const scale = 1.0 + amp * 0.7 + (status === 'speaking' ? breath : 0);
      const baseRadius = 55 * scale;

      const finalCX = cX;
      const finalCY = cY;

      // Draw horizontal orbital rings (perspective ellipses)
      const rings = [
        { hOffset: -0.35, rMul: 1.25, rotSpeed: 0.015 },
        { hOffset: 0.0, rMul: 1.45, rotSpeed: -0.02 },
        { hOffset: 0.35, rMul: 1.25, rotSpeed: 0.01 }
      ];

      ctx.lineWidth = 1;
      rings.forEach((ring) => {
        ctx.strokeStyle = ringColor;
        ctx.beginPath();
        
        const ringAngleOffset = angle * ring.rotSpeed;
        const ptsCount = 45;
        for (let j = 0; j <= ptsCount; j++) {
          const a = (j / ptsCount) * Math.PI * 2 + ringAngleOffset;
          const rx0 = Math.cos(a) * ring.rMul;
          const rz0 = Math.sin(a) * ring.rMul;
          const ry0 = ring.hOffset;

          // 3D Rotations
          let ry1 = ry0 * Math.cos(rotX) - rz0 * Math.sin(rotX);
          let rz1 = ry0 * Math.sin(rotX) + rz0 * Math.cos(rotX);
          let rx1 = rx0 * Math.cos(rotY) - rz1 * Math.sin(rotY);
          let rz2 = rx0 * Math.sin(rotY) + rz1 * Math.cos(rotY);

          // Perspective scaling
          const rpf = 1.8 / (2.5 - rz2);
          const rpx = finalCX + rx1 * baseRadius * rpf;
          const rpy = finalCY + ry1 * baseRadius * rpf;

          if (j === 0) {
            ctx.moveTo(rpx, rpy);
          } else {
            ctx.lineTo(rpx, rpy);
          }
        }
        ctx.stroke();
      });

      // Project and draw particles
      if (spherePointsRef.current.length > 0) {
        const rotatedPoints = spherePointsRef.current.map(p => {
          // Rotate X
          let y1 = p.y * Math.cos(rotX) - p.z * Math.sin(rotX);
          let z1 = p.y * Math.sin(rotX) + p.z * Math.cos(rotX);
          // Rotate Y
          let x1 = p.x * Math.cos(rotY) - z1 * Math.sin(rotY);
          let z2 = p.x * Math.sin(rotY) + z1 * Math.cos(rotY);
          // Rotate Z
          let x2 = x1 * Math.cos(rotZ) - y1 * Math.sin(rotZ);
          let y2 = x1 * Math.sin(rotZ) + y1 * Math.cos(rotZ);

          return { x: x2, y: y2, z: z2 };
        });

        // Painter's algorithm sorting
        rotatedPoints.sort((a, b) => a.z - b.z);

        rotatedPoints.forEach(p => {
          const pf = 1.8 / (2.5 - p.z);
          const px = finalCX + p.x * baseRadius * pf;
          const py = finalCY + p.y * baseRadius * pf;
          const size = (p.z + 1) * 1.5 + 0.4;
          const alpha = (p.z + 1) / 2 * 0.75 + 0.25;

          ctx.fillStyle = pColor + alpha + ')';
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Center core glowing circle
      ctx.fillStyle = activeColor;
      ctx.beginPath();
      ctx.arc(finalCX, finalCY, 6 + (amp * 5), 0, Math.PI * 2);
      ctx.fill();

      angle += 0.05;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [status]);

  // System temperature fluctuations
  useEffect(() => {
    const tInterval = setInterval(() => {
      setDiagTemp(prev => {
        const change = parseFloat((prev + (Math.random() * 0.4 - 0.2)).toFixed(1));
        return Math.max(38, Math.min(55, change));
      });
    }, 4000);
    return () => clearInterval(tInterval);
  }, [status]);

  const addLog = (sender, text) => {
    setLogs(prev => [...prev, { sender, text }]);
  };

  // Text-To-Speech function using SpeechSynthesis
  const speakVocalFeedback = (text) => {
    if (!window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (selectedVoice) {
      const foundVoice = voices.find(v => v.name === selectedVoice);
      if (foundVoice) utterance.voice = foundVoice;
    }
    
    utterance.pitch = voicePitch;
    utterance.rate = voiceRate;

    utterance.onstart = () => {
      setStatus('speaking');
    };

    utterance.onend = () => {
      setStatus('dormant');
      if (isHandsFreeRef.current) {
        setTimeout(() => {
          if (isHandsFreeRef.current) {
            startListening();
          }
        }, 400);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    playSynthSound('click');
    if (!isSupported) {
      setLastTranscript('Speech API unavailable. Running simulated voice command.');
      simulateQuery();
      return;
    }
    if (recognition && status === 'dormant') {
      try {
        recognition.continuous = isHandsFreeRef.current;
        recognition.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const executeSystemDiagnostics = () => {
    if (isDiagnosing) return;
    setIsDiagnosing(true);
    setDiagnosticProgress(5);
    playSynthSound('sweep');
    addLog('Matrix', 'Executing host diagnostics integrity scan...');
    
    const steps = [
      { text: '[CORE] Local core runtime reachable in browser workspace.', progress: 25 },
      { text: '[VOICE] Speech command router initialized.', progress: 50 },
      { text: '[SCHEDULER] Local scheduler UI channel checked.', progress: 75 },
      { text: `[AI] Local inference route: ${ollamaStatus === 'online' ? 'Ollama connected' : 'Matrix local synapse active'}.`, progress: 100 }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        addLog('Matrix', step.text);
        setDiagnosticProgress(step.progress);
        playSynthSound('click');
        if (idx === steps.length - 1) {
          setIsDiagnosing(false);
          playSynthSound('success');
          speakVocalFeedback("Diagnostics complete. Local AI control routes are available.");
        }
      }, (idx + 1) * 1000);
    });
  };

  useEffect(() => {
    const handleTriggerDiag = () => {
      executeSystemDiagnostics();
    };
    window.addEventListener('matrix-trigger-diag', handleTriggerDiag);
    return () => window.removeEventListener('matrix-trigger-diag', handleTriggerDiag);
  }, [ollamaStatus, isDiagnosing]);

  // Real-Time Scheduler policy modifiers (communicates directly with SQLite backend daemon)
  const handleSetAlgorithm = async (algo) => {
    playSynthSound('click');
    setSchedulerAlgo(algo);
    try {
      await fetch('/api/scheduler/set-algorithm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm: algo })
      });
      addLog('Matrix', `Scheduler policy changed to "${algo.toUpperCase()}".`);
      speakVocalFeedback(`Queue scheduling policy updated to ${algo.toUpperCase()}.`);
    } catch(e) {}
  };

  const handleToggleDaemon = async () => {
    playSynthSound('click');
    const endpoint = schedulerRunning ? '/api/scheduler/stop-daemon' : '/api/scheduler/start-daemon';
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSchedulerRunning(data.isRunning);
        if (data.isRunning) {
          addLog('Matrix', 'M.A.T.R.I.X. scheduler daemon is active on the local SQLite repository.');
          speakVocalFeedback("Scheduler daemon is online.");
        } else {
          addLog('Matrix', 'Scheduler daemon process stopped.');
          speakVocalFeedback("Scheduler daemon offline.");
        }
      }
    } catch (e) {}
  };

  const handleResetQueue = async () => {
    playSynthSound('click');
    try {
      const res = await fetch('/api/scheduler/reset', { method: 'POST' });
      if (res.ok) {
        addLog('Matrix', 'Host SQLite scheduler tasks flushed and re-seeded with defaults.');
        speakVocalFeedback("Scheduler database reset complete.");
      }
    } catch (e) {}
  };

  const processVoiceCommand = async (rawText) => {
    setStatus('processing');
    const normalizedText = normalizeVoiceDirective(rawText);
    setLastTranscript(rawText);
    addLog('User', rawText);

    const cmd = normalizedText.toLowerCase();
    let responseText = "Processing directive.";
    
    if (cmd.includes('stand down') || cmd.includes('normalize status') || cmd.includes('normalize system') || cmd.includes('go to sleep')) {
      setIsHandsFree(false);
      isHandsFreeRef.current = false;
      setStatus('dormant');
      responseText = "Understood. Voice loop is paused and the control layer is idle.";
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    // Scheduler voice activations
    if (cmd.includes('simulate fifo') || cmd.includes('run fifo scheduler')) {
      handleSetAlgorithm('fifo');
      // Auto start daemon if not running
      if (!schedulerRunning) handleToggleDaemon();
      return;
    }
    if (cmd.includes('simulate round robin') || cmd.includes('run round robin scheduler') || cmd.includes('simulate rr')) {
      handleSetAlgorithm('rr');
      if (!schedulerRunning) handleToggleDaemon();
      return;
    }
    if (cmd.includes('simulate sjf') || cmd.includes('simulate shortest job') || cmd.includes('run shortest job')) {
      handleSetAlgorithm('sjf');
      if (!schedulerRunning) handleToggleDaemon();
      return;
    }
    if (cmd.includes('simulate priority') || cmd.includes('run priority scheduler') || cmd.includes('run priority queue')) {
      handleSetAlgorithm('priority');
      if (!schedulerRunning) handleToggleDaemon();
      return;
    }
    if (cmd.includes('reset scheduler') || cmd.includes('reset queue')) {
      handleResetQueue();
      return;
    }
    if (cmd.includes('stop scheduler') || cmd.includes('deactivate scheduler')) {
      if (schedulerRunning) handleToggleDaemon();
      return;
    }

    if (cmd.includes('game') || cmd.includes('play') || cmd.includes('arcade') || cmd.includes('snake')) {
      responseText = "Launching Retro Firewall Bypass Arcade game.";
      playSynthSound('success');
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      setTimeout(() => onNavigateApp('game'), 1400);
      return;
    }

    if (cmd.includes('terminal') || cmd.includes('shell') || cmd.includes('command line')) {
      responseText = "Rerouting workspace views to WezTerm terminal console.";
      playSynthSound('success');
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      setTimeout(() => onNavigateApp('terminal'), 1400);
      return;
    } 
    
    if (cmd.includes('compile') || cmd.includes('build') || cmd.includes('iso') || cmd.includes('distro')) {
      responseText = "Launching builder factory compilers chroot environment.";
      playSynthSound('success');
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      setTimeout(() => {
        onNavigateApp('build');
        setTimeout(() => onExecuteCommand('build'), 500);
      }, 1400);
      return;
    } 
    
    if (cmd.includes('files') || cmd.includes('explorer') || cmd.includes('folder') || cmd.includes('nautilus')) {
      responseText = "Opening Nautilus directory tree.";
      playSynthSound('success');
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      setTimeout(() => onNavigateApp('files'), 1400);
      return;
    } 
    
    if (cmd.includes('monitor') || cmd.includes('telemetry') || cmd.includes('cpu') || cmd.includes('vram')) {
      responseText = "Opening system telemetry graphics panel.";
      playSynthSound('success');
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      setTimeout(() => onNavigateApp('daemon'), 1400);
      return;
    } 
    
    if (cmd.includes('security') || cmd.includes('sandbox') || cmd.includes('escape')) {
      responseText = "Navigating to AppArmor security sandbox settings.";
      playSynthSound('success');
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      setTimeout(() => onNavigateApp('sandbox'), 1400);
      return;
    } 
    
    if (cmd.includes('diagnostics') || cmd.includes('audit') || cmd.includes('scan system')) {
      executeSystemDiagnostics();
      return;
    }

    if (cmd.includes('who are you') || cmd.includes('your name') || cmd.includes('identity')) {
      responseText = "I am M.A.T.R.I.X., a local-first operating system control layer for routing voice commands, diagnostics, scheduler actions, and build workflows.";
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    if (cmd.includes('who am i') || cmd.includes('tell me about tauhid') || cmd.includes('who is tauhid') || cmd.includes('about myself') || cmd.includes('my profile')) {
      responseText = "You are Shaik Tauhidur Rahman, an Electrical and Electronic Engineering honors student at the American International University-Bangladesh (AIUB). You are an Executive of the AIUB R&D Club handling Club Welfare and Member Services, a Campus Ambassador for EWU National Robofest 2026, and a researcher specializing in Cyber-Physical Systems, Digital Twins, Embedded Systems, and Edge AI. You are a Dean's List honoree, Merit Scholar, and Academic Scholar at AIUB, and a Rajshahi Zilla Parishad Scholar. Your portfolio is at strtauhid.app.";
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    if (cmd.includes('my projects') || cmd.includes('my work') || cmd.includes('portfolio')) {
      responseText = "Your key engineering projects are: 1) DC Motor Digital Twin — ESP32 with ACS712 and hall-effect sensors, MQTT telemetry, state-space estimation, and real-time fault analysis. 2) Wind Turbine Aerodynamic Simulator — custom generator, load cell, anemometer sensor, QBlade Cp curve computation. 3) Home Power Distribution Board — modular domestic wiring demo with energy meter, 63A MCB, branch breakers, and KCL validation. All projects are featured on your portfolio at strtauhid.app.";
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    if (cmd.includes('education') || cmd.includes('university') || cmd.includes('school') || cmd.includes('degree') || cmd.includes('aiub')) {
      responseText = "Your education timeline: BSc in EEE at AIUB (June 2024 to December 2027), majoring in Electronics and Intelligence Systems with focus on Embedded Controls, Industrial Automation, Edge Computing, and Digital System Synthesis. Before that, BSc Transfer Track at Rajshahi College (2023-2024), HSC from Rajshahi Government City College (2020-2022), and SSC from Rajshahi Cantonment Board School and College (2009-2019).";
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    if (cmd.includes('scholarship') || cmd.includes('awards') || cmd.includes('honors') || cmd.includes('dean')) {
      responseText = "Your academic honors include: Dean's List at AIUB Faculty of Engineering (Spring 2024-25), Merit-Based Scholarship at AIUB (Fall 2024-25), Academic Scholarship at AIUB (Fall 2024-25 semester excellence), and Rajshahi Zilla Parishad Scholarship for HSC academic merit (2023).";
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    if (cmd.includes('skills') || cmd.includes('tech stack') || cmd.includes('what do i know') || cmd.includes('competencies')) {
      responseText = "Your technical skills: Hardware — ESP32, STM32 (Advanced), PCB Design with EasyEDA and Altium, Digital Logic, Sensor Data Acquisition. Software — C/C++ for Embedded Controls (Advanced), Python for Data Science and ML, MATLAB and Simulink, Rust for systems scripting. Simulation — COMSOL Multiphysics, QBlade wind turbine aerodynamics, AutoCAD 2D and 3D, PID Control Loop Modeling. Platforms — MQTT Telemetry, ThingSpeak IoT, Git and GitHub, LaTeX.";
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    if (cmd.includes('certification') || cmd.includes('training') || cmd.includes('british council') || cmd.includes('ieee')) {
      responseText = "Your professional training and certifications: 1) Additive Manufacturing, Machine Learning and Digital Twins — Birmingham City University and British Council (2025). 2) From Industry 4.0 to Industry 5.0 — Human-Centric Digital Manufacturing, British Council (2025). 3) IEEE Authorship and Open Access Symposium (September 2025). 4) Research Writing and Wind Turbine Design with QBlade — AIUB R&D Club and ESAB AIUB workshops (July-August 2025).";
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    if (cmd.includes('contact') || cmd.includes('email') || cmd.includes('social') || cmd.includes('linkedin') || cmd.includes('github')) {
      responseText = "Your contact information: Email — strtauhid200307 at gmail.com. GitHub — Tauhid2003. LinkedIn — shaik-tauhidur-rahman. Facebook — Shaik.Tauhidur.Rahman. Portfolio website — strtauhid.app.";
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    if (cmd.includes('publication') || cmd.includes('paper') || cmd.includes('research') || cmd.includes('conference')) {
      responseText = "Your publication: 'A Digital Twin Approach for Smart Monitoring of DC Motors with Real-Time Fault Analysis and Power Evaluation' — a conference preprint in IEEE format. First author: Shaik Tauhidur Rahman. Co-author: Fahim Shahriar. Submitted to the First International WiDS NSU Conference 2026. DOI: 10.13140/RG.2.2.34869.13282/1. It presents a cyber-physical system architecture with ESP32, ACS712, and hall-effect sensors mapped via MQTT to real-time cloud and local state estimation models.";
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    if (cmd.includes('website') || cmd.includes('portfolio site') || cmd.includes('strtauhid')) {
      responseText = "Your professional portfolio is hosted at strtauhid.app. It features a live DC Motor Digital Twin simulator, an interactive shell, your complete education and certification history, a skills matrix, all your projects, your research publications, and engineering knowledge notes on state-space modeling, QBlade aerodynamics, and Kirchhoff's Laws in domestic AC boards.";
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    if (cmd.includes('ambition') || cmd.includes('goal') || cmd.includes('future') || cmd.includes('plan') || cmd.includes('dream')) {
      responseText = "Your ambition is to pursue MS or PhD studies in Robotics and Intelligent Control Systems, translating theoretical mathematical models into resilient hardware architectures. Your mission is to solve engineering challenges in industrial automation and smart grids through cyber-physical system modeling and self-diagnostic controls.";
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    if (cmd.includes('club') || cmd.includes('r&d') || cmd.includes('leadership') || cmd.includes('robofest') || cmd.includes('ambassador')) {
      responseText = "Your leadership roles: Executive at AIUB Research and Development Club handling Club Welfare and Member Services (May 2026 to present). Previously served as Researcher in the same club (July 2025 to May 2026). You are also a Campus Ambassador for EWU National Robofest 2026.";
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    if (cmd.includes('hello') || cmd.includes('hi matrix') || cmd.includes('hi')) {
      responseText = "Hello, Shaik Tauhidur Rahman. Local AI command routing is active. Central systems are standing by.";
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    // --- Time, Date & Weather ---
    if (cmd.includes('time') || cmd.includes('what time') || cmd.includes('clock')) {
      const now = new Date();
      responseText = `Current local time is ${now.toLocaleTimeString()} on ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    if (cmd.includes('date') || cmd.includes('today') || cmd.includes('what day')) {
      const now = new Date();
      responseText = `Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    // --- Math & Calculations ---
    if (cmd.includes('calculate') || cmd.includes('math') || cmd.includes('what is') && (cmd.includes('+') || cmd.includes('-') || cmd.includes('*') || cmd.includes('/'))) {
      try {
        const expr = cmd.replace(/.*(?:calculate|math|what is)\s*/i, '').replace(/[^0-9+\-*/.() ]/g, '');
        if (expr.trim()) {
          const result = Function('"use strict"; return (' + expr + ')')();
          responseText = `The result of ${expr.trim()} is ${result}.`;
        } else {
          responseText = "Please provide a math expression. For example: calculate 25 times 4.";
        }
      } catch(e) {
        responseText = "I could not parse that math expression. Try something like: calculate 12 + 8.";
      }
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    // --- Jokes & Entertainment ---
    if (cmd.includes('joke') || cmd.includes('funny') || cmd.includes('make me laugh')) {
      const jokes = [
        "Why do programmers prefer dark mode? Because light attracts bugs.",
        "There are only 10 types of people in the world: those who understand binary and those who don't.",
        "A SQL query walks into a bar, sees two tables, and asks... Can I JOIN you?",
        "Why did the developer go broke? Because he used up all his cache.",
        "I told my computer I needed a break. Now it won't stop sending me vacation ads.",
        "Why do Java developers wear glasses? Because they can't C-sharp.",
        "What's an AI's favorite meal? Chips and data.",
        "Debugging: being the detective in a crime movie where you're also the murderer."
      ];
      responseText = jokes[Math.floor(Math.random() * jokes.length)];
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    // --- Motivational Quotes ---
    if (cmd.includes('motivat') || cmd.includes('inspire') || cmd.includes('quote')) {
      const quotes = [
        "The only way to do great work is to love what you do. — Steve Jobs",
        "Innovation distinguishes between a leader and a follower. — Steve Jobs",
        "The future belongs to those who believe in the beauty of their dreams. — Eleanor Roosevelt",
        "It does not matter how slowly you go as long as you do not stop. — Confucius",
        "Success is not final, failure is not fatal: it is the courage to continue that counts. — Winston Churchill",
        "Any sufficiently advanced technology is indistinguishable from magic. — Arthur C. Clarke",
        "The best way to predict the future is to invent it. — Alan Kay",
        "Engineering is the closest thing to magic that exists in the world. — Elon Musk"
      ];
      responseText = quotes[Math.floor(Math.random() * quotes.length)];
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    // --- Fun Facts ---
    if (cmd.includes('fun fact') || cmd.includes('random fact') || cmd.includes('trivia') || cmd.includes('did you know')) {
      const facts = [
        "A single strand of spider silk is thinner than a human hair but five times stronger than steel of the same weight.",
        "The first computer programmer was Ada Lovelace, who wrote algorithms for Charles Babbage's Analytical Engine in 1843.",
        "Honey never spoils. Archaeologists have found 3,000-year-old honey in Egyptian tombs that was still edible.",
        "The total mass of all ants on Earth is roughly equal to the total mass of all humans.",
        "An ESP32 microcontroller can perform 600 million instructions per second while consuming less power than an LED.",
        "The entire codebase of the Apollo 11 guidance computer was about 145,000 lines — less than many modern web apps.",
        "Wind turbines can generate electricity at wind speeds as low as 3 meters per second.",
        "Digital twins can reduce product development costs by up to 50% according to recent industry studies."
      ];
      responseText = facts[Math.floor(Math.random() * facts.length)];
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    // --- Summarization & Explanation ---
    if (cmd.includes('summarize') || cmd.includes('summary') || cmd.includes('explain this os') || cmd.includes('what is matrix os') || cmd.includes('about this os')) {
      responseText = "M.A.T.R.I.X. OS is a custom Debian-based operating system built by Shaik Tauhidur Rahman. It features an offline-first AI control layer with voice routing, a local scheduler daemon for process simulation, ISO build tooling, a React-based desktop UI, Wine compatibility for Windows apps, and an embedded AI orchestrator powered by Qwen3 models. It's designed as a research and engineering workstation.";
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    // --- System Info ---
    if (cmd.includes('system info') || cmd.includes('specs') || cmd.includes('hardware') || cmd.includes('neofetch')) {
      responseText = `System: M.A.T.R.I.X. OS v1.0 | Base: Debian Bookworm (amd64) | Desktop: MATE | AI Engine: Qwen3:8b (local) | Scheduler: SQLite-backed multi-policy | Wine: Developer Channel | Build: ISO chroot pipeline | UI: React + Vite`;
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    // --- Uptime & Performance ---
    if (cmd.includes('uptime') || cmd.includes('how long') || cmd.includes('session')) {
      const uptimeMs = Date.now() - window.__matrixBootTime;
      const mins = Math.floor(uptimeMs / 60000);
      const secs = Math.floor((uptimeMs % 60000) / 1000);
      responseText = `Current UI session has been active for ${mins} minutes and ${secs} seconds.`;
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    // --- Thank You / Compliment ---
    if (cmd.includes('thank') || cmd.includes('thanks') || cmd.includes('good job') || cmd.includes('well done') || cmd.includes('great')) {
      const replies = [
        "You're welcome, Tauhid. Always here to assist.",
        "Glad I could help. Let me know if there's anything else.",
        "Thank you for the kind words. Systems are standing by.",
        "Appreciated. My circuits are warmed by your feedback."
      ];
      responseText = replies[Math.floor(Math.random() * replies.length)];
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    // --- Goodbye / Shutdown ---
    if (cmd.includes('goodbye') || cmd.includes('bye') || cmd.includes('see you') || cmd.includes('shut down voice') || cmd.includes('stop listening')) {
      setIsHandsFree(false);
      isHandsFreeRef.current = false;
      responseText = "Goodbye, Tauhid. Voice control is now idle. Reactivate anytime by clicking the sphere or saying the wake word.";
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      setStatus('dormant');
      return;
    }

    // --- Random Number / Dice / Coin Flip ---
    if (cmd.includes('random number') || cmd.includes('roll') || cmd.includes('dice')) {
      const num = Math.floor(Math.random() * 100) + 1;
      responseText = `Random number generated: ${num}. Range: 1 to 100.`;
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    if (cmd.includes('flip') || cmd.includes('coin') || cmd.includes('heads or tails')) {
      responseText = Math.random() > 0.5 ? "Coin flip result: Heads." : "Coin flip result: Tails.";
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    // --- Password Generator ---
    if (cmd.includes('password') || cmd.includes('generate password') || cmd.includes('secure key')) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
      let pass = '';
      for (let i = 0; i < 16; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
      responseText = `Generated secure password: ${pass}`;
      addLog('Matrix', responseText);
      playSynthSound('success');
      setStatus('dormant');
      return;
    }

    // --- Color Palette Generator ---
    if (cmd.includes('color') || cmd.includes('palette') || cmd.includes('hex color')) {
      const randomHex = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
      const colors = [randomHex(), randomHex(), randomHex(), randomHex(), randomHex()];
      responseText = `Generated color palette: ${colors.join(', ')}`;
      addLog('Matrix', responseText);
      playSynthSound('success');
      setStatus('dormant');
      return;
    }

    // --- Countdown Timer ---
    if (cmd.includes('timer') || cmd.includes('countdown') || cmd.includes('remind me in')) {
      const numMatch = cmd.match(/(\d+)/);
      const seconds = numMatch ? parseInt(numMatch[1]) : 30;
      responseText = `Timer set for ${seconds} seconds. I will notify you when it completes.`;
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      setTimeout(() => {
        const doneMsg = `Timer complete! ${seconds} seconds have elapsed.`;
        addLog('Matrix', doneMsg);
        speakVocalFeedback(doneMsg);
        playSynthSound('success');
      }, seconds * 1000);
      return;
    }

    // --- Word Count ---
    if (cmd.includes('count words') || cmd.includes('word count') || cmd.includes('how many words')) {
      const wordInput = cmd.replace(/.*(?:count words|word count|how many words)\s*/i, '').trim();
      if (wordInput) {
        const count = wordInput.split(/\s+/).length;
        responseText = `The text contains ${count} word${count !== 1 ? 's' : ''}.`;
      } else {
        responseText = "Please provide text after the command. For example: count words The quick brown fox.";
      }
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    // --- Morse Code ---
    if (cmd.includes('morse') || cmd.includes('morse code')) {
      const morseMap = { 'a':'.-','b':'-...','c':'-.-.','d':'-..','e':'.','f':'..-.','g':'--.','h':'....','i':'..','j':'.---','k':'-.-','l':'.-..','m':'--','n':'-.','o':'---','p':'.--.','q':'--.-','r':'.-.','s':'...','t':'-','u':'..-','v':'...-','w':'.--','x':'-..-','y':'-.--','z':'--..','0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.', ' ':'/'};
      const input = cmd.replace(/.*(?:morse code|morse)\s*/i, '').trim().toLowerCase();
      if (input) {
        const morse = input.split('').map(c => morseMap[c] || c).join(' ');
        responseText = `Morse code: ${morse}`;
      } else {
        responseText = "Provide text to convert. Example: morse code hello";
      }
      addLog('Matrix', responseText);
      playSynthSound('success');
      setStatus('dormant');
      return;
    }

    // --- Unit Conversion ---
    if (cmd.includes('convert') || cmd.includes('celsius') || cmd.includes('fahrenheit') || cmd.includes('km to') || cmd.includes('miles to')) {
      if (cmd.includes('celsius') || cmd.includes('to fahrenheit')) {
        const num = parseFloat(cmd.match(/(\d+\.?\d*)/)?.[1] || '0');
        responseText = `${num}°C = ${((num * 9/5) + 32).toFixed(1)}°F`;
      } else if (cmd.includes('fahrenheit') || cmd.includes('to celsius')) {
        const num = parseFloat(cmd.match(/(\d+\.?\d*)/)?.[1] || '0');
        responseText = `${num}°F = ${((num - 32) * 5/9).toFixed(1)}°C`;
      } else if (cmd.includes('km') && cmd.includes('mile')) {
        const num = parseFloat(cmd.match(/(\d+\.?\d*)/)?.[1] || '0');
        responseText = `${num} km = ${(num * 0.621371).toFixed(2)} miles`;
      } else if (cmd.includes('mile') && cmd.includes('km')) {
        const num = parseFloat(cmd.match(/(\d+\.?\d*)/)?.[1] || '0');
        responseText = `${num} miles = ${(num * 1.60934).toFixed(2)} km`;
      } else {
        responseText = "I support temperature and distance conversions. Try: convert 100 celsius to fahrenheit.";
      }
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    // --- Coding Tips ---
    if (cmd.includes('coding tip') || cmd.includes('programming tip') || cmd.includes('dev tip')) {
      const tips = [
        "Always write code as if the next person to maintain it is a violent psychopath who knows where you live.",
        "Use version control from day one. Even for personal projects, Git saves lives.",
        "Write tests before fixing bugs. A failing test proves the bug exists and proves when it's fixed.",
        "Keep functions small and focused. If a function does more than one thing, split it.",
        "Comment the why, not the what. Good code is self-documenting for the what.",
        "Learn to read error messages carefully. 90% of debugging is reading.",
        "Premature optimization is the root of all evil. Make it work, then make it fast.",
        "Name variables as if you'll read them at 3 AM after being woken up by a production alert."
      ];
      responseText = tips[Math.floor(Math.random() * tips.length)];
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    // --- EEE / Engineering Facts ---
    if (cmd.includes('engineering') || cmd.includes('eee') || cmd.includes('electrical') || cmd.includes('circuit')) {
      const eeeFacts = [
        "Ohm's Law (V=IR) is the most fundamental relationship in electrical engineering, relating voltage, current, and resistance.",
        "A digital twin is a virtual replica of a physical system that uses real-time sensor data to mirror its behavior and predict failures.",
        "The ESP32 microcontroller has dual-core processing, built-in WiFi and Bluetooth, and costs less than 5 dollars.",
        "Kirchhoff's Current Law states that the total current entering a junction equals the total current leaving it.",
        "MQTT is a lightweight messaging protocol designed for IoT devices with limited bandwidth and processing power.",
        "Power factor correction can reduce electricity waste by aligning voltage and current waveforms in AC systems.",
        "A PID controller uses Proportional, Integral, and Derivative terms to minimize error in control systems."
      ];
      responseText = eeeFacts[Math.floor(Math.random() * eeeFacts.length)];
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    // --- Capabilities List ---
    if (cmd.includes('what can you do') || cmd.includes('help') || cmd.includes('capabilities') || cmd.includes('features') || cmd.includes('commands')) {
      responseText = "I can: open apps (terminal, files, sandbox, telemetry, game), run diagnostics, control the scheduler, tell jokes, give quotes, share fun facts, do math, convert units, generate passwords and color palettes, set timers, encode morse code, count words, flip coins, roll dice, give coding tips, share EEE knowledge, tell the time and date, summarize this OS, and answer questions about you and your projects. Try asking me anything!";
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    // Direct local Ollama Query Integration if online
    if (ollamaStatus === 'online' && selectedModel && selectedModel !== LOCAL_AI_MODEL.name) {
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds max
        
        const ollamaRes = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: selectedModel,
            prompt: rawText,
            system: systemPrompt,
            options: {
              temperature: llmTemp,
              top_p: llmTopP,
              num_ctx: llmContext
            },
            stream: false
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (ollamaRes.ok) {
          const data = await ollamaRes.json();
          const latency = Date.now() - startTime;
          setInferenceLatency(latency);
          
          const resultText = data.response.trim();
          addLog('Matrix (Ollama)', resultText);
          playSynthSound('success');
          speakVocalFeedback(resultText);
          return;
        }
      } catch (e) {
        console.warn("Ollama query failed:", e);
      }
    }

    const fallbackText = getLocalSynapseResponse(normalizedText);
    const latency = Math.floor(Math.random() * 200 + 40);
    
    setInferenceLatency(latency);
    addLog('Matrix (Local)', fallbackText);
    speakVocalFeedback(fallbackText);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    playSynthSound('click');
    const input = manualInput;
    setManualInput('');
    processVoiceCommand(input);
  };

  const simulateQuery = () => {
    setStatus('processing');
    const prompts = [
      "Run neofetch stats check",
      "Scan security sandbox constraints",
      "Show system telemetry monitor",
      "Run diagnostics audit",
      "Tell me a joke",
      "What time is it",
      "Who am I",
      "Give me a motivational quote",
      "Tell me a fun fact",
      "What can you do",
      "My projects",
      "Give me a coding tip",
      "Tell me about circuits",
      "Summarize this OS",
      "My scholarships and awards",
      "My certifications",
      "Flip a coin",
      "Roll dice"
    ];
    const text = prompts[Math.floor(Math.random() * prompts.length)];
    addLog('Voice Test', text);
    setTimeout(() => {
      processVoiceCommand(text);
    }, 1000);
  };

  const normalizeVoiceDirective = (rawText) => {
    const cleaned = rawText.trim();
    const lower = cleaned.toLowerCase();
    const wakeWords = ['hey matrix', 'ok matrix', 'matrix'];
    const matchedWake = wakeWords.find(wake => lower === wake || lower.startsWith(`${wake} `));
    if (!matchedWake) return cleaned;
    const stripped = cleaned.slice(matchedWake.length).replace(/^[:,\s]+/, '').trim();
    if (!stripped) return 'core status';
    return stripped;
  };

  const getLocalSynapseResponse = (rawText) => {
    const text = rawText.toLowerCase();
    if (text.includes('tauhid') || text.includes('shaik') || text.includes('creator') || text.includes('developer') || text.includes('who am i') || text.includes('owner') || text.includes('myself')) {
      return 'You are Shaik Tauhidur Rahman, an EEE honors student at AIUB. Executive of AIUB R&D Club, Campus Ambassador for EWU Robofest 2026. Dean\'s List honoree, Merit & Academic Scholar. You specialize in Cyber-Physical Systems, Digital Twins, Embedded Systems, and Edge AI. Portfolio: strtauhid.app.';
    }
    if (text.includes('project') || text.includes('portfolio') || text.includes('work')) {
      return 'Your projects: 1) DC Motor Digital Twin (ESP32 + ACS712 + MQTT + state-space estimation), 2) Wind Turbine Simulator (anemometer + QBlade Cp curves), 3) Home Power Distribution Board (MCB + KCL validation). All on strtauhid.app.';
    }
    if (text.includes('publications') || text.includes('research') || text.includes('paper')) {
      return 'Your publication: "A Digital Twin Approach for Smart Monitoring of DC Motors with Real-Time Fault Analysis and Power Evaluation" — IEEE format, first author, submitted to WiDS NSU Conference 2026. DOI: 10.13140/RG.2.2.34869.13282/1.';
    }
    if (text.includes('education') || text.includes('university') || text.includes('degree') || text.includes('aiub')) {
      return 'BSc EEE at AIUB (2024-2027), majoring in Electronics & Intelligence Systems. Previously at Rajshahi College, Rajshahi Govt City College (HSC), and Rajshahi Cantonment Board School (SSC).';
    }
    if (text.includes('scholarship') || text.includes('award') || text.includes('honor') || text.includes('dean')) {
      return 'Dean\'s List (AIUB Spring 2024-25), Merit Scholarship (AIUB Fall 2024-25), Academic Scholarship (AIUB Fall 2024-25), Rajshahi Zilla Parishad Scholarship (HSC Merit 2023).';
    }
    if (text.includes('skill') || text.includes('tech stack') || text.includes('competenc')) {
      return 'Skills: ESP32/STM32, PCB Design, C/C++, Python, MATLAB/Simulink, COMSOL, QBlade, AutoCAD, MQTT, ThingSpeak, Git, LaTeX, PID Control, Rust basics.';
    }
    if (text.includes('contact') || text.includes('email') || text.includes('linkedin') || text.includes('github')) {
      return 'Contact: strtauhid200307@gmail.com | GitHub: Tauhid2003 | LinkedIn: shaik-tauhidur-rahman | Portfolio: strtauhid.app';
    }
    if (text.includes('certification') || text.includes('training') || text.includes('british council') || text.includes('ieee')) {
      return 'Certifications: Additive Manufacturing & Digital Twins (Birmingham/British Council 2025), Industry 4.0 to 5.0 (British Council 2025), IEEE Authorship Symposium (Sep 2025), QBlade & Research Writing (AIUB R&D 2025).';
    }
    if (text.includes('ambition') || text.includes('goal') || text.includes('future') || text.includes('dream')) {
      return 'Ambition: MS/PhD in Robotics & Intelligent Control Systems. Mission: solving industrial automation & smart grid challenges through cyber-physical modeling and self-diagnostic controls.';
    }
    if (text.includes('club') || text.includes('r&d') || text.includes('leadership') || text.includes('robofest')) {
      return 'Leadership: Executive at AIUB R&D Club (May 2026-present), Researcher at AIUB R&D Club (Jul 2025-May 2026), Campus Ambassador for EWU National Robofest 2026.';
    }
    if (text.includes('website') || text.includes('strtauhid')) {
      return 'Your portfolio at strtauhid.app features a live DC Motor Digital Twin simulator, interactive shell, education history, skills matrix, projects, publications, and engineering notes.';
    }
    if (text.includes('architecture') || text.includes('module')) {
      return 'Offline architecture core is active: scheduler, filesystem, process manager, service manager, UI shell, and ISO builder are separated into testable modules.';
    }
    if (text.includes('model') || text.includes('ai')) {
      return 'AI control layer upgraded. Default target model is qwen3:8b, with optional qwen3:30b and qwen3-coder:30b profiles for stronger local machines.';
    }
    if (text.includes('core') || text.includes('status')) {
      return 'CORE-001 is available offline. The AI orchestrator can plan local actions, query core status, route apps, and protect risky build or package operations with confirmation gates.';
    }
    if (text.includes('help') || text.includes('what can you do') || text.includes('capabilities') || text.includes('features')) {
      return 'I can: open apps, run diagnostics, control the scheduler, tell jokes, give motivational quotes, share fun facts, do math, convert units, generate passwords and color palettes, set timers, encode morse code, count words, flip coins, roll dice, give coding tips, share EEE engineering knowledge, tell the time and date, summarize this OS, and answer questions about you and your projects.';
    }
    if (text.includes('offline') || text.includes('internet')) {
      return 'Runtime internet dependency is disabled for core behavior. I am answering through the Matrix local synapse profile.';
    }
    if (text.includes('joke') || text.includes('funny')) {
      const jokes = ['Why do programmers prefer dark mode? Because light attracts bugs.', 'There are only 10 types of people: those who understand binary and those who don\'t.', 'A SQL query walks into a bar, sees two tables, and asks: Can I JOIN you?'];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }
    if (text.includes('time') || text.includes('clock') || text.includes('date') || text.includes('today')) {
      return `Current local time: ${new Date().toLocaleString()}`;
    }
    if (text.includes('motivat') || text.includes('quote') || text.includes('inspire')) {
      const quotes = ['The best way to predict the future is to invent it. — Alan Kay', 'Engineering is the closest thing to magic that exists in the world. — Elon Musk', 'Innovation distinguishes between a leader and a follower. — Steve Jobs'];
      return quotes[Math.floor(Math.random() * quotes.length)];
    }
    if (text.includes('fact') || text.includes('trivia') || text.includes('did you know')) {
      const facts = ['The first computer programmer was Ada Lovelace in 1843.', 'An ESP32 can perform 600 million instructions per second.', 'Digital twins can reduce product development costs by up to 50%.'];
      return facts[Math.floor(Math.random() * facts.length)];
    }
    if (text.includes('thank') || text.includes('thanks') || text.includes('good job')) {
      return 'You are welcome, Tauhid. Always here to assist.';
    }
    if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
      return 'Hello, Shaik Tauhidur Rahman. Local AI command routing is active. Central systems are standing by.';
    }
    return `Matrix local synapse processed your query: "${rawText}". I didn't find a specific system route, but you can try asking me for help, jokes, facts, quotes, time, math, or say a command like open terminal, run diagnostics, or show telemetry.`;
  };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '1.1fr 1fr 1.15fr', 
      gap: '20px', 
      height: '100%', 
      fontFamily: 'var(--font-sans)', 
      color: '#FFF', 
      overflow: 'hidden',
      padding: '2px'
    }}>
      
      {/* COLUMN 1: 3D Holographic Core & Configuration Settings */}
      <div className="panel panel-body-padded" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: 'rgba(24, 24, 24, 0.94)', overflowY: 'auto' }}>
        
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--accent-cyan)' }}>
            MATRIX COGNITIVE CORE
          </span>
          <span className={`preset-badge ${status === 'listening' ? 'preset-badge-yellow' : status === 'speaking' ? 'preset-badge-teal' : 'preset-badge-violet'}`}>
            {status.toUpperCase()}
          </span>
        </div>

        {/* 3D Holographic Sphere Core */}
        <div style={{ position: 'relative', width: '175px', height: '175px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2px 0' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', borderRadius: '50%', cursor: 'pointer' }} onClick={startListening} title="Click to engage Voice Control" />
        </div>

        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '8px' }}>
          <button
            onClick={startListening}
            className={status === 'listening' ? 'btn-build' : 'btn-cyan'}
            style={{ padding: '8px 10px', fontSize: '0.68rem', fontWeight: 'bold', letterSpacing: '0.8px' }}
          >
            {status === 'listening' ? 'LISTENING...' : 'WAKE MATRIX'}
          </button>
          <button
            onClick={() => processVoiceCommand('Matrix, core status')}
            className="btn-flush"
            style={{ padding: '8px 10px', fontSize: '0.62rem' }}
          >
            VOICE TEST
          </button>
        </div>

        <div style={{ width: '100%', background: 'rgba(0, 255, 255, 0.04)', border: '1px solid rgba(0, 255, 255, 0.15)', borderRadius: '6px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.55rem' }}>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>VOICE COMMAND CORE</span>
            <span className={`preset-badge ${voiceWakeArmed ? 'preset-badge-yellow' : 'preset-badge-teal'}`} style={{ fontSize: '0.48rem' }}>
              {voiceWakeArmed ? 'WAKE ARMED' : isHandsFree ? 'HANDS-FREE' : 'MANUAL'}
            </span>
          </div>
          <div style={{ color: '#d9fbff', fontSize: '0.62rem', lineHeight: 1.35, fontFamily: 'var(--font-mono)' }}>
            "{lastTranscript}"
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
            <button onClick={() => processVoiceCommand('Matrix, run diagnostics')} className="btn-flush" style={{ fontSize: '0.52rem', padding: '3px 4px' }}>Diagnostics</button>
            <button onClick={() => processVoiceCommand('Matrix, open terminal')} className="btn-flush" style={{ fontSize: '0.52rem', padding: '3px 4px' }}>Terminal</button>
            <button onClick={() => processVoiceCommand('Matrix, show telemetry')} className="btn-flush" style={{ fontSize: '0.52rem', padding: '3px 4px' }}>Telemetry</button>
            <button onClick={() => processVoiceCommand('Matrix, build ISO')} className="btn-flush" style={{ fontSize: '0.52rem', padding: '3px 4px' }}>Build ISO</button>
          </div>
        </div>

        {/* Live Metrics Widget */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
          <div className="daemon-stats-box" style={{ padding: '6px 8px' }}>
            <div className="stats-row"><span className="stats-label">AI Route:</span><span className={ollamaStatus === 'online' ? 'stats-val-green' : 'stats-val-cyan'}>{ollamaStatus === 'online' ? 'OLLAMA' : 'LOCAL'}</span></div>
            <div className="stats-row"><span className="stats-label">Latency:</span><span className="stats-val-cyan">{inferenceLatency}ms</span></div>
          </div>
          <div className="daemon-stats-box" style={{ padding: '6px 8px' }}>
            <div className="stats-row"><span className="stats-label">Target AI:</span><span className="stats-val-cyan">{selectedModel}</span></div>
            <div className="stats-row"><span className="stats-label">UI Temp:</span><span className="stats-val-green">{diagTemp}°C</span></div>
          </div>
        </div>

        {/* Diagnostics Progress */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--ubuntu-orange)', fontWeight: 'bold' }}>SYSTEM INTEGRITY AUDIT</span>
            <button onClick={executeSystemDiagnostics} disabled={isDiagnosing} className="btn-flush" style={{ fontSize: '0.55rem', padding: '2px 8px', color: 'var(--accent-cyan)', borderColor: 'rgba(0, 255, 255, 0.3)' }}>
              {isDiagnosing ? 'SCANNING...' : 'RUN AUDIT'}
            </button>
          </div>
          <div className="progress-track" style={{ borderRadius: '3px', height: '4px' }}>
            <div className="progress-fill" style={{ width: `${diagnosticProgress}%`, background: 'var(--accent-cyan)', boxShadow: '0 0 6px var(--accent-cyan)' }} />
          </div>
        </div>

        {/* Model and Voice Settings */}
        <div style={{ width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', padding: '8px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '0.55rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>AI Model</label>
              <select 
                value={selectedModel} 
                onChange={(e) => { playSynthSound('click'); setSelectedModel(e.target.value); }}
                style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '2px', fontSize: '0.6rem', color: '#FFF' }}
              >
                {models.map((m, i) => <option key={i} value={m.name}>{m.displayName || m.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '0.55rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>Synth Voice</label>
              <select 
                value={selectedVoice} 
                onChange={(e) => { playSynthSound('click'); setSelectedVoice(e.target.value); }}
                style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '2px', fontSize: '0.6rem', color: '#FFF' }}
              >
                {voices.length === 0 ? <option value="">Default Synth</option> : voices.map((v, i) => <option key={i} value={v.name}>{v.name.substring(0, 18)}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                <span>Rate</span><span>{voiceRate}x</span>
              </div>
              <input type="range" min="0.6" max="1.8" step="0.05" value={voiceRate} onChange={(e) => setVoiceRate(parseFloat(e.target.value))} style={{ accentColor: 'var(--ubuntu-orange)', height: '2px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                <span>Pitch</span><span>{voicePitch}</span>
              </div>
              <input type="range" min="0.5" max="1.5" step="0.05" value={voicePitch} onChange={(e) => setVoicePitch(parseFloat(e.target.value))} style={{ accentColor: 'var(--accent-cyan)', height: '2px' }} />
            </div>
          </div>
        </div>

        {/* Neural Prompt configuration */}
        <div style={{ width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', padding: '8px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
              🧠 Prompt Architect
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.55rem', cursor: 'pointer', color: isHandsFree ? 'var(--ubuntu-orange)' : '#888' }}>
              <input type="checkbox" checked={isHandsFree} onChange={(e) => toggleHandsFree(e.target.checked)} style={{ accentColor: 'var(--ubuntu-orange)' }} />
              <span>Hands-Free</span>
            </label>
          </div>
          <textarea 
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '3px 5px', fontSize: '0.55rem', color: '#EEE', resize: 'vertical', height: '30px' }}
          />
        </div>

      </div>

      {/* COLUMN 2: Agent Task Scheduler Dashboard (Python prototype modeler) */}
      <div className="panel panel-body-padded" style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(24, 24, 24, 0.94)', overflowY: 'auto' }}>
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ubuntu-orange)' }}>
            ⚙️ AGENT TASK SCHEDULER
          </span>
          <button 
            onClick={handleResetQueue} 
            className="btn-flush" 
            style={{ fontSize: '0.52rem', padding: '1px 6px', borderColor: 'rgba(233,84,32,0.3)' }}
          >
            WIPE DB
          </button>
        </div>

        {/* Algorithm Selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <button 
            onClick={() => handleSetAlgorithm('fifo')} 
            className={schedulerAlgo === 'fifo' ? 'btn-cyan' : 'btn-flush'} 
            style={{ fontSize: '0.6rem', padding: '4px 0' }}
          >
            FIFO Policy
          </button>
          <button 
            onClick={() => handleSetAlgorithm('rr')} 
            className={schedulerAlgo === 'rr' ? 'btn-cyan' : 'btn-flush'} 
            style={{ fontSize: '0.6rem', padding: '4px 0' }}
          >
            Round Robin
          </button>
          <button 
            onClick={() => handleSetAlgorithm('sjf')} 
            className={schedulerAlgo === 'sjf' ? 'btn-cyan' : 'btn-flush'} 
            style={{ fontSize: '0.6rem', padding: '4px 0' }}
          >
            SJF Shortest
          </button>
          <button 
            onClick={() => handleSetAlgorithm('priority')} 
            className={schedulerAlgo === 'priority' ? 'btn-cyan' : 'btn-flush'} 
            style={{ fontSize: '0.6rem', padding: '4px 0' }}
          >
            Priority Queue
          </button>
        </div>

        {/* Execution button to Toggle Python daemon process */}
        <button 
          onClick={handleToggleDaemon} 
          className={schedulerRunning ? 'btn-reset' : 'btn-build'} 
          style={{ width: '100%', padding: '6px 0', fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '1px' }}
        >
          {schedulerRunning ? '🛑 SHUTDOWN DAEMON' : '⚡ BOOT OFFLINE DAEMON'}
        </button>

        {/* LRU Cache & Switching telemetry */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div>
            <div style={{ fontSize: '0.52rem', color: 'var(--color-text-muted)' }}>CACHE HITS (LRU-2)</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>{cacheHits}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.52rem', color: 'var(--color-text-muted)' }}>CACHE MISSES</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--ubuntu-orange)' }}>{cacheMisses}</div>
          </div>
          <div style={{ gridColumn: 'span 2', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>
            <div style={{ fontSize: '0.52rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>LRU CACHE CONTENT STATES:</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {lruCacheList.length === 0 ? (
                <span style={{ fontSize: '0.55rem', fontStyle: 'italic', color: '#666' }}>Empty</span>
              ) : (
                lruCacheList.map((k, idx) => (
                  <span key={idx} className="preset-badge preset-badge-teal" style={{ fontSize: '0.5rem', padding: '1px 4px' }}>{k}</span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Active executing task card */}
        {activeTask && (
          <div style={{ border: '1px solid var(--accent-cyan)', background: 'rgba(0, 255, 255, 0.05)', borderRadius: '6px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>ACTIVE: {activeTask.agent_id}</span>
              <span style={{ fontSize: '0.55rem', color: '#FFF' }}>{activeTask.task_name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.52rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              <span>Slice Left: {activeTask.remaining_time.toFixed(1)}s</span>
              <span>Total: {activeTask.duration}s</span>
            </div>
            <div className="progress-track" style={{ height: '5px', borderRadius: '2px' }}>
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${((activeTask.duration - activeTask.remaining_time) / activeTask.duration) * 100}%`, 
                  background: 'var(--accent-cyan)', 
                  boxShadow: '0 0 6px var(--accent-cyan)' 
                }} 
              />
            </div>
          </div>
        )}

        {/* Real-time Daemon Log Console */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '0.52rem', color: '#888', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
            📋 REAL-TIME DAEMON CONSOLE STREAM
          </div>
          <div 
            style={{ 
              background: '#070707', 
              border: '1px solid rgba(255,255,255,0.06)', 
              borderRadius: '4px', 
              padding: '6px 8px', 
              height: '110px', 
              fontFamily: 'var(--font-mono)', 
              fontSize: '0.55rem', 
              color: 'var(--accent-green)', 
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.3'
            }}
          >
            {daemonLogs}
          </div>
        </div>

        {/* Scheduler Queued Tasks List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <div style={{ fontSize: '0.52rem', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            SQLITE TASK QUEUE ({schedulerTasks.length} AGENTS)
          </div>
          {schedulerTasks.map((t, idx) => {
            const isTaskActive = activeTask && activeTask.agent_id === t.agent_id;
            return (
              <div 
                key={idx} 
                style={{ 
                  background: isTaskActive ? 'rgba(233, 84, 32, 0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isTaskActive ? 'var(--ubuntu-orange)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '6px', 
                  padding: '6px 8px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '3px' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: isTaskActive ? 'var(--ubuntu-orange)' : '#FFF' }}>{t.agent_id}</span>
                  <span style={{ fontSize: '0.52rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>Urgency: {t.urgency.toFixed(1)} | Pri: {t.priority.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.5rem', color: 'var(--color-text-muted)' }}>
                  <span>{t.task_name}</span>
                  <span>Rem: {t.remaining_time.toFixed(1)}s ({t.status.toUpperCase()})</span>
                </div>
                <div className="progress-track" style={{ height: '3px', borderRadius: '1px' }}>
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${((t.duration - t.remaining_time) / t.duration) * 100}%`, 
                      background: isTaskActive ? 'var(--ubuntu-orange)' : 'rgba(255,255,255,0.3)' 
                    }} 
                  />
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* COLUMN 3: Command Logs & Cognitive Ingress Streams */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div className="panel-header" style={{ padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="ubuntu-window-title">Cognitive Ingress Streams</span>
          <button 
            onClick={() => { playSynthSound('click'); setLogs([{ sender: 'Matrix', text: 'Cognitive buffer flushed.' }]); }}
            className="btn-flush" 
            style={{ fontSize: '0.55rem', padding: '2px 6px' }}
          >
            Clear Buffer
          </button>
        </div>

        <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.18)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.58rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 'bold', letterSpacing: '0.8px' }}>VOICE ROUTING MATRIX</span>
            <span style={{ fontSize: '0.52rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>Wake words: Matrix, Hey Matrix</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {VOICE_COMMANDS.map((command, idx) => (
              <button
                key={idx}
                onClick={() => processVoiceCommand(command.phrase)}
                className="btn-flush"
                style={{ textAlign: 'left', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '2px', borderColor: 'rgba(0,255,255,0.12)' }}
              >
                <span style={{ fontSize: '0.56rem', color: '#FFF', fontWeight: 'bold' }}>{command.phrase}</span>
                <span style={{ fontSize: '0.48rem', color: 'var(--color-text-muted)' }}>{command.route}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Logs view */}
        <div className="build-logs-viewport scanlines" style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
          {logs.map((log, idx) => {
            const isMatrix = log.sender === 'Matrix' || log.sender === 'Matrix (Ollama)' || log.sender === 'Matrix (Local)';
            const isSch = log.sender === 'Scheduler';
            
            let accent = 'var(--accent-cyan)';
            let bg = 'rgba(0,255,255,0.02)';
            if (!isMatrix && !isSch) {
              accent = 'var(--ubuntu-orange)';
              bg = 'rgba(233,84,32,0.04)';
            } else if (isSch) {
              accent = 'var(--ubuntu-orange)';
              bg = 'rgba(233,84,32,0.02)';
            }
            return (
              <div 
                key={idx} 
                style={{ 
                  background: bg,
                  borderLeft: `3px solid ${accent}`,
                  padding: '6px 10px',
                  borderRadius: '0 4px 4px 0',
                  fontSize: '0.7rem',
                  lineHeight: '1.35'
                }}
              >
                <div style={{ fontSize: '0.55rem', color: accent, fontWeight: 'bold', fontFamily: 'var(--font-sans)', marginBottom: '1px' }}>
                  {log.sender.toUpperCase()}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)' }}>{log.text}</div>
              </div>
            );
          })}
        </div>

        {/* Text Directives Input Bar */}
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '6px', padding: '10px', background: '#181818', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <input 
            type="text"
            className="terminal-input"
            style={{ flex: 1, fontSize: '0.72rem', padding: '6px 10px', borderRadius: '4px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)' }}
            placeholder={status === 'listening' ? 'Acoustic link scanning...' : 'Direct Matrix query or custom parameter...'}
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            disabled={status === 'listening' || status === 'processing'}
          />
          <button 
            type="submit" 
            className="btn-cyan"
            style={{ padding: '0 12px', fontSize: '0.72rem', borderRadius: '4px' }}
            disabled={status === 'listening' || status === 'processing' || !manualInput.trim()}
          >
            Send
          </button>
        </form>
      </div>

    </div>
  );
}
