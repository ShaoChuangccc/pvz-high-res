import Phaser from 'phaser';
import { Sunflower, Peashooter, WallNut } from './entities/Plants';
import { Zombie } from './entities/BaseEntities';
import Pea from './entities/Pea';

export default class PlayScene extends Phaser.Scene {
    constructor() {
        super('PlayScene');
        
        this.gridConfig = {
            rows: 5,
            cols: 9,
            cellWidth: 80,
            cellHeight: 100,
            offsetX: 60,
            offsetY: 120 // 留出顶部 UI 空间
        };

        this.sunScore = 150; // 初始阳光调高一点方便测试
        this.selectedPlant = null; // 当前选中的植物类型
        
        // 植物库配置
        this.plantLibrary = [
            { name: 'Sunflower', key: 'sunflower', cost: 50, class: Sunflower },
            { name: 'Peashooter', key: 'peashooter', cost: 100, class: Peashooter },
            { name: 'WallNut', key: 'wallnut', cost: 50, class: WallNut }
        ];

        this.isShovelActive = false;
    }

    preload() {
        this.load.image('sunflower', '/sunflower.png');
        this.load.image('peashooter', '/peashooter.png');
        this.load.image('wallnut', '/wallnut.png');
        this.load.image('zombie', '/zombie.png');
        this.load.image('pea', '/pea.png');
        this.load.image('sun', '/sun.png');
        // 加载铲子图标（临时使用一个图形替代或生成一个）
    }

    create() {
        // 1. 初始化物理组
        this.plants = this.add.group({ runChildUpdate: true });
        this.zombies = this.physics.add.group({ runChildUpdate: true });
        this.peas = this.physics.add.group({ classType: Pea, maxSize: 50, runChildUpdate: true });
        this.suns = this.add.group();

        // 2. 绘制场景
        this.drawBackground();
        this.drawGrid();
        this.createUI();

        // 3. 碰撞检测
        this.physics.add.overlap(this.peas, this.zombies, (pea, zombie) => {
            if (pea.active && zombie.active) {
                zombie.takeDamage(pea.damage);
                pea.kill();
            }
        });

        this.physics.add.overlap(this.zombies, this.plants, (zombie, plant) => {
            if (!zombie.isEating) zombie.startEating(plant);
        });

        // 4. 输入与交互
        this.input.on('pointerdown', (pointer) => {
            this.handleGridClick(pointer.x, pointer.y);
        });

        // 5. 关卡逻辑
        this.time.addEvent({
            delay: 5000,
            callback: this.spawnRandomZombie,
            callbackScope: this,
            loop: true
        });
    }

    update(time) {
        this.zombies.children.iterate((zombie) => {
            if (!zombie) return;
            if (zombie.isEating && (!zombie.eatingTarget || zombie.eatingTarget.isDead)) {
                zombie.stopEating();
            }
            if (zombie.isEating && zombie.eatingTarget) {
                zombie.eatingTarget.takeDamage(0.5);
            }
            if (zombie.x < 0) this.gameOver();
        });

        this.sunText.setText(this.sunScore);
    }

    /**
     * 绘制精美的背景
     */
    drawBackground() {
        // 绘制草地渐变或色块
        const graphics = this.add.graphics();
        graphics.fillGradientStyle(0x1a4a1a, 0x1a4a1a, 0x2a5a2a, 0x2a5a2a, 1);
        graphics.fillRect(0, 0, 800, 600);
    }

