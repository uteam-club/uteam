"use client"

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { ru } from "date-fns/locale"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  className?: string
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
}

export function DateRangePicker({
  className,
  dateRange,
  onDateRangeChange,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleSelect = (range: DateRange | undefined) => {
    onDateRangeChange(range)
    if (range?.from && range?.to) {
      setIsOpen(false)
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal bg-vista-dark/70 border-vista-secondary/30 text-vista-light",
              !dateRange && "text-vista-light/70"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "dd.MM.yyyy", { locale: ru })} -{" "}
                  {format(dateRange.to, "dd.MM.yyyy", { locale: ru })}
                </>
              ) : (
                format(dateRange.from, "dd.MM.yyyy", { locale: ru })
              )
            ) : (
              <span>Выберите даты</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-vista-dark border-vista-secondary/30 shadow-md" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleSelect}
            numberOfMonths={1}
            locale={ru}
            classNames={{
              day_selected: "bg-vista-primary text-vista-dark font-medium",
              day_today: "bg-vista-secondary/20 text-vista-light font-medium",
              day_range_middle: "bg-vista-primary/20 text-vista-light",
              day_range_end: "bg-vista-primary text-vista-dark font-medium",
              day_range_start: "bg-vista-primary text-vista-dark font-medium",
              day: "h-7 w-7 p-0 font-normal text-vista-light aria-selected:bg-vista-primary aria-selected:text-vista-dark",
              button: "text-vista-light hover:bg-vista-secondary/20",
              caption: "text-vista-light"
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
} 