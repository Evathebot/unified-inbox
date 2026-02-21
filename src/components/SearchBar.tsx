import { Search } from 'lucide-react';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export default function SearchBar({ 
  placeholder = 'Search messages...', 
  value = '', 
  onChange 
}: SearchBarProps) {
  return (
    <div className="relative">
      <Search 
        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" 
        size={18} 
      />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="
          w-full pl-12 pr-4 py-3 
          backdrop-blur-xl bg-white/[0.08] 
          border border-white/[0.12] 
          rounded-xl 
          text-white placeholder:text-gray-400
          focus:outline-none focus:border-white/[0.2] focus:bg-white/[0.12]
          transition-all duration-200
        "
      />
    </div>
  );
}
