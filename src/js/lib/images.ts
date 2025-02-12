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

type ImageResults = Record<keyof typeof imageSizes, string>;

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
  id: string;
  className?: string;
}

export class ImageTransformer {
  assetPath: string;
  referencedFiles: Set<string>;

  constructor(assetPath: string) {
    this.assetPath = assetPath;
    this.referencedFiles = new Set();
  }

  transform = async (block: ListBlockChildrenResponseResult) => {
    const result = await this.processImageBlock(
      (block as ImageBlockObjectResponse).image,
      {
        id: block.id,
      },
    );

    return result.markdown;
  };

  processImageBlock = async (
    image: ImageDetails,
    options: ProcessImageBlockOptions,
  ) => {
    console.log(`Processing image block: ${options.id}`);
    
    var imageUrl: string | undefined;

    const originalWebpPath = path.join(this.assetPath, `${options.id}-original.webp`);

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
    const contentType = imageResponse.headers.get("content-type");

    var imageExtension: string;
    switch (contentType) {
      case "image/jpeg":
        imageExtension = "jpg";
        break;
      case "image/png":
        imageExtension = "png";
        break;
      case "image/gif":
        imageExtension = "gif";
        break;
      case "image/webp":
        imageExtension = "webp";
        break;
      default:
        imageExtension = "jpg";
        break;
    }

    const imageFilename = `${options.id}.${imageExtension}`;
    const imageFilePath = path.join(this.assetPath, imageFilename);

    fs.mkdirSync(this.assetPath, { recursive: true });

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageMetadata = await sharp(imageBuffer).metadata();

    const dimensions: ImageSize = {
      width: imageMetadata.width!,
      height: imageMetadata.height!,
    }

    const results = await this.resizeImage(options.id, imageBuffer, this.assetPath);

    const rawHtml = createImageHTML(results, {
      altText: "Image",
      className: options.className,
    });

    return {
      url: results.large,
      markdown: "```=html\n" + rawHtml + "\n```\n",
      rawHtml,
    };
  };

  resizeImage = async (
    id: string,
    input: string | ArrayBuffer,
    outputDir: string,
    baseName: string | undefined = undefined,
  ): Promise<ImageResults> => {
    const results = {} as ImageResults;

    try {
      // Ensure the output directory exists
      fs.mkdirSync(outputDir, {
        recursive: true,
      });

      for (const sizeName in imageSizes) {
        const size = imageSizes[sizeName];
        const fileName = `${id}-${sizeName}.webp`;

        const outputFilePath = path.join(outputDir, fileName); // Save as WebP

        results[sizeName] = fileName;

        this.referencedFiles.add(outputFilePath);

        // Skip if file already exists
        if (fs.existsSync(outputFilePath)) {
          console.log(`File already exists: ${outputFilePath}`);
          continue;
        }

        const image = sharp(input, {
          animated: true,
        })
          .webp({ quality: 80, smartSubsample: true })
          .withMetadata();

        if (size) {
          // Resize the image
          image
            .resize(size.width, size.height, {
              fit: sharp.fit.inside, // Maintain aspect ratio, fit within bounds
              withoutEnlargement: true, // Prevent upscaling smaller images
            })
            .toFile(outputFilePath);

          console.log(`Resized to ${sizeName}: ${outputFilePath}`);
        } else {
          // For the "original" size
          image.toFile(outputFilePath);
          console.log(`Output original size to: ${outputFilePath}`);
        }
      }
    } catch (error) {
      console.error("Error resizing image:", error);
      throw error; // Re-throw the error to be handled by the caller
    }

    return results;
  };
}

function createImageHTML(
  imageResults: ImageResults,
  options: {
    altText: string;
    baseSize?: keyof typeof imageSizes;
    className?: string;
  }
): string {
  const baseSize = options.baseSize ?? "medium";
  var baseUrl = imageResults[baseSize];

  const imageAsset = (url: string) => `${url}`;

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

    // Map size names to appropriate x descriptors for retina displays
    let retinaMultiplier = 1;
    switch (sizeName) {
      case "medium":
      case "large":
        retinaMultiplier = 2;
        break;
      case "xlarge":
        retinaMultiplier = 3;
        break;
      case "small":
      default:
        retinaMultiplier = 1;
    }

    const url = imageResults[sizeName];
    srcset += `${imageAsset(url)} ${retinaMultiplier}x, `;
  }

  // Remove the trailing comma
  if (srcset.length > 0) {
    srcset = srcset.slice(0, -1);
  }

  // Define sizes attribute (adjust these based on your layout)
  const sizes = "100vw"; // Simple viewport width sizing

  const html = `<img src="${imageAsset(baseUrl)}" class="${options.className ?? ""}" alt="${options.altText}" srcset="${srcset}" sizes="${sizes}">`;
  return html;
}
