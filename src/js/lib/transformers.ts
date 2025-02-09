import { CodeBlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import {
  Annotations,
  CustomTransformer,
  Equation,
  Text,
} from "notion-to-md/build/types";
import * as md from "notion-to-md/build/utils/md";

const languageMap: Record<string, string> = {
  "c#": "c-sharp",
  shell: "bash",
};

const unsupportedLanguages = [
  "plain text",
  "plaintext",
  "text",
  "powershell",
  "scala",
  "glsl",
];

function getLanguage(block: CodeBlockObjectResponse): string | undefined {
  const blockLanguage = block.code.language;

  if (blockLanguage in languageMap) {
    return languageMap[blockLanguage];
  }

  if (unsupportedLanguages.includes(blockLanguage)) {
    return undefined;
  }

  return blockLanguage;
}

export const codeTransformer: CustomTransformer = (block) => {
  const { type } = block as CodeBlockObjectResponse;

  var parsedData = "";
  let blockContent = block[type].text || block[type].rich_text || [];

  blockContent.map((content: Text | Equation) => {
    if (content.type === "equation") {
      parsedData += md.inlineEquation(content.equation.expression);
      return;
    }

    const annotations = content.annotations;
    let plain_text = content.plain_text;

    plain_text = annotatePlainText(plain_text, annotations);

    if (content["href"]) plain_text = md.link(plain_text, content["href"]);

    parsedData += plain_text;
  });

  return md.codeBlock(
    parsedData,
    getLanguage(block as CodeBlockObjectResponse) ?? "",
  );
};
/**
 * Annoate text using provided annotations
 * @param {string} text - String to be annotated
 * @param {Annotations} annotations - Annotation object of a notion block
 * @returns {string} - Annotated text
 */
function annotatePlainText(text: string, annotations: Annotations): string {
  // if text is all spaces, don't annotate
  if (text.match(/^\s*$/)) return text;

  const leadingSpaceMatch = text.match(/^(\s*)/);
  const trailingSpaceMatch = text.match(/(\s*)$/);

  const leading_space = leadingSpaceMatch ? leadingSpaceMatch[0] : "";
  const trailing_space = trailingSpaceMatch ? trailingSpaceMatch[0] : "";

  text = text.trim();

  if (text !== "") {
    if (annotations.code) text = md.inlineCode(text);
    if (annotations.bold) text = md.bold(text);
    if (annotations.italic) text = md.italic(text);
    if (annotations.strikethrough) text = md.strikethrough(text);
    if (annotations.underline) text = md.underline(text);
  }

  return leading_space + text + trailing_space;
}
