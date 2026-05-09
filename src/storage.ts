// IndexedDB 高分存储

const DB_NAME = 'PvZ_Roguelike_DB';
const DB_VERSION = 1;
const STORE_NAME = 'game_stats';

function initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveHighScore(score: number): Promise<boolean> {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(score, 'high_score');
        return new Promise((resolve) => {
            tx.oncomplete = () => resolve(true);
        });
    } catch {
        return false;
    }
}

export async function loadHighScore(): Promise<number> {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get('high_score');
        return new Promise((resolve) => {
            request.onsuccess = () => {
                if (request.result !== undefined) {
                    resolve(request.result as number);
                } else {
                    const oldScore = localStorage.getItem('pvz_high_score');
                    if (oldScore) {
                        const score = parseInt(oldScore);
                        saveHighScore(score);
                        resolve(score);
                    } else {
                        resolve(0);
                    }
                }
            };
            request.onerror = () => resolve(0);
        });
    } catch {
        return 0;
    }
}
