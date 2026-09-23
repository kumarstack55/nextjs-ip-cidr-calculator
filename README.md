# IPv4アドレス計算

Next.js / React / TypeScript による CIDR 計算機です。計算はブラウザー内で完結します。

## 起動

```sh
npm install
npm run dev
```

http://localhost:3000 を開きます。

## 検証

```sh
npm test
npm run typecheck
npm run build
npm run test:e2e
```

ブラウザーテストはローカルの Google Chrome を使用します。

## 仕様

- 初期入力は `192.168.0.0/23`、`192.168.0.0/24`、`192.168.1.0/24`。
- CIDR は単一の入力欄で編集し、カードを追加・削除できます。
- Prefix 操作は入力 IP を維持、Subnet 操作はホスト位置を維持します。
- Host 操作はネットワークの先頭から末尾まで。境界を越えて循環しません。
- 比較図は全有効 CIDR に自動調整します。不正な入力は図から除外します。
- `/31` はポイントツーポイント、`/32` はホストルートとして扱い、Broadcast 非該当の理由と RFC を表示します。
- 入力・追加・削除から150ms後にURLのハッシュを更新します。URL共有・再読み込みで入力文字列、順序、ID（色）を復元できます。
- 形式は `#v2=` + `[ID, 入力文字列, 名前（省略可）]` の配列をJSON・UTF-8・Base64url（パディングなし）でエンコードしたものです。圧縮はしません。旧形式の `#v1=` も読み込めます。計算結果は保存しません。空欄・不正な入力・0件も復元します。
- URL形式の検証に失敗した場合は説明と初期サンプルを表示し、編集するまで元URLを保持します。
- URLは暗号化されません。長いURLは共有先によって切り詰められる場合があります。64,000文字を超えるハッシュは更新せずエラーを表示します。
- 現在は IPv4 のみ対応。計算には `bigint`、描画には React と SVG を使用します。

## 構成

- `src/lib/cidr.ts`: 不変の IPv4 CIDR クラス、検証、操作、範囲関係、座標変換。
- `src/app/calculator.tsx`: 入力カード、詳細表、比較図。
- `src/app/globals.css`: モノトーンを基調とした最小限のスタイル。
- `tests/cidr.test.ts`: 境界値、計算、包含関係、不変性のテスト。

## 開発要件

- [fnm](https://github.com/Schniz/fnm)
- [actionlint](https://github.com/rhysd/actionlint/blob/main/docs/install.md)
- Visiual Studio Code
  - Extensions
    - [markdownlint](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint)
    - [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
