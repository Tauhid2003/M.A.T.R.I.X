import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export default function TerminalTab() {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize xterm.js
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'var(--font-mono)',
      fontSize: 14,
      theme: {
        background: '#0a0a0f',
        foreground: '#a9b1d6',
        cursor: '#f7768e',
        selectionBackground: '#33467c'
      }
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(terminalRef.current);
    
    // Slight delay to ensure parent container is rendered before fitting
    setTimeout(() => {
      fitAddon.fit();
    }, 10);
    
    xtermRef.current = term;

    term.writeln('\x1b[1;32mM.A.T.R.I.X. OS True PTY Terminal\x1b[0m');
    term.writeln('\x1b[1;34mConnecting to kernel backend...\x1b[0m');

    // Connect WebSocket
    const wsUrl = `ws://${window.location.hostname}:8001`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      term.writeln('\x1b[1;32mConnected.\x1b[0m\r\n');
      fitAddon.fit();
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    ws.onclose = () => {
      setIsConnected(false);
      term.writeln('\r\n\x1b[1;31mConnection lost. Backend daemon offline.\x1b[0m');
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    const handleResize = () => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      term.dispose();
    };
  }, []);

  return (
    <div className="dashboard-grid">
      <div className="panel terminal-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '60vh' }}>
        <div className="panel-header">
          <div className="terminal-dots">
            <div className="dot dot-red"></div>
            <div className="dot dot-yellow"></div>
            <div className="dot dot-green"></div>
            <span style={{ marginLeft: '12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              cx-terminal - True PTY Shell
            </span>
          </div>
          <div className="terminal-status-text">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isConnected ? 'var(--accent-green)' : 'var(--accent-rose)', display: 'inline-block', marginRight: '6px' }}></span>
            <span>{isConnected ? 'LOCAL_DAEMON: ACTIVE' : 'LOCAL_DAEMON: OFFLINE'}</span>
          </div>
        </div>
        
        <div style={{ flex: 1, padding: '10px', overflow: 'hidden' }} ref={terminalRef}></div>
      </div>
    </div>
  );
}
