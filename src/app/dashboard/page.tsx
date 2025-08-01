'use client';

import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserDrops } from "@/actions/drop";
import type { GiftDrop } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Copy, Eye, BarChart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [drops, setDrops] = useState<GiftDrop[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            setIsLoading(true);
            getUserDrops(user.uid)
                .then(setDrops)
                .catch(err => {
                    console.error(err);
                    toast({
                        title: "Error",
                        description: "Could not fetch your drops.",
                        variant: "destructive"
                    })
                })
                .finally(() => setIsLoading(false));
        }
    }, [user, toast]);

    const copyShareLink = (dropId: string) => {
        const url = `${window.location.origin}/drop/${dropId}`;
        navigator.clipboard.writeText(url).then(() => {
            toast({
                title: "Copied!",
                description: "Share link copied to clipboard.",
            });
        });
    };

    if (loading || isLoading) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1 py-8 md:py-12">
                    <div className="container mx-auto px-4">
                        <h1 className="text-3xl md:text-4xl font-bold mb-8 font-headline">My Drops</h1>
                        <div className="space-y-4">
                            <div className="h-24 w-full rounded-lg bg-muted animate-pulse"></div>
                            <div className="h-24 w-full rounded-lg bg-muted animate-pulse"></div>
                            <div className="h-24 w-full rounded-lg bg-muted animate-pulse"></div>
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 py-8 md:py-12">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold font-headline">My Drops</h1>
                        <Button asChild>
                            <Link href="/create">Create New Drop</Link>
                        </Button>
                    </div>

                    {drops.length === 0 ? (
                        <div className="text-center py-16 border-2 border-dashed rounded-lg">
                            <h2 className="text-xl font-semibold">No drops yet!</h2>
                            <p className="text-muted-foreground mt-2">Get started by creating your first gift drop.</p>
                            <Button asChild className="mt-4">
                                <Link href="/create">Create a Drop</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {drops.map(drop => (
                                <Card key={drop.id}>
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle>{drop.title}</CardTitle>
                                                <CardDescription>Created on {format(new Date(drop.createdAt), 'PPP')}</CardDescription>
                                            </div>
                                            <Badge variant={drop.recipientDetails ? "secondary" : "default"}>
                                                {drop.recipientDetails ? 'Claimed' : 'Unclaimed'}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">{drop.gifts.length} gift options.</p>
                                    </CardContent>
                                    <CardFooter className="flex-wrap gap-2">
                                        <Button size="sm" variant="outline" asChild>
                                            <Link href={`/drop/${drop.id}/share`}><Eye className="mr-2" /> View Share Page</Link>
                                        </Button>
                                         <Button size="sm" variant="outline" onClick={() => copyShareLink(drop.id)}>
                                            <Copy className="mr-2"/> Copy Link
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
