import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface MermaidProps {
  chart: string;
}

mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    mermaid.contentLoaded();
    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
    
    mermaid.render(id, chart).then(({ svg }) => {
      setSvgContent(svg);
      setError(false);
    }).catch(err => {
      console.error('Mermaid render error:', err);
      setError(true);
    });
  }, [chart]);

  if (error) {
    return <div className="text-red-500 p-4 border border-red-200 bg-red-50 rounded">Failed to render diagram</div>;
  }

  if (!svgContent) {
    return <div className="flex justify-center my-8 text-gray-400">Rendering...</div>;
  }

  return (
    <div className="mermaid-container relative w-full h-full border border-gray-200 rounded-lg overflow-hidden bg-gray-50/50">
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={4}
        centerOnInit={true}
        wheel={{ step: 0.1 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white p-2 rounded-lg shadow-md border border-gray-200">
              <button 
                onClick={() => zoomIn()} 
                className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                title="放大"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button 
                onClick={() => zoomOut()} 
                className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                title="缩小"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <div className="h-px bg-gray-200 my-1 w-full"></div>
              <button 
                onClick={() => resetTransform()} 
                className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                title="重置"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
            <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center cursor-move">
              <div 
                ref={containerRef}
                className="flex items-center justify-center p-8"
                dangerouslySetInnerHTML={{ __html: svgContent }} 
              />
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};

export default Mermaid;