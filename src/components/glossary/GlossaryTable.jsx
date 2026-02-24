import { useState, useMemo } from 'react';

export default function GlossaryTable({ entries, categories, lang, translations: t }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortField, setSortField] = useState('inci_name');
  const [sortDirection, setSortDirection] = useState('asc');

  const filteredEntries = useMemo(() => {
    let result = entries;

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(entry =>
        entry.inci_name.toLowerCase().includes(searchLower) ||
        entry.chinese_name.includes(search) ||
        entry.aliases_en?.some(a => a.toLowerCase().includes(searchLower)) ||
        entry.aliases_zh?.some(a => a.includes(search)) ||
        (lang === 'zh' ? entry.function_zh : entry.function_en)?.toLowerCase().includes(searchLower)
      );
    }

    if (selectedCategory !== 'all') {
      result = result.filter(entry => entry.category === selectedCategory);
    }

    result = [...result].sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return result;
  }, [entries, search, selectedCategory, sortField, sortDirection, lang]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return (
      <svg className="w-3.5 h-3.5 ml-1 opacity-0 group-hover/th:opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
    return (
      <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {sortDirection === 'asc' ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        )}
      </svg>
    );
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return lang === 'zh' ? category?.name_zh : category?.name_en;
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-grow relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.glossary.search_placeholder}
            className="w-full h-10 rounded-md border border-input bg-background pl-10 pr-4 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <option value="all">{t.glossary.all_categories}</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {lang === 'zh' ? category.name_zh : category.name_en}
            </option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {t.glossary.showing} {filteredEntries.length} {t.glossary.of} {entries.length} {t.glossary.ingredients}
      </div>

      {/* Table */}
      {filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
          <p className="text-muted-foreground">{t.glossary.no_results}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th
                  className="group/th px-4 py-3 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('inci_name')}
                >
                  <span className="inline-flex items-center">
                    {t.glossary.columns.inci}
                    <SortIcon field="inci_name" />
                  </span>
                </th>
                <th
                  className="group/th px-4 py-3 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('chinese_name')}
                >
                  <span className="inline-flex items-center">
                    {t.glossary.columns.chinese}
                    <SortIcon field="chinese_name" />
                  </span>
                </th>
                <th
                  className="group/th px-4 py-3 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('category')}
                >
                  <span className="inline-flex items-center">
                    {t.glossary.columns.category}
                    <SortIcon field="category" />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  {t.glossary.columns.function}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry, index) => (
                <tr
                  key={entry.inci_name}
                  id={entry.inci_name.toLowerCase().replace(/\s+/g, '-')}
                  className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-card-foreground">
                      {entry.inci_name}
                    </div>
                    {entry.aliases_en?.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {entry.aliases_en.join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-card-foreground">{entry.chinese_name}</div>
                    {entry.aliases_zh?.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {entry.aliases_zh.join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                      {getCategoryName(entry.category)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {lang === 'zh' ? entry.function_zh : entry.function_en}
                    {entry.notes_en && (
                      <div className="text-xs text-muted-foreground/70 mt-0.5 italic">
                        {lang === 'zh' ? entry.notes_zh : entry.notes_en}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
