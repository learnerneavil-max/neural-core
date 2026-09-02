const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');

// Define the neural graph
const nodes = [
    { id: 0, x: 200, y: 50, active: true, type: 'input', label: 'INPUT' },
    { id: 1, x: 100, y: 150, active: false, type: 'hidden' },
    { id: 2, x: 300, y: 150, active: false, type: 'hidden' },
    { id: 3, x: 200, y: 250, active: false, type: 'hidden' },
    { id: 4, x: 100, y: 350, active: false, type: 'hidden' },
    { id: 5, x: 300, y: 350, active: false, type: 'hidden' },
    { id: 6, x: 200, y: 450, active: false, type: 'output', label: 'OUTPUT' }
];

const edges = [
    [0, 1], [0, 2],
    [1, 3], [2, 3], [1, 4], [2, 5],
    [3, 4], [3, 5],
    [4, 6], [5, 6]
];

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw edges
    edges.forEach(([n1, n2]) => {
        const node1 = nodes[n1];
        const node2 = nodes[n2];
        ctx.beginPath();
        ctx.moveTo(node1.x, node1.y);
        ctx.lineTo(node2.x, node2.y);
        ctx.strokeStyle = (node1.active && node2.active) ? '#58a6ff' : '#30363d';
        ctx.lineWidth = (node1.active && node2.active) ? 3 : 1;
        ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 18, 0, Math.PI * 2);
        
        if (node.type === 'input') ctx.fillStyle = '#1f6feb';
        else if (node.type === 'output') ctx.fillStyle = node.active ? '#2ea043' : '#21262d';
        else ctx.fillStyle = node.active ? '#58a6ff' : '#21262d';

        ctx.fill();
        ctx.strokeStyle = '#c9d1d9';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Node labels for input/output
        if (node.label) {
            ctx.fillStyle = '#fff';
            ctx.font = '10px Courier New';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.label, node.x, node.type === 'input' ? node.y - 25 : node.y + 25);
        }
    });
}

function checkWin() {
    // Basic pathfinding to check if input connects to output via active nodes
    const visited = new Set();
    const queue = [0]; // Start at input
    
    while (queue.length > 0) {
        const currentId = queue.shift();
        if (currentId === 6) return true; // Reached output
        
        visited.add(currentId);
        
        // Find connected active nodes
        edges.forEach(([n1, n2]) => {
            if (n1 === currentId && nodes[n2].active && !visited.has(n2)) queue.push(n2);
            if (n2 === currentId && nodes[n1].active && !visited.has(n1)) queue.push(n1);
        });
    }
    return false;
}

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    nodes.forEach(node => {
        if (node.type === 'input') return; // Cannot toggle input
        
        const dist = Math.sqrt((clickX - node.x)**2 + (clickY - node.y)**2);
        if (dist <= 18) {
            node.active = !node.active;
            draw();
            
            if (checkWin()) {
                statusText.innerText = "System Connected. Signal Routed.";
                statusText.className = "success";
            } else {
                statusText.innerText = "System Standby...";
                statusText.className = "";
            }
        }
    });
});

resetBtn.addEventListener('click', () => {
    nodes.forEach(n => {
        if (n.type !== 'input') n.active = false;
    });
    statusText.innerText = "System Standby...";
    statusText.className = "";
    draw();
});

// Initial draw
draw();
