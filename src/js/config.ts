const CONFIG = {
  postsDir: "./content/posts",
  defaultAuthor: "Simon Hartcher",
  notion: {
    authToken: process.env.NOTION_TOKEN!,
    databaseId: process.env.NOTION_DATABASE_ID!,
  },
};

export default CONFIG;
