"use client";

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/autoplay';

interface ImageCarouselProps {
  images: {
    src: string;
    alt: string;
    title?: string;
    description?: string;
    link?: string;
  }[];
}

const ImageCarousel = ({ images }: ImageCarouselProps) => {
  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className="w-full rounded-lg overflow-hidden">
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={30}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        className="rounded-lg shadow-md"
      >
        {images.map((image, index) => (
          <SwiperSlide key={index} className="bg-white">
            <div className="relative">
              <img 
                src={image.src} 
                alt={image.alt} 
                className="w-full h-64 object-cover"
              />
              {(image.title || image.description) && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
                  {image.title && <h3 className="text-lg font-semibold">{image.title}</h3>}
                  {image.description && <p className="text-sm">{image.description}</p>}
                  {image.link && (
                    <a 
                      href={image.link} 
                      className="mt-2 inline-block text-sm text-blue-300 hover:text-blue-200"
                    >
                      Saiba mais →
                    </a>
                  )}
                </div>
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default ImageCarousel; 