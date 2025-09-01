# x402 Enhanced署名システム 運用ガイド

## 🎯 概要

このガイドでは、x402 Enhanced署名システムの実際の運用方法について説明します。HMAC-SHA256ベースのv2署名からJWS（JSON Web Signature）への段階的移行までをカバーします。

## 🚀 Quick Start

### 1. 基本設定

```bash
# .env ファイルの設定
NETWORK=sepolia                  # sepolia | mainnet
ENHANCED_X402=true              # Enhanced機能を有効化
X402_SIGNATURE_VERSION=v2       # v1(legacy) | v2(enhanced)

# Enhanced HMAC Keys (JSON形式)
X402_HMAC_KEYS='{"prod-2025-02":"32文字以上の秘密鍵","backup-2025-02":"バックアップ鍵"}'
X402_CURRENT_KEY_ID=prod-2025-02

# 管理用設定
X402_ADMIN_KEY=secure_admin_key_for_production
X402_MAX_KEYS=5
DEBUG_X402=false
```

### 2. 即座に使える設定例

```bash
# 開発環境（Sepolia）
NETWORK=sepolia
ENHANCED_X402=true
X402_SIGNATURE_VERSION=v2
X402_HMAC_KEYS='{"dev-2025-02":"abcdefghijklmnopqrstuvwxyz012345"}'
X402_CURRENT_KEY_ID=dev-2025-02
X402_ADMIN_KEY=dev_admin_key_change_in_production

# 本番環境（Mainnet）
NETWORK=mainnet
ENHANCED_X402=true
X402_SIGNATURE_VERSION=v2
X402_HMAC_KEYS='{"prod-2025-02":"生成された64文字の強力な秘密鍵"}'
X402_CURRENT_KEY_ID=prod-2025-02
X402_ADMIN_KEY=生成された強力な管理者キー
```

### 3. サーバー起動確認

```bash
npm run dev

# 以下のログが表示されれば成功:
# [EnhancedSignatureVerifier] Loaded key: prod-2025-02
# [express] serving on port 5001
```

## 🔧 日常運用

### システム健全性チェック

```bash
# 署名システムの状態確認
curl -s http://localhost:5001/api/admin/signature/info
# 期待される結果:
{
  "current": "enhanced",
  "keyInfo": {
    "currentKid": "prod-2025-02",
    "availableKids": ["prod-2025-02", "backup-2025-02"]
  },
  "validation": {
    "valid": true,
    "issues": []
  }
}

# 全体システムの健全性確認
curl -s http://localhost:5001/api/admin/health
# 期待される結果:
{
  "signature": {"system": "enhanced", "valid": true, "issues": []},
  "blockchain": {"connected": true, "network": "sepolia"},
  "orderManager": {"active": true, "cleanupNeeded": false}
}
```

### x402フロー動作確認

```bash
# 1. 402レスポンスのテスト
curl -X POST http://localhost:5001/api/devices/ESP32_001/commands/dispense \
  -H "Content-Type: application/json" -v

# 確認ポイント:
# - HTTP/1.1 402 Payment Required
# - X-Payment-Signature: v2=... (v2署名)
# - 正確な料金: ESP32_001 = $0.01

# 2. 署名の内容確認
SIGNATURE_B64="署名ヘッダーからv2=以降をコピー"
echo "$SIGNATURE_B64" | base64 -d
# 期待される内容: {"v":"v2","ts":タイムスタンプ,"kid":"prod-2025-02","sig":"..."}
```

## 🔐 セキュリティ運用

### 鍵の生成

```bash
# 新しい HMAC 鍵の生成 (64文字推奨)
openssl rand -hex 32
# 例: a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

# 管理者キーの生成
openssl rand -base64 48
# 例: yJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJzdWIiOiIxMjM0NTY3ODkw
```

### 鍵のローテーション

```bash
# 新しい鍵を生成
NEW_KEY_ID="prod-2025-03"
NEW_SECRET=$(openssl rand -hex 32)

# APIを使用してローテーション実行
curl -X POST http://localhost:5001/api/admin/signature/rotate \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: $X402_ADMIN_KEY" \
  -d "{\"keyId\":\"$NEW_KEY_ID\",\"secret\":\"$NEW_SECRET\"}"

# 成功確認
curl -s http://localhost:5001/api/admin/signature/info
```

### 定期メンテナンス（月次推奨）

```bash
# 1. 古い鍵の確認
curl -s http://localhost:5001/api/admin/signature/info | grep availableKids

# 2. システム健全性チェック
curl -s http://localhost:5001/api/admin/health

# 3. 新しい鍵でローテーション
# (上記の鍵ローテーション手順を実行)

# 4. 環境変数ファイルの更新
# X402_HMAC_KEYS に新しい鍵を追加し、古い鍵を削除
```

## 🚨 トラブルシューティング

### よくある問題と解決方法

#### 1. "No keys configured" エラー

```bash
# 問題: [EnhancedSignatureVerifier] No keys configured, generated emergency key
# 原因: X402_HMAC_KEYS が設定されていない

# 解決方法:
echo 'X402_HMAC_KEYS='"'"'{"default":"'$(openssl rand -hex 32)'"'"}"'"' >> .env
echo 'X402_CURRENT_KEY_ID=default' >> .env
```

#### 2. "Key rotation requires Enhanced signature system" エラー

```bash
# 問題: X402_SIGNATURE_VERSION=v2 が設定されていない
# 解決方法:
echo 'X402_SIGNATURE_VERSION=v2' >> .env
# サーバー再起動後に再実行
```

#### 3. "Signature expired" エラー

```bash
# 問題: 署名が5分を超えて古い
# 原因: サーバー間の時刻同期問題

# 解決方法:
# 1. サーバーの時刻確認
date
# 2. NTP同期確認
systemctl status ntp
# 3. 必要に応じて時刻同期
sudo ntpdate -s time.nist.gov
```

#### 4. "Unknown key ID" エラー

```bash
# 問題: 古いキーIDが参照されている
# 解決方法: キー情報の確認と修正
curl -s http://localhost:5001/api/admin/signature/info

# 現在のキーIDを環境変数に反映
echo 'X402_CURRENT_KEY_ID=正しいキーID' >> .env
```

### デバッグモード

```bash
# 詳細ログを有効化
DEBUG_X402=true npm run dev

# 署名検証の詳細ログが表示される:
# Signature verified successfully: {"version":"v2","keyId":"prod-2025-02","timestamp":1756694489}
```

### 緊急時の対応

```bash
# 1. レガシーモードへのフォールバック
X402_SIGNATURE_VERSION=v1 npm run dev

# 2. 基本モードへのフォールバック
ENHANCED_X402=false npm run dev

# 3. 完全な初期化
rm .env
cp .env.example .env
# 基本設定を再入力
```

## 📊 監視とメトリクス

### ログ監視

```bash
# 重要なログメッセージ:
grep "EnhancedSignatureVerifier" logs/app.log
grep "Key rotated" logs/app.log
grep "Signature verification failed" logs/app.log

# エラーパターン:
grep -E "(expired|unknown key|invalid signature)" logs/app.log
```

### パフォーマンス監視

```bash
# 署名生成時間の測定
time curl -X POST http://localhost:5001/api/devices/ESP32_001/commands/dispense

# 目標値:
# - 402レスポンス生成: < 10ms
# - 署名検証: < 5ms
# - 全体レスポンス: < 100ms
```

### アラート設定例

```yaml
# Prometheus/Grafana アラート設定例
alert: X402SignatureFailure
expr: increase(x402_signature_verification_failures[5m]) > 5
for: 2m
labels:
  severity: warning
annotations:
  summary: "High x402 signature verification failure rate"
  description: "{{ $value }} signature verifications failed in the last 5 minutes"

alert: X402KeyRotationNeeded
expr: (time() - x402_key_creation_timestamp) > 2592000  # 30 days
for: 1h
labels:
  severity: info
annotations:
  summary: "x402 key rotation recommended"
  description: "Current key is {{ $value }}s old, consider rotation"
```

## 🔄 JWS移行準備

### Phase 2: JWS実装に向けた準備

```bash
# RSA鍵ペアの生成
openssl genrsa -out x402-private.pem 2048
openssl rsa -in x402-private.pem -pubout -out x402-public.pem

# JWS設定の準備
X402_JWS_KEYS='{"prod-2025-02":{"private":"-----BEGIN PRIVATE KEY-----...","public":"-----BEGIN PUBLIC KEY-----..."}}'
X402_JWS_CURRENT_KID="prod-2025-02"

# Dual運用設定
X402_SIGNATURE_STRATEGY=dual  # hmac-only | jws-only | dual
```

### 段階的移行計画

1. **Week 1**: Enhanced HMAC運用開始
2. **Week 2-3**: JWS実装とテスト
3. **Week 4**: Dual運用開始
4. **Week 6-8**: JWS移行完了

## 📚 参考情報

### 設定ファイルの例

#### .env.production

```bash
# Production Configuration for x402 Enhanced Signature System
NODE_ENV=production
NETWORK=mainnet
ENHANCED_X402=true
X402_SIGNATURE_VERSION=v2

# Production Keys (replace with actual values)
X402_HMAC_KEYS='{"prod-2025-02-15":"実際の本番鍵1","prod-2025-01-15":"バックアップ鍵"}'
X402_CURRENT_KEY_ID=prod-2025-02-15
X402_MAX_KEYS=3

# Security
X402_ADMIN_KEY=実際の強力な管理者キー
DEBUG_X402=false

# Blockchain
BASE_MAINNET_RPC=https://mainnet.base.org
BASE_MAINNET_USDC=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
PAYMENT_RECIPIENT=0x実際の本番ウォレットアドレス
```

#### docker-compose.yml

```yaml
version: '3.8'
services:
  xcockpit-api:
    build: .
    ports:
      - "5001:5001"
    environment:
      - NODE_ENV=production
      - NETWORK=mainnet
      - ENHANCED_X402=true
      - X402_SIGNATURE_VERSION=v2
    env_file:
      - .env.production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5001/api/admin/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
```

### API リファレンス

#### 署名システム情報取得

```bash
GET /api/admin/signature/info

Response:
{
  "current": "enhanced" | "legacy",
  "keyInfo": {
    "currentKid": "string",
    "availableKids": ["string"]
  },
  "validation": {
    "valid": boolean,
    "issues": ["string"]
  }
}
```

#### 鍵ローテーション

```bash
POST /api/admin/signature/rotate
Headers: X-Admin-Key: <admin_key>
Body: {
  "keyId": "string",
  "secret": "string"
}

Response:
{
  "message": "Key rotated successfully",
  "keyId": "string",
  "timestamp": "ISO8601"
}
```

#### システム健全性チェック

```bash
GET /api/admin/health

Response:
{
  "signature": {
    "system": "enhanced" | "legacy",
    "valid": boolean,
    "issues": ["string"]
  },
  "blockchain": {
    "connected": boolean,
    "network": "sepolia" | "mainnet"
  },
  "orderManager": {
    "active": boolean,
    "cleanupNeeded": boolean
  }
}
```

## 🏆 ベストプラクティス

### 1. セキュリティ

- 鍵は定期的にローテーション（月次推奨）
- 管理者キーは環境ごとに異なるものを使用
- 本番環境では DEBUG_X402=false に設定
- HTTPS必須（本番環境）

### 2. 可用性

- 複数の鍵を常時保持（current + backup）
- ヘルスチェックエンドポイントの監視
- 緊急時のフォールバック手順を準備

### 3. パフォーマンス

- 鍵数は最大5個以下に制限
- 古い鍵の定期削除
- レスポンス時間の監視

### 4. 運用

- 変更前には必ずテスト環境で確認
- 鍵ローテーション後の動作確認
- 定期的なバックアップとリストア試験

---

**このガイドに従って、安全で安定した x402 Enhanced署名システムを運用できます。追加の質問や問題が発生した場合は、開発チームにお問い合わせください。**