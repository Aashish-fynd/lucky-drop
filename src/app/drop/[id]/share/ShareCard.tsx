'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, Copy, Download, PartyPopper } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export function ShareCard({ dropId }: { dropId: string }) {
  const { toast } = useToast();
  const [shareUrl, setShareUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    // This effect runs only on the client-side
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/drop/${dropId}`;
      setShareUrl(url);
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&bgcolor=f0f8fa`);
    }
  }, [dropId]);

  const copyToClipboard = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setHasCopied(true);
      toast({
        title: "Copied!",
        description: "The share link has been copied to your clipboard.",
      });
      setTimeout(() => setHasCopied(false), 2000);
    }).catch(err => {
        toast({
            title: "Error",
            description: err.message || "Could not copy link to clipboard.",
            variant: "destructive"
        })
    });
  };
  
  const downloadQrCode = async () => {
    if (!qrUrl) return;
    try {
      const response = await fetch(qrUrl);
      if (!response.ok) throw new Error('Network response was not ok.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lucky-drop-qr-${dropId}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({
        title: "Downloaded!",
        description: "The QR code has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not download the QR code.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl animate-in fade-in-50 zoom-in-90 duration-500">
      <CardHeader className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
            <PartyPopper className="h-8 w-8" />
        </div>
        <CardTitle className="text-2xl font-headline mt-4">Your Drop is Ready!</CardTitle>
        <CardDescription>Share this link or QR code with the lucky recipient.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <label className="text-sm font-medium">Share Link</label>
            <div className="flex items-center space-x-2">
                <Input value={shareUrl} readOnly className="text-muted-foreground" />
                <Button variant="outline" size="icon" onClick={copyToClipboard} aria-label="Copy link">
                    {hasCopied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                </Button>
            </div>
        </div>
        <div className="space-y-4 text-center">
            <label className="text-sm font-medium block">QR Code</label>
            {qrUrl ? 
                <div className="p-4 border rounded-lg inline-block bg-white">
                    <Image src={qrUrl} alt="QR Code" width={200} height={200} unoptimized data-ai-hint="qr code" />
                </div>
            : <div className="p-4 border rounded-lg inline-block bg-white h-[200px] w-[200px]"></div> }
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2">
        <Button className="w-full bg-accent hover:bg-accent/90" onClick={downloadQrCode}>
          <Download className="mr-2 h-4 w-4" />
          Download QR
        </Button>
         <Button variant="outline" className="w-full" asChild>
            <Link href="/dashboard"><ArrowLeft className="mr-2"/> Back to Dashboard</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}