import nepalFlag from '@/app/business-images/nepal.png'
import usaFlag from '@/app/business-images/usa.png'

/**
 * The two flag files in app/business-images are drawn on white with different
 * amounts of padding around the flag, so each is cropped to the flag's own box
 * (`crop` is that box as fractions of the image), then scaled into a chip of the
 * requested height. Everything is computed from the crop, so re-measuring a file
 * only means changing two numbers here.
 */
const FLAGS = {
  ne: { src: nepalFlag, crop: { x: 0, y: 0, w: 1, h: 1 }, alt: 'Nepal' },
  // Measured from the file: the flag sits inside a white 512×512 canvas.
  en: { src: usaFlag, crop: { x: 0.041, y: 0.1953, w: 0.918, h: 0.6094 }, alt: 'United States' },
}

export const LANGUAGE_FLAGS = { ne: 'ne', en: 'en' }

export function Flag({ code, height = 16, className = '' }) {
  const config = FLAGS[code]
  if (!config) return null
  const { src, crop } = config
  const imageW = src.width
  const imageH = src.height

  const chipW = (height * (crop.w * imageW)) / (crop.h * imageH)
  const scale = height / (crop.h * imageH)
  const drawnW = imageW * scale
  const drawnH = imageH * scale

  return (
    <span
      aria-hidden="true"
      className={`relative inline-block shrink-0 overflow-hidden rounded-[3px] bg-white ${className}`}
      style={{ height, width: Math.round(chipW * 100) / 100 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static import, exact crop */}
      <img
        src={src.src}
        alt=""
        width={imageW}
        height={imageH}
        style={{
          position: 'absolute',
          width: Math.round(drawnW * 100) / 100,
          height: Math.round(drawnH * 100) / 100,
          left: -Math.round(crop.x * drawnW * 100) / 100,
          top: -Math.round(crop.y * drawnH * 100) / 100,
          maxWidth: 'none',
        }}
      />
    </span>
  )
}
