/**
 * ClaimsTable — renders structured claim-vs-reality data with coloured badges.
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
      r === '✅'
    ) {
      return {
        label: lang === 'zh' ? '✅ 有支持' : '✅ Supported',
        cls: 'bg-green-100 text-green-800 border-green-200',
      };
    }

    if (r.includes('partial') || r.includes('partly') || r === '⚠️') {
      return {
        label: lang === 'zh' ? '⚠️ 部分支持' : '⚠️ Partial',
        cls: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      };
    }

    if (r.includes('unsupport') || r.includes('not support') || r === '❌') {
      return {
        label: lang === 'zh' ? '❌ 无支持' : '❌ Unsupported',
        cls: 'bg-red-100 text-red-800 border-red-200',
      };
    }

    if (r.includes('unverif') || r === '❓') {
      return {
        label: lang === 'zh' ? '❓ 无法验证' : '❓ Unverifiable',
        cls: 'bg-gray-100 text-gray-600 border-gray-200',
      };
    }

    // Fallback — show raw text in neutral pill
    return { label: raw, cls: 'bg-gray-100 text-gray-600 border-gray-200' };
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
                    className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}
                  >
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
