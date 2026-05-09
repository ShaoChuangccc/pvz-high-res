import Phaser from 'phaser';

/**
 * 豌豆子弹 Pea
 */
export default class Pea extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'pea');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.speed = 400;
        this.damage = 20;
    }

    fire(x, y) {
        this.setPosition(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.setVelocityX(this.speed);
    }

    update() {
        // 超出屏幕销毁
        if (this.x > this.scene.scale.width) {
            this.kill();
        }
    }

    kill() {
        this.setActive(false);
        this.setVisible(false);
        this.setVelocityX(0);
    }
}
