import { useState } from 'react';

export default function BrowserTab({ isOnline = true }) {
  const [reloadKey, setReloadKey] = useState(0);
  const [url, setUrl] = useState('firefox:home');
  const [urlInput, setUrlInput] = useState('firefox:home');
  const [history, setHistory] = useState(['firefox:home']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [launchStatus, setLaunchStatus] = useState('');

  // Handle native process launch call
  const launchNativeFirefox = async () => {
    setLaunchStatus('Initiating native Firefox process on host...');
    try {
      const res = await fetch('/api/launch-firefox');
      if (res.ok) {
        setLaunchStatus('Firefox launched successfully, sir!');
        setTimeout(() => setLaunchStatus(''), 4000);
      } else {
        setLaunchStatus('Failed to launch. Verify local daemon configs.');
      }
    } catch {
      setLaunchStatus('Connection error. Server script execution is offline.');
      setTimeout(() => setLaunchStatus(''), 4000);
    }
  };

  const navigateTo = (targetUrl) => {
    let cleanUrl = targetUrl.trim();
    
    // Only lowercase the protocol and hostname, not the path
    try {
      if (cleanUrl.match(/^https?:\/\//i)) {
        const urlObj = new URL(cleanUrl);
        cleanUrl = urlObj.protocol.toLowerCase() + '//' + urlObj.host.toLowerCase() + urlObj.pathname + urlObj.search + urlObj.hash;
      } else if (cleanUrl.includes('/')) {
        // Has a path component — lowercase only the part before the first slash
        const slashIdx = cleanUrl.indexOf('/');
        cleanUrl = cleanUrl.substring(0, slashIdx).toLowerCase() + cleanUrl.substring(slashIdx);
      } else {
        cleanUrl = cleanUrl.toLowerCase();
      }
    } catch {
      cleanUrl = cleanUrl.toLowerCase();
    }
    
    // Auto-prepend protocol if user typed standard domain
    if (
      !cleanUrl.startsWith('http://') && 
      !cleanUrl.startsWith('https://') && 
      !cleanUrl.startsWith('firefox:') &&
      (cleanUrl.includes('.') || cleanUrl.includes('localhost') || cleanUrl.includes(':'))
    ) {
      cleanUrl = 'https://' + cleanUrl;
    }
    
    const finalUrl = cleanUrl || 'firefox:home';
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(finalUrl);
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setUrl(finalUrl);
    setUrlInput(finalUrl);
    setSearchSubmitted(false);
  };

  const handleGo = (e) => {
    e.preventDefault();
    navigateTo(urlInput);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const idx = historyIndex - 1;
      setHistoryIndex(idx);
      setUrl(history[idx]);
      setUrlInput(history[idx]);
      setSearchSubmitted(false);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const idx = historyIndex + 1;
      setHistoryIndex(idx);
      setUrl(history[idx]);
      setUrlInput(history[idx]);
      setSearchSubmitted(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchSubmitted(true);
    }
  };

  const renderPageContent = () => {
    // Offline Page Mock
    if (!isOnline && url !== 'firefox:home') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', background: '#F9F9FB', color: '#222222', fontFamily: 'sans-serif', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🚫</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: '0 0 8px 0', color: '#15141A' }}>Server not found</h1>
          <p style={{ fontSize: '0.85rem', color: '#5B5B66', maxWidth: '400px', margin: '0 0 20px 0', lineHeight: '1.5' }}>
            Firefox can’t find the server at <strong>{url}</strong>.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', background: '#F1F1F4', borderRadius: '4px', padding: '16px', fontSize: '0.78rem', color: '#5B5B66', textAlign: 'left', maxWidth: '400px' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#15141A' }}>Check the connection:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Verify your network cables or wireless connection.</li>
              <li>Check that the M.A.T.R.I.X Network Ingress is active in the top-right menu.</li>
              <li>If your computer is behind a firewall, ensure that Firefox has permission to access the Web.</li>
            </ul>
          </div>
          <button 
            onClick={() => setReloadKey(k => k + 1)}
            style={{ marginTop: '20px', background: '#0060DF', color: '#FFF', border: 0, borderRadius: '4px', padding: '8px 16px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      );
    }

    // Firefox Home Page
    if (url === 'firefox:home') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#2B2A33', color: '#FFF', minHeight: '100%', padding: '40px 24px', fontFamily: 'sans-serif' }}>
          
          {/* Firefox Logo Mockup */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '4.5rem', filter: 'drop-shadow(0 0 15px rgba(255,140,0,0.5))', marginBottom: '8px' }}>🦊</div>
            <span style={{ fontSize: '1.8rem', fontWeight: 'bold', letterSpacing: '-0.5px' }}>Firefox <span style={{ color: '#FF9400' }}>Browser</span></span>
            <span style={{ fontSize: '0.65rem', color: '#909096', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>M.A.T.R.I.X. Sandbox Edition</span>
          </div>

          {/* Quick Search */}
          <form onSubmit={(e) => { e.preventDefault(); if (searchQuery.trim()) { navigateTo('google.local'); setTimeout(() => setSearchSubmitted(true), 0); } }} style={{ width: '100%', maxWidth: '520px', marginBottom: '40px' }}>
            <div style={{ display: 'flex', background: '#42414D', borderRadius: '8px', border: '1px solid #5B5B66', padding: '4px', overflow: 'hidden' }}>
              <input 
                type="text" 
                placeholder="Search with Google Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, padding: '10px 16px', background: 'transparent', border: 0, outline: 'none', color: '#FFF', fontSize: '0.9rem' }}
              />
              <button type="submit" style={{ background: '#FF9400', color: '#000', border: 0, padding: '0 20px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>
                Search
              </button>
            </div>
          </form>

          {/* Native launch banner */}
          <div style={{ background: 'linear-gradient(135deg, rgba(255,148,0,0.15) 0%, rgba(255,60,0,0.15) 100%)', border: '1px solid #FF9400', borderRadius: '8px', padding: '18px', maxWidth: '520px', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#FF9400', marginBottom: '4px' }}>🦊 LAUNCH NATIVE HOST BROWSER</div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#E0E0E6', lineHeight: '1.4' }}>
                To bypass iframe boundaries, you can open a real, hardware-accelerated Firefox window on your host desktop.
              </p>
            </div>
            <button 
              onClick={launchNativeFirefox} 
              style={{ background: '#FF9400', color: '#000', border: 0, borderRadius: '4px', padding: '10px 16px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0 }}
            >
              Open Firefox
            </button>
          </div>

          {/* Shortcuts Grid */}
          <div style={{ width: '100%', maxWidth: '600px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#909096', borderBottom: '1px solid #42414D', paddingBottom: '8px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              System Shortcuts & Database nodes
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {[
                { name: 'Google Search', icon: '🔍', url: 'google.local', bg: '#4285F4' },
                { name: 'OS Wiki Docs', icon: '📚', url: 'matrix.wiki', bg: 'var(--ubuntu-orange)' },
                { name: 'Git Repository', icon: '💻', url: 'github.com/matrix/os', bg: '#24292e' },
                { name: 'reddit Forum', icon: '💬', url: 'reddit.local/r/aios', bg: '#FF4500' }
              ].map((site, idx) => (
                <div 
                  key={idx} 
                  onClick={() => navigateTo(site.url)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', background: '#202024', border: '1px solid #42414D', borderRadius: '8px', padding: '12px 8px', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#FF9400'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#42414D'}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: site.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', color: '#FFF' }}>
                    {site.icon}
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: '500', color: '#E0E0E6', textAlign: 'center' }}>{site.name}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      );
    }

    // Google Search Engine Mock
    if (url === 'google.local') {
      if (searchSubmitted) {
        // Search Results
        const q = searchQuery.toLowerCase();
        let results;
        if (q.includes('os') || q.includes('matrix') || q.includes('system')) {
          results = [
            { title: 'MATRIX OS Architecture Blueprint - documentation', snippet: 'Learn how the Minimal Debian debootstrap live ISO builder environment, AppArmor cgroups, and Wine sandboxes are structured.', link: 'matrix.wiki' },
            { title: 'GitHub - matrix/os: AI-Native system scripts', snippet: 'Deployable shell configs chroot_setup.sh and build_iso.sh for custom compiler distro packaging.', link: 'github.com/matrix/os' },
            { title: 'reddit: matrix-os community discussions', snippet: 'Join r/aios to talk with developers configuring Ollama Qwen models and RT kernel loops.', link: 'reddit.local/r/aios' }
          ];
        } else if (q.includes('game') || q.includes('hack') || q.includes('play')) {
          results = [
            { title: 'Play Matrix Core Hack Retro Arcade Game', snippet: 'Bypass firewall nodes and capture data tokens using the green system stream byte control.', link: 'game.local' },
            { title: 'r/aios: I just scored 280 in Core Hack!', snippet: 'Post on reddit detailing the optimal pathing vectors to gather tokens without hitting system barriers.', link: 'reddit.local/r/aios' }
          ];
        } else {
          results = [
            { title: `${searchQuery} - Search Results`, snippet: `Simulated query matches for '${searchQuery}'. To explore matrix features, try searching 'os' or 'game'.`, link: 'matrix.wiki' }
          ];
        }

        return (
          <div style={{ padding: '16px', background: '#FFF', color: '#333', minHeight: '100%', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #EEE', paddingBottom: '12px', marginBottom: '16px' }}>
              <span onClick={() => { setSearchSubmitted(false); setSearchQuery(''); }} style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#FF9400', cursor: 'pointer' }}>MATRIX Search</span>
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flex: 1, maxWidth: '400px' }}>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1, padding: '6px 12px', borderRadius: '4px 0 0 4px', border: '1px solid #CCC', outline: 'none' }}
                />
                <button type="submit" style={{ background: '#FF9400', color: '#000', border: 0, padding: '0 12px', borderRadius: '0 4px 4px 0' }}>🔍</button>
              </form>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '650px' }}>
              {results.map((res, idx) => (
                <div key={idx}>
                  <span 
                    onClick={() => navigateTo(res.link)} 
                    style={{ fontSize: '0.95rem', color: '#1a0dab', textDecoration: 'none', cursor: 'pointer', fontWeight: '500' }}
                  >
                    {res.title}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: '#006621', margin: '2px 0' }}>{res.link}</div>
                  <div style={{ fontSize: '0.8rem', color: '#545454', lineHeight: '1.4' }}>{res.snippet}</div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', background: '#FFF', color: '#333', fontFamily: 'sans-serif' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-1px' }}>
              <span style={{ color: '#4285F4' }}>M</span>
              <span style={{ color: '#EA4335' }}>a</span>
              <span style={{ color: '#FBBC05' }}>t</span>
              <span style={{ color: '#4285F4' }}>r</span>
              <span style={{ color: '#34A853' }}>i</span>
              <span style={{ color: '#EA4335' }}>x</span>
            </span>
          </div>

          <form onSubmit={handleSearchSubmit} style={{ width: '90%', maxWidth: '480px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <input 
              type="text" 
              placeholder="Search OS indexes... (e.g. 'os', 'game')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 16px', borderRadius: '24px', border: '1px solid #DFE1E5', outline: 'none', fontSize: '0.9rem' }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" style={{ padding: '8px 16px', background: '#F8F9FA', border: '1px solid #F8F9FA', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>Search</button>
              <button type="button" onClick={() => navigateTo('matrix.wiki')} style={{ padding: '8px 16px', background: '#F8F9FA', border: '1px solid #F8F9FA', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>Wiki Docs</button>
            </div>
          </form>
        </div>
      );
    }

    // Wiki documentation page Mock
    if (url === 'matrix.wiki') {
      return (
        <div style={{ padding: '24px', background: '#FAFAFA', color: '#2C3E50', minHeight: '100%', fontFamily: 'sans-serif', lineHeight: '1.6' }}>
          <div style={{ borderBottom: '2px solid #FF9400', paddingBottom: '12px', marginBottom: '20px' }}>
            <h1 style={{ margin: 0, fontSize: '1.6rem', color: '#FF9400' }}>M.A.T.R.I.X. Kernel Architecture Wiki</h1>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '24px', fontSize: '0.85rem' }}>
            <div style={{ borderRight: '1px solid #E0E0E0', paddingRight: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <b>WIKI TOPICS</b>
              <span style={{ color: '#FF9400', fontWeight: 'bold' }}>Overview</span>
              <span onClick={() => navigateTo('github.com/matrix/os')} style={{ color: '#2980B9', cursor: 'pointer' }}>Source Files</span>
              <span onClick={() => navigateTo('reddit.local/r/aios')} style={{ color: '#2980B9', cursor: 'pointer' }}>Reddit Boards</span>
            </div>
            <div>
              <h3>1. Distro compilation jail</h3>
              <p>M.A.T.R.I.X. compilers automate base live boot ISO generation using standard Debian debootstrap structures and custom configuration files (`sys_spec.json`).</p>
              <h3>2. Direct Ollama API Relays</h3>
              <p>The OS routes local Speech to Text transcripts directly to Qwen model instances running inside Ollama. Latency metrics are rendered on the Matrix HUD.</p>
            </div>
          </div>
        </div>
      );
    }

    // GitHub repository Mock
    if (url === 'github.com/matrix/os') {
      return (
        <div style={{ background: '#FFF', color: '#24292e', minHeight: '100%', fontFamily: 'sans-serif', fontSize: '0.85rem' }}>
          <div style={{ background: '#24292e', color: '#FFF', padding: '12px 20px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold' }}>GitHub</span>
            <span style={{ fontSize: '0.75rem', background: '#3F4448', padding: '2px 6px', borderRadius: '4px' }}>Public Repo</span>
          </div>
          <div style={{ padding: '16px' }}>
            <h2 style={{ fontSize: '1.1rem', color: '#0366d6', margin: '0 0 12px 0' }}>matrix / os</h2>
            <div style={{ border: '1px solid #e1e4e8', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ background: '#f6f8fa', padding: '8px 12px', borderBottom: '1px solid #e1e4e8', fontSize: '0.75rem', color: '#586069' }}>
                Latest Update: <b>Rebrand custom voice ingress to Matrix</b>
              </div>
              {['etc/sys_spec.json', 'src/matrix-daemon.service', 'build_iso.sh', 'chroot_setup.sh'].map((f, i) => (
                <div key={i} style={{ padding: '8px 12px', borderBottom: i === 3 ? 0 : '1px solid #e1e4e8', color: '#0366d6' }}>📄 {f}</div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Reddit post boards Mock
    if (url === 'reddit.local/r/aios') {
      return (
        <div style={{ background: '#DAE0E6', minHeight: '100%', fontFamily: 'sans-serif', padding: '12px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ background: '#FFF', padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <h1 style={{ fontSize: '1.1rem', margin: 0 }}>r/aios: M.A.T.R.I.X. OS Forums</h1>
            </div>
            {[
              { author: 'u/linus_fan', title: 'Just compiled the minimal live ISO under 3 minutes! This scheduler is insane.', votes: 142 },
              { author: 'u/stark_tech', title: 'Can anyone verify if the Vulkan hooks support custom shaders inside Wine Bottles?', votes: 89 }
            ].map((post, idx) => (
              <div key={idx} style={{ background: '#FFF', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <span style={{ fontSize: '0.65rem', color: '#7c7c7c' }}>Posted by {post.author}</span>
                <h3 style={{ fontSize: '0.85rem', margin: '4px 0' }}>{post.title}</h3>
                <span style={{ fontSize: '0.7rem', color: '#FF4500', fontWeight: 'bold' }}>▲ {post.votes} Upvotes</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Real Website Load via Iframe (Default)
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', background: '#FFF' }}>
        <iframe 
          key={reloadKey}
          src={url} 
          style={{ width: '100%', height: '100%', border: 0 }} 
          title="Sandbox Web View"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
        {/* Footnote reminding about X-Frame-Options */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(43,42,51,0.95)', borderTop: '1px solid #FF9400', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
          <span style={{ fontSize: '0.65rem', color: '#E0E0E6', fontFamily: 'sans-serif' }}>
            🔒 <b>Firefox Sandboxed Iframe.</b> If page fails to load, the site blocks frame embedding.
          </span>
          <button 
            onClick={launchNativeFirefox}
            style={{ background: '#FF9400', color: '#000', border: 0, borderRadius: '3px', padding: '3px 8px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            🦊 Open Native Firefox
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#2B2A33', borderRadius: '6px', overflow: 'hidden' }}>
      
      {/* Firefox Tabs Bar */}
      <div style={{ background: '#1C1B22', padding: '4px 8px 0 8px', display: 'flex', alignItems: 'flex-end', gap: '4px', borderBottom: '1px solid #2B2A33' }}>
        <div 
          onClick={() => navigateTo('firefox:home')}
          style={{ 
            background: url === 'firefox:home' ? '#2B2A33' : 'transparent', 
            color: '#FFF', 
            padding: '6px 16px 8px 16px', 
            borderRadius: '6px 6px 0 0', 
            fontSize: '0.72rem', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            border: '1px solid',
            borderColor: url === 'firefox:home' ? '#2B2A33 #2B2A33 transparent #2B2A33' : 'transparent'
          }}
        >
          <span>🦊</span>
          <span style={{ fontWeight: url === 'firefox:home' ? 'bold' : 'normal' }}>Firefox Home Page</span>
        </div>
        
        {url !== 'firefox:home' && (
          <div 
            style={{ 
              background: '#2B2A33', 
              color: '#FFF', 
              padding: '6px 16px 8px 16px', 
              borderRadius: '6px 6px 0 0', 
              fontSize: '0.72rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              borderBottom: '1px solid #2B2A33'
            }}
          >
            <span>🌐</span>
            <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {url.replace(/^(https?:\/\/)?(www\.)?/, '')}
            </span>
            <span onClick={() => navigateTo('firefox:home')} style={{ marginLeft: '6px', color: '#909096', cursor: 'pointer', fontWeight: 'bold' }}>×</span>
          </div>
        )}
      </div>

      {/* Control Navigation & Address Bar */}
      <div style={{ background: '#2B2A33', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #1C1B22' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            onClick={handleBack} 
            disabled={historyIndex === 0}
            style={{ width: '28px', height: '28px', borderRadius: '4px', border: 0, background: historyIndex === 0 ? 'transparent' : 'rgba(255,255,255,0.08)', color: historyIndex === 0 ? '#555' : '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', cursor: historyIndex === 0 ? 'default' : 'pointer' }}
            title="Back"
          >
            ◀
          </button>
          <button 
            onClick={handleForward} 
            disabled={historyIndex === history.length - 1}
            style={{ width: '28px', height: '28px', borderRadius: '4px', border: 0, background: historyIndex === history.length - 1 ? 'transparent' : 'rgba(255,255,255,0.08)', color: historyIndex === history.length - 1 ? '#555' : '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', cursor: historyIndex === history.length - 1 ? 'default' : 'pointer' }}
            title="Forward"
          >
            ▶
          </button>
          <button 
            onClick={() => { setSearchSubmitted(false); setReloadKey(k => k + 1); }}
            style={{ width: '28px', height: '28px', borderRadius: '4px', border: 0, background: 'rgba(255,255,255,0.08)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', cursor: 'pointer' }}
            title="Reload"
          >
            🔄
          </button>
          <button 
            onClick={() => navigateTo('firefox:home')}
            style={{ width: '28px', height: '28px', borderRadius: '4px', border: 0, background: 'rgba(255,255,255,0.08)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', cursor: 'pointer' }}
            title="Home"
          >
            🏠
          </button>
        </div>

        {/* Address URL Input Bar */}
        <form onSubmit={handleGo} style={{ display: 'flex', flex: 1, gap: '6px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '10px', fontSize: '0.7rem', color: '#909096' }}>🔒</span>
            <input 
              type="text" 
              style={{ width: '100%', padding: '6px 12px 6px 26px', borderRadius: '4px', border: 0, background: '#1C1B22', fontSize: '0.75rem', outline: 'none', color: '#FFF' }}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            style={{ padding: '6px 12px', background: '#0060DF', color: '#FFF', border: 0, borderRadius: '4px', fontSize: '0.72rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Go
          </button>
        </form>

        {/* Native Launch trigger */}
        <button 
          onClick={launchNativeFirefox}
          style={{ background: 'rgba(255,148,0,0.15)', border: '1px solid #FF9400', color: '#FF9400', borderRadius: '4px', padding: '5px 10px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          title="Launch real Firefox natively on Windows host"
        >
          <span>🦊</span> Launch Host Firefox
        </button>
      </div>

      {/* Mini status bar for host notifications */}
      {launchStatus && (
        <div style={{ background: '#FF9400', color: '#000', padding: '6px 12px', fontSize: '0.65rem', fontWeight: 'bold', fontFamily: 'monospace', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span>⚙️</span> {launchStatus}
        </div>
      )}

      {/* Page Viewport Area */}
      <div style={{ flex: 1, background: '#FFF', overflowY: 'auto' }}>
        {renderPageContent()}
      </div>

    </div>
  );
}
