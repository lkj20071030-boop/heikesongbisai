import { useMemo } from 'react';
import { Background, Controls, MiniMap, ReactFlow, Position, type Node, type Edge } from '@xyflow/react';
import type { KnowledgeGraph, KnowledgeNode, KnowledgeStatus } from '../types';

const nodeClass: Record<KnowledgeStatus, string> = {
  target: 'graph-node-target', prerequisite: 'graph-node-prerequisite',
  mastered: 'graph-node-mastered', weak: 'graph-node-weak',
};

interface Props {
  graph: KnowledgeGraph;
  onNodeSelect?: (node: KnowledgeNode) => void;
}

export default function KnowledgeMap({ graph, onNodeSelect }: Props) {
  const nodes = useMemo<Node[]>(() => graph.nodes.map(n => ({
    id: n.id,
    position: { x: n.x, y: n.y },
    data: { label: n.label },
    className: `knowledge-node ${nodeClass[n.status]}`,
    draggable: false,
    sourcePosition: Position.Right, targetPosition: Position.Left,
    style: { width: 190 },
  })), [graph.nodes]);
  const edges = useMemo<Edge[]>(() => graph.edges.map((e, i) => ({
    id: `edge-${i}`, source: e.source, target: e.target,
    animated: false, style: { stroke: 'var(--graph-edge)', strokeWidth: 1.3 },
  })), [graph.edges]);

  return (
    <div className="graph-canvas" aria-label="交互式知识关系图">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={(_, n) => {
          const found = graph.nodes.find(item => item.id === n.id);
          if (found) onNodeSelect?.(found);
        }}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.35 }}
        minZoom={0.45}
        maxZoom={1.8}
      >
        <Background gap={20} color="var(--graph-dot)" />
        <Controls showInteractive={false}/>
        <MiniMap pannable zoomable nodeColor="var(--graph-mini-node)" maskColor="var(--graph-mini-mask)" />
      </ReactFlow>
    </div>
  );
}
