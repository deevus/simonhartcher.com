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
  thumbnail2x: { width: 600, height: 400 }, // 2x thumbnail
  thumbnail3x: { width: 900, height: 600 }, // 3x thumbnail
  small: { width: 600, height: 400 },
  small2x: { width: 1200, height: 800 }, // 2x small
  small3x: { width: 1800, height: 1200 }, // 3x small
  medium: { width: 900, height: 600 },
  medium2x: { width: 1800, height: 1200 }, // 2x medium
  medium3x: { width: 2700, height: 1800 }, // 3x medium
  large: { width: 1200, height: 800 },
  large2x: { width: 2400, height: 1600 }, // 2x large
  large3x: { width: 3600, height: 2400 }, // 3x large
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
}

export class ImageTransformer {
  assetPath: string;
  referencedFiles: Set<string>;

  constructor(assetPath: string) {
    this.assetPath = assetPath;
    this.referencedFiles = new Set();
  }

  transform = async (
    block: ListBlockChildrenResponseResult,
  ) => {
    const result = await this.processImageBlock((block as ImageBlockObjectResponse).image, {
      id: block.id,
    });

    return result;
  }

  processImageBlock = async (
    image: ImageDetails,
    options: ProcessImageBlockOptions,
  ) => {
    var imageUrl: string | undefined;
    switch (image.type) {
      case "external":
        imageUrl = image.external.url;
        break;
      case "file":
        imageUrl = image.file.url;
        break;
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
      default:
        imageExtension = "jpg";
        break;
    }

    const imageFilename = `${options.id}.${imageExtension}`;
    const imageFilePath = path.join(this.assetPath, imageFilename);

    this.referencedFiles.add(imageFilePath)

    if (!fs.existsSync(this.assetPath)) {
      fs.mkdirSync(this.assetPath);
    }

    if (!fs.existsSync(imageFilePath)) {
      await sharp(await imageResponse.arrayBuffer()).toFile(imageFilePath)
    }

    const results = await this.resizeImage(imageFilePath, this.assetPath);

    return `[]($image.asset("${results.large}"))`;
  }

  resizeImage = async (
    inputImagePath: string,
    outputDir: string,
    baseName: string | undefined = undefined,
  ): Promise<ImageResults> => {
    const results = {} as ImageResults;

    try {
      // Ensure the output directory exists
      fs.mkdirSync(outputDir, {
        recursive: true,
      });

      const inputFileBaseName = baseName || path.parse(inputImagePath).name; // Extract filename without extension

      for (const sizeName in imageSizes) {
        const size = imageSizes[sizeName];
        const fileName = `${inputFileBaseName}-${sizeName}.webp`;

        const outputFilePath = path.join(outputDir, fileName); // Save as WebP

        results[sizeName] = fileName;

        this.referencedFiles.add(outputFilePath)

        // Skip if file already exists
        if (fs.existsSync(outputFilePath)) {
          console.log(`File already exists: ${outputFilePath}`);
          continue;
        }

        const image = sharp(inputImagePath, {
          animated: true,
        }).webp({ quality: 80 });

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
  }
};
