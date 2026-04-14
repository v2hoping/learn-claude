import { useCallback, type ReactNode } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  type Node,
  type Edge,
  type NodeProps,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 220;
const nodeHeight = 60;
const diamondHeight = 72;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  dagreGraph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 100 });

  nodes.forEach((node) => {
    const width = Number(node.style?.width ?? nodeWidth);
    const height = Number(node.style?.height ?? nodeHeight);
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  // Group tool nodes to arrange them in a 3x3 grid
  const toolNodeIds = [
    'BashTool', 'FileReadTool', 'FileEditTool', 
    'FileWriteTool', 'GlobTool', 'GrepTool', 
    'WebSearchTool', 'WebFetchTool', 'AgentTool'
  ];
  const securityChildNodeIds = ['Rules', 'AST', 'Confirm'];
  
  // Group core nodes to align them in a straight line
  const coreNodeIds = [
    'User', 'QE', 'Query', 'API', 'Parse'
  ];

  // Group context nodes to arrange them in a 3-2 grid (first row 3, second row 2)
  const contextNodeIds = [
    'SysPrompt', 'GitStatus', 'ClaudeMD',
    'Compact', 'Memory'
  ];

  const contextNode = dagreGraph.node('Context');
  
  // Calculate grid offsets based on layout direction
  const horizontalSpacing = nodeWidth + 40;
  const verticalSpacing = nodeHeight + 40;
  const branchOffset = horizontalSpacing * 0.8;
  const anchorNode = dagreGraph.node('User');

  const getLinearPosition = (index: number, width: number, height: number) => {
    if (direction === 'TB') {
      return {
        x: anchorNode.x - width / 2,
        y: anchorNode.y - height / 2 + index * verticalSpacing,
      };
    }

    return {
      x: anchorNode.x - width / 2 + index * horizontalSpacing,
      y: anchorNode.y - height / 2,
    };
  };

  const parsePosition = getLinearPosition(coreNodeIds.indexOf('Parse'), nodeWidth, diamondHeight);
  const parseCenter = {
    x: parsePosition.x + nodeWidth / 2,
    y: parsePosition.y + diamondHeight / 2,
  };

  const getBranchPosition = (side: 'primary' | 'secondary', width: number, height: number) => {
    if (direction === 'TB') {
      return {
        x: parseCenter.x + (side === 'primary' ? -branchOffset : branchOffset) - width / 2,
        y: parsePosition.y + verticalSpacing,
      };
    }

    return {
      x: parsePosition.x + horizontalSpacing,
      y: parseCenter.y + (side === 'primary' ? -branchOffset : branchOffset) - height / 2,
    };
  };

  const toolsPosition = getBranchPosition('secondary', nodeWidth, nodeHeight);
  const toolsCenter = {
    x: toolsPosition.x + nodeWidth / 2,
    y: toolsPosition.y + nodeHeight / 2,
  };
  const toolAreaRightEdge = direction === 'TB'
    ? toolsPosition.x + nodeWidth + horizontalSpacing
    : toolsPosition.x + nodeWidth + horizontalSpacing * 3;
  const securityGap = 80;
  const permPosition = {
    x: toolAreaRightEdge + horizontalSpacing + securityGap,
    y: toolsPosition.y,
  };
  const permCenter = {
    x: permPosition.x + nodeWidth / 2,
    y: permPosition.y + nodeHeight / 2,
  };

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = { ...node };
    const currentWidth = Number(node.style?.width ?? nodeWidth);
    const currentHeight = Number(node.style?.height ?? nodeHeight);
    
    // Apply 3x3 grid layout for specific tool nodes
    const toolIndex = toolNodeIds.indexOf(node.id);
    const securityChildIndex = securityChildNodeIds.indexOf(node.id);
    const contextIndex = contextNodeIds.indexOf(node.id);
    const coreIndex = coreNodeIds.indexOf(node.id);

    if (coreIndex !== -1) {
      newNode.position = getLinearPosition(coreIndex, currentWidth, currentHeight);
    } else if (node.id === 'Output') {
      newNode.position = getBranchPosition('primary', currentWidth, currentHeight);
    } else if (node.id === 'Tools') {
      newNode.position = toolsPosition;
    } else if (node.id === 'Perm') {
      newNode.position = permPosition;
    } else if (toolIndex !== -1) {
      const row = Math.floor(toolIndex / 3);
      const col = toolIndex % 3;
      
      if (direction === 'TB') {
        newNode.position = {
          x: toolsCenter.x - currentWidth / 2 + (col - 1) * horizontalSpacing,
          y: toolsCenter.y - currentHeight / 2 + (row + 1) * verticalSpacing,
        };
      } else {
        // 'LR' direction
        newNode.position = {
          x: toolsCenter.x - currentWidth / 2 + (col + 1) * horizontalSpacing,
          y: toolsCenter.y - currentHeight / 2 + (row - 1) * verticalSpacing,
        };
      }
    } else if (securityChildIndex !== -1) {
      newNode.position = {
        x: permCenter.x - currentWidth / 2 + (securityChildIndex - 1) * horizontalSpacing,
        y: permPosition.y + verticalSpacing,
      };
    } else if (contextIndex !== -1 && contextNode) {
      // Apply 3-2 grid layout for context nodes
      const isFirstRow = contextIndex < 3;
      const row = isFirstRow ? 0 : 1;
      const col = isFirstRow ? contextIndex : contextIndex - 3;
      
      // Calculate horizontal offset differently for row 1 vs row 2
      // Row 1 has 3 items (col 0, 1, 2) -> center is 1
      // Row 2 has 2 items (col 0, 1) -> center is 0.5
      const colOffset = isFirstRow ? (col - 1) : (col - 0.5);

      if (direction === 'TB') {
        newNode.position = {
          x: contextNode.x - currentWidth / 2 + colOffset * horizontalSpacing,
          y: contextNode.y - currentHeight / 2 + (row + 1) * verticalSpacing,
        };
      } else {
        // 'LR' direction
        newNode.position = {
          x: contextNode.x - currentWidth / 2 + (row + 1) * horizontalSpacing,
          y: contextNode.y - currentHeight / 2 + colOffset * verticalSpacing,
        };
      }
    } else {
      // Default dagre layout for other nodes
      newNode.position = {
        x: nodeWithPosition.x - currentWidth / 2,
        y: nodeWithPosition.y - currentHeight / 2,
      };
    }
    
    return newNode;
  });

  return { nodes: newNodes, edges };
};

