'use client';

import { useState, useEffect } from 'react';
import { CheckSquare } from 'lucide-react';

interface ActionItemsListProps {
  items: string[];
}

const STORAGE_KEY = 'unified-inbox-action-items-done';

function loadChecked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveChecked(checked: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...checked]));
  } catch { /* quota exceeded */ }
}

export default function ActionItemsList({ items }: ActionItemsListProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [justChecked, setJustChecked] = useState<string | null>(null);

  useEffect(() => {
    setChecked(loadChecked());
  }, []);

  const toggle = (item: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
        // Flash the "just checked" state for the animation
        setJustChecked(item);
        setTimeout(() => setJustChecked(null), 600);
      }
      saveChecked(next);
      return next;
    });
  };

  const doneCount = items.filter(i => checked.has(i)).length;

  return (
    <div>
      {/* Progress bar */}
      {items.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">{doneCount} of {items.length} done</span>
            {doneCount === items.length && items.length > 0 && (
              <span className="text-xs text-green-500 font-medium">All done! 🎉</span>
            )}
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${items.length > 0 ? (doneCount / items.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {items.map((item, idx) => {
          const isDone = checked.has(item);
          const isFlashing = justChecked === item;

          return (
            <button
              key={idx}
              onClick={() => toggle(item)}
              className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all text-left group ${
                isDone
                  ? 'bg-green-50 hover:bg-green-100'
                  : 'hover:bg-gray-50'
              } ${isFlashing ? 'scale-[0.98]' : ''}`}
            >
              {/* Custom checkbox */}
              <div className={`w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                isDone
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-300 group-hover:border-gray-400'
              }`}>
                {isDone && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              <p className={`text-sm flex-1 leading-relaxed transition-all ${
                isDone ? 'text-gray-400 line-through' : 'text-gray-600'
              }`}>
                {item}
              </p>
            </button>
          );
        })}

        {items.length === 0 && (
          <div className="flex flex-col items-center py-6 gap-2">
            <CheckSquare className="text-gray-300" size={28} />
            <p className="text-gray-400 text-sm text-center">No action items extracted</p>
            <p className="text-gray-300 text-xs text-center">Action items are pulled from your priority messages</p>
          </div>
        )}
      </div>
    </div>
  );
}
