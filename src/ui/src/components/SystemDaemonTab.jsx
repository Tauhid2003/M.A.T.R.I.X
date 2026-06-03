import { useState, useEffect } from 'react';

export default function SystemDaemonTab() {
  const [selectedModel, setSelectedModel] = useState('qwen-3b');
  const [latencyView, setLatencyView] = useState('line'); // 'bars' or 'line'
  const [overheadView, setOverheadView] = useState('line'); // 'bars' or 'line'
  const [tokensInUse, setTokensInUse] = useState(1280);
  const [cpuLoad, setCpuLoad] = useState(12);
  const [gpuLoad, setGpuLoad] = useState(25);
  const [vramUsage, setVramUsage] = useState(3.2); // GB
  const [ramUsage, setRamUsage] = useState(9.4); // GB
  const [ntsyncCalls, setNtsyncCalls] = useState(1240);
  const [dxvkShaders, setDxvkShaders] = useState(142);
  const [activeWindowsApps, setActiveWindowsApps] = useState([
    { id: 1, name: 'notepad.exe', pid: 4092, runtime: 'Wine Stable 9.0', rendering: 'DXVK Vulkan', cpu: 1.2, vram: 0.12 },
    { id: 2, name: 'dxdiag.exe', pid: 4120, runtime: 'Proton Experimental', rendering: 'VKD3D Vulkan', cpu: 4.8, vram: 0.45 }
  ]);

  const [gpuModel, setGpuModel] = useState('NVIDIA Corporation AD102 [GeForce RTX 4090]');
  const [gpuDriverName, setGpuDriverName] = useState('nvidia-550.120 (proprietary)');
  const [audioDriverName, setAudioDriverName] = useState('PipeWire Audio Server');

  // Hardcoded max/limit parameters for visualization
  const [ramLimit, setRamLimit] = useState(16.0);
  const [vramLimit, setVramLimit] = useState(8.0);
  const [cpuCores, setCpuCores] = useState(8);
  const [cpuThreads, setCpuThreads] = useState(16);
  const [isApiMode, setIsApiMode] = useState(false);

  // Fetch real hardware profile and daemon status if API is online
  useEffect(() => {
    const fetchSystemTelemetry = async () => {
      try {
        const hwRes = await fetch('/api/hardware');
        const statusRes = await fetch('/api/status');
        
        if (hwRes.ok) {
          const hw = await hwRes.json();
          setIsApiMode(true);
          
          if (hw.hardware) {
            setGpuModel(hw.hardware.gpu_detected || 'Integrated / CPU-Only');
            setRamLimit(hw.hardware.system_ram_gb || 16.0);
            setVramLimit(hw.hardware.gpu_vram_gb || 8.0);
            setCpuCores(hw.hardware.cpu_cores || 8);
            setCpuThreads((hw.hardware.cpu_cores || 8) * 2);
            
            // Re-seed starting memory usages based on host config
            setRamUsage((hw.hardware.system_ram_gb || 16.0) * 0.42);
            setVramUsage((hw.hardware.gpu_vram_gb || 8.0) * 0.25);
          }
        }
        
        if (statusRes.ok) {
          const status = await statusRes.json();
          if (status.default_model) {
            // Map default model to dropdown value
            if (status.default_model.includes('14b')) {
              setSelectedModel('qwen-14b');
            } else if (status.default_model.includes('phi')) {
              setSelectedModel('phi-3');
            } else {
              setSelectedModel('qwen-3b');
            }
          }
        }
      } catch {
        console.warn('System Monitor daemon is offline. Using simulated system diagnostics.');
        setIsApiMode(false);
      }
    };
    
    fetchSystemTelemetry();
  }, []);

  useEffect(() => {
    const loadDriverStates = () => {
      const gpuChoice = localStorage.getItem('ubuntu_driver_gpu') || 'nvidia';
      const audioChoice = localStorage.getItem('ubuntu_driver_audio') || 'pipewire';
      
      if (!isApiMode) {
        if (gpuChoice === 'nouveau') {
          setGpuModel('Mesa LLVMpipe (CPU Rasterizer / Nouveau)');
          setGpuDriverName('nouveau (open-source)');
        } else {
          setGpuModel('NVIDIA Corporation AD102 [GeForce RTX 4090]');
          setGpuDriverName('nvidia-550.120 (proprietary)');
        }
      } else {
        setGpuDriverName(gpuChoice === 'nouveau' ? 'nouveau (open-source)' : 'nvidia-550.120 (proprietary)');
      }
      
      setAudioDriverName(audioChoice === 'alsa' ? 'ALSA legacy kernel' : 'PipeWire Audio Server');
    };
    
    loadDriverStates();
    window.addEventListener('ubuntu-drivers-updated', loadDriverStates);
    return () => window.removeEventListener('ubuntu-drivers-updated', loadDriverStates);
  }, [isApiMode]);

  useEffect(() => {
    const timer = setInterval(async () => {
      if (isApiMode) {
        try {
          const res = await fetch('/api/telemetry');
          if (res.ok) {
            const data = await res.json();
            setCpuLoad(data.cpu_load);
            setRamUsage(data.ram_used_gb);
            if (data.ram_total_gb) setRamLimit(data.ram_total_gb);
            
            // Standard dynamic mock variables with minor delta fluctuations
            setGpuLoad(prev => {
              const delta = Math.floor(Math.random() * 5) - 2;
              return Math.max(10, Math.min(90, prev + delta));
            });
            setVramUsage(prev => {
              const delta = parseFloat((Math.random() * 0.04 - 0.02).toFixed(2));
              return Math.max(vramLimit * 0.1, Math.min(vramLimit * 0.8, parseFloat((prev + delta).toFixed(2))));
            });
            setNtsyncCalls(prev => {
              const delta = Math.floor(Math.random() * 200) - 100;
              return Math.max(500, Math.min(2500, prev + delta));
            });
            setDxvkShaders(prev => {
              const delta = Math.floor(Math.random() * 3) - 1;
              return Math.max(100, Math.min(300, prev + delta));
            });
            return;
          }
        } catch {
          // Fall back to simulation if request fails
        }
      }

      // Simulated fallback mode telemetry
      setCpuLoad(prev => {
        const delta = Math.floor(Math.random() * 9) - 4;
        return Math.max(5, Math.min(85, prev + delta));
      });
      setGpuLoad(prev => {
        const delta = Math.floor(Math.random() * 11) - 5;
        return Math.max(10, Math.min(95, prev + delta));
      });
      setVramUsage(prev => {
        const delta = parseFloat((Math.random() * 0.15 - 0.07).toFixed(2));
        return Math.max(vramLimit * 0.1, Math.min(vramLimit * 0.9, parseFloat((prev + delta).toFixed(2))));
      });
      setRamUsage(prev => {
        const delta = parseFloat((Math.random() * 0.1 - 0.05).toFixed(2));
        return Math.max(ramLimit * 0.2, Math.min(ramLimit * 0.85, parseFloat((prev + delta).toFixed(2))));
      });
      setNtsyncCalls(prev => {
        const delta = Math.floor(Math.random() * 200) - 100;
        return Math.max(500, Math.min(2500, prev + delta));
      });
      setDxvkShaders(prev => {
        const delta = Math.floor(Math.random() * 3) - 1;
        return Math.max(100, Math.min(300, prev + delta));
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [ramLimit, vramLimit, isApiMode]);

  const clearModelContext = () => {
    setTokensInUse(0);
  };

  const getModelStats = () => {
    switch (selectedModel) {
      case 'qwen-3b':
        return { name: 'Qwen-2.5-3B-Instruct (4-bit)', size: '2.1 GB', context: '32,768 tokens', speed: '48.2 t/s' };
      case 'phi-3':
        return { name: 'Phi-3-Medium (4-bit)', size: '3.8 GB', context: '4,096 tokens', speed: '36.5 t/s' };
      case 'qwen-14b':
        return { name: 'Qwen-2.5-14B-Instruct (4-bit)', size: '9.2 GB', context: '32,768 tokens', speed: '14.8 t/s' };
      default:
        return { name: 'Unknown', size: 'N/A', context: 'N/A', speed: 'N/A' };
    }
  };

  const currentModelStats = getModelStats();

  const terminateWindowsApp = (id) => {
    setActiveWindowsApps(prev => prev.filter(app => app.id !== id));
  };

  return (
    <div className="dashboard-grid">
      
      {/* Local AI Engine Daemon */}
      <div className="panel panel-body-padded" style={{ height: '580px' }}>
        <h3 className="card-title">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Ollama AI Inference
        </h3>

        <div className="config-group" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="config-control">
            <label className="config-label">Active Model</label>
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                setTokensInUse(100);
              }}
              className="config-select"
            >
              <option value="qwen-3b">Qwen-2.5-3B-Instruct (Recommended)</option>
              <option value="phi-3">Phi-3-Medium (Fast CPU Model)</option>
              <option value="qwen-14b">Qwen-2.5-14B-Instruct (High Precision)</option>
            </select>
          </div>

          <div className="daemon-stats-box">
            <div className="stats-row">
              <span className="stats-label">Model Name:</span>
              <span className="stats-val-white">{currentModelStats.name}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">VRAM footprint:</span>
              <span className="stats-val-cyan">{currentModelStats.size}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Max context:</span>
              <span className="stats-val-violet">{currentModelStats.context}</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Speed rate:</span>
              <span className="stats-val-green">{currentModelStats.speed}</span>
            </div>
          </div>

          <div>
            <div className="meter-header">
              <span className="meter-label">Active Context token space</span>
              <span className="meter-val">{tokensInUse} / {selectedModel === 'phi-3' ? '4096' : '32768'}</span>
            </div>
            <div className="meter-track">
              <div 
                className="meter-fill meter-fill-violet" 
                style={{ width: `${(tokensInUse / (selectedModel === 'phi-3' ? 4096 : 32768)) * 100}%` }}
              ></div>
            </div>
            <div className="meter-footer">
              <span className="meter-desc">Dynamic token window tracks history</span>
              <button onClick={clearModelContext} className="btn-flush">Flush</button>
            </div>
          </div>

          <div>
            <label className="config-label" style={{ display: 'block', marginBottom: '4px' }}>CPU CPU-features bound</label>
            <div className="instruction-tag-grid">
              <div className="instruction-tag">AVX2</div>
              <div className="instruction-tag">SSE4.2</div>
              <div className="instruction-tag instruction-tag-cyan">CUDA / ROCm</div>
            </div>
          </div>

          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="config-label" style={{ margin: 0 }}>AI Inference Benchmark (Latency)</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  onClick={() => setLatencyView('bars')} 
                  className={`btn-flush ${latencyView === 'bars' ? 'active' : ''}`}
                  style={{ fontSize: '0.6rem', padding: '2px 4px', border: '1px solid var(--border-color)', borderRadius: '3px', background: latencyView === 'bars' ? 'rgba(255,255,255,0.08)' : 'transparent', color: latencyView === 'bars' ? '#fff' : 'var(--color-text-muted)' }}
                >Bars</button>
                <button 
                  onClick={() => setLatencyView('line')} 
                  className={`btn-flush ${latencyView === 'line' ? 'active' : ''}`}
                  style={{ fontSize: '0.6rem', padding: '2px 4px', border: '1px solid var(--border-color)', borderRadius: '3px', background: latencyView === 'line' ? 'rgba(255,255,255,0.08)' : 'transparent', color: latencyView === 'line' ? '#fff' : 'var(--color-text-muted)' }}
                >Line</button>
              </div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '6px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              {latencyView === 'bars' ? (
                <svg width="100%" height="70" viewBox="0 0 300 70">
                  <rect x="10" y="8" width="120" height="10" rx="3" fill="#a78bfa" />
                  <text x="140" y="17" fill="var(--color-text-muted)" fontSize="8" fontFamily="monospace">Qwen-3B: 42ms</text>
                  
                  <rect x="10" y="28" width="80" height="10" rx="3" fill="#34d399" />
                  <text x="140" y="37" fill="var(--color-text-muted)" fontSize="8" fontFamily="monospace">Phi-3: 28ms</text>
                  
                  <rect x="10" y="48" width="220" height="10" rx="3" fill="#fb7185" />
                  <text x="240" y="57" fill="var(--color-text-muted)" fontSize="8" fontFamily="monospace">Qwen-14B: 88ms</text>
                </svg>
              ) : (
                <svg width="100%" height="90" viewBox="0 0 300 90">
                  {/* Grid Lines */}
                  <line x1="40" y1="10" x2="280" y2="10" stroke="rgba(255,255,255,0.05)" strokeDasharray="2,2" />
                  <line x1="40" y1="35" x2="280" y2="35" stroke="rgba(255,255,255,0.05)" strokeDasharray="2,2" />
                  <line x1="40" y1="60" x2="280" y2="60" stroke="rgba(255,255,255,0.05)" strokeDasharray="2,2" />
                  <line x1="40" y1="80" x2="280" y2="80" stroke="rgba(255,255,255,0.1)" />
                  <line x1="40" y1="10" x2="40" y2="80" stroke="rgba(255,255,255,0.1)" />
                  
                  {/* Y-Axis Label */}
                  <text x="5" y="45" fill="var(--color-text-muted)" fontSize="6" transform="rotate(-90 5 45)" textAnchor="middle">Latency (ms)</text>
                  {/* X-Axis Label */}
                  <text x="160" y="88" fill="var(--color-text-muted)" fontSize="6" textAnchor="middle">Concurrency (Threads)</text>
                  
                  {/* Axis values */}
                  <text x="35" y="13" fill="var(--color-text-muted)" fontSize="5" textAnchor="end">350</text>
                  <text x="35" y="48" fill="var(--color-text-muted)" fontSize="5" textAnchor="end">180</text>
                  <text x="35" y="82" fill="var(--color-text-muted)" fontSize="5" textAnchor="end">0</text>
                  
                  <text x="40" y="86" fill="var(--color-text-muted)" fontSize="5" textAnchor="middle">1t</text>
                  <text x="100" y="86" fill="var(--color-text-muted)" fontSize="5" textAnchor="middle">4t</text>
                  <text x="160" y="86" fill="var(--color-text-muted)" fontSize="5" textAnchor="middle">8t</text>
                  <text x="220" y="86" fill="var(--color-text-muted)" fontSize="5" textAnchor="middle">12t</text>
                  <text x="280" y="86" fill="var(--color-text-muted)" fontSize="5" textAnchor="middle">16t</text>

                  {/* Multi-series curves */}
                  {/* Phi-3 (Green) */}
                  <path d="M 40,75 L 100,73 L 160,70 L 220,65 L 280,58" fill="none" stroke="#34d399" strokeWidth="1.5" />
                  <circle cx="40" cy="75" r="2" fill="#34d399" />
                  <circle cx="280" cy="58" r="2" fill="#34d399" />
                  
                  {/* Qwen-3B (Purple) */}
                  <path d="M 40,71 L 100,68 L 160,61 L 220,53 L 280,42" fill="none" stroke="#a78bfa" strokeWidth="1.5" />
                  <circle cx="40" cy="71" r="2" fill="#a78bfa" />
                  <circle cx="280" cy="42" r="2" fill="#a78bfa" />

                  {/* Qwen-14B (Rose) */}
                  <path d="M 40,62 L 100,54 L 160,42 L 220,28 L 280,12" fill="none" stroke="#fb7185" strokeWidth="1.5" />
                  <circle cx="40" cy="62" r="2" fill="#fb7185" />
                  <circle cx="280" cy="12" r="2" fill="#fb7185" />
                  
                  {/* Legends */}
                  <rect x="50" y="15" width="4" height="4" fill="#fb7185" />
                  <text x="57" y="19" fill="var(--color-text-muted)" fontSize="5">Qwen-14B</text>
                  
                  <rect x="110" y="15" width="4" height="4" fill="#a78bfa" />
                  <text x="117" y="19" fill="var(--color-text-muted)" fontSize="5">Qwen-3B</text>
                  
                  <rect x="170" y="15" width="4" height="4" fill="#34d399" />
                  <text x="177" y="19" fill="var(--color-text-muted)" fontSize="5">Phi-3</text>
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Wine/Proton Translation layer */}
      <div className="panel panel-body-padded" style={{ height: '580px' }}>
        <h3 className="card-title">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
          </svg>
          Syscall Interceptor
        </h3>

        <div className="config-group" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <label className="config-label" style={{ display: 'block', marginBottom: '8px' }}>Active PE application processes</label>
            {activeWindowsApps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', border: '1px dashed var(--border-color)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--color-text-dark)' }}>
                No active Windows binaries.
              </div>
            ) : (
              <div className="process-list">
                {activeWindowsApps.map(app => (
                  <div key={app.id} className="process-card">
                    <div>
                      <div className="process-info-title">
                        <span className="process-info-dot"></span>
                        {app.name}
                      </div>
                      <div className="process-info-meta">
                        PID: {app.pid} | {app.runtime}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div className="process-stats">
                        <div>CPU: {app.cpu}%</div>
                        <div style={{ color: 'var(--accent-rose)' }}>VRAM: {app.vram}G</div>
                      </div>
                      <button onClick={() => terminateWindowsApp(app.id)} className="btn-kill">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="daemon-stats-box">
            <div className="stats-row" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', fontWeight: '700', color: 'var(--accent-cyan)' }}>
              <span>Syscall remap count</span>
              <span style={{ color: 'var(--accent-rose)' }}>NTSYNC</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">Locks resolved:</span>
              <span className="stats-val-white">{ntsyncCalls.toLocaleString()} / s</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">wineserver bypass:</span>
              <span className="stats-val-green">98.4% (kernel thread)</span>
            </div>
            <div className="stats-row">
              <span className="stats-label">DXVK shader cache:</span>
              <span className="stats-val-cyan">{dxvkShaders} modules</span>
            </div>
          </div>

          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="config-label" style={{ margin: 0 }}>Scheduler Policies Overhead (ns)</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  onClick={() => setOverheadView('bars')} 
                  className={`btn-flush ${overheadView === 'bars' ? 'active' : ''}`}
                  style={{ fontSize: '0.6rem', padding: '2px 4px', border: '1px solid var(--border-color)', borderRadius: '3px', background: overheadView === 'bars' ? 'rgba(255,255,255,0.08)' : 'transparent', color: overheadView === 'bars' ? '#fff' : 'var(--color-text-muted)' }}
                >Bars</button>
                <button 
                  onClick={() => setOverheadView('line')} 
                  className={`btn-flush ${overheadView === 'line' ? 'active' : ''}`}
                  style={{ fontSize: '0.6rem', padding: '2px 4px', border: '1px solid var(--border-color)', borderRadius: '3px', background: overheadView === 'line' ? 'rgba(255,255,255,0.08)' : 'transparent', color: overheadView === 'line' ? '#fff' : 'var(--color-text-muted)' }}
                >Line</button>
              </div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '6px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              {overheadView === 'bars' ? (
                <svg width="100%" height="70" viewBox="0 0 300 70">
                  <rect x="10" y="8" width="180" height="10" rx="3" fill="#fb7185" />
                  <text x="200" y="17" fill="var(--color-text-muted)" fontSize="8" fontFamily="monospace">Priority: 180ns</text>
                  
                  <rect x="10" y="28" width="90" height="10" rx="3" fill="#22d3ee" />
                  <text x="200" y="37" fill="var(--color-text-muted)" fontSize="8" fontFamily="monospace">Round-Robin: 90ns</text>
                  
                  <rect x="10" y="48" width="40" height="10" rx="3" fill="#34d399" />
                  <text x="200" y="57" fill="var(--color-text-muted)" fontSize="8" fontFamily="monospace">FIFO: 40ns</text>
                </svg>
              ) : (
                <svg width="100%" height="90" viewBox="0 0 300 90">
                  {/* Grid Lines */}
                  <line x1="40" y1="10" x2="280" y2="10" stroke="rgba(255,255,255,0.05)" strokeDasharray="2,2" />
                  <line x1="40" y1="35" x2="280" y2="35" stroke="rgba(255,255,255,0.05)" strokeDasharray="2,2" />
                  <line x1="40" y1="60" x2="280" y2="60" stroke="rgba(255,255,255,0.05)" strokeDasharray="2,2" />
                  <line x1="40" y1="80" x2="280" y2="80" stroke="rgba(255,255,255,0.1)" />
                  <line x1="40" y1="10" x2="40" y2="80" stroke="rgba(255,255,255,0.1)" />
                  
                  {/* Y-Axis Label */}
                  <text x="5" y="45" fill="var(--color-text-muted)" fontSize="6" transform="rotate(-90 5 45)" textAnchor="middle">Overhead (ns)</text>
                  {/* X-Axis Label */}
                  <text x="160" y="88" fill="var(--color-text-muted)" fontSize="6" textAnchor="middle">Queue Depth (Tasks)</text>
                  
                  {/* Axis values */}
                  <text x="35" y="13" fill="var(--color-text-muted)" fontSize="5" textAnchor="end">1000</text>
                  <text x="35" y="48" fill="var(--color-text-muted)" fontSize="5" textAnchor="end">500</text>
                  <text x="35" y="82" fill="var(--color-text-muted)" fontSize="5" textAnchor="end">0</text>
                  
                  <text x="40" y="86" fill="var(--color-text-muted)" fontSize="5" textAnchor="middle">10</text>
                  <text x="100" y="86" fill="var(--color-text-muted)" fontSize="5" textAnchor="middle">100</text>
                  <text x="160" y="86" fill="var(--color-text-muted)" fontSize="5" textAnchor="middle">300</text>
                  <text x="220" y="86" fill="var(--color-text-muted)" fontSize="5" textAnchor="middle">600</text>
                  <text x="280" y="86" fill="var(--color-text-muted)" fontSize="5" textAnchor="middle">1000</text>

                  {/* Multi-series curves */}
                  {/* FIFO (Green) */}
                  <path d="M 40,77 L 100,76.5 L 160,76 L 220,75 L 280,73" fill="none" stroke="#34d399" strokeWidth="1.5" />
                  <circle cx="40" cy="77" r="2" fill="#34d399" />
                  <circle cx="280" cy="73" r="2" fill="#34d399" />
                  
                  {/* Round-Robin (Cyan) */}
                  <path d="M 40,73 L 100,71.5 L 160,68.5 L 220,64 L 280,58" fill="none" stroke="#22d3ee" strokeWidth="1.5" />
                  <circle cx="40" cy="73" r="2" fill="#22d3ee" />
                  <circle cx="280" cy="58" r="2" fill="#22d3ee" />

                  {/* Priority (Rose) */}
                  <path d="M 40,66 L 100,62 L 160,49 L 220,31 L 280,11" fill="none" stroke="#fb7185" strokeWidth="1.5" />
                  <circle cx="40" cy="66" r="2" fill="#fb7185" />
                  <circle cx="280" cy="11" r="2" fill="#fb7185" />
                  
                  {/* Legends */}
                  <rect x="50" y="15" width="4" height="4" fill="#fb7185" />
                  <text x="57" y="19" fill="var(--color-text-muted)" fontSize="5">Priority</text>
                  
                  <rect x="110" y="15" width="4" height="4" fill="#22d3ee" />
                  <text x="117" y="19" fill="var(--color-text-muted)" fontSize="5">Round-Robin</text>
                  
                  <rect x="170" y="15" width="4" height="4" fill="#34d399" />
                  <text x="177" y="19" fill="var(--color-text-muted)" fontSize="5">FIFO</text>
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hardware telemetry */}
      <div className="panel panel-body-padded" style={{ height: '580px' }}>
        <h3 className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z"></path>
            </svg>
            Host Resource Telemetry
          </div>
          {isApiMode ? (
            <span className="telemetry-badge telemetry-badge-real" style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0, 255, 255, 0.15)', color: '#00ffff', border: '1px solid rgba(0, 255, 255, 0.3)' }}>REAL HOST</span>
          ) : (
            <span className="telemetry-badge telemetry-badge-sim" style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(233, 84, 32, 0.15)', color: '#e95420', border: '1px solid rgba(233, 84, 32, 0.3)' }}>SIMULATED</span>
          )}
        </h3>

        <div className="config-group" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="meter-header">
              <span className="meter-label" style={{ color: 'var(--accent-cyan)' }}>
                Host CPU Load <span style={{ fontSize: '0.55rem', opacity: 0.7, paddingLeft: '4px', color: isApiMode ? 'var(--accent-cyan)' : 'var(--ubuntu-orange)' }}>[{isApiMode ? 'REAL HOST' : 'SIMULATED'}]</span>
              </span>
              <span className="meter-val">{cpuLoad}%</span>
            </div>
            <div className="meter-track">
              <div className="meter-fill meter-fill-cyan" style={{ width: `${cpuLoad}%` }}></div>
            </div>
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', fontFamily: 'var(--font-mono)', display: 'block', marginTop: '4px' }}>
              {cpuCores} Cores / {cpuThreads} Threads active
            </span>
          </div>

          <div>
            <div className="meter-header">
              <span className="meter-label" style={{ color: 'var(--accent-rose)' }}>
                GPU core clock draw <span style={{ fontSize: '0.55rem', opacity: 0.7, paddingLeft: '4px', color: 'var(--ubuntu-orange)' }}>[SIMULATED]</span>
              </span>
              <span className="meter-val">{gpuLoad}%</span>
            </div>
            <div className="meter-track">
              <div className="meter-fill meter-fill-pink" style={{ width: `${gpuLoad}%` }}></div>
            </div>
            <span style={{ fontSize: '0.62rem', color: 'var(--color-text-dark)', fontFamily: 'var(--font-mono)', display: 'block', marginTop: '4px', lineHeight: '1.3' }}>
              Card: {gpuModel}<br />
              Driver: <span style={{ color: gpuDriverName.includes('proprietary') ? 'var(--accent-cyan)' : 'var(--ubuntu-orange)' }}>{gpuDriverName}</span>
            </span>
          </div>

          <div>
            <div className="meter-header">
              <span className="meter-label" style={{ color: 'var(--accent-violet)' }}>
                VRAM Pool Allocation <span style={{ fontSize: '0.55rem', opacity: 0.7, paddingLeft: '4px', color: 'var(--ubuntu-orange)' }}>[SIMULATED]</span>
              </span>
              <span className="meter-val">{vramUsage.toFixed(1)}G / {vramLimit.toFixed(1)}G</span>
            </div>
            <div className="meter-track">
              <div className="meter-fill meter-fill-violet" style={{ width: `${vramLimit > 0 ? (vramUsage / vramLimit) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div>
            <div className="meter-header">
              <span className="meter-label" style={{ color: 'var(--accent-green)' }}>
                Host System RAM <span style={{ fontSize: '0.55rem', opacity: 0.7, paddingLeft: '4px', color: isApiMode ? 'var(--accent-green)' : 'var(--ubuntu-orange)' }}>[{isApiMode ? 'REAL HOST' : 'SIMULATED'}]</span>
              </span>
              <span className="meter-val">{ramUsage.toFixed(1)}G / {ramLimit.toFixed(1)}G</span>
            </div>
            <div className="meter-track">
              <div className="meter-fill meter-fill-green" style={{ width: `${ramLimit > 0 ? (ramUsage / ramLimit) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div className="explain-box" style={{ background: 'hsla(230, 25%, 20%, 0.1)', border: '1px solid var(--border-color)', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div><strong>persistent mmap swap:</strong> Active swap rate: <strong>1.2 GB/s</strong>.</div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4px', fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>
              🔊 Sound Card: ALC1220 (System: <span style={{ color: 'var(--accent-cyan)' }}>{audioDriverName}</span>)
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