// Colors for different categories
const colors = {
  core: { bg: '#eff6ff', border: '#3b82f6', text: '#1e3a8a' },
  ctx: { bg: '#fdf4ff', border: '#a855f7', text: '#581c87' },
  tool: { bg: '#f0fdf4', border: '#22c55e', text: '#14532d' },
  sec: { bg: '#fef2f2', border: '#ef4444', text: '#7f1d1d' },
};

const hiddenHandleStyle = {
  width: 0,
  height: 0,
  minWidth: 0,
  minHeight: 0,
  background: 'transparent',
  border: 'none',
};

const QueryNode = ({ data }: NodeProps) => {
  const nodeData = data as { label: ReactNode };

  return (
    <>
    <Handle id="query-target-top" type="target" position={Position.Top} style={hiddenHandleStyle} />
    <Handle id="query-target-left" type="target" position={Position.Left} style={hiddenHandleStyle} />
    <Handle
      id="query-target-context"
      type="target"
      position={Position.Right}
      style={{ ...hiddenHandleStyle, top: '35%' }}
    />
    <Handle
      id="query-target-tools"
      type="target"
      position={Position.Right}
      style={{ ...hiddenHandleStyle, top: '65%' }}
    />
    <Handle id="query-source-bottom" type="source" position={Position.Bottom} style={hiddenHandleStyle} />
    <Handle id="query-source-right" type="source" position={Position.Right} style={hiddenHandleStyle} />
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {nodeData.label}
    </div>
  </>
  );
};

const ToolsNode = ({ data }: NodeProps) => {
  const nodeData = data as { label: ReactNode };

  return (
    <>
      <Handle id="tools-target-left" type="target" position={Position.Left} style={hiddenHandleStyle} />
      <Handle id="tools-target-right" type="target" position={Position.Right} style={hiddenHandleStyle} />
      <Handle id="tools-source-top" type="source" position={Position.Top} style={hiddenHandleStyle} />
      <Handle id="tools-source-bottom" type="source" position={Position.Bottom} style={hiddenHandleStyle} />
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {nodeData.label}
      </div>
    </>
  );
};

