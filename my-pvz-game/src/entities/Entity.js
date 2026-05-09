import Phaser from 'phaser';

/**
 * 实体基类 Entity
 */
export default class Entity extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, hp) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.hp = hp;
        this.maxHp = hp;
        this.isDead = false;

        // 统一缩放，确保 128x128 的贴图能放入 80x100 的网格
        this.setScale(0.6);
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0 && !this.isDead) {
            this.die();
        }
    }

    die() {
        this.isDead = true;
        this.destroy();
    }
}
