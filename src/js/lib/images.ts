import fs from "fs";
import path from "path";
import { ImageBlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { ListBlockChildrenResponseResult } from "notion-to-md/build/types";

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

  return `[]($image.asset("${imageFilename}"))`;
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
