import Entity from './Entity';

/**
 * 植物基类 Plant
 */
export class Plant extends Entity {
    constructor(scene, x, y, texture, hp) {
        super(scene, x, y, texture, hp);
        this.setImmovable(true);
    }
}

/**
 * 僵尸基类 Zombie
 */
export class Zombie extends Entity {
    constructor(scene, x, y, texture, hp, speed) {
        super(scene, x, y, texture, hp);
        this.speed = speed;
        this.damagePerSecond = 20;
        this.isEating = false;
        
        // 设置初始速度
        this.setVelocityX(-this.speed);
    }

    update() {
        if (this.isDead) return;
        
        // 如果不在吃植物，保持移动
        if (!this.isEating) {
            this.setVelocityX(-this.speed);
        } else {
            this.setVelocityX(0);
        }
    }

    startEating(plant) {
        this.isEating = true;
        this.eatingTarget = plant;
    }

    stopEating() {
        this.isEating = false;
        this.eatingTarget = null;
    }
}
