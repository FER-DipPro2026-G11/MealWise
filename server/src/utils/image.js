import sharp from "sharp";

export const AVATAR_SIZE = 512;
export const MAX_UPLOAD_MB = 20;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const MAX_MEGAPIXELS = 50;
const PROCESSING_TIMEOUT_SECONDS = 15;

// Only let libvips (the library inside sharp) decode the formats browsers
// actually upload. Everything else (SVG, TIFF, PDF, RAW, ...) is rejected
// before it's parsed, which removes most of the attack surface.
sharp.block({ operation: ["VipsForeignLoad"] });
sharp.unblock({
    operation: [
        "VipsForeignLoadJpegBuffer",
        "VipsForeignLoadUhdrBuffer", // Ultra HDR JPEGs from newer Android phones
        "VipsForeignLoadPngBuffer",
        "VipsForeignLoadWebpBuffer",
        "VipsForeignLoadNsgifBuffer",
        "VipsForeignLoadHeifBuffer", // AVIF
    ],
});
sharp.cache(false);
sharp.concurrency(1);

export class ImageError extends Error {
    constructor(code, message, params) {
        super(message);
        this.code = code;
        this.params = params;
    }
}

// Turns any supported image into a 512x512 WebP: rotated upright using the
// photo's EXIF orientation and cropped to a centered square. WebP (unlike
// JPEG) keeps transparency, so transparent backgrounds stay transparent.
// The output has no metadata (EXIF, GPS location).
export async function toAvatarWebp(input) {
    const maxPixels = MAX_MEGAPIXELS * 1_000_000;

    let metadata;
    try {
        // Reads only the file header (nothing is decoded yet), so it's fast
        // and safe even for huge images; checked against the limit below.
        metadata = await sharp(input, { limitInputPixels: false }).metadata();
    } catch {
        throw invalidImage();
    }
    if (!metadata.width || !metadata.height) throw invalidImage();
    if (metadata.width * metadata.height > maxPixels) {
        throw new ImageError(
            "IMAGE_DIMENSIONS_TOO_LARGE",
            `Image is larger than ${MAX_MEGAPIXELS} megapixels`,
            { maxMegapixels: MAX_MEGAPIXELS },
        );
    }

    try {
        // limitInputPixels again as a safety net while actually decoding.
        return await sharp(input, {
            limitInputPixels: maxPixels,
            sequentialRead: true,
        })
            .rotate()
            .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
            .webp({ quality: 85 })
            .timeout({ seconds: PROCESSING_TIMEOUT_SECONDS })
            .toBuffer();
    } catch {
        // Corrupt or truncated file, or it took too long to process.
        throw invalidImage();
    }
}

function invalidImage() {
    return new ImageError(
        "INVALID_IMAGE",
        "Not a valid JPEG, PNG, WebP, GIF or AVIF image",
    );
}
