'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createDrop } from '@/actions/drop';
import { Loader2, Trash2, PlusCircle, Gift, Info, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';

const giftSchema = z.object({
  name: z.string().min(1, 'Gift name is required.'),
  image: z.string().url('Must be a valid image URL.').min(1, 'Image URL is required.'),
  platform: z.string().optional(),
});

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.').max(50, 'Title must be 50 characters or less.'),
  message: z.string().max(300, 'Message must be 300 characters or less.').optional(),
  gifts: z.array(giftSchema).min(1, 'You must add at least one gift.').max(5, 'You can add a maximum of 5 gifts.'),
  distributionMode: z.enum(['random', 'manual'], {
    required_error: 'You need to select a distribution mode.',
  }),
});

type CreateDropFormValues = z.infer<typeof formSchema>;

export function CreateDropForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateDropFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      message: '',
      gifts: [{ name: '', image: 'https://placehold.co/600x400.png', platform: '' }],
      distributionMode: 'random',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'gifts',
  });
  
  const watchedGifts = form.watch('gifts');

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
      const { id } = await createDrop(data as any, user.uid);
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
            <CardTitle className="flex items-center gap-2"><Gift className="text-primary"/> Gift Options</CardTitle>
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
                        name={`gifts.${index}.image`}
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Image URL</FormLabel>
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
                        <Image src={watchedGifts?.[index]?.image || 'https://placehold.co/400.png'} alt={`Preview for gift ${index + 1}`} layout="fill" objectFit="cover" className="rounded-md border bg-muted" data-ai-hint="gift present" />
                    </div>
                 </div>

                {fields.length > 1 && (
                  <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)} className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" /> Remove Gift
                  </Button>
                )}
              </div>
            ))}
            {fields.length < 5 && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => append({ name: '', image: 'https://placehold.co/600x400.png', platform: '' })}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Gift
              </Button>
            )}
             <FormField
                control={form.control}
                name="gifts"
                render={() => <FormMessage />}
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
        
        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            'Create Drop'
          )}
        </Button>
      </form>
    </Form>
  );
}
