import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function DataTablePagination({
  currentPage,
  pageSize,
  totalData,
  onPageChange,
  onPageSizeChange,
}) {
  const totalPages = Math.ceil(totalData / pageSize);
  const startItem = totalData === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalData);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-4 sm:px-6 border-t border-slate-100 dark:border-slate-800 font-sans">
      <div className="flex items-center justify-between w-full sm:w-auto gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 font-medium font-sans">
          <span>Tampilkan:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="w-[70px] h-9 border-none bg-slate-50 dark:bg-slate-800 font-bold focus:ring-0 text-slate-700 dark:text-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400 font-bold hidden sm:block">
          Ditampilkan {startItem} - {endItem} dari {totalData} data
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-transparent group px-2"
          onClick={() => {
            if (currentPage > 1 && totalData !== 0) onPageChange(currentPage - 1);
          }}
        >
          <ArrowLeft className="w-5 h-5 sm:mr-2 text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" strokeWidth={2.5} />
          <span className="text-slate-500 dark:text-slate-400 font-bold text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors hidden sm:inline">Sebelumnya</span>
        </Button>
        
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-sm shrink-0">
          {currentPage}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-transparent group px-2"
          onClick={() => {
            if (currentPage < totalPages && totalData !== 0) onPageChange(currentPage + 1);
          }}
        >
          <span className="text-slate-500 dark:text-slate-400 font-bold text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors hidden sm:inline">Selanjutnya</span>
          <ArrowRight className="w-5 h-5 sm:ml-2 text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" strokeWidth={2.5} />
        </Button>
      </div>
    </div>
  );
}
