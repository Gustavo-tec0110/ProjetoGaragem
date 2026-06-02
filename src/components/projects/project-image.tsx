"use client";

import * as React from "react";
import Image, { type ImageProps } from "next/image";

import { PROJECT_IMAGE_FALLBACK } from "@/lib/projects/utils";

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
  const safeSrc = src || fallbackSrc;
  const [failedSources, setFailedSources] = React.useState<Record<string, boolean>>({});
  const currentSrc = failedSources[safeSrc] ? fallbackSrc : safeSrc;

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setFailedSources((current) => ({ ...current, [safeSrc]: true }));
        }
      }}
    />
  );
}
