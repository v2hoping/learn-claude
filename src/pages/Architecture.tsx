import React from 'react';

const Architecture = () => {
  return (
    <div className="p-8 w-full">
      <div className="mb-8 border-b border-gray-100 pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">系统架构图</h1>
        <p className="text-lg text-gray-600">Claude Code (v2.1.88) 的核心模块架构及调用链路</p>
      </div>
      
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-inner flex items-center justify-center">
        <img 
          src="/assets/architecture.png" 
          alt="Claude Code 系统架构图" 
          className="max-w-full h-auto rounded-lg shadow-md"
          loading="lazy"
        />
      </div>
      
      <div className="mt-8 prose prose-blue max-w-none text-gray-600">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">架构解析指南</h3>
        <p>这是从 <code>how-claude-code-works</code> 提取出的核心系统架构。您可以结合本图，快速理解：</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong>Agent Loop</strong> 是系统的核心枢纽，管理会话流。</li>
          <li><strong>工具层</strong> 包括 66+ 种工具，具备沙箱安全和 7 层防御。</li>
          <li><strong>记忆系统与子 Agent</strong> 扩展了模型的基础能力，实现长会话的记忆驻留。</li>
          <li><strong>上下文工程层</strong> 保障系统能在 Token 限制内平稳运行，通过 4 级压缩动态管理空间。</li>
        </ul>
      </div>
    </div>
  );
};

export default Architecture;
