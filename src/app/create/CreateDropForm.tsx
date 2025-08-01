
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createDrop } from '@/actions/drop';
import { Loader2, Trash2, PlusCircle, Gift, Info, Send, UploadCloud, Sparkles, ExternalLink, Check, File as FileIcon, X, RefreshCw, Eye, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { app } from '@/lib/firebase'; // Import the app instance
import { Progress } from '@/components/ui/progress';
import { generateGiftIdeasAction } from '@/actions/ai';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GenerateGiftIdeasOutput } from '@/ai/flows/generate-gift-ideas';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const giftSchema = z.object({
  name: z.string().min(1, 'Gift name is required.'),
  image: z.string().min(1, 'Image URL is required.'),
  platform: z.string().optional(),
  url: z.string().url("Must be a valid URL").optional(),
});

const gifterMediaSchema = z.object({
    type: z.enum(['audio', 'video', 'card']).optional(),
    url: z.string().url('Must be a valid URL').optional(),
}).optional();

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.').max(50, 'Title must be 50 characters or less.'),
  message: z.string().max(300, 'Message must be 300 characters or less.').optional(),
  gifts: z.array(giftSchema).min(1, 'You must add at least one gift.').max(5, 'You can add a maximum of 5 gifts.'),
  distributionMode: z.enum(['random', 'manual'], {
    required_error: 'You need to select a distribution mode.',
  }),
  gifterMedia: gifterMediaSchema,
}).refine(data => {
    // If one of gifterMedia fields is present, both must be.
    if (data.gifterMedia?.url || data.gifterMedia?.type) {
        return !!data.gifterMedia.url && !!data.gifterMedia.type;
    }
    return true;
}, {
    message: "Media is required.",
    path: ["gifterMedia.url"],
});


type CreateDropFormValues = z.infer<typeof formSchema>;
type AiSuggestions = GenerateGiftIdeasOutput['gifts'];

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

function FileUploader({ onUploadComplete }: { onUploadComplete: (url: string, type: 'card' | 'audio' | 'video') => void; }) {
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<UploadStatus>('idle');
    const { toast } = useToast();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            handleUpload(selectedFile);
        }
    };

    const handleUpload = (fileToUpload: File) => {
        setStatus('uploading');
        setFile(fileToUpload);
        setUploadProgress(0);

        const detectedMediaType = fileToUpload.type.startsWith('image/') ? 'card' :
                                  fileToUpload.type.startsWith('audio/') ? 'audio' :
                                  fileToUpload.type.startsWith('video/') ? 'video' :
                                  null;
        
        if (!detectedMediaType) {
             toast({ title: 'Unsupported File Type', description: 'Please upload an image, audio, or video file.', variant: 'destructive' });
             setStatus('error');
             return;
        }

        const storage = getStorage(app); // Explicitly pass the app instance
        const storageRef = ref(storage, `uploads/${detectedMediaType}/${Date.now()}_${fileToUpload.name}`);
        const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                console.error("Upload failed:", error);
                setStatus('error');
                setUploadProgress(null);
                toast({ title: 'Upload Failed', description: `Error: ${error.code}. Please check console and CORS configuration.`, variant: 'destructive' });
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    setStatus('success');
                    onUploadComplete(downloadURL, detectedMediaType);
                });
            }
        );
    };

    const reset = () => {
        setStatus('idle');
        setFile(null);
        setUploadProgress(null);
        onUploadComplete('', 'card'); // Clear form state
    }

    return (
        <div className='space-y-4'>
             {status === 'idle' && (
                <label htmlFor="file-upload" className="relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/50 transition-colors">
                    <div className='p-3 bg-primary/10 rounded-full mb-4'>
                        <UploadCloud className="w-8 h-8 text-primary" />
                    </div>
                    <p className="mb-2 text-sm text-foreground"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-muted-foreground">Image, Audio, or Video (MAX. 10MB)</p>
                    <Input id="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*,audio/*,video/*" />
                </label>
            )}

            {file && (
                 <div className="w-full p-4 border rounded-lg space-y-3 shadow-sm bg-card">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className={cn('p-2 rounded-full', {
                                'bg-primary/10': status === 'uploading',
                                'bg-green-500/10': status === 'success',
                                'bg-destructive/10': status === 'error',
                            })}>
                                <FileIcon className={cn('h-6 w-6', {
                                    'text-primary': status === 'uploading',
                                    'text-green-500': status === 'success',
                                    'text-destructive': status === 'error',
                                })} />
                            </div>
                            
                            <div className="flex-grow space-y-1 overflow-hidden">
                                <p className="text-sm font-medium truncate">{file?.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {status === 'success' ? 'Upload Successful!' : 
                                     status === 'error' ? 'Upload failed! Please try again.' : 
                                     file && `${(file.size / 1024 / 1024).toFixed(2)} MB`}
                                </p>
                            </div>
                        </div>

                        {status === 'uploading' && <p className="text-sm font-semibold text-muted-foreground">{uploadProgress?.toFixed(0)}%</p>}
                        {status === 'success' && <CheckCircle className="h-6 w-6 text-green-500" />}
                        {status === 'error' && <Button variant="ghost" size="sm" onClick={() => file && handleUpload(file)}><RefreshCw className="mr-2"/> Try Again</Button>}
                    </div>

                    {status !== 'idle' && (
                        <div className="flex items-center gap-2">
                                <Progress 
                                    value={status === 'success' ? 100 : uploadProgress} 
                                    className={cn({
                                        'h-2': true,
                                        '[&>div]:bg-primary': status === 'uploading',
                                        '[&>div]:bg-green-500': status === 'success',
                                        '[&>div]:bg-destructive': status === 'error',
                                    })}
                                />
                        </div>
                    )}
                     {(status === 'success' || status === 'error') && (
                        <Button variant="ghost" size="icon" onClick={reset} className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive">
                            <Trash2 />
                        </Button>
                    )}
                 </div>
            )}
        </div>
    )
}


