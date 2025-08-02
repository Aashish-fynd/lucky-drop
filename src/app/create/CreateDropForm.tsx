"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createDrop } from "@/actions/drop";
import {
  Loader2,
  Trash2,
  PlusCircle,
  Gift,
  Info,
  Send,
  UploadCloud,
  Sparkles,
  ExternalLink,
  Check,
  File as FileIcon,
  X,
  RefreshCw,
  Eye,
  CheckCircle,
  Music,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { app } from "@/lib/firebase";
import { Progress } from "@/components/ui/progress";
import { generateGiftIdeasAction } from "@/actions/ai";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GenerateGiftIdeasOutput } from "@/ai/flows/generate-gift-ideas";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const giftSchema = z.object({
  name: z.string().min(1, "Gift name is required."),
  image: z.string().min(1, "Image URL is required."),
  platform: z.string().optional(),
  url: z.string().url("Must be a valid URL").optional(),
});

const gifterMediaSchema = z
  .object({
    type: z.enum(["audio", "video", "card"]).optional(),
    url: z.string().url("Must be a valid URL").optional(),
  })
  .optional();

const formSchema = z
  .object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters.")
      .max(50, "Title must be 50 characters or less."),
    message: z
      .string()
      .max(300, "Message must be 300 characters or less.")
      .optional(),
    gifts: z
      .array(giftSchema)
      .min(1, "You must add at least one gift.")
      .max(5, "You can add a maximum of 5 gifts."),
    distributionMode: z.enum(["random", "manual"], {
      required_error: "You need to select a distribution mode.",
    }),
    gifterMedia: gifterMediaSchema,
  })
  .refine(
    (data) => {
      // If either url or type has a value, both must have a value.
      if (data.gifterMedia?.url || data.gifterMedia?.type) {
        return !!data.gifterMedia.url && !!data.gifterMedia.type;
      }
      return true;
    },
    {
      // This message will appear under the file uploader if validation fails.
      message: "Media is required.",
      path: ["gifterMedia"], // Pointing error to the media object itself
    }
  );

type CreateDropFormValues = z.infer<typeof formSchema>;
type AiSuggestions = GenerateGiftIdeasOutput["gifts"];

type UploadStatus = "idle" | "uploading" | "success" | "error";
type MediaType = "card" | "audio" | "video";

interface UploadedFile {
  id: string;
  file: File;
  url?: string;
  type?: MediaType;
  status: UploadStatus;
  progress: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}b`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}kb`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)}mb`;
  } else {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}gb`;
  }
}

function getFileStatusText(uploadedFile: UploadedFile): string {
  if (uploadedFile.status === "success") {
    return "Upload Successful!";
  } else if (uploadedFile.status === "error") {
    return "Upload failed! Please try again.";
  } else {
    return formatFileSize(uploadedFile.file.size);
  }
}

function MediaPreview({ type, url }: { type: MediaType; url: string }) {
  if (type === "card") {
    return (
      <div className="relative w-full aspect-video">
        <Image
          src={url}
          alt="Uploaded Card Preview"
          fill
          className="rounded-md object-contain"
          data-ai-hint="greeting card"
        />
      </div>
    );
  }
  if (type === "audio") {
    return (
      <div className="w-full max-w-md mx-auto">
        <audio controls src={url} className="w-full" />
      </div>
    );
  }
  if (type === "video") {
    return (
      <div className="relative w-full aspect-video">
        <video controls src={url} className="w-full h-full rounded-md" />
      </div>
    );
  }
  return null;
}

