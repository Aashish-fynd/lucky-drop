"use client";

import { generateThankYouAction } from "@/actions/ai";
import { saveRecipientDetails, selectGift } from "@/actions/drop";
import { GiftCard } from "@/components/GiftCard";
import ImageSwiper from "@/components/ImageSwiper";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { GiftDrop } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Gift,
  Loader2,
  Mic,
  Send,
  SmilePlus,
  Video,
  Music,
  Image as ImageIcon,
} from "lucide-react";
import { useEffect, useState, useTransition, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";

type Stage =
  | "initial"
  | "media"
  | "selecting"
  | "revealing"
  | "revealed"
  | "details"
  | "thanking"
  | "done";

const detailsSchema = z.object({
  name: z.string().min(2, "Name is required."),
  address: z.string().min(10, "A full address is required."),
});

export function GiftOpener({ drop }: { drop: GiftDrop }) {
  const [stage, setStage] = useState<Stage>("initial");
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(
    drop.selectedGiftId || null
  );
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [thankYou, setThankYou] = useState<{
    message: string;
    mediaType: string;
    mediaContent?: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);

  const selectedGift = drop.gifts.find((g) => g.id === selectedGiftId);

  useEffect(() => {
    // Stage navigation based on drop state
    if (drop.recipientOpenedAt && !drop.selectedGiftId) {
      // Check if there's media to show first
      const hasMedia =
        drop.gifterMedia &&
        (Array.isArray(drop.gifterMedia)
          ? drop.gifterMedia.length > 0
          : (drop.gifterMedia as any).url && (drop.gifterMedia as any).type);

      if (hasMedia) {
        setStage("media");
      } else {
        setStage("selecting");
      }
    }
    if (drop.selectedGiftId) {
      if (drop.recipientDetails) {
        setStage("thanking");
      } else {
        setStage("revealed");
      }
    }
  }, [drop]);

  const handleSelectGift = (giftId: string) => {
    startTransition(async () => {
      const result = await selectGift(drop.id, giftId);
      if (result.success) {
        setSelectedGiftId(giftId);
        setStage("revealing");
        setTimeout(() => setStage("revealed"), 2000);
      } else {
        toast({
          title: "Error",
          description: "Could not select gift.",
          variant: "destructive",
        });
      }
    });
  };

  const handleRandomReveal = () => {
    setStage("revealing");
    startTransition(() => {
      const randomIndex = Math.floor(Math.random() * drop.gifts.length);
      const randomGiftId = drop.gifts[randomIndex].id;
      selectGift(drop.id, randomGiftId).then((result) => {
        if (result.success) {
          setSelectedGiftId(randomGiftId);
          setTimeout(() => setStage("revealed"), 2000);
        } else {
          toast({
            title: "Error",
            description: "Could not select gift.",
            variant: "destructive",
          });
          setStage("selecting");
        }
      });
    });
  };

  const handleOpenSurprise = () => {
    startTransition(async () => {
      // We just need to mark that the user has opened it.
      // The selection happens on the next screen.
      // We pass a "fake" gift ID which won't be saved, but will trigger the timestamp update.
      // A better approach might be a dedicated action.
      await selectGift(drop.id, "");
      // Check if there's gifter media to show first
      // Handle both old single media and new array format
      const hasMedia =
        drop.gifterMedia &&
        (Array.isArray(drop.gifterMedia)
          ? drop.gifterMedia.length > 0
          : (drop.gifterMedia as any).url && (drop.gifterMedia as any).type);
      if (hasMedia) {
        setStage("media");
      } else {
        setStage("selecting");
      }
    });
  };

  const form = useForm<z.infer<typeof detailsSchema>>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { name: "", address: "" },
  });

  const onDetailsSubmit = (values: z.infer<typeof detailsSchema>) => {
    startTransition(async () => {
      const result = await saveRecipientDetails(drop.id, values);
      if (result.success) {
        setStage("thanking");
        toast({
          title: "Details Saved!",
          description: "Your delivery information has been sent.",
        });
      } else {
        toast({
          title: "Error",
          description: "Could not save details.",
          variant: "destructive",
        });
      }
    });
  };

  const handleGenerateThankYou = () => {
    if (!selectedGift) return;
    setIsGenerating(true);
    startTransition(async () => {
      try {
        const result = await generateThankYouAction({
          giftDescription: selectedGift.name,
          recipientName: drop.recipientDetails?.name || "there",
        });
        setThankYou(result);
        if (result.mediaType === "video" || result.mediaType === "selfie") {
          getCameraPermission();
        }
      } catch (error) {
        toast({
          title: "AI Error",
          description: "Could not generate thank you note.",
          variant: "destructive",
        });
      } finally {
        setIsGenerating(false);
      }
    });
  };

  const getCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setHasCameraPermission(false);
      toast({
        variant: "destructive",
        title: "Camera Access Denied",
        description:
          "Please enable camera permissions in your browser settings to use this feature.",
      });
    }
  };

  const renderStage = () => {
    switch (stage) {
      case "initial":
        return (
          <Card className="text-center p-8 shadow-2xl animate-in fade-in zoom-in-95 max-w-lg w-full">
            <div>
              <h1 className="text-3xl font-bold font-headline">{drop.title}</h1>
              <p className="text-muted-foreground mt-2">{drop.message}</p>
              <Button
                size="lg"
                className="mt-6"
                onClick={handleOpenSurprise}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Open Your Surprise"
                )}
              </Button>
            </div>
          </Card>
        );
      case "media":
        return (
          <div className="text-white w-full flex flex-col items-center justify-center p-4 font-sans overflow-hidden">
            {drop.gifterMedia && (
              <ImageSwiper
                cards={
                  Array.isArray(drop.gifterMedia)
                    ? drop.gifterMedia
                    : [drop.gifterMedia as any]
                }
                onComplete={() => setStage("selecting")}
              />
            )}
          </div>
        );
      case "selecting":
        return (
          <div className="w-full max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-6 font-headline">
              {drop.distributionMode === "manual"
                ? "Choose Your Gift!"
                : "Ready for a Surprise?"}
            </h2>
            {drop.distributionMode === "manual" ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in-50 slide-in-from-bottom-10 duration-500">
                {drop.gifts.map((gift) => (
                  <GiftCard
                    key={gift.id}
                    gift={gift}
                    onSelect={handleSelectGift}
                    isPending={isPending}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center">
                <Button
                  size="lg"
                  onClick={handleRandomReveal}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Reveal My Gift!"
                  )}
                </Button>
              </div>
            )}
          </div>
        );
      case "revealing":
        return (
          <div className="text-center space-y-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
            <p className="text-xl font-medium text-muted-foreground animate-pulse">
              Unwrapping your gift...
            </p>
          </div>
        );
      case "revealed":
        if (!selectedGift) return null;
        return (
          <Card className="w-full max-w-lg mx-auto shadow-2xl animate-in fade-in-50 zoom-in-95 duration-500">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-headline">
                Congratulations!
              </CardTitle>
              <CardDescription>You've received a gift!</CardDescription>
            </CardHeader>
            <CardContent>
              <GiftCard gift={selectedGift} isSelectable={false} />
              <Button
                className="w-full mt-6"
                onClick={() => setStage("details")}
              >
                Claim Your Gift
              </Button>
            </CardContent>
          </Card>
        );
      case "details":
        return (
          <Card className="w-full max-w-lg mx-auto shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl font-headline">
                Delivery Details
              </CardTitle>
              <CardDescription>
                Please provide your information to receive your gift.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onDetailsSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      "Save & Continue"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        );
      case "thanking":
        return (
          <Card className="w-full max-w-lg mx-auto shadow-2xl animate-in fade-in-50">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-headline">
                Gift Claimed!
              </CardTitle>
              <CardDescription>Want to send a thank you note?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {thankYou ? (
                <div className="p-4 border rounded-lg bg-muted/50 text-center space-y-4">
                  <p className="italic">"{thankYou.message}"</p>
                  <p className="text-sm font-medium">
                    AI suggests you record a {thankYou.mediaType}:
                  </p>
                  {thankYou.mediaContent ? (
                    <audio
                      controls
                      src={thankYou.mediaContent}
                      className="w-full"
                    ></audio>
                  ) : (
                    <>
                      {(thankYou.mediaType === "video" ||
                        thankYou.mediaType === "selfie") && (
                        <div className="space-y-2">
                          <video
                            ref={videoRef}
                            className="w-full aspect-video rounded-md bg-black"
                            autoPlay
                            muted
                          />
                          {!hasCameraPermission && (
                            <Alert variant="destructive">
                              <AlertTitle>Camera Access Required</AlertTitle>
                              <AlertDescription>
                                Please allow camera access to use this feature.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                      <div className="flex justify-center gap-4">
                        <Button
                          variant="outline"
                          disabled={thankYou.mediaType !== "audio"}
                        >
                          <Mic className="mr-2" /> Record Audio
                        </Button>
                        <Button
                          variant="outline"
                          disabled={thankYou.mediaType !== "video"}
                        >
                          <Video className="mr-2" /> Record Video
                        </Button>
                        <Button
                          variant="outline"
                          disabled={thankYou.mediaType !== "selfie"}
                        >
                          <SmilePlus className="mr-2" /> Take Selfie
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Button
                  className="w-full"
                  onClick={handleGenerateThankYou}
                  disabled={isGenerating || isPending}
                >
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Generate with AI
                </Button>
              )}
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStage("done")}
              >
                No, thanks
              </Button>
            </CardContent>
          </Card>
        );
      case "done":
        return (
          <div className="text-center space-y-4">
            <Gift className="h-16 w-16 text-accent mx-auto" />
            <h1 className="text-3xl font-bold font-headline">
              All set! Enjoy your gift.
            </h1>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-grid-slate-100/[0.05] bg-[radial-gradient(140%_120%_at_50%_10%,rgba(23,150,208,0)_25%,rgba(124,58,237,1)_100%)]">
      {renderStage()}
    </div>
  );
}
