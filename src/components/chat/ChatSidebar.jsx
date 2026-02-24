import { useState } from 'react';
import { Microscope } from '@phosphor-icons/react';

export default function ChatSidebar({
  lang,
  chatHistory,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  isOpen,
  onClose,
}) {
  const groupByDate = (chats) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    const groups = { today: [], yesterday: [], week: [], older: [] };

    chats.forEach((chat) => {
      const d = new Date(chat.updatedAt);
      if (d >= today) groups.today.push(chat);
      else if (d >= yesterday) groups.yesterday.push(chat);
      else if (d >= weekAgo) groups.week.push(chat);
      else groups.older.push(chat);
    });

    return groups;
  };

  const groups = groupByDate(chatHistory);

  const labels = {
    today: lang === 'zh' ? '今天' : 'Today',
    yesterday: lang === 'zh' ? '昨天' : 'Yesterday',
    week: lang === 'zh' ? '前 7 天' : 'Previous 7 Days',
    older: lang === 'zh' ? '更早' : 'Older',
  };

  const renderGroup = (label, chats) => {
    if (chats.length === 0) return null;
    return (
      <div className="mb-2" key={label}>
        <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </div>
        {chats.map((chat) => (
          <div
            key={chat.id}
            role="button"
            tabIndex={0}
            onClick={() => {
              onSelectChat(chat.id);
              onClose();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { onSelectChat(chat.id); onClose(); }
            }}
            className={`group mx-2 flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] cursor-pointer transition-colors ${
              chat.id === activeChatId
                ? 'bg-gray-700/80 text-white'
                : 'text-gray-300 hover:bg-gray-800/60'
            }`}
          >
            <svg className="w-4 h-4 shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="truncate flex-1">{chat.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChat(chat.id);
              }}
              className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded hover:bg-gray-600 text-gray-500 hover:text-gray-200 transition-all"
              title={lang === 'zh' ? '删除' : 'Delete'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-[260px] bg-gray-900 flex flex-col
          transition-transform duration-300 ease-in-out
          lg:relative lg:z-auto lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* New Chat button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 rounded-lg border border-gray-700 px-3 py-2.5 text-[13px] font-medium text-gray-200 hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            {lang === 'zh' ? '新对话' : 'New Chat'}
          </button>
        </div>

        {/* History list */}
        <div className="flex-1 overflow-y-auto py-1 sidebar-scrollbar">
          {chatHistory.length === 0 ? (
            <div className="px-3 py-12 text-center text-[13px] text-gray-600">
              {lang === 'zh' ? '暂无聊天记录' : 'No chat history yet'}
            </div>
          ) : (
            <>
              {renderGroup(labels.today, groups.today)}
              {renderGroup(labels.yesterday, groups.yesterday)}
              {renderGroup(labels.week, groups.week)}
              {renderGroup(labels.older, groups.older)}
            </>
          )}
        </div>

        {/* Bottom brand strip */}
        <div className="px-4 py-3 border-t border-gray-800">
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <Microscope size={14} weight="regular" />
            <span className="font-medium">{lang === 'zh' ? '成分透视' : 'CosmeticLens'}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
