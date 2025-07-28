'use client';

import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

interface Term {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

interface TermSelectorProps {
  terms: Term[];
  selectedTerm: string;
  onTermChange: (termId: string) => void;
  loading?: boolean;
  className?: string;
}

const TermSelector: React.FC<TermSelectorProps> = ({
  terms,
  selectedTerm,
  onTermChange,
  loading = false,
  className = ""
}) => {
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Ensure terms is always an array
  const safeTerms = Array.isArray(terms) ? terms : [];
  const selectedTermData = safeTerms.find(term => term._id === selectedTerm);

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Academic Term
      </label>
      
      {loading ? (
        <div className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-gray-500">Loading terms...</span>
          </div>
        </div>
      ) : (
        <div className="relative">
          <select
            value={selectedTerm}
            onChange={(e) => onTermChange(e.target.value)}
            className="
              w-full p-3 pr-10 border border-gray-200 rounded-lg 
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              bg-white appearance-none cursor-pointer
            "
          >
            <option value="">Select a term...</option>
            {safeTerms.map(term => (
              <option key={term._id} value={term._id}>
                {term.name} ({formatDate(term.startDate)} - {formatDate(term.endDate)})
                {term.isActive ? ' • Active' : ''}
              </option>
            ))}
          </select>
          
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      )}

      {/* Selected term info */}
      {selectedTermData && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">{selectedTermData.name}</span>
            <span className="text-blue-600">
              {formatDate(selectedTermData.startDate)} - {formatDate(selectedTermData.endDate)}
            </span>
            {selectedTermData.isActive && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                Active
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TermSelector;
