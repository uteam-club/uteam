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
import { cn } from "@/lib/utils";
const Input = React.forwardRef((_a, ref) => {
    var { className, type } = _a, props = __rest(_a, ["className", "type"]);
    return (<input type={type} className={cn("flex h-10 w-full rounded-md border border-vista-secondary/30 bg-vista-dark px-3 py-2 text-sm text-vista-light placeholder:text-vista-light/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-vista-primary disabled:cursor-not-allowed disabled:opacity-50 shadow-md hover:shadow-lg transition-shadow", className)} ref={ref} {...props}/>);
});
Input.displayName = "Input";
export { Input };
