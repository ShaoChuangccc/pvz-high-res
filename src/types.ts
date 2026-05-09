import type { PlantType } from './config';

export type GameState = 'mainMenu' | 'seedSelection' | 'playing' | 'paused' | 'gameOver';

export interface Card {
    type: PlantType;
    cost: number;
    name: string;
    cd: number;
    currentCd: number;
}

export interface SelectedCard {
    type: PlantType | null;
    cost: number;
    isEmpty: boolean;
    isShovel: boolean;
    index: number;
}

export interface MouseState {
    x: number | undefined;
    y: number | undefined;
    clicked: boolean;
}

export type BulletType = 'normal' | 'snow' | 'fire' | 'star';

export type PlantIconFn = (
    x: number,
    y: number,
    scale?: number,
    alpha?: number,
    extra?: boolean
) => void;

export interface MenuParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    life: number;
    color: string;
}

export interface ExplosionParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
}
