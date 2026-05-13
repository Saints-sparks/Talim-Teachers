'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  TrendingUp,
  Award,
  BarChart3,
  Search,
  Eye,
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/app/hooks/useAuth';
import { useAppContext } from '@/app/context/AppContext';
import { gradeRecordsApi } from '@/app/services/grade-records.service';
import SectionHeader from '@/components/ui/section-header';
import StudentGradeSummary from './class/StudentGradeSummary';
import { Tooltip } from '@/components/ui/Tooltip';

interface Student {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  studentId?: string;
  email?: string;
  userId?: {
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    studentId?: string;
  };
}

interface Term {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

interface PopulatedStudentCumulative {
  _id: string;
  studentId: { _id: string; firstName?: string; lastName?: string; name?: string } | string;
  percentage: number;
  grade: string;
  position: number;
  totalScore: number;
  remarks?: string;
}

interface ClassCumulativeData {
  _id: string;
  classAverage: number;
  totalStudents: number;
  studentCumulativeTermGradeRecords: PopulatedStudentCumulative[];
}

type ViewMode = 'overview' | 'student-details';

const getStudentDisplayName = (student: Student): string => {
  if (student.name) return student.name;
  if (student.userId?.name) return student.userId.name;
  const first = student.firstName || student.userId?.firstName || '';
  const last = student.lastName || student.userId?.lastName || '';
  const full = `${first} ${last}`.trim();
  return full || 'Unknown Student';
};

const getStudentIdNumber = (student: Student): string =>
  student.studentId || student.userId?.studentId || student.userId?.email || '—';

const getGradeBadgeClass = (percentage: number): string => {
  if (percentage >= 80) return 'bg-green-100 text-green-800';
  if (percentage >= 70) return 'bg-blue-100 text-blue-800';
  if (percentage >= 60) return 'bg-yellow-100 text-yellow-800';
  if (percentage >= 50) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
};

const ClassTeacherView: React.FC = () => {
  const { getAccessToken } = useAuth();
  const { classes, isLoading: contextLoading } = useAppContext();

  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  const [terms, setTerms] = useState<Term[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classCumulative, setClassCumulative] = useState<ClassCumulativeData | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Load terms on mount
  useEffect(() => {
    loadTerms();
  }, []);

  // Reload when class + term change
  useEffect(() => {
    if (selectedClass && selectedTerm) {
      loadClassData();
    } else {
      setStudents([]);
      setClassCumulative(null);
    }
  }, [selectedClass, selectedTerm]);

  const loadTerms = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;
      const data = await gradeRecordsApi.getTerms(token);
      setTerms(Array.isArray(data) ? data : []);
      const active = Array.isArray(data) ? data.find((t: Term) => t.isActive) : null;
      if (active) setSelectedTerm(active._id);
    } catch (err) {
      console.error('Error loading terms:', err);
    }
  };

  const loadClassData = async () => {
    const token = getAccessToken();
    if (!token || !selectedClass || !selectedTerm) return;

    setLoading(true);
    setError(null);

    try {
      const [studentsData, cumulativeData] = await Promise.all([
        gradeRecordsApi.getStudentsForCourse(selectedClass, token),
        gradeRecordsApi.getClassCumulative(selectedClass, selectedTerm, token),
      ]);

      const studentList: Student[] = Array.isArray(studentsData)
        ? studentsData
        : studentsData?.data || [];
      setStudents(studentList);
      setClassCumulative(cumulativeData as ClassCumulativeData | null);
    } catch (err: any) {
      console.error('Error loading class data:', err);
      setError('Failed to load class data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAllReports = async () => {
    const token = getAccessToken();
    if (!token || !selectedClass || !selectedTerm || students.length === 0) return;

    setGenerating(true);
    setGenerateError(null);

    try {
      // Step 1: Calculate cumulative for each student (in parallel, best-effort)
      await Promise.allSettled(
        students.map(student =>
          gradeRecordsApi.autoCalculateStudentCumulative(student._id, selectedTerm, token)
        )
      );

      // Step 2: Calculate class cumulative
      await gradeRecordsApi.autoCalculateClassCumulative(selectedClass, selectedTerm, token);

      // Step 3: Reload
      await loadClassData();
    } catch (err: any) {
      console.error('Error generating reports:', err);
      setGenerateError(err?.message || 'Failed to generate reports. Ensure students have course grades first.');
    } finally {
      setGenerating(false);
    }
  };

  const handleViewStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setViewMode('student-details');
  };

  const handleBackToOverview = () => {
    setViewMode('overview');
    setSelectedStudentId('');
  };

  // Map student cumulative records by student _id for O(1) lookup
  const cumulativeByStudentId = useMemo<Record<string, PopulatedStudentCumulative>>(() => {
    if (!classCumulative?.studentCumulativeTermGradeRecords) return {};
    return classCumulative.studentCumulativeTermGradeRecords.reduce((acc, rec) => {
      const sid = typeof rec.studentId === 'object' ? rec.studentId._id : rec.studentId;
      if (sid) acc[sid] = rec;
      return acc;
    }, {} as Record<string, PopulatedStudentCumulative>);
  }, [classCumulative]);

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const q = searchTerm.toLowerCase();
    return students.filter(s => {
      const name = getStudentDisplayName(s).toLowerCase();
      const id = getStudentIdNumber(s).toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [students, searchTerm]);

  const selectedStudent = students.find(s => s._id === selectedStudentId);

  const gradedCount = useMemo(
    () => students.filter(s => !!cumulativeByStudentId[s._id]).length,
    [students, cumulativeByStudentId]
  );

  if (viewMode === 'student-details' && selectedStudent) {
    return (
      <div className="p-5 sm:p-6 space-y-6">
        <StudentGradeSummary
          student={{
            ...selectedStudent,
            name: getStudentDisplayName(selectedStudent),
            classId: selectedClass,
          }}
          termId={selectedTerm}
          token={getAccessToken() || ''}
          onBack={handleBackToOverview}
          onGenerateCumulative={loadClassData}
        />
      </div>
    );
  }

  const selectedClassName = classes.find(c => c._id === selectedClass)?.name || '';

  return (
    <div className="p-5 sm:p-6 space-y-5" data-guide="class-grading-shell">
      <SectionHeader
        title="Class Grading"
        subtitle="Review student performance by class and term"
        icon={<Users className="h-6 w-6 text-[#003366]" />}
      />

      {/* Class & Term Selector */}
      <Card className="bg-white shadow-none border-[#E6EDF5] rounded-2xl" data-guide="class-grading-selectors">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-[#003366] flex items-center gap-2">
            <Users className="h-4 w-4" />
            Class & Term
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6F6F6F] mb-2">Class</label>
              {contextLoading ? (
                <div className="text-sm text-[#6F6F6F] p-3">Loading classes...</div>
              ) : (
                <select
                  className="w-full p-3 border border-[#F0F0F0] rounded-xl focus:ring-2 focus:ring-[#003366] focus:border-transparent text-sm"
                  value={selectedClass}
                  onChange={e => {
                    setSelectedClass(e.target.value);
                    setClassCumulative(null);
                    setStudents([]);
                  }}
                >
                  <option value="">Choose a class...</option>
                  {classes.map(cls => (
                    <option key={cls._id} value={cls._id}>{cls.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6F6F6F] mb-2">Term</label>
              <select
                className="w-full p-3 border border-[#F0F0F0] rounded-xl focus:ring-2 focus:ring-[#003366] focus:border-transparent text-sm disabled:opacity-50"
                value={selectedTerm}
                onChange={e => setSelectedTerm(e.target.value)}
                disabled={!selectedClass || terms.length === 0}
              >
                <option value="">Choose a term...</option>
                {terms.map(term => (
                  <option key={term._id} value={term._id}>{term.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content — only shown when class + term selected */}
      {selectedClass && selectedTerm && (
        <>
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={loadClassData}
                className="ml-auto border-red-300 text-red-700 hover:bg-red-100"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Class Summary Card — if cumulative exists */}
          {classCumulative && (
            <Card className="bg-gradient-to-br from-[#F6F9FC] via-white to-[#F8FBFF] border-[#E6EDF5] rounded-2xl shadow-none" data-guide="class-grading-summary">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-[#003366]" />
                  <span className="font-semibold text-[#030E18] text-sm">
                    {selectedClassName} — Term Summary
                  </span>
                  <span className="ml-auto text-xs text-[#6F6F6F]">
                    Calculated
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-white border border-[#E6EDF5] p-3 text-center">
                    <div className="text-xl font-bold text-[#003366]">
                      {classCumulative.classAverage?.toFixed(1)}%
                    </div>
                    <div className="text-xs text-[#6F6F6F] mt-0.5">Class Average</div>
                  </div>
                  <div className="rounded-xl bg-white border border-[#E6EDF5] p-3 text-center">
                    <div className="text-xl font-bold text-[#030E18]">
                      {classCumulative.totalStudents}
                    </div>
                    <div className="text-xs text-[#6F6F6F] mt-0.5">Total Students</div>
                  </div>
                  <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-center">
                    <div className="text-xl font-bold text-green-700">
                      {classCumulative.studentCumulativeTermGradeRecords?.filter(
                        r => r.percentage >= 80
                      ).length ?? 0}
                    </div>
                    <div className="text-xs text-green-700 mt-0.5">Top Performers</div>
                  </div>
                  <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 text-center">
                    <div className="text-xl font-bold text-orange-700">
                      {classCumulative.studentCumulativeTermGradeRecords?.filter(
                        r => r.percentage < 60
                      ).length ?? 0}
                    </div>
                    <div className="text-xs text-orange-700 mt-0.5">Need Attention</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3" data-guide="class-grading-generate">
            <div className="flex-1 min-w-0">
              {!classCumulative ? (
                <div className="flex items-center gap-2 text-sm text-[#6F6F6F]">
                  <Clock className="h-4 w-4 shrink-0" />
                  No class summary yet. Generate reports once all course grades are recorded.
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  {gradedCount} of {students.length} students have cumulative grades.
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadClassData}
                disabled={loading}
                className="border-[#E6EDF5] text-[#6F6F6F] hover:bg-[#F8FAFF] shadow-none"
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Tooltip content="Generate student cumulative term records, then compile the class term summary." side="top">
                <Button
                  size="sm"
                  onClick={handleGenerateAllReports}
                  disabled={generating || loading || students.length === 0}
                  className="bg-[#003366] text-white hover:bg-[#002244] shadow-none"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1.5" />
                      Generate Class Summary
                    </>
                  )}
                </Button>
              </Tooltip>
            </div>
          </div>

          {generateError && (
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
              <p className="text-sm text-orange-800">{generateError}</p>
              <button onClick={() => setGenerateError(null)} className="ml-auto text-orange-500 text-lg leading-none">×</button>
            </div>
          )}

          {/* Students List */}
          <Card className="bg-white shadow-none border-[#E6EDF5] rounded-2xl" data-guide="class-grading-student-list">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <CardTitle className="text-sm font-semibold text-[#030E18] flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#003366]" />
                  {selectedClassName || 'Students'}
                  <span className="text-xs font-normal text-[#6F6F6F]">
                    ({students.length})
                  </span>
                </CardTitle>
                <div className="sm:ml-auto flex items-center bg-white border border-[#F0F0F0] rounded-xl px-3 py-2 w-full sm:w-64">
                  <Search className="text-[#878787] mr-2 shrink-0" size={16} />
                  <input
                    className="border-0 focus:outline-none flex-1 placeholder:text-[#878787] text-sm bg-transparent"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <RefreshCw className="h-6 w-6 animate-spin text-[#003366]" />
                  <p className="text-sm text-[#6F6F6F]">Loading students...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Users className="h-10 w-10 text-[#D0D0D0]" />
                  <p className="text-sm text-[#6F6F6F]">
                    {students.length === 0 ? 'No students found in this class.' : 'No students match your search.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#F0F0F0]">
                  {/* Header row */}
                  <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2 text-xs font-medium text-[#6F6F6F] uppercase tracking-wide">
                    <span>Student</span>
                    <span className="text-right w-20">Grade</span>
                    <span className="text-right w-16">Position</span>
                    <span className="w-16" />
                  </div>

                  {filteredStudents.map(student => {
                    const cumulative = cumulativeByStudentId[student._id];
                    const displayName = getStudentDisplayName(student);
                    const studentNumber = getStudentIdNumber(student);
                    const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

                    return (
                      <div
                        key={student._id}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F8FAFF] transition-colors cursor-pointer"
                        onClick={() => handleViewStudent(student._id)}
                      >
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-[#EAF2FB] flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-[#003366]">{initials}</span>
                        </div>

                        {/* Name + ID */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[#030E18] truncate">{displayName}</div>
                          <div className="text-xs text-[#6F6F6F]">{studentNumber}</div>
                        </div>

                        {/* Grade */}
                        <div className="shrink-0 w-24 text-right">
                          {cumulative ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getGradeBadgeClass(cumulative.percentage)}`}>
                                {cumulative.grade}
                              </span>
                              <span className="text-xs text-[#6F6F6F]">{cumulative.percentage.toFixed(1)}%</span>
                            </div>
                          ) : (
                            <span className="text-xs text-[#ABABAB]">Pending</span>
                          )}
                        </div>

                        {/* Position */}
                        <div className="shrink-0 w-16 text-right">
                          {cumulative ? (
                            <span className="text-sm font-semibold text-[#003366]">#{cumulative.position}</span>
                          ) : (
                            <span className="text-xs text-[#ABABAB]">—</span>
                          )}
                        </div>

                        <ChevronRight className="h-4 w-4 text-[#C0C0C0] shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ClassTeacherView;
