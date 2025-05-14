"use client"

import * as React from "react"

// Stub simples para o componente Calendar
export type CalendarProps = any;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <div className="p-3 calendar-stub">
      <div className="text-center p-4 bg-gray-100 rounded-md">
        Calendário (stub)
      </div>
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }