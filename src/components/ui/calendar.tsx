"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ptBR } from "date-fns/locale"
import "react-day-picker/dist/style.css"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  className?: string;
  classNames?: Record<string, string>;
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <div className="p-3">
      <style jsx global>{`
        .rdp {
          --rdp-cell-size: 40px;
          --rdp-accent-color: #4f46e5;
          --rdp-background-color: #e0e7ff;
          --rdp-accent-color-dark: #3730a3;
          --rdp-background-color-dark: #c7d2fe;
          --rdp-outline: 2px solid var(--rdp-accent-color);
          --rdp-outline-selected: 2px solid var(--rdp-accent-color);
          margin: 0;
        }
        
        .rdp-months {
          justify-content: center;
        }
        
        .rdp-month {
          background-color: white;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .rdp-caption {
          padding: 0 0 16px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 8px;
        }
        
        .rdp-caption_label {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          text-transform: capitalize;
        }
        
        .rdp-nav {
          display: flex;
          gap: 4px;
        }
        
        .rdp-nav_button {
          width: 30px;
          height: 30px;
          padding: 0;
          border-radius: 4px;
          background-color: #f8fafc;
          color: #64748b;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .rdp-nav_button:hover {
          background-color: #f1f5f9;
          color: #334155;
          border-color: #cbd5e1;
        }
        
        .rdp-head_cell {
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          height: 36px;
        }
        
        .rdp-cell {
          height: var(--rdp-cell-size);
          width: var(--rdp-cell-size);
          font-size: 0.875rem;
        }
        
        .rdp-day {
          width: 36px;
          height: 36px;
          margin: 2px;
          border-radius: 50%;
          transition: all 0.2s;
        }
        
        .rdp-day:hover:not(.rdp-day_selected):not(.rdp-day_disabled) {
          background-color: #f1f5f9;
          color: #1e293b;
        }
        
        .rdp-day_selected {
          background-color: var(--rdp-accent-color);
          color: white;
          font-weight: 500;
        }
        
        .rdp-day_selected:hover {
          background-color: var(--rdp-accent-color-dark);
          color: white;
        }
        
        .rdp-day_today {
          border: 1px solid var(--rdp-accent-color);
          font-weight: 600;
        }
        
        .rdp-day_outside {
          color: #cbd5e1;
          opacity: 0.6;
        }
        
        .rdp-day_disabled {
          color: #cbd5e1;
          opacity: 0.4;
        }
      `}</style>
      <DayPicker
        locale={ptBR}
        showOutsideDays={showOutsideDays}
        className={className}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent",
          day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-gray-100",
          day_selected: "bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white focus:bg-indigo-700 focus:text-white",
          day_today: "border border-indigo-500 text-indigo-800 font-medium",
          day_outside: "text-gray-400 opacity-50",
          day_disabled: "text-gray-400 opacity-50",
          day_range_middle: "aria-selected:bg-indigo-100 aria-selected:text-indigo-900",
          day_hidden: "invisible",
          ...classNames,
        }}
        {...props}
      />
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
