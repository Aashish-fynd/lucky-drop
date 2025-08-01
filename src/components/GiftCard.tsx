'use client';

import type { Gift } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import Image from "next/image";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

interface GiftCardProps {
  gift: Gift;
  onSelect?: (giftId: string) => void;
  isSelectable?: boolean;
  isPending?: boolean;
}

export function GiftCard({ gift, onSelect, isSelectable = true, isPending = false }: GiftCardProps) {
  return (
    <Card className={`transition-all duration-300 overflow-hidden group ${isSelectable && onSelect ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer' : ''}`}>
      <CardHeader className="p-0 border-b">
        <div className="aspect-video relative w-full overflow-hidden">
          <Image 
            src={gift.image} 
            alt={gift.name} 
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ objectFit: 'cover' }} 
            className="transition-transform duration-300 group-hover:scale-105"
            data-ai-hint="gift present"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <h3 className="text-lg font-bold font-headline truncate" title={gift.name}>{gift.name}</h3>
        {gift.platform && <p className="text-sm text-muted-foreground">{gift.platform}</p>}
      </CardContent>
      {isSelectable && onSelect && (
        <CardFooter className="p-4 pt-0">
          <Button className="w-full" onClick={() => onSelect(gift.id)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Choose this gift" }
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
