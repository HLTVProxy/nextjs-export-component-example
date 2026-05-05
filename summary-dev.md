# 開發總結：將 Counter 元件匯出為 npm UI Library

## 目標

將現有 Next.js 專案中的 `Counter` 元件抽離成獨立的 npm 套件（`@myorg/ui`），
與原本的 Next.js 應用共存於同一個 monorepo，並整合 Zustand 狀態管理與 Tailwind CSS。

---

## 技術決策

| 項目 | 選擇 | 理由 |
|---|---|---|
| Monorepo 架構 | npm workspaces | 內建於 Node.js，無需額外工具 |
| UI 套件打包工具 | tsup | 零設定支援 CJS + ESM 雙格式及 `.d.ts` 型別 |
| 狀態管理 | Zustand | 輕量、無 Provider 樣板、與 React hooks 整合自然 |
| Next.js 整合 | `transpilePackages` + `dist/` exports | 消費端零設定，樣式自動注入 |
| UI lib 樣式方案 | Tailwind CSS + tsup `injectStyle` | build 時將 CSS 嵌入 JS，import 元件即自動注入 `<style>` |

---

## 最終專案結構

```
test/                                ← workspace root
├── package.json                     ← npm workspaces 設定
├── .gitignore                       ← 排除 packages/*/dist、packages/*/src/*.built.css
├── apps/
│   └── web/                         ← Next.js 14 app（不需安裝 Tailwind）
│       ├── package.json             ← 依賴 @myorg/ui
│       ├── next.config.mjs          ← transpilePackages: ['@myorg/ui']
│       ├── tsconfig.json
│       └── src/
│           └── app/
│               ├── layout.tsx       ← import "./globals.css" 需保留
│               ├── page.tsx         ← import { Counter } from '@myorg/ui'
│               └── globals.css
└── packages/
    └── ui/                          ← npm UI library (@myorg/ui)
        ├── package.json             ← 套件入口、exports、peerDeps
        ├── tsup.config.ts           ← injectStyle: true
        ├── tailwind.config.ts       ← content: ["./src/**/*.{ts,tsx}"]
        ├── tsconfig.json
        └── src/
            ├── index.ts             ← import "./styles.built.css" + barrel export
            ├── styles.css           ← @tailwind base/components/utilities
            ├── styles.built.css     ← Tailwind CLI 輸出（中間產物，gitignored）
            ├── components/
            │   └── Counter.tsx      ← Tailwind classes + useCounterStore
            └── store/
                └── counterStore.ts  ← Zustand store
```

---

## 詳細步驟

### Phase 1：建立 Monorepo 根目錄

**Step 1 — 建立目錄骨架**

```bash
mkdir -p apps/web packages/ui/src/components
```

**Step 2 — 改寫根 `package.json` 為 workspace root**

移除所有 app-specific 依賴，加入 `workspaces` 欄位：

```json
{
  "name": "test-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "npm run dev -w apps/web",
    "build": "npm run build -w packages/ui && npm run build -w apps/web",
    "ui:build": "npm run build -w packages/ui",
    "ui:dev": "npm run dev -w packages/ui"
  }
}
```

---

### Phase 2：遷移 Next.js 至 `apps/web/`

**Step 3 — 移動所有 Next.js 相關檔案**

```bash
mv src apps/web/src
mv next.config.mjs next-env.d.ts tsconfig.json apps/web/
```

> `apps/web` **不需要** Tailwind CSS，樣式由 `@myorg/ui` 自帶注入。

**Step 4 — 建立 `apps/web/package.json`**

複製原有依賴，新增 `"@myorg/ui": "*"` 作為本地 workspace 依賴。無需加入 `tailwindcss` 或 `postcss`。

**Step 5 — 更新 `apps/web/next.config.mjs`**

加入 `transpilePackages`，讓 Next.js 正確解析 `packages/ui/dist/`：

```js
const nextConfig = {
  transpilePackages: ['@myorg/ui'],
}
```

---

### Phase 3：建立 `packages/ui`

**Step 6 — 建立套件核心檔案**

- `src/components/Counter.tsx`：使用 Tailwind utility classes 撰寫樣式
- `src/index.ts`：先 import `./styles.built.css`，再 barrel export
- `src/styles.css`：Tailwind 入口，內含三條 `@tailwind` 指令
- `tailwind.config.ts`：content 設定為 `./src/**/*.{ts,tsx}`
- `package.json`：exports 指向 `dist/`，scripts 使用兩段式 build
- `tsup.config.ts`：加入 `injectStyle: true`

`package.json` scripts：

