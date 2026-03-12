# 御朱印ログ / Goshuin Log

自分が参拝した神社・お寺を記録する「自分専用の参拝ログ」Webアプリです。
A personal shrine/temple visit log web app with map and weather integration.

---

## 起動方法 / How to Run

### 方法 1 — Python ローカルサーバー（推奨）

```bash
# Python 3
cd goshuin-log
python3 -m http.server 8080

# ブラウザで開く
open http://localhost:8080
```

### 方法 2 — Node.js (npx serve)

```bash
cd goshuin-log
npx serve .
# 表示されたURLをブラウザで開く
```

### 方法 3 — VS Code Live Server

VS Code の "Live Server" 拡張機能をインストールし、`index.html` を右クリック → "Open with Live Server"

### 方法 4 — ファイルを直接開く

`index.html` をブラウザで直接開くこともできます。
ただし、ブラウザのセキュリティポリシーにより外部API（天気・位置情報）が制限される場合があります。
**ローカルサーバー経由での利用を推奨します。**

---

## 機能 / Features

| 機能 | 説明 |
|------|------|
| 記録の登録・編集・削除 | 寺社名、参拝日、種類、メモ、画像URL |
| 一覧表示 | 参拝日降順・寺社名/メモで検索 |
| 地図表示 | 記録した場所をマップ上にピン表示 |
| 天気表示 | 参拝日の天気・最高/最低気温 |
| 多言語対応 | 日本語 / English 切り替え |

---

## 使用API / APIs Used

### 1. Leaflet.js (地図ライブラリ)
- **URL**: https://leafletjs.com/
- **タイル**: OpenStreetMap
- **用途**: 地図ビューに記録した場所のマーカーを表示
- **料金**: 無料・APIキー不要

### 2. Nominatim (ジオコーディング)
- **提供元**: OpenStreetMap Foundation
- **エンドポイント**: `https://nominatim.openstreetmap.org/search`
- **用途**: 寺社名から緯度経度を自動取得（「位置取得」ボタン）
- **料金**: 無料・APIキー不要
- **利用規約**: 1リクエスト/秒以下・User-Agent設定必須

### 3. Open-Meteo (天気)
- **URL**: https://open-meteo.com/
- **エンドポイント**:
  - 過去データ: `https://archive-api.open-meteo.com/v1/archive`
  - 直近・予報: `https://api.open-meteo.com/v1/forecast`
- **用途**: 参拝日の天気（天気コード・最高/最低気温）を取得
- **料金**: 無料・APIキー不要
- **対応期間**: 1940年〜現在 + 16日先まで予報

---

## データの保存について

全データはブラウザの **localStorage** に保存されます。
サーバーへのデータ送信は一切行いません。ブラウザのデータを削除するとデータも消えます。

---

## ファイル構成 / File Structure

```
goshuin-log/
├── index.html       # メインHTML
├── style.css        # スタイルシート
├── js/
│   ├── i18n.js      # 多言語対応（日本語/英語）
│   ├── api.js       # 天気・ジオコーディングAPI
│   └── app.js       # アプリケーションロジック
└── README.md
```

---

## ブラウザ対応 / Browser Support

Chrome, Firefox, Safari, Edge の最新版を推奨します。
