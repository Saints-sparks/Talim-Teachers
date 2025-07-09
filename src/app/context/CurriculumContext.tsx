'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CurriculumContextType {
  selectedCourseId: string | null;
  setSelectedCourseId: (courseId: string | null) => void;
  editingCurriculumId: string | null;
  setEditingCurriculumId: (id: string | null) => void;
  isCreatingNew: boolean;
  setIsCreatingNew: (creating: boolean) => void;
  showEditor: boolean;
  setShowEditor: (show: boolean) => void;
}

const CurriculumContext = createContext<CurriculumContextType | undefined>(undefined);

interface CurriculumProviderProps {
  children: ReactNode;
}

export const CurriculumProvider: React.FC<CurriculumProviderProps> = ({ children }) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [editingCurriculumId, setEditingCurriculumId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [showEditor, setShowEditor] = useState<boolean>(false);

  return (
    <CurriculumContext.Provider
      value={{
        selectedCourseId,
        setSelectedCourseId,
        editingCurriculumId,
        setEditingCurriculumId,
        isCreatingNew,
        setIsCreatingNew,
        showEditor,
        setShowEditor,
      }}
    >
      {children}
    </CurriculumContext.Provider>
  );
};

export const useCurriculumContext = () => {
  const context = useContext(CurriculumContext);
  if (context === undefined) {
    throw new Error('useCurriculumContext must be used within a CurriculumProvider');
  }
  return context;
};