export function CreateDropForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, startAiTransition] = useTransition();
  const [isMoreAiLoading, startMoreAiTransition] = useTransition();
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestions | null>(null);
  const [isSuggestionsDialogOpen, setIsSuggestionsDialogOpen] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());

  const form = useForm<CreateDropFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      message: '',
      gifts: [],
      distributionMode: 'random',
      gifterMedia: {
        url: undefined,
        type: undefined
      }
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'gifts',
  });
  
  const watchedGifts = form.watch('gifts');

  const handleGenerateGifts = (isGeneratingMore = false) => {
    if (!aiPrompt) {
        toast({ title: "Prompt is empty", description: "Please tell us about the recipient.", variant: "destructive" });
        return;
    }

    const transitioner = isGeneratingMore ? startMoreAiTransition : startAiTransition;

    transitioner(async () => {
        try {
            const existingGiftNames = isGeneratingMore ? aiSuggestions?.map(g => g.name) || [] : [];
            const { gifts } = await generateGiftIdeasAction({ prompt: aiPrompt, existingGiftNames });
            
            if (gifts && gifts.length > 0) {
                if (isGeneratingMore) {
                    setAiSuggestions(prev => [...(prev || []), ...gifts]);
                } else {
                    setAiSuggestions(gifts);
                    setSelectedSuggestions(new Set());
                }
                setIsSuggestionsDialogOpen(true);
            } else {
                 toast({ title: "No new gifts generated", description: "AI couldn't find any more gifts. Try a different prompt.", variant: "destructive" });
            }
        } catch (error) {
            console.error("AI Error:", error);
            toast({ title: "AI Error", description: (error as Error)?.message || "Failed to generate gift ideas.", variant: "destructive" });
        }
    });
  }

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
    
    const giftsToAdd = aiSuggestions.filter((_, index) => selectedSuggestions.has(index));

    if (fields.length + giftsToAdd.length > 5) {
      toast({
        title: "Too many gifts",
        description: "You can add a maximum of 5 gifts to a drop.",
        variant: "destructive"
      });
      return;
    }

    giftsToAdd.forEach(g => append({ ...g, image: g.image || 'https://placehold.co/600x400.png' }));
    toast({ title: "Gifts Added!", description: `${giftsToAdd.length} gifts have been added to your drop.`});
    setIsSuggestionsDialogOpen(false);
  }

  async function onSubmit(data: CreateDropFormValues) {
    if (!user) {
        toast({
            title: 'Not Authenticated',
            description: 'You must be logged in to create a drop.',
            variant: 'destructive',
        });
        return router.push('/login');
    }

    setIsLoading(true);
    try {
      const finalData = { ...data };
      if (!finalData.gifterMedia?.url || !finalData.gifterMedia?.type) {
        delete finalData.gifterMedia;
      }

      const { id } = await createDrop(finalData as any, user.uid);
      toast({
        title: 'Drop Created!',
        description: 'Your lucky drop is ready to be shared.',
      });
      router.push(`/drop/${id}/share`);
    } catch (error:any) {
      toast({
        title: 'Error',
        description: error?.message||'Failed to create the drop. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/> AI Gift Suggestions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>How it works</AlertTitle>
                <AlertDescription>
                   Describe the person you're giving a gift to, and our AI will suggest some real gift ideas from popular online stores.
                </AlertDescription>
            </Alert>
             <Textarea 
                placeholder="e.g., My friend loves hiking, reading fantasy novels, and is a big fan of spicy food..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
             />
             <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" onClick={() => handleGenerateGifts(false)} disabled={isAiLoading} className="w-full">
                    {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Generate Gift Ideas
                </Button>
                {aiSuggestions && aiSuggestions.length > 0 && (
                     <Button type="button" variant="outline" onClick={() => setIsSuggestionsDialogOpen(true)} className="w-full">
                        <Eye className="mr-2 h-4 w-4" /> View Suggestions ({aiSuggestions.length})
                    </Button>
                )}
            </div>
          </CardContent>
        </Card>

        {aiSuggestions && (
            <Dialog open={isSuggestionsDialogOpen} onOpenChange={setIsSuggestionsDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                    <DialogTitle>AI-Generated Gift Ideas</DialogTitle>
                    <DialogDescription>
                        Here are a few ideas based on your prompt. Select the ones you like and add them to your drop.
                    </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[50vh] pr-6">
                        <div className="space-y-4">
                            {aiSuggestions.map((gift, index) => (
                                <div key={index} className='flex items-center gap-4 p-4 border rounded-lg'>
                                    <div className='relative w-24 h-24 flex-shrink-0'>
                                        <Image src={gift.image || 'https://placehold.co/400.png'} alt={gift.name} layout="fill" objectFit="cover" className="rounded-md" unoptimized/>
                                    </div>
                                    <div className="flex-grow">
                                        <h4 className='font-semibold'>{gift.name}</h4>
                                        <p className="text-sm text-muted-foreground">{gift.platform}</p>
                                        {gift.url && (
                                            <a href={gift.url} target='_blank' rel='noopener noreferrer' className='text-sm text-primary hover:underline flex items-center gap-1 mt-1'>
                                                View Product <ExternalLink className='h-3 w-3'/>
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
                             { isMoreAiLoading &&
                                <div className="flex items-center justify-center p-4">
                                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                    <p>Getting more ideas...</p>
                                </div>
                            }
                        </div>
                    </ScrollArea>
                    <DialogFooter className='sm:justify-between flex-col sm:flex-row gap-2'>
                        <Button type="button" variant="ghost" onClick={() => handleGenerateGifts(true)} disabled={isMoreAiLoading || isAiLoading}>
                            {isMoreAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Generate More
                        </Button>
                        <div className="flex gap-2 items-center">
                            <p className="text-sm text-muted-foreground hidden sm:block">{selectedSuggestions.size} selected</p>
                             <DialogClose asChild>
                                <Button type="button" variant="outline">
                                Cancel
                                </Button>
                            </DialogClose>
                            <Button type="button" onClick={handleAddSelectedGifts} disabled={selectedSuggestions.size === 0}>
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
            <CardTitle className="flex items-center gap-2"><Info className="text-primary"/> Drop Details</CardTitle>
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
                    <Textarea placeholder="A special message for the recipient..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Gift className="text-primary"/> Personal Touch (Optional)</CardTitle>
                 <FormDescription className="ml-8 -mt-1">Add a personal image, audio, or video message for the recipient.</FormDescription>
            </CardHeader>
            <CardContent>
                <FileUploader 
                    onUploadComplete={(url, type) => {
                        if(url && type) {
                            form.setValue('gifterMedia.url', url, { shouldValidate: true });
                            form.setValue('gifterMedia.type', type, { shouldValidate: true });
                        } else {
                            // Clear fields if upload is reset
                            form.setValue('gifterMedia.url', undefined);
                            form.setValue('gifterMedia.type', undefined);
                        }
                    }}
                />
                <FormField control={form.control} name="gifterMedia.url" render={() => <FormMessage />} />
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Gift className="text-primary"/> Gift Options</CardTitle>
            <FormDescription className="ml-8 -mt-1">Add or edit the AI-generated gifts below, or add your own.</FormDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                 <div className='flex justify-between items-start gap-4'>
                    <div className="flex-grow space-y-4">
                        <FormField
                        control={form.control}
                        name={`gifts.${index}.name`}
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Gift #{index + 1} Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Wireless Headphones" {...field} />
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
                        <Image src={watchedGifts?.[index]?.image || 'https://placehold.co/400.png'} alt={`Preview for gift ${index + 1}`} layout="fill" objectFit="cover" className="rounded-md border bg-muted" data-ai-hint="gift present" unoptimized />
                         <FormField
                            control={form.control}
                            name={`gifts.${index}.image`}
                            render={({ field }) => (
                                <FormItem className='hidden'>
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

                
                  <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)} className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" /> Remove Gift
                  </Button>
                
              </div>
            ))}
            {fields.length < 5 && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => append({ name: '', image: 'https://placehold.co/600x400.png', platform: '', url: '' })}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Gift Manually
              </Button>
            )}
             <FormField
                control={form.control}
                name="gifts"
                render={({field}) => <FormMessage className={field.value && field.value.length > 0 ? 'hidden': ''} />}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Send className="text-primary"/> Distribution Mode</CardTitle>
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
                           Manual - Recipient gets to choose from the gift options.
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
        
        <Button type="submit" className="w-full" size="lg" disabled={isLoading || isAiLoading}>
          {isLoading || isAiLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            'Create Drop'
          )}
        </Button>
      </form>
    </Form>
  );
}
