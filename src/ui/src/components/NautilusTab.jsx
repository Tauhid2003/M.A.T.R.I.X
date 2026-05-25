import React, { useState } from 'react';
import matrixOceanBlueWallpaper from '../assets/matrix_ocean_blue_wallpaper.png';

export default function NautilusTab({ onOpenFile }) {
  const [currentPath, setCurrentPath] = useState('/');
  
  // Virtual Filesystem
  const filesystem = {
    '/': [
      { name: 'build', type: 'dir' },
      { name: 'etc', type: 'dir' },
      { name: 'home', type: 'dir' },
      { name: 'usr', type: 'dir' }
    ],
    '/build': [
      { name: 'matrix-os-alpha.iso', type: 'file', size: '924 MB', mime: 'disk-image', content: 'Debian UEFI/BIOS bootable Live ISO containing baked Ollama, Wine translation layers, and M.A.T.R.I.X. Kernel daemon.' }
    ],
    '/etc': [
      { name: 'hosts', type: 'file', size: '150 B', mime: 'text', content: '127.0.0.1   localhost\n127.0.1.1   matrix-os\n\n::1     localhost ip6-localhost ip6-loopback' },
      { name: 'hostname', type: 'file', size: '10 B', mime: 'text', content: 'matrix-os' },
      { name: 'sys_spec.json', type: 'file', size: '1.2 KB', mime: 'json', content: '{\n  "project_name": "M.A.T.R.I.X. AI-OS",\n  "target_architecture": "x86_64",\n  "base_distribution": "debian",\n  "wine_compatibility_layer": {\n    "enabled": true,\n    "ntsync_enabled": true\n  }\n}' }
    ],
    '/home': [
      { name: 'matrix', type: 'dir' }
    ],
    '/home/matrix': [
      { name: 'documents', type: 'dir' },
      { name: 'music', type: 'dir' },
      { name: 'pictures', type: 'dir' },
      { name: 'chroot_install.sh', type: 'file', size: '2.4 KB', mime: 'script', content: '#!/bin/bash\n# M.A.T.R.I.X System Integration Script\necho "[SYSTEM] Initializing base packages..."\nsudo apt-get update && sudo apt-get install -y bubblewrap wine qemu-system-x86\necho "[SYSTEM] Registering Ollama services..."\nsystemctl enable ollama.service\necho "[SYSTEM] Kernel setup completed successfully."' }
    ],
    '/home/matrix/documents': [
      { name: 'system_manual.pdf', type: 'file', size: '2.1 MB', mime: 'pdf', content: 'M.A.T.R.I.X. AI-OS Architecture Reference Manual\n\nSection 1: Operating System Kernel Core\nThis architecture layers a natural language interpreter directly on a Debian chroot base. It controls Bubblewrap sandbox processes, schedules resource quotas, and manages Wine NT syscall execution paths.\n\nSection 2: Security & AppArmor Sandboxing\nEvery run directive compiles a temporary sandboxed jail environment using Bubblewrap namespace limits, restricting disk access, socket access, and loopback networking.\n\nSection 3: Ollama Synapse Inference\nLocal model weights are loaded into GPU VRAM to translate speech signals and text queries to dynamic execution calls.' },
      { name: 'M.A.T.R.I.X (1).docx', type: 'file', size: '12 KB', mime: 'word', content: 'M.A.T.R.I.X. is an artificial intelligence created for different types of work. The full name is Metaverse Artificial Technological Regenerating Intelligence Experiment.' }
    ],
    '/home/matrix/music': [
      { name: 'matrix_theme.mp3', type: 'file', size: '3.8 MB', mime: 'audio', content: 'M.A.T.R.I.X. Core Soundtrack (Ambient Cyberpunk theme)' }
    ],
    '/home/matrix/pictures': [
      { name: 'neural_topology.svg', type: 'file', size: '5.2 KB', mime: 'svg', content: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">\n  <rect width="100%" height="100%" fill="#120614"/>\n  <line x1="80" y1="150" x2="200" y2="80" stroke="rgba(0, 255, 255, 0.4)" stroke-width="2" stroke-dasharray="4"/>\n  <line x1="80" y1="150" x2="200" y2="220" stroke="rgba(0, 255, 255, 0.4)" stroke-width="2"/>\n  <line x1="200" y1="80" x2="320" y2="150" stroke="rgba(233, 84, 32, 0.4)" stroke-width="2"/>\n  <line x1="200" y1="220" x2="320" y2="150" stroke="rgba(233, 84, 32, 0.4)" stroke-width="2" stroke-dasharray="4"/>\n  <circle cx="80" cy="150" r="16" fill="#00ffff" />\n  <circle cx="200" cy="80" r="20" fill="#a78bfa" />\n  <circle cx="200" cy="220" r="20" fill="#e95420" />\n  <circle cx="320" cy="150" r="16" fill="#00ffff" />\n  <text x="80" y="154" fill="#FFF" font-size="10" font-family="monospace" text-anchor="middle">IN</text>\n  <text x="200" y="84" fill="#FFF" font-size="10" font-family="monospace" text-anchor="middle">CPU</text>\n  <text x="200" y="224" fill="#FFF" font-size="10" font-family="monospace" text-anchor="middle">GPU</text>\n  <text x="320" y="154" fill="#FFF" font-size="10" font-family="monospace" text-anchor="middle">OUT</text>\n  <text x="200" y="155" fill="rgba(255,255,255,0.3)" font-size="9" font-family="sans-serif" text-anchor="middle">M.A.T.R.I.X. Synapses</text>\n</svg>' },
      { name: 'matrix_ocean_blue_wallpaper.png', type: 'file', size: '1.2 MB', mime: 'image', content: matrixOceanBlueWallpaper }
    ],
    '/usr': [
      { name: 'local', type: 'dir' }
    ],
    '/usr/local': [
      { name: 'bin', type: 'dir' }
    ],
    '/usr/local/bin': [
      { name: 'matrix_scheduler.py', type: 'file', size: '1.5 KB', mime: 'python', content: '#!/usr/bin/env python3\n# M.A.T.R.I.X. Kernel Agent Scheduler Daemon\nimport asyncio\n\nclass AgentScheduler:\n    def __init__(self, scheduling_algorithm="Priority"):\n        self.algorithm = scheduling_algorithm\n        self.queue = []' }
    ]
  };

  const getItems = () => {
    return filesystem[currentPath] || [];
  };

  const navigateTo = (name) => {
    let newPath = currentPath;
    if (newPath === '/') {
      newPath = '/' + name;
    } else {
      newPath = newPath + '/' + name;
    }
    setCurrentPath(newPath);
  };

  const navigateBack = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/');
    parts.pop();
    const parentPath = parts.join('/') || '/';
    setCurrentPath(parentPath);
  };

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: '450px', background: '#2D2D2D', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', overflow: 'hidden', color: '#FFF', fontFamily: 'var(--font-sans)' }}>
      {/* Sidebar Navigation */}
      <div style={{ width: '180px', background: '#343434', borderRight: '1px solid #222', padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button 
          onClick={() => setCurrentPath('/')}
          style={{ width: '100%', textAlign: 'left', background: currentPath === '/' ? '#4C4C4C' : 'transparent', border: 0, padding: '8px 12px', color: '#FFF', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
        >
          📁 Root (/)
        </button>
        <button 
          onClick={() => setCurrentPath('/home/matrix')}
          style={{ width: '100%', textAlign: 'left', background: currentPath.startsWith('/home/matrix') ? '#4C4C4C' : 'transparent', border: 0, padding: '8px 12px', color: '#FFF', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
        >
          🏠 Operator Home
        </button>
        <button 
          onClick={() => setCurrentPath('/etc')}
          style={{ width: '100%', textAlign: 'left', background: currentPath.startsWith('/etc') ? '#4C4C4C' : 'transparent', border: 0, padding: '8px 12px', color: '#FFF', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
        >
          ⚙️ etc/ config
        </button>
        <button 
          onClick={() => setCurrentPath('/build')}
          style={{ width: '100%', textAlign: 'left', background: currentPath.startsWith('/build') ? '#4C4C4C' : 'transparent', border: 0, padding: '8px 12px', color: '#FFF', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
        >
          💿 build/ ISO
        </button>
      </div>

      {/* Explorer Files View */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#242424' }}>
        {/* Navigation Bar */}
        <div style={{ padding: '8px 16px', background: '#2D2D2D', borderBottom: '1px solid #1c1c1c', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={navigateBack} 
            disabled={currentPath === '/'}
            style={{ padding: '4px 10px', background: '#3D3D3D', border: '1px solid #111', borderRadius: '4px', color: currentPath === '/' ? '#666' : '#FFF', cursor: 'pointer' }}
          >
            ◀ Back
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#BBB' }}>
            Path: {currentPath}
          </span>
        </div>

        {/* Directory Grid */}
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '20px', alignContent: 'start', flexGrow: 1, overflowY: 'auto' }}>
          {getItems().map((item, idx) => (
            <div 
              key={item.name}
              onDoubleClick={() => {
                if (item.type === 'dir') {
                  navigateTo(item.name);
                } else {
                  if (onOpenFile) onOpenFile(item);
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', textAlign: 'center', padding: '8px', borderRadius: '6px' }}
              className="nautilus-icon-item"
            >
              {item.type === 'dir' ? (
                <span style={{ fontSize: '2.5rem', marginBottom: '6px', display: 'block' }}>📁</span>
              ) : item.name.endsWith('.iso') ? (
                <span style={{ fontSize: '2.5rem', marginBottom: '6px', display: 'block' }}>💿</span>
              ) : item.name.endsWith('.py') ? (
                <span style={{ fontSize: '2.5rem', marginBottom: '6px', display: 'block' }}>🐍</span>
              ) : item.name.endsWith('.sh') ? (
                <span style={{ fontSize: '2.5rem', marginBottom: '6px', display: 'block' }}>🐚</span>
              ) : item.name.endsWith('.svg') || item.name.endsWith('.png') || item.name.endsWith('.jpg') ? (
                <span style={{ fontSize: '2.5rem', marginBottom: '6px', display: 'block' }}>🖼️</span>
              ) : item.name.endsWith('.pdf') ? (
                <span style={{ fontSize: '2.5rem', marginBottom: '6px', display: 'block' }}>📕</span>
              ) : item.name.endsWith('.mp3') ? (
                <span style={{ fontSize: '2.5rem', marginBottom: '6px', display: 'block' }}>🎵</span>
              ) : (
                <span style={{ fontSize: '2.5rem', marginBottom: '6px', display: 'block' }}>📄</span>
              )}
              <span style={{ fontSize: '0.75rem', color: '#EEE', wordBreak: 'break-all' }}>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
