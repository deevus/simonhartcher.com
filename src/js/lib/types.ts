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

export interface Properties {
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

export type PageObjectResponseWithProperties = Omit<
  PageObjectResponse,
  "properties"
> & {
  properties: Properties;
};
