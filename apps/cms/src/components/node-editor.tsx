import { useState, useRef, MouseEvent } from 'react';
import { Plus, Link2, Trash, HelpCircle, FileText } from 'lucide-react';

export interface ClaimNode {
  id: string;
  title: string;
  type: 'claim' | 'deprogramming_module' | 'socratic_inquiry' | 'resource';
  x: number;
  y: number;
  description: string;
}

export interface NodeConnection {
  from: string;
  to: string;
}

interface NodeEditorProps {
  nodes: ClaimNode[];
  connections: NodeConnection[];
  onNodesChange: (nodes: ClaimNode[]) => void;
  onConnectionsChange: (conns: NodeConnection[]) => void;
  onSelectNode: (node: ClaimNode | null) => void;
  selectedNodeId: string | null;
}

export function NodeEditor({
  nodes,
  connections,
  onNodesChange,
  onConnectionsChange,
  onSelectNode,
  selectedNodeId
}: NodeEditorProps) {
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [linkingFromId, setLinkingFromId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Handle Node dragging start
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>, node: ClaimNode) => {
    if (e.button !== 0) return; // Only left click
    e.stopPropagation();
    setDraggingNodeId(node.id);
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      setDragOffset({
        x: e.clientX - canvasRect.left - node.x,
        y: e.clientY - canvasRect.top - node.y
      });
    }
  };

  // Dragging movement
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!draggingNodeId) return;
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      const newX = e.clientX - canvasRect.left - dragOffset.x;
      const newY = e.clientY - canvasRect.top - dragOffset.y;

      onNodesChange(
        nodes.map(n => (n.id === draggingNodeId ? { ...n, x: Math.max(10, newX), y: Math.max(10, newY) } : n))
      );
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
  };

  // Add new claim node
  const handleAddNode = (type: ClaimNode['type']) => {
    const id = `node-${Date.now()}`;
    const newNode: ClaimNode = {
      id,
      title: `New ${type.replace('_', ' ')}`,
      type,
      x: 150 + Math.random() * 100,
      y: 150 + Math.random() * 100,
      description: 'Define the claim properties or deprogramming reflections here.'
    };
    onNodesChange([...nodes, newNode]);
    onSelectNode(newNode);
  };

  // Start linking nodes
  const handleNodeLinkClick = (e: MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (linkingFromId === null) {
      setLinkingFromId(nodeId);
    } else {
      if (linkingFromId !== nodeId) {
        // Prevent duplicate connections
        const exists = connections.some(c => c.from === linkingFromId && c.to === nodeId);
        if (!exists) {
          onConnectionsChange([...connections, { from: linkingFromId, to: nodeId }]);
        }
      }
      setLinkingFromId(null);
    }
  };

  // Delete selected node
  const handleDeleteNode = (nodeId: string) => {
    onNodesChange(nodes.filter(n => n.id !== nodeId));
    onConnectionsChange(connections.filter(c => c.from !== nodeId && c.to !== nodeId));
    if (selectedNodeId === nodeId) {
      onSelectNode(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      
      {/* CMS Workspace toolbar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={() => handleAddNode('claim')}
          className="bg-elevated border border-border text-xs px-3 py-1.5 rounded font-semibold text-foreground hover:bg-elevated/70 flex items-center gap-1 transition"
        >
          <Plus className="h-3.5 w-3.5 text-primary" /> Add Claim Node
        </button>
        <button
          onClick={() => handleAddNode('deprogramming_module')}
          className="bg-elevated border border-border text-xs px-3 py-1.5 rounded font-semibold text-foreground hover:bg-elevated/70 flex items-center gap-1 transition"
        >
          <Plus className="h-3.5 w-3.5 text-accent-teal" /> Add Module Node
        </button>
        <button
          onClick={() => handleAddNode('socratic_inquiry')}
          className="bg-elevated border border-border text-xs px-3 py-1.5 rounded font-semibold text-foreground hover:bg-elevated/70 flex items-center gap-1 transition"
        >
          <HelpCircle className="h-3.5 w-3.5 text-accent-amber" /> Add Inquiry Node
        </button>
      </div>

      {linkingFromId && (
        <div className="absolute top-4 right-4 z-10 bg-primary/20 border border-primary/40 text-[11px] text-primary px-3 py-1.5 rounded font-mono">
          Select target node to establish connection link...
        </div>
      )}

      {/* Editor Canvas */}
      <div
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="flex-1 w-full canvas-grid relative cursor-grab active:cursor-grabbing"
      >
        {/* Draw connections using SVG paths */}
        <svg className="absolute inset-0 pointer-events-none w-full h-full">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255, 255, 255, 0.25)" />
            </marker>
          </defs>
          {connections.map((conn, idx) => {
            const fromNode = nodes.find(n => n.id === conn.from);
            const toNode = nodes.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return null;

            // Compute center coords of nodes (width: 170px, height: 75px)
            const fromX = fromNode.x + 85;
            const fromY = fromNode.y + 37;
            const toX = toNode.x + 85;
            const toY = toNode.y + 37;

            // Draw cubic bezier curves for premium visual connections
            const dx = Math.abs(toX - fromX) * 0.5;
            const p1x = fromX + (toX > fromX ? dx : -dx);
            const p1y = fromY;
            const p2x = toX - (toX > fromX ? dx : -dx);
            const p2y = toY;

            return (
              <path
                key={idx}
                d={`M ${fromX} ${fromY} C ${p1x} ${p1y}, ${p2x} ${p2y}, ${toX} ${toY}`}
                stroke="rgba(0, 242, 254, 0.4)"
                strokeWidth="1.5"
                fill="none"
                markerEnd="url(#arrow)"
              />
            );
          })}
        </svg>

        {/* Render interactive cards */}
        {nodes.map(node => (
          <div
            key={node.id}
            onMouseDown={(e) => handleMouseDown(e, node)}
            onClick={(e) => {
              e.stopPropagation();
              onSelectNode(node);
            }}
            style={{ left: node.x, top: node.y, width: 170 }}
            className={`absolute rounded-lg p-3 cursor-pointer select-none transition border ${
              selectedNodeId === node.id 
                ? 'bg-elevated border-primary shadow-[0_0_15px_rgba(0,242,254,0.3)]' 
                : 'bg-surface/90 border-border/80 hover:border-border-white/20'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded ${
                node.type === 'claim' ? 'bg-red-500/15 text-red-400' :
                node.type === 'deprogramming_module' ? 'bg-primary/15 text-primary' :
                'bg-accent-amber/15 text-accent-amber'
              }`}>
                {node.type.replace('_', ' ')}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={(e) => handleNodeLinkClick(e, node.id)}
                  title="Link node"
                  className={`p-0.5 rounded text-muted-foreground hover:text-primary transition ${linkingFromId === node.id ? 'text-primary bg-primary/10' : ''}`}
                >
                  <Link2 className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNode(node.id);
                  }}
                  title="Delete node"
                  className="p-0.5 rounded text-muted-foreground hover:text-red-500 transition"
                >
                  <Trash className="h-3 w-3" />
                </button>
              </div>
            </div>
            
            <h4 className="text-[11px] font-bold text-foreground mt-2 truncate">{node.title}</h4>
            <p className="text-[9px] text-muted-foreground mt-1 line-clamp-1">{node.description}</p>
          </div>
        ))}

      </div>

    </div>
  );
}
