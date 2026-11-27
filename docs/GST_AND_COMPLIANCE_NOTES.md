# QuickBill — Indian GST & Billing Compliance Notes

This document records the current GST calculation behavior verified in QuickBill and lists features that require additional compliance work before claiming full statutory Indian GST compliance.

## 1. Verified Capabilities
- **Integer Paise Arithmetic:** All persisted monetary values (`subtotal_paise`, `discount_paise`, `cgst_paise`, `sgst_paise`, `igst_paise`, `total_tax_paise`, `grand_total_paise`, `paid_amount_paise`, `balance_amount_paise`) are stored as integer paise (`BIGINT`).
- **GST Modes:** Supports both GST-inclusive and GST-exclusive product pricing.
- **Intra-State vs Inter-State:** Splits tax 50/50 into CGST + SGST (handling odd paise without loss) for intra-state bills, and applies IGST for inter-state bills.
- **Discount Allocation:** Bill-level discounts (fixed or percentage) are distributed across line items using Hamilton's largest-remainder method so `sum(lineDiscounts) === billDiscount` exactly, and tax is computed on post-discount taxable value.
- **Invoice Rounding:** Grand totals are rounded to the nearest rupee (`roundOffPaise` in `[-50, +50]`).
- **Receipt & Invoice Fields:** Displays business GSTIN (when `isGstRegistered` is true), sequential invoice number (`PREFIX-FY-SEQ`), invoice date, customer details, item-level quantities/rates/totals, and CGST/SGST/IGST breakdown.

## 2. Features Requiring Additional Statutory Compliance Work
1. **Credit Notes & Debit Notes (Section 34 CGST Act):**
   - Currently, QuickBill supports `voidInvoice` (`is_void = true`), which marks an invoice void, rather than issuing formal GST Credit Notes (`CN-...`) for returns/price adjustments with stock restoration and GSTR-1 Table 9B reporting.
2. **Partial / Full Refunds:**
   - Dedicated refund workflows and refund payment ledger entries are not yet implemented.
3. **E-Invoicing (IRN & QR Code) & E-Way Bills:**
   - Businesses exceeding the statutory turnover threshold require NIC/IRP API integration to generate Invoice Reference Numbers (IRN) and signed QR codes, as well as E-Way Bills for applicable goods movement.
4. **HSN / SAC Code & Place of Supply:**
   - Products do not yet store mandatory 4/6/8-digit HSN/SAC codes, and invoices do not yet persist explicit Place of Supply state codes.
5. **Offline Invoice Numbering Policy:**
   - Offline-queued invoices (`offlineQueueService`) are held with a temporary `local_id` and `pending_sync` status; official sequential GST invoice numbers are assigned only when accepted by PostgreSQL (`create_invoice_atomic`). Offline-issued provisional bills should not be treated as final tax invoices until synced unless the business adopts a legally reviewed offline series policy.
