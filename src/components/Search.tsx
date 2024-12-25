import React from 'react';
import { Search as SearchIcon } from 'lucide-react';

interface SearchProps {
  placeholder: string;
}

const Search: React.FC<SearchProps> = ({ placeholder }) => {
  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-800" />
        <input
          type="search"
          placeholder={placeholder}
          className="pl-10 pr-4 py-2 rounded-md border border-gray-200"
        />
      </div>
    </div>
  );
};

export default Search;