    drawGrid() {
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0xffffff, 0.1);
        for (let r = 0; r <= this.gridConfig.rows; r++) {
            const y = this.gridConfig.offsetY + r * this.gridConfig.cellHeight;
            graphics.lineBetween(this.gridConfig.offsetX, y, this.gridConfig.offsetX + this.gridConfig.cols * this.gridConfig.cellWidth, y);
        }
        for (let c = 0; c <= this.gridConfig.cols; c++) {
            const x = this.gridConfig.offsetX + c * this.gridConfig.cellWidth;
            graphics.lineBetween(x, this.gridConfig.offsetY, x, this.gridConfig.offsetY + this.gridConfig.rows * this.gridConfig.cellHeight);
        }
    }

    /**
     * 创建顶部卡片 UI
     */
    createUI() {
        // 顶部边框
        const uiPanel = this.add.graphics();
        uiPanel.fillStyle(0x333333, 0.8);
        uiPanel.fillRoundedRect(10, 10, 780, 90, 10);
        
        // 阳光计数器
        this.add.image(45, 55, 'sun').setScale(0.6);
        this.sunText = this.add.text(80, 42, '150', { fontSize: '28px', fontWeight: 'bold', color: '#ffd700' });

        // 创建植物卡片
        this.cardSprites = [];
        this.plantLibrary.forEach((plant, index) => {
            const x = 180 + index * 100;
            const y = 55;
            
            const cardBg = this.add.graphics();
            cardBg.fillStyle(0x555555, 1);
            cardBg.fillRoundedRect(x - 45, y - 40, 90, 80, 5);
            
            const sprite = this.add.image(x, y - 10, plant.key).setScale(0.5).setInteractive();
            this.add.text(x, y + 25, `${plant.cost}`, { fontSize: '14px', color: '#fff' }).setOrigin(0.5);
            
            sprite.on('pointerdown', () => {
                this.selectPlant(plant);
            });
            
            // 悬停效果
            sprite.on('pointerover', () => sprite.setTint(0x00ff00));
            sprite.on('pointerout', () => {
                if (this.selectedPlant !== plant) sprite.clearTint();
            });

            this.cardSprites.push({ sprite, plant });
        });

        // 铲子按钮
        const shovelBtn = this.add.text(700, 55, 'SHOVEL', { 
            fontSize: '18px', 
            backgroundColor: '#8b4513', 
            padding: { x: 10, y: 10 } 
        }).setOrigin(0.5).setInteractive();
        
        shovelBtn.on('pointerdown', () => {
            this.isShovelActive = !this.isShovelActive;
            shovelBtn.setBackgroundColor(this.isShovelActive ? '#ff0000' : '#8b4513');
            if (this.isShovelActive) this.selectedPlant = null;
        });
    }

    selectPlant(plant) {
        this.isShovelActive = false;
        this.selectedPlant = plant;
        // 高亮选中的卡片
        this.cardSprites.forEach(c => c.sprite.clearTint());
        const selectedCard = this.cardSprites.find(c => c.plant === plant);
        if (selectedCard) selectedCard.sprite.setTint(0x00ff00);
    }

    handleGridClick(x, y) {
        const col = Math.floor((x - this.gridConfig.offsetX) / this.gridConfig.cellWidth);
        const row = Math.floor((y - this.gridConfig.offsetY) / this.gridConfig.cellHeight);

        if (col >= 0 && col < this.gridConfig.cols && row >= 0 && row < this.gridConfig.rows) {
            if (this.isShovelActive) {
                this.removePlantAt(col, row);
            } else if (this.selectedPlant) {
                this.tryPlant(col, row);
            }
        }
    }

    tryPlant(col, row) {
        // 检查是否已有植物
        const plantAtPos = this.getPlantAt(col, row);
        if (plantAtPos) return;

        if (this.sunScore < this.selectedPlant.cost) {
            this.cameras.main.shake(100, 0.005); // 钱不够晃动一下
            return;
        }

        const spawnX = this.gridConfig.offsetX + col * this.gridConfig.cellWidth + this.gridConfig.cellWidth / 2;
        const spawnY = this.gridConfig.offsetY + row * this.gridConfig.cellHeight + this.gridConfig.cellHeight / 2;

        let plant;
        if (this.selectedPlant.name === 'Peashooter') {
            plant = new this.selectedPlant.class(this, spawnX, spawnY, row);
        } else {
            plant = new this.selectedPlant.class(this, spawnX, spawnY);
        }
        
        plant.gridPos = { col, row };
        this.plants.add(plant);
        this.sunScore -= this.selectedPlant.cost;
    }

    removePlantAt(col, row) {
        const plant = this.getPlantAt(col, row);
        if (plant) plant.die();
    }

    getPlantAt(col, row) {
        let found = null;
        this.plants.children.iterate(p => {
            if (p && p.gridPos && p.gridPos.col === col && p.gridPos.row === row) found = p;
        });
        return found;
    }

    spawnRandomZombie() {
        const row = Phaser.Math.Between(0, 4);
        const y = this.gridConfig.offsetY + row * this.gridConfig.cellHeight + this.gridConfig.cellHeight / 2;
        const zombie = new Zombie(this, 850, y, 'zombie', 100, 30);
        zombie.row = row;
        this.zombies.add(zombie);
    }

    spawnSun(x, y) {
        const sun = this.add.sprite(x, y, 'sun').setInteractive();
        sun.setScale(0.8);
        this.tweens.add({ targets: sun, y: y - 50, alpha: { from: 0, to: 1 }, duration: 500 });

        sun.on('pointerdown', () => {
            this.sunScore += 25;
            this.tweens.add({
                targets: sun,
                x: 45, y: 55,
                scale: 0.2,
                duration: 600,
                ease: 'Back.easeIn',
                onComplete: () => sun.destroy()
            });
        });
    }

    spawnPea(x, y) {
        const pea = this.peas.get();
        if (pea) pea.fire(x, y);
    }

    hasZombieInRow(row) {
        let found = false;
        this.zombies.children.iterate((z) => {
            if (z && z.active && z.row === row && z.x > 0 && z.x < 800) found = true;
        });
        return found;
    }

    gameOver() {
        this.physics.pause();
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, 800, 600);
        this.add.text(400, 300, 'ZOMBIES ATE YOUR BRAINS!', { fontSize: '42px', fill: '#f00', fontWeight: 'bold' }).setOrigin(0.5);
        this.add.text(400, 360, 'Click to Restart', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5).setInteractive()
            .on('pointerdown', () => this.scene.restart());
    }
}
