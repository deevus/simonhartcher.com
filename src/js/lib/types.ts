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

type RichTextArrayObjectResponse = ParagraphBlockObjectResponse['paragraph'];

export interface Properties {
  Date: DatePropertyItemObjectResponse;
  Published: DatePropertyItemObjectResponse;
  Name: {
    title: RichTextItemResponse[];
  };
  Description: RichTextArrayObjectResponse;
  Tags: MultiSelectPropertyItemObjectResponse;
  Author: RichTextPropertyItemObjectResponse;
  Tweet: RichTextPropertyItemObjectResponse;
  Slug: RichTextArrayObjectResponse;
  Featured: CheckboxPropertyItemObjectResponse;
  Public: CheckboxPropertyItemObjectResponse;
}

export type PageObjectResponseWithProperties = Omit<
  PageObjectResponse,
  "properties"
> & {
  properties: Properties;
};
