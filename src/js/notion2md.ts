import { Client } from "@notionhq/client";
import moment from "moment";
import fs from "fs";
import path from "path";
import { NotionToMarkdown } from "notion-to-md";
import { converge, partial } from "ramda";
import { imageTransformer, processImageBlock } from "./lib/images";
import { PageObjectResponseWithProperties } from "./lib/types";
import CONFIG from "./config";
import { codeTransformer } from "./lib/transformers";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID!;

const n2md = new NotionToMarkdown({
  notionClient: notion,
});
n2md.setCustomTransformer("code", codeTransformer);

const curTime = moment(Date.now());
const today = curTime.format("YYYY-MM-DD");
const startDay = moment(curTime)
  .subtract(CONFIG.days, "days")
  .format("YYYY-MM-DD");

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

    const cover_image_url = (() => {
      if (page.cover) {
        switch (page.cover.type) {
          case "external":
            return page.cover.external.url;
          case "file":
            return page.cover.file.url;
        }
      }
    })();

    const props = page.properties;

    const title = props.Name.title[0].plain_text;
    console.log(`Title: ${title}`);

    const author =
      props.Author.rich_text[0]?.plain_text ?? CONFIG.defaultAuthor;

    const description =
      props.Description?.rich_text.map((item) => item.plain_text).join("") ||
      "";

    const tags = props.Tags.multi_select.map((item) => item.name);

    console.log(`Tags: ${tags}`);

    const oneImg = cover_image_url ? `![](${cover_image_url})` : "";

    const pageDate = moment(props.Published.date!.start).format("YYYY-MM-DD");
    const postName = `${pageDate}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const fileName = `${postName}.smd`;
    const filePath = path.join(CONFIG.postsDir, fileName);
    console.log(`Creating file: ${fileName}`);

    const postAssetDir = path.join(CONFIG.postsDir, postName);

    const cover = page.cover
      ? await processImageBlock(page.cover, {
          id: "cover",
          assetPath: postAssetDir,
        })
      : undefined;

    const pageImageTransformer = partial(imageTransformer, [postAssetDir]);
    n2md.setCustomTransformer("image", pageImageTransformer);

    const mdBlocks = await n2md.pageToMarkdown(page.id);

    var content = n2md.toMarkdownString(mdBlocks).parent;
    content = content.replace(/\(about:blank\#(fn|fnref)([0-9]+)\)/gm, "[$2]");

    const mdContent = `---
.date = "${pageDate}",
.title = "${title}",
.description = "${description}",
.tags = [${tags.map((tag) => `"${tag}"`).join(", ")}],
.author = "${author}",
.layout = "post.shtml",
---

${cover ?? ""}
${content}
`;

    fs.writeFileSync(filePath, mdContent);
    console.log("File written successfully\n");
  }
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
}
