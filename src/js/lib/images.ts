import fs from "fs";
import path from "path";
import { ImageBlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { ListBlockChildrenResponseResult } from "notion-to-md/build/types";
import sharp from "sharp";

interface ImageSize {
  width: number;
  height: number;
}

const imageSizes = {
  thumbnail: { width: 300, height: 200 },
  small: { width: 600, height: 400 },
  medium: { width: 900, height: 600 },
  large: { width: 1200, height: 800 },
  xlarge: { width: 1800, height: 1200 },
  original: null,
} satisfies Record<string, ImageSize | null>;

type ImageSizeNames = keyof typeof imageSizes;

type ImageResults = Record<ImageSizeNames, string>;

type ImageDetails =
  | {
    type: "external";
    external: {
      url: string;
    };
  }
  | {
    type: "file";
    file: {
      url: string;
    };
  };

interface ProcessImageBlockOptions {
  className?: string;
}

export class ImageTransformer {
  outDir: string;
  referencedFiles: Set<string>;

  constructor(outDir: string) {
    this.outDir = outDir;
    this.referencedFiles = new Set();
  }

  transform = async (block: ListBlockChildrenResponseResult) => {
    const result = await this.processImageBlock(block as ImageBlockObjectResponse);

    return result.markdown;
  };

  processImageBlock = async (
    imageBlock: {
      id: string;
      image: ImageDetails;
    },
    options: ProcessImageBlockOptions = {},
  ) => {
    const { id, image } = imageBlock;

    console.log(`Processing image block: ${id}`);

    var imageUrl: string | undefined;

    const originalWebpPath = path.join(this.outDir, `${id}-original.webp`);

    console.log("Checking if local file exists: ", originalWebpPath);

    if (fs.existsSync(originalWebpPath)) {
      imageUrl = `file://${path.join(process.cwd(), originalWebpPath)}`;
      console.log("Local file exists, using it: ", imageUrl);
    } else {
      switch (image.type) {
        case "external":
          imageUrl = image.external.url;
          break;
        case "file":
          imageUrl = image.file.url;
          break;
      }

      console.log("Local file does not exist, fetching: ", imageUrl);
    }

    const imageResponse = await fetch(imageUrl);

    fs.mkdirSync(this.outDir, { recursive: true });

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageMetadata = await sharp(imageBuffer).metadata();

    const dimensions: ImageSize = {
      width: imageMetadata.width!,
      height: imageMetadata.height!,
    }

    // Ensure the output directory exists
    fs.mkdirSync(this.outDir, {
      recursive: true,
    });

    const results = await this.resizeImage({
      id,
      input: imageBuffer,
      outputDir: this.outDir,
      dimensions,
    });

    const rawHtml = this.createImageHTML(results, {
      altText: "Image",
      className: options.className,
      baseSize: this.getClosestSizeName(dimensions),
      outDir: this.outDir.replace(/^assets\//, ""),
    });

    return {
      url: results.large,
      markdown: "```=html\n" + rawHtml + "\n```\n",
      rawHtml,
    };
  };

  getClosestSizeName = (dimensions: ImageSize): Exclude<ImageSizeNames, "original"> => {
    type SizeName = Exclude<ImageSizeNames, "original">;

    var closest: SizeName | undefined = undefined;
    var minDistance = Infinity;

    for (const sizeName in imageSizes) {
      if (sizeName == "original") continue;
      const { width, height } = imageSizes[sizeName as SizeName];

      const distance = Math.sqrt((dimensions.width - width) ** 2 + (dimensions.height - height) ** 2);

      if (distance < minDistance) {
        minDistance = distance;
        closest = sizeName as SizeName;
      }
    }

    return closest!;
  }

  getImage = (input: ArrayBuffer) => sharp(input, {
    animated: true,
  })
    .webp({ quality: 80, smartSubsample: true })
    .withMetadata()

  resizeImage = async (options: {
    id: string,
    outputDir: string,
    input: ArrayBuffer,
    dimensions: ImageSize,
  }): Promise<ImageResults> => {
    const { id, outputDir, input, dimensions } = options;
    const results = {} as ImageResults;

    const closestSizeName = this.getClosestSizeName(dimensions);
    const closestSize = imageSizes[closestSizeName]!;

    console.log("Closest size name for dimensions: ", closestSizeName, dimensions);

    try {
      for (const sizeName in imageSizes) {
        const size = imageSizes[sizeName as keyof typeof imageSizes];
        const fileName = `${id}-${sizeName}.webp`;
        const outputFilePath = path.join(outputDir, fileName); // Save as WebP

        let skip = false;
        let resize: ImageSize | false = false;

        if (size) {
          if (size.width > closestSize.width) {
            console.log(`Skipping ${sizeName} size as it is larger than the closest size: ${closestSizeName}.`);
            skip = true;
          } else {
            console.log(`Resizing to ${sizeName}.`);
            resize = size;
          }
        }

        if (!skip) {
          if (fs.existsSync(outputFilePath)) {
            console.log(`Image for ${sizeName} already exists.`);
          } else {
            // Load the image into Sharp
            let image = this.getImage(input);

            // Resize the image
            if (resize) {
              image = image.resize(resize.width, resize.height, {
                fit: sharp.fit.inside, // Maintain aspect ratio, fit within bounds
                withoutEnlargement: true, // Prevent upscaling smaller images
              });
            }

            console.log(`Saving ${sizeName} to: ${outputFilePath}.`);
            await image.toFile(outputFilePath);
          }

          results[sizeName] = fileName;
          this.referencedFiles.add(outputFilePath);
        }
      }
    } catch (error) {
      console.error("Error resizing image:", error);
      throw error; // Re-throw the error to be handled by the caller
    }

    return results;
  };

  createImageHTML = (
    imageResults: ImageResults,
    options: {
      altText: string;
      baseSize?: keyof typeof imageSizes;
      className?: string;
      outDir?: string;
    }
  ): string => {
    const baseSize = options.baseSize ?? "medium";
    var baseUrl = imageResults[baseSize];

    const imageAsset = (url: string) => "/" + path.relative("assets", path.join(options.outDir ?? "", url)).replace(/\\/g, "/");

    if (!baseUrl) {
      console.warn(
        `Base size "${baseSize}" not found in imageResults.  Using a fallback.`,
      );
      // Find the first available URL as a fallback
      const firstKey = Object.keys(imageResults)[0] as keyof ImageResults;
      if (firstKey) {
        baseUrl = imageResults[firstKey];
      } else {
        return `<img src="" alt="${options.altText}" class="${options.className ?? ""}">`;
      }
    }

    let srcset = "";
    for (const sizeName in imageResults) {
      if (sizeName === "original") continue; // Skip the original image in srcset

      const width = imageSizes[sizeName as ImageSizeNames]!.width;
      const url = imageResults[sizeName];

      srcset += `${imageAsset(url)} ${width}w, `;
    }

    // Remove the trailing comma
    if (srcset.length > 0) {
      srcset = srcset.slice(0, -1);
    }

    // Define sizes attribute (adjust these based on your layout)
    const sizes = "100vw"; // Simple viewport width sizing

    const html = `<picture><source type="image/webp" srcset="${srcset}" sizes="${sizes}"><img src="${imageAsset(baseUrl)}" alt="${options.altText}" class="${options.className ?? ""}"></picture>`;
    return html;
  };
}
