const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');

let drawing = false;
let currentTool = 'pencil';
let paths = []; // Stores all drawn paths
let currentPath = null;
let redoStack = [];
let showGraph = false;
let backgroundImage = null;

// Settings
const sColor = document.getElementById('strokeColor');
const fColor = document.getElementById('fillColor');

// Toolbar Selection
document.querySelectorAll('.tool').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tool').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentTool = e.currentTarget.dataset.tool;
    });
});

// Image Upload Logic (Tracing mode)
document.getElementById('bgImageBtn').addEventListener('click', () => document.getElementById('imageUpload').click());
document.getElementById('imageUpload').addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            backgroundImage = img;
            redrawCanvas();
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(e.target.files[0]);
});

// Drawing Logic
canvas.addEventListener('mousedown', (e) => {
    drawing = true;
    const rect = canvas.getBoundingClientRect();
    const x = parseFloat((e.clientX - rect.left).toFixed(2));
    const y = parseFloat((e.clientY - rect.top).toFixed(2));
    
    currentPath = {
        tool: currentTool,
        stroke: sColor.value,
        fill: fColor.value === "#000000" ? "#00000000" : fColor.value,
        points: [{x, y}]
    };
    redoStack = []; // Clear redo stack on new action
});

canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = parseFloat((e.clientX - rect.left).toFixed(2));
    const y = parseFloat((e.clientY - rect.top).toFixed(2));

    if (currentTool === 'pencil') {
        currentPath.points.push({x, y});
    } else {
        // For shapes, replace the last point to show live preview
        currentPath.points[1] = {x, y}; 
    }
    redrawCanvas();
    drawTempPath(currentPath);
});

canvas.addEventListener('mouseup', () => {
    if (drawing && currentPath) {
        paths.push(currentPath);
    }
    drawing = false;
    currentPath = null;
    redrawCanvas();
});

// Canvas Redraw Logic
function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (backgroundImage) {
        ctx.globalAlpha = 0.5; // Make image semi-transparent
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
    }

    if (showGraph) drawGrid();

    paths.forEach(p => drawTempPath(p));
}

function drawTempPath(p) {
    if (!p || p.points.length === 0) return;
    ctx.beginPath();
    ctx.strokeStyle = p.stroke;
    ctx.fillStyle = p.fill;
    ctx.lineWidth = 2;

    ctx.moveTo(p.points[0].x, p.points[0].y);

    if (p.tool === 'pencil') {
        for (let i = 1; i < p.points.length; i++) {
            ctx.lineTo(p.points[i].x, p.points[i].y);
        }
    } else if (p.tool === 'rect' && p.points.length > 1) {
        let w = p.points[1].x - p.points[0].x;
        let h = p.points[1].y - p.points[0].y;
        ctx.rect(p.points[0].x, p.points[0].y, w, h);
    } else if (p.tool === 'line' && p.points.length > 1) {
        ctx.lineTo(p.points[1].x, p.points[1].y);
    }

    if (p.fill !== "#00000000" && p.tool === 'rect') ctx.fill();
    ctx.stroke();
}

function drawGrid() {
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=50) {
        ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); ctx.stroke();
        ctx.fillStyle = "black";
        ctx.fillText(i, i+2, 10);
        ctx.fillText(i, 2, i-2);
    }
}

// Undo / Redo / Clear
document.getElementById('undoBtn').addEventListener('click', () => {
    if (paths.length > 0) redoStack.push(paths.pop());
    redrawCanvas();
});

document.getElementById('redoBtn').addEventListener('click', () => {
    if (redoStack.length > 0) paths.push(redoStack.pop());
    redrawCanvas();
});

document.getElementById('clearBtn').addEventListener('click', () => {
    paths = [];
    redoStack = [];
    backgroundImage = null;
    redrawCanvas();
});

document.getElementById('graphBtn').addEventListener('click', () => {
    showGraph = !showGraph;
    redrawCanvas();
});

// XML Generator Logic (THE CLEAN METHOD)
const modal = document.getElementById('xmlModal');
const xmlBox = document.getElementById('xmlCodeBox');

function generateXMLCode() {
    let w = document.getElementById('outWidth').value || 100;
    let h = document.getElementById('outHeight').value || 100;
    
    let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
    xml += `<vector xmlns:android="http://schemas.android.com/apk/res/android"\n`;
    xml += `    android:width="${w}dp"\n`;
    xml += `    android:height="${h}dp"\n`;
    xml += `    android:viewportWidth="800"\n`;
    xml += `    android:viewportHeight="600">\n\n`;

    paths.forEach((p, index) => {
        let pathData = "";
        if(p.tool === 'pencil' || p.tool === 'line') {
            pathData += `M ${p.points[0].x},${p.points[0].y} `;
            for(let i=1; i<p.points.length; i++) {
                pathData += `L ${p.points[i].x},${p.points[i].y} `;
            }
        } else if (p.tool === 'rect' && p.points.length > 1) {
            let x1 = p.points[0].x, y1 = p.points[0].y;
            let x2 = p.points[1].x, y2 = p.points[1].y;
            pathData = `M ${x1},${y1} L ${x2},${y1} L ${x2},${y2} L ${x1},${y2} Z`;
        }

        xml += `    \n`;
        xml += `    <path\n`;
        xml += `        android:fillColor="${p.fill}"\n`;
        xml += `        android:strokeColor="${p.stroke}"\n`;
        xml += `        android:strokeWidth="2"\n`;
        xml += `        android:pathData="${pathData.trim()}" />\n\n`;
    });

    xml += `</vector>`;
    xmlBox.value = xml; // Set value of textarea (NO HTML TAGS WILL BE GENERATED)
}

document.getElementById('generateBtn').addEventListener('click', () => {
    generateXMLCode();
    modal.style.display = 'flex';
});

document.getElementById('updateXmlBtn').addEventListener('click', generateXMLCode);

document.getElementById('closeModalBtn').addEventListener('click', () => {
    modal.style.display = 'none';
});

// The Clean Copy Function
document.getElementById('copyBtn').addEventListener('click', () => {
    xmlBox.select();
    navigator.clipboard.writeText(xmlBox.value).then(() => {
        alert("CLEAN XML COPIED! Ready for Android Studio.");
    }).catch(err => alert("Copy failed!"));
});