const PermNode = ({ data }: NodeProps) => {
  const nodeData = data as { label: ReactNode };

  return (
    <>
      <Handle id="perm-source-left" type="source" position={Position.Left} style={hiddenHandleStyle} />
      <Handle id="perm-source-bottom" type="source" position={Position.Bottom} style={hiddenHandleStyle} />
      <Handle id="perm-target-top" type="target" position={Position.Top} style={hiddenHandleStyle} />
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {nodeData.label}
      </div>
    </>
  );
};

const nodeTypes = {
  permNode: PermNode,
  queryNode: QueryNode,
  toolsNode: ToolsNode,
};

const createDiamondLabel = (label: string, category: keyof typeof colors): ReactNode => (
  <div
    style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <svg
      viewBox={`0 0 ${nodeWidth} ${diamondHeight}`}
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'visible',
      }}
    >
      <polygon
        points={`${nodeWidth / 2},1 ${nodeWidth - 1},${diamondHeight / 2} ${nodeWidth / 2},${diamondHeight - 1} 1,${diamondHeight / 2}`}
        fill={colors[category].bg}
        stroke={colors[category].border}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        style={{
          filter: 'drop-shadow(0 4px 6px rgb(0 0 0 / 0.1))',
        }}
      />
    </svg>
    <span
      style={{
        position: 'relative',
        zIndex: 1,
        color: colors[category].text,
        fontSize: '14px',
        fontWeight: 'bold',
        lineHeight: 1.2,
        textAlign: 'center',
        padding: '0 24px',
      }}
    >
      {label}
    </span>
  </div>
);

const createNode = (
  id: string,
  label: string,
  category: keyof typeof colors,
  isDiamond = false,
  type?: string
): Node => {
  return {
    id,
    type,
    data: { label: isDiamond ? createDiamondLabel(label, category) : label },
    position: { x: 0, y: 0 },
    style: {
      background: isDiamond ? 'transparent' : colors[category].bg,
      border: isDiamond ? 'none' : `2px solid ${colors[category].border}`,
      color: colors[category].text,
      borderRadius: isDiamond ? '0' : '8px',
      padding: isDiamond ? '0' : '12px 16px',
      fontSize: '14px',
      fontWeight: 'bold',
      boxShadow: isDiamond ? 'none' : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      width: nodeWidth,
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: nodeHeight,
      ...(isDiamond ? {
        width: nodeWidth,
        height: diamondHeight,
        borderRadius: 0,
        lineHeight: 1.2
      } : {})
    },
  };
};

const createEdge = (
  source: string,
  target: string,
  label?: string,
  overrides?: Partial<Edge>
): Edge => ({
  id: `e-${source}-${target}`,
  source,
  target,
  label,
  animated: false,
  style: {
    stroke: '#94a3b8',
    strokeWidth: 1.5,
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#94a3b8',
  },
  labelStyle: { fill: '#475569', fontWeight: 500, fontSize: 12 },
  labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
  ...overrides,
});

const initialNodes: Node[] = [
  // Core
  createNode('User', '用户输入', 'core'),
  createNode('QE', 'QueryEngine 会话管理', 'core'),
  createNode('Query', 'query 主循环', 'core', false, 'queryNode'),
  createNode('API', 'Claude API 调用', 'core'),
  createNode('Parse', '解析响应', 'core', true),
  createNode('Output', '流式输出', 'core'),

  // Tools
  createNode('Tools', '工具执行引擎', 'tool', false, 'toolsNode'),
  createNode('BashTool', 'BashTool Shell执行', 'tool'),
  createNode('FileReadTool', 'FileReadTool 读文件', 'tool'),
  createNode('FileEditTool', 'FileEditTool 编辑文件', 'tool'),
  createNode('FileWriteTool', 'FileWriteTool 创建覆盖', 'tool'),
  createNode('GlobTool', 'GlobTool 名称搜索', 'tool'),
  createNode('GrepTool', 'GrepTool 内容检索', 'tool'),
  createNode('WebSearchTool', 'WebSearchTool 网络搜索', 'tool'),
  createNode('WebFetchTool', 'WebFetchTool 网页抓取', 'tool'),
  createNode('AgentTool', 'AgentTool 子Agent', 'tool'),

  // Context
  createNode('Context', '上下文工程', 'ctx'),
  createNode('SysPrompt', '系统提示词', 'ctx'),
  createNode('GitStatus', 'Git 状态', 'ctx'),
  createNode('ClaudeMD', 'CLAUDE.md', 'ctx'),
  createNode('Compact', '压缩流水线', 'ctx'),
  createNode('Memory', 'Dream 记忆系统', 'ctx'),

  // Security
  createNode('Perm', '权限系统', 'sec', false, 'permNode'),
  createNode('Rules', '规则层', 'sec'),
  createNode('AST', 'Bash AST 分析', 'sec'),
  createNode('Confirm', '用户确认', 'sec'),
];

