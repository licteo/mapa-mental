class MindMap {
    constructor() {
        this.nodes = new Map();
        this.connections = [];
        this.selectedNode = null;
        this.dragOffset = { x: 0, y: 0 };
        this.isDragging = false;
        this.nextId = 1;
        
        this.svg = document.getElementById('mindmap');
        this.nodesGroup = document.getElementById('nodes');
        this.connectionsGroup = document.getElementById('connections');
        
        this.viewBox = {
            x: 0,
            y: 0,
            width: 1200,
            height: 800
        };
        
        this.initializeEventListeners();
        this.createRootNode();
    }
    
    initializeEventListeners() {
        document.getElementById('addNodeBtn').addEventListener('click', () => this.addNode());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('saveBtn').addEventListener('click', () => this.save());
        
        this.svg.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.svg.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.svg.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.svg.addEventListener('wheel', this.handleWheel.bind(this));
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu')) {
                this.hideContextMenu();
            }
        });
        
        document.getElementById('contextMenu').addEventListener('click', (e) => {
            if (e.target.classList.contains('menu-item')) {
                this.handleContextMenuAction(e.target.dataset.action);
            }
        });
    }
    
    createRootNode() {
        const rootNode = {
            id: this.nextId++,
            text: 'Tema Principal',
            x: 600,
            y: 400,
            width: 120,
            height: 60,
            color: '#6366f1'
        };
        
        this.nodes.set(rootNode.id, rootNode);
        this.renderNode(rootNode);
    }
    
    addNode(parentNode = null) {
        const parent = parentNode || Array.from(this.nodes.values())[0];
        const angle = Math.random() * Math.PI * 2;
        const distance = 150;
        
        const newNode = {
            id: this.nextId++,
            text: 'Nuevo Nodo',
            x: parent.x + Math.cos(angle) * distance,
            y: parent.y + Math.sin(angle) * distance,
            width: 100,
            height: 50,
            color: document.getElementById('nodeColor').value
        };
        
        this.nodes.set(newNode.id, newNode);
        this.renderNode(newNode);
        
        if (parent) {
            this.connections.push({ from: parent.id, to: newNode.id });
            this.renderConnections();
        }
    }
    
    renderNode(node) {
        const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        nodeGroup.classList.add('node');
        nodeGroup.setAttribute('id', `node-${node.id}`);
        nodeGroup.setAttribute('transform', `translate(${node.x - node.width/2}, ${node.y - node.height/2})`);
        
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', node.width);
        rect.setAttribute('height', node.height);
        rect.setAttribute('fill', node.color);
        rect.setAttribute('rx', '8');
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', node.width / 2);
        text.setAttribute('y', node.height / 2);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.textContent = node.text;
        
        nodeGroup.appendChild(rect);
        nodeGroup.appendChild(text);
        
        nodeGroup.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.selectNode(node.id);
            this.startDrag(e, node.id);
        });
        
        nodeGroup.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e, node.id);
        });
        
        this.nodesGroup.appendChild(nodeGroup);
    }
    
    renderConnections() {
        this.connectionsGroup.innerHTML = '';
        
        this.connections.forEach(conn => {
            const fromNode = this.nodes.get(conn.from);
            const toNode = this.nodes.get(conn.to);
            
            if (fromNode && toNode) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', fromNode.x);
                line.setAttribute('y1', fromNode.y);
                line.setAttribute('x2', toNode.x);
                line.setAttribute('y2', toNode.y);
                line.setAttribute('stroke', 'url(#lineGradient)');
                line.setAttribute('stroke-width', '2');
                line.classList.add('connection');
                
                this.connectionsGroup.appendChild(line);
            }
        });
    }
    
    selectNode(nodeId) {
        document.querySelectorAll('.node').forEach(n => n.classList.remove('selected'));
        const nodeElement = document.getElementById(`node-${nodeId}`);
        if (nodeElement) {
            nodeElement.classList.add('selected');
            this.selectedNode = nodeId;
        }
    }
    
    startDrag(e, nodeId) {
        const node = this.nodes.get(nodeId);
        this.isDragging = true;
        this.dragOffset = {
            x: e.clientX - node.x,
            y: e.clientY - node.y
        };
    }
    
    handleMouseDown(e) {
        if (e.target === this.svg || e.target.closest('svg')) {
            this.isDragging = true;
            this.dragOffset = { x: e.clientX, y: e.clientY };
        }
    }
    
    handleMouseMove(e) {
        if (this.isDragging && this.selectedNode) {
            const node = this.nodes.get(this.selectedNode);
            const rect = this.svg.getBoundingClientRect();
            const scaleX = this.viewBox.width / rect.width;
            const scaleY = this.viewBox.height / rect.height;
            
            node.x = (e.clientX - rect.left) * scaleX + this.viewBox.x;
            node.y = (e.clientY - rect.top) * scaleY + this.viewBox.y;
            
            const nodeElement = document.getElementById(`node-${this.selectedNode}`);
            nodeElement.setAttribute('transform', `translate(${node.x - node.width/2}, ${node.y - node.height/2})`);
            
            this.renderConnections();
        }
    }
    
    handleMouseUp() {
        this.isDragging = false;
    }
    
    handleWheel(e) {
        e.preventDefault();
        const scale = e.deltaY > 0 ? 1.1 : 0.9;
        
        this.viewBox.width *= scale;
        this.viewBox.height *= scale;
        
        this.svg.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`);
    }
    
    showContextMenu(e, nodeId) {
        const menu = document.getElementById('contextMenu');
        menu.style.display = 'block';
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;
        this.selectedNode = nodeId;
    }
    
    hideContextMenu() {
        document.getElementById('contextMenu').style.display = 'none';
    }
    
    handleContextMenuAction(action) {
        switch (action) {
            case 'edit':
                this.editNode(this.selectedNode);
                break;
            case 'delete':
                this.deleteNode(this.selectedNode);
                break;
            case 'addChild':
                const parentNode = this.nodes.get(this.selectedNode);
                if (parentNode) {
                    this.addNode(parentNode);
                }
                break;
        }
        this.hideContextMenu();
    }
    
    editNode(nodeId) {
        const node = this.nodes.get(nodeId);
        const nodeElement = document.getElementById(`node-${nodeId}`);
        const textElement = nodeElement.querySelector('text');
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = node.text;
        input.className = 'node-input';
        
        const rect = nodeElement.getBoundingClientRect();
        input.style.left = `${rect.left + rect.width / 2 - 75}px`;
        input.style.top = `${rect.top + rect.height / 2 - 12}px`;
        input.style.width = '150px';
        
        document.body.appendChild(input);
        input.focus();
        input.select();
        
        const saveEdit = () => {
            const newText = input.value.trim();
            if (newText) {
                node.text = newText;
                textElement.textContent = newText;
            }
            if (input.parentNode) {
                try {
                    input.remove();
                } catch (e) {
                    // Handle case where element is already removed
                }
            }
        };
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveEdit();
            } else if (e.key === 'Escape') {
                if (input.parentNode) {
                    input.remove();
                }
            }
        });
        
        input.addEventListener('blur', () => {
            setTimeout(() => {
                saveEdit();
            }, 100);
        });
    }
    
    deleteNode(nodeId) {
        this.nodes.delete(nodeId);
        this.connections = this.connections.filter(conn => conn.from !== nodeId && conn.to !== nodeId);
        
        const nodeElement = document.getElementById(`node-${nodeId}`);
        if (nodeElement) {
            nodeElement.remove();
        }
        
        this.renderConnections();
    }
    
    reset() {
        this.nodes.clear();
        this.connections = [];
        this.nextId = 1;
        this.nodesGroup.innerHTML = '';
        this.connectionsGroup.innerHTML = '';
        this.createRootNode();
    }
    
    save() {
        const data = {
            nodes: Array.from(this.nodes.values()),
            connections: this.connections
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mindmap.json';
        a.click();
    }
}

// Initialize the mind map
new MindMap();