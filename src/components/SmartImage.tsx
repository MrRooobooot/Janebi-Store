import React from 'react';
import PictureImage, { PictureImageProps } from './PictureImage';

interface SmartImageProps extends PictureImageProps {}

/**
 * SmartImage — Backwards-compatible wrapper that delegates to the optimized PictureImage pipeline.
 */
export default function SmartImage(props: SmartImageProps) {
  return <PictureImage {...props} />;
}
