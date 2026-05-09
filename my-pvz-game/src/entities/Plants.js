import { Plant } from './BaseEntities';

/**
 * 向日葵 Sunflower
 */
export class Sunflower extends Plant {
    constructor(scene, x, y) {
        super(scene, x, y, 'sunflower', 100);
        
        // 生成阳光的计时器
        this.sunTimer = scene.time.addEvent({
            delay: 10000, // 10秒
            callback: this.generateSun,
            callbackScope: this,
            loop: true
        });
    }

    generateSun() {
        if (this.isDead) return;
        this.scene.spawnSun(this.x, this.y);
    }

    die() {
        if (this.sunTimer) this.sunTimer.remove();
        super.die();
    }
}

/**
 * 坚果墙 WallNut
 */
export class WallNut extends Plant {
    constructor(scene, x, y) {
        // 坚果墙拥有极高的 HP (例如 1000)
        super(scene, x, y, 'wallnut', 1000);
    }
}

/**
 * 豌豆射手 Peashooter
 */
export class Peashooter extends Plant {
    constructor(scene, x, y, row) {
        super(scene, x, y, 'peashooter', 150);
        this.row = row;
        this.attackInterval = 2000; // 2秒发射一次
        this.lastFired = 0;
    }

    update(time) {
        if (this.isDead) return;

        // 检查当前行是否有僵尸
        if (this.scene.hasZombieInRow(this.row)) {
            if (time > this.lastFired + this.attackInterval) {
                this.shoot();
                this.lastFired = time;
            }
        }
    }

    shoot() {
        this.scene.spawnPea(this.x + 30, this.y - 10);
    }
}
