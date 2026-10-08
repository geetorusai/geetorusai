import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-2 border-black placeholder:text-muted-foreground bg-background flex field-sizing-content min-h-16 min-w-0 w-full max-w-full rounded-none px-3 py-2 text-base shadow-[3px_3px_0px_0px_#000000] transition-all outline-none focus-visible:shadow-[5px_5px_0px_0px_#000000] focus-visible:border-black disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
