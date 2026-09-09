const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');

// --- GAME STATE ---
let currentLevel = 0;
let energy = 0;
let maxEnergy = 0;
let gameState = 'playing'; // 'playing', 'animating', 'gameover'
let nodes = [];
let edges = [];
let particles = [];
let time = 0;

// --- LEVEL DATA ---
const levels = [
    {
        // Level 1: Tutorial
        energy: 3,
        nodes: [
            { id: 0, x: 200, y: 50, active: true, type: 'input', label: 'INPUT' },
            { id: 1, x: 200, y: 150, active: false, type: 'hidden' },
            { id: 2, x: 200, y: 250, active: false, type: 'hidden' },
            { id: 3, x: 200, y: 350, active: false, type: 'output', label: 'OUTPUT' }
        ],
        edges: [[0, 1], [1, 2], [2, 3]]
    },
    {
        // Level 2: The Fork
        energy: 4,
        nodes: [
            { id: 0, x: 200, y: 50, active: true, type: 'input', label: 'INPUT' },
            { id: 1, x: 100, y: 150, active: false, type: 'hidden' },
            { id: 2, x: 300, y: 150, active: false, type: 'hidden' },
            { id: 3, x: 100, y: 250, active: false, type: 'hidden' },
            { id: 4, x: 300, y: 250, active: false, type: 'hidden' },
            { id: 5, x: 200, y: 350, active: false, type: 'output', label: 'OUTPUT' }
        ],
        edges: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5], [2, 3]]
    },
    {
        // Level 3: Network Web
        energy: 5,
        nodes: [
            { id: 0, x: 200, y: 50, active: true, type: 'input', label: 'INPUT' },
            { id: 1, x: 100, y: 150, active: false, type: 'hidden' },
            { id: 2, x: 300, y: 150, active: false, type: 'hidden' },
            { id: 3, x: 200, y: 220, active: false, type: 'hidden' },
            { id: 4, x: 70, y: 280, active: false, type: 'hidden' },
            { id: 5, x: 330, y: 280, active: false, type: 'hidden' },
            { id: 6, x: 200, y: 330, active: false, type: 'hidden' },
            { id: 7, x: 200, y: 430, active: false, type: 'output', label: 'OUTPUT' }
        ],
        edges: [[0, 1], [0, 2], [1, 3], [2, 3], [1, 4], [2, 5], [3, 6], [4, 6], [5, 6], [6, 7], [4, 7]]
    }
];

// --- INITIALIZATION ---
function loadLevel(levelIdx) {
    if (levelIdx >= levels.length) {
        statusText.innerText = "ALL SYSTEMS COMPROMISED. YOU WIN.";
        statusText.style.color = "#2ea043";
        gameState = 'gameover';
        return;
    }
    
    const lvl = levels[levelIdx];
    maxEnergy = lvl.energy;
    energy = maxEnergy;
    nodes = JSON.parse(JSON.stringify(lvl.nodes)); // Deep copy
    edges = JSON.parse(JSON.stringify(lvl.edges));
    particles = [];
    gameState = 'playing';
    
    statusText.innerText = `System Standby... (Level ${levelIdx + 1})`;
    statusText.style.color = "#c9d1d9";
}

// --- LOGIC ---
function getWinningPath() {
    // BFS to find the shortest active path
    const visited = new Set([0]);
    const queue = [[0]]; 
    
    while (queue.length > 0) {
        const path = queue.shift();
        const currentId = path[path.length - 1];
        const currentNode = nodes.find(n => n.id === currentId);
        
        if (currentNode.type === 'output') return path;
        
        edges.forEach(([n1, n2]) => {
            let neighborId = (n1 === currentId) ? n2 : (n2 === currentId) ? n1 : null;
            if (neighborId !== null) {
                const neighbor = nodes.find(n => n.id === neighborId);
                if (neighbor.active && !visited.has(neighborId)) {
                    visited.add(neighborId);
                    queue.push([...path, neighborId]);
                }
            }
        });
    }
    return null;
}

