"use client";

import * as React from "react";
import Image, { type ImageProps } from "next/image";

import { PROJECT_IMAGE_FALLBACK } from "@/lib/projects/utils";
import { PROJECT_MEDIA_PREFIX, protectedImageUrl } from "@/lib/images/project-image-url";

type ProjectImageProps = Omit<ImageProps, "src"> & {
  src?: string | null;
  fallbackSrc?: string;
};

export function ProjectImage({
  src,
  fallbackSrc = PROJECT_IMAGE_FALLBACK,
  alt,
  ...props
}: ProjectImageProps) {
  const safeSrc = protectedImageUrl(src) || fallbackSrc;
  const [failedSources, setFailedSources] = React.useState<Record<string, boolean>>({});
  const currentSrc = failedSources[safeSrc] ? fallbackSrc : safeSrc;
  const protectedSource = currentSrc.startsWith(PROJECT_MEDIA_PREFIX);

  return (
    <Image
      {...props}
      src={currentSrc}
      // A custom loader retains responsive srcset without using /_next/image
      // or a shared cache. The browser sends its session to each variant.
      loader={protectedSource ? ({ src, width, quality }) => `${src}?w=${width}&q=${quality ?? 75}` : props.loader}
      alt={alt}
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setFailedSources((current) => ({ ...current, [safeSrc]: true }));
        }
      }}
    />
  );
}
