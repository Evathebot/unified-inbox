'use client';

import { X } from 'lucide-react';
import { SortType, AccountFilter } from './types';

interface FilterPanelProps {
  filterUnread: boolean;
  setFilterUnread: (v: boolean) => void;
  filterUnanswered: boolean;
  setFilterUnanswered: (v: boolean) => void;
  sortBy: SortType;
  setSortBy: (v: SortType) => void;
  accountFilter: AccountFilter;
  setAccountFilter: (v: AccountFilter) => void;
  onClose: () => void;
}

export default function FilterPanel({
  filterUnread, setFilterUnread,
  filterUnanswered, setFilterUnanswered,
  sortBy, setSortBy,
  accountFilter, setAccountFilter,
  onClose,
}: FilterPanelProps) {
  return (
    <div className="mx-3 mb-2 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filters</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Accounts</p>
        <div className="flex gap-2">
          {(['all', 'work', 'personal'] as AccountFilter[]).map((acc) => (
            <button key={acc} onClick={() => setAccountFilter(acc)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                accountFilter === acc ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}>{acc}</button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Filter By</p>
        <div className="space-y-2">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={filterUnread} onChange={(e) => setFilterUnread(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500" />
            <span className="text-sm text-gray-700">Unread</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={filterUnanswered} onChange={(e) => setFilterUnanswered(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500" />
            <span className="text-sm text-gray-700">Unanswered</span>
          </label>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sort By</p>
        <div className="flex gap-2">
          {(['priority', 'recent'] as SortType[]).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                sortBy === s ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}>{s === 'recent' ? 'Most Recent' : 'Priority'}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