function triggerWin(path) {
    gameState = 'animating';
    statusText.innerText = "SIGNAL ROUTED. BREACHING NEXT NODE...";
    statusText.style.color = "#58a6ff";

    // Spawn data burst particles along the winning path
    for (let i = 0; i < path.length - 1; i++) {
        const n1 = nodes.find(n => n.id === path[i]);
        const n2 = nodes.find(n => n.id === path[i+1]);
        
        for (let p = 0; p < 20; p++) {
            particles.push({
                x: n1.x, y: n1.y,
                targetX: n2.x, targetY: n2.y,
                speed: 0.02 + Math.random() * 0.03,
                progress: -Math.random(), // Staggered start
                color: '#58a6ff'
            });
        }
    }

    setTimeout(() => {
        currentLevel++;
        loadLevel(currentLevel);
    }, 2500);
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

function drawHUD() {
    ctx.fillStyle = '#fff';
    ctx.font = '14px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText(`POWER: ${energy}/${maxEnergy}`, 15, 25);
    ctx.fillText(`LEVEL: ${currentLevel + 1}/${levels.length}`, 15, 45);
}

function gameLoop() {
    time += 0.05;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawGrid();

    // Draw Edges
    edges.forEach(([n1Id, n2Id]) => {
        const n1 = nodes.find(n => n.id === n1Id);
        const n2 = nodes.find(n => n.id === n2Id);
        
        const isActive = n1.active && n2.active;
        
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        
        if (isActive) {
            ctx.strokeStyle = '#58a6ff';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#58a6ff';
        } else {
            ctx.strokeStyle = '#30363d';
            ctx.lineWidth = 1;
            ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset

        // Animated flowing data dots on active lines
        if (isActive && gameState === 'playing') {
            const flowOffset = (time % 1);
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(n1.x + dx * flowOffset, n1.y + dy * flowOffset, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Draw Particles (Win Animation)
    particles.forEach(p => {
        if (p.progress >= 0 && p.progress <= 1) {
            const curX = p.x + (p.targetX - p.x) * p.progress;
            const curY = p.y + (p.targetY - p.y) * p.progress;
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = p.color;
            ctx.beginPath();
            ctx.arc(curX, curY, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        p.progress += p.speed;
    });

    // Draw Nodes
    nodes.forEach(node => {
        ctx.beginPath();
        
        // Pulsing radius for active nodes
        let radius = 18;
        if (node.active && gameState === 'playing') {
            radius += Math.sin(time * 3) * 2;
            ctx.shadowBlur = 15;
            ctx.shadowColor = node.type === 'output' ? '#2ea043' : '#58a6ff';
        }

        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        
        if (node.type === 'input') ctx.fillStyle = '#1f6feb';
        else if (node.type === 'output') ctx.fillStyle = node.active ? '#2ea043' : '#21262d';
        else ctx.fillStyle = node.active ? '#58a6ff' : '#21262d';

        ctx.fill();
        
        ctx.strokeStyle = '#c9d1d9';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset

        // Node labels
        if (node.label) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px Courier New';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.label, node.x, node.type === 'input' ? node.y - 30 : node.y + 30);
        }
    });

    if (gameState !== 'gameover') drawHUD();

    requestAnimationFrame(gameLoop);
}

// --- INTERACTION ---
canvas.addEventListener('click', (e) => {
    if (gameState !== 'playing') return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    nodes.forEach(node => {
        if (node.type === 'input') return;
        
        const dist = Math.sqrt((clickX - node.x)**2 + (clickY - node.y)**2);
        if (dist <= 20) {
            
            // Toggle Logic & Energy Constraint
            if (!node.active && energy > 0) {
                node.active = true;
                energy--;
            } else if (node.active) {
                node.active = false;
                energy++;
            } else {
                // Not enough energy visual feedback
                statusText.innerText = "INSUFFICIENT POWER.";
                statusText.style.color = "#f85149";
                setTimeout(() => { if(gameState === 'playing') statusText.style.color = "#c9d1d9"; }, 1000);
            }
            
            // Check win
            const path = getWinningPath();
            if (path) {
                triggerWin(path);
            }
        }
    });
});

resetBtn.addEventListener('click', () => {
    if (gameState !== 'gameover') {
        loadLevel(currentLevel);
    } else {
        currentLevel = 0;
        loadLevel(currentLevel);
    }
});

// Start Game
loadLevel(0);
gameLoop();
