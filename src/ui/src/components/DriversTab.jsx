import { useState, useEffect, useRef } from 'react';

export default function DriversTab() {
  const [gpuDriver, setGpuDriver] = useState(() => localStorage.getItem('ubuntu_driver_gpu') || 'nvidia');
  const [wifiDriver, setWifiDriver] = useState(() => localStorage.getItem('ubuntu_driver_wifi') || 'broadcom');
  const [cpuDriver, setCpuDriver] = useState(() => localStorage.getItem('ubuntu_driver_cpu') || 'microcode');
  const [audioDriver, setAudioDriver] = useState(() => localStorage.getItem('ubuntu_driver_audio') || 'pipewire');

  const [tempGpu, setTempGpu] = useState(gpuDriver);
  const [tempWifi, setTempWifi] = useState(wifiDriver);
  const [tempCpu, setTempCpu] = useState(cpuDriver);
  const [tempAudio, setTempAudio] = useState(audioDriver);

  const [isApplying, setIsApplying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const applyTimeoutsRef = useRef([]);

  useEffect(() => {
    return () => {
      applyTimeoutsRef.current.forEach(id => clearTimeout(id));
      applyTimeoutsRef.current = [];
    };
  }, []);

  // Synthesize Web Audio click/success sounds
  const playSound = (type) => {
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
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'sweep') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.06); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.12); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.18); // C6
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      }
      setTimeout(() => ctx.close(), 500);
    } catch (e) {
      console.warn("Sound blocked by browser:", e);
    }
  };

  const applyDriverChanges = () => {
    if (isApplying) return;
    applyTimeoutsRef.current.forEach(id => clearTimeout(id));
    applyTimeoutsRef.current = [];
    playSound('sweep');
    setIsApplying(true);
    setProgress(5);
    setLogs(['[DRIVERMGR] Initiating module rebuild pipeline...', '[DRIVERMGR] Probing hardware configurations...']);

    const steps = [
      { text: '[APT] Checking local repositories for package updates... OK', progress: 20 },
      { text: '[DKMS] Compiling NVIDIA proprietary module v550.120... OK', progress: 40 },
      { text: '[DKMS] Compiling Broadcom STA wireless source... OK', progress: 60 },
      { text: '[SYSTEMD] Rebuilding initramfs-tools image... OK', progress: 80 },
      { text: '[SYSTEMD] Reloading kernel modules. Dynamic hardware links complete.', progress: 100 }
    ];

    steps.forEach((step, idx) => {
      const tid = setTimeout(() => {
        setLogs(prev => [...prev, step.text]);
        setProgress(step.progress);
        playSound('click');

        if (idx === steps.length - 1) {
          const tid2 = setTimeout(() => {
            // Commit changes to actual state & local storage
            setGpuDriver(tempGpu);
            setWifiDriver(tempWifi);
            setCpuDriver(tempCpu);
            setAudioDriver(tempAudio);

            localStorage.setItem('ubuntu_driver_gpu', tempGpu);
            localStorage.setItem('ubuntu_driver_wifi', tempWifi);
            localStorage.setItem('ubuntu_driver_cpu', tempCpu);
            localStorage.setItem('ubuntu_driver_audio', tempAudio);

            // Dispatch global event for live tab updates
            window.dispatchEvent(new Event('ubuntu-drivers-updated'));

            setIsApplying(false);
            setProgress(0);
            playSound('success');
          }, 400);
          applyTimeoutsRef.current.push(tid2);
        }
      }, (idx + 1) * 900);
      applyTimeoutsRef.current.push(tid);
    });
  };

  const hasChanges = tempGpu !== gpuDriver || tempWifi !== wifiDriver || tempCpu !== cpuDriver || tempAudio !== audioDriver;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', height: '100%', fontFamily: 'var(--font-sans)', color: '#FFF', overflow: 'hidden' }}>
      
      {/* Device List Pane */}
      <div className="panel panel-body-padded" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(26,26,26,0.95)', overflowY: 'auto' }}>
        
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ubuntu-orange)' }}>Ubuntu Additional Drivers</span>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.65rem', color: '#AAA', lineHeight: '1.3' }}>
            Choose alternative driver modules for proprietary hardware cards and processor microcode optimizations.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1 }}>
          
          {/* GPU Drivers Card */}
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
              <span>🎮</span> NVIDIA Corporation: AD102 [GeForce RTX 4090 / Vulkan Acceleration]
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.65rem', paddingLeft: '22px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="gpu" 
                  value="nvidia" 
                  checked={tempGpu === 'nvidia'} 
                  onChange={() => { playSound('click'); setTempGpu('nvidia'); }}
                  disabled={isApplying}
                  style={{ accentColor: 'var(--ubuntu-orange)' }}
                />
                <span>Using NVIDIA proprietary driver - version 550.120 (proprietary, tested)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="gpu" 
                  value="nouveau" 
                  checked={tempGpu === 'nouveau'} 
                  onChange={() => { playSound('click'); setTempGpu('nouveau'); }}
                  disabled={isApplying}
                  style={{ accentColor: 'var(--ubuntu-orange)' }}
                />
                <span>Using X.Org X Server -- Nouveau display driver (open-source, fallback)</span>
              </label>
            </div>
          </div>

          {/* Wi-Fi Adapter Card */}
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
              <span>📶</span> Broadcom Inc. BCM4360 802.11ac Wireless Adapter
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.65rem', paddingLeft: '22px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="wifi" 
                  value="broadcom" 
                  checked={tempWifi === 'broadcom'} 
                  onChange={() => { playSound('click'); setTempWifi('broadcom'); }}
                  disabled={isApplying}
                  style={{ accentColor: 'var(--ubuntu-orange)' }}
                />
                <span>Using Broadcom 802.11 Linux STA driver from bcmwl-kernel-source (proprietary)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="wifi" 
                  value="none" 
                  checked={tempWifi === 'none'} 
                  onChange={() => { playSound('click'); setTempWifi('none'); }}
                  disabled={isApplying}
                  style={{ accentColor: 'var(--ubuntu-orange)' }}
                />
                <span>Do not use the device (removes wireless network capabilities)</span>
              </label>
            </div>
          </div>

          {/* Processor Microcode Card */}
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
              <span>🔌</span> Intel Corporation Raptor Lake-S CPU Microcode
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.65rem', paddingLeft: '22px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="cpu" 
                  value="microcode" 
                  checked={tempCpu === 'microcode'} 
                  onChange={() => { playSound('click'); setTempCpu('microcode'); }}
                  disabled={isApplying}
                  style={{ accentColor: 'var(--ubuntu-orange)' }}
                />
                <span>Using CPU microcode firmware for Intel processors from intel-microcode (proprietary)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="cpu" 
                  value="none" 
                  checked={tempCpu === 'none'} 
                  onChange={() => { playSound('click'); setTempCpu('none'); }}
                  disabled={isApplying}
                  style={{ accentColor: 'var(--ubuntu-orange)' }}
                />
                <span>Do not update processor microcode (runs hardware default microcode)</span>
              </label>
            </div>
          </div>

          {/* Audio Server Card */}
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
              <span>🔊</span> Realtek ALC1220 HD Audio Controller Pipeline
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.65rem', paddingLeft: '22px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="audio" 
                  value="pipewire" 
                  checked={tempAudio === 'pipewire'} 
                  onChange={() => { playSound('click'); setTempAudio('pipewire'); }}
                  disabled={isApplying}
                  style={{ accentColor: 'var(--ubuntu-orange)' }}
                />
                <span>Using PipeWire Advanced Audio Server (recommended, low latency ALSA/Pulse emulation)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="audio" 
                  value="alsa" 
                  checked={tempAudio === 'alsa'} 
                  onChange={() => { playSound('click'); setTempAudio('alsa'); }}
                  disabled={isApplying}
                  style={{ accentColor: 'var(--ubuntu-orange)' }}
                />
                <span>Using ALSA legacy hardware kernel driver (higher latency, raw ALSA outputs)</span>
              </label>
            </div>
          </div>

        </div>

        {/* Action button */}
        <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
          <button 
            onClick={() => {
              setTempGpu(gpuDriver);
              setTempWifi(wifiDriver);
              setTempCpu(cpuDriver);
              setTempAudio(audioDriver);
              playSound('click');
            }} 
            disabled={!hasChanges || isApplying}
            className="btn-reset" 
            style={{ padding: '8px 16px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}
          >
            Revert Changes
          </button>
          <button 
            onClick={applyDriverChanges} 
            disabled={!hasChanges || isApplying}
            className="btn-cyan" 
            style={{ flex: 1, padding: '8px 0', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}
          >
            Apply Changes
          </button>
        </div>

      </div>

      {/* Build and Install Logs Console */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="panel-header" style={{ padding: '10px 14px' }}>
          <span className="ubuntu-window-title">Kernel Driver DKMS Logs</span>
        </div>

        {isApplying ? (
          <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--accent-cyan)' }}>Applying Driver Modules...</span>
              <span>{progress}%</span>
            </div>
            <div className="progress-track" style={{ height: '5px', borderRadius: '3px' }}>
              <div className="progress-fill" style={{ width: `${progress}%`, background: 'var(--accent-cyan)', boxShadow: '0 0 6px var(--accent-cyan)' }} />
            </div>
          </div>
        ) : (
          <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.7rem', color: '#888', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: 'var(--font-mono)' }}>
            Drivers status: <b style={{ color: 'var(--accent-green)' }}>ACTIVE</b> | Rebuild queue: <b style={{ color: '#FFF' }}>IDLE</b>
          </div>
        )}

        <div className="build-logs-viewport scanlines" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
          {logs.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
              No active DKMS installations. Select a driver option and click "Apply Changes" to rebuild kernel headers.
            </div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: log.includes('OK') || log.includes('complete') ? 'var(--accent-green)' : '#DDD', lineHeight: '1.4' }}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
