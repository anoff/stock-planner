declare module "encoding-japanese" {
  interface ConvertOptions {
    to: string;
    from: string;
  }
  function detect(data: Uint8Array | number[]): string | false;
  function convert(data: Uint8Array | number[], options: ConvertOptions): number[];
  function codeToString(codeArray: number[]): string;
  export default { detect, convert, codeToString };
  export { detect, convert, codeToString };
}
