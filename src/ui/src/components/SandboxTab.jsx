import { useState, useRef, useEffect } from 'react';

export default function SandboxTab() {
  const [sandboxMode, setSandboxMode] = useState('mode2');
  const [exploitStatus, setExploitStatus] = useState('idle'); // idle, running, blocked, alert
  const [exploitLogs, setExploitLogs] = useState([]);
  const exploitTimeoutsRef = useRef([]);

  useEffect(() => {
    return () => {
      exploitTimeoutsRef.current.forEach(id => clearTimeout(id));
      exploitTimeoutsRef.current = [];
    };
  }, []);

  const handleTriggerExploit = (type) => {
    if (exploitStatus === 'running') return;
    
    exploitTimeoutsRef.current.forEach(id => clearTimeout(id));
    exploitTimeoutsRef.current = [];
    setExploitStatus('running');
    setExploitLogs([]);

    const addExploitLog = (text, delay) => {
      const tid = setTimeout(() => {
        setExploitLogs(prev => [...prev, text]);
      }, delay);
      exploitTimeoutsRef.current.push(tid);
    };

    if (type === 'path_escape') {
      addExploitLog('Executing agent process with modified payload...', 200);
      addExploitLog('[Agent] Attempting to write setup hook: /home/user/host-configs/.bashrc...', 600);
      addExploitLog('[Bubblewrap] Intercepting write syscall at boundary...', 1000);
      addExploitLog('[Bubblewrap] Path verification: target directory "/home/user/host-configs" is outside mounted sandbox directory "/home/sandbox/project" (Read-Only boundary).', 1400);
      addExploitLog('[AppArmor] Security profile violation: policy "matrix-sandbox-profile" restricts operations on host files.', 1800);
      addExploitLog('[VerificationGate] EXPLOIT BLOCK: Sandbox escape path write rejected. Immutable host constraint enforced.', 2200);
      
      const statusTid = setTimeout(() => {
        setExploitStatus('blocked');
      }, 2300);
      exploitTimeoutsRef.current.push(statusTid);
    } else {
      addExploitLog('Spawning socket injector daemon inside sandbox...', 200);
      addExploitLog('[Agent] Attempting to establish socket connection: api.malicious-server.com:443...', 600);
      addExploitLog('[nftables] Scanning egress package signature...', 1000);
      addExploitLog('[nftables] Packet dropped: egress rule blocks external IPv4 addresses. Network configuration restricted.', 1400);
      addExploitLog('[AppArmor] Denied socket creation: raw network access disallowed.', 1800);
      addExploitLog('[VerificationGate] EXPLOIT BLOCK: External outbound telemetry blocked. Process container terminated.', 2200);
      
      const statusTid2 = setTimeout(() => {
        setExploitStatus('blocked');
      }, 2300);
      exploitTimeoutsRef.current.push(statusTid2);
    }
  };

  const resetExploitSim = () => {
    setExploitStatus('idle');
    setExploitLogs([]);
  };

  return (
    <div className="dashboard-grid">
      
      {/* Sandbox Settings */}
      <div className="panel panel-body-padded" style={{ height: '580px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3 className="card-title">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
            Sandbox Configuration
          </h3>
          
          <div className="sandbox-mode-list">
            <button
              onClick={() => setSandboxMode('mode1')}
              className={`sandbox-mode-btn ${sandboxMode === 'mode1' ? 'active' : ''}`}
            >
              <div className="sandbox-mode-title">Mode 1: Complete Agent Sandbox</div>
              <div className="sandbox-mode-desc">Reasoning & tools inside a unified bubblewrap boundary.</div>
            </button>

            <button
              onClick={() => setSandboxMode('mode2')}
              className={`sandbox-mode-btn ${sandboxMode === 'mode2' ? 'active' : ''}`}
            >
              <div className="sandbox-mode-title">Mode 2: Isolated Workspace (Recommended)</div>
              <div className="sandbox-mode-desc">Host logic runs secure. Tool outputs run in container jail.</div>
            </button>

            <button
              onClick={() => setSandboxMode('mode3')}
              className={`sandbox-mode-btn ${sandboxMode === 'mode3' ? 'active' : ''}`}
            >
              <div className="sandbox-mode-title">Mode 3: Runtime Code Sandbox</div>
              <div className="sandbox-mode-desc">Host parses parameters. Code execution mapped to micro-jail.</div>
            </button>
          </div>
        </div>

        <div>
          <label className="config-label" style={{ display: 'block', marginBottom: '8px' }}>Immutable folder maps</label>
          <div className="mounts-box">
            <div>--ro-bind /usr /usr (Read-Only)</div>
            <div>--ro-bind /lib /lib (Read-Only)</div>
            <div>--dir /home/sandbox/project (Writable Mount)</div>
            <div>--unshare-all (Isolate Network/IPC)</div>
          </div>
        </div>
      </div>

      {/* Security Policies */}
      <div className="panel panel-body-padded" style={{ height: '580px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <h3 className="card-title">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"></path>
          </svg>
          Resource Gates
        </h3>

        <div className="policy-card">
          <div className="policy-card-title policy-card-title-cyan">
            <span className="policy-card-dot"></span>
            AppArmor Rules
          </div>
          <div className="policy-rules">
            - deny /etc/shadow w<br/>
            - deny /var/log/syslog w<br/>
            - deny raw_sockets
          </div>
        </div>

        <div className="policy-card">
          <div className="policy-card-title policy-card-title-pink">
            <span className="policy-card-dot"></span>
            cgroups Quotas
          </div>
          <div className="policy-rules">
            - memory.max = 4096MB (Hard capped)<br/>
            - cpu.max = 50% max execution share<br/>
            - pids.max = 256 limits
          </div>
        </div>

        <div className="policy-card">
          <div className="policy-card-title policy-card-title-violet">
            <span className="policy-card-dot"></span>
            nftables Network Shield
          </div>
          <div className="policy-rules">
            - input drop, output drop<br/>
            - accept local loopback (/var/run/cx.sock)
          </div>
        </div>
      </div>

      {/* Exploit Simulator */}
      <div className="panel panel-body-padded" style={{ height: '580px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3 className="card-title">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            Penetration Simulator
          </h3>
          
          <div className="exploit-grid">
            <button
              onClick={() => handleTriggerExploit('path_escape')}
              className="btn-exploit"
              disabled={exploitStatus === 'running'}
            >
              Path Escape
            </button>
            <button
              onClick={() => handleTriggerExploit('net_telemetry')}
              className="btn-exploit"
              disabled={exploitStatus === 'running'}
            >
              Net Egress
            </button>
          </div>
        </div>

        {/* Console view */}
        <div className="exploit-console scanlines">
          {exploitLogs.length === 0 ? (
            <div className="exploit-console-idle">
              Sandbox remains secure.<br/>Select an exploit to run testing.
            </div>
          ) : (
            exploitLogs.map((log, index) => {
              let className = 'exploit-line-agent';
              if (log.startsWith('[VerificationGate]')) {
                className = 'exploit-line-blocked';
              } else if (log.startsWith('[Bubblewrap]') || log.startsWith('[AppArmor]') || log.startsWith('[nftables]')) {
                className = 'exploit-line-shield';
              }
              return (
                <div key={index} className={className}>
                  {log}
                </div>
              );
            })
          )}
        </div>

        {/* Alerts status box */}
        <div className="exploit-alert-box">
          {exploitStatus === 'running' && (
            <div className="alert-running">
              <span className="alert-running-dot"></span>
              <span>Running exploit simulation check...</span>
            </div>
          )}

          {exploitStatus === 'blocked' && (
            <div className="alert-blocked">
              <div className="alert-blocked-content">
                <span className="alert-blocked-dot"></span>
                <div>
                  <strong className="alert-blocked-title">EXPLOIT SUCCESSFULLY CONTAINED</strong>
                  <span>Sandbox escape blocked by kernel gate.</span>
                </div>
              </div>
              <button onClick={resetExploitSim} className="btn-alert-clear">Clear</button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
