import type { ComponentProps, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import type { CategoryDefinition, KnowledgeEntry } from '../../types';

interface PrintTemplateProps {
  category?: CategoryDefinition;
  containerRef: (node: HTMLDivElement | null) => void;
  entry: KnowledgeEntry;
}

interface MarkdownHeading {
  depth: number;
  id: string;
  title: string;
}

const extractHeadings = (content: string) =>
  content
    .split('\n')
    .map((line) => line.match(/^(#{2,6})\s+(.+)$/))
    .filter(Boolean)
    .map((match, index) => ({
      depth: match![1].length,
      id: `toc-${index}-${match![2]
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}`,
      title: match![2].trim(),
    })) satisfies MarkdownHeading[];

const pdfMarkdownComponents = {
  a: (props: ComponentProps<'a'>) => (
    <a
      {...props}
      style={{
        color: '#2563eb',
        lineHeight: 1.6,
        textDecoration: 'underline',
        fontWeight: 600,
        overflow: 'visible',
        padding: '1px 0 3px',
      }}
    />
  ),
  code: ({
    children,
    className,
    inline,
  }: {
    children?: ReactNode;
    className?: string;
    inline?: boolean;
  }) => {
    if (inline) {
      return (
        <code
          style={{
            backgroundColor: '#e2e8f0',
            borderRadius: 4,
            color: '#0f172a',
            fontFamily: '"Courier New", monospace',
            fontSize: 9,
            lineHeight: 1.6,
            overflow: 'visible',
            padding: '1px 5px 3px',
          }}
        >
          {children}
        </code>
      );
    }

    return (
      <div
        className="pdf-avoid-break"
        style={{
          backgroundColor: '#dbe1e8',
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          margin: '10px 0',
          overflow: 'hidden',
          pageBreakInside: 'avoid',
        }}
      >
        <pre
          style={{
            color: '#0f172a',
            fontFamily: '"Courier New", monospace',
            fontSize: 9,
            lineHeight: 1.6,
            margin: 0,
            overflowX: 'auto',
            overflowY: 'visible',
            padding: '10px 12px',
            pageBreakInside: 'avoid',
            whiteSpace: 'pre-wrap',
          }}
        >
          <code className={className}>{children}</code>
        </pre>
      </div>
    );
  },
  h1: (props: ComponentProps<'h1'>) => (
    <h1
      {...props}
      style={{
        color: '#0f172a',
        fontSize: 16,
        fontWeight: 700,
        lineHeight: 1.6,
        margin: '16px 0 8px',
        overflow: 'visible',
        padding: '4px 0 3px',
      }}
    />
  ),
  h2: (props: ComponentProps<'h2'>) => {
    const contentText = String(props.children ?? '');
    const anchorId = contentText.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return (
      <h2
        {...props}
        id={anchorId}
        style={{
          color: '#0f172a',
          fontSize: 13,
          borderBottom: '1px solid #e2e8f0',
          fontWeight: 700,
          lineHeight: 1.6,
          margin: '16px 0 8px',
          overflow: 'visible',
          padding: '4px 0 3px',
          paddingBottom: 4,
        }}
      />
    );
  },
  h3: (props: ComponentProps<'h3'>) => {
    const contentText = String(props.children ?? '');
    const anchorId = contentText.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return (
      <h3
        {...props}
        id={anchorId}
        style={{
          color: '#0f172a',
          borderBottom: '1px solid #e2e8f0',
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1.6,
          margin: '14px 0 6px',
          overflow: 'visible',
          padding: '3px 0 3px',
          paddingBottom: 3,
        }}
      />
    );
  },
  h4: (props: ComponentProps<'h4'>) => (
    <h4
      {...props}
      style={{
        color: '#0f172a',
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1.6,
        margin: '12px 0 5px',
        overflow: 'visible',
        padding: '2px 0 3px',
      }}
    />
  ),
  img: (props: ComponentProps<'img'>) => (
    <img
      {...props}
      className="pdf-avoid-break"
      style={{
        borderRadius: 10,
        display: 'block',
        margin: '12px auto',
        maxHeight: '250px',
        maxWidth: '100%',
        pageBreakInside: 'avoid',
      }}
    />
  ),
  li: (props: ComponentProps<'li'>) => (
    <li
      {...props}
      style={{
        color: '#1e293b',
        fontSize: 10.5,
        lineHeight: 1.6,
        marginBottom: 4,
        overflow: 'visible',
        padding: '1px 0 3px',
      }}
    />
  ),
  ol: (props: ComponentProps<'ol'>) => (
    <ol {...props} style={{ color: '#1e293b', margin: '8px 0', paddingLeft: 18 }} />
  ),
  p: (props: ComponentProps<'p'>) => (
    <p
      {...props}
      style={{
        color: '#1e293b',
        fontSize: 10.5,
        lineHeight: 1.6,
        margin: '7px 0',
        overflow: 'visible',
        padding: '1px 0 3px',
      }}
    />
  ),
  strong: (props: ComponentProps<'strong'>) => (
    <strong
      {...props}
      style={{
        color: '#0f172a',
        fontWeight: 700,
        lineHeight: 1.6,
        overflow: 'visible',
        paddingBottom: 3,
      }}
    />
  ),
  table: (props: ComponentProps<'table'>) => (
    <div
      className="pdf-avoid-break"
      style={{
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        margin: '10px 0',
        overflow: 'hidden',
        pageBreakInside: 'avoid',
      }}
    >
      <table
        {...props}
        style={{
          borderCollapse: 'collapse',
          minWidth: '100%',
        }}
      />
    </div>
  ),
  td: (props: ComponentProps<'td'>) => (
    <td
      {...props}
      style={{
        borderTop: '1px solid #e2e8f0',
        color: '#1e293b',
          fontSize: 10,
          padding: '7px 9px',
          lineHeight: 1.6,
          verticalAlign: 'top',
        }}
    />
  ),
  th: (props: ComponentProps<'th'>) => (
    <th
      {...props}
      style={{
        backgroundColor: '#f8fafc',
        color: '#475569',
        fontSize: 9,
        fontWeight: 700,
        lineHeight: 1.6,
        letterSpacing: '0.08em',
        padding: '7px 9px',
        textAlign: 'left',
        textTransform: 'uppercase',
      }}
    />
  ),
  ul: (props: ComponentProps<'ul'>) => (
    <ul {...props} style={{ color: '#1e293b', margin: '8px 0', paddingLeft: 18 }} />
  ),
};

export function PrintTemplate({
  category,
  containerRef,
  entry,
}: PrintTemplateProps) {
  const headings = extractHeadings(entry.contenido);

  return (
    <div
      ref={containerRef}
      style={{
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
        color: '#0f172a',
        fontFamily: 'Arial, Roboto, sans-serif',
        overflow: 'visible',
        padding: '15mm',
        width: '210mm',
      }}
    >
      <header
        className="pdf-avoid-break"
        style={{
          alignItems: 'flex-start',
          borderBottom: '1px solid #cbd5e1',
          display: 'block',
          marginBottom: 16,
          overflow: 'visible',
          paddingBottom: 12,
          paddingTop: 4,
          pageBreakInside: 'avoid',
        }}
      >
        <h1
          style={{
            color: '#0f172a',
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1.6,
            margin: 0,
            overflow: 'visible',
            padding: '2px 0 3px',
          }}
        >
          {entry.titulo}
        </h1>
      </header>

      {category?.description ? (
        <p
          style={{
            color: '#334155',
            fontSize: 10.5,
            lineHeight: 1.6,
            margin: '0 0 12px',
            overflow: 'visible',
            padding: '1px 0 3px',
          }}
        >
          {category.description}
        </p>
      ) : null}

      {headings.length ? (
        <section
          className="pdf-avoid-break"
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            marginBottom: 16,
            padding: '12px 14px',
            pageBreakInside: 'avoid',
          }}
        >
          <h2
            style={{
              color: '#0f172a',
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1.6,
              margin: 0,
              overflow: 'visible',
              padding: '1px 0 3px',
            }}
          >
            Indice
          </h2>
          <ol style={{ color: '#1e293b', margin: '8px 0 0', paddingLeft: 16 }}>
            {headings.map((heading) => (
              <li
                key={heading.id}
                style={{
                  fontSize: 10,
                  lineHeight: 1.6,
                  marginLeft: Math.max(0, (heading.depth - 2) * 8),
                  overflow: 'visible',
                  padding: '1px 0 3px',
                }}
              >
                {heading.title}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={pdfMarkdownComponents}
        >
          {entry.contenido}
        </ReactMarkdown>
      </section>

      {entry.pasos?.length ? (
        <section
          className="pdf-avoid-break"
          style={{ marginTop: 18, pageBreakInside: 'avoid' }}
        >
          <h2 style={{ color: '#0f172a', fontSize: 13, fontWeight: 700, lineHeight: 1.6, margin: '0 0 7px', overflow: 'visible', padding: '1px 0 3px' }}>
            Pasos
          </h2>
          <ol style={{ color: '#1e293b', margin: 0, paddingLeft: 18 }}>
            {entry.pasos.map((step) => (
              <li key={step} style={{ fontSize: 10.5, lineHeight: 1.6, marginBottom: 4, overflow: 'visible', padding: '1px 0 3px' }}>
                {step}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {entry.comandos?.length ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ color: '#0f172a', fontSize: 13, fontWeight: 700, lineHeight: 1.6, margin: '0 0 7px', overflow: 'visible', padding: '1px 0 3px' }}>
            Parametros y comandos utiles
          </h2>
          <div style={{ display: 'grid', gap: 4 }}>
            {entry.comandos.map((command, index) => (
              <div
                key={`${command.label}-${index}`}
                className="pdf-avoid-break"
                style={{
                  alignItems: 'start',
                  display: 'grid',
                  gap: 6,
                  gridTemplateColumns: '50mm 130mm',
                  pageBreakInside: 'avoid',
                  padding: '2px 0',
                }}
              >
                <p
                  style={{
                    color: '#0f172a',
                    fontSize: 9.5,
                    fontWeight: 700,
                    lineHeight: 1.6,
                    margin: 0,
                    overflow: 'visible',
                    padding: '1px 0 3px',
                  }}
                >
                  {command.label}
                </p>
                <code
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 5,
                    color: '#0f172a',
                    display: 'block',
                    fontFamily: '"Courier New", monospace',
                    fontSize: 9.5,
                    height: 'auto',
                    lineHeight: 1.6,
                    overflow: 'visible',
                    padding: '4px 6px 3px',
                    width: '130mm',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {command.value}
                </code>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
