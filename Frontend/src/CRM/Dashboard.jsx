import React, { useState } from "react";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../components/ui/dialog";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

import { toast } from "sonner";

export default function CrmTest() {
    const [name, setName] = useState("EIFFAGE Construction");

    return (
        <div className="p-6 bg-background space-y-6">
            {/* Header row */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">shadcn UI Test</h1>
                    <p className="text-sm text-muted-foreground">
                        If this looks clean in both light/dark, you’re set.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={() =>
                            toast.message("Toast works", {
                                description: "This confirms providers + styles are OK.",
                            })
                        }
                    >
                        Show toast
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">Quick actions</Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Company</DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                onClick={() =>
                                    toast.info("Action", {
                                        description: "Create opportunity",
                                    })
                                }
                            >
                                Create opportunity
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={() =>
                                    toast("Attach file", {
                                        description: "Action",
                                    })
                                }
                            >
                                Attach file
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                    toast.error("Danger", {
                                        description: "Archived",
                                    })
                                }
                            >
                                Archive
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <Separator />

            {/* Card + badges + input */}
            <Card>
                <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                        <CardTitle className="text-lg">Company summary</CardTitle>
                        <div className="flex gap-2">
                            <Badge>Prospect</Badge>
                            <Badge variant="secondary">Target</Badge>
                            <Badge variant="outline">Risk: Medium</Badge>
                        </div>
                    </div>
                    <CardDescription>Check spacing, typography, and muted text color.</CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Company name</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Company name"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="default"
                            onClick={() => toast.success("Saved", { description: `Company: ${name}` })}
                        >
                            Save
                        </Button>
                        <Button variant="secondary" onClick={() => toast("Secondary clicked")}>
                            Secondary
                        </Button>
                        <Button variant="outline" onClick={() => toast.info("Outline clicked")}>
                            Outline
                        </Button>
                        <Button variant="ghost" onClick={() => toast("Ghost clicked")}>
                            Ghost
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => toast.warning("Destructive action", { description: "This is only a test." })}
                        >
                            Destructive
                        </Button>
                    </div>
                </CardContent>

                <CardFooter className="justify-between">
                    <span className="text-sm text-muted-foreground">Footer text</span>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline">Open dialog</Button>
                        </DialogTrigger>

                        <DialogContent className="sm:max-w-[480px]">
                            <DialogHeader>
                                <DialogTitle>Create company</DialogTitle>
                                <DialogDescription>
                                    Verify overlay, focus trapping, spacing, and button styles.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-3">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Name</label>
                                    <Input placeholder="EIFFAGE..." />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">City</label>
                                    <Input placeholder="Nantes" />
                                </div>
                            </div>

                            <DialogFooter className="gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => toast("Cancel clicked")}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() =>
                                        toast.promise(
                                            new Promise((resolve) => setTimeout(resolve, 1200)),
                                            {
                                                loading: "Saving...",
                                                success: "Saved",
                                                error: "Error",
                                            }
                                        )
                                    }
                                >
                                    Save
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardFooter>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="contacts">Contacts</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Overview</CardTitle>
                            <CardDescription>Check tab indicator, spacing, and card surfaces.</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            This is a placeholder overview section.
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="contacts" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Contacts</CardTitle>
                            <CardDescription>Later: list contacts + add new contact.</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            No contacts yet.
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="activity" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Activity</CardTitle>
                            <CardDescription>Later: notes + interactions + follow-ups.</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            No activity yet.
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}