const initialEdges: Edge[] = [
  // Core flows
  createEdge('User', 'QE'),
  createEdge('QE', 'Query', undefined, { targetHandle: 'query-target-top' }),
  createEdge('Query', 'API', undefined, { sourceHandle: 'query-source-bottom' }),
  createEdge('API', 'Parse'),
  createEdge('Parse', 'Output', '文本'),
  createEdge('Parse', 'Tools', '工具调用'),

  // Context
  createEdge('Context', 'Query', '上下文注入', {
    targetHandle: 'query-target-context',
    markerStart: {
      type: MarkerType.ArrowClosed,
      color: '#94a3b8',
    },
  }),
  createEdge('Context', 'SysPrompt'),
  createEdge('Context', 'GitStatus'),
  createEdge('Context', 'ClaudeMD'),
  createEdge('Context', 'Compact'),
  createEdge('Context', 'Memory'),

  // Tools
  createEdge('Tools', 'BashTool', undefined, { sourceHandle: 'tools-source-bottom' }),
  createEdge('Tools', 'FileReadTool', undefined, { sourceHandle: 'tools-source-bottom' }),
  createEdge('Tools', 'FileEditTool', undefined, { sourceHandle: 'tools-source-bottom' }),
  createEdge('Tools', 'FileWriteTool', undefined, { sourceHandle: 'tools-source-bottom' }),
  createEdge('Tools', 'GlobTool', undefined, { sourceHandle: 'tools-source-bottom' }),
  createEdge('Tools', 'GrepTool', undefined, { sourceHandle: 'tools-source-bottom' }),
  createEdge('Tools', 'WebSearchTool', undefined, { sourceHandle: 'tools-source-bottom' }),
  createEdge('Tools', 'WebFetchTool', undefined, { sourceHandle: 'tools-source-bottom' }),
  createEdge('Tools', 'AgentTool', undefined, { sourceHandle: 'tools-source-bottom' }),
  createEdge('Tools', 'Query', '结果回注', {
    sourceHandle: 'tools-source-top',
    targetHandle: 'query-target-tools'
  }),

  // Security
  createEdge('Perm', 'Tools', '安全拦截与校验', {
    sourceHandle: 'perm-source-left',
    targetHandle: 'tools-target-right',
    markerStart: {
      type: MarkerType.ArrowClosed,
      color: '#94a3b8',
    },
  }),
  createEdge('Perm', 'Rules', undefined, { sourceHandle: 'perm-source-bottom' }),
  createEdge('Perm', 'AST', undefined, { sourceHandle: 'perm-source-bottom' }),
  createEdge('Perm', 'Confirm', undefined, { sourceHandle: 'perm-source-bottom' }),
];

const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);

const ArchitectureFlow = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  const onLayout = useCallback(
    (direction: string) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodes,
        edges,
        direction
      );

      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    },
    [nodes, edges]
  );

  return (
    <div className="w-full h-full bg-slate-50 rounded-xl overflow-hidden shadow-inner border border-gray-200">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-right"
        minZoom={0.1}
      >
        <Panel position="top-right">
          <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 flex gap-2">
            <button 
              onClick={() => onLayout('TB')}
              className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-sm text-gray-700 font-medium rounded transition-colors"
            >
              垂直布局
            </button>
            <button 
              onClick={() => onLayout('LR')}
              className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-sm text-gray-700 font-medium rounded transition-colors"
            >
              水平布局
            </button>
          </div>
        </Panel>
        <Background color="#cbd5e1" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default ArchitectureFlow;
