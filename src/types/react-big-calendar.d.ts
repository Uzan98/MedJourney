declare module 'react-big-calendar' {
  import { ComponentType } from 'react';
  
  export interface DateLocalizer {
    format: (value: Date, format: string, culture?: string) => string;
    formats: any;
    startOfWeek: (date: Date) => Date;
  }

  export function dateFnsLocalizer(args: {
    format: (date: Date, format: string, options?: any) => string;
    parse: (dateString: string) => Date;
    startOfWeek: (date: Date) => Date;
    getDay: (date: Date) => number;
    locales: Record<string, any>;
  }): DateLocalizer;

  export interface CalendarProps {
    localizer: DateLocalizer;
    events: any[];
    startAccessor: string | ((event: any) => Date);
    endAccessor: string | ((event: any) => Date);
    views?: string[];
    view?: string;
    date?: Date;
    onNavigate?: (date: Date) => void;
    onView?: (view: string) => void;
    onSelectEvent?: (event: any) => void;
    onSelectSlot?: (slotInfo: { start: Date; end?: Date; slots?: Date[] }) => void;
    selectable?: boolean;
    style?: React.CSSProperties;
    messages?: any;
    popup?: boolean;
    formats?: any;
    components?: {
      toolbar?: ComponentType<any>;
      [key: string]: ComponentType<any> | undefined;
    };
    eventPropGetter?: (event: any) => { style?: React.CSSProperties; className?: string };
    dayPropGetter?: (date: Date) => { style?: React.CSSProperties; className?: string };
  }

  const Calendar: React.FC<CalendarProps>;
  export default Calendar;
  export { Calendar };
} 