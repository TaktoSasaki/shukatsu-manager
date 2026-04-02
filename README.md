# 就活マネージャー (Shukatsu Manager)

**Version 1.0.2** | [更新履歴](./CHANGELOG.md)

就職活動を効率的に管理するためのモバイルアプリケーション。

## 機能

- **企業管理**: 応募企業の情報（会社名・マイページURL・ES内容など）を一元管理
- **面接録音とAI文字起こし**: オフライン・完全ローカルで動作するAI（Whisper small）を用いて面接の音声を録音・自動文字起こし
- **バックグラウンド録音**: 他アプリへの切り替えや画面オフ中も録音を継続（iOS: UIBackgroundModes / Android: フォアグラウンドサービス）
- **QRコードスキャン**: 企業マイページのQRコードをカメラで読み取り、URLを自動入力
- **選考進捗トラッキング**: ES提出、面接、GDなどの選考イベントをタイムライン形式で表示
- **Googleカレンダー連携**: 面接予定日を自動でカレンダーに登録
- **カスタムステータス**: 自分好みのステータス（選考中、内定、辞退など）を作成・管理
- **リマインダー通知**: 面接当日の朝7時に自動でプッシュ通知
- **ドラッグ並べ替え**: 企業カードを手動で並べ替え可能
- **ソート機能**: ステータス順、面接日順など複数の並び替えオプション

## 技術スタック

### コアフレームワーク

| 技術 | バージョン | 用途 |
|-----|---------|------|
| Expo | ~54.0.33 | React Nativeの開発プラットフォーム（EAS Build/Prebuild利用） |
| React Native | 0.81.5 | クロスプラットフォームモバイルアプリ開発 |
| React | 19.x | UIコンポーネントライブラリ |
| TypeScript | ~5.9.2 | 型安全な開発環境 |

### AI・音声機能

| 技術 | 用途 |
|-----|------|
| whisper.rn | 面接録音を端末内でAI文字起こし（ローカルWhisper small・オフライン動作） |
| react-native-audio-record | マイクを使った低レベルWAV録音（AudioRecord API） |
| expo-av | 録音セッション管理・バックグラウンドオーディオ設定（iOS） |
| expo-file-system | AIモデル（ggml-small.bin）および録音WAVファイルの管理 |

### バックグラウンド処理

| 技術 | 用途 |
|-----|------|
| react-native-background-actions | Android フォアグラウンドサービス起動。画面オフ・他アプリ切り替え時の録音継続を保証 |
| expo-notifications | 録音中の常駐通知（iOS）・面接リマインダー通知 |

### カメラ・外部連携

| 技術 | 用途 |
|-----|------|
| expo-camera | QRコードスキャン（マイページURL自動入力） |
| expo-calendar | 面接予定日のGoogleカレンダー自動登録 |
| expo-clipboard | ログインID・文字起こし結果のコピー |
| expo-linking | マイページURLのブラウザ起動 |

### ナビゲーション・ルーティング

| 技術 | 用途 |
|-----|------|
| expo-router | ファイルベースルーティング（Next.js風） |
| react-native-screens | ネイティブスクリーン最適化 |

### データ永続化

| 技術 | 用途 |
|-----|------|
| expo-sqlite | ローカルSQLiteデータベース。企業・選考イベント・文字起こし結果の保存 |

### UI・インタラクション

| 技術 | 用途 |
|-----|------|
| react-native-gesture-handler | ジェスチャー認識（長押し、スワイプ等） |
| react-native-reanimated | 高性能アニメーション |
| react-native-draggable-flatlist | ドラッグ並べ替え可能リスト |
| @react-native-community/datetimepicker | 日付・時刻ピッカー |
| expo-haptics | 長押し時の触覚フィードバック |

## プロジェクト構造

