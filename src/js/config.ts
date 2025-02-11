export interface AdditionalPage {
  title: string;
  pageId: string;
  importPath: string;
}

const CONFIG = {
  contentDir: "./content",
  postsDir: "./content/posts",
  assetsDir: "./assets/generated",
  defaultAuthor: "Simon Hartcher",
  notion: {
    authToken: process.env.NOTION_TOKEN!,
    databaseId: process.env.NOTION_DATABASE_ID!,
    additionalPages: [
      {
        title: "About",
        pageId: process.env.NOTION_ABOUT_PAGE_ID!,
        importPath: "about.smd",
      },
    ] satisfies AdditionalPage[],
  },
};

export default CONFIG;
