"use client";

import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserDrops } from "@/actions/drop";
import type { GiftDrop } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Copy, Eye, Users, ExternalLink, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [drops, setDrops] = useState<GiftDrop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/dashboard");
    }
  }, [user, loading]);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      getUserDrops(user.uid)
        .then(setDrops)
        .catch((err) => {
          console.error(err);
          toast({
            title: "Error",
            description: "Could not fetch your drops.",
            variant: "destructive",
          });
        })
        .finally(() => setIsLoading(false));
    }
  }, [user]);

  const copyShareLink = (dropId: string) => {
    const url = `${window.location.origin}/drop/${dropId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Copied!",
        description: "Share link copied to clipboard.",
      });
    });
  };

  if (loading || (isLoading && drops.length === 0)) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-36" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-36 w-full rounded-lg" />
              <Skeleton className="h-36 w-full rounded-lg" />
              <Skeleton className="h-36 w-full rounded-lg" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl md:text-4xl font-bold font-headline">
              My Drops
            </h1>
            <Button asChild>
              <Link href="/create">Create New Drop</Link>
            </Button>
          </div>

          {drops.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <h2 className="text-xl font-semibold">No drops yet!</h2>
              <p className="text-muted-foreground mt-2">
                Get started by creating your first gift drop.
              </p>
              <Button asChild className="mt-4">
                <Link href="/create">Create a Drop</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6">
              {drops.map((drop) => (
                <Card key={drop.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{drop.title}</CardTitle>
                        <CardDescription>
                          Created on {format(new Date(drop.createdAt), "PPP")}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          drop.recipientOpenedAt ? "secondary" : "default"
                        }
                      >
                        {drop.recipientOpenedAt ? "Opened" : "Unopened"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground gap-4">
                      <span>{drop.gifts.length} gift options</span>
                      {drop.recipientDetails && (
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>Claimed by {drop.recipientDetails.name}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2">
                    <Button size="sm" variant="default" asChild>
                      <Link href={`/drop/${drop.id}`} target="_blank">
                        <ExternalLink className="mr-2" /> Preview Drop
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/drop/${drop.id}/share`}>
                        <Eye className="mr-2" /> View Share Page
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyShareLink(drop.id)}
                    >
                      <Copy className="mr-2" /> Copy Link
                    </Button>
                    {!drop.recipientOpenedAt && (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/edit/${drop.id}`}>
                          <Edit className="mr-2" /> Edit Drop
                        </Link>
                      </Button>
                    )}
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
