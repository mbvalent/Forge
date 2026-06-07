'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface BackgroundCarouselProps {
  images: string[]
}

export function BackgroundCarousel({ images }: BackgroundCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (images.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, 10000)

    return () => clearInterval(interval)
  }, [images.length])

  if (images.length === 0) return null

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-background">
      {images.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt={`Background carousel image ${index + 1}`}
          fill
          priority={index === 0}
          className={`object-cover transition-opacity duration-1000 ${
            index === currentIndex ? 'opacity-80' : 'opacity-0'
          }`}
        />
      ))}
      {/* Lighter gradient overlay since the images are naturally dark */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-background/20 to-transparent" />
    </div>
  )
}
