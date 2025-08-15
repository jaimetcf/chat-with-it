import ReactMarkdown from 'react-markdown';
import { ReactNode } from 'react';
import { IAssistantMessage } from './interfaces';

// Simple markdown-like rendering without external dependencies
// TODO: Replace with react-markdown once package is installed
function renderMarkdown(text: string): JSX.Element {
    // Simple markdown parsing for common elements
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    
    lines.forEach((line, index) => {
        if (line.trim() === '') {
            elements.push(<br key={index} />);
            return;
        }
        
        // Headers
        if (line.startsWith('### ')) {
            elements.push(
                <h3 key={index} className="text-sm font-semibold mb-1 text-gray-900">
                    {line.substring(4)}
                </h3>
            );
            return;
        }
        
        if (line.startsWith('## ')) {
            elements.push(
                <h2 key={index} className="text-base font-semibold mb-2 text-gray-900">
                    {line.substring(3)}
                </h2>
            );
            return;
        }
        
        if (line.startsWith('# ')) {
            elements.push(
                <h1 key={index} className="text-lg font-bold mb-2 text-gray-900">
                    {line.substring(2)}
                </h1>
            );
            return;
        }
        
        // Code blocks
        if (line.startsWith('```')) {
            const codeContent = lines.slice(index + 1).join('\n').split('```')[0];
            elements.push(
                <pre key={index} className="bg-gray-100 p-3 rounded-lg overflow-x-auto mb-2 text-xs font-mono">
                    <code>{codeContent}</code>
                </pre>
            );
            return;
        }
        
        // Inline code
        let processedLine = line;
        const codeRegex = /`([^`]+)`/g;
        const parts: (string | JSX.Element)[] = [];
        let lastIndex = 0;
        let match;
        
        while ((match = codeRegex.exec(line)) !== null) {
            parts.push(processedLine.substring(lastIndex, match.index));
            parts.push(
                <code key={`code-${index}-${match.index}`} className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs font-mono">
                    {match[1]}
                </code>
            );
            lastIndex = match.index + match[0].length;
        }
        parts.push(processedLine.substring(lastIndex));
        
        // Bold and italic
        const processedParts = parts.map((part, partIndex) => {
            if (typeof part === 'string') {
                // Bold: **text**
                let boldProcessed = part.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                // Italic: *text*
                boldProcessed = boldProcessed.replace(/\*([^*]+)\*/g, '<em>$1</em>');
                
                return (
                    <span 
                        key={`part-${index}-${partIndex}`}
                        dangerouslySetInnerHTML={{ __html: boldProcessed }}
                    />
                );
            }
            return part;
        });
        
        elements.push(
            <p key={index} className="mb-2 last:mb-0">
                {processedParts}
            </p>
        );
    });
    
    return <div className="space-y-1">{elements}</div>;
}

// Component to render assistant message items with markdown support
export default function AssistantMessage(
    { message }: { message?: IAssistantMessage }
) {
    return (
        <div className="space-y-2">
            {message?.message.map((item, index) => (
                <div key={index} className="text-sm">
                    {item && (
                        <div className="mb-1">
                            <ReactMarkdown
                                className="prose prose-sm max-w-none"
                                components={{
                                    // Custom styling for different markdown elements
                                    p: ({ children }: { children?: ReactNode }) => (
                                        <p className="mb-2 last:mb-0">{children}</p>
                                    ),
                                    h1: ({ children }: { children?: ReactNode }) => (
                                        <h1 className="text-lg font-bold mb-2 text-gray-900">{children}</h1>
                                    ),
                                    h2: ({ children }: { children?: ReactNode }) => (
                                        <h2 className="text-base font-semibold mb-2 text-gray-900">{children}</h2>
                                    ),
                                    h3: ({ children }: { children?: ReactNode }) => (
                                        <h3 className="text-sm font-semibold mb-1 text-gray-900">{children}</h3>
                                    ),
                                    ul: ({ children }: { children?: ReactNode }) => (
                                        <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
                                    ),
                                    ol: ({ children }: { children?: ReactNode }) => (
                                        <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
                                    ),
                                    li: ({ children }: { children?: ReactNode }) => (
                                        <li className="text-gray-700">{children}</li>
                                    ),
                                    code: ({ children, className }: { children?: ReactNode; className?: string }) => {
                                        const isInline = !className;
                                        return isInline ? (
                                            <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs font-mono">
                                                {children}
                                            </code>
                                        ) : (
                                            <code className="block bg-gray-100 text-gray-800 p-2 rounded text-xs font-mono overflow-x-auto">
                                                {children}
                                            </code>
                                        );
                                    },
                                    pre: ({ children }: { children?: ReactNode }) => (
                                        <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto mb-2">
                                            {children}
                                        </pre>
                                    ),
                                    blockquote: ({ children }: { children?: ReactNode }) => (
                                        <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-2">
                                            {children}
                                        </blockquote>
                                    ),
                                    strong: ({ children }: { children?: ReactNode }) => (
                                        <strong className="font-semibold text-gray-900">{children}</strong>
                                    ),
                                    em: ({ children }: { children?: ReactNode }) => (
                                        <em className="italic text-gray-700">{children}</em>
                                    ),
                                    a: ({ children, href }: { children?: ReactNode; href?: string }) => (
                                        <a 
                                            href={href} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 underline"
                                        >
                                            {children}
                                        </a>
                                    ),
                                }}
                            >
                                {item.text}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
  