// 游戏核心常量配置

export const cellSize = 100;
export const gridOffsetY = 100;
export const gridRows = 7;
export const gridCols = 12;

export const sunSpawnInterval = 18000;

export const plantTemplates = [
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
    { type: 'SplitPea', cost: 125, name: '裂荚', cd: 1500 },
] as const;

export type PlantType = typeof plantTemplates[number]['type'];

export const DB_NAME = 'PvZ_Roguelike_DB';
export const DB_VERSION = 1;
export const STORE_NAME = 'game_stats';

export const maxCards = 9;