```json
"scripts": {
  "build": "tailwindcss -i src/styles.css -o src/styles.built.css --minify && tsup",
  "dev": "run-p dev:tw dev:tsup",
  "dev:tw": "tailwindcss -i src/styles.css -o src/styles.built.css --watch",
  "dev:tsup": "tsup --watch"
}
```

`tsup.config.ts`：

```ts
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  injectStyle: true,   // CSS 嵌入 JS，runtime 注入 <style>
})
```

`src/index.ts`：

```ts
import "./styles.built.css"   // tsup injectStyle 打包此 CSS 進 dist/
export { default as Counter } from "./components/Counter"
export { useCounterStore } from "./store/counterStore"
```

`package.json` 的 `exports` 欄位（`types` 必須排在最前）：

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.mjs",
    "require": "./dist/index.js"
  }
}
```

---

### Phase 4：整合 Zustand 狀態管理

**Step 7 — 安裝 Zustand 與 npm-run-all2**

```bash
npm install zustand -w packages/ui
npm install --save-dev npm-run-all2 -w packages/ui
```

**Step 8 — 建立 `src/store/counterStore.ts`**

```ts
interface CounterState {
  count: number
  increment: () => void
  decrement: () => void
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}))
```

**Step 9 — `Counter.tsx` 使用 Tailwind classes + useCounterStore**

```tsx
import { useCounterStore } from "../store/counterStore"

const Counter = () => {
  const { count, increment, decrement } = useCounterStore()
  return (
    <div className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
      <button onClick={decrement} className="flex h-8 w-8 ...">−</button>
      <span className="min-w-[2rem] text-center ...">{count}</span>
      <button onClick={increment} className="flex h-8 w-8 bg-indigo-500 ...">+</button>
    </div>
  )
}
```

---

### Phase 5：連結與驗證

**Step 10 — 安裝依賴**

```bash
npm install   # 從根目錄執行，npm workspaces 自動 symlink packages/ui → node_modules/@myorg/ui
```

**Step 11 — 更新 `apps/web/src/app/page.tsx`**

```tsx
"use client"
import { Counter } from "@myorg/ui"

export default function Home() {
  return <div><Counter /></div>
}
```

**Step 12 — 確認 `apps/web/src/app/layout.tsx` 有 import globals.css**

```tsx
import "./globals.css"
```

**Step 13 — Build & 驗證**

```bash
npm run ui:build               # ✓ Tailwind 編譯 → tsup 嵌入 CSS → dist/index.mjs ~10KB
npm run build -w apps/web      # ✓ Next.js static build 成功
```

---

## Tailwind CSS 工作原理

```
src/styles.css  ──[tailwindcss --watch]──▶  src/styles.built.css  (純 CSS)
                                                      │
src/index.ts  import "./styles.built.css"             │
                                                      ▼
                          tsup (injectStyle: true)  ──▶  dist/index.mjs
                                                      │  內含 styleInject(css) 函式
                                                      ▼
                          消費端 import { Counter } from "@myorg/ui"
                                                      │
                                                      ▼
                                            自動注入 <style> 到 <head>
```

> **重要**：新增 Tailwind class 後必須重新 build（或在 watch mode 下等待自動重建），否則新 class 不會出現在 `styles.built.css` 中。

---

## .gitignore

```
packages/*/dist
packages/*/src/*.built.css
```

---

## 日常開發指令

```bash
# 啟動 Next.js 開發伺服器
npm run dev

# 發布前打包 UI 套件（Tailwind 編譯 + tsup bundle）
npm run ui:build

# UI 套件進入 watch mode（Tailwind + tsup 同時監聽）
npm run ui:dev

# 發布到 npm（首次 scoped package 需加 --access public）
cd packages/ui && npm publish --access public
```

---

## 注意事項

- **Zustand store 是 module-level singleton**：所有引用 `@myorg/ui` 的元件共享同一個 `count` 狀態。若需要每個 `<Counter />` 實例有獨立狀態，改用 [Zustand Context pattern](https://zustand.docs.pmnd.rs/guides/initialize-state-with-props)。
- **`injectStyle` 是 client-side 注入**：樣式在 JS 執行後才插入 `<head>`，SSR 首次渲染時可能有短暫的無樣式閃爍（FOUC）。若需完整 SSR 樣式支援，改為在消費端 app 統一 import `@myorg/ui/styles.css`。
- **發布前**：將 `@myorg/ui` 中的 `@myorg` 替換為你在 npm 上的實際 scope 或套件名稱，並確認 `npm login` 已登入。
- **`packages/ui/dist/` 與 `src/styles.built.css` 不應納入版本控制**：根目錄 `.gitignore` 已加入對應規則。
