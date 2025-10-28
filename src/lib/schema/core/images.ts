import type { ImageObject } from '../types'

interface ImageInput {
  url: string
  caption?: string | null
  alt_text?: string | null
  width?: number | null
  height?: number | null
}

/**
 * Transforms photo data into ImageObject array
 *
 * @param images - Array of image data from database
 * @returns Array of ImageObject schemas
 */
export function generateImagesSchema(images: ImageInput[]): ImageObject[] {
  return images
    .filter(img => img.url) // Skip images with missing URLs
    .map(img => {
      const imageObject: ImageObject = {
        "@type": "ImageObject",
        url: img.url
      }

      // Add caption (use alt_text as fallback)
      if (img.caption) {
        imageObject.caption = img.caption
      } else if (img.alt_text) {
        imageObject.caption = img.alt_text
      }

      // Add dimensions (must be strings per schema.org)
      if (img.width) {
        imageObject.width = String(img.width)
      }
      if (img.height) {
        imageObject.height = String(img.height)
      }

      return imageObject
    })
}
