export default function PaymentStatus() {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <h3 className="font-semibold text-lg text-card-foreground mb-4" data-testid="text-payment-status-title">
        Payment Status
      </h3>
      
      {/* Idle State */}
      <div className="text-center py-8" data-testid="payment-idle">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-credit-card text-2xl text-muted-foreground"></i>
        </div>
        <p className="text-muted-foreground" data-testid="text-no-active-payments">
          No active payments
        </p>
        <p className="text-sm text-muted-foreground mt-1" data-testid="text-select-device-hint">
          Select a device action to begin
        </p>
      </div>
    </div>
  );
}
