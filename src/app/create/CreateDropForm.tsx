"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";
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
  Keyboard,
  Volume2,
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
  price: z.string().optional(),
  description: z.string().optional(),
});

const gifterMediaSchema = z
  .array(
    z.object({
      type: z.enum(["audio", "video", "card"]),
      url: z.string().url("Must be a valid URL"),
    })
  )
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
      // If gifterMedia array exists, it should not be empty
      if (data.gifterMedia && data.gifterMedia.length > 0) {
        return data.gifterMedia.every((media) => media.url && media.type);
      }
      return true;
    },
    {
      // This message will appear under the file uploader if validation fails.
      message: "All media items must have valid URLs and types.",
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
      <div className="relative w-full h-48 rounded-lg overflow-hidden">
        <Image
          src={url}
          alt="Uploaded card"
          fill
          className="object-cover"
          unoptimized
        />
      </div>
    );
  } else if (type === "audio") {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
          <Volume2 className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Audio Message</p>
          <p className="text-xs text-gray-500">Click to play</p>
        </div>
      </div>
    );
  } else if (type === "video") {
    return (
      <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
        <video src={url} controls className="w-full h-full object-cover" />
      </div>
    );
  }
  return null;
}

function FileUploader({
  onUploadComplete,
  form,
}: {
  onUploadComplete: (media: { url: string; type: MediaType }[]) => void;
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
        const media = successfulFiles.map((f) => ({
          url: f.url!,
          type: f.type!,
        }));

        if (media.length > 0) {
          form.setValue("gifterMedia", media, { shouldValidate: true });
        }

        onUploadComplete(media);
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
        form.setValue("gifterMedia", [], { shouldValidate: true });
        form.trigger("gifterMedia");
        onUploadComplete([]);
      } else {
        const media = successfulFiles.map((f) => ({
          url: f.url!,
          type: f.type!,
        }));
        form.setValue("gifterMedia", media, { shouldValidate: true });
        onUploadComplete(media);
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
  // Loading messages for gift generation
  const loadingMessages = [
    "🔍 Searching for the perfect gifts...",
    "🤖 AI is analyzing your preferences...",
    "🛍️ Browsing through thousands of products...",
    "✨ Curating personalized recommendations...",
    "🎁 Finding gifts that match their style...",
    "💡 Generating thoughtful suggestions...",
    "🌟 Almost ready with amazing ideas...",
  ];
  const [currentLoadingMessageIndex, setCurrentLoadingMessageIndex] =
    useState(0);

  // Example prompts for cycling
  const examplePrompts = [
    "My friend loves hiking, camping, and outdoor adventures. They're always looking for new gear and love exploring nature trails.",
    "My sister is into yoga, sustainable living, and loves trying new healthy recipes. She's passionate about wellness and mindfulness.",
    "My dad enjoys woodworking, classic rock music, and craft beer. He loves working with his hands and has a workshop in the garage.",
    "My colleague is passionate about photography, travel, and cooking. They love trying new cuisines and documenting their adventures.",
  ];
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);

  const [isTransitioning, setIsTransitioning] = useState(false);

  // Auto-cycle placeholder every 3 seconds, but only if user hasn't typed anything
  React.useEffect(() => {
    if (aiPrompt.trim() === "") {
      const interval = setInterval(() => {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentExampleIndex((prev) => (prev + 1) % examplePrompts.length);
          setIsTransitioning(false);
        }, 150);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [aiPrompt]);

  // Cycle through loading messages when AI is generating
  React.useEffect(() => {
    if (isAiLoading || isMoreAiLoading) {
      const messageInterval = setInterval(() => {
        setCurrentLoadingMessageIndex(
          (prev) => (prev + 1) % loadingMessages.length
        );
      }, 2000);

      return () => {
        clearInterval(messageInterval);
      };
    }
  }, [isAiLoading, isMoreAiLoading]);

  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      setAiPrompt(examplePrompts[currentExampleIndex]);
    }
  };

  const form = useForm<CreateDropFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      message: "",
      gifts: [],
      distributionMode: "random",
      gifterMedia: [],
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
            toast({
              title: "More gifts generated!",
              description: `Added ${gifts.length} new gift ideas to your suggestions.`,
            });
          } else {
            setAiSuggestions(gifts);
            setSelectedSuggestions(new Set());
            toast({
              title: "Gift ideas ready!",
              description: `Found ${gifts.length} perfect gift suggestions for you.`,
            });
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
      if (!finalData.gifterMedia || finalData.gifterMedia.length === 0) {
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
        {/* Modern AI Gift Suggestions Section */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Hi there,{" "}
              <span className="bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
                {user?.displayName || "Friend"}
              </span>
            </h2>
            <h3 className="text-3xl font-bold text-gray-900 mb-2">
              What gift would you{" "}
              <span className="bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
                like to find?
              </span>
            </h3>
            <p className="text-gray-600 text-sm">
              Describe the person you're giving a gift to, and our AI will
              suggest real gift ideas from popular online stores
            </p>
          </div>

          {/* Input Area */}
          <div className="relative">
            <div className="bg-white rounded-xl border-2 border-purple-200 shadow-sm p-4">
              <div className="relative">
                <Textarea
                  placeholder={`${examplePrompts[currentExampleIndex]} `}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={handleTabKey}
                  rows={3}
                  className={`!border-0 !p-0 resize-none !focus:ring-0 !focus:border-0 text-sm placeholder:text-gray-400 !outline-none !ring-0 !ring-offset-0 rounded-none pr-12 ${
                    isTransitioning
                      ? "transform translate-y-1 opacity-0 transition-all duration-150 ease-out"
                      : "transform -translate-y-1 opacity-100 transition-all duration-300 ease-in"
                  }`}
                />
              </div>

              {aiPrompt.trim() === "" && (
                <div className="flex">
                  <span className="inline-flex items-center gap-1 px-1 py-0.5 bg-purple-50 text-purple-600 text-xs font-medium rounded border border-purple-100 opacity-80 transition-all duration-300">
                    <Keyboard className="w-3 h-3" />
                    Press tab to use the example
                  </span>
                </div>
              )}

              {/* Input Controls */}
              <div className="flex items-center justify-between border-gray-100">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400">
                    {aiPrompt.length}/1000
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div
                    className={`flex items-center gap-2 transition-all duration-300 ${
                      isAiLoading
                        ? "opacity-100"
                        : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                    <span className="text-xs text-purple-600">
                      {loadingMessages[currentLoadingMessageIndex]}
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleGenerateGifts(false)}
                    disabled={isAiLoading}
                    className={`w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 p-0 flex items-center justify-center transition-all duration-300 ${
                      isAiLoading
                        ? "opacity-0 pointer-events-none"
                        : "opacity-100"
                    }`}
                  >
                    <Sparkles className="w-5 h-5 text-white" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* View Suggestions Button */}
          {aiSuggestions && aiSuggestions.length > 0 && (
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSuggestionsDialogOpen(true)}
                className="w-full border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors hover:text-purple-600"
              >
                <Eye className="mr-2 h-4 w-4" />
                View Suggestions ({aiSuggestions.length})
              </Button>
            </div>
          )}
        </div>

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
              <ScrollArea className="h-[50vh]">
                <div className="space-y-4">
                  {aiSuggestions.map((gift, index) => (
                    <div
                      key={index}
                      className="group relative overflow-hidden border rounded-xl hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-gray-50/50"
                    >
                      <div className="flex items-start gap-4 p-4">
                        {/* Product Image */}
                        <div className="relative w-24 h-24 flex-shrink-0">
                          <Image
                            src={gift.image || "https://placehold.co/400.png"}
                            alt={gift.name}
                            fill
                            sizes="96px"
                            className="object-cover rounded-lg shadow-sm"
                            unoptimized
                          />
                          {gift.price && (
                            <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                              {gift.price}
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-grow min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-grow min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">
                                {gift.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                {gift.platform && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {gift.platform}
                                  </span>
                                )}
                                {gift.price && (
                                  <span className="text-sm text-green-600 font-medium">
                                    {gift.price}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Checkbox */}
                            <Checkbox
                              checked={selectedSuggestions.has(index)}
                              onCheckedChange={() =>
                                handleSuggestionToggle(index)
                              }
                              id={`suggestion-${index}`}
                              className="h-5 w-5 mt-1"
                            />
                          </div>

                          {/* AI Description */}
                          {gift.description && (
                            <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 rounded-xl border border-purple-200/60 shadow-sm">
                              {/* Header */}
                              <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="h-3 w-3 text-purple-600" />
                                <h5 className="text-xs font-semibold text-purple-700">
                                  Why this gift fits their style
                                </h5>
                              </div>

                              {/* Description */}
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {gift.description}
                              </p>
                            </div>
                          )}

                          {/* Product Link */}
                          {gift.url && (
                            <div className="mt-3">
                              <a
                                href={gift.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View Product Details
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hover Effect Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </div>
                  ))}
                  {isMoreAiLoading && (
                    <div className="flex items-center justify-center p-4">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                        <p className="text-sm font-medium text-purple-700">
                          {loadingMessages[currentLoadingMessageIndex]}
                        </p>
                      </div>
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
              onUploadComplete={(media) => {
                form.setValue("gifterMedia", media, {
                  shouldValidate: true,
                });
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
                    <FormField
                      control={form.control}
                      name={`gifts.${index}.price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., $29.99" {...field} />
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
                    price: "",
                    description: "",
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
