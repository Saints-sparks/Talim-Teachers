'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import CurriculumEditor from '@/components/curriculum/CurriculumEditor';
import EmptyCurriculumPage from '@/components/curriculum/EmptyCurriculumPage';
import { useCurriculum } from '@/app/hooks/useCurriculum';
import { useAuth } from '@/app/hooks/useAuth';
import { Edit, Trash2, Download, ArrowLeft, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  curriculum: any;
}

const SkeletonLoader = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
    {[...Array(6)].map((_, index) => (
      <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="mt-4 flex justify-between">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    ))}
  </div>
);

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, curriculum }) => {
  const modalRef = useRef(null);

  if (!isOpen || !curriculum) return null;

  const handleDownload = async () => {
    if (modalRef.current) {
      try {
        const canvas = await html2canvas(modalRef.current, {
          backgroundColor: '#ffffff',
          scale: 2, // Increase resolution for better quality
        });
        const imgData = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = imgData;
        a.download = `${curriculum.course?.name || 'curriculum'}.png`;
        a.click();
      } catch (error) {
        console.error('Failed to generate image:', error);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {curriculum.course?.name || 'Untitled Course'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-4 text-gray-600">
          <p><span className="font-medium">Term:</span> {curriculum.term?.name || 'N/A'}</p>
          <p><span className="font-medium">Teacher:</span> {curriculum.teacherId?.name || 'Unknown'}</p>
          <p><span className="font-medium">School:</span> {curriculum.schoolId?.name || 'Unknown'}</p>
          <p><span className="font-medium">Created:</span> {new Date(curriculum.createdAt).toLocaleDateString()}</p>
          <p><span className="font-medium">Updated:</span> {new Date(curriculum.updatedAt).toLocaleDateString()}</p>
          <div className="mt-4">
            <p className="font-medium mb-2">Content:</p>
            <div 
              className="prose max-w-none break-words text-gray-600"
              dangerouslySetInnerHTML={{ __html: curriculum.content }}
            />
          </div>
          {curriculum.attachments.length > 0 && (
            <div className="mt-4">
              <p className="font-medium mb-2">Attachments:</p>
              <ul className="list-disc list-inside space-y-1">
                {curriculum.attachments.map((url: string, index: number) => (
                  <li key={index}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {url.split('/').pop() || `Attachment ${index + 1}`}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={handleDownload}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm flex items-center gap-2"
          >
            <Download size={16} />
            Download Image
          </button>
        </div>
      </div>
    </div>
  );
};

const CurriculumPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { curricula, isLoading, error, fetchCurricula, fetchCurriculumByCourse, showEditor, setShowEditor, editCurriculum, removeCurriculum, fetchCurriculumById } = useCurriculum();
  const { isAuthenticated } = useAuth();
  const hasInitialized = useRef(false);
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCurriculumId, setEditingCurriculumId] = useState<string | null>(null);
  const [courseCurricula, setCourseCurricula] = useState<any[]>([]);
  const [courseInfo, setCourseInfo] = useState<any>(null);
  
  // Get query parameters
  const courseId = searchParams.get('courseId');
  const mode = searchParams.get('mode'); // 'view' or 'create'
  const courseTitle = searchParams.get('courseTitle');
  const courseCode = searchParams.get('courseCode');

  useEffect(() => {
    if (isAuthenticated && !hasInitialized.current) {
      hasInitialized.current = true;
      
      if (courseId) {
        // If courseId is provided, fetch curricula for this specific course
        fetchCurriculumForCourse(courseId);
        // Set course info from query params
        if (courseTitle) {
          setCourseInfo({
            _id: courseId,
            name: decodeURIComponent(courseTitle),
            courseCode: courseCode ? decodeURIComponent(courseCode) : ''
          });
        }
        
        // If mode is create, open the editor immediately
        if (mode === 'create') {
          setShowEditor(true);
        }
      } else {
        // If no courseId, fetch all curricula (original behavior)
        fetchCurricula({});
      }
    }
  }, [isAuthenticated, courseId, mode, courseTitle, courseCode]);

  const fetchCurriculumForCourse = async (courseId: string) => {
    try {
      const curricula = await fetchCurriculumByCourse(courseId);
      setCourseCurricula(curricula || []);
    } catch (error) {
      console.error('Failed to fetch course curricula:', error);
      setCourseCurricula([]);
    }
  };

  const handleEdit = async (id: string) => {
    try {
      const curriculum = await fetchCurriculumById(id);
      setEditingCurriculumId(id);
      setShowEditor(true);
    } catch (error) {
      console.error('Failed to fetch curriculum for editing:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this curriculum?')) {
      try {
        await removeCurriculum(id);
      } catch (error) {
        console.error('Failed to delete curriculum:', error);
      }
    }
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setEditingCurriculumId(null);
    
    // If we came from a specific course, refresh course curricula
    if (courseId) {
      fetchCurriculumForCourse(courseId);
    } else {
      // Otherwise refresh all curricula
      fetchCurricula({});
    }
  };

  const handleBackToSubjects = () => {
    router.push('/dashboard'); // or wherever your subjects are displayed
  };

  const handleCurriculumClick = (curriculum: any) => {
    setSelectedCurriculum(curriculum);
    setIsModalOpen(true);
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
          <div className="text-center bg-white p-6 rounded-lg shadow-md">
            <p className="text-gray-600 text-lg">Please log in to access curriculum.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading && curricula.length === 0) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 p-8">
          <SkeletonLoader />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
          <div className="text-center bg-white p-6 rounded-lg shadow-md">
            <p className="text-red-500 text-lg mb-4">Error: {error}</p>
            <button 
              onClick={() => fetchCurricula({})}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (showEditor) {
    return (
      <Layout>
        <CurriculumEditor 
          onClose={handleEditorClose}
          initialCourseId={courseId}
          courseInfo={courseInfo}
          editingCurriculumId={editingCurriculumId}
        />
      </Layout>
    );
  }

  // Determine which curricula to display
  const displayCurricula = courseId ? courseCurricula : curricula;
  const isCoursePage = !!courseId;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-8">
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          curriculum={selectedCurriculum} 
        />
        {displayCurricula.length === 0 && !isCoursePage ? (
          <EmptyCurriculumPage onCreateClick={() => setShowEditor(true)} />
        ) : (
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                {isCoursePage && (
                  <button
                    onClick={handleBackToSubjects}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Subjects
                  </button>
                )}
                <h1 className="text-3xl font-bold text-gray-900">
                  {isCoursePage 
                    ? `${courseInfo?.name || 'Course'} Curriculum` 
                    : 'Curriculum Management'
                  }
                </h1>
              </div>
              <button
                onClick={() => setShowEditor(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                {isCoursePage ? 'Create Curriculum' : 'Create New Curriculum'}
              </button>
            </div>
            
            {displayCurricula.length === 0 && isCoursePage ? (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                <div className="max-w-md mx-auto">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Curriculum Found
                  </h3>
                  <p className="text-gray-600 mb-6">
                    This course doesn't have any curriculum yet. Create one to get started.
                  </p>
                  <button
                    onClick={() => setShowEditor(true)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm flex items-center gap-2 mx-auto"
                  >
                    <Plus className="w-5 h-5" />
                    Create First Curriculum
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayCurricula.map((curriculum) => (
                  <div 
                    key={curriculum._id} 
                    className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-200 cursor-pointer"
                    onClick={() => handleCurriculumClick(curriculum)}
                  >
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      {curriculum.course?.name || courseInfo?.name || 'Untitled Course'}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Term: {curriculum.term?.name || 'N/A'}
                    </p>
                    <div className="space-y-3 text-sm text-gray-600">
                      <p><span className="font-medium">Teacher:</span> {curriculum.teacherId?.name || 'Unknown'}</p>
                      <p><span className="font-medium">School:</span> {curriculum.schoolId?.name || 'Unknown'}</p>
                      <p><span className="font-medium">Created:</span> {new Date(curriculum.createdAt).toLocaleDateString()}</p>
                      <p><span className="font-medium">Updated:</span> {new Date(curriculum.updatedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="mt-6 flex justify-between items-center">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(curriculum._id);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-2 font-medium"
                        >
                          <Edit size={16} />
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(curriculum._id);
                          }}
                          className="text-red-600 hover:text-red-800 text-sm flex items-center gap-2 font-medium"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CurriculumPage;