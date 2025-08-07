import React, { useState } from 'react';
import { Button, Textarea, LoadingSpinner, ErrorMessage } from '@/components/ui';
import { useCaseNotes, useAddCaseNote } from '@/hooks/useCases';
import { formatDate } from '@/utils/formatting';

interface NotesSectionProps {
  caseId: string;
}

const NotesSection: React.FC<NotesSectionProps> = ({ caseId }) => {
  const [newNote, setNewNote] = useState('');
  const { data: notes, isLoading, error } = useCaseNotes(caseId);
  const addNoteMutation = useAddCaseNote();

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
      {/* Error state */}
      {error && (
        <ErrorMessage message="Unable to load case notes" />
      )}

      {/* Existing notes */}
      <div className="space-y-3">
        {!notes || notes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No notes yet</p>
          </div>
        ) : (
          notes.map((note) => (
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