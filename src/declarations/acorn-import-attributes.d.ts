/* eslint-disable */

declare module 'acorn-import-attributes' {
  import { Parser } from 'acorn';
  export function importAttributesOrAssertions(parser: typeof Parser): typeof Parser;
}
