/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

declare module 'exceljs/dist/exceljs.min.js' {
  import ExcelJS from 'exceljs';
  export default ExcelJS;
}
