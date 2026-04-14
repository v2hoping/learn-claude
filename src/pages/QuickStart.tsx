import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { FileText, Loader2 } from 'lucide-react';
import Mermaid from '../components/Mermaid';

const QuickStart = () => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/docs/quick-start.md')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load markdown file');
        return res.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full flex-col text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Loading document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full w-full flex-col text-red-500">
        <FileText className="w-12 h-12 mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2">Error Loading Document</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8 w-full h-full overflow-y-auto">
      <article className="prose prose-blue lg:prose-lg max-w-none pb-20">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            h1: ({node, ...props}) => <h1 className="text-4xl font-extrabold text-gray-900 border-b pb-4 mb-6" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-gray-800 mt-10 mb-4 border-b pb-2" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3" {...props} />,
            p: ({node, ...props}) => <p className="text-gray-600 leading-relaxed mb-4" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 text-gray-600 space-y-2" {...props} />,
            li: ({node, ...props}) => <li className="" {...props} />,
            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 bg-blue-50 text-blue-800 py-2 px-4 rounded-r-lg my-4 not-italic font-medium" {...props} />,
            pre: ({node, children, ...props}: any) => {
              let codeProps: any = {};
              let content = children;
              
              if (React.isValidElement(children)) {
                codeProps = children.props;
                content = codeProps.children;
              } else if (Array.isArray(children) && children.length > 0 && React.isValidElement(children[0])) {
                codeProps = children[0].props;
                content = codeProps.children;
              }

              const className = codeProps.className || '';
              const match = /language-(\w+)/.exec(className || '');
              const language = match?.[1];

              if (language === 'mermaid') {
                return <Mermaid chart={String(content).replace(/\n$/, '')} />;
              }

              return (
                <div className="rounded-lg overflow-hidden bg-gray-900 my-6 shadow-md not-prose">
                  <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 font-mono border-b border-gray-700">
                    {language || 'text'}
                  </div>
                  <pre className="p-4 m-0 overflow-x-auto text-sm text-gray-300" {...props}>
                    <code className={className}>{content}</code>
                  </pre>
                </div>
              );
            },
            code: ({node, className, children, ...props}: any) => {
              return (
                <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono mx-1" {...props}>
                  {children}
                </code>
              );
            },
            table: ({node, ...props}) => (
              <div className="overflow-x-auto my-6">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg" {...props} />
              </div>
            ),
            th: ({node, ...props}) => <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props} />,
            td: ({node, ...props}) => <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-t border-gray-200" {...props} />,
            a: ({node, ...props}) => <a className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors" {...props} />
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
};

export default QuickStart;
