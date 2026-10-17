# 部署（Cloudflare Pages）

网站是纯静态页面，用 Cloudflare Pages 的 Git 集成部署：

- 推送到 `main` → 自动更新正式站点。
- 每个 PR（以及其他分支）→ 自动生成一个独立的预览地址，合并前可以先看效果。

仓库里不需要放任何 API 密钥。

## 一次性设置（作者在 Cloudflare 后台操作）

1. 登录 Cloudflare 控制台 → Workers & Pages → 创建 → Pages → 连接到 Git。
2. 授权 GitHub，选择仓库 `sprite2140-art/skincare`。
3. 构建设置：

   | 项目 | 值 |
   |---|---|
   | 生产分支 | `main` |
   | 框架预设 | Vite（或"无"） |
   | 构建命令 | `npm run build` |
   | 构建输出目录 | `dist` |

   Node 版本由仓库根目录的 `.node-version`（22）指定。
4. 保存并部署。
5. 开启 PR 预览：项目 → 设置 → 构建 → 分支控制，把"预览分支"设为"所有非生产分支"（通常是默认值）。之后每个 PR 下会出现 Cloudflare 的评论，里面有预览地址；PR 的检查列表里也有对应条目。

Cloudflare 后台的菜单名称可能会调整，以 Cloudflare Pages 官方文档为准。

## 排查：预览页空白

如果线上页面空白、页面源码里引用的是 `/src/main.tsx`，说明 Cloudflare 发布的是仓库源码，而不是构建产物。请检查项目 → 设置 → 构建：

- 构建命令必须是 `npm run build`（不能为空）；
- 构建输出目录必须是 `dist`（不能是 `/` 或留空）；
- 根目录（Root directory）留空。

改完后在 Cloudflare 后台对最新部署点"重试部署"，或推送一个新提交触发部署。正确部署后，页面源码里引用的应该是 `/assets/index-xxxx.js`。

仓库里没有 wrangler.toml，也没有 `_redirects`、`_headers`、`_routes.json`，构建设置完全以 Cloudflare 后台为准。

## 说明

- 站点部署在域名根路径，使用正常的网址路由，便于分享卡片带链接。没有 `404.html` 时，Cloudflare Pages 会把未知路径交给 `index.html` 处理（单页应用模式），刷新子页面不会 404。
- 构建命令会先做类型检查，类型错误会导致部署失败，这是有意的。
- GitHub Actions 的 CI（`.github/workflows/ci.yml`）与部署相互独立：CI 负责测试和数据校验，Cloudflare 负责构建和发布。
