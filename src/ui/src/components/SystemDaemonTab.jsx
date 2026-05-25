import React, { useState, useEffect } from 'react';

export default function SystemDaemonTab() {
  const [selectedModel, setSelectedModel] = useState('qwen-3b');
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

  useEffect(() => {
    const loadDriverStates = () => {
      const gpuChoice = localStorage.getItem('ubuntu_driver_gpu') || 'nvidia';
      const audioChoice = localStorage.getItem('ubuntu_driver_audio') || 'pipewire';
      
      if (gpuChoice === 'nouveau') {
        setGpuModel('Mesa LLVMpipe (CPU Rasterizer / Nouveau)');
        setGpuDriverName('nouveau (open-source)');
      } else {
        setGpuModel('NVIDIA Corporation AD102 [GeForce RTX 4090]');
        setGpuDriverName('nvidia-550.120 (proprietary)');
      }
      
      setAudioDriverName(audioChoice === 'alsa' ? 'ALSA legacy kernel' : 'PipeWire Audio Server');
    };
    
    loadDriverStates();
    window.addEventListener('ubuntu-drivers-updated', loadDriverStates);
    return () => window.removeEventListener('ubuntu-drivers-updated', loadDriverStates);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCpuLoad(prev => {
        const delta = Math.floor(Math.random() * 9) - 4;
        return Math.max(5, Math.min(85, prev + delta));
      });
      setGpuLoad(prev => {
        const delta = Math.floor(Math.random() * 11) - 5;
        return Math.max(10, Math.min(95, prev + delta));
      });
      setVramUsage(prev => {
        const delta = parseFloat((Math.random() * 0.2 - 0.1).toFixed(2));
        return Math.max(2.0, Math.min(7.5, parseFloat((prev + delta).toFixed(2))));
      });
      setRamUsage(prev => {
        const delta = parseFloat((Math.random() * 0.1 - 0.05).toFixed(2));
        return Math.max(8.0, Math.min(14.8, parseFloat((prev + delta).toFixed(2))));
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
  }, []);

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

          <div className="explain-box">
            <strong>Lock Thread Accelerator:</strong> Thread locking parameters bypass user-space. They map to host CPU execution directly, cutting VM delay.
          </div>
        </div>
      </div>

      {/* Hardware telemetry */}
      <div className="panel panel-body-padded" style={{ height: '580px' }}>
        <h3 className="card-title">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z"></path>
          </svg>
          Host Resource Telemetry
        </h3>

        <div className="config-group" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="meter-header">
              <span className="meter-label" style={{ color: 'var(--accent-cyan)' }}>CPU load (AVX2 cores)</span>
              <span className="meter-val">{cpuLoad}%</span>
            </div>
            <div className="meter-track">
              <div className="meter-fill meter-fill-cyan" style={{ width: `${cpuLoad}%` }}></div>
            </div>
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-dark)', fontFamily: 'var(--font-mono)', display: 'block', marginTop: '4px' }}>4 Cores / 8 Threads active</span>
          </div>

          <div>
            <div className="meter-header">
              <span className="meter-label" style={{ color: 'var(--accent-rose)' }}>GPU core clock draw</span>
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
              <span className="meter-label" style={{ color: 'var(--accent-violet)' }}>VRAM Pool Allocation</span>
              <span className="meter-val">{vramUsage.toFixed(1)}G / 8.0G</span>
            </div>
            <div className="meter-track">
              <div className="meter-fill meter-fill-violet" style={{ width: `${(vramUsage / 8.0) * 100}%` }}></div>
            </div>
          </div>

          <div>
            <div className="meter-header">
              <span className="meter-label" style={{ color: 'var(--accent-green)' }}>Host System RAM</span>
              <span className="meter-val">{ramUsage.toFixed(1)}G / 16.0G</span>
            </div>
            <div className="meter-track">
              <div className="meter-fill meter-fill-green" style={{ width: `${(ramUsage / 16.0) * 100}%` }}></div>
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
