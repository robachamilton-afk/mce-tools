/**
 * TypeScript declarations for pdf-poppler
 * https://www.npmjs.com/package/pdf-poppler
 */

declare module 'pdf-poppler' {
  export interface ConvertOptions {
    format?: 'png' | 'jpg' | 'jpeg';
    out_dir?: string;
    out_prefix?: string;
    page?: number | null;
    scale?: number;
    width?: number;
    height?: number;
  }

  export interface InfoResult {
    title?: string;
    author?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modDate?: string;
    pages?: number;
  }

  export function convert(file: string, opts: ConvertOptions): Promise<void>;
  export function info(file: string): Promise<InfoResult>;
}
