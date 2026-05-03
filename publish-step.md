# 發布 @myorg/ui 到 npm

---

## 前置準備（公有與私有皆需要）

### 1. 建立 npm 帳號

前往 [https://www.npmjs.com/signup](https://www.npmjs.com/signup) 註冊帳號。

### 2. 登入 npm CLI

```bash
npm login
```

輸入帳號、密碼、Email（以及 OTP 若有啟用 2FA）。登入成功後可驗證身份：

```bash
npm whoami
# 輸出你的帳號名稱
```

### 3. 確認 package.json 的套件名稱

如果使用 scoped package（`@myorg/ui`），`myorg` 必須是你在 npm 上**已擁有的 Organization 或個人帳號名稱**，例如：

```json
{
  "name": "@yourname/ui",
  "version": "0.1.0"
}
```

### 4. 確認 `files` 欄位正確（只發布必要內容）

`packages/ui/package.json` 中已設定：

```json
"files": ["dist"]
```

這樣只有 `dist/` 會被打包上傳，原始碼不會包含在內。

### 5. 發布前先 build

```bash
# 從根目錄執行
npm run ui:build

# 或直接進到套件目錄
cd packages/ui && npm run build
```

確認 `packages/ui/dist/` 已包含：

```
dist/
├── index.js       ← CJS
├── index.mjs      ← ESM
├── index.d.ts     ← TypeScript 型別（CJS）
└── index.d.mts    ← TypeScript 型別（ESM）
```

### 6. 用 `npm pack` 預覽打包內容（建議）

```bash
cd packages/ui
npm pack --dry-run
```

輸出範例：

```
npm notice 📦  @yourname/ui@0.1.0
npm notice === Tarball Contents ===
npm notice 1.62 kB dist/index.js
npm notice 549 B  dist/index.mjs
npm notice 138 B  dist/index.d.ts
npm notice ...
```

---

## 公有發布（Public Package）

適合開源套件，任何人都可以 `npm install`。

### 發布指令

```bash
cd packages/ui
npm publish --access public
```

> `--access public` 對 **scoped package**（`@scope/name`）是必要的，
> 因為 scoped package 預設為私有。
> 若套件名稱不帶 scope（如 `my-ui-lib`），則不需要此旗標。

### 後續版本更新流程

每次發布新版本前，必須先更新 `version`，npm 不允許覆蓋已發布的版本號。

```bash
cd packages/ui

# 方式一：手動修改 package.json 的 version 欄位

# 方式二：使用 npm version 指令（自動修改版本號並建立 git tag）
npm version patch   # 0.1.0 → 0.1.1（bug fix）
npm version minor   # 0.1.0 → 0.2.0（新功能，向後相容）
npm version major   # 0.1.0 → 1.0.0（破壞性變更）

# 然後發布
npm publish --access public
```

---

## 私有發布（Private Package）

有兩種主要方式：

---

### 方式 A：npm 官方私有 Registry（付費方案）

npm 的 Private Packages 功能需要付費方案（Individual Pro 或 Teams）。

#### 步驟

1. 升級 npm 帳號至付費方案：[https://www.npmjs.com/products](https://www.npmjs.com/products)

2. 發布時**不加** `--access public`（scoped package 預設即為私有）：

   ```bash
   cd packages/ui
   npm publish
   ```

3. 安裝時需確保消費方也已 `npm login` 並有存取權限：

   ```bash
   npm install @yourname/ui
   ```

---

### 方式 B：自架私有 Registry（免費，推薦企業內部使用）

使用 [Verdaccio](https://verdaccio.org/) 架設本地私有 registry，完全免費且支援 scoped package。

#### 安裝並啟動 Verdaccio

```bash
npm install -g verdaccio
verdaccio
# 預設監聽 http://localhost:4873
```

#### 設定 npm 指向私有 registry

```bash
# 只針對 @myorg scope 使用私有 registry
npm config set @myorg:registry http://localhost:4873

# 或針對所有套件（不建議）
npm config set registry http://localhost:4873
```

#### 在 Verdaccio 建立帳號

```bash
npm adduser --registry http://localhost:4873
```

#### 發布到私有 registry

```bash
cd packages/ui
npm publish --registry http://localhost:4873
```

#### 消費方安裝

確保消費方的 `.npmrc` 或 npm config 也設定了相同的 registry：

```bash
npm install @myorg/ui --registry http://localhost:4873
```

或在專案根目錄建立 `.npmrc` 檔案：

```ini
@myorg:registry=http://localhost:4873
```

---

### 方式 C：GitHub Packages（免費，限 GitHub 倉庫）

適合已使用 GitHub 的團隊，免費但需要 GitHub Personal Access Token。

#### 設定 `.npmrc`

在 `packages/ui/` 目錄（或根目錄）建立 `.npmrc`：

```ini
@myorg:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

> `NPM_TOKEN` 為 GitHub Personal Access Token（需有 `write:packages` 權限）。

#### `package.json` 加入 `publishConfig`

```json
{
  "name": "@myorg/ui",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

#### 發布

```bash
cd packages/ui
npm publish
```

#### 消費方安裝

消費方同樣需要設定 `.npmrc` 並持有有效的 GitHub Token（`read:packages` 權限）：

```ini
@myorg:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

```bash
npm install @myorg/ui
```

---

## 發布後驗證

```bash
# 公有 npm registry
npm info @yourname/ui

# 確認 exports 和 types 正確
npm info @yourname/ui exports
```

---

## 建議加入 `.gitignore`

確保以下內容不進版本控制：

```gitignore
# UI 套件的打包產物
packages/*/dist

# npm 打包預覽
*.tgz
```

---

## 版本號語意化規範（SemVer）

| 類型 | 指令 | 範例 | 使用時機 |
|---|---|---|---|
| patch | `npm version patch` | `0.1.0` → `0.1.1` | Bug fix，無 API 變更 |
| minor | `npm version minor` | `0.1.0` → `0.2.0` | 新增功能，向後相容 |
| major | `npm version major` | `0.1.0` → `1.0.0` | 破壞性變更（API 不相容） |
| prerelease | `npm version prerelease --preid=beta` | `0.1.0` → `0.1.1-beta.0` | 測試版、RC 版本 |
