const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

        // Canvas roundRect 类型声明
        interface CanvasRenderingContext2D {
            roundRect(x: number, y: number, w: number, h: number, r: number): void;
        }

        // 核心常量
        const cellSize = 100;
        const gridOffsetY = 100; // 顶部UI高度
        const gridRows = 7;
        const gridCols = 12;

        // 全局状态变量
        let sun = 75;
        let score = 0; // 当前击杀数
        let gameState = 'mainMenu'; // mainMenu, playing, gameOver
        let currentWave = 0;
        let waveTimer = 0;
        let zombiesToSpawn = 0;
        let zombiesToSpawnTotal = 0; // 该波僵尸总数
        let spawnDelayTimer = 0;
        let waveCompleted = true; // 是否处于波次间隔
        let mouse: { x: number | undefined, y: number | undefined, clicked: boolean } = { x: undefined, y: undefined, clicked: false };
        let hugeWaveTimer = 0; // 一大波僵尸提示计时器
        let hugeWaveTriggered = false; // 是否已触发大波次
        let highScore = 0;

        // --- IndexedDB 数据库系统 ---
        const DB_NAME = 'PvZ_Roguelike_DB';
        const DB_VERSION = 1;
        const STORE_NAME = 'game_stats';

        function initDB(): Promise<IDBDatabase> {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME);
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        async function saveHighScore(score: number) {
            const db = await initDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put(score, 'high_score');
            return new Promise((resolve) => {
                tx.oncomplete = () => resolve(true);
            });
        }

        async function loadHighScore() {
            try {
                const db = await initDB();
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const request = store.get('high_score');
                request.onsuccess = () => {
                    if (request.result !== undefined) {
                        highScore = request.result;
                    } else {
                        // 兼容旧版 localStorage 数据
                        const oldScore = localStorage.getItem('pvz_high_score');
                        if (oldScore) {
                            highScore = parseInt(oldScore);
                            saveHighScore(highScore);
                        }
                    }
                };
            } catch (e) {
                console.error('Failed to load high score from DB', e);
            }
        }
        loadHighScore(); // 异步启动加载

        // 对象池
        let grids = [];
        let plants = [];
        let zombies = [];
        let bullets = [];
        let suns = [];
        let explosions = [];
        let lawnmowers = [];
        let floatingTexts = [];
        let screenShake = 0;
        let menuParticles = [];
        let sunSpawnAccum = 0;
        let eatSoundAccum = 0;

        function updateMousePos(e) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            mouse.x = (e.clientX - rect.left) * scaleX;
            mouse.y = (e.clientY - rect.top) * scaleY;
        }

        canvas.addEventListener('mousemove', (e) => updateMousePos(e));
        canvas.addEventListener('mouseleave', () => { mouse.x = undefined; mouse.y = undefined; });
        canvas.addEventListener('mousedown', (e) => { updateMousePos(e); mouse.clicked = true; });
        canvas.addEventListener('mouseup', () => { mouse.clicked = false; });

        // 音效管理
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContext();
        let globalVolume = parseFloat(localStorage.getItem('pvz_volume') || '0.5');

        function playSound(type: string) {
            if (!audioCtx || globalVolume <= 0) return;
            if (audioCtx.state === 'suspended') audioCtx.resume();
            
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();
            
            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            const now = audioCtx.currentTime;
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, now); // 默认低通滤波，过滤刺耳高频

            if (type === 'shoot') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
                gainNode.gain.setValueAtTime(0.15 * globalVolume, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now); osc.stop(now + 0.1);
            } else if (type === 'plant') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.linearRampToValueAtTime(400, now + 0.1);
                gainNode.gain.setValueAtTime(0.15 * globalVolume, now);
                gainNode.gain.linearRampToValueAtTime(0.01, now + 0.1);
                osc.start(now); osc.stop(now + 0.1);
            } else if (type === 'explosion') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(80, now);
                osc.frequency.exponentialRampToValueAtTime(20, now + 0.4);
                gainNode.gain.setValueAtTime(0.4 * globalVolume, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                osc.start(now); osc.stop(now + 0.4);
            } else if (type === 'eat') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(120, now);
                osc.frequency.linearRampToValueAtTime(80, now + 0.12);
                gainNode.gain.setValueAtTime(0.08 * globalVolume, now);
                gainNode.gain.linearRampToValueAtTime(0.01, now + 0.12);
                osc.start(now); osc.stop(now + 0.12);
            } else if (type === 'chomp') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.linearRampToValueAtTime(40, now + 0.25);
                gainNode.gain.setValueAtTime(0.25 * globalVolume, now);
                gainNode.gain.linearRampToValueAtTime(0.01, now + 0.25);
                osc.start(now); osc.stop(now + 0.25);
            } else if (type === 'button') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                gainNode.gain.setValueAtTime(0.05 * globalVolume, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now); osc.stop(now + 0.1);
            } else if (type === 'shovel') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(120, now);
                osc.frequency.exponentialRampToValueAtTime(10, now + 0.25);
                gainNode.gain.setValueAtTime(0.2 * globalVolume, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                osc.start(now); osc.stop(now + 0.25);
            } else if (type === 'card') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(450, now + 0.08);
                gainNode.gain.setValueAtTime(0.06 * globalVolume, now);
                gainNode.gain.linearRampToValueAtTime(0.01, now + 0.08);
                osc.start(now); osc.stop(now + 0.08);
            } else if (type === 'hit') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(150, now);
                gainNode.gain.setValueAtTime(0.1 * globalVolume, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now); osc.stop(now + 0.05);
            } else if (type === 'hit_shield') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                gainNode.gain.setValueAtTime(0.08 * globalVolume, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now); osc.stop(now + 0.05);
            }
        }

        const sunSpawnInterval = 18000; // 18s 天降阳光间隔

        const plantTemplates = [
            { type: 'Sunflower', cost: 50, name: '向日葵', cd: 1500 },
            { type: 'Peashooter', cost: 100, name: '豌豆', cd: 1500 },
            { type: 'SnowPea', cost: 175, name: '寒冰', cd: 1500 },
            { type: 'Wallnut', cost: 50, name: '坚果', cd: 15000 },
            { type: 'PotatoMine', cost: 25, name: '土豆雷', cd: 10000 },
            { type: 'CherryBomb', cost: 150, name: '樱桃', cd: 25000 },
            { type: 'Repeater', cost: 200, name: '双发', cd: 1500 },
            { type: 'Squash', cost: 50, name: '窝瓜', cd: 15000 },
            { type: 'Tallnut', cost: 125, name: '高坚果', cd: 15000 },
            { type: 'Jalapeno', cost: 125, name: '辣椒', cd: 25000 },
            { type: 'Threepeater', cost: 325, name: '三线', cd: 1500 },
            { type: 'Chomper', cost: 150, name: '大嘴花', cd: 7500 },
            { type: 'PuffShroom', cost: 0, name: '小喷菇', cd: 7500 },
            { type: 'Spikeweed', cost: 100, name: '地刺', cd: 7500 },
            { type: 'SunShroom', cost: 25, name: '阳光菇', cd: 1500 },
            { type: 'FumeShroom', cost: 75, name: '大喷菇', cd: 1500 },
            { type: 'ScaredyShroom', cost: 25, name: '胆小菇', cd: 1500 },
            { type: 'IceShroom', cost: 75, name: '冰菇', cd: 25000 },
            { type: 'Torchwood', cost: 175, name: '火炬树', cd: 1500 },
            { type: 'Garlic', cost: 50, name: '大蒜', cd: 15000 },
            { type: 'Starfruit', cost: 125, name: '杨桃', cd: 1500 },
            { type: 'SplitPea', cost: 125, name: '裂荚', cd: 1500 }
        ];
        
        let cards: { type: string, cost: number, name: string, cd: number, currentCd: number }[] = [];
        const maxCards = 9; // 最大携带卡牌数

        let selectedCard = { type: null, cost: 0, isEmpty: true, isShovel: false, index: -1 };

        const plantIcons = {
            Peashooter: (x, y, scale = 1, alpha = 1) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#33691e'; // 底座
                ctx.beginPath(); ctx.ellipse(0, 25, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(0, 25, 20, 8, Math.PI / 2, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#8bc34a'; // 头
                ctx.beginPath(); ctx.arc(0, -5, 20, 0, Math.PI * 2); ctx.fill();
                ctx.fillRect(15, -15, 20, 20); // 嘴
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(5, -10, 4, 0, Math.PI * 2); ctx.fill(); // 眼睛
                ctx.restore();
            },
            SnowPea: (x, y, scale = 1, alpha = 1) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#006064';
                ctx.beginPath(); ctx.ellipse(0, 25, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#00bcd4'; // 冰蓝头
                ctx.beginPath(); ctx.arc(0, -5, 20, 0, Math.PI * 2); ctx.fill();
                ctx.fillRect(15, -15, 20, 20);
                // 冰晶装饰
                ctx.fillStyle = '#e0f7fa'; ctx.beginPath(); ctx.moveTo(-15, -20); ctx.lineTo(-5, -30); ctx.lineTo(0, -25); ctx.fill();
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(5, -10, 4, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            },
            Sunflower: (x, y, scale = 1, alpha = 1) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#8bc34a'; ctx.fillRect(-4, 0, 8, 30); // 茎
                for (let i = 0; i < 10; i++) { // 花瓣
                    ctx.fillStyle = '#fbc02d'; ctx.beginPath();
                    ctx.ellipse(Math.cos(i * Math.PI / 5) * 18, Math.sin(i * Math.PI / 5) * 18, 14, 6, i * Math.PI / 5, 0, Math.PI * 2); ctx.fill();
                }
                ctx.fillStyle = '#8d6e63'; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill(); // 脸
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-5, -3, 2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(5, -3, 2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(0, 5, 5, 0, Math.PI); ctx.stroke();
                ctx.restore();
            },
            Wallnut: (x, y, scale = 1, alpha = 1) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#795548'; ctx.beginPath(); ctx.ellipse(0, 5, 24, 30, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-8, -2, 3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(8, -2, 3, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(-6, 12); ctx.lineTo(6, 12); ctx.stroke();
                ctx.restore();
            },
            PotatoMine: (x, y, scale = 1, alpha = 1, isArmed = true) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                if (!isArmed) {
                    ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.arc(0, 20, 15, 0, Math.PI); ctx.fill(); // 埋在土里
                    ctx.fillStyle = '#ff5252'; ctx.beginPath(); ctx.arc(0, 15, 4, 0, Math.PI * 2); ctx.fill(); // 警报灯
                } else {
                    ctx.fillStyle = '#8d6e63'; ctx.beginPath(); ctx.ellipse(0, 15, 20, 15, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-8, 12, 3, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(8, 12, 3, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#ff5252'; ctx.fillRect(-2, -5, 4, 10); ctx.beginPath(); ctx.arc(0, -5, 6, 0, Math.PI * 2); ctx.fill(); // 天线
                }
                ctx.restore();
            },
            CherryBomb: (x, y, scale = 1, alpha = 1) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#33691e'; ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(-10, -15); ctx.lineTo(10, -15); ctx.stroke();
                ctx.fillStyle = '#e53935';
                ctx.beginPath(); ctx.arc(-12, 5, 16, 0, Math.PI * 2); ctx.fill(); // 左樱桃
                ctx.beginPath(); ctx.arc(12, 5, 16, 0, Math.PI * 2); ctx.fill(); // 右樱桃
                ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.arc(-16, 2, 2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(-8, 2, 2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(8, 2, 2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(16, 2, 2, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            },
            Repeater: (x, y, scale = 1, alpha = 1) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#1b5e20'; // darker base
                ctx.beginPath(); ctx.ellipse(0, 25, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(0, 25, 20, 8, Math.PI / 2, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#689f38'; // darker head
                ctx.beginPath(); ctx.arc(0, -5, 20, 0, Math.PI * 2); ctx.fill();
                ctx.fillRect(15, -15, 20, 20); // main mouth
                ctx.fillStyle = '#558b2f'; ctx.fillRect(30, -12, 8, 14); // second barrel
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(5, -10, 4, 0, Math.PI * 2); ctx.fill(); 
                // angry eyebrows
                ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(10, -12); ctx.lineWidth = 2; ctx.stroke();
                ctx.restore();
            },
            Squash: (x, y, scale = 1, alpha = 1) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#558b2f'; 
                ctx.beginPath(); ctx.ellipse(0, 5, 22, 25, 0, 0, Math.PI * 2); ctx.fill();
                // angry eyes
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(-8, -2, 5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(8, -2, 5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#d32f2f'; // red pupils
                ctx.beginPath(); ctx.arc(-8, -2, 2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(8, -2, 2, 0, Math.PI * 2); ctx.fill();
                // heavy unibrow
                ctx.fillStyle = '#33691e'; ctx.fillRect(-15, -10, 30, 4);
                ctx.restore();
            },
            Tallnut: (x, y, scale = 1, alpha = 1) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.ellipse(0, 0, 26, 40, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-8, -10, 4, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(8, -10, 4, 0, Math.PI * 2); ctx.fill();
                ctx.lineWidth = 2; ctx.strokeStyle = '#3e2723';
                ctx.beginPath(); ctx.moveTo(-16, -18); ctx.lineTo(-4, -14); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(16, -18); ctx.lineTo(4, -14); ctx.stroke();
                ctx.restore();
            },
            Jalapeno: (x, y, scale = 1, alpha = 1) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#d32f2f'; ctx.beginPath();
                ctx.ellipse(0, 5, 14, 28, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.moveTo(0, 33); ctx.lineTo(15, 20); ctx.lineTo(5, 10); ctx.fill();
                ctx.fillStyle = '#33691e'; ctx.beginPath(); ctx.ellipse(0, -23, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-4, -5, 2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(4, -5, 2, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            },
            Threepeater: (x, y, scale = 1, alpha = 1) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#33691e'; ctx.beginPath(); ctx.ellipse(0, 25, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
                const drawHead = (hx: number, hy: number) => {
                    ctx.save(); ctx.translate(hx, hy);
                    ctx.fillStyle = '#8bc34a'; ctx.beginPath(); ctx.arc(0, -5, 14, 0, Math.PI * 2); ctx.fill();
                    ctx.fillRect(8, -12, 14, 14); 
                    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(4, -8, 3, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                };
                drawHead(-10, 8);  
                drawHead(0, -15);  
                drawHead(12, 5);   
                ctx.restore();
            },
            Chomper: (x, y, scale = 1, alpha = 1) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#33691e'; ctx.fillRect(-4, 0, 8, 30); // stem
                ctx.fillStyle = '#7b1fa2'; // purple head
                ctx.beginPath(); ctx.arc(0, -10, 20, Math.PI, 0); ctx.fill(); // top jaw
                ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI); ctx.fill(); // bottom jaw
                // teeth
                ctx.fillStyle = '#fff';
                for(let i=-15; i<=15; i+=10) {
                    ctx.beginPath(); ctx.moveTo(i, -10); ctx.lineTo(i+4, -2); ctx.lineTo(i+8, -10); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i+4, -8); ctx.lineTo(i+8, 0); ctx.fill();
                }
                ctx.restore();
            },
            PuffShroom: (x, y, scale = 1, alpha = 1) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#b39ddb'; // light purple
                ctx.beginPath(); ctx.ellipse(0, 15, 12, 10, 0, 0, Math.PI*2); ctx.fill(); // base
                ctx.fillStyle = '#673ab7'; // dark purple cap
                ctx.beginPath(); ctx.arc(0, 0, 16, Math.PI, 0); ctx.fill();
                // spots
                ctx.fillStyle = '#9575cd'; ctx.beginPath(); ctx.arc(-6, -8, 4, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(8, -5, 3, 0, Math.PI*2); ctx.fill();
                // eyes
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(4, 12, 2, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            },
            Spikeweed: (x, y, scale = 1, alpha = 1) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#757575'; // base
                ctx.beginPath(); ctx.ellipse(0, 20, 25, 8, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#9e9e9e'; // spikes
                for(let i=-20; i<=20; i+=10) {
                    ctx.beginPath(); ctx.moveTo(i-4, 20); ctx.lineTo(i, 5); ctx.lineTo(i+4, 20); ctx.fill();
                }
                ctx.restore();
            },
            SunShroom: (x, y, scale = 1, alpha = 1) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.arc(0, 0, 16, Math.PI, 0); ctx.fill();
                ctx.fillStyle = '#fff9c4'; ctx.beginPath(); ctx.ellipse(0, 15, 12, 8, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-4, -5, 2, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(4, -5, 2, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            },
            FumeShroom: (x, y, scale = 1, alpha = 1) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#7e57c2'; ctx.beginPath(); ctx.ellipse(0, 15, 16, 12, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#512da8'; ctx.beginPath(); ctx.arc(0, 0, 24, Math.PI, 0); ctx.fill();
                ctx.fillStyle = '#b39ddb'; ctx.beginPath(); ctx.arc(15, -10, 6, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(6, 12, 3, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            },
            ScaredyShroom: (x, y, scale = 1, alpha = 1) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#ce93d8'; ctx.fillRect(-4, 0, 8, 25);
                ctx.fillStyle = '#8e24aa'; ctx.beginPath(); ctx.arc(0, -5, 12, Math.PI, 0); ctx.fill();
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-4, 5, 2, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            },
            IceShroom: (x, y, scale = 1, alpha = 1) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#4dd0e1'; ctx.beginPath(); ctx.ellipse(0, 15, 20, 10, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#00acc1'; ctx.beginPath(); ctx.moveTo(-25, 10); ctx.lineTo(0, -15); ctx.lineTo(25, 10); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-8, 5, 3, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(8, 5, 3, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            },
            Torchwood: (x, y, scale = 1, alpha = 1) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#795548'; ctx.fillRect(-15, 0, 30, 25); // 树干
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-5, 10, 3, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(5, 10, 3, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#ff5722'; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-10, -20); ctx.lineTo(0, -10); ctx.lineTo(10, -25); ctx.lineTo(20, 0); ctx.fill(); // 火焰
                ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(0, -15); ctx.lineTo(10, 0); ctx.fill();
                ctx.restore();
            },
            Garlic: (x, y, scale = 1, alpha = 1) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#f5f5f5'; ctx.beginPath(); ctx.ellipse(0, 5, 20, 25, 0, 0, Math.PI*2); ctx.fill();
                ctx.strokeStyle = '#bdbdbd'; ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(0, -20); ctx.stroke();
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-8, 0, 2, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(8, 0, 2, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(0, 10, 4, Math.PI, 0); ctx.stroke();
                ctx.restore();
            },
            Starfruit: (x, y, scale = 1, alpha = 1) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#ffee58';
                ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(5, -5); ctx.lineTo(20, -5); ctx.lineTo(8, 5); ctx.lineTo(12, 20); ctx.lineTo(0, 10); ctx.lineTo(-12, 20); ctx.lineTo(-8, 5); ctx.lineTo(-20, -5); ctx.lineTo(-5, -5); ctx.fill();
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-4, 0, 3, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(4, 0, 3, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            },
            SplitPea: (x, y, scale = 1, alpha = 1) => {
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#689f38'; ctx.beginPath(); ctx.arc(10, -5, 14, 0, Math.PI*2); ctx.fill(); ctx.fillRect(15, -12, 12, 14); // right head
                ctx.beginPath(); ctx.arc(-10, 0, 16, 0, Math.PI*2); ctx.fill(); ctx.fillRect(-26, -8, 16, 16); // left head
                ctx.fillStyle = '#1b5e20'; ctx.beginPath(); ctx.ellipse(0, 25, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(15, -8, 2, 0, Math.PI*2); ctx.fill(); // right eye
                ctx.beginPath(); ctx.arc(-12, -4, 3, 0, Math.PI*2); ctx.fill(); // left eye
                ctx.restore();
            }
        };

        class Cell {
            x: number; y: number; width: number; height: number;
            constructor(x: number, y: number) { this.x = x; this.y = y; this.width = cellSize; this.height = cellSize; }
            draw() {
                const colIndex = this.x / cellSize;
                const rowIndex = (this.y - gridOffsetY) / cellSize;
                
                if (colIndex === 0) {
                    // 最左侧推车区域，绘制地砖/庭院石板而不是草皮
                    ctx.fillStyle = (colIndex + rowIndex) % 2 === 0 ? '#a1887f' : '#8d6e63'; // 砖块质感颜色
                    ctx.fillRect(this.x, this.y, this.width, this.height);
                    // 绘制地砖缝隙
                    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2;
                    ctx.strokeRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4);
                } else {
                    // 草皮区域
                    ctx.fillStyle = (colIndex + rowIndex) % 2 === 0 ? '#689f38' : '#558b2f';
                    ctx.fillRect(this.x, this.y, this.width, this.height);
                }

                if (mouse.x && mouse.y && mouse.x >= this.x && mouse.x < this.x + this.width &&
                    mouse.y >= this.y && mouse.y < this.y + this.height && !selectedCard.isEmpty && mouse.y >= gridOffsetY) {
                    
                    if (selectedCard.isShovel) {
                        // 铲子模式：只在有植物的格子上显示红色警告
                        const hasPlant = plants.some(p => p.x === this.x && p.y === this.y && !p.markedForDeletion);
                        if (hasPlant) {
                            ctx.fillStyle = 'rgba(244, 67, 54, 0.5)';
                            ctx.fillRect(this.x, this.y, this.width, this.height);
                            ctx.strokeStyle = '#d32f2f'; ctx.lineWidth = 3;
                            ctx.setLineDash([5, 3]);
                            ctx.strokeRect(this.x + 3, this.y + 3, this.width - 6, this.height - 6);
                            ctx.setLineDash([]);
                        }
                    } else if (colIndex === 0 || colIndex >= gridCols) {
                        // 推车区域和越界区域不可种植，显示禁止红叉
                        ctx.fillStyle = 'rgba(244, 67, 54, 0.4)';
                        ctx.fillRect(this.x, this.y, this.width, this.height);
                        ctx.strokeStyle = '#d32f2f'; ctx.lineWidth = 4;
                        ctx.beginPath(); ctx.moveTo(this.x + 20, this.y + 20); ctx.lineTo(this.x + 80, this.y + 80); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(this.x + 80, this.y + 20); ctx.lineTo(this.x + 20, this.y + 80); ctx.stroke();
                    } else {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                        ctx.fillRect(this.x, this.y, this.width, this.height);
                        plantIcons[selectedCard.type](this.x + 50, this.y + 50, 1, 0.5); // 半透明预览
                    }
                }
            }
        }

        function drawUI() {
            // 高级木纹导航栏
            const uiGrad = ctx.createLinearGradient(0, 0, 0, gridOffsetY);
            uiGrad.addColorStop(0, '#4e342e'); uiGrad.addColorStop(1, '#3e2723');
            ctx.fillStyle = uiGrad; ctx.fillRect(0, 0, canvas.width, gridOffsetY);
            ctx.fillStyle = '#212121'; ctx.fillRect(0, gridOffsetY - 4, canvas.width, 4);

            // 阳光计分板
            ctx.fillStyle = '#271915'; ctx.beginPath(); ctx.roundRect(15, 15, 100, 70, 10); ctx.fill();
            ctx.beginPath(); ctx.arc(40, 50, 18, 0, Math.PI * 2); ctx.fillStyle = '#ffeb3b'; ctx.fill(); ctx.strokeStyle = '#fbc02d'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Inter'; ctx.textAlign = 'center'; ctx.fillText(sun.toString(), 85, 58);

            // 巨大波次提示 UI
            if (hugeWaveTimer > 0) {
                ctx.fillStyle = `rgba(255, 0, 0, ${Math.abs(Math.sin(Date.now() * 0.003)) * 0.2})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ff5252'; ctx.font = 'bold 50px Inter'; ctx.textAlign = 'center';
                ctx.shadowColor = '#000'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 5;
                ctx.fillText('一大波僵尸正在接近！', canvas.width / 2, canvas.height / 2);
                ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
            }

            // 绘制植物卡片
            for (let i = 0; i < cards.length; i++) {
                const cardX = 140 + i * 85; const cardY = 10; const cardW = 75; const cardH = 80;
                const canAfford = sun >= cards[i].cost && cards[i].currentCd <= 0;

                ctx.fillStyle = canAfford ? '#795548' : '#3e2723';
                ctx.beginPath(); ctx.roundRect(cardX, cardY, cardW, cardH, 8); ctx.fill();

                if (selectedCard.type === cards[i].type) {
                    ctx.strokeStyle = '#aeea00'; ctx.lineWidth = 3; ctx.strokeRect(cardX - 1, cardY - 1, cardW + 2, cardH + 2);
                }

                plantIcons[cards[i].type](cardX + cardW / 2, cardY + 30, 0.7, canAfford ? 1 : 0.4);

                ctx.fillStyle = canAfford ? '#fff' : '#9e9e9e'; ctx.font = 'bold 14px Inter'; ctx.textAlign = 'center';
                ctx.fillText(cards[i].cost.toString(), cardX + cardW / 2, cardY + 70);

                if (!canAfford) {
                    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(cardX, cardY, cardW, cardH, 8); ctx.fill();
                }

                // CD 遮罩动画 (顺时针旋转扇形)
                if (cards[i].currentCd > 0) {
                    const cdRatio = cards[i].currentCd / cards[i].cd;
                    
                    ctx.save();
                    // 设置圆角矩形作为裁切蒙版，完美适配卡片边框
                    ctx.beginPath();
                    ctx.roundRect(cardX, cardY, cardW, cardH, 8);
                    ctx.clip();
                    
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
                    ctx.beginPath();
                    ctx.moveTo(cardX + cardW / 2, cardY + cardH / 2);
                    // 半径加长到 100 保证能完全覆盖卡片的对角线角落
                    ctx.arc(cardX + cardW / 2, cardY + cardH / 2, 100, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cdRatio, false);
                    ctx.fill();
                    
                    ctx.restore();
                    
                    // 显示冷却倒计时秒数
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Inter'; ctx.textAlign = 'center';
                    ctx.fillText(Math.ceil(cards[i].currentCd / 1000).toString(), cardX + cardW / 2, cardY + 45);
                }

                if (mouse.clicked && mouse.x >= cardX && mouse.x <= cardX + cardW && mouse.y >= cardY && mouse.y <= cardY + cardH) {
                    if (canAfford) {
                        selectedCard = selectedCard.type === cards[i].type ? { type: null, cost: 0, isEmpty: true, isShovel: false, index: -1 } : { type: cards[i].type, cost: cards[i].cost, isEmpty: false, isShovel: false, index: i };
                    }
                    mouse.clicked = false;
                }
            }

            // 绘制铲子
            const shovelX = canvas.width - 180;
            const shovelY = 15;
            ctx.fillStyle = selectedCard.isShovel ? '#795548' : '#3e2723';
            ctx.beginPath(); ctx.roundRect(shovelX, shovelY, 60, 70, 8); ctx.fill();
            if (selectedCard.isShovel) {
                ctx.strokeStyle = '#aeea00'; ctx.lineWidth = 3; ctx.strokeRect(shovelX - 1, shovelY - 1, 62, 72);
            }
            ctx.save(); ctx.translate(shovelX + 30, shovelY + 35);
            ctx.fillStyle = '#bcaaa4'; ctx.fillRect(-4, -15, 8, 30);
            ctx.fillStyle = '#78909c'; ctx.beginPath(); ctx.moveTo(-15, -15); ctx.lineTo(15, -15); ctx.lineTo(10, -30); ctx.lineTo(-10, -30); ctx.fill();
            ctx.restore();
            
            if (mouse.clicked && mouse.x >= shovelX && mouse.x <= shovelX + 60 && mouse.y >= shovelY && mouse.y <= shovelY + 70) {
                selectedCard = selectedCard.isShovel ? { type: null, cost: 0, isEmpty: true, isShovel: false, index: -1 } : { type: null, cost: 0, isEmpty: false, isShovel: true, index: -1 };
                mouse.clicked = false;
            }

            // 右上角菜单按钮与进度提示
            const menuBtnX = canvas.width - 100;
            const menuBtnY = 15;
            const menuBtnW = 85;
            const menuBtnH = 35;

            // 绘制菜单按钮
            ctx.fillStyle = '#d84315'; 
            ctx.beginPath(); ctx.roundRect(menuBtnX, menuBtnY, menuBtnW, menuBtnH, 8); ctx.fill();
            ctx.strokeStyle = '#ff8a65'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Inter'; ctx.textAlign = 'center';
            ctx.fillText('菜单', menuBtnX + menuBtnW / 2, menuBtnY + 23);

            // 进度条尺寸与位置计算
            const barW = 160; const barH = 20;
            const barX = shovelX - 25 - barW; 
            const barY = shovelY + 45 - barH / 2; // 稍微下移，给上方的文字留出空间

            // 进度条边框与底色
            ctx.fillStyle = '#1b1b1b'; // 深灰底色
            ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 11); ctx.fill();
            ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 11); ctx.stroke();
            
            // 进度条发光与高光填充
            if (zombiesToSpawnTotal > 0) {
                const killedInWave = zombiesToSpawnTotal - zombiesToSpawn - zombies.length;
                let progress = killedInWave / zombiesToSpawnTotal;
                if (progress < 0) progress = 0;
                if (progress > 1) progress = 1;
                
                if (progress > 0) {
                    ctx.save();
                    // 裁切区域，让进度条遵守圆角
                    ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 11); ctx.clip();
                    
                    // 渐变色
                    const grad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
                    grad.addColorStop(0, '#76ff03');
                    grad.addColorStop(0.5, '#64dd17');
                    grad.addColorStop(1, '#33691e');
                    ctx.fillStyle = grad;
                    ctx.fillRect(barX, barY, barW * progress, barH);
                    
                    // 顶部高光
                    ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.fillRect(barX, barY, barW * progress, barH / 3);
                    
                    ctx.restore();
                }
            }

            // 在进度条右侧画一个小旗子作为终点标志
            ctx.save(); ctx.translate(barX + barW - 5, barY - 5);
            ctx.fillStyle = '#795548'; ctx.fillRect(0, 0, 3, 24); // 旗杆
            ctx.fillStyle = '#d32f2f'; ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(15, 6); ctx.lineTo(3, 12); ctx.fill(); // 红旗
            ctx.restore();

            // 波次文本居中在进度条上方
            ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Inter'; ctx.textAlign = 'center';
            ctx.shadowColor = '#000'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
            ctx.fillText(`第 ${currentWave} 波`, barX + barW / 2, barY - 8);
            ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

            // 按钮点击检测
            if (mouse.clicked && mouse.x >= menuBtnX && mouse.x <= menuBtnX + menuBtnW && mouse.y >= menuBtnY && mouse.y <= menuBtnY + menuBtnH) {
                playSound('button');
                gameState = 'paused';
                mouse.clicked = false;
            }
        }

        class FloatingText {
            x: number; y: number; text: string; color: string; life: number; markedForDeletion: boolean;
            constructor(x: number, y: number, text: string, color = '#ffeb3b') {
                this.x = x; this.y = y; this.text = text; this.color = color;
                this.life = 667; this.markedForDeletion = false;
            }
            update(dt: number) {
                this.y -= 0.06 * dt; this.life -= dt;
                if (this.life <= 0) this.markedForDeletion = true;
            }
            draw() {
                ctx.save(); ctx.globalAlpha = Math.max(0, this.life / 667);
                ctx.fillStyle = this.color; ctx.font = 'bold 20px Inter'; ctx.textAlign = 'center';
                ctx.fillText(this.text, this.x, this.y);
                ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeText(this.text, this.x, this.y);
                ctx.restore();
            }
        }

        class Sun {
            x: number; y: number; targetY: number; radius: number; value: number; markedForDeletion: boolean; lifeTimer: number; isCollected: boolean;
            constructor(x: number, y: number, targetY: number, value = 25) {
                this.x = x; this.y = y; this.targetY = targetY;
                this.value = value;
                this.radius = value === 15 ? 16 : 22; this.markedForDeletion = false;
                this.lifeTimer = 0; this.isCollected = false;
            }
            update(dt: number) {
                if (this.isCollected) {
                    const destX = 40; const destY = 50;
                    this.x += (destX - this.x) * 6 * dt / 1000;
                    this.y += (destY - this.y) * 6 * dt / 1000;
                    if (Math.abs(this.x - destX) < 5 && Math.abs(this.y - destY) < 5) {
                        sun += this.value; this.markedForDeletion = true;
                        floatingTexts.push(new FloatingText(destX + 20, destY + 20, `+${this.value}`));
                    }
                    return;
                }

                if (this.y < this.targetY) this.y += 0.048 * dt;
                else {
                    this.lifeTimer += dt;
                    if (this.lifeTimer > 13333) this.markedForDeletion = true;
                }

                if (mouse.clicked && mouse.x !== undefined && mouse.y !== undefined && Math.hypot(mouse.x - this.x, mouse.y - this.y) < this.radius + 15) {
                    this.isCollected = true; mouse.clicked = false;
                }
            }
            draw() {
                const now = Date.now();
                ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(now * 0.0006);
                const alpha = this.isCollected ? 1 : Math.max(0.2, 1 - this.lifeTimer / 13333);
                for (let i = 0; i < 8; i++) {
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * Math.PI / 4) * 28, Math.sin(i * Math.PI / 4) * 28);
                    ctx.strokeStyle = `rgba(255, 235, 59, ${alpha})`; ctx.lineWidth = 3; ctx.stroke();
                }
                ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 235, 59, ${alpha})`; ctx.fill();
                ctx.strokeStyle = '#fbc02d'; ctx.lineWidth = 2; ctx.stroke();
                ctx.restore();
            }
        }

        class Bullet {
            x: number; y: number; vx: number; vy: number; width: number; height: number; damage: number; markedForDeletion: boolean; type: string; targetVy: number; spawnX: number; isThreepeater: boolean;
            constructor(x: number, y: number, vx: number, vy: number, type = 'normal', isThreepeater = false) {
                this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.width = 16; this.height = 16;
                this.damage = 20; this.markedForDeletion = false; this.type = type;
                this.targetVy = vy; // 保存目标垂直速度
                this.spawnX = x;
                this.isThreepeater = isThreepeater;
                
                if (isThreepeater) this.vy = 0; // 初始垂直速度为0

                if (type === 'snow') this.damage = 20;
                if (type === 'fire') this.damage = 40;
                if (type === 'star') { this.damage = 20; this.width = 20; this.height = 20; }
            }
            update(dt: number) {
                if (this.isThreepeater && this.x > this.spawnX + cellSize) {
                    this.vy = this.targetVy;
                    this.isThreepeater = false;
                }
                this.x += this.vx * dt / 16.67;
                this.y += this.vy * dt / 16.67;
                if (this.x > canvas.width || this.x < 0 || this.y < 0 || this.y > canvas.height) this.markedForDeletion = true;
            }
            draw() {
                ctx.save(); ctx.translate(this.x, this.y);
                if (this.type === 'star') {
                    ctx.fillStyle = '#ffee58'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(3, -2); ctx.lineTo(10, -2); ctx.lineTo(4, 3); ctx.lineTo(6, 10); ctx.lineTo(0, 5); ctx.lineTo(-6, 10); ctx.lineTo(-4, 3); ctx.lineTo(-10, -2); ctx.lineTo(-3, -2); ctx.fill();
                } else {
                    ctx.beginPath(); ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
                    if (this.type === 'fire') { ctx.fillStyle = '#ff5722'; ctx.strokeStyle = '#bf360c'; }
                    else if (this.type === 'snow') { ctx.fillStyle = '#00bcd4'; ctx.strokeStyle = '#00838f'; }
                    else { ctx.fillStyle = '#aeea00'; ctx.strokeStyle = '#558b2f'; }
                    ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
                }
                ctx.restore();
            }
        }

        class Explosion {
            x: number; y: number; radius: number; maxRadius: number; life: number; markedForDeletion: boolean; isSquash: boolean; isFume: boolean; type: string; particles: any[];
            constructor(x: number, y: number, type = 'normal') {
                this.x = x; this.y = y; this.radius = 10; this.maxRadius = cellSize * 1.5;
                this.life = 500; this.markedForDeletion = false;
                this.type = type;
                this.isSquash = type === 'squash'; this.isFume = type === 'fume';
                this.particles = [];

                if (this.isFume) { this.radius = 15; this.maxRadius = 30; this.life = 250; }
                else if (this.isSquash) { screenShake = 15; this.maxRadius = cellSize; }
                else if (type === 'cherry') {
                    screenShake = 35; this.maxRadius = cellSize * 2;
                    for(let i=0; i<30; i++) {
                        this.particles.push({
                            x: 0, y: 0,
                            vx: (Math.random() - 0.5) * 25, vy: (Math.random() - 0.5) * 25,
                            size: Math.random() * 12 + 6,
                            color: Math.random() > 0.3 ? '#d32f2f' : '#ffeb3b'
                        });
                    }
                } else if (type === 'fire_row') {
                    screenShake = 10; this.maxRadius = cellSize;
                    for(let i=0; i<15; i++) {
                        this.particles.push({
                            x: 0, y: 0,
                            vx: (Math.random() - 0.5) * 10, vy: -Math.random() * 15,
                            size: Math.random() * 8 + 4,
                            color: Math.random() > 0.5 ? '#ff5722' : '#ffeb3b'
                        });
                    }
                } else {
                    screenShake = 25; // 默认爆炸
                    for(let i=0; i<15; i++) {
                        this.particles.push({
                            x: 0, y: 0,
                            vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15,
                            size: Math.random() * 10 + 5,
                            color: Math.random() > 0.5 ? '#ffeb3b' : '#ff5722'
                        });
                    }
                }
            }
            update(dt: number) {
                this.radius += (this.maxRadius - this.radius) * 0.2 * dt / 16.67;
                this.particles.forEach(p => { p.x += p.vx * dt / 16.67; p.y += p.vy * dt / 16.67; p.vy += 0.03 * dt; /* gravity */ });
                this.life -= dt;
                if (this.life <= 0) this.markedForDeletion = true;
            }
            draw() {
                ctx.save(); ctx.translate(this.x, this.y); ctx.globalAlpha = Math.max(0, this.life / 500);
                if (this.isFume) {
                    ctx.fillStyle = 'rgba(126, 87, 194, ' + (this.life/250) + ')';
                    ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI*2); ctx.fill();
                } else if (this.isSquash) {
                    // 窝瓜砸地特效
                    ctx.fillStyle = '#795548'; // 泥土色
                    ctx.beginPath(); ctx.ellipse(0, 0, this.radius, this.radius * 0.5, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 5; ctx.stroke();
                } else if (this.type === 'fire_row') {
                    // 辣椒火焰
                    ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                    ctx.fillStyle = '#ff5722'; ctx.fill();
                    ctx.beginPath(); ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffeb3b'; ctx.fill();
                    this.particles.forEach(p => {
                        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
                    });
                } else {
                    // 爆炸核心 (樱桃和普通爆炸)
                    ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                    ctx.fillStyle = this.type === 'cherry' ? '#d32f2f' : '#ff5722'; ctx.fill();
                    ctx.beginPath(); ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffeb3b'; ctx.fill();
                    // 爆炸粒子
                    this.particles.forEach(p => {
                        ctx.fillStyle = p.color;
                        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
                    });
                }
                ctx.restore();
            }
        }

        class Lawnmower {
            row: number; x: number; y: number; width: number; height: number; isActive: boolean; markedForDeletion: boolean; speed: number;
            constructor(row: number) {
                this.row = row; this.x = -15; this.y = gridOffsetY + row * cellSize;
                this.width = 60; this.height = 60;
                this.isActive = false; this.markedForDeletion = false; this.speed = 12;
            }
            update(dt: number) {
                if (this.isActive) {
                    this.x += this.speed * dt / 16.67;
                    if (this.x > canvas.width + 50) this.markedForDeletion = true;
                } else {
                    let hitZombie = zombies.find(z => !z.markedForDeletion && z.y === this.y && z.x <= this.x + this.width && z.x > 0);
                    if (hitZombie) this.isActive = true;
                }
            }
            draw() {
                const cx = this.x + 40; const cy = this.y + 60;
                ctx.save(); ctx.translate(cx, cy);
                ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.roundRect(-25, -20, 50, 25, 4); ctx.fill();
                ctx.fillStyle = '#212121'; ctx.beginPath(); ctx.arc(-15, 5, 8, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(15, 5, 8, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#bdbdbd'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.moveTo(10, -20); ctx.lineTo(-15, -45); ctx.lineTo(-30, -45); ctx.stroke();
                if (this.isActive) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                    ctx.beginPath(); ctx.arc(-30 - Math.random() * 15, -5, Math.random() * 6 + 2, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();
            }
        }

        class Plant {
            x: number; y: number; width: number; height: number; type: string; timer: number; markedForDeletion: boolean; hp: number; maxHp: number; isArmed: boolean; secondShotTimer: number; isSquashing: boolean; squashTimer: number; isChewing: boolean; chewTimer: number;
            shootTimer: number; sunTimer: number; spikeweedTimer: number;
            constructor(x: number, y: number, type: string) {
                this.x = x; this.y = y; this.width = cellSize - 20; this.height = cellSize - 20;
                this.type = type; this.timer = 0; this.markedForDeletion = false;
                this.shootTimer = 0; this.sunTimer = 0; this.spikeweedTimer = 0;

                const stats: Record<string, {hp: number}> = {
                    'Peashooter': { hp: 100 }, 'SnowPea': { hp: 100 }, 'Sunflower': { hp: 100 },
                    'Wallnut': { hp: 800 }, 'PotatoMine': { hp: 50 }, 'CherryBomb': { hp: 999 },
                    'Repeater': { hp: 100 }, 'Squash': { hp: 999 },
                    'Tallnut': { hp: 4000 }, 'Jalapeno': { hp: 999 }, 'Threepeater': { hp: 100 },
                    'Chomper': { hp: 100 }, 'PuffShroom': { hp: 100 }, 'Spikeweed': { hp: 100 },
                    'SunShroom': { hp: 100 }, 'FumeShroom': { hp: 100 }, 'ScaredyShroom': { hp: 100 },
                    'IceShroom': { hp: 999 }, 'Torchwood': { hp: 100 }, 'Garlic': { hp: 100 },
                    'Starfruit': { hp: 100 }, 'SplitPea': { hp: 100 }
                };
                this.hp = stats[type].hp; this.maxHp = this.hp;
                this.isArmed = false;
                this.secondShotTimer = 0;
                this.isSquashing = false;
                this.squashTimer = 0;
                this.isChewing = false;
                this.chewTimer = 0;
            }
            update(dt: number) {
                this.timer += dt;
                const cx = this.x + cellSize / 2; const cy = this.y + cellSize / 2;

                if (this.type === 'Peashooter' || this.type === 'SnowPea' || this.type === 'Repeater') {
                    this.shootTimer += dt;
                    if (this.shootTimer >= 1667) {
                        this.shootTimer -= 1667;
                        if (zombies.some(z => z.y === this.y && z.x > this.x)) {
                            bullets.push(new Bullet(this.x + this.width, this.y + this.height / 2, 6, 0, this.type === 'SnowPea' ? 'snow' : 'normal'));
                            playSound('shoot');
                            if (this.type === 'Repeater') {
                                this.secondShotTimer = 250;
                            }
                        }
                    }
                    if (this.type === 'Repeater' && this.secondShotTimer > 0) {
                        this.secondShotTimer -= dt;
                        if (this.secondShotTimer <= 0) {
                            this.secondShotTimer = 0;
                            if (zombies.some(z => z.y === this.y && z.x > this.x)) {
                                bullets.push(new Bullet(this.x + this.width, this.y + this.height / 2, 6, 0, 'normal'));
                                playSound('shoot');
                            }
                        }
                    }
                } else if (this.type === 'Sunflower' || this.type === 'SunShroom') {
                    this.sunTimer += dt;
                    const interval = this.type === 'SunShroom' ? 8333 : 10000;
                    if (this.sunTimer >= interval) {
                        this.sunTimer -= interval;
                        suns.push(new Sun(cx + (Math.random() * 40 - 20), this.y, this.y + 20, this.type === 'SunShroom' ? 15 : 25));
                    }
                } else if (this.type === 'PotatoMine') {
                    if (this.timer > 10000) this.isArmed = true;
                    if (this.isArmed) {
                        if (zombies.some(z => z.y === this.y && Math.abs(z.x + z.width / 2 - cx) < 40)) {
                            explosions.push(new Explosion(cx, cy));
                            playSound('explosion');
                            zombies.forEach(z => {
                                if (z.y === this.y && Math.abs(z.x + z.width / 2 - cx) < 80) {
                                    if(z.hp > 0) {
                                        z.hp = 0;
                                        z.markedForDeletion = true;
                                        score++;
                                    }
                                }
                            });
                            this.hp = 0; this.markedForDeletion = true;
                        }
                    }
                } else if (this.type === 'CherryBomb') {
                    if (this.timer > 1000) {
                        explosions.push(new Explosion(cx, cy, 'cherry'));
                        playSound('explosion');
                        zombies.forEach(z => {
                            if (Math.abs(z.x - this.x) < cellSize * 1.5 && Math.abs(z.y - this.y) < cellSize * 1.5) {
                                if(z.hp > 0) {
                                    z.hp = 0;
                                    z.markedForDeletion = true;
                                    score++;
                                }
                            }
                        });
                        this.hp = 0; this.markedForDeletion = true;
                    }
                } else if (this.type === 'Squash') {
                    if (!this.isSquashing && zombies.some(z => z.y === this.y && Math.abs(z.x + z.width / 2 - cx) < 60)) {
                        this.isSquashing = true;
                        this.squashTimer = 667;
                    }
                    if (this.isSquashing) {
                        this.squashTimer -= dt;
                        if (this.squashTimer <= 0) {
                            explosions.push(new Explosion(cx, cy, 'squash'));
                            playSound('explosion');
                            zombies.forEach(z => {
                                if (z.y === this.y && Math.abs(z.x + z.width / 2 - cx) < 80) {
                                    if(z.hp > 0) {
                                        z.hp = 0;
                                        z.markedForDeletion = true;
                                        score++;
                                    }
                                }
                            });
                            this.hp = 0; this.markedForDeletion = true;
                        }
                    }
                } else if (this.type === 'PuffShroom') {
                    this.shootTimer += dt;
                    if (this.shootTimer >= 1667) {
                        this.shootTimer -= 1667;
                        if (zombies.some(z => z.y === this.y && z.x > this.x && z.x - this.x < cellSize * 3.5)) {
                            bullets.push(new Bullet(this.x + this.width, this.y + this.height / 2, 6, 0, 'normal'));
                            playSound('shoot');
                        }
                    }
                } else if (this.type === 'FumeShroom') {
                    this.shootTimer += dt;
                    if (this.shootTimer >= 1667 && zombies.some(z => z.y === this.y && z.x > this.x && z.x - this.x < cellSize * 4)) {
                        this.shootTimer -= 1667;
                        playSound('shoot');
                        let hitAny = false;
                        zombies.forEach(z => {
                            if (z.y === this.y && z.x > this.x && z.x - this.x < cellSize * 4) {
                                z.hp -= 20; if (z.hp <= 0) { z.hp=0; z.markedForDeletion=true; score++; }
                                hitAny = true;
                            }
                        });
                        if (hitAny) playSound('hit');
                        for(let i=0; i<3; i++) explosions.push(new Explosion(cx + cellSize + Math.random()*cellSize*2, cy + (Math.random()-0.5)*20, 'fume'));
                    }
                } else if (this.type === 'ScaredyShroom') {
                    const isScared = zombies.some(z => Math.hypot(z.x + z.width/2 - cx, z.y + z.height/2 - cy) < 150 && z.hp > 0 && !z.markedForDeletion);
                    if (!isScared) {
                        this.shootTimer += dt;
                        if (this.shootTimer >= 1667 && zombies.some(z => z.y === this.y && z.x > this.x)) {
                            this.shootTimer -= 1667;
                            bullets.push(new Bullet(this.x + this.width, this.y + this.height / 2, 6, 0, 'normal'));
                            playSound('shoot');
                        }
                    }
                } else if (this.type === 'Chomper') {
                    if (!this.isChewing) {
                        const target = zombies.find(z => z.y === this.y && z.x + z.width/2 > cx && z.x - this.x < cellSize * 1.5 && !z.markedForDeletion);
                        if (target) {
                            target.hp = 0; target.markedForDeletion = true; score++;
                            this.isChewing = true;
                            this.chewTimer = 40000;
                            playSound('chomp');
                        }
                    } else {
                        this.chewTimer -= dt;
                        if (this.chewTimer <= 0) this.isChewing = false;
                    }
                } else if (this.type === 'Spikeweed') {
                    this.spikeweedTimer += dt;
                    if (this.spikeweedTimer >= 500) {
                        this.spikeweedTimer -= 500;
                        zombies.forEach(z => {
                            if (z.y === this.y && z.x < cx + cellSize/2 && z.x + z.width > cx - cellSize/2 && !z.markedForDeletion) {
                                z.hp -= 5;
                                if (z.hp <= 0) { z.hp = 0; z.markedForDeletion = true; score++; }
                            }
                        });
                    }
                } else if (this.type === 'Threepeater') {
                    this.shootTimer += dt;
                    if (this.shootTimer >= 1667) {
                        let shouldShoot = false;
                        for (let r = -1; r <= 1; r++) {
                            const targetY = this.y + r * cellSize;
                            if (zombies.some(z => z.y === targetY && z.x > this.x)) {
                                shouldShoot = true; break;
                            }
                        }
                        if (shouldShoot) {
                            this.shootTimer -= 1667;
                            for (let r = -1; r <= 1; r++) {
                                const targetY = this.y + r * cellSize;
                                if (targetY >= gridOffsetY && targetY < gridOffsetY + gridRows * cellSize) {
                                    const vSpeed = (r * cellSize) / (cellSize / 6);
                                    bullets.push(new Bullet(this.x + this.width, cy, 6, vSpeed, 'normal', true));
                                }
                            }
                            playSound('shoot');
                        }
                    }
                } else if (this.type === 'IceShroom') {
                    if (this.timer > 500) {
                        playSound('explosion');
                        explosions.push(new Explosion(cx, cy, 'fume'));
                        zombies.forEach(z => { z.slowTimer = 10000; z.hp -= 10; if(z.hp<=0){z.hp=0; z.markedForDeletion=true;score++;} });
                        this.hp = 0; this.markedForDeletion = true;
                    }
                } else if (this.type === 'Torchwood') {
                    bullets.forEach(b => {
                        if (b.type === 'normal' || b.type === 'snow') {
                            if (b.x > this.x && b.x < this.x + cellSize && b.y > this.y && b.y < this.y + cellSize) {
                                b.type = 'fire'; b.damage = 40;
                            }
                        }
                    });
                } else if (this.type === 'Starfruit') {
                    this.shootTimer += dt;
                    if (this.shootTimer >= 1667 && zombies.some(z => z.hp > 0 && !z.markedForDeletion)) {
                        this.shootTimer -= 1667;
                        bullets.push(new Bullet(cx, cy, 0, -6, 'star'));
                        bullets.push(new Bullet(cx, cy, 0, 6, 'star'));
                        bullets.push(new Bullet(cx, cy, -6, 0, 'star'));
                        bullets.push(new Bullet(cx, cy, 5.2, 3, 'star'));
                        bullets.push(new Bullet(cx, cy, 5.2, -3, 'star'));
                        playSound('shoot');
                    }
                } else if (this.type === 'SplitPea') {
                    this.shootTimer += dt;
                    if (this.shootTimer >= 1667) {
                        if (zombies.some(z => z.y === this.y && z.x > this.x)) {
                            bullets.push(new Bullet(this.x + this.width, cy, 6, 0, 'normal'));
                            playSound('shoot');
                        }
                        if (zombies.some(z => z.y === this.y && z.x < this.x)) {
                            bullets.push(new Bullet(this.x, cy, -6, 0, 'normal'));
                            this.shootTimer -= 1667;
                            if (this.secondShotTimer <= 0) this.secondShotTimer = 250;
                        }
                    }
                    if (this.secondShotTimer > 0) {
                        this.secondShotTimer -= dt;
                        if (this.secondShotTimer <= 0 && zombies.some(z => z.y === this.y && z.x < this.x)) {
                            bullets.push(new Bullet(this.x, cy, -6, 0, 'normal'));
                            playSound('shoot');
                        }
                    }
                } else if (this.type === 'Jalapeno') {
                    if (this.timer > 750) {
                        for (let lx = 0; lx < canvas.width; lx += cellSize) {
                            explosions.push(new Explosion(lx + cellSize / 2, cy, 'fire_row'));
                        }
                        zombies.forEach(z => {
                            if (z.y === this.y) {
                                if(z.hp > 0) { z.hp = 0; z.markedForDeletion = true; score++; }
                            }
                        });
                        this.hp = 0; this.markedForDeletion = true;
                        playSound('explosion');
                    }
                }
            }
            draw() {
                const cx = this.x + cellSize / 2; const cy = this.y + cellSize / 2;
                
                ctx.save();
                ctx.translate(cx, cy);
                // 生动的呼吸动画 (Breathing Animation)
                const now = Date.now();
                const breathePhase = now * 0.006;
                const scaleY = 1 + Math.sin(breathePhase) * 0.05;
                const scaleX = 1 - Math.sin(breathePhase) * 0.02;
                
                // 以底部为基准点进行缩放
                ctx.translate(0, 15); 
                ctx.scale(scaleX, scaleY);
                ctx.translate(0, -15);

                if (this.type === 'PotatoMine') {
                    plantIcons[this.type](0, 0, 1.2, 1, this.isArmed);
                } else {
                    const wobble = ((this.type === 'CherryBomb' || this.type === 'Squash') && this.timer > 667 && !this.isSquashing) ? Math.sin(Date.now() * 0.03) * 5 : 0;
                    if (this.type === 'Squash' && this.isSquashing) {
                        const jumpProgress = 1 - (this.squashTimer / 667);
                        const jumpHeight = Math.sin(jumpProgress * Math.PI) * 80;
                        ctx.translate(0, -jumpHeight);
                        ctx.scale(1 + jumpProgress*0.1, 1 - jumpProgress*0.1);
                    }
                    if (this.type === 'Chomper' && this.isChewing) {
                        const chewWobble = Math.sin(Date.now() * 0.018) * 5;
                        ctx.translate(0, chewWobble);
                    }
                    plantIcons[this.type](wobble, 0, 1.2);
                }
                ctx.restore();
            }
        }

        class Zombie {
            x: number; y: number; width: number; height: number; typeCode: number; speed: number; movement: number; maxHp: number; hp: number; shieldHp: number; damage: number; markedForDeletion: boolean; isEating: boolean; slowTimer: number;
            constructor(y: number, typeCode: number) {
                this.x = canvas.width; this.y = y; this.width = 50; this.height = 80;
                this.typeCode = typeCode; // 1: normal, 2: cone, 3: bucket, 4: screen door

                this.speed = Math.random() * 0.1 + 0.15;
                this.movement = this.speed;

                const hpMap = { 1: 150, 2: 380, 3: 750, 4: 150 };
                this.maxHp = hpMap[typeCode] || 150; 
                this.hp = this.maxHp;
                this.shieldHp = typeCode === 4 ? 650 : 0; // 铁窗盾牌血量

                this.damage = 0.3; this.markedForDeletion = false; this.isEating = false;
                this.slowTimer = 0;
            }
            update(dt: number) {
                if (this.slowTimer > 0) {
                    this.movement = this.speed * 0.5; this.slowTimer -= dt;
                } else {
                    this.movement = this.speed;
                }

                if (!this.isEating) this.x -= this.movement * dt / 16.67;
                if (this.x < 0) { gameState = 'gameOver'; }
            }
            draw() {
                const cx = this.x + cellSize / 2; const cy = this.y + cellSize / 2;
                ctx.save(); ctx.translate(cx, cy);
                const wobble = this.isEating ? 0 : Math.sin(Date.now() * 0.006) * 3;

                // 身体 (被减速时泛蓝)
                ctx.fillStyle = this.slowTimer > 0 ? '#546e7a' : '#607d8b'; ctx.fillRect(-15, -10, 30, 50);
                ctx.fillStyle = this.slowTimer > 0 ? '#78909c' : '#78909c'; ctx.fillRect(-25, this.isEating ? Math.sin(Date.now() * 0.03) * 5 : 0, 20, 10);

                // 头
                ctx.fillStyle = this.slowTimer > 0 ? '#b2ebf2' : '#9e9e9e';
                ctx.beginPath(); ctx.arc(0, -25 + wobble, 20, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-8, -30 + wobble, 5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(8, -30 + wobble, 5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-9, -30 + wobble, 2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(7, -30 + wobble, 2, 0, Math.PI * 2); ctx.fill();
                ctx.fillRect(-8, -15 + wobble, 16, 5);

                // 头盔
                if (this.typeCode === 2 && this.hp > 150) { // 路障
                    ctx.fillStyle = '#ff9800'; ctx.beginPath(); ctx.moveTo(0, -65 + wobble); ctx.lineTo(-20, -35 + wobble); ctx.lineTo(20, -35 + wobble); ctx.fill();
                    ctx.fillStyle = '#fff'; ctx.fillRect(-12, -45 + wobble, 24, 5);
                } else if (this.typeCode === 3 && this.hp > 150) { // 铁桶
                    ctx.fillStyle = '#90a4ae'; ctx.beginPath(); ctx.moveTo(-15, -60 + wobble); ctx.lineTo(15, -60 + wobble); ctx.lineTo(20, -35 + wobble); ctx.lineTo(-20, -35 + wobble); ctx.fill();
                    ctx.fillStyle = '#b0bec5'; ctx.fillRect(-20, -35 + wobble, 40, 5);
                    ctx.fillStyle = '#d32f2f'; ctx.fillRect(0, -50 + wobble, 10, 10); // 假装有个红标
                }

                // 铁门盾牌
                if (this.typeCode === 4 && this.shieldHp > 0) {
                    ctx.save();
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // 网格外框背景
                    ctx.beginPath(); ctx.roundRect(-30, -50 + wobble, 15, 80, 4); ctx.fill();
                    ctx.strokeStyle = '#9e9e9e'; ctx.lineWidth = 2; // 铁框
                    ctx.strokeRect(-30, -50 + wobble, 15, 80);
                    // 绘制网格
                    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                    for(let i=1; i<=7; i++) { ctx.beginPath(); ctx.moveTo(-30, -50 + wobble + i*10); ctx.lineTo(-15, -50 + wobble + i*10); ctx.stroke(); }
                    for(let i=1; i<=2; i++) { ctx.beginPath(); ctx.moveTo(-30 + i*5, -50 + wobble); ctx.lineTo(-30 + i*5, 30 + wobble); ctx.stroke(); }
                    ctx.restore();
                }

                ctx.restore();
            }
        }

        function handleGameObjects(dt: number) {
            // 系统状态更新 (CD)
            cards.forEach(c => { if (c.currentCd > 0) c.currentCd = Math.max(0, c.currentCd - dt); });
            if (hugeWaveTimer > 0) hugeWaveTimer = Math.max(0, hugeWaveTimer - dt);

            // 剧情生成器：打完一波等5秒出下一波
            if (zombiesToSpawn === 0 && zombies.length === 0) {
                if (!waveCompleted) {
                    waveCompleted = true;
                    waveTimer = 5000; // 5秒间隔
                }
            }

            if (waveCompleted) {
                waveTimer -= dt;
                if (waveTimer <= 0) {
                    waveCompleted = false;
                    currentWave++;

                    if (currentWave === 1) {
                        zombiesToSpawnTotal = 5;
                    } else {
                        zombiesToSpawnTotal = 5 + Math.floor((currentWave - 1) * 3);
                    }
                    zombiesToSpawn = zombiesToSpawnTotal;

                    hugeWaveTimer = 3000; // 3秒大波次提示
                }
            }

            if (zombiesToSpawn > 0 && !waveCompleted) {
                spawnDelayTimer -= dt;
                if (spawnDelayTimer <= 0) {
                    const rowWeights = [1, 3, 5, 6, 5, 3, 1];
                    let rand = Math.random() * 24;
                    let randomRow = 0;
                    for (let i = 0; i < rowWeights.length; i++) {
                        if (rand < rowWeights[i]) { randomRow = i; break; }
                        rand -= rowWeights[i];
                    }

                    let type = 1;
                    if (currentWave > 2) type = Math.random() < 0.7 ? 1 : 2;
                    if (currentWave > 5) type = Math.random() < 0.5 ? 2 : (Math.random() < 0.5 ? 3 : 4);
                    if (currentWave > 10) type = Math.random() < 0.3 ? 2 : (Math.random() < 0.5 ? 3 : 4);

                    zombies.push(new Zombie(randomRow * cellSize + gridOffsetY, type));
                    zombiesToSpawn--;

                    spawnDelayTimer = 1000 + Math.random() * 1500; // 1~2.5秒出一只
                }
            }

            // 天降阳光: 动态掉落，后期变慢
            const currentSunInterval = sunSpawnInterval + Math.min(10000, currentWave * 667);
            sunSpawnAccum += dt;
            if (sunSpawnAccum >= currentSunInterval) {
                sunSpawnAccum -= currentSunInterval;
                suns.push(new Sun(Math.random() * (canvas.width - 150) + 125, -50, Math.random() * 300 + gridOffsetY + 50));
            }

            // 更新绘制所有实体
            plants.forEach(p => { p.update(dt); p.draw(); });
            bullets.forEach(b => { b.update(dt); b.draw(); });
            zombies.forEach(z => { z.update(dt); z.isEating = false; z.draw(); });
            suns.forEach(s => { s.update(dt); s.draw(); });
            explosions.forEach(e => { e.update(dt); e.draw(); });
            lawnmowers.forEach(lm => { lm.update(dt); lm.draw(); });
            floatingTexts.forEach(ft => { ft.update(dt); ft.draw(); });

            // 碰撞系统
            let someoneIsEating = false;
            for (let i = 0; i < zombies.length; i++) {
                const z = zombies[i];
                if (z.markedForDeletion) continue;

                // 僵尸吃植物
                for (let j = 0; j < plants.length; j++) {
                    const p = plants[j];
                    if (p.type === 'Spikeweed') continue;
                    if (z.x < p.x + p.width && z.x + z.width > p.x && z.y === p.y && p.type !== 'CherryBomb' && p.type !== 'Jalapeno' && !(p.type === 'PotatoMine' && p.isArmed)) {
                        z.movement = 0; z.isEating = true; p.hp -= z.damage;
                        someoneIsEating = true;

                        if (p.type === 'Garlic') {
                            const direction = Math.random() < 0.5 ? 1 : -1;
                            let newY = z.y + direction * cellSize;
                            if (newY < gridOffsetY) newY = z.y + cellSize;
                            else if (newY >= gridOffsetY + gridRows * cellSize) newY = z.y - cellSize;
                            z.y = newY;
                            z.x += 10;
                            z.isEating = false;
                        }

                        if (p.hp <= 0) p.markedForDeletion = true;
                    }
                }

                // 子弹打僵尸
                for (let k = 0; k < bullets.length; k++) {
                    const b = bullets[k];
                    if (b.markedForDeletion) continue;
                    if (b.x < z.x + z.width && b.x + b.width > z.x && b.y > z.y && b.y < z.y + cellSize) {
                        b.markedForDeletion = true;
                        let actualDamage = b.damage;
                        let floatingColor = '#ff5252';
                        let shieldBlocked = false;

                        if (z.shieldHp > 0) {
                            shieldBlocked = true;
                            floatingColor = '#e0e0e0';
                            if (z.shieldHp >= actualDamage) {
                                z.shieldHp -= actualDamage;
                                actualDamage = 0;
                            } else {
                                actualDamage -= z.shieldHp;
                                z.shieldHp = 0;
                            }
                        }
                        z.hp -= actualDamage;
                        playSound(shieldBlocked ? 'hit_shield' : 'hit');

                        floatingTexts.push(new FloatingText(z.x + z.width / 2 + (Math.random() * 20 - 10), z.y + 20 + (Math.random() * 10 - 5), `-${b.damage}`, floatingColor));
                        if (b.type === 'snow' && !shieldBlocked) z.slowTimer = 3000; // 3秒减速
                        if (b.type === 'fire') z.slowTimer = 0;
                        if (z.hp <= 0 && !z.markedForDeletion) {
                            z.markedForDeletion = true; score++;
                        }
                    }
                }

                // 小推车秒杀
                if (z.markedForDeletion) continue;

                for (let m = 0; m < lawnmowers.length; m++) {
                    const lm = lawnmowers[m];
                    if (lm.isActive && z.y === lm.y && lm.x + lm.width > z.x && lm.x < z.x + z.width) {
                        z.hp = 0; z.markedForDeletion = true;
                        explosions.push(new Explosion(z.x + z.width / 2, z.y + z.height / 2));
                        score++;
                    }
                }
            }

            // 内存回收：用 filter 替代 splice
            plants = plants.filter(p => !p.markedForDeletion);
            zombies = zombies.filter(z => !z.markedForDeletion);
            bullets = bullets.filter(b => !b.markedForDeletion);
            suns = suns.filter(s => !s.markedForDeletion);
            explosions = explosions.filter(e => !e.markedForDeletion);
            lawnmowers = lawnmowers.filter(lm => !lm.markedForDeletion);
            floatingTexts = floatingTexts.filter(ft => !ft.markedForDeletion);

            eatSoundAccum += dt;
            if (someoneIsEating && eatSoundAccum >= 750) {
                eatSoundAccum = 0;
                playSound('eat');
            }
        }

        function handleGridClick() {
            if (mouse.clicked && !selectedCard.isEmpty && mouse.y > gridOffsetY) {
                const col = Math.floor(mouse.x / cellSize);
                const row = Math.floor((mouse.y - gridOffsetY) / cellSize);
                const gridX = col * cellSize; const gridY = row * cellSize + gridOffsetY;

                if (col >= 0 && col < gridCols && row >= 0 && row < gridRows) {
                    const occupiedIndex = plants.findIndex(p => p.x === gridX && p.y === gridY);

                    if (selectedCard.isShovel) {
                        if (occupiedIndex !== -1) {
                            plants.splice(occupiedIndex, 1);
                            playSound('shovel');
                        }
                        selectedCard = { type: null, cost: 0, isEmpty: true, isShovel: false, index: -1 };
                    } else {
                        // 不能种在 col === 0 (推车区)
                        if (col > 0 && occupiedIndex === -1 && sun >= selectedCard.cost) {
                            plants.push(new Plant(gridX, gridY, selectedCard.type));
                            sun -= selectedCard.cost;
                            playSound('plant');
                            if (selectedCard.index !== undefined && selectedCard.index !== -1) {
                                cards[selectedCard.index].currentCd = cards[selectedCard.index].cd;
                            }
                            selectedCard = { type: null, cost: 0, isEmpty: true, isShovel: false, index: -1 };
                        }
                    }
                } else {
                    selectedCard = { type: null, cost: 0, isEmpty: true, isShovel: false, index: -1 };
                }
                mouse.clicked = false;
            }
        }

        function initGame() {
            sun = 75; score = 0; currentWave = 0;
            waveTimer = 10000; waveCompleted = true;
            hugeWaveTriggered = false; hugeWaveTimer = 0; zombiesToSpawn = 0; zombiesToSpawnTotal = 0; spawnDelayTimer = 0;
            sunSpawnAccum = 0; eatSoundAccum = 0;
            grids = []; plants = []; zombies = []; bullets = []; suns = []; explosions = []; lawnmowers = []; floatingTexts = [];
            cards.forEach(c => c.currentCd = 0);

            for (let r = 0; r < gridRows; r++) lawnmowers.push(new Lawnmower(r));
            for (let y = gridOffsetY; y < canvas.height; y += cellSize) {
                for (let x = 0; x < canvas.width; x += cellSize) grids.push(new Cell(x, y));
            }
            gameState = 'playing';
        }

        function drawMainMenuUI() {
            // 1. 动态炫酷背景: 径向渐变 + 旋转芒星
            const bgGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width);
            bgGrad.addColorStop(0, '#2e7d32'); 
            bgGrad.addColorStop(1, '#1b5e20');
            ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(Date.now() * 0.00018);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
            for (let i = 0; i < 12; i++) {
                ctx.beginPath();
                ctx.moveTo(0, 0); ctx.lineTo(canvas.width, -120); ctx.lineTo(canvas.width, 120);
                ctx.fill(); ctx.rotate(Math.PI / 6);
            }
            ctx.restore();

            // 1.5. 萤火虫/光尘粒子特效
            if (Math.random() < 0.3) {
                menuParticles.push({
                    x: Math.random() * canvas.width,
                    y: canvas.height + 20,
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: -Math.random() * 2 - 1,
                    size: Math.random() * 4 + 2,
                    life: 250 + Math.random() * 100,
                    color: Math.random() > 0.5 ? '#aeea00' : '#ffeb3b'
                });
            }
            menuParticles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                p.vx += (Math.random() - 0.5) * 0.1; // 随机游走
                p.life--;
                ctx.save();
                ctx.globalAlpha = Math.max(0, p.life / 350);
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color; ctx.shadowBlur = 10;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            });
            menuParticles = menuParticles.filter(p => p.life > 0);

            // 2. 漂浮的标题
            const titleYOffset = Math.sin(Date.now() * 0.0024) * 10;
            ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 15; ctx.shadowOffsetY = 8;
            ctx.fillStyle = '#fff'; ctx.font = '900 75px Inter'; ctx.textAlign = 'center';
            ctx.fillText('植物大战僵尸', canvas.width / 2, 140 + titleYOffset);
            ctx.font = 'bold 36px Inter'; ctx.fillStyle = '#aeea00';
            ctx.fillText('无尽生存模式', canvas.width / 2, 200 + titleYOffset);
            
            // 最高波次显示
            ctx.fillStyle = '#ffeb3b'; ctx.font = 'bold 24px Inter';
            ctx.fillText(`最高记录: 第 ${highScore} 波`, canvas.width / 2, 250 + titleYOffset);
            ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

            // 3. 开始游戏大按钮
            const baseBtnW = 280; const baseBtnH = 70;
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2 + 60 + Math.sin(Date.now() * 0.003) * 6;
            const isHover = mouse.x && mouse.y && mouse.x >= centerX - baseBtnW/2 && mouse.x <= centerX + baseBtnW/2 && mouse.y >= centerY - baseBtnH/2 && mouse.y <= centerY + baseBtnH/2;
            const scale = isHover ? 1.05 : 1;
            const btnW = baseBtnW * scale; const btnH = baseBtnH * scale;

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = isHover ? 20 : 10; ctx.shadowOffsetY = isHover ? 10 : 5;
            ctx.fillStyle = isHover ? '#aeea00' : '#64dd17';
            ctx.beginPath(); ctx.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 35 * scale); ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath(); ctx.roundRect(-btnW / 2 + 4, -btnH / 2 + 4, btnW - 8, btnH / 2 - 4, 25 * scale); ctx.fill();
            ctx.fillStyle = isHover ? '#33691e' : '#1b5e20'; ctx.font = `bold ${32 * scale}px Inter`; ctx.textAlign = 'center';
            ctx.fillText(`开始游戏`, 0, 11 * scale);
            ctx.restore();

            if (mouse.clicked && isHover) { playSound('button'); gameState = 'seedSelection'; mouse.clicked = false; }
        }

        function drawSeedSelectionUI() {
            ctx.fillStyle = '#2e7d32'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 40px Inter'; ctx.textAlign = 'center';
            ctx.fillText('选择你的植物卡片', canvas.width / 2, 80);

            // Draw slots (Top)
            const slotW = 75; const slotH = 80;
            const slotStartX = canvas.width / 2 - (maxCards * 85) / 2;
            for (let i = 0; i < maxCards; i++) {
                const x = slotStartX + i * 85; const y = 120;
                ctx.fillStyle = '#3e2723'; ctx.beginPath(); ctx.roundRect(x, y, slotW, slotH, 8); ctx.fill();
                
                if (i < cards.length) {
                    ctx.fillStyle = '#795548'; ctx.beginPath(); ctx.roundRect(x, y, slotW, slotH, 8); ctx.fill();
                    plantIcons[cards[i].type](x + slotW / 2, y + 30, 0.7);
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Inter'; ctx.textAlign = 'center';
                    ctx.fillText(cards[i].cost.toString(), x + slotW / 2, y + 70);
                    
                    if (mouse.clicked && mouse.x !== undefined && mouse.y !== undefined && mouse.x >= x && mouse.x <= x + slotW && mouse.y >= y && mouse.y <= y + slotH) {
                        cards.splice(i, 1); playSound('card'); mouse.clicked = false;
                    }
                }
            }

            // Draw available plants (Bottom)
            const poolStartX = canvas.width / 2 - (7 * 85) / 2; // max 7 cols
            const poolStartY = 250;
            let col = 0; let row = 0;
            plantTemplates.forEach((pt) => {
                const x = poolStartX + col * 85;
                const y = poolStartY + row * 90;
                
                const isSelected = cards.some(c => c.type === pt.type);
                ctx.fillStyle = isSelected ? '#555' : '#795548'; 
                ctx.beginPath(); ctx.roundRect(x, y, slotW, slotH, 8); ctx.fill();
                
                if (!isSelected) {
                    plantIcons[pt.type](x + slotW / 2, y + 30, 0.7);
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Inter'; ctx.textAlign = 'center';
                    ctx.fillText(pt.cost.toString(), x + slotW / 2, y + 70);

                    if (mouse.clicked && mouse.x !== undefined && mouse.y !== undefined && mouse.x >= x && mouse.x <= x + slotW && mouse.y >= y && mouse.y <= y + slotH) {
                        if (cards.length < maxCards) {
                            cards.push({ type: pt.type, cost: pt.cost, name: pt.name, cd: pt.cd, currentCd: 0 });
                            playSound('card');
                        }
                        mouse.clicked = false;
                    }
                } else {
                    ctx.fillStyle = '#9e9e9e'; ctx.font = 'bold 14px Inter'; ctx.textAlign = 'center';
                    ctx.fillText('已选择', x + slotW / 2, y + 45);
                }

                col++;
                if (col >= 7) { col = 0; row++; } 
            });

            // Start Button
            const btnW = 200; const btnH = 60;
            const btnX = canvas.width / 2 - btnW / 2;
            const btnY = canvas.height - 100;
            const canStart = cards.length > 0;
            const isHover = canStart && mouse.x !== undefined && mouse.y !== undefined && mouse.x >= btnX && mouse.x <= btnX + btnW && mouse.y >= btnY && mouse.y <= btnY + btnH;
            
            ctx.fillStyle = canStart ? (isHover ? '#aeea00' : '#64dd17') : '#9e9e9e';
            ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 15); ctx.fill();
            ctx.fillStyle = canStart ? '#1b5e20' : '#424242'; ctx.font = 'bold 28px Inter'; ctx.textAlign = 'center';
            ctx.fillText('准备安放植物！', canvas.width / 2, btnY + 40);

            if (canStart && isHover && mouse.clicked) {
                playSound('button');
                initGame();
                mouse.clicked = false;
            }
        }

        function drawPauseMenuUI() {
            // 半透明遮罩
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const pw = 400; const ph = 350;
            const px = canvas.width / 2 - pw / 2;
            const py = canvas.height / 2 - ph / 2;

            // 菜单底板
            ctx.fillStyle = '#3e2723';
            ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 16); ctx.fill();
            ctx.strokeStyle = '#d7ccc8'; ctx.lineWidth = 4; ctx.stroke();

            ctx.fillStyle = '#fff'; ctx.font = 'bold 36px Inter'; ctx.textAlign = 'center';
            ctx.fillText('已暂停', canvas.width / 2, py + 60);

            // 音量控制
            ctx.fillStyle = '#fff'; ctx.font = '24px Inter';
            ctx.fillText(`音量: ${Math.round(globalVolume * 100)}%`, canvas.width / 2, py + 120);

            // 减小音量按钮
            const minusBtn = { x: px + 80, y: py + 140, w: 50, h: 40 };
            ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.roundRect(minusBtn.x, minusBtn.y, minusBtn.w, minusBtn.h, 8); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillText('-', minusBtn.x + 25, minusBtn.y + 28);
            if (mouse.clicked && mouse.x !== undefined && mouse.y !== undefined && mouse.x >= minusBtn.x && mouse.x <= minusBtn.x + minusBtn.w && mouse.y >= minusBtn.y && mouse.y <= minusBtn.y + minusBtn.h) {
                globalVolume = Math.max(0, globalVolume - 0.1);
                localStorage.setItem('pvz_volume', globalVolume.toString());
                playSound('button'); mouse.clicked = false;
            }

            // 增大音量按钮
            const plusBtn = { x: px + pw - 130, y: py + 140, w: 50, h: 40 };
            ctx.fillStyle = '#43a047'; ctx.beginPath(); ctx.roundRect(plusBtn.x, plusBtn.y, plusBtn.w, plusBtn.h, 8); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillText('+', plusBtn.x + 25, plusBtn.y + 28);
            if (mouse.clicked && mouse.x !== undefined && mouse.y !== undefined && mouse.x >= plusBtn.x && mouse.x <= plusBtn.x + plusBtn.w && mouse.y >= plusBtn.y && mouse.y <= plusBtn.y + plusBtn.h) {
                globalVolume = Math.min(1, globalVolume + 0.1);
                localStorage.setItem('pvz_volume', globalVolume.toString());
                playSound('button'); mouse.clicked = false;
            }

            // 返回游戏按钮
            const resumeBtn = { x: canvas.width / 2 - 100, y: py + 210, w: 200, h: 50 };
            ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.roundRect(resumeBtn.x, resumeBtn.y, resumeBtn.w, resumeBtn.h, 12); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 24px Inter'; ctx.fillText('继续游戏', canvas.width / 2, resumeBtn.y + 34);
            if (mouse.clicked && mouse.x !== undefined && mouse.y !== undefined && mouse.x >= resumeBtn.x && mouse.x <= resumeBtn.x + resumeBtn.w && mouse.y >= resumeBtn.y && mouse.y <= resumeBtn.y + resumeBtn.h) {
                playSound('button');
                gameState = 'playing'; mouse.clicked = false;
            }

            // 返回主菜单按钮
            const menuBtn = { x: canvas.width / 2 - 100, y: py + 280, w: 200, h: 50 };
            ctx.fillStyle = '#f44336'; ctx.beginPath(); ctx.roundRect(menuBtn.x, menuBtn.y, menuBtn.w, menuBtn.h, 12); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 24px Inter'; ctx.fillText('返回菜单', canvas.width / 2, menuBtn.y + 34);
            if (mouse.clicked && mouse.x !== undefined && mouse.y !== undefined && mouse.x >= menuBtn.x && mouse.x <= menuBtn.x + menuBtn.w && mouse.y >= menuBtn.y && mouse.y <= menuBtn.y + menuBtn.h) {
                playSound('button');
                gameState = 'mainMenu'; mouse.clicked = false;
            }

            // 点击菜单外部恢复游戏
            if (mouse.clicked && mouse.x !== undefined && mouse.y !== undefined) {
                if (mouse.x < px || mouse.x > px + pw || mouse.y < py || mouse.y > py + ph) {
                    playSound('button');
                    gameState = 'playing';
                    mouse.clicked = false;
                }
            }
        }

        function drawEndGameUI() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ef5350'; ctx.font = 'bold 70px Inter'; ctx.textAlign = 'center';
            ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 20);
            ctx.fillStyle = '#fff'; ctx.font = '20px Inter';
            ctx.fillText(`你的脑子被吃掉了... 生存到了第 ${currentWave} 波，干掉了 ${score} 个僵尸。`, canvas.width / 2, canvas.height / 2 + 40);

            // 更新最高分
            if (currentWave > highScore) {
                highScore = currentWave;
                saveHighScore(highScore); // 保存到异步数据库
                ctx.fillStyle = '#ffeb3b'; ctx.font = 'bold 24px Inter';
                ctx.fillText('新纪录！', canvas.width / 2, canvas.height / 2 + 80);
            }

            const btnW = 160; const btnH = 50;
            const btn1X = canvas.width / 2 - btnW / 2; 
            const btn1Y = canvas.height / 2 + 100;
            
            // 主菜单按钮
            ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.roundRect(btn1X, btn1Y, btnW, btnH, 25); ctx.fill();
            ctx.fillStyle = 'white'; ctx.font = 'bold 22px Inter'; ctx.fillText('主菜单', btn1X + btnW / 2, btn1Y + 33);

            if (mouse.clicked && mouse.x >= btn1X && mouse.x <= btn1X + btnW && mouse.y >= btn1Y && mouse.y <= btn1Y + btnH) {
                gameState = 'mainMenu'; mouse.clicked = false;
            }
        }

        let lastTime = 0;

        function animate(currentTime: number) {
            requestAnimationFrame(animate);

            const rawDt = currentTime - lastTime;
            lastTime = currentTime;
            if (rawDt <= 0 || rawDt > 1000) return;
            const dt = Math.min(rawDt, 100);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            if (screenShake > 0) {
                const dx = (Math.random() - 0.5) * screenShake;
                const dy = (Math.random() - 0.5) * screenShake;
                ctx.translate(dx, dy);
                screenShake *= Math.pow(0.8, dt / 16.67);
                if (screenShake < 1) screenShake = 0;
            }

            if (gameState === 'mainMenu') {
                drawMainMenuUI();
                canvas.style.cursor = 'default';
            } else if (gameState === 'seedSelection') {
                drawSeedSelectionUI();
                canvas.style.cursor = 'default';
            } else if (gameState === 'playing') {
                grids.forEach(grid => grid.draw());
                handleGameObjects(dt);
                drawUI();
                handleGridClick();

                // 铲子模式下光标切换
                if (selectedCard.isShovel) {
                    if (mouse.x !== undefined && mouse.y !== undefined && mouse.y > gridOffsetY) {
                        const col = Math.floor(mouse.x / cellSize);
                        const row = Math.floor((mouse.y - gridOffsetY) / cellSize);
                        const gridX = col * cellSize;
                        const gridY = row * cellSize + gridOffsetY;
                        const hasPlant = plants.some(p => p.x === gridX && p.y === gridY && !p.markedForDeletion);
                        canvas.style.cursor = hasPlant ? 'pointer' : 'not-allowed';
                    } else {
                        canvas.style.cursor = 'not-allowed';
                    }
                } else if (selectedCard.isEmpty) {
                    canvas.style.cursor = 'default';
                } else {
                    canvas.style.cursor = 'crosshair';
                }
            } else if (gameState === 'paused') {
                grids.forEach(grid => grid.draw());
                plants.forEach(p => p.draw()); zombies.forEach(z => z.draw()); lawnmowers.forEach(lm => lm.draw());
                drawUI();
                drawPauseMenuUI();
            } else if (gameState === 'gameOver') {
                grids.forEach(grid => grid.draw());
                plants.forEach(p => p.draw()); zombies.forEach(z => z.draw()); lawnmowers.forEach(lm => lm.draw());
                drawUI();
                drawEndGameUI();
            }

            ctx.restore();

            if (mouse.clicked) mouse.clicked = false;
        }

        window.onload = function () {
            lastTime = performance.now();
            requestAnimationFrame(animate);
        }