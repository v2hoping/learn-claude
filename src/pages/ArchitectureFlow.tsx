import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type ReactFlowInstance,
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

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 100 });

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
  
  const horizontalSpacing = nodeWidth + 40;
  const verticalSpacing = nodeHeight + 40;
  const branchOffset = horizontalSpacing * 0.8;
  const anchorNode = dagreGraph.node('User');

  const getLinearPosition = (index: number, width: number, height: number) => {
    return {
      x: anchorNode.x - width / 2,
      y: anchorNode.y - height / 2 + index * verticalSpacing,
    };
  };

  const parsePosition = getLinearPosition(coreNodeIds.indexOf('Parse'), nodeWidth, diamondHeight);
  const parseCenter = {
    x: parsePosition.x + nodeWidth / 2,
    y: parsePosition.y + diamondHeight / 2,
  };

  const getBranchPosition = (side: 'primary' | 'secondary', width: number) => {
    return {
      x: parseCenter.x + (side === 'primary' ? -branchOffset : branchOffset) - width / 2,
      y: parsePosition.y + verticalSpacing,
    };
  };

  const toolsPosition = getBranchPosition('secondary', nodeWidth);
  const toolsCenter = {
    x: toolsPosition.x + nodeWidth / 2,
    y: toolsPosition.y + nodeHeight / 2,
  };
  const toolAreaRightEdge = toolsPosition.x + nodeWidth + horizontalSpacing;
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
      newNode.position = getBranchPosition('primary', currentWidth);
    } else if (node.id === 'Tools') {
      newNode.position = toolsPosition;
    } else if (node.id === 'Perm') {
      newNode.position = permPosition;
    } else if (toolIndex !== -1) {
      const row = Math.floor(toolIndex / 3);
      const col = toolIndex % 3;

      newNode.position = {
        x: toolsCenter.x - currentWidth / 2 + (col - 1) * horizontalSpacing,
        y: toolsCenter.y - currentHeight / 2 + (row + 1) * verticalSpacing,
      };
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

      newNode.position = {
        x: contextNode.x - currentWidth / 2 + colOffset * horizontalSpacing,
        y: contextNode.y - currentHeight / 2 + (row + 1) * verticalSpacing,
      };
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

const createDiamondLabel = (
  label: string,
  category: keyof typeof colors,
  options?: { isActive?: boolean; isDimmed?: boolean }
): ReactNode => (
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
        fill={options?.isActive ? '#ffffff' : colors[category].bg}
        stroke={options?.isActive ? '#0ea5e9' : colors[category].border}
        strokeWidth={options?.isActive ? '3' : '2'}
        vectorEffect="non-scaling-stroke"
        style={{
          opacity: options?.isDimmed ? 0.35 : 1,
          filter: options?.isActive
            ? 'drop-shadow(0 0 16px rgb(14 165 233 / 0.35)) drop-shadow(0 10px 24px rgb(14 165 233 / 0.22))'
            : 'drop-shadow(0 4px 6px rgb(0 0 0 / 0.1))',
          transition: 'all 240ms ease',
        }}
      />
    </svg>
    <span
      style={{
        position: 'relative',
        zIndex: 1,
        color: options?.isActive ? '#0369a1' : colors[category].text,
        opacity: options?.isDimmed ? 0.55 : 1,
        fontSize: '14px',
        fontWeight: 'bold',
        lineHeight: 1.2,
        textAlign: 'center',
        padding: '0 24px',
        transition: 'all 240ms ease',
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
    data: {
      label: isDiamond ? createDiamondLabel(label, category) : label,
      rawLabel: label,
      category,
      isDiamond,
    },
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

type DemoStep = {
  id: string;
  time: string;
  phase: string;
  title: string;
  summary: string;
  principle: string;
  tools: string[];
  result: string;
  activeNodes: string[];
  activeEdges: string[];
};

const demoSteps: DemoStep[] = [
  {
    id: 'request',
    time: '00:00',
    phase: '输入',
    title: '接收真实需求',
    summary: '用户提出“从头写一个登录注册系统，支持第三方谷歌登录”，Claude Code 会把它识别成包含本地认证、OAuth 接入、文档调研与验证的完整工程任务。',
    principle: '任务首先进入 QueryEngine，会被纳入当前会话与工作目录上下文。',
    tools: ['QueryEngine', 'Conversation State'],
    result: '建立“账号密码注册登录 + Google OAuth + 最终测试”的目标范围与输出预期。',
    activeNodes: ['User', 'QE', 'Query'],
    activeEdges: ['e-User-QE', 'e-QE-Query'],
  },
  {
    id: 'context',
    time: '00:04',
    phase: '上下文',
    title: '组装系统上下文',
    summary: '系统提示词、`CLAUDE.md`、Git 状态、已有记忆与压缩后的历史消息一起注入到 query 主循环。',
    principle: '中间架构图里的 Context 节点在这一步生效，决定 Claude Code “知道什么”。',
    tools: ['System Prompt', 'CLAUDE.md', 'Git Status', 'Memory'],
    result: '得到“项目规则 + 当前代码库状态 + 历史工作轨迹”的完整上下文。',
    activeNodes: ['Context', 'SysPrompt', 'GitStatus', 'ClaudeMD', 'Compact', 'Memory', 'Query'],
    activeEdges: [
      'e-Context-Query',
      'e-Context-SysPrompt',
      'e-Context-GitStatus',
      'e-Context-ClaudeMD',
      'e-Context-Compact',
      'e-Context-Memory',
    ],
  },
  {
    id: 'agent-survey',
    time: '00:12',
    phase: '探查',
    title: '调用 AgentTool 并行调研',
    summary: 'Claude Code 先通过 AgentTool 派出子 Agent 搜索仓库里的用户模型、路由、鉴权中间件与数据库配置，同时整理本地登录与第三方登录的接入切入点。',
    principle: '这一步体现了执行图里不仅有基础工具，还可以通过 AgentTool 进行更高层次的并行检索与归纳。',
    tools: ['AgentTool', 'GlobTool', 'GrepTool', 'FileReadTool'],
    result: '拿到当前技术栈、可复用模块，以及“本地认证 + Google OAuth”应落在哪些文件中的结论。',
    activeNodes: ['Query', 'API', 'Parse', 'Tools', 'AgentTool', 'GlobTool', 'GrepTool', 'FileReadTool'],
    activeEdges: [
      'e-Query-API',
      'e-API-Parse',
      'e-Parse-Tools',
      'e-Tools-AgentTool',
      'e-Tools-GlobTool',
      'e-Tools-GrepTool',
      'e-Tools-FileReadTool',
      'e-Tools-Query',
    ],
  },
  {
    id: 'oauth-research',
    time: '00:22',
    phase: '调研',
    title: '查询谷歌登录接入资料',
    summary: '为了支持第三方谷歌登录，Claude Code 会调用 WebSearchTool 搜索最新的 Google OAuth 文档、回调参数与前后端接入方式，再用 WebFetchTool 抓取关键页面内容。',
    principle: '外部知识并不直接靠模型记忆硬猜，而是通过检索与抓取把最新资料注入当前推理回路。',
    tools: ['WebSearchTool', 'WebFetchTool'],
    result: '确认 Google 登录所需的 client 配置、授权流程、回调字段与实现约束。',
    activeNodes: ['Query', 'API', 'Parse', 'Tools', 'WebSearchTool', 'WebFetchTool'],
    activeEdges: [
      'e-Query-API',
      'e-API-Parse',
      'e-Parse-Tools',
      'e-Tools-WebSearchTool',
      'e-Tools-WebFetchTool',
      'e-Tools-Query',
    ],
  },
  {
    id: 'plan',
    time: '00:34',
    phase: '决策',
    title: '形成本地认证 + OAuth 方案',
    summary: 'Claude Code 把任务拆成用户表、密码加密、注册接口、账号密码登录、Google 登录入口、OAuth 回调处理、前端按钮接入、环境变量配置与测试。',
    principle: '工具结果回注到 query 后，模型进行新一轮推理并决定下一批动作。',
    tools: ['Reasoning', 'Tool Result Injection'],
    result: '得到一套分阶段实施方案，而不是盲目一次性生成整套认证系统。',
    activeNodes: ['Query', 'API', 'Parse', 'Tools'],
    activeEdges: ['e-Query-API', 'e-API-Parse', 'e-Parse-Tools', 'e-Tools-Query'],
  },
  {
    id: 'implement',
    time: '00:48',
    phase: '实现',
    title: '逐步写入登录注册与谷歌登录模块',
    summary: '开始创建或修改用户模型、认证服务、注册接口、登录接口、Google OAuth 入口与回调逻辑、前端表单页面、Google 登录按钮、环境变量与接口调用代码。',
    principle: '真正写代码时会循环使用 FileReadTool -> FileEditTool/FileWriteTool -> FileReadTool 的模式，持续对齐实现与已有仓库结构。',
    tools: ['FileReadTool', 'FileEditTool', 'FileWriteTool'],
    result: '本地登录注册链路与第三方谷歌登录链路被逐步落盘到仓库中。',
    activeNodes: ['Query', 'API', 'Parse', 'Tools', 'FileReadTool', 'FileEditTool', 'FileWriteTool'],
    activeEdges: [
      'e-Query-API',
      'e-API-Parse',
      'e-Parse-Tools',
      'e-Tools-FileReadTool',
      'e-Tools-FileEditTool',
      'e-Tools-FileWriteTool',
      'e-Tools-Query',
    ],
  },
  {
    id: 'permission',
    time: '01:10',
    phase: '安全',
    title: '经过权限与风险校验',
    summary: '如果涉及命令执行、安装依赖、数据库迁移或潜在危险操作，会经过权限系统检查与必要确认。',
    principle: '右侧工具调用并不是直接执行，中间还会经过 Rules、AST 分析与用户确认。',
    tools: ['Permissions', 'Rules', 'AST', 'Confirm'],
    result: '高风险操作被拦截、降级或请求授权，避免误伤本地环境。',
    activeNodes: ['Perm', 'Rules', 'AST', 'Confirm', 'Tools'],
    activeEdges: ['e-Perm-Tools', 'e-Perm-Rules', 'e-Perm-AST', 'e-Perm-Confirm'],
  },
  {
    id: 'verify-build-test',
    time: '01:24',
    phase: '验证',
    title: '通过 BashTool 执行编译与测试',
    summary: '代码初版完成后，Claude Code 会调用 BashTool 运行构建和测试命令，例如类型检查、编译、单元测试或集成测试，验证登录注册与 Google 登录流程是否可用。',
    principle: 'BashTool 真正执行前会先经过权限系统校验；命令输出随后作为 tool result 回注给 query，成为下一轮修复决策的直接依据。',
    tools: ['BashTool', 'GetDiagnostics'],
    result: '发现测试失败、类型错误、OAuth 回调参数不匹配或环境变量遗漏等问题。',
    activeNodes: ['Query', 'API', 'Parse', 'Perm', 'Rules', 'AST', 'Confirm', 'Tools', 'BashTool'],
    activeEdges: [
      'e-Query-API',
      'e-API-Parse',
      'e-Parse-Tools',
      'e-Perm-Tools',
      'e-Perm-Rules',
      'e-Perm-AST',
      'e-Perm-Confirm',
      'e-Tools-BashTool',
      'e-Tools-Query',
    ],
  },
  {
    id: 'analyze-failure',
    time: '01:32',
    phase: '分析',
    title: 'Claude API 结合异常信息再次推理',
    summary: 'BashTool 返回失败日志后，新的异常信息会连同当前代码上下文、历史工具结果一起回注到 query，再发起一次 Claude API 调用，让模型先分析报错根因与修复策略。',
    principle: '这里不是直接开始改代码，而是先经过“工具结果回注 -> Claude API 调用 -> 解析响应”的一轮再推理，再决定要调用哪些修复工具。',
    tools: ['BashTool', 'Claude API', 'Parse'],
    result: '得到针对类型错误、字段不匹配或 OAuth 回调缺陷的具体修复方案。',
    activeNodes: ['Tools', 'Query', 'API', 'Parse'],
    activeEdges: ['e-Tools-Query', 'e-Query-API', 'e-API-Parse'],
  },
  {
    id: 'repair',
    time: '01:40',
    phase: '修复',
    title: '依据测试结果调用 Tool 修复代码',
    summary: '在上一轮 Claude API 已经结合异常信息给出修复方案后，Claude Code 会重新读取出错文件，定位类型问题、接口字段错误或 Google 登录回调逻辑缺陷，并通过 FileEditTool 精准修补代码。',
    principle: '这体现了 Claude Code 的典型闭环：测试失败 -> 工具回注 -> 再推理 -> 调用编辑工具落地修复，而不是停在报错信息上。',
    tools: ['FileReadTool', 'FileEditTool'],
    result: '问题代码被定点修复，准备进入下一轮验证。',
    activeNodes: ['Query', 'API', 'Parse', 'Tools', 'FileReadTool', 'FileEditTool'],
    activeEdges: [
      'e-Query-API',
      'e-API-Parse',
      'e-Parse-Tools',
      'e-Tools-FileReadTool',
      'e-Tools-FileEditTool',
      'e-Tools-Query',
    ],
  },
  {
    id: 'retest',
    time: '01:50',
    phase: '复测',
    title: '再次执行编译与测试直到通过',
    summary: '修复完成后，Claude Code 会再次通过 BashTool 运行编译与测试，确认注册、登录和谷歌登录相关代码已经恢复为可构建、可测试的稳定状态。',
    principle: '复测同样先经过权限系统校验，只有新的工具结果证明问题消失，系统才会结束修复循环并进入最终交付。',
    tools: ['BashTool'],
    result: '构建与测试通过，认证系统达到可交付状态。',
    activeNodes: ['Query', 'API', 'Parse', 'Perm', 'Rules', 'AST', 'Confirm', 'Tools', 'BashTool'],
    activeEdges: [
      'e-Query-API',
      'e-API-Parse',
      'e-Parse-Tools',
      'e-Perm-Tools',
      'e-Perm-Rules',
      'e-Perm-AST',
      'e-Perm-Confirm',
      'e-Tools-BashTool',
      'e-Tools-Query',
    ],
  },
  {
    id: 'deliver',
    time: '01:58',
    phase: '交付',
    title: '整理结果并向用户汇报',
    summary: 'Claude Code 最后会总结修改内容、说明验证情况、列出剩余风险与下一步建议。',
    principle: '如果没有继续需要工具，Parse 会回到 Output 分支并流式输出最终答案。',
    tools: ['Streaming Output'],
    result: '用户拿到一份“登录注册 + 谷歌登录实现 + 测试修复过程 + 最终验证结果”的完整交付。',
    activeNodes: ['Query', 'API', 'Parse', 'Output'],
    activeEdges: ['e-Query-API', 'e-API-Parse', 'e-Parse-Output'],
  },
];

const getStepSpeechText = (step: DemoStep) => `${step.title}。`;

const ArchitectureCanvas = ({
  fitTrigger,
  focusedStep,
}: {
  fitTrigger: boolean;
  focusedStep: DemoStep | null;
}) => {
  const [nodes, , onNodesChange] = useNodesState(layoutedNodes);
  const [edges, , onEdgesChange] = useEdgesState(layoutedEdges);
  const reactFlowRef = useRef<ReactFlowInstance<Node, Edge> | null>(null);
  const highlightedNodes = focusedStep?.activeNodes ?? [];
  const highlightedEdges = focusedStep?.activeEdges ?? [];

  const displayNodes = useMemo<Node[]>(() => {
    const hasFocus = highlightedNodes.length > 0;
    const highlightedNodeSet = new Set(highlightedNodes);

    return nodes.map((node): Node => {
      const isActive = highlightedNodeSet.has(node.id);
      const isDiamond = node.id === 'Parse';
      const nodeData = node.data as {
        label: ReactNode;
        rawLabel?: string;
        category?: keyof typeof colors;
        isDiamond?: boolean;
      };
      const isDimmed = hasFocus && !isActive;

      return {
        ...node,
        data: isDiamond
          ? {
              ...nodeData,
              label: createDiamondLabel(nodeData.rawLabel ?? '解析响应', nodeData.category ?? 'core', {
                isActive,
                isDimmed,
              }),
            }
          : node.data,
        draggable: false,
        selectable: false,
        style: {
          ...node.style,
          opacity: isDiamond ? 1 : isDimmed ? 0.28 : 1,
          transition: 'all 240ms ease',
          boxShadow: isActive
            ? isDiamond
              ? 'none'
              : '0 0 0 4px rgb(56 189 248 / 0.22), 0 18px 36px -18px rgb(14 165 233 / 0.9)'
            : node.style?.boxShadow,
          borderColor: !isDiamond && isActive ? '#0ea5e9' : node.style?.borderColor,
          background: !isDiamond && isActive ? '#ffffff' : node.style?.background,
          filter: isDiamond
            ? undefined
            : isActive
              ? 'drop-shadow(0 0 16px rgb(14 165 233 / 0.35))'
              : isDimmed
                ? 'saturate(0.75)'
                : undefined,
        },
      };
    });
  }, [highlightedNodes, nodes]);

  const displayEdges = useMemo<Edge[]>(() => {
    const hasFocus = highlightedEdges.length > 0;
    const highlightedEdgeSet = new Set(highlightedEdges);

    return edges.map((edge): Edge => {
      const isActive = highlightedEdgeSet.has(edge.id);
      const activeColor = '#0ea5e9';
      const inactiveColor = '#cbd5e1';
      const markerEnd = edge.markerEnd && typeof edge.markerEnd === 'object' ? edge.markerEnd : undefined;
      const markerStart = edge.markerStart && typeof edge.markerStart === 'object' ? edge.markerStart : undefined;

      return {
        ...edge,
        animated: isActive,
        zIndex: isActive ? 10 : 1,
        style: {
          ...edge.style,
          stroke: isActive ? activeColor : hasFocus ? inactiveColor : '#94a3b8',
          strokeWidth: isActive ? 3 : 1.5,
          opacity: hasFocus && !isActive ? 0.2 : 1,
          transition: 'all 240ms ease',
        },
        markerEnd: markerEnd
          ? {
              ...markerEnd,
              color: isActive ? activeColor : hasFocus ? inactiveColor : '#94a3b8',
            }
          : undefined,
        markerStart: markerStart
          ? {
              ...markerStart,
              color: isActive ? activeColor : hasFocus ? inactiveColor : '#94a3b8',
            }
          : undefined,
        labelStyle: {
          ...edge.labelStyle,
          fill: isActive ? '#0369a1' : hasFocus ? '#94a3b8' : '#475569',
          fontWeight: isActive ? 700 : 500,
        },
      };
    });
  }, [edges, highlightedEdges]);

  const fitArchitecture = useCallback(() => {
    const instance = reactFlowRef.current;

    if (!instance) {
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        void instance.fitView({
          padding: 0.12,
          duration: 240,
          minZoom: 0.1,
          maxZoom: 1,
        });
      });
    });
  }, []);

  useEffect(() => {
    fitArchitecture();
  }, [fitArchitecture, fitTrigger]);

  useEffect(() => {
    const handleResize = () => {
      fitArchitecture();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [fitArchitecture]);

  return (
    <div className="w-full h-full bg-slate-50 rounded-xl overflow-hidden shadow-inner border border-gray-200">
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={(instance) => {
          reactFlowRef.current = instance;
          fitArchitecture();
        }}
        fitView
        fitViewOptions={{ padding: 0.12, minZoom: 0.1, maxZoom: 1 }}
        attributionPosition="bottom-right"
        minZoom={0.1}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background color="#cbd5e1" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
};

const ArchitectureFlow = () => {
  const [activeStep, setActiveStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isArchitectureFullscreen, setIsArchitectureFullscreen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const timerRef = useRef<number[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastSpokenStepIdRef = useRef<string | null>(null);
  const isVoiceAutoplayRef = useRef(false);
  const architectureSectionRef = useRef<HTMLElement | null>(null);
  const stepListRef = useRef<HTMLDivElement | null>(null);
  const stepItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const isSpeechSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  const clearPlayback = useCallback(() => {
    timerRef.current.forEach((timer) => window.clearTimeout(timer));
    timerRef.current = [];
  }, []);

  const stopSpeech = useCallback(() => {
    if (!isSpeechSupported) {
      return;
    }

    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    lastSpokenStepIdRef.current = null;
  }, [isSpeechSupported]);

  useEffect(() => {
    return () => {
      clearPlayback();
      stopSpeech();
    };
  }, [clearPlayback, stopSpeech]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsArchitectureFullscreen(document.fullscreenElement === architectureSectionRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const startPlayback = useCallback(() => {
    clearPlayback();
    stopSpeech();
    lastSpokenStepIdRef.current = null;
    setSelectedStep(null);
    setActiveStep(-1);
    setIsPlaying(true);

    const leadDelay = 400;
    if (isVoiceEnabled && isSpeechSupported) {
      isVoiceAutoplayRef.current = true;
      const leadTimer = window.setTimeout(() => {
        setActiveStep(0);
      }, leadDelay);

      timerRef.current.push(leadTimer);
      return;
    }

    isVoiceAutoplayRef.current = false;
    let elapsedDelay = leadDelay;

    demoSteps.forEach((_, index) => {
      const timer = window.setTimeout(() => {
        setActiveStep(index);
      }, elapsedDelay);

      timerRef.current.push(timer);
      elapsedDelay += 950;
    });

    const finishTimer = window.setTimeout(() => {
      setIsPlaying(false);
    }, elapsedDelay);

    timerRef.current.push(finishTimer);
  }, [clearPlayback, isSpeechSupported, isVoiceEnabled, stopSpeech]);

  const resetPlayback = useCallback(() => {
    clearPlayback();
    stopSpeech();
    isVoiceAutoplayRef.current = false;
    setActiveStep(-1);
    setIsPlaying(false);
    setSelectedStep(null);
  }, [clearPlayback, stopSpeech]);

  const toggleArchitectureFullscreen = useCallback(async () => {
    const section = architectureSectionRef.current;

    if (!section) {
      return;
    }

    try {
      if (document.fullscreenElement === section) {
        await document.exitFullscreen();
      } else {
        await section.requestFullscreen();
      }
    } catch (error) {
      console.error('Failed to toggle architecture fullscreen:', error);
    }
  }, []);

  const visibleCount = Math.max(activeStep + 1, 0);
  const expandedStepIndex = activeStep >= 0 ? activeStep : selectedStep;
  const showResetAction = isPlaying || activeStep >= 0 || selectedStep !== null;
  const focusedStep = expandedStepIndex === null ? null : demoSteps[expandedStepIndex];

  useEffect(() => {
    if (expandedStepIndex === null) {
      return;
    }

    const list = stepListRef.current;
    const item = stepItemRefs.current[expandedStepIndex];

    if (!list || !item) {
      return;
    }

    const listRect = list.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const topOverflow = itemRect.top - listRect.top;
    const bottomOverflow = itemRect.bottom - listRect.bottom;

    if (topOverflow < 0) {
      list.scrollBy({ top: topOverflow - 12, behavior: 'smooth' });
    } else if (bottomOverflow > 0) {
      list.scrollBy({ top: bottomOverflow + 12, behavior: 'smooth' });
    }
  }, [expandedStepIndex]);

  useEffect(() => {
    if (!isVoiceEnabled) {
      stopSpeech();
      return;
    }

    if (!isSpeechSupported || !focusedStep) {
      return;
    }

    if (lastSpokenStepIdRef.current === focusedStep.id) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(getStepSpeechText(focusedStep));
    utterance.lang = 'zh-CN';
    utterance.rate = 1.02;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onend = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
      }

      if (!isVoiceAutoplayRef.current || !isPlaying || selectedStep !== null) {
        return;
      }

      const currentStepIndex = demoSteps.findIndex((step) => step.id === focusedStep.id);

      if (currentStepIndex === -1) {
        return;
      }

      const nextTimer = window.setTimeout(() => {
        if (currentStepIndex >= demoSteps.length - 1) {
          isVoiceAutoplayRef.current = false;
          setIsPlaying(false);
          return;
        }

        setActiveStep(currentStepIndex + 1);
      }, 220);

      timerRef.current.push(nextTimer);
    };

    window.speechSynthesis.cancel();
    utteranceRef.current = utterance;
    lastSpokenStepIdRef.current = focusedStep.id;
    window.speechSynthesis.speak(utterance);
  }, [focusedStep, isPlaying, isSpeechSupported, isVoiceEnabled, selectedStep, stopSpeech]);

  return (
    <div className="h-full w-full flex flex-col gap-4">
      <div className="grid min-h-[860px] flex-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <section className="flex min-h-[320px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">执行图</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {visibleCount}/{demoSteps.length}
              </div>
              <button
                type="button"
                disabled={!isSpeechSupported}
                onClick={() => {
                  if (!isSpeechSupported) {
                    return;
                  }

                  setIsVoiceEnabled((current) => {
                    const next = !current;

                    if (!next) {
                      stopSpeech();
                    } else {
                      lastSpokenStepIdRef.current = null;
                    }

                    return next;
                  });
                }}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  isVoiceEnabled
                    ? 'border-sky-200 bg-sky-50 text-sky-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                } ${!isSpeechSupported ? 'cursor-not-allowed opacity-50' : ''}`}
                aria-pressed={isVoiceEnabled}
              >
                语音朗读：{isVoiceEnabled ? '开' : '关'}
              </button>
              <button
                type="button"
                onClick={showResetAction ? resetPlayback : startPlayback}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                {showResetAction ? '重置' : '开始'}
              </button>
            </div>
          </div>

          <div ref={stepListRef} className="mt-5 flex-1 overflow-auto pr-1">
            <div className="space-y-4">
              {demoSteps.map((step, index) => {
                const isVisible = index <= activeStep;
                const isExpanded = expandedStepIndex === index;

                return (
                  <button
                    key={step.id}
                    ref={(element) => {
                      stepItemRefs.current[index] = element;
                    }}
                    type="button"
                    onClick={() => {
                      clearPlayback();
                      stopSpeech();
                      isVoiceAutoplayRef.current = false;
                      setIsPlaying(false);
                      setActiveStep(index);
                      setSelectedStep(index);
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition-all duration-300 ${
                      isExpanded
                        ? 'border-indigo-200 bg-white shadow-sm ring-2 ring-indigo-200'
                        : isVisible
                          ? 'border-sky-100 bg-sky-50/60'
                          : 'border-dashed border-slate-200 bg-slate-50'
                    } ${!isExpanded ? 'py-3' : ''} cursor-pointer`}
                    aria-expanded={isExpanded}
                    aria-label={`跳转到 ${step.title}`}
                  >
                    <div className="flex items-start gap-3">
                      <div>
                        <div
                          className={`text-sm font-semibold transition-colors ${
                            isExpanded ? 'text-slate-900' : isVisible ? 'text-sky-800' : 'text-slate-700'
                          }`}
                        >
                          {step.title}
                        </div>
                        <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                          {step.phase}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{step.summary}</p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {step.tools.map((tool) => (
                            <span
                              key={tool}
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                isVisible
                                  ? 'bg-slate-900 text-white'
                                  : 'border border-slate-200 bg-white text-slate-500'
                              }`}
                            >
                              {tool}
                            </span>
                          ))}
                        </div>

                        <div
                          className={`mt-4 rounded-xl px-3 py-2 text-sm leading-6 ${
                            isVisible ? 'bg-emerald-50 text-emerald-800' : 'bg-white text-slate-500'
                          }`}
                        >
                          输出结果：{step.result}
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section
          ref={architectureSectionRef}
          className={`flex min-h-[520px] flex-col border border-slate-200 bg-white p-4 shadow-sm ${
            isArchitectureFullscreen ? 'h-full rounded-none border-0 p-6 shadow-none' : 'rounded-2xl'
          }`}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">架构图</h3>
            <button
              type="button"
              onClick={() => {
                void toggleArchitectureFullscreen();
              }}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {isArchitectureFullscreen ? '恢复' : '全屏'}
            </button>
          </div>

          <div className={isArchitectureFullscreen ? 'min-h-0 flex-1' : 'min-h-[620px] flex-1'}>
            <ArchitectureCanvas fitTrigger={isArchitectureFullscreen} focusedStep={focusedStep} />
          </div>
        </section>
      </div>
    </div>
  );
};

export default ArchitectureFlow;
