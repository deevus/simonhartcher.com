declare module 'parse-srcset' {
  export interface ParsedSrcSet {
    d: number;
    url: string;
  }

  const parse: (srcset: string) => ParsedSrcSet[]

  export default parse;
}
