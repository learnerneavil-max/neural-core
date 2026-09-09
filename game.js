const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusLog = document.getElementById('statusLog');
const powerVal = document.getElementById('powerVal');
const scoreVal = document.getElementById('scoreVal');
const resetBtn = document.getElementById('resetBtn');

// --- GAME STATE & CONSTANTS ---
let currentLevel = 0;
let energy = 0;
let maxEnergy = 0;
let gameState = 'playing'; // 'playing', 'animating_win', 'reward_screen', 'gameover'
let nodes = [];
let edges = [];
let particles = [];
let time = 0;
let dataCollected = 0;
let totalDataRequired = 0;
let currentScore = 0;
let levelStartTime = 0;

const BASE_POWER_COST = 1;
const DATA_NODE_REWARD = 2000;
const AMPLIFIER_BONUS_POWER = 1;
const REWARD_SCREEN_DURATION = 3500; // ms

// --- LEVEL DATA (Expanded) ---
const levels = [
    {
        // Level 1: Network Hub Alpha
        energy: 4,
        data: 1, // Data nodes to collect on path
        nodes: [
            { id: 0, x: 200, y: 50, active: true, type: 'input', label: 'INPUT' },
            { id: 1, x: 200, y: 150, active: false, type: 'hidden' },
            { id: 2, x: 300, y: 200, active: false, type: 'hidden' },
            { id: 3, x: 200, y: 250, active: false, type: 'data', label: 'DATA' }, // Must collect this
            { id: 4, x: 200, y: 350, active: false, type: 'output', label: 'OUTPUT' }
        ],
        edges: [[0, 1], [1, 2], [1, 3], [2, 3], [3, 4]]
    },
    {
        // Level 2: Core Matrix
        energy: 6,
        data: 2,
        nodes: [
            { id: 0, x: 200, y: 50, active: true, type: 'input', label: 'INPUT' },
            { id: 1, x: 100, y: 150, active: false, type: 'hidden' },
            { id: 2, x: 300, y: 150, active: false, type: 'amplifier', label: '+PWR' }, // Extra energy!
            { id: 3, x: 100, y: 250, active: false, type: 'hidden' },
            { id: 4, x: 300, y: 250, active: false, type: 'hidden' },
            { id: 5, x: 200, y: 350, active: false, type: 'data', label: 'DATA' },
            { id: 6, x: 100, y: 380, active: false, type: 'data', label: 'DATA' },
            { id: 7, x: 200, y: 450, active: false, type: 'output', label: 'OUTPUT' }
        ],
        edges: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5], [2, 3], [5, 6], [5, 7], [6, 7]]
    },
    {
        // Level 3: Network Web (Expanded and made more complex)
        energy: 7,
        data: 3,
        nodes: [
            { id: 0, x: 200, y: 50, active: true, type: 'input', label: 'INPUT' },
            { id: 1, x: 100, y: 150, active: false, type: 'hidden' },
            { id: 2, x: 300, y: 150, active: false, type: 'amplifier', label: '+PWR' },
            { id: 3, x: 200, y: 200, active: false, type: 'data', label: 'DATA' },
            { id: 4, x: 70, y: 280, active: false, type: 'hidden' },
            { id: 5, x: 330, y: 280, active: false, type: 'data', label: 'DATA' },
            { id: 6, x: 200, y: 330, active: false, type: 'amplifier', label: '+PWR' },
            { id: 7, x: 150, y: 380, active: false, type: 'data', label: 'DATA' },
            { id: 8, x: 200, y: 450, active: false, type: 'output', label: 'OUTPUT' }
        ],
        edges: [[0, 1], [0, 2], [1, 3], [2, 3], [1, 4], [2, 5], [3, 6], [4, 6], [5, 6], [6, 7], [7, 8], [4, 8]]
    }
];

// --- LOGGING ---
function addLog(message, type = '') {
    const p = document.createElement('p');
    p.innerText = `> ${message}`;
    if (type) p.classList.add(type);
    statusLog.appendChild(p);
    statusLog.scrollTop = statusLog.scrollHeight;
}

// --- INITIALIZATION ---
function loadLevel(levelIdx) {
    if (levelIdx >= levels.length) {
        addLog("ALL SYSTEMS COMPROMISED. YOU WIN.", 'success');
        gameState = 'gameover';
        return;
    }
    
    statusLog.innerHTML = ""; // Clear log
    const lvl = levels[levelIdx];
    maxEnergy = lvl.energy;
    energy = maxEnergy;
    totalDataRequired = lvl.data;
    dataCollected = 0;
    nodes = JSON.parse(JSON.stringify(lvl.nodes));
    edges = JSON.parse(JSON.stringify(lvl.edges));
    particles = [];
    currentScore = 0;
    levelStartTime = Date.now();
    gameState = 'playing';
    
    updateHUD();
    addLog(`INIT_LINK... Level ${levelIdx + 1}`);
    addLog(`Power: ${energy}/${maxEnergy} // Data required: ${totalDataRequired}`);
}

