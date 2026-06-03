import React, { useState, useEffect } from 'react';
import Tabs from './components/Tabs';
import TerminalTab from './components/TerminalTab';
import BuildFactoryTab from './components/BuildFactoryTab';
import SystemDaemonTab from './components/SystemDaemonTab';
import SandboxTab from './components/SandboxTab';
import NautilusTab from './components/NautilusTab';
import MatrixTab from './components/MatrixTab';
import BrowserTab from './components/BrowserTab';
import GameTab from './components/GameTab';
import DriversTab from './components/DriversTab';
import matrixOceanBlueWallpaper from './assets/matrix_ocean_blue_wallpaper.png';

// Dynamic Vector SVG Icons for Status Bar
function WifiIcon({ online, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', width: size, height: size }}>
      {online ? (
        <>
          <path d="M12 20h.01" strokeWidth="3" />
          <path d="M8.5 16.5a5 5 0 0 1 7 0" />
          <path d="M5 13a10 10 0 0 1 14 0" />
          <path d="M1.5 9.5a15 15 0 0 1 21 0" />
        </>
      ) : (
        <>
          <line x1="1" y1="1" x2="23" y2="23" stroke="var(--accent-rose)" />
          <path d="M12 20h.01" strokeWidth="3" opacity="0.5" />
          <path d="M8.5 16.5a5 5 0 0 1 7 0" opacity="0.3" />
          <path d="M5 13a10 10 0 0 1 1.5 -1" opacity="0.3" />
          <path d="M17.5 12a10 10 0 0 1 1.5 1" opacity="0.3" />
        </>
      )}
    </svg>
  );
}

function VolumeIcon({ value, size = 14 }) {
  let waves = null;
  if (value > 0) {
    if (value < 40) {
      waves = <path d="M18 8a6 6 0 0 1 0 8" />;
    } else if (value < 75) {
      waves = (
        <>
          <path d="M18 8a6 6 0 0 1 0 8" />
          <path d="M21 5a10 10 0 0 1 0 14" />
        </>
      );
    } else {
      waves = (
        <>
          <path d="M18 8a6 6 0 0 1 0 8" />
          <path d="M21 5a10 10 0 0 1 0 14" />
          <path d="M23 2a14 14 0 0 1 0 20" />
        </>
      );
    }
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', width: size, height: size }}>
      {value === 0 ? (
        <>
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <line x1="23" y1="9" x2="17" y2="15" stroke="var(--accent-rose)" />
          <line x1="17" y1="9" x2="23" y2="15" stroke="var(--accent-rose)" />
        </>
      ) : (
        <>
          <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" fillOpacity="0.2" />
          {waves}
        </>
      )}
    </svg>
  );
}

function BatteryIcon({ level, charging, size = 14 }) {
  const fillWidth = Math.max(2, Math.min(14, Math.round((level / 100) * 14)));
  return (
    <svg width={size + 6} height={size} viewBox="0 0 28 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', width: size + 6, height: size }}>
      <rect x="2" y="2" width="20" height="12" rx="2" />
      <path d="M24 6v4" strokeWidth="2" />
      <rect x="4" y="4" width={fillWidth} height="8" fill={level < 20 ? "var(--accent-rose)" : "var(--accent-cyan)"} stroke="none" />
      {charging && (
        <path d="M11 4l-3 4h4l-2 4" fill="none" stroke="var(--ubuntu-orange)" strokeWidth="1.5" />
      )}
    </svg>
  );
}

function PowerIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', width: size, height: size }}>
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('terminal');
  const [windowOpen, setWindowOpen] = useState(true);
  const [openedFile, setOpenedFile] = useState(null);
  const [timeStr, setTimeStr] = useState('Mon May 25 00:50');
  const [terminalCommand, setTerminalCommand] = useState(null);

  // Dynamic system bar states
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [volume, setVolume] = useState(80);
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [nightLight, setNightLight] = useState(false);
  const [powerSaver, setPowerSaver] = useState(false);
  const [bluetooth, setBluetooth] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [lockPassword, setLockPassword] = useState('');
  const [powerModal, setPowerModal] = useState(null);
  const [wallpaper, setWallpaper] = useState('dark');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // First-boot wizard and permission states
  const [setupCompleted, setSetupCompleted] = useState(true);
  const [hardwareProfile, setHardwareProfile] = useState(null);
  const [wizardName, setWizardName] = useState('Shaik Tauhidur Rahman');
  const [wizardVoice, setWizardVoice] = useState('Piper Neural Voice (medium)');
  const [wizardPrivacy, setWizardPrivacy] = useState('local-first');
  const [apiOnline, setApiOnline] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Check setup status and api connectivity at boot
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const data = await res.json();
          setApiOnline(true);
          if (data.firstboot_setup_completed === 'true') {
            setSetupCompleted(true);
          } else {
            setSetupCompleted(false);
          }
        }
      } catch (e) {
        console.warn('MATRIX API Daemon is offline. Falling back to simulated mode.', e);
        setApiOnline(false);
        setSetupCompleted(true);
      }
    };
    checkStatus();
  }, []);

  // Retrieve hardware profile if setup is not finished
  useEffect(() => {
    if (!setupCompleted && apiOnline) {
      const getHardware = async () => {
        try {
          const res = await fetch('/api/hardware');
          if (res.ok) {
            const data = await res.json();
            setHardwareProfile(data);
          }
        } catch (e) {
          console.error(e);
        }
      };
      getHardware();
    }
  }, [setupCompleted, apiOnline]);

  // Poll for commands awaiting operator permission (CORE-004 Permission System)
  useEffect(() => {
    if (!setupCompleted || !apiOnline) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/pending');
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setPendingAction(data[0]); // Render first alert in queue
          } else {
            setPendingAction(null);
          }
        }
      } catch (e) {
        // Ignore daemon server disconnects during reboots
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [setupCompleted, apiOnline]);

  // Handle HTML5 Browser Fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error entering full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Update top bar clock with real-time format
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
      setTimeStr(date.toLocaleString('en-US', options).replace(',', ''));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Sync battery and network events
  useEffect(() => {
    if (navigator.getBattery) {
      navigator.getBattery().then((battery) => {
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);
        
        battery.onlevelchange = () => {
          setBatteryLevel(Math.round(battery.level * 100));
        };
        battery.onchargingchange = () => {
          setIsCharging(battery.charging);
        };
      });
    } else {
      // Fallback battery details for simulated charging
      setBatteryLevel(87);
      setIsCharging(false);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Simulated battery depletion/charging loop for offline / mocked AC toggle
  useEffect(() => {
    if (navigator.getBattery) return;
    const interval = setInterval(() => {
      setBatteryLevel(prev => {
        if (isCharging) {
          return Math.min(100, prev + 1);
        } else {
          return Math.max(5, prev - 1);
        }
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [isCharging]);

  // Close Quick Settings on click outside
  useEffect(() => {
    if (!quickSettingsOpen) return;
    const handleClose = () => setQuickSettingsOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [quickSettingsOpen]);

  // Listen to Matrix redirection events from other tabs
  useEffect(() => {
    const handleMatrixNavigate = (e) => {
      const { tab, exec } = e.detail;
      setActiveTab(tab);
      setWindowOpen(true);
      if (exec) {
        setTerminalCommand(exec);
      }
    };
    window.addEventListener('matrix-navigate', handleMatrixNavigate);
    return () => window.removeEventListener('matrix-navigate', handleMatrixNavigate);
  }, []);

  const openApp = (appId) => {
    setActiveTab(appId);
    setWindowOpen(true);
  };

  const handleOpenFile = (file) => {
    setOpenedFile(file);
  };

  const handleExecuteCommand = (cmd) => {
    setTerminalCommand(cmd);
  };

  const handleClearTerminalCommand = () => {
    setTerminalCommand(null);
  };

  const handleRunScript = (cmd) => {
    setOpenedFile(null);
    openApp('terminal');
    handleExecuteCommand(cmd);
  };

  const renderFileSpecificReader = () => {
    if (!openedFile) return null;
    const mime = openedFile.mime;
    if (mime === 'audio') {
      return <AudioPlayer file={openedFile} systemVolume={volume} />;
    }
    if (mime === 'image') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ alignSelf: 'flex-start', fontSize: '0.7rem', color: '#888', fontFamily: 'var(--font-mono)' }}>🖼️ Image Viewer</div>
          <img 
            src={openedFile.content} 
            alt={openedFile.name} 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '380px', 
              borderRadius: '6px', 
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              background: '#050505',
              padding: '6px'
            }} 
          />
        </div>
      );
    }
    if (mime === 'svg') {
      return <SVGGraphicViewer file={openedFile} />;
    }
    if (mime === 'pdf') {
      return <PDFDocumentViewer file={openedFile} />;
    }
    if (mime === 'json') {
      return <JSONSpecViewer file={openedFile} />;
    }
    if (mime === 'script' || mime === 'python') {
      return <CodeScriptViewer file={openedFile} onRun={handleRunScript} />;
    }
    return (
      <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: ['pdf', 'word', 'text'].includes(openedFile.mime) ? '#333' : '#abb2bf' }}>
        {openedFile.content || '(Empty file)'}
      </div>
    );
  };

  const renderActiveApp = () => {
    switch (activeTab) {
      case 'terminal':
        return <TerminalTab initialCommand={terminalCommand} onClearInitialCommand={handleClearTerminalCommand} />;
      case 'build':
        return <BuildFactoryTab />;
      case 'daemon':
        return <SystemDaemonTab />;
      case 'sandbox':
        return <SandboxTab />;
      case 'files':
        return <NautilusTab onOpenFile={handleOpenFile} />;
      case 'matrix':
        return <MatrixTab onNavigateApp={openApp} onExecuteCommand={handleExecuteCommand} />;
      case 'browser':
        return <BrowserTab isOnline={isOnline} />;
      case 'game':
        return <GameTab />;
      case 'drivers':
        return <DriversTab />;
      default:
        return <TerminalTab initialCommand={terminalCommand} onClearInitialCommand={handleClearTerminalCommand} />;
    }
  };

  const getAppTitle = () => {
    switch (activeTab) {
      case 'terminal':
        return 'matrix@matrix-os: ~ (cx-terminal)';
      case 'build':
        return 'MATRIX Cloud Build Factory (Live ISO Compiler)';
      case 'daemon':
        return 'System Monitor (Ollama & Wine Telemetry)';
      case 'sandbox':
        return 'Security & Privacy (Bubblewrap Resource Isolation)';
      case 'files':
        return 'Files (Nautilus)';
      case 'matrix':
        return 'Matrix AI Ingress Interface (System Orchestrator Core)';
      case 'browser':
        return 'Firefox Browser (M.A.T.R.I.X. Sandbox Edition)';
      case 'game':
        return 'Matrix Core Hack - Retro Firewall Bypass Arcade';
      case 'drivers':
        return 'Additional Drivers (Ubuntu hardware configuration manager)';
      default:
        return 'M.A.T.R.I.X. Console';
    }
  };

  if (!setupCompleted) {
    return (
      <div 
        className="ubuntu-desktop-wrapper"
        style={{
          backgroundImage: `url(${matrixOceanBlueWallpaper})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#FFF'
        }}
      >
        <div style={{
          background: 'rgba(15, 10, 20, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 255, 255, 0.25)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
          width: '580px',
          padding: '30px',
          boxSizing: 'border-box',
          fontFamily: 'var(--font-sans)'
        }}>
          <h2 style={{ color: 'var(--ubuntu-orange)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginTop: 0 }}>
            ⚡ M.A.T.R.I.X. AI-OS Setup Wizard
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#CCC', lineHeight: '1.4' }}>
            Welcome to the Metaverse Artificial Technological Regenerating Intelligence Experiment OS. The system has automatically scanned your computer configurations to prepare local AI seeding.
          </p>

          <div style={{ margin: '20px 0', background: 'rgba(255,255,255,0.04)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', marginTop: 0, marginBottom: '10px' }}>🖥️ Auto-Detected Hardware Profile</h3>
            {hardwareProfile ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                <div>System Platform: <span style={{ color: '#FFF' }}>{hardwareProfile.hardware.platform}</span></div>
                <div>CPU Cores: <span style={{ color: '#FFF' }}>{hardwareProfile.hardware.cpu_cores} cores</span></div>
                <div>Total RAM: <span style={{ color: '#FFF' }}>{hardwareProfile.hardware.system_ram_gb} GB</span></div>
                <div>VRAM Memory: <span style={{ color: '#FFF' }}>{hardwareProfile.hardware.gpu_vram_gb} GB</span></div>
                <div style={{ gridColumn: 'span 2', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
                  🏆 Classified Tier: <span style={{ color: 'var(--ubuntu-orange)', fontWeight: 'bold' }}>{hardwareProfile.classification.tier.toUpperCase()}</span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  📦 Recommended Local LLM: <span style={{ color: 'var(--accent-green)' }}>{hardwareProfile.seeder.recommended_llm}</span>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: '#888' }}>Auditing hardware interfaces...</div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '20px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.78rem', color: '#AAA', fontWeight: 'bold' }}>Operator Profile Name</label>
              <input 
                type="text" 
                value={wizardName} 
                onChange={(e) => setWizardName(e.target.value)}
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '8px', color: '#FFF', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.78rem', color: '#AAA', fontWeight: 'bold' }}>Local TTS Voice Profile</label>
              <select 
                value={wizardVoice} 
                onChange={(e) => setWizardVoice(e.target.value)}
                style={{ background: '#1c1b22', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '8px', color: '#FFF', fontSize: '0.85rem' }}
              >
                <option value="Piper Neural Voice (medium)">Piper Voice (en_US-lessac-medium) - Fast CPU</option>
                <option value="Kokoro TTS (high)">Kokoro Neural Voice (en_US) - High Quality</option>
                <option value="eSpeak Legacy">eSpeak Synthesizer (Robotic System Voice)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.78rem', color: '#AAA', fontWeight: 'bold' }}>Privacy & Telemetry Mode</label>
              <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="privacy" 
                    value="local-first"
                    checked={wizardPrivacy === 'local-first'}
                    onChange={() => setWizardPrivacy('local-first')}
                    style={{ accentColor: 'var(--ubuntu-orange)' }}
                  />
                  🔒 Local-First (Strict Privacy, No Telemetry)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="privacy" 
                    value="anonymous"
                    checked={wizardPrivacy === 'anonymous'}
                    onChange={() => setWizardPrivacy('anonymous')}
                    style={{ accentColor: 'var(--ubuntu-orange)' }}
                  />
                  📈 Anonymous Performance Analytics
                </label>
              </div>
            </div>
          </div>

          <button 
            onClick={async () => {
              try {
                await fetch('/api/config', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    firstboot_setup_completed: 'true',
                    user_name: wizardName,
                    user_voice: wizardVoice,
                    privacy_mode: wizardPrivacy,
                    default_model: hardwareProfile ? hardwareProfile.seeder.recommended_llm : 'qwen2.5:3b-instruct',
                    ollama_threads: hardwareProfile ? hardwareProfile.seeder.ollama_threads : '4',
                    system_tier: hardwareProfile ? hardwareProfile.classification.tier : 'Mid-Range'
                  })
                });
                setSetupCompleted(true);
              } catch (e) {
                console.error(e);
                setSetupCompleted(true);
              }
            }}
            className="btn-cyan"
            style={{ width: '100%', padding: '10px', fontSize: '0.85rem', fontWeight: 'bold', borderRadius: '6px', marginTop: '10px' }}
          >
            🚀 Finalize Configuration & Initialize AI-OS
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="ubuntu-desktop-wrapper"
      style={{
        backgroundImage: wallpaper === 'dark' ? `url(${matrixOceanBlueWallpaper})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Screen Brightness Dimming Overlay */}
      {brightness < 100 && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'black',
          opacity: 0.85 * (1 - brightness / 100),
          pointerEvents: 'none',
          zIndex: 9998
        }} />
      )}

      {/* Night Light warm overlay */}
      {nightLight && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255, 140, 0, 0.07)',
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
          zIndex: 9997
        }} />
      )}

      {/* 1. Ubuntu Top Bar */}
      <div className="ubuntu-top-bar">
        <div className="top-bar-left">
          <span style={{ fontWeight: '700', color: 'var(--ubuntu-orange)' }}>MATRIX OS</span>
          <button className="top-bar-item-btn" onClick={() => openApp('files')}>Activities</button>
          {windowOpen && (
            <span style={{ color: '#888', fontSize: '0.7rem' }}>| &nbsp; {getAppTitle()}</span>
          )}
        </div>
        <div className="top-bar-center">
          {timeStr}
        </div>
        <div className="top-bar-right" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          
          {/* Unified GNOME-style top status pills */}
          <div 
            onClick={(e) => { e.stopPropagation(); setQuickSettingsOpen(!quickSettingsOpen); }}
            className="top-bar-status-group"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              cursor: 'pointer',
              padding: '2px 8px',
              borderRadius: '14px',
              transition: 'background 0.2s',
              background: quickSettingsOpen ? 'rgba(255,255,255,0.15)' : 'transparent',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => { if (!quickSettingsOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={(e) => { if (!quickSettingsOpen) e.currentTarget.style.background = 'transparent'; }}
          >
            <WifiIcon online={isOnline} />
            <VolumeIcon value={volume} />
            <BatteryIcon level={batteryLevel} charging={isCharging} />
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{batteryLevel}%</span>
            <PowerIcon />
          </div>

          {/* Unified Quick Settings Panel Dropdown */}
          {quickSettingsOpen && (
            <div 
              style={{
                position: 'absolute',
                top: '32px',
                right: '0',
                background: 'rgba(25, 25, 30, 0.96)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
                padding: '16px',
                width: '310px',
                zIndex: 10000,
                color: '#FFF',
                fontFamily: 'var(--font-sans)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                userSelect: 'none',
                boxSizing: 'border-box'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: Battery Telemetry & System Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BatteryIcon level={batteryLevel} charging={isCharging} size={16} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{batteryLevel}% charged</span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)' }}>
                      {isCharging ? '🔌 Plugged In (Charging)' : '🔋 Discharging (On Battery)'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    onClick={() => { setQuickSettingsOpen(false); openApp('drivers'); }}
                    style={{ background: 'rgba(255,255,255,0.06)', border: 0, borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FFF' }}
                    title="System Settings"
                  >
                    ⚙️
                  </button>
                  <button 
                    onClick={() => { setQuickSettingsOpen(false); setIsLocked(true); }}
                    style={{ background: 'rgba(255,255,255,0.06)', border: 0, borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FFF' }}
                    title="Lock Screen"
                  >
                    🔒
                  </button>
                  <button 
                    onClick={toggleFullscreen}
                    style={{ background: isFullscreen ? 'rgba(0,255,255,0.15)' : 'rgba(255,255,255,0.06)', border: isFullscreen ? '1px solid var(--accent-cyan)' : '0', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: isFullscreen ? 'var(--accent-cyan)' : '#FFF' }}
                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                  >
                    🖥️
                  </button>
                  <button 
                    onClick={() => {
                      setQuickSettingsOpen(false);
                      setPowerModal('restart');
                      setTimeout(() => {
                        window.location.reload();
                      }, 3500);
                    }}
                    style={{ background: 'rgba(233,84,32,0.15)', border: 0, borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--ubuntu-orange)' }}
                    title="Restart System"
                  >
                    🔄
                  </button>
                  <button 
                    onClick={() => { setQuickSettingsOpen(false); setPowerModal('shutdown'); }}
                    style={{ background: 'rgba(244,63,94,0.15)', border: 0, borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--accent-rose)' }}
                    title="Power Off"
                  >
                    <PowerIcon size={12} />
                  </button>
                </div>
              </div>

              {/* Toggles Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button 
                  onClick={() => setIsOnline(!isOnline)}
                  style={{
                    background: isOnline ? 'var(--ubuntu-orange)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    padding: '10px',
                    color: '#FFF',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <WifiIcon online={isOnline} size={14} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 'bold' }}>Wi-Fi</span>
                  </div>
                  <span style={{ fontSize: '0.6rem', color: isOnline ? 'rgba(255,255,255,0.8)' : 'var(--color-text-muted)' }}>
                    {isOnline ? 'MATRIX-MESH' : 'Disconnected'}
                  </span>
                </button>

                <button 
                  onClick={() => setBluetooth(!bluetooth)}
                  style={{
                    background: bluetooth ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    padding: '10px',
                    color: bluetooth ? '#000' : '#FFF',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{bluetooth ? '⚡' : '💤'}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 'bold' }}>Bluetooth</span>
                  </div>
                  <span style={{ fontSize: '0.6rem', color: bluetooth ? 'rgba(0,0,0,0.8)' : 'var(--color-text-muted)' }}>
                    {bluetooth ? 'Active' : 'Disabled'}
                  </span>
                </button>

                <button 
                  onClick={() => setNightLight(!nightLight)}
                  style={{
                    background: nightLight ? '#F59E0B' : 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    padding: '10px',
                    color: nightLight ? '#000' : '#FFF',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🌙</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 'bold' }}>Night Light</span>
                  </div>
                  <span style={{ fontSize: '0.6rem', color: nightLight ? 'rgba(0,0,0,0.8)' : 'var(--color-text-muted)' }}>
                    {nightLight ? 'Warm amber' : 'Off'}
                  </span>
                </button>

                <button 
                  onClick={() => setPowerSaver(!powerSaver)}
                  style={{
                    background: powerSaver ? 'var(--accent-green)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    padding: '10px',
                    color: powerSaver ? '#000' : '#FFF',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔋</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 'bold' }}>Power Saver</span>
                  </div>
                  <span style={{ fontSize: '0.6rem', color: powerSaver ? 'rgba(0,0,0,0.8)' : 'var(--color-text-muted)' }}>
                    {powerSaver ? 'Eco Mode' : 'High Perf'}
                  </span>
                </button>

                <button 
                  onClick={() => setIsCharging(!isCharging)}
                  style={{
                    background: isCharging ? 'rgba(0,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                    border: isCharging ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    padding: '10px',
                    color: '#FFF',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    gridColumn: 'span 2'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔌</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 'bold' }}>AC Power Source (Charger)</span>
                  </div>
                  <span style={{ fontSize: '0.6rem', color: isCharging ? 'var(--accent-cyan)' : 'var(--color-text-muted)' }}>
                    {isCharging ? 'Plugged In (Simulating Charging)' : 'Unplugged (Simulating Discharging)'}
                  </span>
                </button>
              </div>

              {/* Sliders Area */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                    <span>Audio Output Volume</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#FFF' }}>{volume}%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      onClick={() => setVolume(volume === 0 ? 80 : 0)} 
                      style={{ background: 'transparent', border: 0, color: '#FFF', cursor: 'pointer', padding: 0, fontSize: '0.85rem' }}
                    >
                      <VolumeIcon value={volume} size={14} />
                    </button>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={volume} 
                      onChange={(e) => setVolume(parseInt(e.target.value))} 
                      style={{ flex: 1, accentColor: 'var(--ubuntu-orange)', height: '4px', cursor: 'pointer' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                    <span>Screen Luminance</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#FFF' }}>{brightness}%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem' }}>🔆</span>
                    <input 
                      type="range" 
                      min="15" max="100" 
                      value={brightness} 
                      onChange={(e) => setBrightness(parseInt(e.target.value))} 
                      style={{ flex: 1, accentColor: 'var(--ubuntu-orange)', height: '4px', cursor: 'pointer' }}
                    />
                  </div>
                </div>

                {/* Wallpaper Selection Control */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--color-text-muted)', alignItems: 'center' }}>
                    <span>System Wallpaper</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#FFF', fontWeight: 'bold' }}>{wallpaper === 'dark' ? 'MATRIX Dark' : 'Default Glow'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                    <button 
                      onClick={() => setWallpaper('default')}
                      style={{
                        flex: 1,
                        background: wallpaper === 'default' ? 'var(--ubuntu-orange)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '6px',
                        padding: '6px',
                        color: '#FFF',
                        fontSize: '0.68rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      🌌 Default
                    </button>
                    <button 
                      onClick={() => setWallpaper('dark')}
                      style={{
                        flex: 1,
                        background: wallpaper === 'dark' ? 'var(--ubuntu-orange)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '6px',
                        padding: '6px',
                        color: '#FFF',
                        fontSize: '0.68rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: wallpaper === 'dark' ? '0 0 8px var(--ubuntu-orange)' : 'none'
                      }}
                    >
                      🕶️ Cyber Grid
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub-footer telemetry info */}
              <div style={{ fontSize: '0.6rem', color: '#666', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>HOST IP: 192.168.42.105</span>
                <span>MESH LINK: SECURE</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Ubuntu Left Dock Launcher */}
      <div className="ubuntu-dock">
        {/* Terminal Icon */}
        <button 
          onClick={(e) => { e.currentTarget.blur(); openApp('terminal'); }}
          className={`dock-item ${windowOpen && activeTab === 'terminal' ? 'active' : ''}`}
          title="Terminal (cx-terminal)"
        >
          <span style={{ fontSize: '1.4rem' }}>🐚</span>
        </button>

        {/* Matrix AI Icon */}
        <button 
          onClick={(e) => { e.currentTarget.blur(); openApp('matrix'); }}
          className={`dock-item ${windowOpen && activeTab === 'matrix' ? 'active' : ''}`}
          title="Matrix System Ingress"
          style={{ position: 'relative' }}
        >
          <span style={{ fontSize: '1.4rem', animation: activeTab === 'matrix' ? 'pulse-glow-dot 2s infinite' : 'none' }}>⚡</span>
          {activeTab === 'matrix' && (
            <span style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '10px',
              border: '2px solid var(--accent-cyan)',
              boxShadow: '0 0 8px var(--accent-cyan)',
              pointerEvents: 'none'
            }}></span>
          )}
        </button>

        {/* Files explorer Icon */}
        <button 
          onClick={(e) => { e.currentTarget.blur(); openApp('files'); }}
          className={`dock-item ${windowOpen && activeTab === 'files' ? 'active' : ''}`}
          title="Files (Nautilus Explorer)"
        >
          <span style={{ fontSize: '1.4rem' }}>📁</span>
        </button>

        {/* Firefox Icon */}
        <button 
          onClick={(e) => { e.currentTarget.blur(); openApp('browser'); }}
          className={`dock-item ${windowOpen && activeTab === 'browser' ? 'active' : ''}`}
          title="Firefox Browser (Simulated / Native Launch)"
        >
          <span style={{ fontSize: '1.4rem' }}>🦊</span>
        </button>

        {/* Game Icon */}
        <button 
          onClick={(e) => { e.currentTarget.blur(); openApp('game'); }}
          className={`dock-item ${windowOpen && activeTab === 'game' ? 'active' : ''}`}
          title="Matrix Core Hack Game"
        >
          <span style={{ fontSize: '1.4rem' }}>🎮</span>
        </button>

        {/* Drivers Icon */}
        <button 
          onClick={(e) => { e.currentTarget.blur(); openApp('drivers'); }}
          className={`dock-item ${windowOpen && activeTab === 'drivers' ? 'active' : ''}`}
          title="Additional Drivers"
        >
          <span style={{ fontSize: '1.4rem' }}>🔌</span>
        </button>

        {/* OS ISO Builder Icon */}
        <button 
          onClick={(e) => { e.currentTarget.blur(); openApp('build'); }}
          className={`dock-item ${windowOpen && activeTab === 'build' ? 'active' : ''}`}
          title="OS ISO Builder Factory"
        >
          <span style={{ fontSize: '1.4rem' }}>💿</span>
        </button>

        {/* System Monitor Icon */}
        <button 
          onClick={(e) => { e.currentTarget.blur(); openApp('daemon'); }}
          className={`dock-item ${windowOpen && activeTab === 'daemon' ? 'active' : ''}`}
          title="System Telemetry Monitor"
        >
          <span style={{ fontSize: '1.4rem' }}>📊</span>
        </button>

        {/* Sandbox Icon */}
        <button 
          onClick={(e) => { e.currentTarget.blur(); openApp('sandbox'); }}
          className={`dock-item ${windowOpen && activeTab === 'sandbox' ? 'active' : ''}`}
          title="Security Sandbox Settings"
        >
          <span style={{ fontSize: '1.4rem' }}>🛡️</span>
        </button>
      </div>

      {/* 3. Main Desktop Workspace */}
      <div className="ubuntu-workspace">
        
        {/* Desktop Shortcuts */}
        <div className="desktop-icons-container">
          <div className="desktop-icon-item" onDoubleClick={() => openApp('files')}>
            <div className="desktop-icon-symbol">📁</div>
            <div className="desktop-icon-name">Home Folder</div>
          </div>
          
          <div className="desktop-icon-item" onDoubleClick={() => openApp('build')}>
            <div className="desktop-icon-symbol">💿</div>
            <div className="desktop-icon-name">matrix-os-alpha.iso</div>
          </div>
          
          <div className="desktop-icon-item" onDoubleClick={() => openApp('terminal')}>
            <div className="desktop-icon-symbol">🐚</div>
            <div className="desktop-icon-name">MATRIX Shell</div>
          </div>

          <div className="desktop-icon-item" onDoubleClick={() => openApp('matrix')}>
            <div className="desktop-icon-symbol" style={{ animation: 'pulse-glow-dot 3s infinite ease-in-out' }}>⚡</div>
            <div className="desktop-icon-name">Matrix HUD</div>
          </div>

          <div className="desktop-icon-item" onDoubleClick={() => openApp('browser')}>
            <div className="desktop-icon-symbol">🦊</div>
            <div className="desktop-icon-name">Firefox Browser</div>
          </div>

          <div className="desktop-icon-item" onDoubleClick={() => openApp('game')}>
            <div className="desktop-icon-symbol">🎮</div>
            <div className="desktop-icon-name">Core Hack</div>
          </div>

          <div className="desktop-icon-item" onDoubleClick={() => openApp('drivers')}>
            <div className="desktop-icon-symbol">🔌</div>
            <div className="desktop-icon-name">Driver Manager</div>
          </div>
        </div>

        {/* Floating Application Window */}
        {windowOpen && (
          <div className={`ubuntu-window ${isMaximized ? 'maximized' : ''}`}>
            {/* Window Titlebar Header */}
            <div className="ubuntu-window-header">
              <span className="ubuntu-window-title">{getAppTitle()}</span>
              <div className="ubuntu-window-controls">
                <button className="win-btn win-btn-min" onClick={() => setWindowOpen(false)} title="Minimize">
                  <svg viewBox="0 0 12 12" width="8" height="8" style={{ display: 'block', stroke: 'currentColor', strokeWidth: '1.8px', strokeLinecap: 'round', width: '8px', height: '8px' }}>
                    <line x1="2.5" y1="6" x2="9.5" y2="6" />
                  </svg>
                </button>
                <button className="win-btn win-btn-max" onClick={() => setIsMaximized(!isMaximized)} title={isMaximized ? "Restore Down" : "Maximize"}>
                  <svg viewBox="0 0 12 12" width="8" height="8" style={{ display: 'block', stroke: 'currentColor', strokeWidth: '1.8px', strokeLinejoin: 'round', fill: 'none', width: '8px', height: '8px' }}>
                    <rect x="2.5" y="2.5" width="7" height="7" />
                  </svg>
                </button>
                <button className="win-btn win-btn-close" onClick={() => setWindowOpen(false)} title="Close">
                  <svg viewBox="0 0 12 12" width="8" height="8" style={{ display: 'block', stroke: 'currentColor', strokeWidth: '1.8px', strokeLinecap: 'round', width: '8px', height: '8px' }}>
                    <line x1="3" y1="3" x2="9" y2="9" />
                    <line x1="9" y1="3" x2="3" y2="9" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Window Content */}
            <div className="ubuntu-window-content">
              {renderActiveApp()}
            </div>
          </div>
        )}

        {/* File Text Viewer Dialog Modal */}
        {openedFile && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            <div className="ubuntu-window" style={{ maxWidth: '600px', width: '95%', marginTop: 0 }}>
              <div className="ubuntu-window-header">
                <span className="ubuntu-window-title">Document Viewer - {openedFile.name}</span>
                <div className="ubuntu-window-controls">
                  <button className="win-btn win-btn-close" onClick={() => setOpenedFile(null)} title="Close">
                    <svg viewBox="0 0 12 12" width="8" height="8" style={{ display: 'block', stroke: 'currentColor', strokeWidth: '1.8px', strokeLinecap: 'round', width: '8px', height: '8px' }}>
                      <line x1="3" y1="3" x2="9" y2="9" />
                      <line x1="9" y1="3" x2="3" y2="9" />
                    </svg>
                  </button>
                </div>
              </div>
              <div 
                className="ubuntu-window-content" 
                style={{ 
                  background: ['pdf', 'word', 'text'].includes(openedFile.mime) ? '#FFF' : '#130310', 
                  color: ['pdf', 'word', 'text'].includes(openedFile.mime) ? '#333' : '#FFF', 
                  fontFamily: 'var(--font-sans)', 
                  fontSize: '0.85rem', 
                  padding: '20px', 
                  lineHeight: '1.5',
                  overflowY: 'auto',
                  maxHeight: '480px'
                }}
              >
                <div style={{ 
                  borderBottom: `1px solid ${['pdf', 'word', 'text'].includes(openedFile.mime) ? '#EEE' : 'rgba(255,255,255,0.08)'}`, 
                  paddingBottom: '10px', 
                  marginBottom: '12px', 
                  fontSize: '0.7rem', 
                  color: '#888', 
                  display: 'flex', 
                  justifyContent: 'space-between' 
                }}>
                  <span>📄 Size: {openedFile.size}</span>
                  <span>MIME: {(openedFile.mime || 'unknown').toUpperCase()}</span>
                </div>
                
                {renderFileSpecificReader()}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 4. Full-screen Blurred Lock Screen Overlay */}
      {isLocked && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: wallpaper === 'dark' ? `url(${matrixOceanBlueWallpaper})` : 'none',
          background: wallpaper === 'dark' ? undefined : 'radial-gradient(circle at 50% 50%, var(--ubuntu-aubergine-mid) 0%, var(--ubuntu-aubergine-dark) 80%, #000000 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFF',
          fontFamily: 'var(--font-sans)'
        }}>
          {wallpaper === 'dark' && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              zIndex: -1
            }} />
          )}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '3.8rem', fontWeight: '300', margin: 0, letterSpacing: '-1px' }}>
              {new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
            </h1>
            <p style={{ fontSize: '1rem', color: 'var(--color-text-muted)', margin: '8px 0 0 0' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '30px 40px', width: '280px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--ubuntu-orange) 0%, var(--ubuntu-aubergine-light) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', boxShadow: '0 4px 15px rgba(233,84,32,0.4)' }}>
              👤
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>Developer (Sir)</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>MATRIX System Host</div>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (lockPassword.toLowerCase() === 'matrix') {
                  setIsLocked(false);
                  setLockPassword('');
                } else {
                  alert("Access Denied. Passphrase verification failed, sir.");
                  setLockPassword('');
                }
              }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}
            >
              <input 
                type="password" 
                placeholder="Enter password (matrix)" 
                value={lockPassword} 
                onChange={(e) => setLockPassword(e.target.value)}
                autoFocus
                style={{ 
                  width: '100%', 
                  background: 'rgba(0,0,0,0.4)', 
                  border: '1px solid rgba(255,255,255,0.15)', 
                  borderRadius: '6px', 
                  padding: '8px 12px', 
                  color: '#FFF', 
                  fontSize: '0.8rem', 
                  outline: 'none', 
                  textAlign: 'center',
                  boxSizing: 'border-box'
                }}
              />
              <button 
                type="submit"
                style={{ 
                  background: 'var(--ubuntu-orange)', 
                  color: '#FFF', 
                  border: 0, 
                  borderRadius: '6px', 
                  padding: '8px 0', 
                  fontSize: '0.8rem', 
                  fontWeight: 'bold', 
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(233,84,32,0.2)'
                }}
              >
                🔓 Unlock System
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. Shut Down Power Overlay Modal */}
      {powerModal === 'shutdown' && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(circle, #1a0012 0%, #000 100%)',
          zIndex: 9999999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFF',
          fontFamily: 'var(--font-mono)',
          padding: '24px'
        }}>
          <div style={{ width: '100%', maxWidth: '600px', background: 'rgba(0,0,0,0.8)', border: '1px solid var(--accent-rose)', borderRadius: '8px', padding: '24px', boxShadow: '0 0 40px rgba(244,63,94,0.2)' }}>
            <div style={{ color: 'var(--accent-rose)', fontWeight: 'bold', fontSize: '1rem', borderBottom: '1px solid rgba(244,63,94,0.3)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🚨 SYSTEM POWER OVERRIDE: SHUTDOWN PROTOCOL</span>
              <span style={{ animation: 'blink 1s step-end infinite' }}>🔴 HALT</span>
            </div>
            
            <div style={{ height: '220px', overflowY: 'auto', fontSize: '0.72rem', color: '#A0A0A8', display: 'flex', flexDirection: 'column', gap: '4px', lineHeight: '1.4' }}>
              <div>[   0.000000] Linux version 6.1.0-matrix-rt-amd64 (gcc version 12.2.0)</div>
              <div>[   0.089451] BIOS-provided physical RAM map: host verified</div>
              <div>[  OK  ] Stopped target Graphical Interface.</div>
              <div>[  OK  ] Stopped System Logger Daemon.</div>
              <div style={{ color: 'var(--accent-cyan)' }}>[  OK  ] Deallocating Ollama NLP model weight cache... Done.</div>
              <div style={{ color: 'var(--accent-cyan)' }}>[  OK  ] Sandboxing Bubblewrap virtual jails... Done.</div>
              <div style={{ color: 'var(--accent-cyan)' }}>[  OK  ] Terminating Wine server subagent processes... Done.</div>
              <div style={{ color: 'var(--accent-cyan)' }}>[  OK  ] Halting M.A.T.R.I.X Kernel Agent Scheduler daemon... Done.</div>
              <div>[  OK  ] Sent SIGTERM to all database pipelines.</div>
              <div>[  OK  ] Unmounting host development directory scheduler.db.</div>
              <div style={{ color: 'var(--accent-rose)', fontWeight: 'bold', marginTop: '10px' }}>[ SHUTDOWN ] OS power down complete, sir. Safe to terminate browser window.</div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setPowerModal(null)}
                className="btn-cyan"
                style={{ fontSize: '0.75rem', padding: '8px 16px', borderRadius: '4px', border: 0, fontWeight: 'bold', cursor: 'pointer' }}
              >
                ⚡ Reboot OS (Power On)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Restart Power Overlay Modal */}
      {powerModal === 'restart' && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(circle, #2c001e 0%, #000 100%)',
          zIndex: 9999999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFF',
          fontFamily: 'var(--font-mono)',
          padding: '24px'
        }}>
          <div style={{ width: '100%', maxWidth: '600px', background: 'rgba(0,0,0,0.8)', border: '1px solid var(--ubuntu-orange)', borderRadius: '8px', padding: '24px', boxShadow: '0 0 40px rgba(233,84,32,0.2)' }}>
            <div style={{ color: 'var(--ubuntu-orange)', fontWeight: 'bold', fontSize: '1rem', borderBottom: '1px solid rgba(233,84,32,0.3)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🔄 REBOOT PROTOCOL: RESTARTING M.A.T.R.I.X...</span>
              <span className="spinner" style={{ width: '14px', height: '14px' }}></span>
            </div>
            
            <div style={{ height: '180px', overflowY: 'auto', fontSize: '0.72rem', color: '#A0A0A8', display: 'flex', flexDirection: 'column', gap: '4px', lineHeight: '1.4' }}>
              <div>[  OK  ] Saving active scheduler telemetry maps...</div>
              <div>[  OK  ] Flushing SQLite cache dirty registers...</div>
              <div style={{ color: 'var(--accent-cyan)' }}>[  OK  ] Restarting Matrix orchestrator daemon services...</div>
              <div style={{ color: 'var(--accent-cyan)' }}>[  OK  ] Re-initializing React Virtual DOM components...</div>
              <div style={{ color: 'var(--accent-green)', fontWeight: 'bold', marginTop: '10px', animation: 'blink 1.2s infinite' }}>[ REBOOT ] Resetting VM system buffers... reloading page now, sir.</div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Permission Confirmation Overlay Modal (CORE-004 Permission System) */}
      {pendingAction && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-sans)',
          color: '#FFF',
          padding: '24px'
        }}>
          <div style={{ 
            width: '100%', 
            maxWidth: '520px', 
            background: 'rgba(20, 15, 25, 0.95)', 
            border: pendingAction.level === 'admin' ? '2px solid var(--accent-rose)' : '2px solid var(--ubuntu-orange)', 
            borderRadius: '12px', 
            padding: '24px', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.8)' 
          }}>
            <div style={{ 
              color: pendingAction.level === 'admin' ? 'var(--accent-rose)' : 'var(--ubuntu-orange)', 
              fontWeight: 'bold', 
              fontSize: '1rem', 
              borderBottom: '1px solid rgba(255,255,255,0.1)', 
              paddingBottom: '12px', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>🛡️ M.A.T.R.I.X Security Access Decision Gate</span>
            </div>
            
            <div style={{ fontSize: '0.85rem', color: '#DDD', lineHeight: '1.5', marginBottom: '20px' }}>
              <p>The AI Agent is requesting permission to execute an action classified as <strong style={{ color: pendingAction.level === 'admin' ? 'var(--accent-rose)' : 'var(--ubuntu-orange)', textTransform: 'uppercase' }}>{pendingAction.level}</strong>:</p>
              <pre style={{ 
                background: '#0c0810', 
                padding: '12px', 
                borderRadius: '6px', 
                fontFamily: 'var(--font-mono)', 
                fontSize: '0.75rem', 
                color: '#abb2bf',
                overflowX: 'auto',
                border: '1px solid rgba(255,255,255,0.05)',
                margin: '10px 0'
              }}>
                {pendingAction.command}
              </pre>
              <p style={{ fontSize: '0.75rem', color: '#888' }}>
                {pendingAction.level === 'admin' 
                  ? 'Warning: This command requires administrator level access. It could modify system services or critical components.'
                  : 'This command will modify local files, settings, or project variables.'}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={async () => {
                  try {
                    await fetch('/api/pending/resolve', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action_id: pendingAction.action_id, decision: 'reject' })
                    });
                    setPendingAction(null);
                  } catch (e) {
                    console.error(e);
                    setPendingAction(null);
                  }
                }}
                className="btn-reset"
                style={{ fontSize: '0.8rem', padding: '8px 16px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: '#FFF' }}
              >
                🔴 Deny Action
              </button>
              <button 
                onClick={async () => {
                  try {
                    await fetch('/api/pending/resolve', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action_id: pendingAction.action_id, decision: 'approve' })
                    });
                    setPendingAction(null);
                  } catch (e) {
                    console.error(e);
                    setPendingAction(null);
                  }
                }}
                className="btn-cyan"
                style={{ fontSize: '0.8rem', padding: '8px 16px', borderRadius: '4px', border: 0, fontWeight: 'bold', cursor: 'pointer' }}
              >
                🟢 Approve & Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// Advanced File Reader Helper Sub-Components
// ==========================================

function AudioPlayer({ file, systemVolume = 80 }) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [localVolume, setLocalVolume] = React.useState(0.5);
  const audioContextRef = React.useRef(null);
  const gainNodeRef = React.useRef(null);
  const schedulerIdRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  const startSynth = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(localVolume * (systemVolume / 100) * 0.08, ctx.currentTime);
      gain.connect(ctx.destination);
      gainNodeRef.current = gain;

      const notes = [220, 261.63, 329.63, 392.00, 440, 523.25, 659.25, 783.99];
      let noteIndex = 0;

      const scheduleNextNote = () => {
        const osc = ctx.createOscillator();
        osc.connect(gain);
        osc.type = noteIndex % 3 === 0 ? 'sawtooth' : noteIndex % 2 === 0 ? 'triangle' : 'sine';
        
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(notes[noteIndex % notes.length], now);
        osc.frequency.exponentialRampToValueAtTime(notes[(noteIndex + 1) % notes.length] * 0.5, now + 0.18);
        
        osc.start(now);
        osc.stop(now + 0.22);
        noteIndex++;
      };

      schedulerIdRef.current = setInterval(scheduleNextNote, 220);
      setIsPlaying(true);
    } catch (e) {
      console.warn("Synth failed to start:", e);
    }
  };

  const stopSynth = () => {
    if (schedulerIdRef.current) {
      clearInterval(schedulerIdRef.current);
      schedulerIdRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsPlaying(false);
  };

  React.useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(localVolume * (systemVolume / 100) * 0.08, audioContextRef.current.currentTime);
    }
  }, [localVolume, systemVolume]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animFrame;
    let offset = 0;

    const draw = () => {
      ctx.fillStyle = '#0a0007';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = isPlaying ? '#00ffff' : '#e95420';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const width = canvas.width;
      const height = canvas.height;
      const mid = height / 2;

      for (let x = 0; x < width; x++) {
        let y = mid;
        if (isPlaying) {
          y += Math.sin((x + offset) * 0.05) * Math.cos(x * 0.025) * 22;
          y += Math.sin((x - offset) * 0.08) * 8;
        } else {
          y += Math.sin(x * 0.08) * 0.5;
        }
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      offset += 2;
      animFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [isPlaying]);

  React.useEffect(() => {
    return () => {
      if (schedulerIdRef.current) clearInterval(schedulerIdRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return (
    <div style={{ background: '#0e0009', padding: '20px', borderRadius: '8px', border: '1px solid rgba(0,255,255,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '2rem' }}>🎵</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.85rem', color: '#FFF', fontWeight: 'bold', fontFamily: 'var(--font-sans)' }}>{file.name}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>MIME: audio/mpeg | Size: {file.size}</div>
        </div>
      </div>

      <canvas ref={canvasRef} width={400} height={100} style={{ width: '100%', height: '100px', background: '#000', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }} />

      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <button 
          onClick={isPlaying ? stopSynth : startSynth}
          className={isPlaying ? 'btn-reset' : 'btn-cyan'}
          style={{ width: '110px', padding: '8px 12px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px' }}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play Synth'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <span style={{ fontSize: '0.7rem', color: '#888' }}>🔊</span>
          <input 
            type="range" 
            min="0" max="1" step="0.05"
            value={localVolume}
            onChange={(e) => setLocalVolume(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent-cyan)', height: '3px' }}
          />
          <span style={{ fontSize: '0.65rem', color: '#888', fontFamily: 'var(--font-mono)', width: '28px', textAlign: 'right' }}>
            {Math.round(localVolume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function SVGGraphicViewer({ file }) {
  // Sanitize SVG to prevent XSS: strip script tags, event handlers, and dangerous elements
  const sanitizeSVG = (raw) => {
    if (!raw) return '';
    let clean = raw;
    // Remove <script> tags and content
    clean = clean.replace(/<script[\s\S]*?<\/script>/gi, '');
    // Remove event handler attributes (onload, onerror, onclick, etc.)
    clean = clean.replace(/\s+on\w+\s*=\s*(["'])[\s\S]*?\1/gi, '');
    clean = clean.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');
    // Remove javascript: URLs
    clean = clean.replace(/javascript\s*:/gi, 'blocked:');
    // Remove <foreignObject> which can embed arbitrary HTML
    clean = clean.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '');
    return clean;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ alignSelf: 'flex-start', fontSize: '0.7rem', color: '#888', fontFamily: 'var(--font-mono)' }}>🖼️ SVG Graphic Ingress Render</div>
      <div 
        style={{ 
          background: '#0a0007', 
          padding: '20px', 
          borderRadius: '8px', 
          border: '1px solid rgba(0,255,255,0.1)', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
        dangerouslySetInnerHTML={{ __html: sanitizeSVG(file.content) }}
      />
    </div>
  );
}

function PDFDocumentViewer({ file }) {
  const [zoom, setZoom] = React.useState(100);
  
  return (
    <div style={{ background: '#383838', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ background: '#222', padding: '8px 12px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>📕 PDF Reader: {file.name}</span>
          <span style={{ color: '#888' }}>|</span>
          <span>Page 1 of 1</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setZoom(z => Math.max(50, z - 10))} style={{ background: '#444', border: 0, color: '#FFF', padding: '2px 8px', borderRadius: '3px', cursor: 'pointer' }}>-</button>
          <span>{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(200, z + 10))} style={{ background: '#444', border: 0, color: '#FFF', padding: '2px 8px', borderRadius: '3px', cursor: 'pointer' }}>+</button>
        </div>
        <button onClick={() => alert("Simulating PDF printing interface...")} style={{ background: 'var(--accent-cyan)', border: 0, color: '#000', padding: '3px 10px', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>Print</button>
      </div>

      <div style={{ overflowY: 'auto', maxHeight: '300px', padding: '16px', display: 'flex', justifyContent: 'center', background: '#303030' }}>
        <div style={{ 
          background: '#FFF', 
          color: '#333', 
          width: '100%', 
          maxWidth: '500px', 
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)', 
          padding: '30px 20px', 
          transform: `scale(${zoom / 100})`, 
          transformOrigin: 'top center',
          transition: 'transform 0.15s ease',
          fontSize: '0.8rem',
          lineHeight: '1.5'
        }}>
          {(file.content || '').split('\n\n').map((para, i) => (
            <p key={i} style={{ 
              marginBottom: '12px', 
              fontWeight: para.startsWith('M.A.T.R.I.X.') || para.startsWith('Section') ? 'bold' : 'normal',
              color: para.startsWith('Section') ? 'var(--ubuntu-orange)' : '#333',
              borderBottom: para.startsWith('Section') ? '1px solid #DDD' : 'none',
              paddingBottom: para.startsWith('Section') ? '4px' : '0'
            }}>
              {para}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function JSONSpecViewer({ file }) {
  const formatJSON = (txt) => {
    try {
      const parsed = JSON.parse(txt);
      const str = JSON.stringify(parsed, null, 2);
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, function (match) {
          let cls = 'number';
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'key';
            } else {
              cls = 'string';
            }
          } else if (/true|false/.test(match)) {
            cls = 'boolean';
          } else if (/null/.test(match)) {
            cls = 'null';
          }
          let color = '#d19a66';
          if (cls === 'key') color = '#e06c75';
          else if (cls === 'string') color = '#98c379';
          else if (cls === 'boolean') color = '#56b6c2';
          else if (cls === 'null') color = '#abb2bf';
          return `<span style="color: ${color};">${match}</span>`;
        });
    } catch (e) {
      return txt;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ fontSize: '0.7rem', color: '#888', fontFamily: 'var(--font-mono)' }}>📋 JSON Structure Specification</div>
      <pre style={{ 
        background: '#1e1e24', 
        color: '#abb2bf', 
        fontFamily: 'var(--font-mono)', 
        fontSize: '0.72rem', 
        padding: '16px', 
        borderRadius: '6px', 
        border: '1px solid rgba(255,255,255,0.05)',
        overflowX: 'auto',
        maxHeight: '300px',
        lineHeight: '1.4'
      }} dangerouslySetInnerHTML={{ __html: formatJSON(file.content) }} />
    </div>
  );
}

function CodeScriptViewer({ file, onRun }) {
  const code = file.content;
  const isPython = file.name.endsWith('.py');
  
  const highlightCode = (raw) => {
    let escaped = raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
      
    escaped = escaped.replace(/(#[^\n]*)/g, '<span style="color: #6a737d; font-style: italic;">$1</span>');
    
    const keywords = [
      'def', 'class', 'import', 'from', 'as', 'self', 'return', 'if', 'else', 'elif',
      'echo', 'sudo', 'apt-get', 'systemctl', 'enable', 'for', 'in', 'while', 'install'
    ];
    
    keywords.forEach(kw => {
      const reg = new RegExp(`\\b(${kw})\\b`, 'g');
      escaped = escaped.replace(reg, '<span style="color: #ff79c6; font-weight: bold;">$1</span>');
    });

    escaped = escaped.replace(/("[^"]*")/g, '<span style="color: #f1fa8c;">$1</span>');
    escaped = escaped.replace(/('[^']*')/g, '<span style="color: #f1fa8c;">$1</span>');

    return escaped;
  };

  const codeHtml = highlightCode(code);
  const commandToRun = isPython ? `python3 /usr/local/bin/${file.name}` : `./home/matrix/${file.name}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
        <span style={{ fontSize: '0.7rem', color: '#BBB', fontFamily: 'var(--font-mono)' }}>
          💻 Code Editor — {isPython ? 'Python Script' : 'Bash Executable'}
        </span>
        <button 
          onClick={() => onRun(commandToRun)}
          className="btn-cyan"
          style={{ fontSize: '0.7rem', padding: '6px 14px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          ⚡ Run Script in WezTerm
        </button>
      </div>

      <div style={{ 
        background: '#181a1f', 
        color: '#abb2bf', 
        fontFamily: 'var(--font-mono)', 
        fontSize: '0.72rem', 
        padding: '16px', 
        borderRadius: '6px', 
        overflowX: 'auto',
        maxHeight: '300px',
        lineHeight: '1.4',
        border: '1px solid rgba(255,255,255,0.05)',
        whiteSpace: 'pre'
      }}>
        <div style={{ display: 'flex' }}>
          <div style={{ color: '#5c6370', textAlign: 'right', paddingRight: '12px', userSelect: 'none', borderRight: '1px solid rgba(255,255,255,0.05)', marginRight: '12px' }}>
            {code.split('\n').map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <code dangerouslySetInnerHTML={{ __html: codeHtml }} style={{ display: 'block', flex: 1 }} />
        </div>
      </div>
    </div>
  );
}

export default App;
