# 開發總結：將 Counter 元件匯出為 npm UI Library

## 目標

將現有 Next.js 專案中的 `Counter` 元件抽離成獨立的 npm 套件（`@myorg/ui`），
與原本的 Next.js 應用共存於同一個 monorepo，並整合 Zustand 狀態管理。

---

## 技術決策

| 項目 | 選擇 | 理由 |
|---|---|---|
| Monorepo 架構 | npm workspaces | 內建於 Node.js，無需額外工具 |
| UI 套件打包工具 | tsup | 零設定支援 CJS + ESM 雙格式及 `.d.ts` 型別 |
| 狀態管理 | Zustand | 輕量、無 Provider 樣板、與 React hooks 整合自然 |
| Next.js 整合 | `transpilePackages` | 開發時直接讀套件 TypeScript 源碼，免 pre-build |

---

## 最終專案結構

```
test/                                ← workspace root
├── package.json                     ← npm workspaces 設定
├── apps/
│   └── web/                         ← Next.js 14 app
│       ├── package.json             ← 依賴 @myorg/ui
│       ├── next.config.mjs          ← transpilePackages: ['@myorg/ui']
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       ├── postcss.config.mjs
│       └── src/
│           └── app/
│               ├── layout.tsx
│               ├── page.tsx         ← import { Counter } from '@myorg/ui'
│               └── globals.css
└── packages/
    └── ui/                          ← npm UI library (@myorg/ui)
        ├── package.json             ← 套件入口、exports、peerDeps
        ├── tsup.config.ts           ← 打包設定
        ├── tsconfig.json
        └── src/
            ├── index.ts             ← barrel export
            ├── components/
            │   └── Counter.tsx      ← 使用 useCounterStore
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
mv next.config.mjs tailwind.config.ts postcss.config.mjs next-env.d.ts tsconfig.json apps/web/
```

**Step 4 — 建立 `apps/web/package.json`**

複製原有依賴，新增 `"@myorg/ui": "*"` 作為本地 workspace 依賴。

**Step 5 — 更新 `apps/web/next.config.mjs`**

加入 `transpilePackages`，讓 Next.js 在開發模式下直接讀取 `packages/ui` 的 TypeScript 源碼，無需每次手動 build：

```js
const nextConfig = {
  transpilePackages: ['@myorg/ui'],
}
```

---

### Phase 3：建立 `packages/ui`

**Step 6 — 建立套件核心檔案**

- `src/components/Counter.tsx`：從 `apps/web` 複製原始元件
- `src/index.ts`：barrel file，統一匯出所有公開 API
- `package.json`：設定套件名稱、exports map（支援 CJS/ESM/types）、peerDependencies
- `tsconfig.json`：獨立設定，`jsx: react-jsx`，不繼承 Next.js 設定
- `tsup.config.ts`：打包設定，輸出 CJS（`.js`）+ ESM（`.mjs`）+ 型別宣告（`.d.ts`），外部化 `react`/`react-dom`

`package.json` 的 `exports` 欄位格式（`types` 必須排在最前）：

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

**Step 7 — 安裝 Zustand**

```bash
npm install zustand -w packages/ui
```

**Step 8 — 建立 `src/store/counterStore.ts`**

使用 Zustand `create` 定義型別安全的 store：

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

**Step 9 — 更新 `Counter.tsx`**

移除 `useState`，改用 `useCounterStore`：

```tsx
import { useCounterStore } from "../store/counterStore"

const Counter = () => {
  const { count, increment, decrement } = useCounterStore()
  return (
    <div>Counter: {count}
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  )
}
```

**Step 10 — 更新 barrel export**

在 `src/index.ts` 同時匯出 `useCounterStore`，讓消費方 app 可直接存取 store：

```ts
export { default as Counter } from "./components/Counter"
export { useCounterStore } from "./store/counterStore"
```

---

### Phase 5：連結與驗證

**Step 11 — 安裝依賴**

```bash
npm install   # 從根目錄執行，npm workspaces 自動 symlink packages/ui → node_modules/@myorg/ui
```

**Step 12 — 更新 `apps/web/src/app/page.tsx`**

```tsx
"use client"
import { Counter } from "@myorg/ui"

export default function Home() {
  return <div><Counter /></div>
}
```

**Step 13 — 移除 `apps/web` 的重複元件**

```bash
rm apps/web/src/components/Counter.tsx
```

**Step 14 — 驗證**

```bash
npm run build -w packages/ui   # ✓ CJS + ESM + .d.ts，零 warning
npm run build -w apps/web      # ✓ Next.js static build 成功
```

---

## 日常開發指令

```bash
# 啟動 Next.js 開發伺服器（直接讀取 packages/ui 源碼，無需 pre-build）
npm run dev

# 發布前打包 UI 套件
npm run ui:build

# UI 套件進入 watch mode（同時開發 UI 與 app）
npm run ui:dev

# 發布到 npm（首次 scoped package 需加 --access public）
cd packages/ui && npm publish --access public
```

---

## 注意事項

- **Zustand store 是 module-level singleton**：所有引用 `@myorg/ui` 的元件共享同一個 `count` 狀態。若需要每個 `<Counter />` 實例有獨立狀態，改用 [Zustand Context pattern](https://zustand.docs.pmnd.rs/guides/initialize-state-with-props)。
- **發布前**：將 `@myorg/ui` 中的 `@myorg` 替換為你在 npm 上的實際 scope 或套件名稱，並確認 `npm login` 已登入。
- **`packages/ui/dist/` 不應納入版本控制**：可在根目錄 `.gitignore` 加入 `packages/*/dist`。
