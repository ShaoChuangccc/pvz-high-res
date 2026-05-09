import Phaser from 'phaser';
import PlayScene from './PlayScene';
import './style.css';

// Phaser 游戏主配置
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'app',
    backgroundColor: '#1a4a1a', // 草地绿背景
    pixelArt: false,
    scene: [PlayScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

// 启动高保真游戏引擎
window.addEventListener('load', () => {
    new Phaser.Game(config);
});