function updateHUD() {
    powerVal.innerText = energy;
    scoreVal.innerText = currentScore.toLocaleString();
}

// --- LOGIC ---
function checkPath(path) {
    let collectedData = 0;
    path.forEach(nodeId => {
        const node = nodes.find(n => n.id === nodeId);
        if (node.type === 'data') collectedData++;
    });
    return collectedData >= totalDataRequired;
}

function calculateScore() {
    const timeTaken = (Date.now() - levelStartTime) / 1000;
    const powerEfficiencyBonus = Math.max(0, energy) * 500;
    const timeBonus = Math.max(0, 30 - timeTaken) * 200;
    const dataBonus = dataCollected * DATA_NODE_REWARD;
    return Math.floor(powerEfficiencyBonus + timeBonus + dataBonus);
}

function getWinningPath() {
    // Modified BFS to find *shortest active path that also collects required data*
    // This is more complex than simple pathfinding
    const startNode = nodes.find(n => n.type === 'input');
    const endNode = nodes.find(n => n.type === 'output');
    if (!startNode || !endNode) return null;

    const queue = [{ path: [startNode.id], dataCollected: 0 }];
    const visited = new Set();
    // Path uniqueness based on (endNode, collectedDataCount) for a true state space search
    visited.add(`${startNode.id}_0`);

    while (queue.length > 0) {
        const { path, dataCollected } = queue.shift();
        const currentId = path[path.length - 1];
        
        if (currentId === endNode.id && dataCollected >= totalDataRequired) {
            return path;
        }

        edges.forEach(([n1, n2]) => {
            let neighborId = (n1 === currentId) ? n2 : (n2 === currentId) ? n1 : null;
            if (neighborId !== null) {
                const neighbor = nodes.find(n => n.id === neighborId);
                if (neighbor.active) {
                    const newDataCollected = neighbor.type === 'data' ? dataCollected + 1 : dataCollected;
                    const stateKey = `${neighborId}_${newDataCollected}`;
                    
                    if (!visited.has(stateKey)) {
                        visited.add(stateKey);
                        queue.push({
                            path: [...path, neighborId],
                            dataCollected: newDataCollected
                        });
                    }
                }
            }
        });
    }
    return null;
}

function triggerWin(path) {
    gameState = 'animating_win';
    dataCollected = totalDataRequired;
    currentScore = calculateScore();
    updateHUD();
    addLog("UPLINK SUCCESSFUL. SYSTEM BREACH COMPLETE.", 'success');
    addLog(`Calculating score: +${currentScore}...`);

    // Multi-colored data cascade particles for more impressive reward
    const outputNode = nodes.find(n => n.type === 'output');
    const colors = ['#2ea043', '#58a6ff', '#ffb700']; // green, cyan, yellow
    for (let i = 0; i < path.length - 1; i++) {
        const n1 = nodes.find(n => n.id === path[i]);
        const n2 = nodes.find(n => n.id === path[i+1]);
        
        for (let p = 0; p < 25; p++) {
            particles.push({
                x: n1.x, y: n1.y,
                targetX: n2.x, targetY: n2.y,
                speed: 0.015 + Math.random() * 0.03,
                progress: -Math.random() * 0.8, // More staggered
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 3 + Math.random() * 2
            });
        }
    }

    // Delay showing the reward screen
    setTimeout(() => {
        if (gameState === 'animating_win') {
            gameState = 'reward_screen';
            addLog("Preparing next breach node...", 'success');
        }
    }, 2500);

    // Proceed to next level after the reward screen
    setTimeout(() => {
        if (gameState === 'reward_screen') {
            currentLevel++;
            loadLevel(currentLevel);
        }
    }, REWARD_SCREEN_DURATION);
}

// --- RENDERING ---
function drawGrid() {
    ctx.strokeStyle = '#1a1f24';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }
}

function drawNodes() {
    nodes.forEach(node => {
        ctx.beginPath();
        
        let radius = 18;
        let mainColor = '#21262d'; // Off/default
        let outlineColor = '#c9d1d9';
        
        // Active pulsing/glowing
        if (node.active && gameState !== 'reward_screen') {
            radius += Math.sin(time * 3) * 2;
            ctx.shadowBlur = 15;
            
            if (node.type === 'input') { mainColor = '#1f6feb'; ctx.shadowColor = mainColor; }
            else if (node.type === 'output') { mainColor = '#2ea043'; ctx.shadowColor = mainColor; }
            else if (node.type === 'amplifier') { mainColor = '#be73ff'; ctx.shadowColor = mainColor; }
            else if (node.type === 'data') { mainColor = '#ffb700'; ctx.shadowColor = mainColor; }
            else { mainColor = '#58a6ff'; ctx.shadowColor = mainColor; } // Hidden
        } else {
            // Distinct off colors for types
            if (node.type === 'amplifier') mainColor = '#412d59';
            else if (node.type === 'data') mainColor = '#7a5a1e';
        }

        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = mainColor;
        ctx.fill();
        
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Node labels
        if (node.label) {
            ctx.fillStyle = node.active ? '#fff' : '#c9d1d9';
            ctx.font = 'bold 11px Courier New';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.label, node.x, node.type === 'input' ? node.y - 30 : node.y + 30);
        }
    });
}

