import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { parseDateTime } from "@/lib/utils"

interface DateTimePickerProps {
    date: Date | undefined
    setDate: (date: Date | undefined) => void
    placeholder?: string
}

export function DateTimePicker({ date, setDate, placeholder = "DD-MM-YYYY HH:MM:SS" }: DateTimePickerProps) {
    const [open, setOpen] = React.useState(false)
    const [view, setView] = React.useState<"date" | "time">("date")
    const [tempDate, setTempDate] = React.useState<Date | undefined>(date)
    const [inputValue, setInputValue] = React.useState<string>("")

    React.useEffect(() => {
        if (date) {
            setInputValue(format(date, "dd-MM-yyyy HH:mm:ss"))
        } else {
            setInputValue("")
        }
    }, [date])

    React.useEffect(() => {
        if (open) {
            setTempDate(date)
            setView("date")
        }
    }, [open, date])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setInputValue(value)

        const parsedIso = parseDateTime(value)
        if (parsedIso) {
            setDate(new Date(parsedIso))
        } else if (value === "") {
            setDate(undefined)
        }
    }

    const handleDateSelect = (newDate: Date | undefined) => {
        if (!newDate) return

        const d = new Date(newDate)
        // Preserve time if tempDate was already set, otherwise default to 00:00:00
        if (tempDate) {
            d.setHours(tempDate.getHours())
            d.setMinutes(tempDate.getMinutes())
            d.setSeconds(tempDate.getSeconds())
        } else {
            d.setHours(0, 0, 0, 0)
        }

        setTempDate(d)
        // Removed auto-advance: setView("time")
    }

    const handleTimeChange = (type: "hour" | "minute" | "second", value: string) => {
        if (!tempDate) return
        const d = new Date(tempDate)
        if (type === "hour") d.setHours(parseInt(value))
        if (type === "minute") d.setMinutes(parseInt(value))
        if (type === "second") d.setSeconds(parseInt(value))
        setTempDate(d)
    }

    const handleOk = () => {
        setDate(tempDate)
        setOpen(false)
    }

    return (
        <div className="relative">
            <Input
                type="text"
                placeholder={placeholder}
                value={inputValue}
                onChange={handleInputChange}
                className="pr-10"
            />
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    >
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    {view === "date" && (
                        <div className="flex flex-col">
                            <Calendar
                                mode="single"
                                selected={tempDate}
                                onSelect={handleDateSelect}
                                initialFocus
                            />
                            <div className="flex items-center justify-end gap-2 p-3 border-t bg-muted/20">
                                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                                <Button size="sm" onClick={() => setView("time")}>OK</Button>
                            </div>
                        </div>
                    )}
                    {view === "time" && (
                        <div className="flex flex-col w-[280px]">
                            <div className="p-3 border-b text-center font-semibold text-sm">
                                Select Time
                            </div>
                            <div className="flex h-[200px] divide-x">
                                <ScrollArea className="flex-1 h-full">
                                    <div className="flex flex-col gap-1 p-1">
                                        <div className="text-[10px] text-muted-foreground text-center py-1">Hrs</div>
                                        {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")).map((hour) => (
                                            <Button
                                                key={hour}
                                                variant={tempDate && format(tempDate, "HH") === hour ? "default" : "ghost"}
                                                size="sm"
                                                className="h-6 w-full"
                                                onClick={() => handleTimeChange("hour", hour)}
                                            >
                                                {hour}
                                            </Button>
                                        ))}
                                    </div>
                                    <ScrollBar orientation="vertical" className="invisible" />
                                </ScrollArea>
                                <ScrollArea className="flex-1 h-full">
                                    <div className="flex flex-col gap-1 p-1">
                                        <div className="text-[10px] text-muted-foreground text-center py-1">Min</div>
                                        {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0")).map((minute) => (
                                            <Button
                                                key={minute}
                                                variant={tempDate && format(tempDate, "mm") === minute ? "default" : "ghost"}
                                                size="sm"
                                                className="h-6 w-full"
                                                onClick={() => handleTimeChange("minute", minute)}
                                            >
                                                {minute}
                                            </Button>
                                        ))}
                                    </div>
                                    <ScrollBar orientation="vertical" className="invisible" />
                                </ScrollArea>
                                <ScrollArea className="flex-1 h-full">
                                    <div className="flex flex-col gap-1 p-1">
                                        <div className="text-[10px] text-muted-foreground text-center py-1">Sec</div>
                                        {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0")).map((second) => (
                                            <Button
                                                key={second}
                                                variant={tempDate && format(tempDate, "ss") === second ? "default" : "ghost"}
                                                size="sm"
                                                className="h-6 w-full"
                                                onClick={() => handleTimeChange("second", second)}
                                            >
                                                {second}
                                            </Button>
                                        ))}
                                    </div>
                                    <ScrollBar orientation="vertical" className="invisible" />
                                </ScrollArea>
                            </div>
                            <div className="flex items-center justify-between p-3 border-t bg-muted/20">
                                <Button variant="ghost" size="sm" onClick={() => setView("date")}>Back</Button>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                                    <Button size="sm" onClick={handleOk}>OK</Button>
                                </div>
                            </div>
                        </div>
                    )}
                </PopoverContent>
            </Popover>
        </div>
    )
}
