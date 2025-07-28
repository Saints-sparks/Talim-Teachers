'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  TrendingUp, 
  Award, 
  Target, 
  BookOpen, 
  Calendar, 
  BarChart3,
  Search,
  Filter,
  Download,
  Eye,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/app/hooks/useAuth';
import { useAppContext } from '@/app/context/AppContext';
import { gradeRecordsApi } from '@/app/services/grade-records.service';
import TermSelector from './shared/TermSelector';
import StudentGradeSummary from './class/StudentGradeSummary';
import type { 
  StudentCumulativeTermGradeRecord,
  ClassCumulativeTermGradeRecord 
} from '@/types/grade-records';
import { getCurrentTerm } from '@/app/services/api.service';

interface Student {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  studentId: string;
  email: string;
  userId?: {
    name: string;
    email: string;
    studentId: string;
  };
}

interface ClassInfo {
  _id: string;
  name: string;
}

interface Term {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
}

type ViewMode = 'overview' | 'student-details' | 'class-analytics';

interface ClassStats {
  totalStudents: number;
  averageGrade: number;
  topPerformers: number;
  needsAttention: number;
  subjectsCount: number;
  activeAssessments: number;
}

const ClassTeacherView: React.FC = () => {
  const { getAccessToken } = useAuth();
  const { user, classes, refreshClasses, isLoading: contextLoading } = useAppContext();
  
  // Core state
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  
  // Data state
  const [terms, setTerms] = useState<Term[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [cumulativeRecords, setCumulativeRecords] = useState<StudentCumulativeTermGradeRecord[]>([]);
  const [classCumulativeRecord, setClassCumulativeRecord] = useState<ClassCumulativeTermGradeRecord | null>(null);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Computed values
  const filteredStudents = students.filter(student => {
    const name = student.name || student.firstName + ' ' + student.lastName || student.userId?.name || '';
    const studentId = student.studentId || student.userId?.studentId || '';
    const email = student.email || student.userId?.email || '';
    
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
           email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const stats: ClassStats = {
    totalStudents: students.length,
    averageGrade: cumulativeRecords.length > 0 
      ? Math.round(cumulativeRecords.reduce((sum, record) => sum + record.percentage, 0) / cumulativeRecords.length)
      : 0,
    topPerformers: cumulativeRecords.filter(record => record.percentage >= 90).length,
    needsAttention: cumulativeRecords.filter(record => record.percentage < 60).length,
    subjectsCount: 8, // This should come from API
    activeAssessments: 12 // This should come from API
  };

  // Load initial context data
  useEffect(() => {
    loadContextData();
  }, []);

  // Load class-specific data when class/term changes
  useEffect(() => {
    if (selectedClass && selectedTerm) {
      loadClassTermData();
    }
  }, [selectedClass, selectedTerm]);

  const loadContextData = async () => {
    try {
      const token = getAccessToken();
      if (!token) throw new Error('No access token');

      const termsResponse = await getCurrentTerm(token);
      console.log('Current term:', termsResponse);
      
      if (!termsResponse) {
        console.error('Failed to load terms');
        setTerms([]);
        return;
      }

      // Set the current term as the available term
      // If termsResponse is a single term object, wrap it in an array
      const termsData = Array.isArray(termsResponse) ? termsResponse : [termsResponse];
      setTerms(termsData);
      
      // Auto-select the first (current) term
      if (termsData.length > 0) {
        setSelectedTerm(termsData[0]._id);
      }

    } catch (error) {
      console.error('Error loading context data:', error);
      setTerms([]);
    }
  };

  const loadClassTermData = async () => {
    if (!selectedClass || !selectedTerm) return;
    
    setLoading(true);
    try {
      // Load students first
      await loadStudents();
      // Then load class cumulative record
      await loadClassCumulativeRecord();
    } catch (error) {
      console.error('Error loading class term data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load cumulative records separately after students are loaded
  useEffect(() => {
    if (selectedClass && selectedTerm && students.length > 0) {
      loadCumulativeRecords();
    }
  }, [selectedClass, selectedTerm, students.length]);

  const loadStudents = async () => {
    if (!selectedClass) return;
    
    setStudentsLoading(true);
    try {
      const token = getAccessToken();
      if (!token) throw new Error('No access token');

      const response = await fetch(`/api/classes/${selectedClass}/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const studentsData = data.students || data || [];
        console.log('Loaded students:', studentsData);
        setStudents(studentsData);
      } else {
        console.error('Failed to load students:', response.status);
        setStudents([]);
      }
    } catch (error) {
      console.error('Error loading students:', error);
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  const loadCumulativeRecords = async () => {
    if (!selectedClass || !selectedTerm || students.length === 0) return;

    try {
      const recordPromises = students.map(student => 
        gradeRecordsApi.getStudentCumulative(
          student._id,
          selectedTerm,
          getAccessToken() || ''
        ).catch(error => {
          console.error(`Error loading cumulative for student ${student._id}:`, error);
          return null;
        })
      );
      
      const records = await Promise.all(recordPromises);
      const validRecords = records.filter(record => record !== null);
      setCumulativeRecords(validRecords as any[]); // Temporary type assertion
    } catch (error) {
      console.error('Error loading cumulative records:', error);
      setCumulativeRecords([]);
    }
  };

  const loadClassCumulativeRecord = async () => {
    if (!selectedClass || !selectedTerm) return;

    try {
      const record = await gradeRecordsApi.getClassCumulative(
        selectedClass,
        selectedTerm,
        getAccessToken() || ''
      );
      setClassCumulativeRecord(record);
    } catch (error) {
      console.error('Error loading class cumulative record:', error);
      setClassCumulativeRecord(null);
    }
  };

  const handleViewStudent = (studentId: string) => {
    setSelectedStudent(studentId);
    setViewMode('student-details');
  };

  const handleBackToOverview = () => {
    setViewMode('overview');
    setSelectedStudent('');
  };

  return (
    <div className="p-6">
      {/* Header */}
      {viewMode !== 'overview' && (
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={handleBackToOverview}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Class Overview
          </Button>
        </div>
      )}

      {/* Class Selection */}
      {viewMode === 'overview' && (
        <>
          <div className="mb-6">
            <Card className="border-2 border-purple-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-purple-600 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Select Class
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {contextLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading classes...</p>
                  </div>
                ) : (
                  <select 
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                    <option value="">Choose a class...</option>
                    {classes.map(cls => (
                      <option key={cls._id} value={cls._id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                )}
              </CardContent>
            </Card>
          </div>

          {selectedClass && (
            <>
              {/* Term Selection */}
              <div className="mb-6">
                <TermSelector
                  terms={terms}
                  selectedTerm={selectedTerm}
                  onTermChange={setSelectedTerm}
                  loading={loading}
                />
              </div>

              {selectedTerm && (
                <>
                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-2 mb-6">
                    <Button
                      variant={viewMode === 'overview' ? 'default' : 'outline'}
                      onClick={() => setViewMode('overview')}
                      className={`flex items-center gap-2 ${
                        viewMode === 'overview' 
                          ? 'bg-gradient-to-r from-purple-500 to-purple-600' 
                          : 'border-purple-200 text-purple-600 hover:bg-purple-50'
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      Class Overview
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setViewMode('class-analytics')}
                      className="flex items-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                      disabled={!classCumulativeRecord}
                    >
                      <BarChart3 className="h-4 w-4" />
                      Class Analytics
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Main Content */}
      {selectedClass && selectedTerm && (
        <>
          {viewMode === 'overview' && (
            <>
              {/* Class Cumulative Grade Summary */}
              {classCumulativeRecord && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Class Performance Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {classCumulativeRecord.classAverage.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">Class Average</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {classCumulativeRecord.totalStudents}
                        </div>
                        <div className="text-sm text-gray-600">Total Students</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          A
                        </div>
                        <div className="text-sm text-gray-600">Class Grade</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {cumulativeRecords.reduce((sum, r) => sum + r.totalScore, 0).toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-600">Total Points</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Students List */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Students in {classes.find(c => c._id === selectedClass)?.name || 'Selected Class'}
                    </CardTitle>
                    
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search students..."
                          className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-1" />
                        Filter
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {studentsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading students...</p>
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">
                        {students.length === 0 ? 'No students found in this class' : 'No students match your search'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredStudents.map((student) => {
                        const cumulativeRecord = cumulativeRecords.find(
                          record => record.studentId === student._id
                        );
                        
                        const displayName = student.name || 
                          (student.firstName && student.lastName ? `${student.firstName} ${student.lastName}` : '') ||
                          student.userId?.name || 
                          'Unknown Student';
                        
                        return (
                          <div
                            key={student._id}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => handleViewStudent(student._id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium">
                                  {displayName.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium">
                                  {displayName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  ID: {student.studentId || student.userId?.studentId || 'No ID'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {cumulativeRecord ? (
                                <>
                                  <div className="text-right">
                                    <div className="font-semibold text-lg">
                                      {cumulativeRecord.percentage.toFixed(1)}%
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      Grade: {cumulativeRecord.grade}
                                    </div>
                                  </div>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    cumulativeRecord.percentage >= 90 ? 'bg-green-100 text-green-800' :
                                    cumulativeRecord.percentage >= 80 ? 'bg-blue-100 text-blue-800' :
                                    cumulativeRecord.percentage >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                    cumulativeRecord.percentage >= 60 ? 'bg-orange-100 text-orange-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {cumulativeRecord.grade}
                                  </span>
                                </>
                              ) : (
                                <span className="text-gray-400 text-sm">No grades yet</span>
                              )}
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {viewMode === 'student-details' && selectedStudent && (
            <StudentGradeSummary
              student={{
                ...students.find(s => s._id === selectedStudent)!,
                name: students.find(s => s._id === selectedStudent)?.name || 
                      students.find(s => s._id === selectedStudent)?.firstName + ' ' + students.find(s => s._id === selectedStudent)?.lastName ||
                      students.find(s => s._id === selectedStudent)?.userId?.name || 
                      'Unknown Student',
                classId: selectedClass
              }}
              termId={selectedTerm}
              token={getAccessToken() || ''}
              onBack={handleBackToOverview}
              onGenerateCumulative={() => {
                // Reload cumulative records after generating
                loadCumulativeRecords();
              }}
            />
          )}

          {viewMode === 'class-analytics' && classCumulativeRecord && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Class Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Grade Distribution */}
                    <div>
                      <h3 className="font-semibold mb-4">Grade Distribution</h3>
                      <div className="space-y-2">
                        {['A', 'B', 'C', 'D', 'F'].map(grade => {
                          const count = cumulativeRecords.filter(r => r.grade === grade).length;
                          const percentage = students.length > 0 ? (count / students.length) * 100 : 0;
                          return (
                            <div key={grade} className="flex items-center gap-3">
                              <span className="w-8 font-medium">{grade}:</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                                <div 
                                  className="bg-purple-500 h-4 rounded-full transition-all duration-300"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="w-12 text-sm text-gray-600">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Performance Stats */}
                    <div>
                      <h3 className="font-semibold mb-4">Performance Statistics</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Highest Score:</span>
                          <span className="font-semibold">
                            {cumulativeRecords.length > 0 
                              ? Math.max(...cumulativeRecords.map(r => r.percentage)).toFixed(1)
                              : 0
                            }%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Lowest Score:</span>
                          <span className="font-semibold">
                            {cumulativeRecords.length > 0 
                              ? Math.min(...cumulativeRecords.map(r => r.percentage)).toFixed(1)
                              : 0
                            }%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Students Above Average:</span>
                          <span className="font-semibold">
                            {cumulativeRecords.filter(r => 
                              r.percentage > classCumulativeRecord.classAverage
                            ).length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pass Rate (≥60%):</span>
                          <span className="font-semibold">
                            {cumulativeRecords.length > 0 
                              ? ((cumulativeRecords.filter(r => r.percentage >= 60).length / cumulativeRecords.length) * 100).toFixed(1)
                              : 0
                            }%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ClassTeacherView;
