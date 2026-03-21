# Payments in Jordan (Fursa)

## Current app behavior

- **Internal wallet** (`balance`, `escrow`) powers projects and escrow — this is already in the app.
- **Top-up** (`POST /api/wallet/deposit`):
  - **`WALLET_SANDBOX=true`** → adds **test money** (no card). Good for development and demos.
  - **`WALLET_SANDBOX=false`** (recommended for real production) → deposit API **returns 403**; you must **credit the wallet only after** your payment provider confirms payment (webhook).

## Environment

```env
# true = allow fake "Add funds" (sandbox / demo)
# false = real mode: wire PayTabs/Tap/HyperPay webhook before crediting wallet
WALLET_SANDBOX=true

# Optional cap per sandbox deposit (default 50000)
SANDBOX_DEPOSIT_MAX=50000
```

## Jordan-friendly providers (choose one, then integrate)

Stripe is often unavailable for Jordan-based merchants; common options:

| Provider    | Notes                          |
|------------|---------------------------------|
| **Tap Payments** | Popular in MENA, cards & local methods |
| **HyperPay**     | Jordan / regional                |
| **PayTabs**      | MENA — primary integration in Fursa app |

Integration pattern (any provider):

1. Mobile or web opens **hosted checkout** or **in-app SDK** with `amount` and your `userId` in metadata.
2. On **success webhook** on the backend, verify the event signature, then run the same logic as sandbox deposit: `Wallet.update` + `Transaction` type `deposit` with description like `Card top-up via Tap`.

Do **not** trust the mobile app alone to add balance — only the **server** after webhook verification.

## Next step in code

Add a route such as `POST /api/payments/tap/webhook` (or your provider’s name) that:

1. Verifies the payload.
2. Finds `userId` from metadata.
3. Increments `wallet.balance` and creates a `deposit` transaction.

Until that exists, keep **`WALLET_SANDBOX=true`** for testing.
