# 就活マネージャー (Shukatsu Manager)

就職活動を効率的に管理するためのモバイルアプリケーション。

## 機能

- **企業管理**: 応募企業の情報（会社名・マイページURL・ES内容など）を一元管理
- **面接録音とAI文字起こし**: オフライン・完全ローカルで動作するAI（Whisper）を用いて面接の音声を録音・自動文字起こし
- **選考進捗トラッキング**: ES提出、面接、GDなどの選考イベントをタイムライン形式で表示
- **カスタムステータス**: 自分好みのステータス（選考中、内定、辞退など）を作成・管理
- **リマインダー通知**: 面接日の前日に自動でプッシュ通知
- **ドラッグ並べ替え**: 企業カードを手動で並べ替え可能
- **ソート機能**: ステータス順、面接日順など複数の並び替えオプション

## 技術スタック

### コアフレームワーク

| 技術 | バージョン | 用途 |
|-----|---------|------|
| Expo | 52.x | React Nativeの開発プラットフォーム（EAS Build/Prebuild利用） |
| React Native | 0.76.x | クロスプラットフォームモバイルアプリ開発 |
| React | 18.x | UIコンポーネントライブラリ |
| TypeScript | 5.x | 型安全な開発環境 |

### ネイティブAI機能・メディア

| 技術 | 用途 |
|-----|------|
| whisper.rn | 面接の録音データを端末内でAI文字起こし（ローカルWhisper） |
| expo-av | マイクを使った音声録音 |
| expo-file-system | ダウンロードしたAIモデルや録音WAVファイルの管理 |

### ナビゲーション・ルーティング

| 技術 | 用途 |
|-----|------|
| expo-router | ファイルベースルーティング（Next.js風） |
| react-native-screens | ネイティブスクリーン最適化 |
| expo-linking | ディープリンク対応 |

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

## プロジェクト構造

```
shukatsu-manager/
├── app/                    # 画面コンポーネント
│   ├── index.tsx          # ホーム画面（企業一覧）
│   ├── [id].tsx           # 企業詳細・編集画面（面接録音/表示 UI統合）
│   ├── add.tsx            # 企業追加画面
│   └── _layout.tsx        # ナビゲーション設定
├── components/             # 再利用可能なコンポーネント
│   ├── TranscriptionView.tsx # ローカルWhisper連携録音UI
│   ├── AddEventModal.tsx  # 選考イベント追加モーダル
│   ├── CompanyCard.tsx    # 企業カード
│   ├── CompanyForm.tsx    # 企業情報入力フォーム
│   └── SelectionTimeline.tsx # 選考タイムライン
├── database/               # データベース関連
│   ├── schema.ts          # テーブル定義・初期化
│   └── repository.ts      # CRUD操作
├── types/                  # 型定義
│   └── company.ts         # Company, SelectionEvent等
├── utils/                  # ユーティリティ
│   ├── whisperLocal.ts    # ローカルWhisper実行・モデルダウンロードなど
│   ├── audioRecorder.ts   # 音声録音制御
│   ├── date.ts            # 日付フォーマット
│   └── notifications.ts   # 通知スケジュール
└── constants/              # 定数
    └── status.ts          # ステータスリスト
```

## セットアップと実行

本アプリは `whisper.rn` といったネイティブコード依存の機能を利用しているため、**標準の Expo Go アプリでは動作しません**（Prebuild または EAS Build によるネイティブビルドが必要です）。

### 1. 開発用ローカルビルド（シミュレーター・実機接続時）

Mac上に Xcode (iOS用) および Android Studio (Android用) が設定されている場合、コンパイルして実行できます。

```bash
# パッケージのインストール
npm install

# iOSシミュレーターでの実行（ネイティブコードのビルドを含む）
npx expo run:ios

# Androidエミュレーターまたは接続された実機での実行
npx expo run:android
```

### 2. Android APK のビルドとインストール

手元のスマホへ直接インストールしたい場合は、EASを使ったクラウドビルド、またはローカルのGradleビルドのどちらかで `.apk` を作成します。
*(※ リポジトリのルートに手動生成した `shukatsu-manager.apk` を設置済みです。ダウンロードしてAndroid端末に直接インストールすることも可能です)*

**EASでのクラウドビルド（PCスペック不要・要Expoアカウント）:**
```bash
npm install -g eas-cli
eas build -p android --profile preview
```

**ローカルでのAPKビルド:**
```bash
npx expo run:android --variant release
# 生成先: android/app/build/outputs/apk/release/app-release.apk
```

## データモデル

### Company (企業)

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | UUID |
| companyName | string | 会社名 |
| loginId | string? | マイページログインID |
| myPageUrl | string? | マイページURL |
| entryDate | string? | エントリー日 |
| nextInterviewDate | string? | 次回面接日 |
| position | string? | 応募職種 |
| esContent | string? | ES内容 |
| motivation | string? | 志望動機 |
| notes | string? | メモ |
| transcription | string? | 【New】AI文字起こしされた面接の内容 |
| status | string | ステータス |
| sortOrder | number | 並び順 |

## ライセンス

Private