function drawRewardScreen() {
    // Fill background with semi-transparent black
    ctx.fillStyle = 'rgba(13, 17, 23, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Large central reward text
    ctx.font = '40px Courier New';
    ctx.fillStyle = '#ffb700'; // Yellow
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('UPLINK SUCCESSFUL', canvas.width / 2, canvas.height / 2 - 40);
    
    // Score display
    ctx.font = '24px Courier New';
    ctx.fillStyle = '#fff';
    ctx.fillText(`BREACH SCORE: ${currentScore.toLocaleString()}`, canvas.width / 2, canvas.height / 2 + 10);
    
    // Progress bar for next level loading
    const progress = (Date.now() - (levelStartTime + REWARD_SCREEN_DURATION)) / (REWARD_SCREEN_DURATION / 2);
    const barWidth = 200;
    const barHeight = 10;
    const curWidth = barWidth * Math.min(1, Math.max(0, progress + 1));
    
    ctx.strokeStyle = '#c9d1d9';
    ctx.strokeRect((canvas.width - barWidth) / 2, canvas.height / 2 + 50, barWidth, barHeight);
    
    ctx.fillStyle = '#58a6ff';
    ctx.fillRect((canvas.width - barWidth) / 2, canvas.height / 2 + 50, curWidth, barHeight);
    
    ctx.font = '12px Courier New';
    ctx.fillStyle = '#fff';
    ctx.fillText('LOADING NEXT NODE...', canvas.width / 2, canvas.height / 2 + 75);
}

function gameLoop() {
    time += 0.05;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawGrid();

    // Draw Edges (with data flow animation)
    edges.forEach(([n1Id, n2Id]) => {
        const n1 = nodes.find(n => n.id === n1Id);
        const n2 = nodes.find(n => n.id === n2Id);
        const isActive = n1.active && n2.active;
        
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.strokeStyle = isActive ? '#58a6ff' : '#30363d';
        ctx.lineWidth = isActive ? 3 : 1;
        ctx.shadowBlur = isActive ? 10 : 0;
        ctx.shadowColor = '#58a6ff';
        ctx.stroke();
        ctx.shadowBlur = 0;

        if (isActive && gameState === 'playing') {
            const dx = n2.x - n1.x, dy = n2.y - n1.y;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(n1.x + dx * (time%1), n1.y + dy * (time%1), 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Draw Particles (Multi-colored cascade)
    particles.forEach(p => {
        if (p.progress >= 0 && p.progress <= 1) {
            const curX = p.x + (p.targetX - p.x) * p.progress;
            const curY = p.y + (p.targetY - p.y) * p.progress;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(curX, curY, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        p.progress += p.speed;
    });

    drawNodes();
    
    if (gameState === 'reward_screen') drawRewardScreen();

    requestAnimationFrame(gameLoop);
}

// --- INTERACTION ---
canvas.addEventListener('click', (e) => {
    if (gameState !== 'playing') return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    nodes.forEach(node => {
        if (node.type === 'input' || node.type === 'output') return;
        
        const dist = Math.sqrt((clickX - node.x)**2 + (clickY - node.y)**2);
        if (dist <= 20) {
            const cost = BASE_POWER_COST;
            
            if (!node.active && energy >= cost) {
                node.active = true;
                energy -= cost;
                addLog(`Activated node [id:${node.id}] / type:${node.type} / power cost: ${cost}`);
                
                // Amplifier logic: Boost energy if an amplifier is activated
                if (node.type === 'amplifier') {
                    energy += AMPLIFIER_BONUS_POWER;
                    addLog(`AMPLIFIER [id:${node.id}] ACTIVE: +${AMPLIFIER_BONUS_POWER} power received.`, 'success');
                }
            } else if (node.active) {
                node.active = false;
                energy += cost;
                addLog(`Deactivated node [id:${node.id}] / power returned: ${cost}`);
                
                if (node.type === 'amplifier') {
                    energy -= AMPLIFIER_BONUS_POWER;
                    addLog(`AMPLIFIER [id:${node.id}] OFFLINE: bonus power lost.`, 'error');
                }
            } else {
                addLog(`INSUFFICIENT POWER: Cannot activate node.`, 'error');
            }
            
            updateHUD();
            
            // Re-calculate victory conditions with new complex conditions
            const path = getWinningPath();
            if (path) {
                if (checkPath(path)) {
                    triggerWin(path);
                } else {
                    addLog("Path active but requires all data nodes.", 'error');
                }
            }
        }
    });
});

resetBtn.addEventListener('click', () => {
    currentLevel = 0;
    loadLevel(currentLevel);
});

// Start Game
loadLevel(0);
gameLoop();
