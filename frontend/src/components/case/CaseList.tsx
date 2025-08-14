import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCases } from '@/hooks/useCases';
import { CaseStatus } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import LoadingState from '@/components/ui/LoadingState';
import ErrorMessage from '@/components/ui/ErrorMessage';
import CaseListItem from './CaseListItem';
import React from 'react';

// Sort field options
const sortFields = [
  { value: 'applicantName', label: 'Applicant Name' },
  { value: 'applicationType', label: 'Application Type' },
  { value: 'status', label: 'Status' },
  { value: 'currentStep', label: 'Current Step' },
  { value: 'submissionDate', label: 'Submission Date' },
  { value: 'updatedAt', label: 'Last Updated' },
  { value: 'documentCount', label: 'Document Count' },
  { value: 'noteCount', label: 'Note Count' },
];

// Skeleton component for loading states
const CaseListSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="animate-slide-up"
        style={{
          animationDelay: `${index * 100}ms`,
          animationFillMode: 'both'
        }}
      >
        <Card className="animate-pulse p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-6 bg-gray-200 rounded w-16"></div>
              <div className="h-6 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        </Card>
      </div>
    ))}
  </div>
);

const CaseList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CaseStatus | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showSearch, setShowSearch] = useState(false);

  const { data, isLoading, error, refetch } = useCases({
    status: statusFilter || undefined,
    search: searchTerm || undefined,
    sortField: sortField,
    sortDirection: sortDirection,
    page: currentPage,
    limit: itemsPerPage,
  });



  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as CaseStatus | '');
    setCurrentPage(1);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = parseInt(e.target.value);
    setItemsPerPage(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top of the list for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoToPage = (pageInput: string) => {
    const page = parseInt(pageInput);
    if (page >= 1 && page <= totalPages) {
      handlePageChange(page);
    }
  };

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Remove client-side filtering and sorting - now handled by backend
  const totalPages = data ? Math.ceil(data.total / itemsPerPage) : 0;

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, itemsPerPage, sortField, sortDirection]);

  // Debounced search effect
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== undefined) {
        setCurrentPage(1);
        refetch();
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [searchTerm, refetch]);

  // Validate current page when total pages change
  React.useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Keyboard shortcuts for pagination
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't handle shortcuts when typing in inputs
      }
      
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        e.preventDefault();
        handlePageChange(currentPage - 1);
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        e.preventDefault();
        handlePageChange(currentPage + 1);
      } else if (e.key === 'Home' && currentPage !== 1) {
        e.preventDefault();
        handlePageChange(1);
      } else if (e.key === 'End' && currentPage !== totalPages) {
        e.preventDefault();
        handlePageChange(totalPages);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);



  // Show error if there is one
  if (error) {
    return (
      <ErrorMessage 
        message={`Failed to load cases: ${error.message}`}
        onRetry={() => refetch()}
      />
    );
  }

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: CaseStatus.ACTIVE, label: 'Active' },
    { value: CaseStatus.PENDING, label: 'Pending' },
    { value: CaseStatus.APPROVED, label: 'Approved' },
    { value: CaseStatus.DENIED, label: 'Denied' },
    { value: CaseStatus.WITHDRAWN, label: 'Withdrawn' },
    { value: CaseStatus.ARCHIVED, label: 'Archived' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cases</h1>
          <p className="text-gray-600 mt-2">
            Manage and review all cases in the system
          </p>
        </div>
        <Link to="/cases/new">
          <Button variant="primary" className="transition-all duration-200 hover:scale-105">
            Create New Case
          </Button>
        </Link>
      </div>

      {/* Search & Sort Toggle Button */}
      <div className="flex justify-center items-center space-x-4">
        <Button
          variant="secondary"
          onClick={() => setShowSearch(!showSearch)}
          className="flex items-center space-x-2 transition-all duration-200 hover:scale-105"
        >
          {showSearch ? (
            <>
              <span>Hide Search, Filters & Sort</span>
              <span>↑</span>
            </>
          ) : (
            <>
              <span>Search, Filters & Sort</span>
              <span>↓</span>
            </>
          )}
        </Button>
        
        {/* Active filters indicator */}
        {(searchTerm || statusFilter || sortField !== 'updatedAt') && !showSearch && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 animate-fade-in">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span>Active filters & sorting</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setSortField('updatedAt');
                setSortDirection('desc');
                setCurrentPage(1);
              }}
              className="text-xs px-2 py-1 transition-all duration-200 hover:scale-105"
            >
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Filters, Search & Sorting - Collapsible */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          showSearch ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className={`transform transition-transform duration-300 ease-in-out ${
          showSearch ? 'translate-y-0' : '-translate-y-4'
        }`}>
          <div className="space-y-4">
            {/* Search and Filters */}
            <Card>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                      Search Cases
                    </label>
                    <Input
                      id="search"
                      type="text"
                      placeholder="Search by name, type, or ID..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1); // Reset to first page when searching
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Status Filter
                    </label>
                    <Select
                      id="status"
                      value={statusFilter}
                      onChange={handleStatusFilterChange}
                      options={statusOptions}
                    />
                  </div>
                  <div className="flex items-end">
                    {(searchTerm || statusFilter) ? (
                      <Button 
                        variant="secondary" 
                        className="w-full transition-all duration-200 hover:scale-105"
                        onClick={() => {
                          setSearchTerm('');
                          setStatusFilter('');
                          setCurrentPage(1);
                        }}
                      >
                        Clear Filters
                      </Button>
                    ) : (
                      <div className="w-full text-center text-sm text-gray-500 py-2">
                        Search automatically as you type
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Sorting Controls */}
            <Card>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Sort Cases</h3>
                  <p className="text-sm text-gray-600">Click any criteria to sort. Click again to reverse order.</p>
                </div>
              </div>
              
              {/* Sort Criteria Buttons */}
              <div className="mt-4 flex flex-wrap gap-2 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {sortFields.map((field) => {
                    const isActive = sortField === field.value;
                    const isAscending = isActive && sortDirection === 'asc';
                    
                    return (
                      <Button
                        key={field.value}
                        variant={isActive ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => {
                          if (isActive) {
                            // If already active, toggle direction
                            handleSortChange(field.value, sortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            // If not active, set as active with default direction (desc for most fields, asc for names)
                            const defaultDirection = field.value === 'applicantName' ? 'asc' : 'desc';
                            handleSortChange(field.value, defaultDirection);
                          }
                        }}
                        className={`flex items-center justify-between transition-all duration-200 ${
                          isActive ? 'ring-2 ring-blue-500 scale-105' : 'hover:scale-102'
                        }`}
                        title={`Sort by ${field.label}${isActive ? ` (${sortDirection === 'asc' ? 'A-Z' : 'Z-A'})` : ''}`}
                      >
                        <span className="truncate">{field.label}</span>
                        {isActive && (
                          <span className="ml-2 text-sm">
                            {isAscending ? '↑' : '↓'}
                          </span>
                        )}
                      </Button>
                    );
                  })}
                </div>
                
                {/* Reset to Default Button */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSortChange('updatedAt', 'desc')}
                  className="text-xs transition-all duration-200 hover:scale-105 flex-shrink-0"
                  title="Reset to default sorting"
                  aria-label="Reset to default sorting"
                >
                  Reset
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
        <div className="space-y-1">
          <LoadingState 
            isLoading={isLoading} 
            variant="dots"
            className="flex items-center space-x-2"
          >
            <p className="text-sm text-gray-600">
              Showing {data?.cases.length} of {data?.total || 0} cases
              {sortField !== 'updatedAt' && (
                <span className="ml-2 text-gray-500">
                  • Sorted by {sortFields.find(f => f.value === sortField)?.label} ({sortDirection === 'asc' ? 'A-Z' : 'Z-A'})
                </span>
              )}
            </p>
          </LoadingState>
          {(searchTerm || statusFilter) && (
            <p className="text-xs text-gray-500">
              Filters: {searchTerm && `Search: "${searchTerm}"`} {searchTerm && statusFilter && '•'} {statusFilter && `Status: ${statusOptions.find(s => s.value === statusFilter)?.label}`}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {/* Page size selector */}
          <div className="flex items-center space-x-2">
            <label htmlFor="pageSize" className="text-sm text-gray-600">
              Show:
            </label>
            <Select
              id="pageSize"
              value={itemsPerPage.toString()}
              onChange={handlePageSizeChange}
              options={[
                { value: '5', label: '5' },
                { value: '10', label: '10' },
                { value: '20', label: '20' },
                { value: '50', label: '50' },
              ]}
              className="w-16 transition-all duration-200 hover:scale-105"
            />
          </div>
          
          {/* Page info */}
          {data && data.total > itemsPerPage && (
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
          )}
        </div>
      </div>

      {/* Cases List */}
      <LoadingState 
        isLoading={isLoading} 
        fallback={<CaseListSkeleton count={itemsPerPage} />}
      >
                {data?.cases.length === 0 ? (
          <div className="animate-fade-in">
            <Card className="text-center py-12">
              <div className="text-gray-500">
                <p className="text-lg font-medium mb-2">No cases found</p>
                <p className="text-sm">
                  {searchTerm || statusFilter 
                    ? 'Try adjusting your search criteria or filters'
                    : 'No cases have been created yet'
                  }
                </p>
                {!searchTerm && !statusFilter && (
                  <Link to="/cases/new" className="inline-block mt-4">
                    <Button variant="primary" className="transition-all duration-200 hover:scale-105">Create Your First Case</Button>
                  </Link>
                )}

              </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-2">
            {data?.cases.map((caseData, index) => (
              <div
                key={caseData.id}
                className="animate-slide-up"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'both'
                }}
              >
                <CaseListItem caseData={caseData} />
              </div>
            ))}
          </div>
        )}
      </LoadingState>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <LoadingSpinner size="sm" />
              <span>Loading...</span>
            </div>
          )}
          
          {/* Keyboard shortcuts info */}
          <div className="text-xs text-gray-500 text-center sm:text-left">
            <span className="hidden sm:inline">Keyboard shortcuts: </span>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">←</kbd> Previous, 
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">→</kbd> Next, 
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Home</kbd> First, 
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">End</kbd> Last
          </div>
          
          {/* Page navigation */}
          <div className="flex items-center space-x-2" role="navigation" aria-label="Pagination">
            {/* First page button */}
            <Button
              variant="secondary"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1 || isLoading}
              size="sm"
              className="px-2 transition-all duration-200 hover:scale-105"
              title="Go to first page"
              aria-label="Go to first page"
            >
              «
            </Button>
            
            <Button
              variant="secondary"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || isLoading}
              size="sm"
              className="transition-all duration-200 hover:scale-105"
              aria-label="Go to previous page"
            >
              Previous
            </Button>
            
            {/* Smart pagination with ellipsis */}
            <div className="flex items-center space-x-1" role="group" aria-label="Page numbers">
              {(() => {
                const pages = [];
                const maxVisiblePages = 7; // Show max 7 page numbers
                
                if (totalPages <= maxVisiblePages) {
                  // If total pages is small, show all pages
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(
                      <Button
                        key={i}
                        variant={currentPage === i ? 'primary' : 'secondary'}
                        onClick={() => handlePageChange(i)}
                        className="w-8 h-8 p-0 text-sm transition-all duration-200 hover:scale-105"
                        size="sm"
                        disabled={isLoading}
                        aria-label={`Go to page ${i}`}
                        aria-current={currentPage === i ? 'page' : undefined}
                      >
                        {i}
                      </Button>
                    );
                  }
                } else {
                  // Smart pagination for large numbers
                  const leftBound = Math.max(1, currentPage - 2);
                  const rightBound = Math.min(totalPages, currentPage + 2);
                  
                  // Always show first page
                  if (leftBound > 1) {
                    pages.push(
                      <Button
                        key={1}
                        variant="secondary"
                        onClick={() => handlePageChange(1)}
                        className="w-8 h-8 p-0 text-sm"
                        size="sm"
                        disabled={isLoading}
                        aria-label="Go to page 1"
                      >
                        1
                      </Button>
                    );
                    
                    // Add ellipsis if there's a gap
                    if (leftBound > 2) {
                      pages.push(
                        <span key="ellipsis-left" className="flex items-center px-2 text-gray-500 text-sm font-medium" aria-hidden="true">
                          ⋯
                        </span>
                      );
                    }
                  }
                  
                  // Show pages around current page
                  for (let i = leftBound; i <= rightBound; i++) {
                    pages.push(
                      <Button
                        key={i}
                        variant={currentPage === i ? 'primary' : 'secondary'}
                        onClick={() => handlePageChange(i)}
                        className="w-8 h-8 p-0 text-sm transition-all duration-200 hover:scale-105"
                        size="sm"
                        disabled={isLoading}
                        aria-label={`Go to page ${i}`}
                        aria-current={currentPage === i ? 'page' : undefined}
                      >
                        {i}
                      </Button>
                    );
                  }
                  
                  // Add ellipsis if there's a gap
                  if (rightBound < totalPages - 1) {
                    pages.push(
                      <span key="ellipsis-right" className="flex items-center px-2 text-gray-500 text-sm font-medium" aria-hidden="true">
                        ⋯
                      </span>
                    );
                  }
                  
                  // Always show last page
                  if (rightBound < totalPages) {
                    pages.push(
                      <Button
                        key={totalPages}
                        variant="secondary"
                        onClick={() => handlePageChange(totalPages)}
                        className="w-8 h-8 p-0 text-sm"
                        size="sm"
                        disabled={isLoading}
                        aria-label={`Go to page ${totalPages}`}
                      >
                        {totalPages}
                      </Button>
                    );
                  }
                }
                
                return pages;
              })()}
            </div>
            
            <Button
              variant="secondary"
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || isLoading}
              size="sm"
              className="transition-all duration-200 hover:scale-105"
              aria-label="Go to next page"
            >
              Next
            </Button>
            
            {/* Last page button */}
            <Button
              variant="secondary"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages || isLoading}
              size="sm"
              className="px-2 transition-all duration-200 hover:scale-105"
              title="Go to last page"
              aria-label="Go to last page"
            >
              »
            </Button>
          </div>
          
          {/* Go to page input for large datasets */}
          {totalPages > 10 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Go to:</span>
              <Input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => handleGoToPage(e.target.value)}
                className="w-16 h-8 text-sm text-center transition-all duration-200 hover:scale-105 focus:scale-105"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const target = e.target as HTMLInputElement;
                    handleGoToPage(target.value);
                  }
                }}
                onBlur={(e) => {
                  // Validate and correct the input value on blur
                  const page = parseInt(e.target.value);
                  if (page < 1) {
                    e.target.value = '1';
                    handlePageChange(1);
                  } else if (page > totalPages) {
                    e.target.value = totalPages.toString();
                    handlePageChange(totalPages);
                  }
                }}
              />
              <span className="text-sm text-gray-600">of {totalPages}</span>
            </div>
          )}
          
          {/* Page info for mobile */}
          <div className="sm:hidden text-sm text-gray-600 text-center">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseList;
