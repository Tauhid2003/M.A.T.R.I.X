import React, { useState, useEffect, useRef } from 'react';

export default function GameTab() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('matrix_hack_highscore') || '0', 10);
  });
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const canvasRef = useRef(null);
  const highScoreRef = useRef(highScore);
  const audioCtxRef = useRef(null);
  
  // Game state refs to keep variables fresh in callback loop
  const snakeRef = useRef([[10, 10], [10, 11], [10, 12]]);
  const directionRef = useRef('UP');
  const foodRef = useRef([5, 5]);
  const gameIntervalRef = useRef(null);

  const GRID_SIZE = 20;
  const CELL_COUNT = 20; // 20x20 grid

  // Play synthesized Web Audio sounds
  const playSound = (type) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      // Reuse single AudioContext to avoid browser limit (max ~6 concurrent)
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      
      if (type === 'eat') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1800, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'crash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.35);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'start') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.08); // C#
        osc.frequency.setValueAtTime(659.25, now + 0.16); // E
        osc.frequency.setValueAtTime(880.00, now + 0.24); // A
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (e) {
      console.warn("Sound blocked by browser permissions:", e);
    }
  };

  // Place food at random coordinate (not overlapping snake)
  const spawnFood = () => {
    let rx, ry;
    let overlapping = true;
    while (overlapping) {
      rx = Math.floor(Math.random() * CELL_COUNT);
      ry = Math.floor(Math.random() * CELL_COUNT);
      overlapping = snakeRef.current.some(part => part[0] === rx && part[1] === ry);
    }
    foodRef.current = [rx, ry];
  };

  const startGame = () => {
    playSound('start');
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    
    snakeRef.current = [[10, 10], [10, 11], [10, 12]];
    directionRef.current = 'UP';
    spawnFood();

    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    
    gameIntervalRef.current = setInterval(gameStep, 110);

    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.focus();
      }
    }, 50);
  };

  const stopGame = (didCrash = true) => {
    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    if (didCrash) {
      playSound('crash');
      setGameOver(true);
    } else {
      setGameStarted(false);
      setGameOver(false);
    }
  };

  const gameStep = () => {
    const snake = [...snakeRef.current];
    const head = [...snake[0]];
    const dir = directionRef.current;

    // Shift coordinates based on direction
    if (dir === 'UP') head[1] -= 1;
    else if (dir === 'DOWN') head[1] += 1;
    else if (dir === 'LEFT') head[0] -= 1;
    else if (dir === 'RIGHT') head[0] += 1;

    // Check bounds crash
    if (head[0] < 0 || head[0] >= CELL_COUNT || head[1] < 0 || head[1] >= CELL_COUNT) {
      stopGame(true);
      return;
    }

    // Check self collision crash
    if (snake.some(part => part[0] === head[0] && part[1] === head[1])) {
      stopGame(true);
      return;
    }

    // Insert new head
    snake.unshift(head);

    // Check eat data node
    if (head[0] === foodRef.current[0] && head[1] === foodRef.current[1]) {
      playSound('eat');
      setScore(prev => {
        const nextScore = prev + 10;
        if (nextScore > highScoreRef.current) {
          highScoreRef.current = nextScore;
          setHighScore(nextScore);
          localStorage.setItem('matrix_hack_highscore', nextScore.toString());
        }
        return nextScore;
      });
      spawnFood();
    } else {
      // Remove tail
      snake.pop();
    }

    snakeRef.current = snake;
    drawGameBoard();
  };

  const drawGameBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear board
    ctx.fillStyle = '#11000E'; // Rebrand deep aubergine
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid mesh lines (subtle matrix detail)
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.04)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < CELL_COUNT; i++) {
      ctx.beginPath();
      ctx.moveTo(i * GRID_SIZE, 0); ctx.lineTo(i * GRID_SIZE, canvas.height);
      ctx.moveTo(0, i * GRID_SIZE); ctx.lineTo(canvas.width, i * GRID_SIZE);
      ctx.stroke();
    }

    // Draw snake body stream (glowing code green)
    snakeRef.current.forEach((part, index) => {
      const x = part[0] * GRID_SIZE;
      const y = part[1] * GRID_SIZE;
      
      if (index === 0) {
        // Head
        ctx.fillStyle = '#00FFFF'; // accent-cyan (Canvas doesn't support CSS var())
        ctx.fillRect(x + 1, y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
        // Small core target box
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 6, y + 6, GRID_SIZE - 12, GRID_SIZE - 12);
      } else {
        // Body segment gradients
        const opacity = 1 - (index / snakeRef.current.length) * 0.7;
        ctx.fillStyle = `rgba(0, 255, 120, ${opacity})`;
        ctx.fillRect(x + 2, y + 2, GRID_SIZE - 4, GRID_SIZE - 4);
      }
    });

    // Draw authorization token node (pulsing data target)
    const fx = foodRef.current[0] * GRID_SIZE;
    const fy = foodRef.current[1] * GRID_SIZE;
    
    ctx.fillStyle = '#E95420'; // ubuntu-orange (Canvas doesn't support CSS var())
    ctx.beginPath();
    ctx.arc(fx + GRID_SIZE / 2, fy + GRID_SIZE / 2, GRID_SIZE / 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Glowing ring
    ctx.strokeStyle = 'rgba(233, 84, 32, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(fx + GRID_SIZE / 2, fy + GRID_SIZE / 2, GRID_SIZE / 2 + Math.sin(Date.now() / 150) * 2, 0, Math.PI * 2);
    ctx.stroke();
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key;

      // Support space bar starting
      if (!gameStarted || gameOver) {
        if (key === ' ' || key === 'Spacebar') {
          e.preventDefault();
          startGame();
        }
        return;
      }

      const currentDir = directionRef.current;

      if ((key === 'ArrowUp' || key === 'w') && currentDir !== 'DOWN') {
        directionRef.current = 'UP';
      } else if ((key === 'ArrowDown' || key === 's') && currentDir !== 'UP') {
        directionRef.current = 'DOWN';
      } else if ((key === 'ArrowLeft' || key === 'a') && currentDir !== 'RIGHT') {
        directionRef.current = 'LEFT';
      } else if ((key === 'ArrowRight' || key === 'd') && currentDir !== 'LEFT') {
        directionRef.current = 'RIGHT';
      }

      // Prevent page scrolling on arrow key press
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key)) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    };
  }, [gameStarted, gameOver]);

  // Animation draw loop
  useEffect(() => {
    let animFrame;
    const loop = () => {
      drawGameBoard();
      animFrame = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animFrame);
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', height: '100%', fontFamily: 'var(--font-sans)', color: '#FFF' }}>
      
      {/* Retro Arcade Viewport */}
      <div className="panel" style={{ background: '#0e000a', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        
        {/* Game Canvas Container */}
        <div style={{ border: '4px double rgba(0, 255, 255, 0.4)', borderRadius: '8px', padding: '4px', background: '#000', boxShadow: '0 0 20px rgba(0,255,255,0.1)' }}>
          <canvas 
            ref={canvasRef} 
            tabIndex={0}
            width={400} 
            height={400} 
            style={{ display: 'block', maxWidth: '100%', height: 'auto', background: '#11000E', outline: 'none' }} 
          />
        </div>

        {/* Overlay Overlay Screens */}
        {!gameStarted && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(16,0,10,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', borderRadius: '10px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 'bold', letterSpacing: '2px', color: 'var(--accent-cyan)', textShadow: '0 0 8px var(--accent-cyan)' }}>MATRIX CORE HACK</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: '300px', lineHeight: '1.4' }}>
              Control the glowing byte stream. Collect security bypass tokens to infiltrate system database structures.
            </span>
            <button onClick={(e) => { e.currentTarget.blur(); startGame(); }} className="btn-cyan" style={{ padding: '10px 24px', borderRadius: '30px', fontSize: '0.85rem' }}>
              ENGAGE OVERRIDE [Space]
            </button>
          </div>
        )}

        {gameOver && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,0,0,0.15)', backdropFilter: 'blur(3px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', borderRadius: '10px' }}>
            <div style={{ background: 'rgba(0,0,0,0.95)', border: '2px solid #FF5F56', padding: '24px', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#FF5F56', textShadow: '0 0 8px #FF5F56' }}>SYSTEM CRASHED</span>
              <span style={{ fontSize: '0.7rem', color: '#AAA' }}>Firewall boundaries breached the stream. Integrity failure detected.</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                <div>Score: <b style={{ color: 'var(--accent-cyan)' }}>{score}</b></div>
                <div>Record: <b style={{ color: 'var(--ubuntu-orange)' }}>{highScore}</b></div>
              </div>
              <button onClick={(e) => { e.currentTarget.blur(); startGame(); }} className="btn-build" style={{ width: '100%', borderRadius: '4px', padding: '8px 0', fontSize: '0.8rem' }}>
                RESTART SCAN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Arcade controls & descriptions */}
      <div className="panel panel-body-padded" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px', background: 'rgba(20,20,20,0.95)' }}>
        
        {/* Score Board */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--ubuntu-orange)', textTransform: 'uppercase', tracking: '1px' }}>SYSTEM DECODER SCORE</span>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <div className="daemon-stats-box" style={{ padding: '12px' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>CURRENT INGRESS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{score}</div>
            </div>
            <div className="daemon-stats-box" style={{ padding: '12px' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>DATABASE HIGHSCORE</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--ubuntu-orange)', fontFamily: 'var(--font-mono)' }}>{highScore}</div>
            </div>
          </div>
        </div>

        {/* Diagnostic info panel */}
        <div className="explain-box" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>🎮 OPERATIONAL KEYBINDINGS</span>
          <div style={{ fontSize: '0.65rem', display: 'flex', flexDirection: 'column', gap: '4px', color: '#BBB', fontFamily: 'var(--font-mono)' }}>
            <div>• Move Up: &nbsp; &nbsp; &nbsp; <b style={{ color: '#FFF' }}>ArrowUp / W</b></div>
            <div>• Move Down: &nbsp; &nbsp; <b style={{ color: '#FFF' }}>ArrowDown / S</b></div>
            <div>• Move Left: &nbsp; &nbsp; <b style={{ color: '#FFF' }}>ArrowLeft / A</b></div>
            <div>• Move Right: &nbsp; &nbsp; <b style={{ color: '#FFF' }}>ArrowRight / D</b></div>
            <div>• Start/Restart: &nbsp; <b style={{ color: '#FFF' }}>Spacebar</b></div>
          </div>
          
          <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--ubuntu-orange)', marginTop: '12px' }}>📋 OBJECTIVE DESCRIPTION</span>
          <p style={{ margin: 0, fontSize: '0.65rem', lineHeight: '1.4', color: '#999' }}>
            The green segment trail represents your active memory pointer stream. Guide it around the memory sectors to absorb Orange data nodes. Eating data increments your score by 10 and increases body length. Hitting walls or your own trail triggers immediate sandbox AppArmor terminations.
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={(e) => { e.currentTarget.blur(); startGame(); }} 
            disabled={gameStarted && !gameOver}
            className="btn-cyan" 
            style={{ flex: 1, padding: '10px 0', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}
          >
            Start Core Hack
          </button>
          <button 
            onClick={(e) => { e.currentTarget.blur(); stopGame(false); }} 
            disabled={!gameStarted || gameOver}
            className="btn-reset" 
            style={{ padding: '10px 16px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}
          >
            Terminate
          </button>
        </div>

      </div>

    </div>
  );
}
