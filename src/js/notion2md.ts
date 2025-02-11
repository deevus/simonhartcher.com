import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import config from "./config";
import { ImageTransformer } from "./lib/images";
import { codeTransformer } from "./lib/transformers";
import { PageObjectResponseWithProperties } from "./lib/types";
import { Client } from "@notionhq/client";
import fs from "fs";
import moment from "moment";
import { NotionToMarkdown } from "notion-to-md";
import path from "path";
import { difference } from "ramda";

const notionClient = new Client({ auth: config.notion.authToken });
const databaseId = config.notion.databaseId;

fs.mkdirSync(config.postsDir, { recursive: true });
fs.mkdirSync(config.assetsDir, { recursive: true });

const existingFiles = new Set<string>();
fs.readdirSync(config.postsDir, { recursive: true, }).forEach((file) => existingFiles.add(path.join(config.postsDir, file)));
fs.readdirSync(config.assetsDir, { recursive: true }).forEach((file) => existingFiles.add(path.join(config.assetsDir, file)));

const referencedFiles = new Set<string>();

const n2md = new NotionToMarkdown({ notionClient });
n2md.setCustomTransformer("code", codeTransformer);

const response = await notionClient.databases.query({
  database_id: databaseId,
  sorts: [
    {
      property: "Published",
      direction: "ascending",
    },
  ],
});

if (!response.results.length) {
  console.log("no data");
  process.exit(0);
}

console.log(`Number of pages: ${response.results.length}`);

for (const page of response.results as PageObjectResponseWithProperties[]) {
  console.log("Processing page...");

  const props = page.properties;

  const title = props.Name.title[0].plain_text.trim();
  console.log(`Title: ${title}`);

  const isPublic = page.properties.Public.checkbox;
  if (!isPublic) {
    console.log(`Page is not public`);
    continue;
  }

  const author = props.Author.rich_text[0]?.plain_text ?? config.defaultAuthor;

  const description =
    props.Description?.rich_text.map((item) => item.plain_text).join("") || "";

  const tags = props.Tags.multi_select.map((item) => item.name);

  console.log(`Tags: ${tags}`);

  const pageDate = moment(props.Published.date!.start).format("YYYY-MM-DD");

  console.log("Slug", props.Slug);

  const sanitisedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const slug = sanitisedTitle;

  const fullSlug = `${pageDate}-${sanitisedTitle}`;

  const fileName = `${fullSlug}.smd`;
  const filePath = path.join(config.postsDir, fileName);
  console.log(`Creating file: ${fileName}`);

  referencedFiles.add(filePath);

  const postAssetDir = path.join(config.assetsDir, "posts", fullSlug);

  const imageTransformer = new ImageTransformer(postAssetDir);

  const cover = page.cover
    ? await imageTransformer.processImageBlock(page.cover, {
        id: "cover",
      })
    : undefined;

  n2md.setCustomTransformer("image", imageTransformer.transform);

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
.aliases = ["${slug}.html"],
.custom = {
  ${cover ? `.cover = "${cover.url}",` : ""}
},
---

${content}
`;

  fs.writeFileSync(filePath, mdContent);
  console.log("File written successfully\n");

  for (const file of imageTransformer.referencedFiles) {
    referencedFiles.add(file);
  }
}

// process any additional pages
for (const page of config.notion.additionalPages) {
  const filePath = path.join(config.contentDir, page.importPath);
  console.log(`Creating file: ${page.importPath}`);

  referencedFiles.add(filePath);

  const notionPage = await notionClient.pages.retrieve({
    page_id: page.pageId,
  }) as PageObjectResponse;

  const mdBlocks = await n2md.pageToMarkdown(notionPage.id);

  const content = n2md.toMarkdownString(mdBlocks).parent;

  const imageTransformer = new ImageTransformer(path.join(config.assetsDir, path.basename(filePath, ".smd")));

  const cover = notionPage.cover && await imageTransformer.processImageBlock(notionPage.cover, {
    id: "cover",
  });

  const mdContent = `---
.title = "${page.title}",
.layout = "page.shtml",
.author = "${config.defaultAuthor}",
.date = "${moment().format("YYYY-MM-DD")}",
.tags = [],
.custom = {
  ${cover ? `.cover = "${cover.url}",` : ""}
},
---

${content}
`;

  fs.writeFileSync(filePath, mdContent);
  console.log("File written successfully\n");
}

const directories = new Set<string>();
for (const file of referencedFiles) {
  directories.add(path.dirname(file));
}
for (const dir of directories) {
  referencedFiles.add(dir);
}

const unusedFiles = difference(
  Array.from(existingFiles),
  Array.from(referencedFiles),
);

for (const file of unusedFiles) {
  if (fs.existsSync(file)) {
    const stat = fs.statSync(file);

    if (stat.isFile()) {
      fs.unlinkSync(file);
      console.log(`Removed unused file: ${file}`);
    } else if (stat.isDirectory()) {
      fs.rmdirSync(file, { recursive: true });
      console.log(`Removed unused directory: ${file}`);
    }
  }
}
