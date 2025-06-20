'use client';
import React from 'react';

interface EmptyCurriculumPageProps {
  onCreateClick: () => void;
}

const EmptyCurriculumPage: React.FC<EmptyCurriculumPageProps> = ({ onCreateClick }) => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <img
          src="/image/illustration-placeholder.png"
          alt="Empty Curriculum Illustration"
          className="mx-auto mb-6 w-32 h-32"
        />
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">No Curriculum Found</h2>
        <p className="text-gray-600 mb-6">Get started by creating your first curriculum</p>
        <button
          onClick={onCreateClick}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Create Curriculum
        </button>
      </div>
    </div>
  );
};

export default EmptyCurriculumPage;