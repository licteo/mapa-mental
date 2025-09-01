class MindMap {
    constructor() {
        this.nodes = new Map();
        this.connections = [];
        this.selectedNode = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.nextId = 1;
        
        // Asegurarnos que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    init() {
        this.svg = document.getElementById('mindmap');
        this.nodesGroup = document.getElementById('nodes');
        this.connectionsGroup = document.getElementById('connections');
        
        if (!this.svg) {
            console.error('SVG element not found');
            return;
        }
        
        this.setupEventListeners();
        this.createRootNode();
        
        // Agregar soporte para gestos táctiles
        this.setupTouchGestures();
    }
    
    setupEventListeners() {
        // Usar addEventListener directamente en lugar de bind
        const self = this;
        
        document.getElementById('addNodeBtn').addEventListener('click', () => self.addNode());
        document.getElementById('resetBtn').addEventListener('click', () => self.reset());
        document.getElementById('saveBtn').addEventListener('click', () => self.save());
        document.getElementById('loadBtn').addEventListener('click', () => self.load());
        
        // Mouse events - usar funciones flecha para mantener contexto
        this.svg.addEventListener('mousedown', (e) => self.handleMouseDown(e));
        this.svg.addEventListener('mousemove', (e) => self.handleMouseMove(e));
        this.svg.addEventListener('mouseup', (e) => self.handleMouseUp(e));
        
        // Touch events para móvil
        this.svg.addEventListener('touchstart', (e) => self.handleTouchStart(e));
        this.svg.addEventListener('touchmove', (e) => self.handleTouchMove(e));
        this.svg.addEventListener('touchend', (e) => self.handleTouchEnd(e));
        
        // Context menu
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu')) {
                self.hideContextMenu();
            }
        });
        
        // Context menu items
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => self.handleContextMenuAction(e));
        });
        
        // Prevent context menu on right click
        this.svg.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const target = e.target.closest('.node');
            if (target) {
                const nodeId = parseInt(target.dataset.nodeId);
                self.showContextMenu(e, nodeId);
            }
        });
    }
    
    setupTouchGestures() {
        let lastTouchEnd = 0;
        
        // Prevenir zoom doble táctil no deseado
        document.addEventListener('touchend', (e) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // Soporte para pinch-zoom (opcional pero útil)
        let initialDistance = 0;
        
        this.svg.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                initialDistance = this.getTouchDistance(e.touches);
            }
        });
        
        this.svg.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                const currentDistance = this.getTouchDistance(e.touches);
                const scale = currentDistance / initialDistance;
                
                // Aquí podrías implementar zoom si lo deseas
                // Por ahora, solo prevenimos el comportamiento por defecto
                e.preventDefault();
            }
        });
    }
    
    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    createRootNode() {
        const rootNode = {
            id: 0,
            text: 'Idea Principal',
            x: 600,
            y: 400,
            color: '#6366f1',
            size: 100,
            parentId: null
        };
        
        this.nodes.set(0, rootNode);
        this.renderNode(rootNode);
    }
    
    addNode(parentId = null, position = null) {
        const parentNode = parentId !== null ? this.nodes.get(parentId) : null;
        
        const newNode = {
            id: this.nextId++,
            text: 'Nuevo Nodo',
            x: position?.x || (parentNode ? parentNode.x + 150 : 600),
            y: position?.y || (parentNode ? parentNode.y + 80 : 400),
            color: document.getElementById('nodeColor').value,
            size: parseInt(document.getElementById('nodeSize').value),
            parentId: parentId
        };
        
        this.nodes.set(newNode.id, newNode);
        this.renderNode(newNode);
        
        if (parentId !== null) {
            this.connections.push({ from: parentId, to: newNode.id });
            this.renderConnections();
        }
        
        return newNode;
    }
    
    renderNode(nodeData) {
        const existingNode = document.getElementById(`node-${nodeData.id}`);
        if (existingNode) {
            existingNode.remove();
        }
        
        const node = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        node.id = `node-${nodeData.id}`;
        node.classList.add('node');
        node.dataset.nodeId = nodeData.id;
        
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', -nodeData.size / 2);
        rect.setAttribute('y', -nodeData.size / 2);
        rect.setAttribute('width', nodeData.size);
        rect.setAttribute('height', nodeData.size);
        rect.setAttribute('fill', nodeData.color);
        rect.setAttribute('rx', '8');
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.textContent = nodeData.text;
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        
        node.appendChild(rect);
        node.appendChild(text);
        
        node.setAttribute('transform', `translate(${nodeData.x}, ${nodeData.y})`);
        
        // Add click event for selection
        node.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectNode(nodeData.id);
        });
        
        // Add drag events
        node.addEventListener('mousedown', (e) => this.startDrag(e, nodeData.id));
        node.addEventListener('touchstart', (e) => this.startDrag(e, nodeData.id));
        
        this.nodesGroup.appendChild(node);
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
    
    startDrag(e, nodeId) {
        e.preventDefault();
        e.stopPropagation();
        
        // Pequeña vibración para feedback táctil
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
        
        this.selectNode(nodeId);
        
        const node = this.nodes.get(nodeId);
        this.isDragging = true;
        
        const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
        const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
        
        if (clientX && clientY) {
            const rect = this.svg.getBoundingClientRect();
            const scaleX = 1200 / rect.width;
            const scaleY = 800 / rect.height;
            
            this.dragOffset = {
                x: (clientX - rect.left) * scaleX - node.x,
                y: (clientY - rect.top) * scaleY - node.y
            };
        }
    }
    
    selectNode(nodeId) {
        this.selectedNode = nodeId;
        document.querySelectorAll('.node').forEach(n => n.classList.remove('selected'));
        const nodeElement = document.getElementById(`node-${nodeId}`);
        if (nodeElement) {
            nodeElement.classList.add('selected');
        }
    }
    
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const target = e.target.closest('.node');
            if (target) {
                const nodeId = parseInt(target.dataset.nodeId);
                this.startDrag({
                    preventDefault: () => {},
                    stopPropagation: () => {},
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    touches: e.touches
                }, nodeId);
            }
        }
    }
    
    handleTouchMove(e) {
        if (e.touches.length === 1 && this.isDragging) {
            const touch = e.touches[0];
            
            // Reducir sensibilidad para mejor control
            const sensitivity = window.innerWidth < 768 ? 0.8 : 1;
            
            this.handleMouseMove({
                clientX: touch.clientX,
                clientY: touch.clientY,
                touches: e.touches
            });
        }
    }
    
    handleTouchEnd(e) {
        this.handleMouseUp(e);
    }
    
    handleMouseDown(e) {
        if (e.button !== 0) return; // Only left click
        
        const target = e.target.closest('.node');
        if (target) {
            const nodeId = parseInt(target.dataset.nodeId);
            this.startDrag(e, nodeId);
        }
    }
    
    handleMouseMove(e) {
        if (!this.isDragging || this.selectedNode === null) return;
        
        const node = this.nodes.get(this.selectedNode);
        if (node) {
            const rect = this.svg.getBoundingClientRect();
            const scaleX = 1200 / rect.width;
            const scaleY = 800 / rect.height;
            
            node.x = (e.clientX - rect.left) * scaleX - this.dragOffset.x;
            node.y = (e.clientY - rect.top) * scaleY - this.dragOffset.y;
            
            const nodeElement = document.getElementById(`node-${this.selectedNode}`);
            if (nodeElement) {
                nodeElement.setAttribute('transform', `translate(${node.x}, ${node.y})`);
            }
            
            this.renderConnections();
        }
    }
    
    handleMouseUp(e) {
        this.isDragging = false;
    }
    
    showContextMenu(e, nodeId) {
        e.preventDefault();
        this.selectedNode = nodeId;
        
        const menu = document.getElementById('contextMenu');
        menu.style.display = 'block';
        
        // Posicionar menú de forma inteligente en móvil
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const menuWidth = 200; // Ancho estimado del menú
        
        let left = e.clientX;
        let top = e.clientY;
        
        // Ajustar si está cerca del borde
        if (left + menuWidth > windowWidth) {
            left = windowWidth - menuWidth - 10;
        }
        
        if (top + 150 > windowHeight) {
            top = windowHeight - 150 - 10;
        }
        
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        
        // Asegurar que el menú sea scrollable si es muy largo
        menu.style.maxHeight = `${windowHeight - 40}px`;
        menu.style.overflowY = 'auto';
    }
    
    hideContextMenu() {
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.style.display = 'none';
        }
    }
    
    handleContextMenuAction(e) {
        const action = e.currentTarget.dataset.action;
        const nodeId = this.selectedNode;
        
        switch (action) {
            case 'edit':
                this.editNode(nodeId);
                break;
            case 'delete':
                this.deleteNode(nodeId);
                break;
            case 'addChild':
                this.addNode(nodeId);
                break;
        }
        
        this.hideContextMenu();
    }
    
    editNode(nodeId) {
        const node = this.nodes.get(nodeId);
        const newText = prompt('Editar nodo:', node.text);
        
        if (newText && newText.trim()) {
            node.text = newText.trim();
            this.renderNode(node);
        }
    }
    
    deleteNode(nodeId) {
        if (nodeId === 0) {
            alert('No se puede eliminar el nodo raíz');
            return;
        }
        
        // Eliminar también todos los hijos
        const children = [];
        this.connections.forEach(conn => {
            if (conn.from === nodeId) {
                children.push(conn.to);
            }
        });
        
        children.forEach(childId => this.deleteNode(childId));
        
        this.nodes.delete(nodeId);
        const nodeElement = document.getElementById(`node-${nodeId}`);
        if (nodeElement) {
            nodeElement.remove();
        }
        
        this.connections = this.connections.filter(conn => 
            conn.from !== nodeId && conn.to !== nodeId
        );
        
        this.renderConnections();
    }
    
    reset() {
        if (confirm('¿Estás seguro de que quieres reiniciar el mapa mental?')) {
            this.nodes.clear();
            this.connections = [];
            this.nextId = 1;
            this.selectedNode = null;
            this.nodesGroup.innerHTML = '';
            this.connectionsGroup.innerHTML = '';
            this.createRootNode();
        }
    }
    
    save() {
        const data = {
            nodes: Array.from(this.nodes.values()),
            connections: this.connections
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mindmap.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    load() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    // Clear current mindmap
                    this.nodes.clear();
                    this.connections = [];
                    this.nextId = 1;
                    this.selectedNode = null;
                    this.nodesGroup.innerHTML = '';
                    this.connectionsGroup.innerHTML = '';
                    
                    // Load nodes
                    data.nodes.forEach(nodeData => {
                        const node = {
                            id: nodeData.id,
                            text: nodeData.text,
                            x: nodeData.x,
                            y: nodeData.y,
                            color: nodeData.color,
                            size: nodeData.size,
                            parentId: nodeData.parentId
                        };
                        this.nodes.set(node.id, node);
                        this.nextId = Math.max(this.nextId, node.id + 1);
                    });
                    
                    // Load connections
                    this.connections = data.connections || [];
                    
                    // Render everything
                    this.nodes.forEach(node => this.renderNode(node));
                    this.renderConnections();
                    
                } catch (error) {
                    alert('Error al cargar el archivo. Asegúrate de que sea un archivo JSON válido del MindMap.');
                    console.error('Error loading file:', error);
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }
}

// Inicializar el mindmap cuando el DOM esté listo
let mindmap;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        mindmap = new MindMap();
    });
} else {
    mindmap = new MindMap();
}

// Hacer disponible globalmente para debugging
window.mindmap = mindmap;