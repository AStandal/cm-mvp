import React, { useState } from 'react';
import { Button, Textarea, LoadingSpinner, ErrorMessage } from '@/components/ui';
import { useCaseNotes, useAddCaseNote } from '@/hooks/useCases';
import { formatDate } from '@/utils/formatting';

interface NotesSectionProps {
  caseId: string;
}

// Mock data for testing when API is unavailable
const getMockNotes = (caseId: string) => [
  {
    id: `mock-note-1-${caseId}`,
    content: `This is a mock note for case ${caseId}. The application appears to be progressing well, but additional documentation may be required.`,
    createdBy: 'John Doe',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: `mock-note-2-${caseId}`,
    content: `Another mock note showing how multiple notes will be displayed in chronological order. This helps track the case progression.`,
    createdBy: 'Jane Smith',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  }
];

const NotesSection: React.FC<NotesSectionProps> = ({ caseId }) => {
  const [newNote, setNewNote] = useState('');
  const { data: notes, isLoading, error } = useCaseNotes(caseId);
  const addNoteMutation = useAddCaseNote();

  // Use mock data if API is unavailable
  const displayNotes = notes || getMockNotes(caseId);
  const isUsingMock = !notes;

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNoteMutation.mutate({ id: caseId, content: newNote.trim() });
      setNewNote('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleAddNote();
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <LoadingSpinner />
          <p className="mt-2 text-sm text-gray-600">Loading case notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status indicator */}
      {isUsingMock && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-sm text-orange-800">
            Mock notes displayed (API unavailable)
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !isUsingMock && (
        <ErrorMessage message="Unable to load case notes" />
      )}

      {/* Existing notes */}
      <div className="space-y-3">
        {displayNotes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No notes yet</p>
          </div>
        ) : (
          displayNotes.map((note) => (
            <div key={note.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    {note.content}
                  </p>
                  <div className="mt-2 text-xs text-gray-500">
                    Added by {note.createdBy} • {formatDate(note.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add note form */}
      <div className="border-t border-gray-200 pt-4">
        <div className="space-y-3">
          <Textarea
            placeholder="Add a note to this case..."
            rows={3}
            className="w-full"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={addNoteMutation.isPending}
          />
          <div className="flex justify-end">
            <Button 
              variant="primary" 
              size="sm"
              onClick={handleAddNote}
              disabled={!newNote.trim() || addNoteMutation.isPending}
            >
              {addNoteMutation.isPending ? 'Adding...' : 'Add Note'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesSection;