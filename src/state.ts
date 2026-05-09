import type { GameState, Card, SelectedCard, MouseState, MenuParticle } from './types';
import { maxCards } from './config';

// 核心游戏状态
export let sun = 75;
export let score = 0;
export let gameState: GameState = 'mainMenu';
export let currentWave = 0;
export let waveTimer = 0;
export let zombiesToSpawn = 0;
export let zombiesToSpawnTotal = 0;
export let spawnDelayTimer = 0;
export let waveCompleted = true;
export let hugeWaveTimer = 0;
export let hugeWaveTriggered = false;
export let highScore = 0;
export let screenShake = 0;

// 累加器
export let sunSpawnAccum = 0;
export let eatSoundAccum = 0;

// 卡牌与选择
export let cards: Card[] = [];
export let selectedCard: SelectedCard = { type: null, cost: 0, isEmpty: true, isShovel: false, index: -1 };

// 鼠标
export let mouse: MouseState = { x: undefined, y: undefined, clicked: false };

// 实体数组 (will be populated with entity instances)
export let grids: any[] = [];
export let plants: any[] = [];
export let zombies: any[] = [];
export let bullets: any[] = [];
export let suns: any[] = [];
export let explosions: any[] = [];
export let lawnmowers: any[] = [];
export let floatingTexts: any[] = [];
export let menuParticles: MenuParticle[] = [];

// 初始化/重置
export function resetState() {
    sun = 75;
    score = 0;
    currentWave = 0;
    waveTimer = 10000;
    waveCompleted = true;
    hugeWaveTriggered = false;
    hugeWaveTimer = 0;
    zombiesToSpawn = 0;
    zombiesToSpawnTotal = 0;
    spawnDelayTimer = 0;
    sunSpawnAccum = 0;
    eatSoundAccum = 0;
    screenShake = 0;
    grids = [];
    plants = [];
    zombies = [];
    bullets = [];
    suns = [];
    explosions = [];
    lawnmowers = [];
    floatingTexts = [];
    menuParticles = [];
    cards.forEach(c => c.currentCd = 0);
    selectedCard = { type: null, cost: 0, isEmpty: true, isShovel: false, index: -1 };
}
