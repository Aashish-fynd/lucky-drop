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
import { Loader2, Trash2, PlusCircle, Gift, Info, Send, Music, Video, Image as ImageIcon, UploadCloud, Sparkles, ExternalLink, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Progress } from '@/components/ui/progress';
import { generateGiftIdeasAction } from '@/actions/ai';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GenerateGiftIdeasOutput } from '@/ai/flows/generate-gift-ideas';
import { Checkbox } from '@/components/ui/checkbox';

const giftSchema = z.object({
  name: z.string().min(1, 'Gift name is required.'),
  image: z.string().min(1, 'Image URL is required.'),
  platform: z.string().optional(),
  url: z.string().optional(),
});

const gifterMediaSchema = z.object({
    type: z.enum(['audio', 'video', 'card']),
    url: z.string().min(1, 'Media is required').url('Must be a valid URL'),
}).optional();

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.').max(50, 'Title must be 50 characters or less.'),
  message: z.string().max(300, 'Message must be 300 characters or less.').optional(),
  gifts: z.array(giftSchema).min(1, 'You must add at least one gift.').max(5, 'You can add a maximum of 5 gifts.'),
  distributionMode: z.enum(['random', 'manual'], {
    required_error: 'You need to select a distribution mode.',
  }),
  gifterMedia: gifterMediaSchema,
});

type CreateDropFormValues = z.infer<typeof formSchema>;
type AiSuggestions = GenerateGiftIdeasOutput['gifts'];

function FileUploader({ onUploadComplete, acceptedFileTypes, mediaType }: { onUploadComplete: (url: string) => void; acceptedFileTypes: string; mediaType: 'image' | 'audio' | 'video' }) {
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleUpload(file);
        }
    };

    const handleUpload = (file: File) => {
        setIsUploading(true);
        const storage = getStorage();
        const storageRef = ref(storage, `uploads/${mediaType}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                console.error("Upload failed:", error);
                toast({ title: 'Upload Failed', description: 'There was an error uploading your file.', variant: 'destructive' });
                setIsUploading(false);
                setUploadProgress(null);
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    setFileUrl(downloadURL);
                    onUploadComplete(downloadURL);
                    setIsUploading(false);
                     toast({ title: 'Upload Complete!', description: 'Your file has been uploaded.' });
                });
            }
        );
    };

    return (
        <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-4">
            {isUploading && uploadProgress !== null ? (
                <div className='space-y-2'>
                    <p>Uploading...</p>
                    <Progress value={uploadProgress} />
                </div>
            ) : fileUrl ? (
                <div>
                    {mediaType === 'image' && <Image src={fileUrl} alt="Uploaded preview" width={200} height={200} className='mx-auto rounded-lg' />}
                    {mediaType === 'audio' && <audio controls src={fileUrl} className='w-full' />}
                    {mediaType === 'video' && <video controls src={fileUrl} className='w-full rounded-lg' />}
                     <Button variant="link" onClick={() => setFileUrl(null)}>Upload another file</Button>
                </div>
            ) : (
                <>
                    <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">Drag & drop or click to upload</p>
                    <Input
                        id="file-upload"
                        type="file"
                        className="sr-only"
                        onChange={handleFileChange}
                        accept={acceptedFileTypes}
                    />
                     <label htmlFor="file-upload" className="cursor-pointer text-primary underline">
                        Choose a file
                    </label>
                </>
            )}
        </div>
    );
}

export function CreateDropForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, startAiTransition] = useTransition();
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestions | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());

  const form = useForm<CreateDropFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      message: '',
      gifts: [],
      distributionMode: 'random',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'gifts',
  });
  
  const watchedGifts = form.watch('gifts');

  const handleGenerateGifts = () => {
    if (!aiPrompt) {
        toast({ title: "Prompt is empty", description: "Please tell us about the recipient.", variant: "destructive" });
        return;
    }
    startAiTransition(async () => {
        try {
            const { gifts } = await generateGiftIdeasAction({ prompt: aiPrompt });
            if (gifts && gifts.length > 0) {
                setAiSuggestions(gifts);
                setSelectedSuggestions(new Set());
            } else {
                 toast({ title: "No gifts generated", description: "AI couldn't find any gifts. Try a different prompt.", variant: "destructive" });
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
    setAiSuggestions(null);
    setSelectedSuggestions(new Set());
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
      if (finalData.gifterMedia && !finalData.gifterMedia.url) {
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
             <Button type="button" onClick={handleGenerateGifts} disabled={isAiLoading} className="w-full">
                {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate Gift Ideas
             </Button>
          </CardContent>
        </Card>

        {aiSuggestions && (
            <Dialog open={!!aiSuggestions} onOpenChange={(open) => !open && setAiSuggestions(null)}>
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
                        </div>
                    </ScrollArea>
                    <DialogFooter className='sm:justify-between flex-col-reverse sm:flex-row gap-2'>
                        <p className="text-sm text-muted-foreground">{selectedSuggestions.size} selected</p>
                        <div className="flex gap-2">
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
            </CardHeader>
            <CardContent>
                 <Tabs defaultValue="card" className="w-full" onValueChange={(v) => form.setValue('gifterMedia.type', v as any)}>
                    <TabsList className='grid w-full grid-cols-3'>
                        <TabsTrigger value="card"><ImageIcon className='mr-2' /> Image Card</TabsTrigger>
                        <TabsTrigger value="audio"><Music className='mr-2' /> Audio Note</TabsTrigger>
                        <TabsTrigger value="video"><Video className='mr-2' /> Video Message</TabsTrigger>
                    </TabsList>
                    <TabsContent value="card" className='pt-4'>
                        <FileUploader 
                            mediaType="image"
                            acceptedFileTypes="image/*"
                            onUploadComplete={(url) => form.setValue('gifterMedia.url', url, { shouldValidate: true })}
                        />
                        <FormField control={form.control} name="gifterMedia.url" render={() => <FormMessage />} />
                    </TabsContent>
                    <TabsContent value="audio" className='pt-4'>
                         <FileUploader 
                            mediaType="audio"
                            acceptedFileTypes="audio/*"
                            onUploadComplete={(url) => form.setValue('gifterMedia.url', url, { shouldValidate: true })}
                        />
                         <FormField control={form.control} name="gifterMedia.url" render={() => <FormMessage />} />
                    </TabsContent>
                    <TabsContent value="video" className='pt-4'>
                         <FileUploader 
                            mediaType="video"
                            acceptedFileTypes="video/*"
                            onUploadComplete={(url) => form.setValue('gifterMedia.url', url, { shouldValidate: true })}
                        />
                         <FormField control={form.control} name="gifterMedia.url" render={() => <FormMessage />} />
                    </TabsContent>
                </Tabs>
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
