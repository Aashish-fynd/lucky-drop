"use client";

import React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Image from "next/image";

// --- DATA STRUCTURE INTERFACE ---
interface CardData {
  id: number;
  url: string;
  title?: string;
}

// --- PROPS INTERFACE ---
interface ImageSwiperProps {
  cards: CardData[];
  cardWidth?: number;
  cardHeight?: number;
  className?: string;
  onComplete?: () => void;
}

const ImageSwiper: React.FC<ImageSwiperProps> = ({
  cards,
  cardWidth = 256, // 16rem = 256px
  cardHeight = 352, // 22rem = 352px
  className = "",
  onComplete,
}) => {
  return (
    <Carousel
      opts={{
        align: "center",
        loop: true,
      }}
      className={cn("w-full max-w-sm mx-auto", className)}
    >
      <CarouselContent className="-ml-2 md:-ml-4">
        {cards.map((card) => (
          <CarouselItem key={card.id} className="pl-2 md:pl-4">
            <Card className="overflow-hidden border-2">
              <CardContent className="p-0 relative" style={{ width: cardWidth, height: cardHeight }}>
                <div className="relative w-full h-full">
                  <Image
                    src={card.url}
                    alt={card.title || `Card ${card.id}`}
                    fill
                    className="object-cover"
                    draggable={false}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = `https://placehold.co/${cardWidth}x${cardHeight}/2d3748/e2e8f0?text=Image+Not+Found`;
                    }}
                  />
                  {card.title && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                      <h3 className="font-bold text-xl text-white drop-shadow-lg">
                        {card.title}
                      </h3>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-0" />
      <CarouselNext className="right-0" />
    </Carousel>
  );
};

export default ImageSwiper;
