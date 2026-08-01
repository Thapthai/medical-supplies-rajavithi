import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export default function Pagination({ currentPage, totalPages, onPageChange, loading = false }: PaginationProps) {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7; // Maximum number of page buttons to show

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) {
    return null; // Don't show pagination if only one page
  }

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
      <div className="flex justify-between flex-1 sm:hidden">
        {/* Mobile view */}
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || loading}
          variant="outline"
          size="sm"
        >
          ก่อนหน้า
        </Button>
        <span className="flex items-center text-sm text-gray-700">
          หน้า {currentPage.toLocaleString()} จาก {totalPages.toLocaleString()}
        </span>
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || loading}
          variant="outline"
          size="sm"
        >
          ถัดไป
        </Button>
      </div>

      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        {/* Desktop view */}
        <div>
          <p className="text-sm text-gray-700">
            แสดงหน้า <span className="font-medium">{currentPage.toLocaleString()}</span> จาก{' '}
            <span className="font-medium">{totalPages.toLocaleString()}</span> หน้า
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* First page button */}
          <Button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1 || loading}
            variant="outline"
            size="icon"
            className="h-9 w-9"
            title="หน้าแรก"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous page button */}
          <Button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            variant="outline"
            size="icon"
            className="h-9 w-9"
            title="ก่อนหน้า"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page number buttons */}
          <div className="flex space-x-1">
            {pageNumbers.map((page, index) => {
              if (page === '...') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="flex items-center justify-center h-9 w-9 text-gray-500"
                  >
                    ...
                  </span>
                );
              }

              const pageNum = page as number;
              const isActive = pageNum === currentPage;

              return (
                <Button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  disabled={loading}
                  variant={isActive ? 'default' : 'outline'}
                  size="icon"
                  className={`h-9 min-w-[2.25rem] ${
                    isActive
                      ? 'bg-pink-600 hover:bg-pink-700 text-white'
                      : 'hover:bg-pink-50'
                  }`}
                >
                  {pageNum.toLocaleString()}
                </Button>
              );
            })}
          </div>

          {/* Next page button */}
          <Button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            variant="outline"
            size="icon"
            className="h-9 w-9"
            title="ถัดไป"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last page button */}
          <Button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages || loading}
            variant="outline"
            size="icon"
            className="h-9 w-9"
            title="หน้าสุดท้าย"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

