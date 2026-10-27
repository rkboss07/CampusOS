import React, { useState } from 'react';
import { BookOpen, FileText, Calendar, Clock, AlertCircle, Plus, CheckCircle2 } from 'lucide-react';
import { Notice } from '../types';

interface Subject {
  id: string;
  code: string;
  name: string;
  instructor: string;
  credits: number;
  progressPercent: number;
  upcomingTest?: string;
  assignmentsDue?: number;
  syllabusTopics: string[];
}

interface SubjectsViewProps {
  notices: Notice[];
  onSelectNotice: (notice: Notice) => void;
}

export const SubjectsView: React.FC<SubjectsViewProps> = ({
  notices,
  onSelectNotice,
}) => {
  const [subjects] = useState<Subject[]>([
    {
      id: 'sub-dbms',
      code: 'CS-204',
      name: 'Database Management Systems',
      instructor: 'Dr. V. K. Verma',
      credits: 4,
      progressPercent: 65,
      upcomingTest: 'Mid-Term Exam (2nd Week Sept)',
      assignmentsDue: 1,
      syllabusTopics: ['Relational Model', 'ER Diagrams', 'Normalization (1NF, 2NF, 3NF, BCNF)', 'SQL Triggers & Transactions', 'Concurrency Control']
    },
    {
      id: 'sub-aiml',
      code: 'AI-201',
      name: 'Artificial Intelligence & Machine Learning',
      instructor: 'Prof. Ananya Sen',
      credits: 4,
      progressPercent: 70,
      upcomingTest: 'Lab Viva on Search Algorithms',
      assignmentsDue: 0,
      syllabusTopics: ['Heuristic Search (A*, Minimax)', 'Knowledge Representation', 'Decision Trees', 'Neural Networks Basics', 'Computer Vision Foundations']
    },
    {
      id: 'sub-dsa',
      code: 'CS-202',
      name: 'Data Structures & Algorithms',
      instructor: 'Prof. Rajesh Gupta',
      credits: 4,
      progressPercent: 80,
      syllabusTopics: ['Balanced Trees (AVL, Red-Black)', 'Graph Traversal (BFS, DFS)', 'Dynamic Programming', 'Greedy Algorithms']
    },
    {
      id: 'sub-coa',
      code: 'CS-203',
      name: 'Computer Organization & Architecture',
      instructor: 'Dr. Meenakshi Sharma',
      credits: 3,
      progressPercent: 55,
      syllabusTopics: ['Instruction Set Architecture', 'Pipelining & Hazards', 'Cache Memory Hierarchy', 'Virtual Memory']
    },
    {
      id: 'sub-math',
      code: 'MA-201',
      name: 'Discrete Mathematical Structures',
      instructor: 'Dr. P. C. Roy',
      credits: 4,
      progressPercent: 60,
      syllabusTopics: ['Propositional Logic', 'Graph Theory', 'Combinatorics & Recurrence', 'Algebraic Structures']
    }
  ]);

  const [selectedSubject, setSelectedSubject] = useState<Subject>(subjects[0]);

  // Find linked notices
  const linkedNotices = notices.filter(n => 
    n.rawContent.toLowerCase().includes(selectedSubject.code.toLowerCase()) ||
    n.rawContent.toLowerCase().includes(selectedSubject.name.toLowerCase().split(' ')[0].toLowerCase()) ||
    (selectedSubject.code === 'CS-204' && n.id.includes('dbms')) ||
    (selectedSubject.code === 'AI-201' && n.category === 'Workshop / Event')
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-[#171922] p-5 rounded-xl border border-[#262936] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Academic Subjects & Syllabi</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Courses linked with university circulars, assignments, and exam notifications.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded bg-[#202330] text-indigo-300 border border-indigo-500/30 font-medium">
          Semester 3 (Odd 2026)
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Subject List */}
        <div className="lg:col-span-5 space-y-2.5">
          {subjects.map((sub) => {
            const isSelected = selectedSubject.id === sub.id;
            return (
              <div
                key={sub.id}
                onClick={() => setSelectedSubject(sub)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected 
                    ? 'bg-[#1e2232] border-indigo-500 shadow-md ring-1 ring-indigo-500/40' 
                    : 'bg-[#171922] border-[#262936] hover:border-[#383f56] hover:bg-[#1a1d28]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      {sub.code} • {sub.credits} Credits
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1.5">{sub.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{sub.instructor}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                    <span>Syllabus Coverage</span>
                    <span className="font-semibold text-gray-200">{sub.progressPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#252838] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full" 
                      style={{ width: `${sub.progressPercent}%` }} 
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Subject Detail & Linked Circulars */}
        <div className="lg:col-span-7 bg-[#171922] p-5 rounded-xl border border-[#262936] space-y-5">
          <div className="border-b border-[#262936] pb-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-indigo-400 font-semibold">{selectedSubject.code}</span>
              <h3 className="text-base font-bold text-white">{selectedSubject.name}</h3>
              <p className="text-xs text-gray-400">Faculty: {selectedSubject.instructor}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400">Target Internal Marks:</span>
              <p className="text-sm font-bold text-emerald-400">28 / 30</p>
            </div>
          </div>

          {/* Linked Notices from University/Department */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Notices & Assignments Linked to this Course</span>
            </h4>

            {linkedNotices.length > 0 ? (
              linkedNotices.map((n) => (
                <div
                  key={n.id}
                  onClick={() => onSelectNotice(n)}
                  className="p-3 rounded-lg bg-[#1f2230] border border-[#2a2e40] hover:border-indigo-500/50 cursor-pointer transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {n.priorityScore}/100 • {n.priorityLevel}
                    </span>
                    <span className="text-[11px] text-rose-400 font-semibold">
                      Due: {n.deadline}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-white">{n.title}</p>
                  <p className="text-[11px] text-gray-300">Action: {n.requiredAction}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 italic p-3 bg-[#1b1e28] rounded-lg">
                No pending assignment or exam notices flagged for this specific course.
              </p>
            )}
          </div>

          {/* Syllabus Outline */}
          <div className="space-y-2 pt-2 border-t border-[#262936]">
            <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
              Course Syllabus Highlights
            </h4>
            <div className="space-y-1.5">
              {selectedSubject.syllabusTopics.map((topic, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-300 bg-[#1b1e28] p-2 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{topic}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