function FileUploader({
  onUploadComplete,
  form,
}: {
  onUploadComplete: (urls: string[], types: MediaType[]) => void;
  form: any;
}) {
  const { user } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const remainingSlots = 5 - uploadedFiles.length;

    if (selectedFiles.length > remainingSlots) {
      toast({
        title: "Too Many Files",
        description: `You can only upload ${remainingSlots} more file${
          remainingSlots !== 1 ? "s" : ""
        }. Maximum 5 files total.`,
        variant: "destructive",
      });
      // Only upload the files that fit within the limit
      selectedFiles.slice(0, remainingSlots).forEach((file) => {
        handleUpload(file);
      });
    } else {
      selectedFiles.forEach((file) => {
        handleUpload(file);
      });
    }

    // Reset input to allow re-selecting the same files
    event.target.value = "";
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const remainingSlots = 5 - uploadedFiles.length;

    if (droppedFiles.length > remainingSlots) {
      toast({
        title: "Too Many Files",
        description: `You can only upload ${remainingSlots} more file${
          remainingSlots !== 1 ? "s" : ""
        }. Maximum 5 files total.`,
        variant: "destructive",
      });
      // Only upload the files that fit within the limit
      droppedFiles.slice(0, remainingSlots).forEach((file) => {
        handleUpload(file);
      });
    } else {
      droppedFiles.forEach((file) => {
        handleUpload(file);
      });
    }
  };

  const handleUpload = (fileToUpload: File) => {
    const detectedMediaType: MediaType | null = fileToUpload.type.startsWith(
      "image/"
    )
      ? "card"
      : fileToUpload.type.startsWith("audio/")
      ? "audio"
      : fileToUpload.type.startsWith("video/")
      ? "video"
      : null;

    if (!detectedMediaType) {
      toast({
        title: "Unsupported File Type",
        description: "Please upload an image, audio, or video file.",
        variant: "destructive",
      });
      return;
    }

    const fileId = `${Date.now()}_${Math.random()}`;
    const newFile: UploadedFile = {
      id: fileId,
      file: fileToUpload,
      status: "uploading",
      progress: 0,
      type: detectedMediaType,
    };

    setUploadedFiles((prev) => [...prev, newFile]);
    form.clearErrors("gifterMedia");

    const uniqueId = Buffer.from(`${Date.now()}_${fileToUpload.name}`).toString(
      "base64"
    );
    const storage = getStorage(
      app,
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    );
    const storageRef = ref(storage, `uploads/${user?.uid}/${uniqueId}`);
    const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadedFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, progress } : f))
        );
      },
      (error) => {
        console.error("Upload failed:", error);
        setUploadedFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, status: "error" } : f))
        );
        toast({
          title: "Upload Failed",
          description: `Error: ${error.code}. Please check console and CORS configuration.`,
          variant: "destructive",
        });
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? { ...f, status: "success", url: downloadURL, progress: 100 }
                : f
            )
          );
          updateFormValues();
        });
      }
    );
  };

  const updateFormValues = () => {
    // Update form with all successfully uploaded files
    setTimeout(() => {
      setUploadedFiles((prev) => {
        const successfulFiles = prev.filter(
          (f) => f.status === "success" && f.url && f.type
        );
        const urls = successfulFiles.map((f) => f.url!);
        const types = successfulFiles.map((f) => f.type!);

        if (urls.length > 0) {
          // For now, we'll just use the first file for the form
          form.setValue("gifterMedia.url", urls[0], { shouldValidate: true });
          form.setValue("gifterMedia.type", types[0], { shouldValidate: true });
        }

        onUploadComplete(urls, types);
        return prev;
      });
    }, 100);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== fileId);
      // Update form if we removed files
      const successfulFiles = filtered.filter(
        (f) => f.status === "success" && f.url && f.type
      );
      if (successfulFiles.length === 0) {
        form.setValue("gifterMedia.url", undefined);
        form.setValue("gifterMedia.type", undefined);
        form.trigger("gifterMedia");
        onUploadComplete([], []);
      } else {
        const urls = successfulFiles.map((f) => f.url!);
        const types = successfulFiles.map((f) => f.type!);
        form.setValue("gifterMedia.url", urls[0], { shouldValidate: true });
        form.setValue("gifterMedia.type", types[0], { shouldValidate: true });
        onUploadComplete(urls, types);
      }
      return filtered;
    });
  };

  const retryUpload = (fileId: string) => {
    const fileToRetry = uploadedFiles.find((f) => f.id === fileId);
    if (fileToRetry) {
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "uploading", progress: 0 } : f
        )
      );
      handleUpload(fileToRetry.file);
    }
  };

  const hasFiles = uploadedFiles.length > 0;

  return (
    <div className="space-y-4">
      {/* File Upload Input Area - Hide when limit reached */}
      {uploadedFiles.length < 5 && (
        <label
          htmlFor="file-upload"
          className="relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-gradient-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-all duration-200"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="p-4 bg-indigo-100 rounded-full mb-4">
            <UploadCloud className="w-8 h-8 text-indigo-600" />
          </div>

          <p className="mb-2 text-base text-slate-700">
            <span className="font-semibold text-indigo-600">
              Click here to upload
            </span>{" "}
            your file or drag and drop.
          </p>
          <p className="text-sm text-slate-500">
            {`Supported files: Images, Audio, Video (10mb each) • ${uploadedFiles.length}/5 files`}
          </p>

          <Input
            id="file-upload"
            type="file"
            className="sr-only"
            onChange={handleFileChange}
            accept="image/*,audio/*,video/*"
            multiple
          />
        </label>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.map((uploadedFile) => (
        <div
          key={uploadedFile.id}
          className="w-full p-4 bg-white rounded-2xl shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between">
            {/* Left side - File preview and info */}
            <div className="flex items-center gap-4">
              {uploadedFile.status === "success" &&
              uploadedFile.url &&
              uploadedFile.type ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-green-100 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
                      {uploadedFile.type === "card" ? (
                        <Image
                          src={uploadedFile.url}
                          alt="thumbnail"
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                        />
                      ) : uploadedFile.type === "video" ? (
                        <Video className="h-6 w-6 text-green-600" />
                      ) : (
                        <Music className="h-6 w-6 text-green-600" />
                      )}
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-left">
                        {uploadedFile.file.name}
                      </DialogTitle>
                      <DialogDescription className="text-left">
                        {formatFileSize(uploadedFile.file.size)} •{" "}
                        {uploadedFile.type === "card"
                          ? "Image"
                          : uploadedFile.type === "video"
                          ? "Video"
                          : "Audio"}
                      </DialogDescription>
                    </DialogHeader>
                    <MediaPreview
                      type={uploadedFile.type}
                      url={uploadedFile.url}
                    />
                  </DialogContent>
                </Dialog>
              ) : (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-green-100 flex items-center justify-center">
                  {uploadedFile.type === "card" ? (
                    <ImageIcon className="h-6 w-6 text-green-600" />
                  ) : uploadedFile.type === "video" ? (
                    <Video className="h-6 w-6 text-green-600" />
                  ) : uploadedFile.type === "audio" ? (
                    <Music className="h-6 w-6 text-green-600" />
                  ) : (
                    <FileIcon className="h-6 w-6 text-green-600" />
                  )}
                </div>
              )}
              <div>
                <p className="text-base font-medium text-gray-900 truncate max-w-[300px]">
                  {uploadedFile.file.name}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {getFileStatusText(uploadedFile)}
                </p>
              </div>
            </div>

            {/* Right side - Status and actions */}
            <div className="flex items-center gap-4">
              {uploadedFile.status === "success" && (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                </div>
              )}

              {uploadedFile.status === "uploading" && (
                <span className="text-sm font-medium text-gray-900">
                  {uploadedFile.progress.toFixed(0)}%
                </span>
              )}

              {uploadedFile.status === "error" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => retryUpload(uploadedFile.id)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Try Again
                </Button>
              )}

              <button
                onClick={() => removeFile(uploadedFile.id)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Progress Bar - Only show during upload and error, NOT for success */}
          {uploadedFile.status === "uploading" && (
            <div className="mt-4">
              <div className="w-full h-2 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${uploadedFile.progress}%` }}
                />
              </div>
            </div>
          )}

          {uploadedFile.status === "error" && (
            <div className="mt-4">
              <div className="w-full h-2 bg-red-500 rounded-full"></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function CreateDropForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, startAiTransition] = useTransition();
  const [isMoreAiLoading, startMoreAiTransition] = useTransition();
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestions | null>(
    null
  );
  const [isSuggestionsDialogOpen, setIsSuggestionsDialogOpen] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(
    new Set()
  );

  const form = useForm<CreateDropFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      message: "",
      gifts: [],
      distributionMode: "random",
      gifterMedia: {
        url: undefined,
        type: undefined,
      },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "gifts",
  });

  const watchedGifts = form.watch("gifts");

  const handleGenerateGifts = (isGeneratingMore = false) => {
    if (!aiPrompt) {
      toast({
        title: "Prompt is empty",
        description: "Please tell us about the recipient.",
        variant: "destructive",
      });
      return;
    }

    const transitioner = isGeneratingMore
      ? startMoreAiTransition
      : startAiTransition;

    transitioner(async () => {
      try {
        const existingGiftNames = isGeneratingMore
          ? aiSuggestions?.map((g) => g.name) || []
          : [];
        const { gifts } = await generateGiftIdeasAction({
          prompt: aiPrompt,
          existingGiftNames,
          maxResults: 20,
        });

        if (gifts && gifts.length > 0) {
          if (isGeneratingMore) {
            setAiSuggestions((prev) => [...(prev || []), ...gifts]);
          } else {
            setAiSuggestions(gifts);
            setSelectedSuggestions(new Set());
          }
          setIsSuggestionsDialogOpen(true);
        } else {
          toast({
            title: "No new gifts generated",
            description:
              "AI couldn't find any more gifts. Try a different prompt.",
          });
        }
      } catch (error) {
        console.error("AI Error:", error);
        toast({
          title: "AI Error",
          description:
            (error as Error)?.message || "Failed to generate gift ideas.",
          variant: "destructive",
        });
      }
    });
  };

  const handleSuggestionToggle = (index: number) => {
    const newSelection = new Set(selectedSuggestions);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedSuggestions(newSelection);
  };

  const handleAddSelectedGifts = () => {
    if (!aiSuggestions) return;

    const giftsToAdd = aiSuggestions.filter((_, index) =>
      selectedSuggestions.has(index)
    );

    if (fields.length + giftsToAdd.length > 5) {
      toast({
        title: "Too many gifts",
        description: "You can add a maximum of 5 gifts to a drop.",
        variant: "destructive",
      });
      return;
    }

    giftsToAdd.forEach((g) =>
      append({ ...g, image: g.image || "https://placehold.co/600x400.png" })
    );
    toast({
      title: "Gifts Added!",
      description: `${giftsToAdd.length} gifts have been added to your drop.`,
    });
    setIsSuggestionsDialogOpen(false);
  };

  async function onSubmit(data: CreateDropFormValues) {
    if (!user) {
      toast({
        title: "Not Authenticated",
        description: "You must be logged in to create a drop.",
        variant: "destructive",
      });
      return router.push("/login");
    }

    setIsLoading(true);
    try {
      const finalData = { ...data };
      if (!finalData.gifterMedia?.url || !finalData.gifterMedia?.type) {
        delete finalData.gifterMedia;
      }
      const { id } = await createDrop(finalData as any, user.uid);
      toast({
        title: "Drop Created!",
        description: "Your lucky drop is ready to be shared.",
      });
      router.push(`/drop/${id}/share`);
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.message || "Failed to create the drop. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="text-primary" /> AI Gift Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle>How it works</AlertTitle>
              <AlertDescription>
                Describe the person you're giving a gift to, and our AI will
                suggest some real gift ideas from popular online stores.
              </AlertDescription>
            </Alert>
            <Textarea
              placeholder="e.g., My friend loves hiking, reading fantasy novels, and is a big fan of spicy food..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={4}
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                onClick={() => handleGenerateGifts(false)}
                disabled={isAiLoading}
                className="w-full"
              >
                {isAiLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Gift Ideas
              </Button>
              {aiSuggestions && aiSuggestions.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSuggestionsDialogOpen(true)}
                  className="w-full"
                >
                  <Eye className="mr-2 h-4 w-4" /> View Suggestions (
                  {aiSuggestions.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {aiSuggestions && (
          <Dialog
            open={isSuggestionsDialogOpen}
            onOpenChange={setIsSuggestionsDialogOpen}
          >
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>AI-Generated Gift Ideas</DialogTitle>
                <DialogDescription>
                  Here are a few ideas based on your prompt. Select the ones you
                  like and add them to your drop.
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[50vh] pr-6">
                <div className="space-y-4">
                  {aiSuggestions.map((gift, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 border rounded-lg"
                    >
                      <div className="relative w-24 h-24 flex-shrink-0">
                        <Image
                          src={gift.image || "https://placehold.co/400.png"}
                          alt={gift.name}
                          fill
                          sizes="96px"
                          className="object-cover rounded-md"
                          unoptimized
                        />
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-semibold">{gift.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {gift.platform}
                        </p>
                        {gift.url && (
                          <a
                            href={gift.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                          >
                            View Product <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <Checkbox
                        checked={selectedSuggestions.has(index)}
                        onCheckedChange={() => handleSuggestionToggle(index)}
                        id={`suggestion-${index}`}
                        className="h-6 w-6"
                      />
                    </div>
                  ))}
                  {isMoreAiLoading && (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                      <p>Getting more ideas...</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <DialogFooter className="sm:justify-between flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleGenerateGifts(true)}
                  disabled={isMoreAiLoading || isAiLoading}
                >
                  {isMoreAiLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate More
                </Button>
                <div className="flex gap-2 items-center">
                  <p className="text-sm text-muted-foreground hidden sm:block">
                    {selectedSuggestions.size} selected
                  </p>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    type="button"
                    onClick={handleAddSelectedGifts}
                    disabled={selectedSuggestions.size === 0}
                  >
                    <PlusCircle className="mr-2" />
                    Add Selected ({selectedSuggestions.size})
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="text-primary" /> Drop Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Happy Birthday!" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A special message for the recipient..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="text-primary" /> Personal Touch (Optional)
            </CardTitle>
            <FormDescription className="ml-8 -mt-1">
              Add a personal image, audio, or video message for the recipient.
            </FormDescription>
          </CardHeader>
          <CardContent>
            <FileUploader
              form={form}
              onUploadComplete={(urls, types) => {
                if (urls.length > 0 && types.length > 0) {
                  // For now, just use the first uploaded file
                  form.setValue("gifterMedia.url", urls[0], {
                    shouldValidate: true,
                  });
                  form.setValue("gifterMedia.type", types[0], {
                    shouldValidate: true,
                  });
                } else {
                  form.setValue("gifterMedia.url", undefined);
                  form.setValue("gifterMedia.type", undefined);
                  form.trigger("gifterMedia"); // trigger validation after clearing
                }
              }}
            />
            <FormField
              control={form.control}
              name="gifterMedia"
              render={() => (
                <FormItem>
                  <FormMessage className="mt-2" />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="text-primary" /> Gift Options
            </CardTitle>
            <FormDescription className="ml-8 -mt-1">
              Add or edit the AI-generated gifts below, or add your own.
            </FormDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="p-4 border rounded-lg space-y-4 relative"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-grow space-y-4">
                    <FormField
                      control={form.control}
                      name={`gifts.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gift #{index + 1} Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Wireless Headphones"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`gifts.${index}.url`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`gifts.${index}.platform`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Platform (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Amazon" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="w-32 h-32 md:w-40 md:h-40 flex-shrink-0 relative">
                    <Image
                      src={
                        watchedGifts?.[index]?.image ||
                        "https://placehold.co/400.png"
                      }
                      alt={`Preview for gift ${index + 1}`}
                      fill
                      className="rounded-md border bg-muted object-cover"
                      data-ai-hint="gift present"
                      unoptimized
                    />
                    <FormField
                      control={form.control}
                      name={`gifts.${index}.image`}
                      render={({ field }) => (
                        <FormItem className="hidden">
                          <FormLabel>Image URL</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => remove(index)}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Remove Gift
                </Button>
              </div>
            ))}
            {fields.length < 5 && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() =>
                  append({
                    name: "",
                    image: "https://placehold.co/600x400.png",
                    platform: "",
                    url: "",
                  })
                }
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Gift Manually
              </Button>
            )}
            <FormField
              control={form.control}
              name="gifts"
              render={({ field }) => (
                <FormMessage
                  className={
                    field.value && field.value.length > 0 ? "hidden" : ""
                  }
                />
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="text-primary" /> Distribution Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="distributionMode"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="random" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Random - A random gift is selected for the recipient.
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="manual" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Manual - Recipient gets to choose from the gift
                          options.
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isLoading || isAiLoading}
        >
          {isLoading || isAiLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Create Drop"
          )}
        </Button>
      </form>
    </Form>
  );
}
