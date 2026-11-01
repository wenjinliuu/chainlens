// 潮信 · Astro 配置：纯静态输出，页面按文件名生成（company.html 这类链接与设计稿保持一致），部署到 Cloudflare Workers 静态资源
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL || 'https://chaoxin.example',
  build: { format: 'file' },
  trailingSlash: 'never',
  compressHTML: true,
});
