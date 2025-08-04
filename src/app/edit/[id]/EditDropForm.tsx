"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import React, { useState, useTransition, useEffect } from "react";
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
import { updateDrop, getDrop } from "@/actions/drop";
import {
  Loader2,
  Trash2,
  PlusCircle,
  Gift,
  Info,
  Send,
  UploadCloud,
  ExternalLink,
  Check,
  File as FileIcon,
  RefreshCw,
  Music,
  Video,
  Image as ImageIcon,
  Volume2,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";
import { getOptimizedImageUrl } from "@/lib/cloudinary";
import { deleteFromCloudinary } from "@/actions/cloudinary";
import { uploadFileWithProgress } from "@/lib/upload-with-progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";
import type { GiftDrop } from "@/lib/types";

const giftSchema = z.object({
  id: z.string(),
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

type EditDropFormValues = z.infer<typeof formSchema>;

type UploadStatus = "idle" | "uploading" | "success" | "error";
type MediaType = "card" | "audio" | "video";

interface UploadedFile {
  id: string;
  file: File;
  url?: string;
  type?: MediaType;
  status: UploadStatus;
  progress: number;
  publicId?: string;
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
    // Use Cloudinary URL transformation for responsive images
    const optimizedUrl = getOptimizedImageUrl(url, { 
      width: 400, 
      height: 300, 
      crop: 'fill',
      quality: 80 
    });
    
    return (
      <div className="relative w-full h-48 rounded-lg overflow-hidden">
        <Image
          src={optimizedUrl}
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
  existingMedia = [],
}: {
  onUploadComplete: (media: { url: string; type: MediaType }[]) => void;
  form: any;
  existingMedia?: { url: string; type: MediaType }[];
}) {
  const { user } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const { toast } = useToast();

  // Initialize with existing media
  useEffect(() => {
    if (existingMedia.length > 0) {
      onUploadComplete(existingMedia);
    }
  }, [existingMedia, onUploadComplete]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const currentCount = uploadedFiles.length + existingMedia.length;
    const remainingSlots = 5 - currentCount;

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
    const currentCount = uploadedFiles.length + existingMedia.length;
    const remainingSlots = 5 - currentCount;

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

  const handleUpload = async (fileToUpload: File) => {
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

    try {
      // Upload to Cloudinary with real progress tracking
      const { url, publicId } = await uploadFileWithProgress(
        fileToUpload,
        user?.uid || 'anonymous',
        (progressData) => {
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? { ...f, progress: progressData.progress }
                : f
            )
          );
        }
      );

      // Update file status to success
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: "success", url, progress: 100, publicId }
            : f
        )
      );

      updateFormValues();
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadedFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, status: "error" } : f))
      );
      toast({
        title: "Upload Failed",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const updateFormValues = () => {
    // Update form with all successfully uploaded files
    setTimeout(() => {
      setUploadedFiles((prev) => {
        const successfulFiles = prev.filter(
          (f) => f.status === "success" && f.url && f.type
        );
        const newMedia = successfulFiles.map((f) => ({
          url: f.url!,
          type: f.type!,
        }));
        const allMedia = [...existingMedia, ...newMedia];

        if (allMedia.length > 0) {
          form.setValue("gifterMedia", allMedia, { shouldValidate: true });
        }

        onUploadComplete(allMedia);
        return prev;
      });
    }, 100);
  };

  const removeFile = async (fileId: string) => {
    const fileToRemove = uploadedFiles.find((f) => f.id === fileId);
    
    // Delete from Cloudinary if file was successfully uploaded
    if (fileToRemove?.publicId && fileToRemove.status === "success") {
      try {
        await deleteFromCloudinary(fileToRemove.publicId);
      } catch (error) {
        console.error('Failed to delete file from Cloudinary:', error);
        // Continue with local removal even if Cloudinary deletion fails
      }
    }

    setUploadedFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== fileId);
      // Update form if we removed files
      const successfulFiles = filtered.filter(
        (f) => f.status === "success" && f.url && f.type
      );
      const allMedia = [
        ...existingMedia,
        ...successfulFiles.map((f) => ({
          url: f.url!,
          type: f.type!,
        })),
      ];

      if (allMedia.length === 0) {
        form.setValue("gifterMedia", [], { shouldValidate: true });
        form.trigger("gifterMedia");
        onUploadComplete([]);
      } else {
        form.setValue("gifterMedia", allMedia, { shouldValidate: true });
        onUploadComplete(allMedia);
      }
      return filtered;
    });
  };

  const removeExistingMedia = (index: number) => {
    const newExistingMedia = existingMedia.filter((_, i) => i !== index);
    const successfulFiles = uploadedFiles.filter(
      (f) => f.status === "success" && f.url && f.type
    );
    const allMedia = [
      ...newExistingMedia,
      ...successfulFiles.map((f) => ({
        url: f.url!,
        type: f.type!,
      })),
    ];

    if (allMedia.length === 0) {
      form.setValue("gifterMedia", [], { shouldValidate: true });
      form.trigger("gifterMedia");
      onUploadComplete([]);
    } else {
      form.setValue("gifterMedia", allMedia, { shouldValidate: true });
      onUploadComplete(allMedia);
    }
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

  const hasFiles = uploadedFiles.length > 0 || existingMedia.length > 0;

  return (
    <div className="space-y-4">
      {/* Existing Media Files */}
      {existingMedia.map((media, index) => (
        <div
          key={`existing-${index}`}
          className="w-full p-4 bg-white rounded-2xl shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between">
            {/* Left side - File preview and info */}
            <div className="flex items-center gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-green-100 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
                    {media.type === "card" ? (
                      <Image
                        src={getOptimizedImageUrl(media.url, { 
                          width: 48, 
                          height: 48, 
                          crop: 'fill',
                          quality: 70 
                        })}
                        alt="thumbnail"
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                      />
                    ) : media.type === "video" ? (
                      <Video className="h-6 w-6 text-green-600" />
                    ) : (
                      <Music className="h-6 w-6 text-green-600" />
                    )}
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-left">
                      Existing {media.type}
                    </DialogTitle>
                    <DialogDescription className="text-left">
                      {media.type === "card"
                        ? "Image"
                        : media.type === "video"
                        ? "Video"
                        : "Audio"}
                    </DialogDescription>
                  </DialogHeader>
                  <MediaPreview type={media.type} url={media.url} />
                </DialogContent>
              </Dialog>
              <div>
                <p className="text-base font-medium text-gray-900">
                  Existing {media.type}
                </p>
                <p className="text-sm text-gray-500 mt-1">Upload Successful!</p>
              </div>
            </div>

            {/* Right side - Status and actions */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              </div>

              <button
                onClick={() => removeExistingMedia(index)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* File Upload Input Area - Hide when limit reached */}
      {uploadedFiles.length + existingMedia.length < 5 && (
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
            {`Supported files: Images, Audio, Video (10mb each) • ${
              uploadedFiles.length + existingMedia.length
            }/5 files`}
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
                          src={getOptimizedImageUrl(uploadedFile.url, { 
                            width: 48, 
                            height: 48, 
                            crop: 'fill',
                            quality: 70 
                          })}
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

interface EditDropFormProps {
  drop: GiftDrop;
}

export function EditDropForm({ drop }: EditDropFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Check if drop can be edited (not claimed yet)
  const canEdit = !drop.recipientOpenedAt;

  const form = useForm<EditDropFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: drop.title,
      message: drop.message || "",
      gifts: drop.gifts,
      distributionMode: drop.distributionMode,
      gifterMedia: Array.isArray(drop.gifterMedia)
        ? drop.gifterMedia
        : drop.gifterMedia
        ? [drop.gifterMedia as any]
        : [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "gifts",
  });

  const watchedGifts = form.watch("gifts");

  async function onSubmit(data: EditDropFormValues) {
    if (!user) {
      toast({
        title: "Not Authenticated",
        description: "You must be logged in to edit a drop.",
        variant: "destructive",
      });
      return router.push("/login");
    }

    if (!canEdit) {
      toast({
        title: "Cannot Edit",
        description: "This drop has already been opened and cannot be edited.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const finalData = { ...data };
      if (!finalData.gifterMedia || finalData.gifterMedia.length === 0) {
        delete finalData.gifterMedia;
      }
      const result = await updateDrop(drop.id, finalData);

      if (result.success) {
        toast({
          title: "Drop Updated!",
          description: "Your lucky drop has been updated successfully.",
        });
        router.push("/dashboard");
      } else {
        throw new Error("Failed to update drop");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.message || "Failed to update the drop. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (!canEdit) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>

          <Alert variant="destructive">
            <AlertTitle>Cannot Edit Drop</AlertTitle>
            <AlertDescription>
              This drop has already been opened by the recipient and cannot be
              edited. You can view the drop details in your dashboard.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold font-headline">Edit Drop</h1>
            <p className="text-muted-foreground mt-2">
              Update your gift drop before it's opened by the recipient.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                          <Input
                            placeholder="e.g., Happy Birthday!"
                            {...field}
                          />
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
                    Add a personal image, audio, or video message for the
                    recipient.
                  </FormDescription>
                </CardHeader>
                <CardContent>
                  <FileUploader
                    form={form}
                    existingMedia={
                      Array.isArray(drop.gifterMedia)
                        ? drop.gifterMedia
                        : drop.gifterMedia
                        ? [drop.gifterMedia as any]
                        : []
                    }
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
                    Edit the gifts in your drop.
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
                                  <Input
                                    placeholder="e.g., Amazon"
                                    {...field}
                                  />
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
                                  <Input
                                    placeholder="e.g., $29.99"
                                    {...field}
                                  />
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
                          id: `${Date.now()}-gift-${fields.length}`,
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
                                Random - A random gift is selected for the
                                recipient.
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
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Update Drop"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
