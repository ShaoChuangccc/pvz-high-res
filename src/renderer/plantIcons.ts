// 22种植物的Canvas绘制函数
let ctx: CanvasRenderingContext2D;

export function setPlantIconsCtx(c: CanvasRenderingContext2D) {
    ctx = c;
}

export const plantIcons: Record<string, (x: number, y: number, scale?: number, alpha?: number, extra?: boolean) => void> = {
    Peashooter: (x, y, scale = 1, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#33691e';
        ctx.beginPath(); ctx.ellipse(0, 25, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, 25, 20, 8, Math.PI / 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8bc34a';
        ctx.beginPath(); ctx.arc(0, -5, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(15, -15, 20, 20);
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(5, -10, 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    },
    SnowPea: (x, y, scale = 1, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#006064';
        ctx.beginPath(); ctx.ellipse(0, 25, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#00bcd4';
        ctx.beginPath(); ctx.arc(0, -5, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(15, -15, 20, 20);
        ctx.fillStyle = '#e0f7fa'; ctx.beginPath(); ctx.moveTo(-15, -20); ctx.lineTo(-5, -30); ctx.lineTo(0, -25); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(5, -10, 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    },
    Sunflower: (x, y, scale = 1, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#8bc34a'; ctx.fillRect(-4, 0, 8, 30);
        for (let i = 0; i < 10; i++) {
            ctx.fillStyle = '#fbc02d'; ctx.beginPath();
            ctx.ellipse(Math.cos(i * Math.PI / 5) * 18, Math.sin(i * Math.PI / 5) * 18, 14, 6, i * Math.PI / 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#8d6e63'; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-5, -3, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(5, -3, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(0, 5, 5, 0, Math.PI); ctx.stroke();
        ctx.restore();
    },
    Wallnut: (x, y, scale = 1, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#795548'; ctx.beginPath(); ctx.ellipse(0, 5, 24, 30, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-8, -2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-6, 12); ctx.lineTo(6, 12); ctx.stroke();
        ctx.restore();
    },
    PotatoMine: (x, y, scale = 1, alpha = 1, isArmed = true) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        if (!isArmed) {
            ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.arc(0, 20, 15, 0, Math.PI); ctx.fill();
            ctx.fillStyle = '#ff5252'; ctx.beginPath(); ctx.arc(0, 15, 4, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.fillStyle = '#8d6e63'; ctx.beginPath(); ctx.ellipse(0, 15, 20, 15, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-8, 12, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(8, 12, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ff5252'; ctx.fillRect(-2, -5, 4, 10); ctx.beginPath(); ctx.arc(0, -5, 6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    },
    CherryBomb: (x, y, scale = 1, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#33691e'; ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(-10, -15); ctx.lineTo(10, -15); ctx.stroke();
        ctx.fillStyle = '#e53935';
        ctx.beginPath(); ctx.arc(-12, 5, 16, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(12, 5, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(-16, 2, 2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(-8, 2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, 2, 2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(16, 2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    },
    Repeater: (x, y, scale = 1, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#1b5e20';
        ctx.beginPath(); ctx.ellipse(0, 25, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, 25, 20, 8, Math.PI / 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#689f38';
        ctx.beginPath(); ctx.arc(0, -5, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(15, -15, 20, 20);
        ctx.fillStyle = '#558b2f'; ctx.fillRect(30, -12, 8, 14);
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(5, -10, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(10, -12); ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
    },
    Squash: (x, y, scale = 1, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#558b2f';
        ctx.beginPath(); ctx.ellipse(0, 5, 22, 25, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-8, -2, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -2, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d32f2f';
        ctx.beginPath(); ctx.arc(-8, -2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#33691e'; ctx.fillRect(-15, -10, 30, 4);
        ctx.restore();
    },
    Tallnut: (x, y, scale = 1, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.ellipse(0, 0, 26, 40, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-8, -10, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -10, 4, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#3e2723';
        ctx.beginPath(); ctx.moveTo(-16, -18); ctx.lineTo(-4, -14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(16, -18); ctx.lineTo(4, -14); ctx.stroke();
        ctx.restore();
    },
    Jalapeno: (x, y, scale = 1, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#d32f2f'; ctx.beginPath();
        ctx.ellipse(0, 5, 14, 28, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, 33); ctx.lineTo(15, 20); ctx.lineTo(5, 10); ctx.fill();
        ctx.fillStyle = '#33691e'; ctx.beginPath(); ctx.ellipse(0, -23, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-4, -5, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(4, -5, 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    },
    Threepeater: (x, y, scale = 1, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#33691e'; ctx.beginPath(); ctx.ellipse(0, 25, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
        const drawHead = (hx: number, hy: number) => {
            ctx.save(); ctx.translate(hx, hy);
            ctx.fillStyle = '#8bc34a'; ctx.beginPath(); ctx.arc(0, -5, 14, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(8, -12, 14, 14);
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(4, -8, 3, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        };
        drawHead(-10, 8);
        drawHead(0, -15);
        drawHead(12, 5);
        ctx.restore();
    },
    Chomper: (x, y, scale = 1, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#33691e'; ctx.fillRect(-4, 0, 8, 30);
        ctx.fillStyle = '#7b1fa2';
        ctx.beginPath(); ctx.arc(0, -10, 20, Math.PI, 0); ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI); ctx.fill();
        ctx.fillStyle = '#fff';
        for(let i=-15; i<=15; i+=10) {
            ctx.beginPath(); ctx.moveTo(i, -10); ctx.lineTo(i+4, -2); ctx.lineTo(i+8, -10); ctx.fill();
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i+4, -8); ctx.lineTo(i+8, 0); ctx.fill();
        }
        ctx.restore();
    },
    PuffShroom: (x, y, scale = 1, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#b39ddb';
        ctx.beginPath(); ctx.ellipse(0, 15, 12, 10, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#673ab7';
        ctx.beginPath(); ctx.arc(0, 0, 16, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#9575cd'; ctx.beginPath(); ctx.arc(-6, -8, 4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -5, 3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(4, 12, 2, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    },
    Spikeweed: (x, y, scale = 1, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#757575';
        ctx.beginPath(); ctx.ellipse(0, 20, 25, 8, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#9e9e9e';
        for(let i=-20; i<=20; i+=10) {
            ctx.beginPath(); ctx.moveTo(i-4, 20); ctx.lineTo(i, 5); ctx.lineTo(i+4, 20); ctx.fill();
        }
        ctx.restore();
    },
    SunShroom: (x, y, scale = 1, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.arc(0, 0, 16, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#fff9c4'; ctx.beginPath(); ctx.ellipse(0, 15, 12, 8, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-4, -5, 2, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(4, -5, 2, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    },
    FumeShroom: (x, y, scale = 1, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#7e57c2'; ctx.beginPath(); ctx.ellipse(0, 15, 16, 12, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#512da8'; ctx.beginPath(); ctx.arc(0, 0, 24, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#b39ddb'; ctx.beginPath(); ctx.arc(15, -10, 6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(6, 12, 3, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    },
    ScaredyShroom: (x, y, scale = 1, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ce93d8'; ctx.fillRect(-4, 0, 8, 25);
        ctx.fillStyle = '#8e24aa'; ctx.beginPath(); ctx.arc(0, -5, 12, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-4, 5, 2, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    },
    IceShroom: (x, y, scale = 1, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#4dd0e1'; ctx.beginPath(); ctx.ellipse(0, 15, 20, 10, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#00acc1'; ctx.beginPath(); ctx.moveTo(-25, 10); ctx.lineTo(0, -15); ctx.lineTo(25, 10); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-8, 5, 3, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(8, 5, 3, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    },
    Torchwood: (x, y, scale = 1, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#795548'; ctx.fillRect(-15, 0, 30, 25);
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-5, 10, 3, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(5, 10, 3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ff5722'; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-10, -20); ctx.lineTo(0, -10); ctx.lineTo(10, -25); ctx.lineTo(20, 0); ctx.fill();
        ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(0, -15); ctx.lineTo(10, 0); ctx.fill();
        ctx.restore();
    },
    Garlic: (x, y, scale = 1, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#f5f5f5'; ctx.beginPath(); ctx.ellipse(0, 5, 20, 25, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#bdbdbd'; ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(0, -20); ctx.stroke();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-8, 0, 2, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(8, 0, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(0, 10, 4, Math.PI, 0); ctx.stroke();
        ctx.restore();
    },
    Starfruit: (x, y, scale = 1, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffee58';
        ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(5, -5); ctx.lineTo(20, -5); ctx.lineTo(8, 5); ctx.lineTo(12, 20); ctx.lineTo(0, 10); ctx.lineTo(-12, 20); ctx.lineTo(-8, 5); ctx.lineTo(-20, -5); ctx.lineTo(-5, -5); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-4, 0, 3, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(4, 0, 3, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    },
    SplitPea: (x, y, scale = 1, alpha = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
        ctx.fillStyle = '#689f38'; ctx.beginPath(); ctx.arc(10, -5, 14, 0, Math.PI*2); ctx.fill(); ctx.fillRect(15, -12, 12, 14);
        ctx.beginPath(); ctx.arc(-10, 0, 16, 0, Math.PI*2); ctx.fill(); ctx.fillRect(-26, -8, 16, 16);
        ctx.fillStyle = '#1b5e20'; ctx.beginPath(); ctx.ellipse(0, 25, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(15, -8, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-12, -4, 3, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
};
