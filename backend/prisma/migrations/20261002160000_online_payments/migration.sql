-- What an application costs: set from the division's service fee when it is
-- submitted, and adjustable by an administrator (for a quotation).
ALTER TABLE "Application" ADD COLUMN "amountDue" DECIMAL(12,2);

-- Online (bKash) payments: the gateway's own identifiers and progress.
ALTER TABLE "Payment" ADD COLUMN "gatewayPaymentId" TEXT,
ADD COLUMN "gatewayTransactionId" TEXT,
ADD COLUMN "gatewayStatus" TEXT,
ADD COLUMN "gatewaySignature" TEXT,
ADD COLUMN "payerAccount" TEXT;

CREATE UNIQUE INDEX "Payment_gatewayPaymentId_key" ON "Payment"("gatewayPaymentId");

CREATE TABLE "ServiceFee" (
    "division" "ApplicationType" NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Service fee',
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "minimumPayment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceFee_pkey" PRIMARY KEY ("division")
);

-- bKash allows only two token requests an hour, so the token is kept here and
-- reused across restarts.
CREATE TABLE "GatewayToken" (
    "provider" TEXT NOT NULL,
    "idToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GatewayToken_pkey" PRIMARY KEY ("provider")
);
