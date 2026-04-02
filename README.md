# 就活管理 (Shukatsu Manager)

**Version 1.0.2** | [更新履歴](./CHANGELOG.md)

就職活動の応募先、選考履歴、面接メモを 1 つのアプリで管理するための Expo / React Native アプリです。

## 機能

- 企業情報の登録・編集・削除
- ログインID、マイページURL、ES、志望動機、メモの保存
- QRコードからのマイページURL入力
- 選考イベントの追加・編集・削除
- 選考イベントに応じた企業ステータスの自動再計算
- 面接予定日の通知
- 端末カレンダーへの面接予定登録
- 面接音声の録音とローカル Whisper による文字起こし
- ステータス順、面接日順、手動順での並び替え
- カスタムステータスの追加

## 技術スタック

| 項目 | 採用技術 |
|---|---|
| アプリ基盤 | Expo 54, React Native 0.81, React 19 |
| 画面遷移 | expo-router |
| DB | expo-sqlite |
| 通知 | expo-notifications |
| カレンダー | expo-calendar |
| QR読み取り | expo-camera |
| 録音 | react-native-audio-record, expo-av |
| Android 背景録音 | react-native-background-actions |
| 文字起こし | whisper.rn |

## 重要な前提

このアプリは `whisper.rn`、`react-native-audio-record`、`react-native-background-actions` などのネイティブ依存を含みます。  
そのため **Expo Go では動作しません**。`expo run:android` / `expo run:ios`、または EAS Build を前提にしてください。

## セットアップ

```bash
npm install
```

### 開発ビルド

```bash
npx expo run:android
npx expo run:ios
```

### 型チェック

```bash
npm run typecheck
```

## ビルド

### EAS Build

```bash
npm install -g eas-cli
eas build -p android --profile preview
```

### ローカル Android ビルド

```bash
npx expo run:android --variant release
```

生成先の例:

```text
android/app/build/outputs/apk/release/app-release.apk
```

## 権限

このアプリでは以下の権限を利用します。

- マイク: 面接音声の録音
- カメラ: QRコード読み取り
- カレンダー: 面接予定の登録
- 通知: 面接日のリマインダー

通知権限はアプリ起動時ではなく、必要なタイミングで要求します。

## 背景録音

- iOS: `UIBackgroundModes: ["audio"]` を利用
- Android: `react-native-background-actions` によりフォアグラウンドサービスとして録音継続

## カレンダー連携

面接日を端末の既定カレンダーへ終日イベントとして登録します。  
Google 専用連携ではなく、`expo-calendar` が取得できる書き込み可能カレンダーを利用します。

## 通知仕様

- 面接予定日が設定されている企業に対して、当日 07:00 に通知
- 過去日付は通知を作成しない
- 面接日を変更・削除した場合は通知も更新

## 文字起こし

- 録音ファイルは端末内で処理
- Whisper モデルは初回利用時にダウンロード
- 文字起こし結果は編集可能
- 保存は明示操作で行う

## ステータス仕様

企業のステータスは以下の 2 系統で管理します。

- システムステータス: 選考イベントに応じて再計算される標準ステータス
- カスタムステータス: ユーザー追加の任意ステータス

選考イベントの追加・更新・削除時、企業がシステムステータスを使っている場合は履歴全体から再計算します。

## 主なディレクトリ

```text
app/
  index.tsx            一覧画面
  add.tsx              企業追加画面
  [id].tsx             企業詳細画面
  _layout.tsx          画面レイアウト

components/
  CompanyForm.tsx
  CompanyCard.tsx
  SelectionTimeline.tsx
  AddEventModal.tsx
  QRScannerModal.tsx
  TranscriptionView.tsx
  StatusBadge.tsx

database/
  schema.ts            SQLite 初期化
  repository.ts        CRUD と業務ロジック

utils/
  date.ts
  notifications.ts
  calendar.ts
  audioRecorder.ts
  whisperLocal.ts

constants/
  status.ts

types/
  company.ts
```

## データモデル

### Company

| フィールド | 型 | 説明 |
|---|---|---|
| id | string | UUID |
| companyName | string | 企業名 |
| loginId | string \| null | ログインID |
| myPageUrl | string \| null | マイページURL |
| entryDate | string \| null | エントリー日 (`YYYY-MM-DD`) |
| nextInterviewDate | string \| null | 次回面接日 (`YYYY-MM-DD`) |
| position | string \| null | 職種 |
| esContent | string \| null | ES内容 |
| motivation | string \| null | 志望動機 |
| notes | string \| null | メモ |
| transcription | string \| null | 文字起こし結果 |
| status | string | 現在のステータス |
| sortOrder | number | 手動並び順 |
| calendarEventId | string \| null | カレンダーイベントID |

### SelectionEvent

| フィールド | 型 | 説明 |
|---|---|---|
| id | string | UUID |
| companyId | string | 企業ID |
| eventType | string | イベント種別 |
| eventDate | string \| null | 実施日 (`YYYY-MM-DD`) |
| result | string | `結果待ち` / `合格` / `不合格` |
| notes | string \| null | メモ |

## セキュリティ上の注意

- SQLite には応募情報や面接メモを平文保存しています
- Whisper モデルは実行時ダウンロードです
- 機微情報を扱う用途では、端末保護や追加の暗号化を検討してください

## バージョン運用

- `package.json` の `version`
- `app.json` の `version`
- `app.json` の `android.versionCode`
- 必要に応じて `android/app/build.gradle` の `versionName` / `versionCode`
- `CHANGELOG.md`

を同時に更新します。

## ライセンス

Private
