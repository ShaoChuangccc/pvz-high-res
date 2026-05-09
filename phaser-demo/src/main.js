import Phaser from 'phaser';
import './style.css';

/**
 * 基础场景类 - 使用 ES6 Class 语法
 */
class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    /**
     * 预加载阶段：加载资源
     */
    preload() {
        console.log('Preloading assets...');
        // 加载我们在 public 文件夹中准备好的 logo
        this.load.image('logo', '/logo.png');
    }

    /**
     * 创建阶段：初始化游戏对象
     */
    create() {
        console.log('Creating game objects...');
        
        // 获取屏幕中心坐标
        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height / 2;

        // 添加占位图并居中
        const logo = this.add.image(centerX, centerY, 'logo');
        
        // 添加一点简单的动画效果，让它看起来更生动
        logo.setAlpha(0);
        this.tweens.add({
            targets: logo,
            alpha: 1,
            scale: { from: 0.5, to: 1 },
            duration: 1000,
            ease: 'Back.easeOut'
        });

        // 添加文字提示
        this.add.text(centerX, centerY + 150, 'Phaser 3 + Vite Boilerplate', {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);
    }
}

// Phaser 游戏配置
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'app', // 对应 index.html 中的 div id
    backgroundColor: '#1a1a2e',
    scene: MainScene,
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

// 启动游戏
new Phaser.Game(config);
