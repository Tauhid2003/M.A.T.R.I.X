import { useState, useEffect, useRef } from 'react';

export default function BuildFactoryTab() {
  const [config, setConfig] = useState({
    target_arch: 'x86_64',
    base_distro: 'Ubuntu Server 24.04 LTS',
    kernel_version: '6.8.0-14-hardened',
    strip_snap: true,
    strip_gnome: true,
    wine_layer: true,
    ntsync_support: true,
    dxvk_support: true,
    ollama_baked: true,
    default_model: 'Qwen-2.5-3B-Instruct',
    gpu_optimization: 'nvidia-proprietary-open'
  });

  const [buildLogs, setBuildLogs] = useState([]);
  const [buildState, setBuildState] = useState('idle'); // idle, architect, developer, customizer, verification, success, failed
  const [buildProgress, setBuildProgress] = useState(0);
  const [corruptSource, setCorruptSource] = useState(false);
  const [failureCount, setFailureCount] = useState(0);
  const [activeAgent, setActiveAgent] = useState(''); // architect, developer, customizer, verification

  const logEndRef = useRef(null);
  const intervalsRef = useRef([]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [buildLogs]);

  useEffect(() => {
    return () => {
      intervalsRef.current.forEach(id => clearInterval(id));
      intervalsRef.current = [];
    };
  }, []);

  const addLog = (agent, message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = agent ? `[${agent.toUpperCase()}] ` : '';
    setBuildLogs((prev) => [...prev, { timestamp, text: `${prefix}${message}`, type }]);
  };

  const handleConfigChange = (key, value) => {
    if (buildState !== 'idle') return;
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const startBuild = () => {
    if (buildState !== 'idle' && buildState !== 'success' && buildState !== 'failed') return;
    intervalsRef.current.forEach(id => clearInterval(id));
    intervalsRef.current = [];
    
    setBuildLogs([]);
    setBuildProgress(0);
    setBuildState('architect');
    setActiveAgent('architect');
    
    addLog('', 'Initializing Multi-Agent Cloud Build Factory...', 'system');
    addLog('architect', `Reading target specifications from sys_spec.json...`, 'info');
    
    let currentProgress = 0;
    const interval = setInterval(() => {
      // interval tracked in intervalsRef
      currentProgress += 2;
      setBuildProgress(currentProgress);
      
      if (currentProgress === 10) {
        addLog('architect', `Mapping dependency matrices for base target: ${config.base_distro}`, 'info');
        addLog('architect', `Target architecture confirmed: ${config.target_arch}. Compiler flags set to -march=x86-64-v3 -O3`, 'info');
      }
      
      if (currentProgress === 20) {
        clearInterval(interval);
        intervalsRef.current = intervalsRef.current.filter(id => id !== interval);
        setBuildState('developer');
        setActiveAgent('developer');
        addLog('developer', `Scaffolding kernel config for Ubuntu template: ${config.kernel_version}`, 'info');
        addLog('developer', `Compiling assembly bootloaders (boot/mbr.asm & boot/uefi_entry.S)...`, 'info');
        
        let devProgress = 20;
        const devInterval = setInterval(() => {
          devProgress += 3;
          setBuildProgress(devProgress);
          
          if (devProgress === 29) {
            addLog('developer', `Assembling bootloaders complete. Size: 512 bytes MBR / 24KB EFI payload.`, 'info');
            if (corruptSource) {
              addLog('developer', `FATAL ERROR: Compilation failed at boot/uefi_entry.S:104: 'invalid instruction operand size'`, 'error');
              addLog('developer', `Assembler exited with code 1. Terminating pipeline.`, 'error');
              clearInterval(devInterval);
              handleBuildFailure();
              return;
            }
            addLog('developer', `Compiling custom kernel modules: sys_scheduler.c, access_manager.c`, 'info');
          }
          
          if (devProgress === 41) {
            if (config.wine_layer) {
              addLog('developer', `Injecting KERNEL32 system call translation interceptors into syscall table...`, 'info');
              if (config.ntsync_support) {
                addLog('developer', `Compiling NTSYNC driver interface for hardware-assisted thread synchronization...`, 'info');
              }
            }
          }
          
          if (devProgress >= 50) {
            clearInterval(devInterval);
            intervalsRef.current = intervalsRef.current.filter(id => id !== devInterval);
            setBuildState('customizer');
            setActiveAgent('customizer');
            addLog('customizer', `Initializing chroot environment via debootstrap...`, 'info');
            addLog('customizer', `Downloading core Ubuntu dependencies (kernel-base, libc6, udev)...`, 'info');
            
            let custProgress = 50;
            const custInterval = setInterval(() => {
              custProgress += 3;
              setBuildProgress(custProgress);
              
              if (custProgress === 59) {
                addLog('customizer', `Ubuntu system tree populated successfully.`, 'info');
                if (config.strip_snap) {
                  addLog('customizer', `Stripping Snap packages (snapd, snap-store, telemetric endpoints)...`, 'warning');
                }
                if (config.strip_gnome) {
                  addLog('customizer', `Removing heavy display manager (gnome-shell, gdm3)...`, 'warning');
                }
              }
              
              if (custProgress === 71) {
                addLog('customizer', `System optimized. Injecting Wine compatibility environments and DXVK libs...`, 'info');
                if (config.ollama_baked) {
                  addLog('customizer', `Baking Ollama binary into /usr/bin/ollama...`, 'info');
                  addLog('customizer', `Quantizing offline weights for model ${config.default_model} (GGUF 4-bit)...`, 'info');
                  addLog('customizer', `Writing local system orchestrator daemon to /etc/systemd/system/matrix-daemon.service`, 'info');
                }
              }
              
              if (custProgress >= 80) {
                clearInterval(custInterval);
                intervalsRef.current = intervalsRef.current.filter(id => id !== custInterval);
                setBuildState('verification');
                setActiveAgent('verification');
                addLog('verification', `Compressing filesystem into bootable ISO image: build/matrix-os-alpha.iso`, 'info');
                
                let verProgress = 80;
                const verInterval = setInterval(() => {
                  verProgress += 2;
                  setBuildProgress(verProgress);
                  
                  if (verProgress === 86) {
                    addLog('verification', `ISO created successfully. Size: 924 MB. MD5: 9a38f87b8d0c2e39`, 'info');
                    addLog('verification', `Launching headless QEMU emulation virtualization cluster...`, 'info');
                    addLog('verification', `QEMU parameters: -m 2G -smp 4 -cdrom matrix-os-alpha.iso -serial stdio`, 'info');
                  }
                  
                  if (verProgress === 94) {
                    addLog('qemu', `[QEMU] SeaBIOS (version 1.16.3-debian)`, 'output');
                    addLog('qemu', `[QEMU] Booting from DVD/CD...`, 'output');
                    addLog('qemu', `[QEMU] GRUB loading stage2...`, 'output');
                    addLog('qemu', `[QEMU] Linux version ${config.kernel_version} (x86_64)`, 'output');
                    addLog('qemu', `[QEMU] init: starting M.A.T.R.I.X. system runtime...`, 'output');
                    addLog('qemu', `[QEMU] systemd[1]: Started M.A.T.R.I.X. NLP Orchestrator Daemon.`, 'output');
                    addLog('qemu', `[QEMU] matrix-daemon[312]: Listening on local domain socket /var/run/cx.sock`, 'output');
                  }
                  
                  if (verProgress >= 100) {
                    clearInterval(verInterval);
                    intervalsRef.current = intervalsRef.current.filter(id => id !== verInterval);
                    setBuildState('success');
                    setActiveAgent('');
                    setFailureCount(0);
                    addLog('', 'BUILD COMPLETED SUCCESSFULLY! OS is bootable and fully operational offline.', 'success');
                  }
                }, 400);
                intervalsRef.current.push(verInterval);
              }
            }, 400);
            intervalsRef.current.push(custInterval);
          }
        }, 400);
        intervalsRef.current.push(devInterval);
      }
    }, 400);
    intervalsRef.current.push(interval);
  };

  const handleBuildFailure = () => {
    intervalsRef.current.forEach(id => clearInterval(id));
    intervalsRef.current = [];
    setBuildState('failed');
    setActiveAgent('');
    const nextFailure = failureCount + 1;
    setFailureCount(nextFailure);
    
    addLog('', `BUILD CYCLE ${nextFailure} FAILED.`, 'error');
    
    if (nextFailure >= 3) {
      addLog('', '!!! CIRCUIT BREAKER TRIGGERED !!!', 'error');
      addLog('', '3 consecutive compilation/boot failures detected.', 'error');
      addLog('', 'Forcing hardware break and pausing build engine.', 'error');
      addLog('', 'Taking atomic repository snapshot...', 'system');
      addLog('', 'Rolling back build files to last verified stable hash (git checkout stable-4fc903a)...', 'system');
      addLog('', 'System restored to stable state. Manual operator override required.', 'success');
    }
  };

  const resetCircuitBreaker = () => {
    setFailureCount(0);
    setBuildState('idle');
    setBuildProgress(0);
    setBuildLogs([{ timestamp: new Date().toLocaleTimeString(), text: '🔄 Circuit Breaker reset. Build engine re-initialized.', type: 'success' }]);
  };

  return (
    <div className="dashboard-grid">
      
      {/* Config Editor Column */}
      <div className="panel panel-body-padded">
        <h3 className="card-title">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
          </svg>
          sys_spec.json Config
        </h3>

        <div className="config-group">
          
          <div className="config-control">
            <label className="config-label">Target Architecture</label>
            <select
              value={config.target_arch}
              onChange={(e) => handleConfigChange('target_arch', e.target.value)}
              className="config-select"
              disabled={buildState !== 'idle'}
            >
              <option value="x86_64">x86_64 (AVX2 Optimizations)</option>
              <option value="ARM64">ARM64 (Apple Silicon / Pi 5)</option>
              <option value="RISC-V">RISC-V (Open-Source ISA)</option>
            </select>
          </div>

          <div className="config-control">
            <label className="config-label">Base Linux Template</label>
            <select
              value={config.base_distro}
              onChange={(e) => handleConfigChange('base_distro', e.target.value)}
              className="config-select"
              disabled={buildState !== 'idle'}
            >
              <option value="Ubuntu Server 24.04 LTS">Ubuntu Server 24.04 LTS</option>
              <option value="Debian 12 Bookworm (Minimal)">Debian 12 Bookworm (Minimal)</option>
              <option value="Ubuntu Core 24 (Snaps Disabled)">Ubuntu Core 24 (Snaps Disabled)</option>
            </select>
          </div>

          <div className="config-control">
            <label className="config-label">GPU Optimization Mode</label>
            <select
              value={config.gpu_optimization}
              onChange={(e) => handleConfigChange('gpu_optimization', e.target.value)}
              className="config-select"
              disabled={buildState !== 'idle'}
            >
              <option value="nvidia-proprietary-open">NVIDIA Proprietary Open Kernel</option>
              <option value="amd-gpu-vulkan">AMD GPU Vulkan Native (RADV)</option>
              <option value="llvmpipe-soft">LLVMpipe (CPU Software)</option>
            </select>
          </div>

          {/* Toggles */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="config-toggle-row">
              <div>
                <div className="toggle-label">Strip snapd & GNOME telemetry</div>
                <div className="toggle-desc">Removes bloated background services</div>
              </div>
              <input
                type="checkbox"
                checked={config.strip_snap}
                onChange={(e) => handleConfigChange('strip_snap', e.target.checked)}
                className="checkbox-cyan"
                disabled={buildState !== 'idle'}
              />
            </div>

            <div className="config-toggle-row">
              <div>
                <div className="toggle-label">Wine Compatibility Sandbox</div>
                <div className="toggle-desc">Translates Windows .exe packages</div>
              </div>
              <input
                type="checkbox"
                checked={config.wine_layer}
                onChange={(e) => handleConfigChange('wine_layer', e.target.checked)}
                className="checkbox-cyan"
                disabled={buildState !== 'idle'}
              />
            </div>

            <div className="config-toggle-row">
              <div>
                <div className="toggle-label">Kernel NTSYNC Driver</div>
                <div className="toggle-desc">Native thread lock acceleration</div>
              </div>
              <input
                type="checkbox"
                checked={config.ntsync_support}
                onChange={(e) => handleConfigChange('ntsync_support', e.target.checked)}
                className="checkbox-cyan"
                disabled={buildState !== 'idle'}
              />
            </div>

            <div className="config-toggle-row">
              <div>
                <div className="toggle-label">Bake Ollama AI weights</div>
                <div className="toggle-desc">Saves models directly in system image</div>
              </div>
              <input
                type="checkbox"
                checked={config.ollama_baked}
                onChange={(e) => handleConfigChange('ollama_baked', e.target.checked)}
                className="checkbox-cyan"
                disabled={buildState !== 'idle'}
              />
            </div>
          </div>

          {/* Corruption toggle */}
          <div className="corruption-box">
            <div className="config-toggle-row">
              <div>
                <div className="corruption-title">Corrupt Source Code</div>
                <div className="corruption-desc">Triggers compiler errors to test safety</div>
              </div>
              <input
                type="checkbox"
                checked={corruptSource}
                onChange={(e) => setCorruptSource(e.target.checked)}
                className="checkbox-cyan"
                style={{ accentColor: 'var(--accent-rose)' }}
              />
            </div>
            {failureCount > 0 && (
              <div className="corruption-fails">
                Active build failures: {failureCount} / 3
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Cloud Build Pipeline Visuals */}
      <div className="panel" style={{ height: '600px' }}>
        
        {/* Status Bar */}
        <div className="panel-header">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Active Builder Agents Dashboard
          </span>
          <div className="agent-status-bar">
            <span className={`agent-status-tag ${activeAgent === 'architect' ? 'agent-status-tag-active' : ''}`}>[Architect]</span>
            <span className={`agent-status-tag ${activeAgent === 'developer' ? 'agent-status-tag-active' : ''}`}>[Developer]</span>
            <span className={`agent-status-tag ${activeAgent === 'customizer' ? 'agent-status-tag-active' : ''}`}>[Customizer]</span>
            <span className={`agent-status-tag ${activeAgent === 'verification' ? 'agent-status-tag-active' : ''}`}>[Verification]</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${buildProgress}%` }}></div>
        </div>

        {/* Console logs */}
        <div className="build-logs-viewport scanlines">
          {buildLogs.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-dark)', padding: '100px 0' }}>
              <svg style={{ width: '48px', height: '48px', margin: '0 auto 16px auto', color: 'var(--border-color)', display: 'block' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 113.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"></path>
              </svg>
              Cloud Build Factory is currently idle.<br/>Modify sys_spec.json parameters and initialize the build engine.
            </div>
          ) : (
            buildLogs.map((log, index) => {
              let className = '';
              if (log.type === 'system') className = 'log-line-system';
              if (log.type === 'error') className = 'log-line-error';
              if (log.type === 'warning') className = 'log-line-warning';
              if (log.type === 'success') className = 'log-line-success';
              if (log.type === 'output') className = 'log-line-output';
              
              return (
                <div key={index} className={className}>
                  <span className="log-line-timestamp">[{log.timestamp}]</span>
                  {log.text}
                </div>
              );
            })
          )}
        </div>

        {/* Action Bar */}
        <div className="build-actions-bar">
          <div>
            {failureCount >= 3 ? (
              <span className="build-status-failed" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-dot" style={{ background: 'var(--accent-rose)', animation: 'pulse-glow-dot 1s infinite', width: '8px', height: '8px' }}></span>
                CIRCUIT BREAKER: HARDWARE BREAK TRIGGERED
              </span>
            ) : buildState !== 'idle' && buildState !== 'success' && buildState !== 'failed' ? (
              <span className="build-status-building">
                <span className="spinner" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }}></span>
                Compiling OS image ({buildProgress}%)
              </span>
            ) : buildState === 'success' ? (
              <span className="build-status-success">✓ Stable ISO compiled & validated</span>
            ) : (
              <span className="build-status-idle">Engine is ready for synthesis</span>
            )}
          </div>

          <div>
            {failureCount >= 3 ? (
              <button
                onClick={resetCircuitBreaker}
                className="btn-reset"
              >
                Reset Engine & Rollback
              </button>
            ) : (
              <button
                onClick={startBuild}
                className="btn-build"
                disabled={buildState !== 'idle' && buildState !== 'success' && buildState !== 'failed'}
              >
                {buildState === 'idle' ? 'Initialize OS Build Engine' : 'Re-run Build Engine'}
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
