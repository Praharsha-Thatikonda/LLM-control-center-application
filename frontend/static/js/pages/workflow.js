/**
 * NeuroForge Workflow Designer
 * Handles drag-and-drop, connection drawing, and property configuration.
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const canvas = document.getElementById('main-canvas');
    const nodesLayer = document.getElementById('nodes-layer');
    const connectionsLayer = document.getElementById('connections-layer');
    const propertiesPanel = document.getElementById('properties-panel');
    const propsContent = document.getElementById('props-content');
    const consoleOutput = document.getElementById('console-output');

    // State
    let nodeIdCounter = 1;
    let connections = []; // { startId, endId, pathElem }
    let isConnecting = false;
    let startPort = null;
    let selectedNode = null;

    // --- 1. Drag & Drop (Creation) ---

    // Palette Items
    document.querySelectorAll('.draggable-node').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('type', item.innerText.trim());
            e.dataTransfer.setData('iconClass', item.querySelector('i').className);
        });
    });

    canvas.addEventListener('dragover', e => e.preventDefault());

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('type');
        const iconClass = e.dataTransfer.getData('iconClass');
        const rect = canvas.getBoundingClientRect();

        createNode({
            id: `node-${nodeIdCounter++}`,
            type: type,
            icon: iconClass,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    });

    // --- 2. Node Creation ---

    function createNode(data) {
        const node = document.createElement('div');
        node.id = data.id;
        node.className = 'workflow-node card white-panel';
        Object.assign(node.style, {
            position: 'absolute', left: `${data.x}px`, top: `${data.y}px`,
            width: '220px', padding: '0', boxShadow: 'var(--shadow-md)',
            zIndex: 10, cursor: 'move'
        });

        node.innerHTML = `
            <div class="node-header" style="background: linear-gradient(to right, #f8fafc, #fff); padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                <strong>${data.type}</strong>
                <i class="${data.icon}"></i>
            </div>
            <div class="node-body" style="padding: 1rem;">
                <div style="font-size:0.8rem; color:var(--text-secondary);">
                    Double-click to edit config.
                </div>
            </div>
            <!-- Ports -->
            <div class="port port-in" data-node="${data.id}" data-type="in" 
                style="position:absolute; top:50%; left:-6px; width:12px; height:12px; background:#94a3b8; border-radius:50%; border:2px solid white; cursor:crosshair;"></div>
            <div class="port port-out" data-node="${data.id}" data-type="out"
                style="position:absolute; top:50%; right:-6px; width:12px; height:12px; background:var(--accent-primary); border-radius:50%; border:2px solid white; cursor:crosshair;"></div>
        `;

        // Movement Logic
        makeDraggable(node);

        // Events
        node.addEventListener('dblclick', () => showProperties(data, node));
        node.addEventListener('click', (e) => {
            e.stopPropagation();
            selectNode(node);
        });

        // Port Logic
        node.querySelectorAll('.port').forEach(port => {
            port.addEventListener('mousedown', (e) => {
                e.stopPropagation(); // Don't drag node
                startConnection(port);
            });
            port.addEventListener('mouseup', (e) => {
                e.stopPropagation();
                finishConnection(port);
            });
        });

        nodesLayer.appendChild(node);
        log(`Created node ${data.type} (${data.id})`);
    }

    // --- 3. Node Movement ---

    function makeDraggable(elmnt) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        elmnt.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            // Allow clicking ports/inputs without dragging
            if (e.target.classList.contains('port')) return;

            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
            selectNode(elmnt);
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";

            // Redraw connections
            updateConnections();
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    function selectNode(node) {
        if (selectedNode) selectedNode.style.borderColor = 'transparent';
        selectedNode = node;
        node.style.borderColor = 'var(--accent-primary)';
    }

    // --- 4. Connections ---

    function startConnection(port) {
        if (port.dataset.type !== 'out') return; // Can only start from OUT
        isConnecting = true;
        startPort = port;
        log("Started connection...");
    }

    function finishConnection(endPort) {
        if (!isConnecting || !startPort) return;
        if (endPort.dataset.type !== 'in') {
            log("Error: Must connect Out to In.");
            resetConnectionState();
            return;
        }
        if (startPort.dataset.node === endPort.dataset.node) return; // Self connection

        // Create Connection
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("stroke", "#94a3b8");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("fill", "none");

        connectionsLayer.appendChild(path);

        connections.push({
            startPort: startPort,
            endPort: endPort,
            path: path
        });

        updateConnections(); // Draw initial line
        log(`Connected ${startPort.dataset.node} to ${endPort.dataset.node}`);
        resetConnectionState();
    }

    function resetConnectionState() {
        isConnecting = false;
        startPort = null;
    }

    function updateConnections() {
        connections.forEach(conn => {
            const startRect = conn.startPort.getBoundingClientRect();
            const endRect = conn.endPort.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();

            // Calculate center relative to canvas
            const x1 = (startRect.left + startRect.width / 2) - canvasRect.left;
            const y1 = (startRect.top + startRect.height / 2) - canvasRect.top;
            const x2 = (endRect.left + endRect.width / 2) - canvasRect.left;
            const y2 = (endRect.top + endRect.height / 2) - canvasRect.top;

            // Bezier Curve
            const cx1 = x1 + 50;
            const cx2 = x2 - 50;
            const d = `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;

            conn.path.setAttribute("d", d);
        });
    }

    // --- 5. Properties Panel ---

    window.showProperties = (data, nodeEl) => {
        propertiesPanel.style.display = 'flex';

        // Mock Config based on Type
        let fields = '';
        if (data.type.includes("File")) {
            fields = createGroup('File Path', 'text', '/data/input.pdf') + createGroup('Format', 'select', ['PDF', 'TXT', 'MD']);
        } else if (data.type.includes("LLM")) {
            fields = createGroup('Model', 'select', ['Llama-3-8B', 'Mistral-7B', 'GPT-4-Turbo']) + createGroup('Temperature', 'range', 0.7);
        } else {
            fields = createGroup('Name', 'text', data.type);
        }

        propsContent.innerHTML = `
            <div class="mb-4">
                <label class="block text-xs font-bold uppercase text-gray-500 mb-1">Node ID</label>
                <input class="form-input w-full bg-gray-50 mb-2" value="${data.id}" disabled>
            </div>
            ${fields}
        `;
    };

    window.hideProperties = () => {
        propertiesPanel.style.display = 'none';
    };

    window.saveProperties = () => {
        log("Properties updated.");
        // Animation
        const btn = propertiesPanel.querySelector('.btn.primary');
        const oldText = btn.innerText;
        btn.innerText = "Saved!";
        setTimeout(() => btn.innerText = oldText, 1000);
    };

    function createGroup(label, type, value) {
        if (type === 'select') {
            const opts = value.map(v => `<option>${v}</option>`).join('');
            return `
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-1">${label}</label>
                    <select class="form-select w-full">${opts}</select>
                </div>`;
        }
        if (type === 'range') {
            return `
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-1">${label}</label>
                     <div class="flex gap-2"><input type="range" class="w-full" value="${value * 10}" min="0" max="10"> <span>${value}</span></div>
                </div>`;
        }
        return `
            <div class="mb-4">
                <label class="block text-sm font-medium mb-1">${label}</label>
                <input type="text" class="form-input w-full" value="${value}">
            </div>`;
    }

    // --- 6. Execution & Helpers ---

    window.testFlow = () => {
        log("Compiling workflow graph...");
        setTimeout(() => {
            log("Running topological sort...");
            setTimeout(() => {
                log("Executing Node 1 (File Reader)... Success", "success");
                setTimeout(() => {
                    log("Executing Node 2 (Chunker)... Success", "success");
                    setTimeout(() => {
                        log("Executing Node 3 (Llama-3)... Processing...", "info");
                    }, 800);
                }, 800);
            }, 500);
        }, 500);
    };

    window.clearCanvas = () => {
        nodesLayer.innerHTML = '';
        connectionsLayer.innerHTML = '';
        connections = [];
        log("Canvas cleared.");
    };

    function log(msg, type = 'normal') {
        const line = document.createElement('div');
        line.className = 'log-line';
        line.style.marginBottom = '4px';
        line.style.color = type === 'success' ? '#4ade80' : (type === 'error' ? '#f87171' : '#64748b');
        const time = new Date().toLocaleTimeString().split(' ')[0];
        line.innerText = `[${time}] ${msg}`;
        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    // Initialize with example nodes
    function addExample() {
        createNode({ id: 'node-demo-1', type: 'File Reader', icon: 'fas fa-file-alt text-blue-500', x: 100, y: 100 });
        createNode({ id: 'node-demo-2', type: 'Text Chunker', icon: 'fas fa-cut text-orange-500', x: 400, y: 100 });

        // Mock connection
        setTimeout(() => {
            const start = document.querySelector('[data-node="node-demo-1"][data-type="out"]');
            const end = document.querySelector('[data-node="node-demo-2"][data-type="in"]');
            if (start && end) {
                startPort = start;
                isConnecting = true;
                finishConnection(end);
            }
        }, 100);
    }

    // Slight delay to ensure DOM layout
    setTimeout(addExample, 200);
});