```
shukatsu-manager/
├── app/                        # 画面コンポーネント（expo-router）
│   ├── index.tsx              # ホーム画面（企業一覧・並べ替え）
│   ├── [id].tsx               # 企業詳細・編集・録音画面
│   ├── add.tsx                # 企業追加画面
│   └── _layout.tsx            # ナビゲーション設定・通知権限リクエスト
├── components/                 # 再利用可能なコンポーネント
│   ├── TranscriptionView.tsx  # 録音UI・Whisper文字起こし結果表示
│   ├── QRScannerModal.tsx     # QRコードスキャナーモーダル
│   ├── AddEventModal.tsx      # 選考イベント追加・編集モーダル
│   ├── CompanyCard.tsx        # 企業カード（一覧用）
│   ├── CompanyForm.tsx        # 企業情報入力フォーム（QRスキャン統合）
│   ├── SelectionTimeline.tsx  # 選考タイムライン
│   └── StatusBadge.tsx        # ステータスバッジ
├── database/                   # データベース関連
│   ├── schema.ts              # テーブル定義・初期化
│   └── repository.ts          # CRUD操作
├── types/                      # 型定義
│   └── company.ts             # Company, SelectionEvent 等
├── utils/                      # ユーティリティ
│   ├── whisperLocal.ts        # Whisperモデルダウンロード・文字起こし実行
│   ├── audioRecorder.ts       # 録音制御・バックグラウンドサービス管理
│   ├── calendar.ts            # Googleカレンダー連携
│   ├── date.ts                # 日付フォーマット・残り日数計算
│   └── notifications.ts       # 面接リマインダー・録音中通知
├── constants/                  # 定数
│   └── status.ts              # デフォルトステータスリスト
└── android/                    # Androidネイティブプロジェクト（prebuild済み）
```

## セットアップと実行

本アプリは `whisper.rn`・`react-native-audio-record`・`react-native-background-actions` などネイティブコード依存のライブラリを使用しているため、**標準の Expo Go アプリでは動作しません**（Prebuild または EAS Build によるネイティブビルドが必要です）。

### 1. 開発用ローカルビルド

```bash
# パッケージのインストール
npm install

# iOSシミュレーターでの実行
npx expo run:ios

# Androidエミュレーターまたは接続された実機での実行
npx expo run:android
```

### 2. Android APK のビルド

**EASでのクラウドビルド（要Expoアカウント）:**
```bash
npm install -g eas-cli
eas build -p android --profile preview
```

**ローカルでのAPKビルド:**
```bash
npx expo run:android --variant release
# 生成先: android/app/build/outputs/apk/release/app-release.apk
```

## バックグラウンド録音の仕組み

| プラットフォーム | 方式 | 画面オフ対応 |
|----------|------|-----------|
| iOS | `UIBackgroundModes: ["audio"]` + `staysActiveInBackground: true` | ✅ |
| Android | `react-native-background-actions` によるフォアグラウンドサービス（`foregroundServiceType="microphone"`） + `WAKE_LOCK` | ✅ |

録音開始時のみバックグラウンド動作が有効になり、録音停止後は自動的に解除されます。

## データモデル

### Company（企業）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | UUID |
| companyName | string | 会社名 |
| loginId | string? | マイページログインID |
| myPageUrl | string? | マイページURL（QRスキャンで入力可） |
| entryDate | string? | エントリー日（YYYY-MM-DD） |
| nextInterviewDate | string? | 次回面接日（YYYY-MM-DD） |
| position | string? | 応募職種 |
| esContent | string? | ES内容 |
| motivation | string? | 志望動機 |
| notes | string? | メモ |
| transcription | string? | AI文字起こしされた面接内容 |
| calendarEventId | string? | Googleカレンダーイベント連携ID |
| status | string | 選考ステータス |
| sortOrder | number | 手動並び順 |

### SelectionEvent（選考イベント）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | UUID |
| companyId | string | 紐づく企業ID |
| eventType | string | イベント種別（ES・面接・GD等） |
| eventDate | string? | 実施日 |
| result | string? | 結果（通過・不通過等） |
| notes | string? | メモ |

## ライセンス

Private
