'use client';

import { useEffect, useRef, useCallback } from 'react';

interface CarouselImage {
  src: string;
  alt: string;
}

interface InfiniteCarouselProps {
  images: CarouselImage[];
  rowOneSpeed?: number;
  rowTwoSpeed?: number;
  hoverSlowMultiplier?: number;
}

export default function InfiniteCarousel({
  images,
  rowOneSpeed = 16,
  rowTwoSpeed = 13,
  hoverSlowMultiplier = 0.35,
}: InfiniteCarouselProps) {
  const track1Ref = useRef<HTMLDivElement>(null);
  const track2Ref = useRef<HTMLDivElement>(null);
  const positionsRef = useRef<[number, number]>([0, 0]);
  const lastTimestampRef = useRef<number>(0);
  const isHoveringRef = useRef(false);
  const animIdRef = useRef<number>(0);
  const initRef = useRef(false);

  // Split images into two rows (odd/even index)
  const row1Images = images.filter((_, i) => i % 2 === 0);
  const row2Images = images.filter((_, i) => i % 2 !== 0);

  const animate = useCallback(
    (timestamp: number) => {
      if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
      const delta = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      const tracks = [track1Ref.current, track2Ref.current];
      const speeds = [rowOneSpeed, rowTwoSpeed];
      const directions = [-1, 1] as const;

      tracks.forEach((track, i) => {
        if (!track) return;

        const speed = speeds[i];
        const currentSpeed = isHoveringRef.current
          ? speed * hoverSlowMultiplier
          : speed;
        const direction = directions[i];

        positionsRef.current[i] += currentSpeed * delta * direction;

        const halfWidth = track.scrollWidth / 2;

        // Seamless loop reset
        if (direction === -1 && Math.abs(positionsRef.current[i]) >= halfWidth) {
          positionsRef.current[i] = 0;
        }
        if (direction === 1 && positionsRef.current[i] >= 0) {
          positionsRef.current[i] = -halfWidth;
        }

        track.style.transform = `translate3d(${positionsRef.current[i]}px, 0, 0)`;
      });

      animIdRef.current = requestAnimationFrame(animate);
    },
    [rowOneSpeed, rowTwoSpeed, hoverSlowMultiplier]
  );

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    // Initialize row 2 to start from the middle (scrolled left) so it scrolls right
    const initTrack2 = () => {
      const track2 = track2Ref.current;
      if (track2 && track2.scrollWidth > 0) {
        const halfWidth = track2.scrollWidth / 2;
        positionsRef.current[1] = -halfWidth;
        track2.style.transform = `translate3d(${-halfWidth}px, 0, 0)`;
      }
    };

    // Wait for images to settle layout before starting animation
    const timeoutId = setTimeout(() => {
      initTrack2();
      animIdRef.current = requestAnimationFrame(animate);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [animate]);

  const handleMouseEnter = () => {
    isHoveringRef.current = true;
  };
  const handleMouseLeave = () => {
    isHoveringRef.current = false;
  };

  const renderCards = (imgs: CarouselImage[]) => {
    // Render images twice for seamless looping
    return [...imgs, ...imgs].map((img, i) => (
      <div key={i} className="hh-proof-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.src} alt={img.alt} />
      </div>
    ));
  };

  if (images.length === 0) return null;

  return (
    <section
      className="hh-proof-carousel"
      id="hh-proof-carousel-widget"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="hh-proof-carousel__backdrop" />
      <div className="hh-proof-carousel__inner">
        {/* Row 1 — scrolls left */}
        <div className="hh-proof-carousel__row">
          <div className="hh-proof-carousel__viewport">
            <div className="hh-proof-carousel__track" ref={track1Ref}>
              {renderCards(row1Images)}
            </div>
          </div>
        </div>

        {/* Row 2 — scrolls right */}
        <div className="hh-proof-carousel__row">
          <div className="hh-proof-carousel__viewport">
            <div className="hh-proof-carousel__track" ref={track2Ref}>
              {renderCards(row2Images)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
