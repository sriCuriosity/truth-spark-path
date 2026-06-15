import { useState } from 'react';
import { NodeEditor, ClaimNode, NodeConnection } from './components/node-editor';
import { BiasScanner } from './components/bias-scanner';
import { GraduationCap, ShieldCheck, Layers, FileText, Plus } from 'lucide-react';

const INITIAL_NODES: ClaimNode[] = [
  {
    id: 'node-1',
    title: 'Claim: Standard Exam Grading is Objective',
    type: 'claim',
    x: 50,
    y: 80,
    description: 'The assumption that grading students on standardized scales yields objective intelligence statistics.'
  },
  {
    id: 'node-2',
    title: 'Socratic Inquiry: Variable Motivators',
    type: 'socratic_inquiry',
    x: 300,
    y: 120,
    description: 'Does test performance measure understanding, or compliance under test anxiety and reward feedback loops?'
  },
  {
    id: 'node-3',
    title: 'Deprogramming Module 1',
    type: 'deprogramming_module',
    x: 550,
    y: 150,
    description: 'Explore personal values under self-directed learning without standardized test score comparisons.'
  }
];

const INITIAL_CONNECTIONS: NodeConnection[] = [
  { from: 'node-1', to: 'node-2' },
  { from: 'node-2', to: 'node-3' }
];

function App() {
  const [nodes, setNodes] = useState<ClaimNode[]>(INITIAL_NODES);
  const [connections, setConnections] = useState<NodeConnection[]>(INITIAL_CONNECTIONS);
  const [selectedNode, setSelectedNode] = useState<ClaimNode | null>(INITIAL_NODES[0]);

  const handleUpdateNode = (updatedNode: ClaimNode) => {
    setNodes(nodes.map(n => (n.id === updatedNode.id ? updatedNode : n)));
    setSelectedNode(updatedNode);
  };

  const handleNodesChange = (newNodes: ClaimNode[]) => {
    setNodes(newNodes);
    // Keep selected node reference synchronized with drag movements
    if (selectedNode) {
      const match = newNodes.find(n => n.id === selectedNode.id);
      if (match) setSelectedNode(match);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0d0f14] text-foreground font-sans overflow-hidden">
      
      {/* CMS Workspace Header */}
      <header className="border-b border-border bg-surface/40 backdrop-blur-md px-6 py-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-sm font-display font-extrabold tracking-wider bg-gradient-to-r from-primary to-accent-teal bg-clip-text text-transparent">
              NEXUS CONTENT CMS STUDIO
            </h1>
            <p className="text-[10px] text-muted-foreground">Deprogramming claims curriculum designer</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip text-[9px] text-green-400 bg-green-500/10 border border-green-500/25">
            <ShieldCheck className="h-3 w-3 inline mr-1" />
            Curriculum Compiler Operational
          </span>
        </div>
      </header>

      {/* Main Workspace split panel */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Flowchart canvas workspace */}
        <div className="flex-1 h-full relative z-10 border-r border-border">
          <NodeEditor
            nodes={nodes}
            connections={connections}
            onNodesChange={handleNodesChange}
            onConnectionsChange={setConnections}
            onSelectNode={setSelectedNode}
            selectedNodeId={selectedNode?.id || null}
          />
        </div>

        {/* Right side inspector / Bias scanner panel */}
        <div className="w-[380px] h-full bg-surface/20 backdrop-blur-md overflow-y-auto p-5 space-y-6 z-20 shrink-0">
          {selectedNode ? (
            <div className="space-y-6">
              
              {/* Properties */}
              <div className="space-y-4">
                <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-2">
                  <Layers className="h-4 w-4 text-primary" /> Property Inspector
                </h3>
                
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-muted-foreground block mb-1">Node Title</label>
                    <input
                      type="text"
                      value={selectedNode.title}
                      onChange={(e) => handleUpdateNode({ ...selectedNode, title: e.target.value })}
                      className="w-full bg-elevated border border-border rounded p-2 focus:outline-none focus:border-primary text-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-muted-foreground block mb-1">Node Description</label>
                    <textarea
                      value={selectedNode.description}
                      onChange={(e) => handleUpdateNode({ ...selectedNode, description: e.target.value })}
                      rows={3}
                      className="w-full bg-elevated border border-border rounded p-2 focus:outline-none focus:border-primary text-foreground text-xs leading-normal"
                    />
                  </div>
                </div>
              </div>

              {/* Bias Scanner */}
              <div className="border-t border-border pt-4">
                <BiasScanner
                  key={selectedNode.id}
                  textToScan={selectedNode.description}
                  onScanResult={(res) => {
                    console.log("Bias scan complete on node:", selectedNode.id, res);
                  }}
                />
              </div>

            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-6 text-muted-foreground text-xs italic">
              Select a node on the canvas to inspect properties and run safety audits.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

export default App;
