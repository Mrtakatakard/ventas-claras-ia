import * as React from "react"
import PhoneInput from "react-phone-number-input"
import "react-phone-number-input/style.css"
import { cn } from "@/lib/utils"

export interface PhoneInputProps extends React.ComponentProps<typeof PhoneInput> {
    className?: string
}

export const PhoneInputComponent = React.forwardRef<any, PhoneInputProps>(
    ({ className, onChange, ...props }, ref) => {
        return (
            <PhoneInput
                ref={ref}
                defaultCountry="DO"
                labels={{ DO: "República Dominicana" }}
                international
                className={cn("flex", className)}
                numberInputProps={{
                    className: cn(
                        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    ),
                }}
                onChange={onChange}
                {...props}
            />
        )
    }
)
PhoneInputComponent.displayName = "PhoneInput"
