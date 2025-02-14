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
import { execSync } from "child_process";

const notionClient = new Client({ auth: config.notion.authToken });
const databaseId = config.notion.databaseId;

fs.mkdirSync(config.postsDir, { recursive: true });
fs.mkdirSync(config.assetsDir, { recursive: true });

const existingFiles = new Set<string>();
fs.readdirSync(config.postsDir, { recursive: true, }).forEach((file) => existingFiles.add(path.join(config.postsDir, file)));
fs.readdirSync(config.assetsDir, { recursive: true }).forEach((file) => existingFiles.add(path.join(config.assetsDir, file)));

const referencedFiles = new Set<string>();
referencedFiles.add(path.join(config.assetsDir, "styles.css"));
referencedFiles.add(path.join(config.assetsDir, "pico.violet.min.css"));

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
    ? await imageTransformer.processImageBlock({
      id: "cover",
      image: page.cover,
    }, {
      className: "cover",
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
.aliases = ["${slug}/index.html"],
.custom = {
  ${cover ? `.cover = "${cover.rawHtml.replace(/"/gm, "'")}",` : ""}
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

  const cover = notionPage.cover && await imageTransformer.processImageBlock({
    id: "cover",
    image: notionPage.cover,
  }, {
    className: "cover",
  });

  const mdContent = `---
.title = "${page.title}",
.layout = "page.shtml",
.author = "${config.defaultAuthor}",
.date = "${moment().format("YYYY-MM-DD")}",
.tags = [],
.custom = {
  ${cover ? `.cover = "${cover.rawHtml.replace(/"/gm, "'")}",` : ""}
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

const directories = new Set<string>();
for (const file of referencedFiles) {
  directories.add(path.dirname(file));
}
for (const dir of directories) {
  referencedFiles.add(dir);
}

const unusedEntries = difference(
  Array.from(existingFiles),
  Array.from(referencedFiles),
);

const unusedFiles = unusedEntries.filter((file) => fs.statSync(file).isFile());
const unusedDirectories = difference(unusedEntries, unusedFiles);

// cleanup unused files
for (const file of unusedFiles) {
  fs.unlinkSync(file);
  console.log(`Removed unused file: ${file}`);
}

// cleanup empty directories
for (const dir of unusedDirectories) {
  if (fs.readdirSync(dir).length) {
    continue;
  }

  fs.rmdirSync(dir);
  console.log(`Removed empty directory: ${dir}`);
}

// generate a assets.zon file
console.log("Generating assets.zig file...");

const assetFiles = Array.from(referencedFiles).filter((file) => file.startsWith("assets") && fs.statSync(file).isFile());

const writer = fs.createWriteStream("assets.zig", { flags: "w" });
writer.write("pub const assets = [_][]const u8{");

for (const file of assetFiles) {
  console.log(`Adding asset: ${file}`);
  const relativePath = path.relative("assets", file);
  writer.write(`${JSON.stringify(relativePath)},`);
}

writer.write("};");
writer.close();

// fmt the file using `zig fmt`
console.log("Formatting assets.zon file...");
execSync("zig fmt assets.zig");

console.log("Done");