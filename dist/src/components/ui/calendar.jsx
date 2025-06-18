"use client";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
function Calendar(_a) {
    var { className, classNames, showOutsideDays = true } = _a, props = __rest(_a, ["className", "classNames", "showOutsideDays"]);
    return (<DayPicker showOutsideDays={showOutsideDays} className={cn("p-2 text-sm", className)} classNames={Object.assign({ months: "flex flex-col sm:flex-row space-y-2 sm:space-x-2 sm:space-y-0", month: "space-y-2", caption: "flex justify-center pt-1 relative items-center", caption_label: "text-sm font-medium text-vista-light", nav: "space-x-1 flex items-center", nav_button: cn(buttonVariants({ variant: "outline" }), "h-6 w-6 bg-transparent p-0 opacity-60 hover:opacity-100 border-vista-secondary/30 text-vista-light"), nav_button_previous: "absolute left-1", nav_button_next: "absolute right-1", table: "w-full border-collapse space-y-1", head_row: "flex", head_cell: "text-vista-light/60 rounded-md w-8 font-normal text-[0.7rem]", row: "flex w-full mt-1", cell: "h-7 w-7 text-center text-xs p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-vista-dark/30 [&:has([aria-selected])]:bg-vista-primary/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20", day: cn(buttonVariants({ variant: "ghost" }), "h-7 w-7 p-0 font-normal text-xs aria-selected:opacity-100"), day_range_end: "day-range-end", day_selected: "bg-vista-primary text-vista-dark hover:bg-vista-primary hover:text-vista-dark focus:bg-vista-primary focus:text-vista-dark", day_today: "bg-vista-secondary/20 text-vista-light font-medium", day_outside: "day-outside text-vista-light/40 opacity-50 aria-selected:bg-vista-dark/30 aria-selected:text-vista-light/50 aria-selected:opacity-30", day_disabled: "text-vista-light/30", day_range_middle: "aria-selected:bg-vista-primary/15 aria-selected:text-vista-light", day_hidden: "invisible" }, classNames)} components={{
            Chevron: (props) => props.orientation === "right" ? (<ChevronRight className="h-3.5 w-3.5"/>) : (<ChevronLeft className="h-3.5 w-3.5"/>)
        }} {...props}/>);
}
Calendar.displayName = "Calendar";
export { Calendar };
