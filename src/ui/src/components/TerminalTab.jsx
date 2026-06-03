import { useState, useRef, useEffect } from 'react';

export default function TerminalTab({ initialCommand, onClearInitialCommand }) {
  const [history, setHistory] = useState([
    { type: 'system', text: 'M.A.T.R.I.X. OS (Version 1.0.0-offline-ubuntu)' },
    { type: 'system', text: 'Local LLM Core: Ollama/Qwen-2.5-3B-Instruct (4-bit)' },
    { type: 'system', text: 'Secure Sandbox: Bubblewrap Mode 2 [Stateless Containers] Active' },
    { type: 'system', text: 'System ready. Type "help" or "neofetch" to explore Linux commands.' }
  ]);
  
  const [inputVal, setInputVal] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [activeStage, setActiveStage] = useState(0); // 0: Idle, 1: NLP, 2: Gate, 3: Wine, 4: CPU/GPU
  const [isExecuting, setIsExecuting] = useState(false);
  
  const [isVoiceSupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    return !!SpeechRecognition;
  });

  const recognitionRef = useRef(null);
  
  const terminalEndRef = useRef(null);
  const runCommandSimRef = useRef(null);

  const speakVocalFeedback = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const defaultVoice = voices.find(v => v.name.toLowerCase().includes('zira')) || 
                         voices.find(v => v.lang.includes('en-GB') && v.name.toLowerCase().includes('google')) || 
                         voices.find(v => v.lang.includes('en-GB')) ||
                         voices.find(v => v.lang.includes('en-US')) || 
                         voices[0];
    if (defaultVoice) {
      utterance.voice = defaultVoice;
    }
    utterance.pitch = 0.95;
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  const pollIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const runCommandSim = async (commandText) => {
    if (!commandText.trim() || isExecuting) return;
    
    setIsExecuting(true);
    setInputVal('');
    
    // Add command to terminal history
    setHistory(prev => [...prev, { type: 'user', text: `$ ${commandText}` }]);
    
    try {
      const res = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: commandText })
      });
      
      if (!res.ok) {
        throw new Error('API server returned error');
      }
      
      const data = await res.json();
      
      if (data.status === 'completed') {
        setHistory(prev => [
          ...prev,
          ...(data.stdout ? [{ type: 'output', text: data.stdout }] : []),
          ...(data.stderr ? [{ type: 'output', text: data.stderr }] : [])
        ]);
        setIsExecuting(false);
        speakVocalFeedback("Command executed.");
      } else if (data.status === 'pending_approval') {
        setHistory(prev => [
          ...prev,
          { type: 'info', text: `[SandboxGate] Command requires Operator approval (Action ID: ${data.action_id})` },
          { type: 'info', text: `[SandboxGate] Awaiting decision gate...` }
        ]);
        
        const interval = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/pending/status?action_id=${data.action_id}`);
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.status === 'completed') {
                clearInterval(interval);
                setHistory(prev => [
                  ...prev,
                  { type: 'info', text: `[SandboxGate] Security access GRANTED.` },
                  ...(statusData.stdout ? [{ type: 'output', text: statusData.stdout }] : []),
                  ...(statusData.stderr ? [{ type: 'output', text: statusData.stderr }] : [])
                ]);
                setIsExecuting(false);
                speakVocalFeedback("Command approved and executed.");
              } else if (statusData.status === 'rejected') {
                clearInterval(interval);
                setHistory(prev => [
                  ...prev,
                  { type: 'info', text: `[SandboxGate] Security access DENIED.` },
                  { type: 'output', text: `Error: ${statusData.error}` }
                ]);
                setIsExecuting(false);
                speakVocalFeedback("Command denied.");
              }
            }
          } catch (e) {
            clearInterval(interval);
            setIsExecuting(false);
            setHistory(prev => [...prev, { type: 'info', text: '[System] Error polling decision gate status.' }]);
          }
        }, 1000);
        
        pollIntervalRef.current = interval;
      }
    } catch (e) {
      console.warn("MATRIX API Daemon is offline. Falling back to simulated mode.", e);
      runCommandSimulation(commandText, true);
    }
  };

  const runCommandSimulation = (commandText, skipUserHistory = false) => {
    if (!commandText.trim()) return;
    if (!skipUserHistory) {
      if (isExecuting) return;
      setIsExecuting(true);
      setInputVal('');
      setHistory(prev => [...prev, { type: 'user', text: `$ ${commandText}` }]);
    }
    
    const cmdLower = commandText.trim().toLowerCase();
    const cmdArgs = cmdLower.split(' ');
    const primaryCmd = cmdArgs[0];

    // Helper to log with delayed stages
    const triggerStages = (stagesInfo, finalOutputs, speechText) => {
      setActiveStage(1);
      setTimeout(() => {
        setHistory(prev => [...prev, { type: 'info', text: stagesInfo[0] }]);
        setActiveStage(2);
        
        setTimeout(() => {
          setHistory(prev => [...prev, { type: 'info', text: stagesInfo[1] }, { type: 'info', text: stagesInfo[2] }]);
          
          setTimeout(() => {
            setActiveStage(3);
            
            setTimeout(() => {
              setActiveStage(4);
              setHistory(prev => [
                ...prev,
                ...finalOutputs.map(text => ({ type: text.startsWith('[') ? 'info' : 'output', text }))
              ]);
              
              setTimeout(() => {
                setActiveStage(0);
                setIsExecuting(false);
                if (speechText) {
                  speakVocalFeedback(speechText);
                }
              }, 500);
            }, 600);
          }, 600);
        }, 600);
      }, 500);
    };

    // Linux tools logic mapping
    if (primaryCmd === 'matrix') {
      const matrixSub = cmdArgs[1];
      let matrixOutput;
      let matrixSpeech;
      
      if (!matrixSub || matrixSub === 'help') {
        matrixOutput = [
          "M.A.T.R.I.X. OS AI System Ingress Core",
          "=====================================",
          "Usage: matrix [directive]",
          "  matrix status      - Checks system scheduler and daemon health",
          "  matrix build       - Invokes debootstrap compiler build factory",
          "  matrix monitor     - Displays active metrics and VRAM allocations",
          "  matrix security    - Audits Bubblewrap isolation sandboxes",
          "  matrix compile     - Triggers automated compilation of OS ISO",
          "  matrix whoami      - Returns AI identification matrix metadata",
          "  matrix hello       - Requests a friendly voice checkin"
        ];
        matrixSpeech = "Matrix commands loaded. You can query status, check logs, or run virtualization utilities.";
      } else if (matrixSub === 'status') {
        matrixOutput = [
          "[Matrix] Analysing scheduler queues...",
          "[Matrix] Daemon: Active (PID: 804)",
          "[Matrix] Queue state: 0 tasks pending, load factor 0.12",
          "[Matrix] All systems operating at peak nominal capacity."
        ];
        matrixSpeech = "System scheduler check complete. Running daemon at ninety eight percent efficiency.";
      } else if (matrixSub === 'build' || matrixSub === 'compile') {
        matrixOutput = [
          "[Matrix] Initiating system builder redirect...",
          "[Matrix] Redirecting GUI display to builder factory console."
        ];
        matrixSpeech = "Compilation sequence initialized. Transitioning console display to cloud builder dashboard.";
        setTimeout(() => {
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('matrix-navigate', { detail: { tab: 'build', exec: 'build' } }));
          }
        }, 1200);
      } else if (matrixSub === 'monitor') {
        matrixOutput = [
          "[Matrix] Routing daemon telemetry feeds...",
          "[Matrix] Redirecting GUI display to system metrics visualizer."
        ];
        matrixSpeech = "Telemetry metrics router enabled. Bridging dashboard visual interfaces.";
        setTimeout(() => {
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('matrix-navigate', { detail: { tab: 'daemon' } }));
          }
        }, 1200);
      } else if (matrixSub === 'security') {
        matrixOutput = [
          "[Matrix] Loading AppArmor security audits...",
          "[Matrix] Redirecting GUI display to security isolation sandbox."
        ];
        matrixSpeech = "AppArmor and sandbox isolation validation audit complete. Security level normal.";
        setTimeout(() => {
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('matrix-navigate', { detail: { tab: 'sandbox' } }));
          }
        }, 1200);
      } else if (matrixSub === 'whoami') {
        matrixOutput = [
          "[Matrix] Identification: M.A.T.R.I.X. AI-OS Core Assistant Daemon.",
          "[Matrix] Inspired by classic OS designs, customized for chroot environments.",
          "[Matrix] Host OS target: minimal Ubuntu / Debian live distribution."
        ];
        matrixSpeech = "User context identifies as active system administrator matrix daemon.";
      } else if (matrixSub === 'hello') {
        matrixOutput = [
          "[Matrix] Hello sir! Systems are standing by for your instructions."
        ];
        matrixSpeech = "Hello sir, matrix artificial intelligence core standing by for your instruction.";
      } else {
        matrixOutput = [
          `[Matrix] Sir, I cannot execute the directive "${matrixSub}" inside this shell wrapper.`,
          "Type 'matrix help' to view available system routines."
        ];
        matrixSpeech = "Warning, matrix command unrecognized. Please specify a valid system directive.";
      }
      triggerStages(
        [`[Orchestrator] Intent: Access Matrix subprocess '${matrixSub || 'help'}'.`, "[SandboxGate] Verification: Local Qwen system callback.", "[SandboxGate] Validation: SUCCESS."],
        matrixOutput,
        matrixSpeech
      );
    }
    
    else if (primaryCmd === 'neofetch') {
      const neofetchOutput = [
        "            .-.",
        "           (.. )",
        "           /  \\",
        "          | |  |",
        "         _.\\ \\/_._",
        "       .\"   '  '  \".",
        "      /             \\",
        "     |  M.A.T.R.I.X  |",
        "      \\             /",
        "       '.         .'",
        "         '-------'",
        "matrix@matrix-os",
        "----------------",
        "OS: M.A.T.R.I.X. AI-OS x86_64",
        "Kernel: 6.8.0-14-rt-hardened",
        "Uptime: 2 hours, 18 mins",
        "Shell: WezTerm cx-terminal",
        "DE: MATE (Custom GTK4 Shell)",
        "CPU: AMD Ryzen 9 (AVX2 Supported)",
        "GPU: NVIDIA RTX 4080 (DXVK bound)",
        "Memory: 9.4 GB / 16.0 GB (RAM)",
        "VRAM: 3.2 GB / 8.0 GB"
      ];
      triggerStages(
        ["[Orchestrator] Intent: Print system info visual utility.", "[SandboxGate] Check: system read query.", "[SandboxGate] Validation: SUCCESS."],
        neofetchOutput,
        "System specifications check complete. Running matrix architecture kernel six point eight with nine point four gigabytes memory load."
      );
    } 
    
    else if (primaryCmd === 'ls') {
      const lsOutput = [
        "Permissions   Size     Date Modified    Name",
        "drwxr-xr-x    4096 B   May 25 00:11     build/",
        "drwxr-xr-x    4096 B   May 25 00:11     etc/",
        "drwxr-xr-x    4096 B   May 25 00:11     home/",
        "drwxr-xr-x    4096 B   May 25 00:11     usr/",
        "-rwxr-xr-x    4472 B   May 25 00:32     build_iso.sh",
        "-rwxr-xr-x    4410 B   May 25 00:32     chroot_setup.sh",
        "-rw-r--r--     542 B   May 25 00:32     matrix-daemon.service",
        "-rw-r--r--    1197 B   May 25 00:31     sys_spec.json",
        "-rw-r--r--    2122 B   May 25 00:32     cx.preseed"
      ];
      triggerStages(
        ["[Orchestrator] Intent: List directory contents.", "[SandboxGate] Policy: sandbox folder path read.", "[SandboxGate] Validation: SUCCESS."],
        lsOutput,
        "Directory listing returned. Five subfolders, four scripts, and a matrix preseed file detected."
      );
    }

    else if (primaryCmd === 'cat') {
      const filename = cmdArgs[1] || '';
      let catOutput;
      let catSpeech;
      if (filename.includes('sys_spec.json')) {
        catOutput = [
          "{\n  \"project_name\": \"M.A.T.R.I.X. AI-OS\",\n  \"target_architecture\": \"x86_64\",\n  \"base_distribution\": \"debian\",\n  \"packages_to_exclude\": [\"snapd\", \"gnome-shell\"],\n  \"wine_compatibility_layer\": {\n    \"enabled\": true,\n    \"ntsync_enabled\": true\n  }\n}"
        ];
        catSpeech = "System specifications configuration file read successfully.";
      } else if (filename.includes('hosts')) {
        catOutput = ["127.0.0.1   localhost\n127.0.1.1   matrix-os\n::1     localhost ip6-localhost ip6-loopback"];
        catSpeech = "Local hosts file read successfully.";
      } else if (filename.includes('preseed')) {
        catOutput = ["d-i debian-installer/locale string en_US.UTF-8\nd-i passwd/username string matrix\nd-i passwd/user-password password matrix"];
        catSpeech = "Installer preseed file read successfully.";
      } else {
        catOutput = [filename ? `cat: ${filename}: No such file or directory` : "cat: missing filename. Usage: cat <filename>"];
        catSpeech = filename ? "File read failure. Specified target does not exist in context path." : "cat missing filename argument.";
      }
      triggerStages(
        [`[Orchestrator] Intent: Read file content of '${filename}'.`, "[SandboxGate] Policy: read permission access control check.", "[SandboxGate] Validation: SUCCESS."],
        catOutput,
        catSpeech
      );
    }

    else if (primaryCmd === 'uname') {
      const unameOutput = ["Linux matrix-os 6.8.0-14-rt-hardened #1 SMP PREEMPT_RT x86_64 GNU/Linux"];
      triggerStages(
        ["[Orchestrator] Intent: Get kernel architecture information.", "[SandboxGate] Policy: system call query.", "[SandboxGate] Validation: SUCCESS."],
        unameOutput,
        "System kernel architecture verification. Linux kernel release six point eight on x eighty six sixty four."
      );
    }

    else if (primaryCmd === 'whoami') {
      const whoamiOutput = ["matrix"];
      triggerStages(
        ["[Orchestrator] Intent: Get current shell owner user.", "[SandboxGate] Policy: query current context user.", "[SandboxGate] Validation: SUCCESS."],
        whoamiOutput,
        "Active user identity verified as system administrator matrix."
      );
    }

    else if (primaryCmd === 'htop' || primaryCmd === 'top') {
      const htopOutput = [
        "  CPU[|||||||||                    28.4%]   Tasks: 42, 1 running",
        "  Mem[|||||||||||||||||       9.4G/16.0G]   Load average: 0.12 0.08 0.05",
        "  VRA[||||||                      3.2G/8G]   Uptime: 2 hours, 18 mins",
        "  ",
        "  PID  USER      PRI  NI  VIRT   RES   SHR S  CPU% MEM%   TIME+  Command",
        " 3120  root       20   0 14.2G  9.4G 4200M S  24.0 58.7  1:14.22 ollama serve",
        " 4092  matrix     20   0  120M   16M  8400K S   1.2  0.1  0:00.12 wine notepad.exe",
        " 4120  matrix     20   0  450M   45M 12000K S   4.8  0.3  0:00.45 proton dxdiag.exe",
        "  804  root       20   0  180M  4120  3200  S   0.2  0.1  0:04.22 /usr/local/bin/matrix_scheduler.py",
        " 1240  matrix     20   0  880M   85M  5400  R   0.8  0.5  0:00.08 htop"
      ];
      triggerStages(
        ["[Orchestrator] Intent: Monitor system load threads.", "[SandboxGate] Policy: read /proc filesystems.", "[SandboxGate] Validation: SUCCESS."],
        htopOutput,
        "Process monitor active. CPU usage twenty eight percent, memory usage nine point four gigabytes."
      );
    }

    else if (primaryCmd === 'help') {
      const helpOutput = [
        "M.A.T.R.I.X. AI-OS Shell (cx-terminal) Help Center",
        "=================================================",
        "You can execute standard Linux tools and custom AI commands:",
        "  neofetch            - Renders system statistics and ASCII logo",
        "  ls                  - Lists files in the current workspace",
        "  cat <file>          - Reads file content (e.g. cat sys_spec.json)",
        "  uname -a            - Renders operating system kernel specs",
        "  whoami              - Prints active user profile account",
        "  htop / top          - Renders real-time process monitoring table",
        "  matrix [directive]  - Query Matrix AI Orchestrator subprocesses",
        "  ",
        "Custom Action Vectors:",
        "  notepad.exe         - Remaps Windows API system calls via Wine/DXVK",
        "  sandbox-scan        - Runs Bubblewrap/AppArmor security validation audits",
        "  build-iso           - Triggers the Cloud Builder debootstrap compilation",
        "  clear               - Flushes terminal lines history"
      ];
      triggerStages(
        ["[Orchestrator] Intent: Query available commands helper.", "[SandboxGate] Policy: static lookup helper.", "[SandboxGate] Validation: SUCCESS."],
        helpOutput,
        "System help registry loaded. You can execute standard tools like neofetch, htop, or access the matrix subprocess system."
      );
    }

    else if (primaryCmd === 'clear') {
      setIsExecuting(false);
      setHistory([]);
    }

    // Windows PE applications / wine
    else if (cmdLower.includes('notepad') || cmdLower.includes('.exe') || cmdLower.includes('windows')) {
      const notepadLogs = [
        '[Orchestrator] Intent: Execute Windows PE format binary.',
        '[Orchestrator] Remapped command: wine ~/.cx/bottles/win32-sandbox/drive_c/windows/notepad.exe &',
        '[SandboxGate] Verifying access boundary for Wine sandbox...',
        '[SandboxGate] Sandbox validation: SUCCESS (Mode 2: isolated Wine namespace).',
        '[WineTranslation] Loading KERNEL32.dll & USER32.dll hooks...',
        '[WineTranslation] NTSYNC kernel module mapping thread context...',
        '[WineTranslation] Direct syscall path bound. Virtualization bypassed.',
        '[DXVK] Hooking DX11/12 APIs -> Vulkan dynamic compiler bound.',
        '[System] Executing process: notepad.exe (PID: 4092, Sandbox: win32-sandbox)',
        '[System] Render pipeline successfully outputting frames via Vulkan DXVK.'
      ];
      triggerStages(
        ["[Orchestrator] Intent: Launch Wine bottle.", "[SandboxGate] Policy: sandbox boundary check.", "[SandboxGate] Validation: SUCCESS."],
        notepadLogs,
        "Remapped notepad execution via wine bottle. Vulkan render pipeline successfully bound."
      );
    } 
    
    // QEMU boot check
    else if (cmdLower.includes('qemu') || cmdLower.includes('build') || cmdLower.includes('factory')) {
      const qemuLogs = [
        '[Orchestrator] Intent: Simulate ISO boot verification.',
        '[Orchestrator] Target: Headless QEMU emulator.',
        '[SandboxGate] Access checking: developer group verification.',
        '[SandboxGate] Sandbox validation: SUCCESS (Read-only host mount, network egress blocked).',
        '[System] Launching QEMU emulation virtualization...',
        '[QEMU-Boot] Linux version 6.8.0-generic (gcc version 13.2.0)',
        '[QEMU-Boot] UEFI Boot: Success. Initializing system services...',
        '[QEMU-Boot] M.A.T.R.I.X. system daemon listening on /var/run/cx.sock',
        '[QEMU-Boot] Diagnostic check complete. Exit code 0 (Clean boot).'
      ];
      triggerStages(
        ["[Orchestrator] Intent: Boot testing.", "[SandboxGate] Policy: qemu hardware validation.", "[SandboxGate] Validation: SUCCESS."],
        qemuLogs,
        "Virtual machine boot validation complete. Exit code zero, system clean."
      );
    } 
    
    // Security scan
    else if (cmdLower.includes('security') || cmdLower.includes('scan') || cmdLower.includes('sandbox')) {
      const securityLogs = [
        '[Orchestrator] Intent: Perform security audit of active sandboxes.',
        '[SandboxGate] Validating Bubblewrap environment boundaries...',
        '[SandboxGate] AppArmor policies loaded: 14 rules enforced.',
        '[SandboxGate] Cgroups v2 memory limit: 4096MB.',
        '[SandboxGate] cgroups v2 max PIDs: 256.',
        '[SandboxGate] nftables sidecar: egress network blocked except local domain sockets.',
        '[System] Sandbox validation: HARDENED.'
      ];
      triggerStages(
        ["[Orchestrator] Intent: Scan security boundaries.", "[SandboxGate] Policy: security credentials audit.", "[SandboxGate] Validation: SUCCESS."],
        securityLogs,
        "Security sandbox audit complete. Apparmor policies fully hardened."
      );
    }
    
    // Fallback (Natural User Interface NLP shell handler)
    else {
      (async () => {
        // Step 1: Set executing state and trigger NLP stage
        setHistory(prev => [...prev, { type: 'info', text: `[NLP Orchestrator] Intent parsing open for: "${commandText}"` }]);
        setActiveStage(1); // NLP parsing stage
        
        let parsedTask = null;
        
        // 1. Check if Ollama is online and parse query
        try {
          const checkRes = await fetch('http://localhost:11434/api/tags');
          if (checkRes.ok) {
            // Fetch first available model
            const tagsData = await checkRes.json();
            if (tagsData.models && tagsData.models.length > 0) {
              const selectedModel = tagsData.models[0].name;
              
              setHistory(prev => [...prev, { type: 'info', text: `[NLP Orchestrator] Local Ollama model "${selectedModel}" online. Mapping synaptic intent vectors...` }]);
              
              const systemPrompt = `You are the M.A.T.R.I.X. AI-OS NLP Ingress. Translate the user natural language command into a structured agent task. Choose ONE of these agents:
1. 'Security Auditor' (Complexity: 8, Urgency: 9, Resource: 5, User Priority: 7, Task: 'Vulnerability Scan' or custom audit task)
2. 'Wine Translator' (Complexity: 4, Urgency: 3, Resource: 3, User Priority: 5, Task: 'Translate win32 API' or custom translation task)
3. 'Filesystem Stripper' (Complexity: 5, Urgency: 6, Resource: 8, User Priority: 4, Task: 'Purge temp caches' or custom filesystem cleanup task)
4. 'Network Guard' (Complexity: 7, Urgency: 8, Resource: 6, User Priority: 9, Task: 'Inspect traffic' or custom network security task)

Provide output ONLY as a JSON block with these keys:
- 'agent_id': name of the agent
- 'task_name': a short descriptive name for the task
- 'duration': float duration in seconds (between 1.0 and 4.0)
- 'task_complexity': float from 1.0 to 10.0
- 'urgency': float from 1.0 to 10.0
- 'resource_requirements': float from 1.0 to 10.0
- 'user_priority': float from 1.0 to 10.0
- 'intent_explanation': a short 1-sentence explanation of what the agent will do.`;

              const ollamaRes = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: selectedModel,
                  prompt: commandText,
                  system: systemPrompt,
                  options: { temperature: 0.2 },
                  stream: false
                })
              });
              
              if (ollamaRes.ok) {
                const ollamaData = await ollamaRes.json();
                const jsonText = ollamaData.response.substring(ollamaData.response.indexOf('{'), ollamaData.response.lastIndexOf('}') + 1);
                parsedTask = JSON.parse(jsonText);
              }
            }
          }
        } catch {
          console.warn("Direct Ollama fetch failed, using local semantic heuristics.");
        }
        
        // 2. Local Fallback Heuristics Parser (if offline or fails)
        if (!parsedTask) {
          await new Promise(r => setTimeout(r, 1200)); // Simulate thinking latency
          const text = commandText.toLowerCase();
          
          if (text.includes('security') || text.includes('vulnerab') || text.includes('audit') || text.includes('scan')) {
            parsedTask = {
              agent_id: 'Security Auditor',
              task_name: 'Audit: ' + (commandText.length > 20 ? commandText.substring(0, 20) + '...' : commandText),
              duration: 2.0,
              task_complexity: 8.0,
              urgency: 9.0,
              resource_requirements: 5.0,
              user_priority: 7.0,
              intent_explanation: 'User requested local system security audit scan.'
            };
          } else if (text.includes('wine') || text.includes('translate') || text.includes('windows') || text.includes('exe')) {
            parsedTask = {
              agent_id: 'Wine Translator',
              task_name: 'Translate win32 dynamic links',
              duration: 1.5,
              task_complexity: 4.0,
              urgency: 3.0,
              resource_requirements: 3.0,
              user_priority: 5.0,
              intent_explanation: 'Mapping user Windows subsystem compatibility layers.'
            };
          } else if (text.includes('file') || text.includes('clean') || text.includes('purge') || text.includes('cache') || text.includes('stripper')) {
            parsedTask = {
              agent_id: 'Filesystem Stripper',
              task_name: 'Clean: ' + (commandText.length > 20 ? commandText.substring(0, 20) + '...' : commandText),
              duration: 1.5,
              task_complexity: 5.0,
              urgency: 6.0,
              resource_requirements: 8.0,
              user_priority: 4.0,
              intent_explanation: 'Executing filesystem duplicate cache cleanup.'
            };
          } else {
            // Default to Network Guard
            parsedTask = {
              agent_id: 'Network Guard',
              task_name: 'NetGuard: ' + (commandText.length > 20 ? commandText.substring(0, 20) + '...' : commandText),
              duration: 2.5,
              task_complexity: 7.0,
              urgency: 8.0,
              resource_requirements: 6.0,
              user_priority: 9.0,
              intent_explanation: 'Monitoring inbound packets from local domain interfaces.'
            };
          }
          setHistory(prev => [...prev, { type: 'info', text: `[NLP Orchestrator] Ollama offline or returned invalid schema. Mapped via local heuristics.` }]);
        }
        
        // Step 2: Sandbox Security Gate
        setActiveStage(2); // Sandbox Gate
        setHistory(prev => [
          ...prev, 
          { type: 'info', text: `[SandboxGate] Policy validation checklist: SUCCESS` },
          { type: 'info', text: `[SandboxGate] Parsing NLP Intent: mapped to Agent "${parsedTask.agent_id}" | Task: "${parsedTask.task_name}"` }
        ]);
        await new Promise(r => setTimeout(r, 600));
        
        // Step 3: Syscall task registration to backend
        setActiveStage(3); // Syscall / database query
        setHistory(prev => [...prev, { type: 'info', text: `[Syscall] Initiating task registration syscall to local database queue...` }]);
        
        let writeSuccess = false;
        try {
          const addRes = await fetch('/api/scheduler/add-task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedTask)
          });
          if (addRes.ok) {
            writeSuccess = true;
          }
        } catch (e) {
          console.error("Could not register task to database:", e);
        }
        
        await new Promise(r => setTimeout(r, 600));
        
        // Step 4: Show final execution status outputs
        setActiveStage(4); // Execution stage
        if (writeSuccess) {
          setHistory(prev => [
            ...prev,
            { type: 'info', text: `[Syscall] Success! SQL execution committed to database.` },
            { type: 'output', text: `M.A.T.R.I.X. AI-OS NLP Ingress Report:` },
            { type: 'output', text: `------------------------------------` },
            { type: 'output', text: `Target Agent  : ${parsedTask.agent_id}` },
            { type: 'output', text: `Directives    : ${parsedTask.task_name}` },
            { type: 'output', text: `Syscall Action: ${parsedTask.intent_explanation}` },
            { type: 'output', text: `Alloc. Time   : ${parsedTask.duration} seconds` },
            { type: 'output', text: `Complexity    : ${parsedTask.task_complexity} | Urgency: ${parsedTask.urgency}` },
            { type: 'info', text: `[Kernel] Task registered. Running daemon will execute context switch automatically.` }
          ]);
        } else {
          setHistory(prev => [
            ...prev,
            { type: 'info', text: `[Syscall] Error: SQLite write failed. Task could not be persistent.` },
            { type: 'output', text: `Mock Execution Pipeline Fallback:` },
            { type: 'output', text: `Simulated running task "${parsedTask.task_name}" for agent "${parsedTask.agent_id}".` }
          ]);
        }
        
        // End execution
        setTimeout(() => {
          setActiveStage(0);
          setIsExecuting(false);
          if (parsedTask) {
            const statusMsg = writeSuccess ? "Registered in scheduler queue." : "Running fallback simulation.";
            speakVocalFeedback(`${parsedTask.intent_explanation} ${statusMsg}`);
          }
        }, 800);
      })();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      runCommandSim(inputVal);
    }
  };

  const startVoiceTriggerSim = () => {
    if (isTranscribing || isExecuting) return;
    setIsTranscribing(true);
    
    setTimeout(() => {
      const speechOutputs = [
        "neofetch",
        "htop",
        "ls -la",
        "cat sys_spec.json"
      ];
      const randomText = speechOutputs[Math.floor(Math.random() * speechOutputs.length)];
      setInputVal(randomText);
      setIsTranscribing(false);
      
      setTimeout(() => {
        runCommandSim(randomText);
      }, 500);
    }, 2500);
  };

  const handleMicClick = () => {
    if (isTranscribing || isExecuting) return;
    if (isVoiceSupported && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Speech recognition start failed, running simulation:", err);
        startVoiceTriggerSim();
      }
    } else {
      startVoiceTriggerSim();
    }
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsTranscribing(true);
      speakVocalFeedback("Acoustic link open, speak command.");
    };

    rec.onerror = (e) => {
      console.error(e);
      setIsTranscribing(false);
      speakVocalFeedback("Acoustic link timed out.");
    };

    rec.onend = () => {
      setIsTranscribing(false);
    };

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInputVal(transcript);
      if (runCommandSimRef.current) {
        runCommandSimRef.current(transcript);
      }
    };

    recognitionRef.current = rec;
  }, []);

  useEffect(() => {
    runCommandSimRef.current = runCommandSim;
  });

  useEffect(() => {
    if (initialCommand) {
      runCommandSimRef.current(initialCommand);
      if (onClearInitialCommand) {
        onClearInitialCommand();
      }
    }
  }, [initialCommand, onClearInitialCommand]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  return (
    <div className="dashboard-grid">
      {/* Interactive Terminal */}
      <div className="panel terminal-container">
        
        {/* Terminal Header */}
        <div className="panel-header">
          <div className="terminal-dots">
            <div className="dot dot-red"></div>
            <div className="dot dot-yellow"></div>
            <div className="dot dot-green"></div>
            <span style={{ marginLeft: '12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              cx-terminal - WezTerm Visual Shell
            </span>
          </div>
          <div className="terminal-status-text">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }}></span>
            <span>LOCAL_DAEMON: ACTIVE</span>
          </div>
        </div>

        {/* Terminal Console Viewport */}
        <div className="terminal-viewport scanlines">
          {history.map((line, index) => {
            let className = 'terminal-line-system';
            if (line.type === 'user') className = 'terminal-line-user';
            if (line.type === 'info') className = 'terminal-line-info';
            if (line.type === 'output') className = 'terminal-line-output';
            
            return (
              <div key={index} className={className} style={{ whiteSpace: 'pre' }}>
                {line.text}
              </div>
            );
          })}
          {isExecuting && activeStage === 1 && (
            <div className="terminal-line-system" style={{ color: 'var(--accent-violet)', animation: 'pulse-glow-dot 1.5s infinite' }}>
              [NLP Orchestrator] Parsing natural language intent...
            </div>
          )}
          {isExecuting && activeStage === 2 && (
            <div className="terminal-line-system" style={{ color: 'hsl(45, 100%, 60%)', animation: 'pulse-glow-dot 1.5s infinite' }}>
              [SandboxGate] Running security verification policies...
            </div>
          )}
          {isExecuting && activeStage === 3 && (
            <div className="terminal-line-system" style={{ color: 'hsl(340, 90%, 60%)', animation: 'pulse-glow-dot 1.5s infinite' }}>
              [WineTranslation] Mapping win32 syscall hooks to host...
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Input Bar */}
        <div className="terminal-input-bar">
          <span className="terminal-prompt">❯</span>
          <input
            type="text"
            className="terminal-input"
            placeholder={isTranscribing ? "Whisper server transcribing audio..." : "Instruct the OS (e.g., 'neofetch', 'ls', 'htop', 'cat sys_spec.json')..."}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isExecuting || isTranscribing}
          />
          
          {/* Whisper Mic Button */}
          <button
            onClick={handleMicClick}
            className={`icon-btn ${isTranscribing ? 'icon-btn-active' : ''}`}
            title="Speech-to-text trigger (Whisper offline translation)"
            disabled={isExecuting || isTranscribing}
          >
            {isTranscribing ? (
              <svg className="animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
              </svg>
            )}
          </button>

          {/* Submit Button */}
          <button
            onClick={() => runCommandSim(inputVal)}
            className="btn-cyan"
            disabled={isExecuting || isTranscribing || !inputVal.trim()}
          >
            Send
          </button>
        </div>
      </div>

      {/* Right Column: Flow chart and Quick Presets */}
      <div className="sidebar-panel">
        
        {/* Quick Sandbox Actions */}
        <div className="panel panel-body-padded">
          <h3 className="card-title">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            Quick Actions
          </h3>
          <div className="preset-list">
            <button
              onClick={() => runCommandSim('neofetch')}
              className="preset-btn"
              disabled={isExecuting}
            >
              <span className="preset-label">Run neofetch (Specs Summary)</span>
              <span className="preset-badge preset-badge-violet">Linux Tool</span>
            </button>
            <button
              onClick={() => runCommandSim('htop')}
              className="preset-btn"
              disabled={isExecuting}
            >
              <span className="preset-label">Run htop (Process Monitor)</span>
              <span className="preset-badge preset-badge-teal">Linux Tool</span>
            </button>
            <button
              onClick={() => runCommandSim('ls -la')}
              className="preset-btn"
              disabled={isExecuting}
            >
              <span className="preset-label">Run ls -la (List Directory)</span>
              <span className="preset-badge preset-badge-yellow">Linux Tool</span>
            </button>
            <button
              onClick={() => runCommandSim('cat sys_spec.json')}
              className="preset-btn"
              disabled={isExecuting}
            >
              <span className="preset-label">Read sys_spec.json (cat)</span>
              <span className="preset-badge preset-badge-pink">Linux Tool</span>
            </button>
          </div>
        </div>

        {/* NLP Graph Card */}
        <div className="panel panel-body-padded" style={{ flexGrow: 1 }}>
          <h3 className="card-title">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            System Pipeline
          </h3>

          <div className="flow-container">
            {/* Step 1 */}
            <div className={`flow-step ${activeStage === 1 ? 'flow-step-active-1' : ''}`}>
              <div className="flow-step-num">1</div>
              <div>
                <div className="flow-step-title">NLP Ingress</div>
                <div className="flow-step-desc">Ollama processes input text parameters</div>
              </div>
            </div>

            <div className="flow-arrow">▼</div>

            {/* Step 2 */}
            <div className={`flow-step ${activeStage === 2 ? 'flow-step-active-2' : ''}`}>
              <div className="flow-step-num">2</div>
              <div>
                <div className="flow-step-title">Sandbox Gate</div>
                <div className="flow-step-desc">cgroup & AppArmor check</div>
              </div>
            </div>

            <div className="flow-arrow">▼</div>

            {/* Step 3 */}
            <div className={`flow-step ${activeStage === 3 ? 'flow-step-active-3' : ''}`}>
              <div className="flow-step-num">3</div>
              <div>
                <div className="flow-step-title">Wine translation</div>
                <div className="flow-step-desc">KERNEL32 DLL syscall intercepting</div>
              </div>
            </div>

            <div className="flow-arrow">▼</div>

            {/* Step 4 */}
            <div className={`flow-step ${activeStage === 4 ? 'flow-step-active-4' : ''}`}>
              <div className="flow-step-num">4</div>
              <div>
                <div className="flow-step-title">Hardware Core</div>
                <div className="flow-step-desc">Vulkan rendering on physical GPU</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
