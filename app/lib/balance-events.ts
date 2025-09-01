// Event emitter for balance updates
class BalanceEventEmitter extends EventTarget {
  triggerBalanceUpdate() {
    this.dispatchEvent(new CustomEvent('balance-update'));
  }

  onBalanceUpdate(callback: () => void) {
    const handler = () => callback();
    this.addEventListener('balance-update', handler);
    return () => this.removeEventListener('balance-update', handler);
  }
}

export const balanceEvents = new BalanceEventEmitter();