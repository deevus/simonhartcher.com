const CONFIG = {
  days: 7,
  postsDir: "./content/posts",
  assetsDir: "./assets/posts",
  filename: "blog_post",
  defaultAuthor: "Simon Hartcher",
  notion: {
    authToken: process.env.NOTION_TOKEN!,
    databaseId: process.env.NOTION_DATABASE_ID!,
  }
};

export default CONFIG;
