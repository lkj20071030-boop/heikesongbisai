import { BookOpen, ExternalLink, Info } from 'lucide-react';
import type { Source } from '../types';

const safeUrl=(url?:string)=>!!url&&/^https?:\/\//i.test(url);

export default function SourcePanel({ sources }: { sources: Source[] }) {
  return (
    <div className="source-list">
      {sources.length === 0 ? <div className="empty-state">暂无来源。完成一次诊断后，这里会展示检索证据。</div> : null}
      {sources.map(source => (
        <article className="source-card" key={source.id}>
          <div className="source-top"><BookOpen size={18}/><span className={source.verified ? 'tag verified' : 'tag unverified'}>{source.verified ? '后端标记已核实' : '待核实示例'}</span></div>
          <h4>{source.title}</h4>
          <p className="muted small">{source.organization}</p>
          <p>{source.excerpt}</p>
          {safeUrl(source.url) ? <a href={source.url} rel="noreferrer noopener" target="_blank">打开原始资料 <ExternalLink size={13}/></a> : <span className="muted small"><Info size={13}/> 此资料未附可打开的原始链接</span>}
        </article>
      ))}
    </div>
  );
}
