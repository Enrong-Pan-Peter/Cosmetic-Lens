import { CheckCircle, WarningCircle, XCircle, Question } from '@phosphor-icons/react';

/**
 * ClaimsTable — renders structured claim-vs-reality data.
 *
 * Verdict badges use the 02g status tokens with Phosphor line icons to match
 * the homepage design language — no emoji, no candy colors.
 *
 * Props:
 *   claims: Array<{ claim: string, rating: string, analysis: string }>
 *   lang: 'en' | 'zh'
 */
export default function ClaimsTable({ claims, lang }) {
  if (!claims || claims.length === 0) return null;

  const getRatingBadge = (raw) => {
    const r = (raw || '').toLowerCase().trim();

    if (
      (r.includes('support') && !r.includes('unsupport') && !r.includes('not support') && !r.includes('partial')) ||
      r === 'supported' ||
      r === '✅' // legacy chats saved before the emoji purge
    ) {
      return {
        label: lang === 'zh' ? '有支持' : 'Supported',
        Icon: CheckCircle,
        cls: 'border-safe/25 bg-safe-bg text-safe',
      };
    }

    if (r.includes('partial') || r.includes('partly') || r === '⚠️') {
      return {
        label: lang === 'zh' ? '部分支持' : 'Partial',
        Icon: WarningCircle,
        cls: 'border-caution/30 bg-caution-bg text-caution',
      };
    }

    if (r.includes('unsupport') || r.includes('not support') || r === '❌') {
      return {
        label: lang === 'zh' ? '无支持' : 'Unsupported',
        Icon: XCircle,
        cls: 'border-destructive/30 bg-destructive/10 text-destructive',
      };
    }

    if (r.includes('unverif') || r === '❓') {
      return {
        label: lang === 'zh' ? '无法验证' : 'Unverifiable',
        Icon: Question,
        cls: 'border-border bg-card text-muted-foreground',
      };
    }

    // Fallback — show raw text in a neutral pill (strip any stray emoji)
    return {
      label: (raw || '').replace(/[✅⚠️❌❓]/g, '').trim() || raw,
      Icon: null,
      cls: 'border-border bg-card text-muted-foreground',
    };
  };

  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {lang === 'zh' ? '宣传' : 'Claim'}
            </th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {lang === 'zh' ? '评级' : 'Rating'}
            </th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {lang === 'zh' ? '分析' : 'Why'}
            </th>
          </tr>
        </thead>
        <tbody>
          {claims.map((item, i) => {
            const badge = getRatingBadge(item.rating);
            return (
              <tr
                key={i}
                className={`border-b border-border last:border-0 ${i % 2 !== 0 ? 'bg-muted/20' : ''}`}
              >
                <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                  {item.claim}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${badge.cls}`}
                  >
                    {badge.Icon && <badge.Icon size={12} weight="regular" aria-hidden="true" />}
                    {badge.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {item.analysis}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
