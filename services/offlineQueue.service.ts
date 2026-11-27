import AsyncStorage from '@react-native-async-storage/async-storage';
import { BillCalculationResult, Customer, PaymentMethod } from '../types';
import { billingService } from './billing.service';

const OFFLINE_QUEUE_KEY = 'qb_offline_invoice_queue_v1';

export type OfflineInvoiceStatus = 'pending_sync' | 'failed';

export interface QueuedOfflineInvoice {
  localId: string;
  businessId: string;
  calculation: BillCalculationResult;
  paymentMethod: PaymentMethod;
  paidAmountPaise: number;
  customer?: Customer | null;
  notes?: string;
  invoicePrefix: string;
  splitBreakdown?: { cashPaise: number; upiPaise: number };
  paymentReference?: string;
  status: OfflineInvoiceStatus;
  attempts: number;
  lastError?: string;
  createdAt: string;
}

const isNetworkFailure = (errorMessage?: string): boolean => {
  const msg = (errorMessage || '').toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('timeout') ||
    msg.includes('offline') ||
    msg.includes('connection')
  );
};

export const offlineQueueService = {
  isNetworkError: isNetworkFailure,

  async getQueue(): Promise<QueuedOfflineInvoice[]> {
    try {
      const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  async saveQueue(queue: QueuedOfflineInvoice[]): Promise<void> {
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  },

  async enqueueInvoice(
    entry: Omit<QueuedOfflineInvoice, 'status' | 'attempts' | 'createdAt'>
  ): Promise<QueuedOfflineInvoice> {
    const queue = await this.getQueue();
    const existing = queue.find((q) => q.localId === entry.localId);
    if (existing) return existing;

    const queued: QueuedOfflineInvoice = {
      ...entry,
      status: 'pending_sync',
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    queue.push(queued);
    await this.saveQueue(queue);
    return queued;
  },

  async removeFromQueue(localId: string): Promise<void> {
    const queue = await this.getQueue();
    await this.saveQueue(queue.filter((q) => q.localId !== localId));
  },

  /**
   * Syncs queued offline invoices through billingService.createInvoice using their
   * original localId so server-side validation, pricing, stock checks, and
   * idempotency are never bypassed.
   */
  async syncPendingInvoices(
    businessId: string
  ): Promise<{ syncedCount: number; failedCount: number; remainingCount: number }> {
    const queue = await this.getQueue();
    const targets = queue.filter((q) => q.businessId === businessId);
    if (targets.length === 0) {
      return { syncedCount: 0, failedCount: 0, remainingCount: 0 };
    }

    let syncedCount = 0;
    let failedCount = 0;
    const updatedQueue: QueuedOfflineInvoice[] = queue.filter(
      (q) => q.businessId !== businessId
    );

    for (const item of targets) {
      const res = await billingService.createInvoice(
        item.businessId,
        item.calculation,
        item.paymentMethod,
        item.paidAmountPaise,
        item.customer,
        item.notes,
        item.invoicePrefix,
        item.splitBreakdown,
        item.paymentReference,
        item.localId
      );

      if (res.invoice) {
        syncedCount++;
      } else {
        failedCount++;
        updatedQueue.push({
          ...item,
          status: isNetworkFailure(res.error) ? 'pending_sync' : 'failed',
          attempts: item.attempts + 1,
          lastError: res.error || 'Sync failed',
        });
      }
    }

    await this.saveQueue(updatedQueue);
    const remainingCount = updatedQueue.filter((q) => q.businessId === businessId).length;
    return { syncedCount, failedCount, remainingCount };
  },
};
