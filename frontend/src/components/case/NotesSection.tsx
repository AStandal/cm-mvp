import React from 'react';
import { Button, Textarea } from '@/components/ui';

interface NotesSectionProps {
  caseId: string;
}

const NotesSection: React.FC<NotesSectionProps> = ({ caseId }) => {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Notes section will be implemented in future tasks (Case: {caseId})
      </p>

      {/* Placeholder for existing notes */}
      <div className="space-y-3">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-900">
                This is a placeholder note. Case notes will be displayed here with timestamps and user information.
              </p>
              <div className="mt-2 text-xs text-gray-500">
                Added by User Name • 2 hours ago
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-900">
                Another placeholder note showing how multiple notes will be displayed in chronological order.
              </p>
              <div className="mt-2 text-xs text-gray-500">
                Added by Another User • 1 day ago
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder for add note form */}
      <div className="border-t border-gray-200 pt-4">
        <div className="space-y-3">
          <Textarea
            placeholder="Add a note to this case..."
            rows={3}
            className="w-full"
          />
          <div className="flex justify-end">
            <Button variant="primary" size="sm">
              Add Note
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesSection;