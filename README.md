# 就活マネージャー (Shukatsu Manager)

就職活動を効率的に管理するためのモバイルアプリケーション。

## 機能

- **企業管理**: 応募企業の情報（会社名・マイページURL・ES内容など）を一元管理
- **選考進捗トラッキング**: ES提出、面接、GDなどの選考イベントをタイムライン形式で表示
- **カスタムステータス**: 自分好みのステータス（選考中、内定、辞退など）を作成・管理
- **リマインダー通知**: 面接日の前日に自動でプッシュ通知
- **ドラッグ並べ替え**: 企業カードを手動で並べ替え可能
- **ソート機能**: ステータス順、面接日順など複数の並び替えオプション

## 技術スタック

- **Framework**: Expo v54 + React Native
- **言語**: TypeScript
- **ナビゲーション**: expo-router
- **データベース**: expo-sqlite (ローカルストレージ)
- **通知**: expo-notifications
- **UI**: react-native-draggable-flatlist, react-native-gesture-handler

## プロジェクト構造

```
shukatsu-manager/
├── app/                    # 画面コンポーネント
│   ├── index.tsx          # ホーム画面（企業一覧）
│   ├── [id].tsx           # 企業詳細・編集画面
│   ├── add.tsx            # 企業追加画面
│   └── _layout.tsx        # ナビゲーション設定
├── components/             # 再利用可能なコンポーネント
│   ├── AddEventModal.tsx  # 選考イベント追加モーダル
│   ├── CompanyCard.tsx    # 企業カード
│   ├── CompanyForm.tsx    # 企業情報入力フォーム
│   ├── SelectionTimeline.tsx # 選考タイムライン
│   └── StatusBadge.tsx    # ステータスバッジ
├── database/               # データベース関連
│   ├── schema.ts          # テーブル定義・初期化
│   └── repository.ts      # CRUD操作
├── types/                  # 型定義
│   └── company.ts         # Company, SelectionEvent等
├── utils/                  # ユーティリティ
│   ├── date.ts            # 日付フォーマット
│   └── notifications.ts   # 通知スケジュール
└── constants/              # 定数
    └── status.ts          # ステータスリスト
```

## セットアップ

### 必要条件

- Node.js v18以上
- npm または yarn
- Expo CLI
- iOS: Xcode (macOSのみ)
- Android: Android Studio

### インストール

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm start

# iOS実行
npm run ios

# Android実行
npm run android
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
| status | string | ステータス |
| sortOrder | number | 並び順 |

### SelectionEvent (選考イベント)

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | UUID |
| companyId | string | 企業ID |
| eventType | string | イベント種別 |
| eventDate | string? | 実施日 |
| result | string | 結果 |
| notes | string? | メモ |

## ライセンス

Private
