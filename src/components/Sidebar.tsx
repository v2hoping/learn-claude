import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, Network, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside 
      className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-48'
      }`}
    >
      <div className={`p-4 border-b border-gray-100 flex items-center h-20 ${
        isCollapsed ? 'justify-center' : 'justify-between'
      }`}>
        {!isCollapsed && (
          <div className="overflow-hidden whitespace-nowrap">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Learn Claude
            </h1>
            <p className="text-xs text-gray-500 mt-1">交互式源码解析教程</p>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0"
          title={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>
      
      <nav className="flex-1 p-3 space-y-2 overflow-y-auto overflow-x-hidden">
        <div className="space-y-1 mt-4">
          <NavLink
            to="/architecture"
            title={isCollapsed ? "核心理解" : ""}
            className={({ isActive }) =>
              `flex items-center py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              } ${isCollapsed ? 'justify-center px-0' : 'px-3'}`
            }
          >
            <Network className={`w-5 h-5 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
            {!isCollapsed && <span className="whitespace-nowrap">核心理解</span>}
          </NavLink>
          
          <NavLink
            to="/quick-start"
            title={isCollapsed ? "读懂 Claude" : ""}
            className={({ isActive }) =>
              `flex items-center py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              } ${isCollapsed ? 'justify-center px-0' : 'px-3'}`
            }
          >
            <BookOpen className={`w-5 h-5 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
            {!isCollapsed && <span className="whitespace-nowrap">读懂 Claude</span>}
          </NavLink>
        </div>
      </nav>
      
      <div className={`border-t border-gray-100 text-xs text-gray-400 text-center transition-all duration-300 flex items-center justify-center whitespace-nowrap overflow-hidden ${
        isCollapsed ? 'h-0 py-0 opacity-0' : 'h-12 py-3 opacity-100'
      }`}>
        基于 v2.1.88 源码分析
      </div>
    </aside>
  );
};

export default Sidebar;
