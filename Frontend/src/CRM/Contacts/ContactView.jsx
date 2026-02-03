import React from 'react'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
    SheetClose
} from "@/components/ui/sheet"
import { Button } from '@/components/ui/button'

export default function ContactView({ open, setOpen }) {
    return (
        <Sheet open={!!open} onOpenChange={setOpen}>
            {/* side="right" is the default, but you can be explicit */}
            <SheetContent side="right" className="w-[800px]">
                <SheetHeader>
                    <SheetTitle>Are you absolutely sure?</SheetTitle>
                    <SheetDescription>
                        This action cannot be undone.
                    </SheetDescription>
                </SheetHeader>

                {/* Your content goes here */}
                <div className="py-4">
                    <p>Contact details...</p>
                </div>

                <SheetFooter>
                    <SheetClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </SheetClose>
                    <Button type="submit">Submit</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}