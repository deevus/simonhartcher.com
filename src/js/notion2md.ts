import { Client } from "@notionhq/client";
import moment from "moment";
import fs from "fs";
import path from "path";
import { NotionToMarkdown } from "notion-to-md";
import {
  CheckboxPropertyItemObjectResponse,
  DatePropertyItemObjectResponse,
  Heading1BlockObjectResponse,
  ImageBlockObjectResponse,
  MultiSelectPropertyItemObjectResponse,
  PageObjectResponse,
  ParagraphBlockObjectResponse,
  PropertyItemObjectResponse,
  RichTextItemResponse,
  RichTextPropertyItemObjectResponse,
  TitlePropertyItemObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { partial } from "ramda";
import { ListBlockChildrenResponseResult } from "notion-to-md/build/types";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID!;
const n2md = new NotionToMarkdown({
  notionClient: notion,
});

const imageTransformer = async (
  assetPath: string,
  block: ListBlockChildrenResponseResult,
) => {
  const image = (block as ImageBlockObjectResponse).image;

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
  const imageFilename = `${block.id}.${imageExtension}`;
  const imageFilePath = path.join(assetPath, imageFilename);

  if (!fs.existsSync(assetPath)) {
    fs.mkdirSync(assetPath);
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
};

const CONFIG = {
  days: 7,
  postsDir: "./content/posts",
  assetsDir: "./assets/posts",
  filename: "blog_post",
  defaultAuthor: "Simon Hartcher",
};

const curTime = moment(Date.now());
const today = curTime.format("YYYY-MM-DD");
const startDay = moment(curTime)
  .subtract(CONFIG.days, "days")
  .format("YYYY-MM-DD");

function formatStr(str: string): string {
  const reg1 = /[<>'"]/g;
  const reg2 = /([^\n\r\t\s]*?)((http|https):\/\/[\w\-]+\.[\w\-]+[^\s]*)/g;

  if (!!str && str.trim()) {
    str = str.replace(reg1, "");
    const url = str.replace(
      reg2,
      (_a: string, b: string, c: string) => b + "<" + c + ">",
    );
    return url;
  }
  return str;
}

interface Properties {
  Date: DatePropertyItemObjectResponse;
  Published: DatePropertyItemObjectResponse;
  Name: {
    title: RichTextItemResponse[];
  };
  Description: ParagraphBlockObjectResponse["paragraph"];
  Tags: MultiSelectPropertyItemObjectResponse;
  Author: RichTextPropertyItemObjectResponse;
  Tweet: RichTextPropertyItemObjectResponse;
  Slug: RichTextPropertyItemObjectResponse;
  Featured: CheckboxPropertyItemObjectResponse;
  Public: CheckboxPropertyItemObjectResponse;
}

type PageObjectResponseWithProperties = PageObjectResponse & {
  properties: Properties;
};

function setMdImg(img: string, txt: string): string {
  let desc = txt ? `<small>${txt}</small>\n\n` : "";
  return `<img src="${img}" width="800" />\n\n${desc}`;
}

try {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [],
      sorts: [
        {
          property: "Published",
          direction: "ascending",
        },
      ],
    },
  });

  if (!response.results.length) {
    console.log("no data");
    process.exit(0);
  }

  console.log(`Number of pages: ${response.results.length}`);

  for (const page of response.results as PageObjectResponseWithProperties[]) {
    console.log("Processing page...");

    const isPublic = page.properties.Public.checkbox;
    if (!isPublic) {
      console.log("Page is not public");
      continue;
    }

    const cover = page.cover?.external?.url || page.cover?.file.url;
    const props = page.properties as Properties;

    const title = props.Name.title[0].plain_text;
    console.log(`Title: ${title}`);

    const author =
      props.Author.rich_text[0]?.plain_text ?? CONFIG.defaultAuthor;

    const description =
      props.Description?.rich_text.map((item) => item.plain_text).join("") ||
      "";
    const targetStr = formatStr(description);
    const tag = props.Tags.multi_select && props.Tags.multi_select[0]?.name;

    console.log(`Tag: ${tag || "No tag"}`);

    const oneImg = cover ? `![](${cover})` : "";

    const pageDate = moment(props.Published.date!.start).format("YYYY-MM-DD");
    const postName = `${pageDate}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const fileName = `${postName}.smd`;
    const filePath = path.join(CONFIG.postsDir, fileName);
    console.log(`Creating file: ${fileName}`);

    const pageImageTransformer = partial(imageTransformer, [
      path.join(CONFIG.postsDir, postName),
    ]);
    n2md.setCustomTransformer("image", pageImageTransformer);

    const mdBlocks = await n2md.pageToMarkdown(page.id);
    const content = n2md.toMarkdownString(mdBlocks);

    const mdContent = `---
.date = "${pageDate}",
.title = "${title}",
.description = "${description}",
.tags = ["${tag || ""}"],
.author = "${author}",
.layout = "post.shtml",
---

${content.parent}
`;

    fs.writeFileSync(filePath, mdContent);
    console.log("File written successfully\n");
  }
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
}
