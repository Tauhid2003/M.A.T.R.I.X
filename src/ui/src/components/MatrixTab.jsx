import { useState, useEffect, useRef } from 'react';

export default function MatrixTab({ onNavigateApp, onExecuteCommand }) {
  const [status, setStatus] = useState('dormant'); // dormant, listening, processing, speaking, overload
  const [logs, setLogs] = useState([
    { sender: 'Matrix', text: 'M.A.T.R.I.X. AI Synaptic Daemon initialized. All channels secure, sir.' }
  ]);
  const [recognition, setRecognition] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  
  // Ollama states
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [ollamaStatus, setOllamaStatus] = useState('offline'); // online, offline
  const [inferenceLatency, setInferenceLatency] = useState(0);
  
  // Custom Settings
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [voiceRate, setVoiceRate] = useState(1.05);
  const [voicePitch, setVoicePitch] = useState(0.95);
  const [manualInput, setManualInput] = useState('');
  
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
  const [modelPullInput, setModelPullInput] = useState('');
  const [isPullingModel, setIsPullingModel] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);

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

  // Telemetry state variables (Jarvis HUD style)
  const [arcPower, setArcPower] = useState(99.85);
  const [shieldIntegrity, setShieldIntegrity] = useState(98.4);

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

  // System telemetry animation loop
  useEffect(() => {
    const telemetryInterval = setInterval(() => {
      // Fluctuate reactor power slightly
      setArcPower(prev => {
        let baseChange = (Math.random() - 0.5) * 0.06;
        if (schedulerRunning) {
          return parseFloat(Math.max(65.0, prev - 0.4 + baseChange).toFixed(2));
        }
        if (status === 'processing') {
          return parseFloat(Math.max(80.0, prev - 0.15 + baseChange).toFixed(2));
        }
        if (status === 'overload') {
          return parseFloat(Math.max(45.0, prev - 0.95 + baseChange).toFixed(2));
        }
        // Recover to ~99.8%
        if (prev < 99.8) {
          return parseFloat(Math.min(99.85, prev + 0.35 + baseChange).toFixed(2));
        }
        return parseFloat((99.85 + (Math.random() - 0.5) * 0.05).toFixed(2));
      });

      // Adjust Shield Integrity
      setShieldIntegrity(prev => {
        if (status === 'overload') {
          return parseFloat(Math.max(72.0, prev - 0.8 - Math.random() * 0.4).toFixed(1));
        }
        if (prev < 98.4) {
          return parseFloat(Math.min(98.4, prev + 0.5).toFixed(1));
        }
        return parseFloat((98.4 + (Math.random() - 0.5) * 0.1).toFixed(1));
      });
    }, 1000);

    return () => clearInterval(telemetryInterval);
  }, [schedulerRunning, status]);

  // Recurrent overload siren alarm
  useEffect(() => {
    if (status !== 'overload') return;
    
    const playOverloadSiren = () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        const now = ctx.currentTime;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.linearRampToValueAtTime(580, now + 0.5);
        osc.frequency.linearRampToValueAtTime(260, now + 1.0);
        
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
        
        osc.start(now);
        osc.stop(now + 1.15);
        setTimeout(() => ctx.close(), 1200);
      } catch (e) {
        console.warn("Audio Context blocked by policy:", e);
      }
    };

    playOverloadSiren();
    const sirenTimer = setInterval(playOverloadSiren, 1400);
    return () => clearInterval(sirenTimer);
  }, [status]);

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

  const simulateModelPull = (modelName) => {
    if (!modelName.trim() || isPullingModel) return;
    setIsPullingModel(true);
    setPullProgress(0);
    playSynthSound('sweep');
    addLog('Matrix', `Initiating pull instruction for Ollama weights: "${modelName}"...`);
    
    const pullSteps = [
      { text: `[OLLAMA] Contacting library registry for registry.ollama.ai/library/${modelName}...`, progress: 10 },
      { text: `[OLLAMA] Pulling manifest repository layer catalog...`, progress: 25 },
      { text: `[OLLAMA] Pulling model layer 1 (1.8 GB) [=======>    ] 65%...`, progress: 50 },
      { text: `[OLLAMA] Pulling model layer 2 (24 MB) [==========] 100%...`, progress: 75 },
      { text: `[OLLAMA] Verifying sha256 checksums... OK`, progress: 90 },
      { text: `[OLLAMA] Success! Model "${modelName}" registered and online.`, progress: 100 }
    ];

    pullSteps.forEach((step, idx) => {
      setTimeout(() => {
        addLog('Matrix', step.text);
        setPullProgress(step.progress);
        playSynthSound('click');
        
        if (idx === pullSteps.length - 1) {
          setIsPullingModel(false);
          playSynthSound('success');
          speakVocalFeedback(`Model ${modelName} downloaded and compiled into Ollama repository, sir.`);
          setModels(prev => [...prev, { name: modelName }]);
          setSelectedModel(modelName);
        }
      }, (idx + 1) * 1200);
    });
  };

  const toggleHandsFree = (val) => {
    setIsHandsFree(val);
    isHandsFreeRef.current = val;
    playSynthSound('click');
    if (val) {
      addLog('Matrix', 'Hands-Free cognitive link engaged, sir. Speak freely.');
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
            setOllamaStatus('offline');
            addLog('System', 'Ollama is online but no model weights were found. Using local synaptic model.');
          }
        }
      } catch (e) {
        setOllamaStatus('offline');
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
  const processVoiceCommandRef = useRef(processVoiceCommand);
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
      playSynthSound('listening');
      addLog('Matrix', 'Acoustic ingress open. Say instructions...');
      startMicAnalysis();
    };

    rec.onerror = (e) => {
      console.error(e);
      setStatus('dormant');
      playSynthSound('error');
      addLog('Matrix', 'Acoustic link blocked or timed out.');
      stopMicAnalysis();
    };

    rec.onend = () => {
      setStatus(prev => (prev === 'listening' ? 'dormant' : prev));
      stopMicAnalysis();
    };

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
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
      } else if (status === 'overload') {
        pColor = 'rgba(255, 40, 40, '; // Deep Red
        ringColor = 'rgba(255, 40, 40, 0.25)';
        activeColor = '#ff2828';
      }

      // Rotate sphere angles
      let speedFactor = 1.0;
      if (status === 'listening') speedFactor = 1.6;
      else if (status === 'processing') speedFactor = 3.6;
      else if (status === 'speaking') speedFactor = 2.0;
      else if (status === 'overload') speedFactor = 6.8;

      rotY += 0.006 * speedFactor;
      rotX += 0.004 * speedFactor;
      rotZ += 0.002 * speedFactor;

      // Base radius of the sphere
      const amp = micVolumeRef.current / 255;
      const breath = Math.sin(Date.now() / 150) * 0.08;
      const scale = 1.0 + amp * 0.7 + (status === 'speaking' ? breath : 0) + (status === 'overload' ? Math.random() * 0.12 : 0);
      const baseRadius = 55 * scale;

      // Shake effect in Overload mode
      const shakeX = status === 'overload' ? (Math.random() - 0.5) * 6 : 0;
      const shakeY = status === 'overload' ? (Math.random() - 0.5) * 6 : 0;
      const finalCX = cX + shakeX;
      const finalCY = cY + shakeY;

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
        if (status === 'overload') {
          return Math.max(38, Math.min(55, parseFloat((change + 0.5).toFixed(1))));
        }
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
      simulateQuery();
      return;
    }
    if (recognition && status === 'dormant') {
      try {
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
      { text: '[CORE] Real-Time Linux Kernel 6.8.0-14 integrity check... OK', progress: 25 },
      { text: '[SANDBOX] bubblewrap runtime process limits checked... OK', progress: 50 },
      { text: '[WINE] DXVK translations pipeline matching graphics layout... OK', progress: 75 },
      { text: `[OLLAMA] Checking local server node connections... ${ollamaStatus === 'online' ? 'CONNECTED' : 'OFFLINE (Local Synapse active)'}`, progress: 100 }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        addLog('Matrix', step.text);
        setDiagnosticProgress(step.progress);
        playSynthSound('click');
        if (idx === steps.length - 1) {
          setIsDiagnosing(false);
          playSynthSound('success');
          speakVocalFeedback("Diagnostics complete, sir. All core operating parameters are normal.");
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
      addLog('Matrix', `Re-mapped OS queue strategy to algorithm: "${algo.toUpperCase()}", sir.`);
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
          addLog('Matrix', 'M.A.T.R.I.X. Kernel Scheduler Daemon active on local SQLite repository, sir.');
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
    addLog('User', rawText);

    const cmd = rawText.toLowerCase();
    let responseText = "Processing directive.";
    
    // Emergency Overload Mode
    if (cmd.includes('activate overload mode') || cmd.includes('execute override protocol') || cmd.includes('overload matrix')) {
      setStatus('overload');
      responseText = "WARNING: System overload protocol engaged. Warning alarm sirens active, nuclear cores at risk, sir!";
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    if (cmd.includes('stand down') || cmd.includes('normalize status') || cmd.includes('normalize system') || cmd.includes('deactivate overload') || cmd.includes('go to sleep')) {
      setIsHandsFree(false);
      isHandsFreeRef.current = false;
      setStatus('dormant');
      responseText = "Understood, sir. Restoring system parameters to normal operating thresholds.";
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
    
    if (cmd.includes('notepad') || cmd.includes('windows')) {
      responseText = "Spawning win32 notepad executable via Wine compatibility layer.";
      playSynthSound('success');
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      setTimeout(() => {
        onNavigateApp('terminal');
        setTimeout(() => onExecuteCommand('notepad.exe'), 500);
      }, 1400);
      return;
    }

    if (cmd.includes('diagnostics') || cmd.includes('audit') || cmd.includes('scan system')) {
      executeSystemDiagnostics();
      return;
    }

    if (cmd.includes('who are you') || cmd.includes('your name') || cmd.includes('identity')) {
      responseText = "I am M.A.T.R.I.X., your personal operating system intelligence cores. Inspired by classic AI designs, built to drive automated distro compiles. At your service, sir.";
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    if (cmd.includes('hello') || cmd.includes('hi matrix') || cmd.includes('hi')) {
      responseText = "Greetings, sir. Central processor units are active and standing by.";
      speakVocalFeedback(responseText);
      addLog('Matrix', responseText);
      return;
    }

    // Direct local Ollama Query Integration if online
    if (ollamaStatus === 'online' && selectedModel) {
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

    // Fallback Mock Response
    const mockResponses = [
      `Initializing local reasoning core... Directing query "${rawText}" to chroot sandbox.`,
      `Synthesizing parameter matrix for query "${rawText}"... Result matches custom chroot rules, sir.`,
      `Routing directive "${rawText}" to local synaptic fallback index. Core is fully operational.`
    ];
    const fallbackText = mockResponses[Math.floor(Math.random() * mockResponses.length)];
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
      "Run diagnostics audit"
    ];
    const text = prompts[Math.floor(Math.random() * prompts.length)];
    addLog('Simulated Voice', text);
    setTimeout(() => {
      processVoiceCommand(text);
    }, 1000);
  };

  // Style overrides for Emergency Overload alarm mode
  const overloadStyle = status === 'overload' ? {
    boxShadow: 'inset 0 0 45px rgba(255, 0, 0, 0.45)',
    border: '1px solid rgba(255, 0, 0, 0.65)',
    background: 'radial-gradient(circle, rgba(140, 10, 10, 0.25) 0%, rgba(20, 2, 2, 0.98) 100%)',
    animation: 'pulse 1.8s infinite alternate'
  } : {};

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '1.1fr 1fr 1.15fr', 
      gap: '20px', 
      height: '100%', 
      fontFamily: 'var(--font-sans)', 
      color: '#FFF', 
      overflow: 'hidden',
      padding: '2px',
      ...overloadStyle
    }}>
      
      {/* COLUMN 1: 3D Holographic Core & Configuration Settings */}
      <div className="panel panel-body-padded" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: 'rgba(24, 24, 24, 0.94)', overflowY: 'auto' }}>
        
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px', color: status === 'overload' ? '#ff3232' : 'var(--accent-cyan)' }}>
            {status === 'overload' ? '⚠️ OVERLOAD TRIGGERED' : '🧠 MATRIX COGNITIVE CORE'}
          </span>
          <span className={`preset-badge ${status === 'listening' ? 'preset-badge-yellow' : status === 'speaking' ? 'preset-badge-teal' : status === 'overload' ? 'preset-badge-red' : 'preset-badge-violet'}`}>
            {status.toUpperCase()}
          </span>
        </div>

        {/* 3D Holographic Sphere Core */}
        <div style={{ position: 'relative', width: '175px', height: '175px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2px 0' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', borderRadius: '50%', cursor: 'pointer' }} onClick={startListening} title="Click to engage Voice Control" />
        </div>

        {/* Live Metrics Widget */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
          <div className="daemon-stats-box" style={{ padding: '6px 8px' }}>
            <div className="stats-row"><span className="stats-label">Ollama Node:</span><span className={ollamaStatus === 'online' ? 'stats-val-green' : 'stats-val-white'}>{ollamaStatus.toUpperCase()}</span></div>
            <div className="stats-row"><span className="stats-label">Latency:</span><span className="stats-val-cyan">{inferenceLatency}ms</span></div>
          </div>
          <div className="daemon-stats-box" style={{ padding: '6px 8px' }}>
            <div className="stats-row"><span className="stats-label">Thermal state:</span><span className={status === 'overload' ? 'stats-val-red' : 'stats-val-green'}>{diagTemp}°C</span></div>
            <div className="stats-row"><span className="stats-label">Audio Link:</span><span className="stats-val-cyan">SECURE</span></div>
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
              <label style={{ fontSize: '0.55rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>Ollama Model</label>
              <select 
                value={selectedModel} 
                onChange={(e) => { playSynthSound('click'); setSelectedModel(e.target.value); }}
                disabled={ollamaStatus === 'offline'}
                style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '2px', fontSize: '0.6rem', color: '#FFF' }}
              >
                {models.length === 0 ? <option value="">Mock Synapses</option> : models.map((m, i) => <option key={i} value={m.name}>{m.name}</option>)}
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

        {/* Emergency manual overload triggers */}
        <div style={{ width: '100%', display: 'flex', gap: '6px' }}>
          <button 
            onClick={() => {
              if (status === 'overload') {
                processVoiceCommand("stand down");
              } else {
                processVoiceCommand("activate overload mode");
              }
            }} 
            className={status === 'overload' ? 'btn-cyan' : 'btn-build'} 
            style={{ flex: 1, padding: '5px 0', fontSize: '0.62rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}
          >
            {status === 'overload' ? '✅ Normalize System' : '⚠️ ACTIVATE OVERLOAD'}
          </button>
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

      {/* COLUMN 3: Iron Man HUD Dials & Cognitive Ingress Streams */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Iron Man HUD Telemetry (Power reactor & Shields) */}
        <div style={{ background: 'rgba(20, 20, 20, 0.95)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          
          {/* Reactor Circle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg viewBox="0 0 36 36" style={{ width: '38px', height: '38px' }}>
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={status === 'overload' ? 'rgba(255,40,40,0.2)' : 'rgba(0, 255, 255, 0.2)'}
                strokeWidth="2"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={status === 'overload' ? '#ff2828' : 'var(--accent-cyan)'}
                strokeWidth="2"
                strokeDasharray={`${arcPower}, 100`}
                style={{ transition: 'stroke-dasharray 0.3s ease' }}
              />
              <circle cx="18" cy="18" r="7" fill={status === 'overload' ? 'rgba(255,40,40,0.5)' : 'rgba(0,255,255,0.5)'} />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.48rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>ARC REACTOR</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: status === 'overload' ? '#ff2828' : 'var(--accent-cyan)' }}>
                {arcPower.toFixed(2)}%
              </span>
            </div>
          </div>

          <div style={{ height: '30px', width: '1px', background: 'rgba(255,255,255,0.08)' }} />

          {/* Firewall Shield */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.48rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
              <span>SHIELD INTEGRITY</span>
              <span style={{ color: status === 'overload' ? '#ff2828' : 'var(--accent-green)' }}>
                {status === 'overload' ? '⚠️ DANGER' : 'ONLINE'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div className="progress-track" style={{ flex: 1, height: '6px', borderRadius: '3px' }}>
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${shieldIntegrity}%`, 
                    background: status === 'overload' ? '#ff2828' : 'var(--accent-green)', 
                    boxShadow: status === 'overload' ? '0 0 6px #ff2828' : '0 0 6px var(--accent-green)',
                    transition: 'width 0.5s ease'
                  }} 
                />
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                {shieldIntegrity.toFixed(1)}%
              </span>
            </div>
          </div>

        </div>

        <div className="panel-header" style={{ padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="ubuntu-window-title">Cognitive Ingress Streams</span>
          <button 
            onClick={() => { playSynthSound('click'); setLogs([{ sender: 'Matrix', text: 'Cognitive buffer flushed, sir.' }]); }}
            className="btn-flush" 
            style={{ fontSize: '0.55rem', padding: '2px 6px' }}
          >
            Clear Buffer
          </button>
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
            if (status === 'overload') {
              bg = 'rgba(255,40,40,0.03)';
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
