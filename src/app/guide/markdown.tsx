"use client";
import { useEffect, useId, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
function Mermaid({ code }: {
    code: string;
}) {
    const id = useId().replace(/[^a-zA-Z0-9]/g, "");
    const [svg, setSvg] = useState("");
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let live = true;
        void import("mermaid")
            .then(async ({ default: mermaid }) => {
            mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "strict", flowchart: { htmlLabels: false, curve: "basis" } });
            const out = await mermaid.render(`m${id}`, code);
            if (live)
                setSvg(out.svg);
        })
            .catch(() => live && setFailed(true));
        return () => {
            live = false;
        };
    }, [code, id]);
    if (svg)
        return <div className="guide-chart" data-testid="guide-chart" dangerouslySetInnerHTML={{ __html: svg }}/>;
    return <pre className={failed ? "" : "opacity-50"}>{code}</pre>;
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const textOf = (node: React.ReactNode): string => (typeof node === "string" || typeof node === "number" ? String(node) : Array.isArray(node) ? node.map(textOf).join("") : node && typeof node === "object" && "props" in node ? textOf((node as {
    props: {
        children?: React.ReactNode;
    };
}).props.children) : "");
export function GuideMarkdown({ body }: {
    body: string;
}) {
    return (<div className="guide-prose" data-testid="guide-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
            h1: () => null,
            h2: ({ children }) => <h2 id={slug(textOf(children))}>{children}</h2>,
            h3: ({ children }) => <h3 id={slug(textOf(children))}>{children}</h3>,
            img: ({ src, alt }) => {
                const name = String(src ?? "").split("/").pop() ?? "";
                const url = `/api/guide/img/${name}`;
                return (<a href={url} target="_blank" rel="noreferrer" className="guide-shot" title="Open at full size">

                <img src={url} alt={alt ?? ""} loading="lazy"/>
                {alt && <span>{alt}</span>}
              </a>);
            },
            pre: ({ children }) => {
                const child = Array.isArray(children) ? children[0] : children;
                const props = child && typeof child === "object" && "props" in child ? (child as {
                    props: {
                        className?: string;
                        children?: React.ReactNode;
                    };
                }).props : null;
                if (props?.className?.includes("language-mermaid"))
                    return <Mermaid code={textOf(props.children).trim()}/>;
                return <pre>{children}</pre>;
            },
            table: ({ children }) => (<div className="guide-table">
              <table>{children}</table>
            </div>),
            a: ({ href, children }) => (<a href={href} {...(href?.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
              {children}
            </a>),
        }}>
        {body}
      </ReactMarkdown>
    </div>);
}
