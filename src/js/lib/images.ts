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
  assetPath: string;
}

export async function processImageBlock(
  image: ImageDetails,
  options: ProcessImageBlockOptions,
) {
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

  const imageReader = imageResponse.body!.getReader();
  const imageFilename = `${options.id}.${imageExtension}`;
  const imageFilePath = path.join(options.assetPath, imageFilename);

  if (!fs.existsSync(options.assetPath)) {
    fs.mkdirSync(options.assetPath);
  }

  // if image exists, get modified time
  if (!fs.existsSync(imageFilePath)) {
    const imageFile = fs.createWriteStream(imageFilePath);

    while (true) {
      const { done, value } = await imageReader.read();

      if (value) {
        imageFile.write(value);
      }

      if (done) {
        break;
      }
    }
  }

  const results = await resizeImage(imageFilePath, options.assetPath);

  return `[]($image.asset("${results.large}"))`;
}

export const imageTransformer = async (
  assetPath: string,
  block: ListBlockChildrenResponseResult,
) => {
  return processImageBlock((block as ImageBlockObjectResponse).image, {
    id: block.id,
    assetPath,
  });
};

async function resizeImage(
  inputImagePath: string,
  outputDir: string,
  baseName: string | undefined = undefined,
): Promise<ImageResults> {
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
