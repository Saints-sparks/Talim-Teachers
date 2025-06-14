'use client';
import React, { useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import CurriculumEditor from '@/components/curriculum/CurriculumEditor';
import EmptyCurriculumPage from '@/components/curriculum/EmptyCurriculumPage';
import { useCurriculum } from '@/app/hooks/useCurriculum';
import { useAuth } from '@/app/hooks/useAuth';

const CurriculumPage = () => {
  const { curricula, isLoading, error, fetchCurricula, showEditor, setShowEditor } = useCurriculum();
  const { isAuthenticated } = useAuth();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !hasInitialized.current) {
      hasInitialized.current = true;
      console.log('Initializing curricula fetch...');
      fetchCurricula({});
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-screen bg-white p-6 text-center">Please log in to access curriculum.</div>
      </Layout>
    );
  }

  if (isLoading && curricula.length === 0) {
    return (
      <Layout>
        <div className="min-h-screen bg-white p-6 text-center">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          </div>
          <p className="mt-4">Loading curricula...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-white p-6 text-center text-red-500">
          <p>Error: {error}</p>
          <button 
            onClick={() => fetchCurricula({})}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  // Show editor when showEditor is true OR when no curricula exist
  if (showEditor) {
    return (
      <Layout>
        <CurriculumEditor onClose={() => setShowEditor(false)} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-white p-6">
        {curricula.length === 0 ? (
          <EmptyCurriculumPage onCreateClick={() => setShowEditor(true)} />
        ) : (
          <div>
            {/* Curricula List with Create Button */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Curriculum Management</h1>
              <button
                onClick={() => setShowEditor(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Create New Curriculum
              </button>
            </div>
            
            {/* Display existing curricula */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {curricula.map((curriculum) => (
                <div key={curriculum._id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {curriculum.course?.name || 'Untitled Course'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Term: {curriculum.term?.name || 'N/A'}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      By: {curriculum.teacherId?.firstName} {curriculum.teacherId?.lastName}
                    </span>
                    <button
                      onClick={() => {
                        // You can add edit functionality here
                        setShowEditor(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CurriculumPage;