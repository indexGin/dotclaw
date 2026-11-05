# PWA Icons

## 自动生成

PNG 图标通过 `npm run generate-icons` 从统一源图自动生成。构建时会自动运行此脚本。

要连 Electron 桌面图标一起重建，用更上层的入口：

```bash
npm run brand:icons
```

它会依次执行：`logo-1024.svg` → `logo-1024.png` → 全部 PWA PNG → `electron/assets/dotclaw-icon.png`
与 `electron/assets/dotclaw.icns`。

## 图标源

- 矢量真相源：`logo-1024.svg`（Aperture 符号，1024 网格，含圆角底版与品牌色）
- 栅格中间产物：`logo-1024.png`（由上面的 SVG 生成，供 PWA 各尺寸复用）
- 回退：`../favicon.svg`

脚本会从同一份源文件生成全部 PWA PNG 尺寸，避免维护内容重复的 SVG 副本。

## 自定义图标

不要手改 PNG。更新图标的正确顺序：

1. 编辑 `logo-1024.svg`（必要时同步 `../favicon.svg`、`logo-text.svg`、`loading-logo.svg`）
2. 在 `web/` 下运行 `npm run brand:icons`
3. 提交生成后的 PNG 与 `electron/assets` 产物

`logo-text.svg`（登录页/侧边栏字标）与 `loading-logo.svg`（加载页，通过 `<object>` 加载
以继承 `currentColor`）都是内联矢量，不依赖栅格文件。

## 品牌色

Ultramarine 色阶定义在 `web/src/styles/globals.css` 的 `--brand-*`（`theme-dot` 与
`.landing-page` 两处），图标里的取值为：

| 用途      | 浅底 / 字标 | 深底 / 图标 |
| --------- | ----------- | ----------- |
| 主色 Dot  | `#3d62dc`   | `#4f74ee`   |
| 轨道 ring | `#2f54c9`   | `#2f54c9`   |
| 节点 node | `#8fa8ff`   | `#a9bcff`   |
| 底版 tile | —           | `#131a2b`   |
