import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Invoice, Business } from '../types';
import { formatRupees, paiseToRupees } from '../utils/billingCalculator';

export const pdfService = {
  /**
   * Generates HTML template for A4 or Thermal printing
   */
  generateReceiptHtml(
    invoice: Invoice,
    business: Business,
    templateType: 'thermal' | 'a4' = 'thermal'
  ): string {
    const isThermal = templateType === 'thermal';
    const dateFormatted = new Date(invoice.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const itemsHtml = (invoice.items || [])
      .map(
        (it, idx) => `
        <tr style="border-bottom: 1px dashed #CBD5E1;">
          <td style="padding: 6px 2px; font-size: ${isThermal ? '12px' : '13px'};">
            ${idx + 1}. ${it.productName}
            ${it.productNameTamil ? `<br/><small style="color: #64748B;">${it.productNameTamil}</small>` : ''}
          </td>
          <td style="padding: 6px 2px; text-align: center; font-size: ${isThermal ? '12px' : '13px'};">
            ${it.quantity} ${it.unit}
          </td>
          <td style="padding: 6px 2px; text-align: right; font-size: ${isThermal ? '12px' : '13px'};">
            ${formatRupees(it.unitPricePaise, false)}
          </td>
          <td style="padding: 6px 2px; text-align: right; font-weight: 600; font-size: ${isThermal ? '12px' : '13px'};">
            ${formatRupees(it.totalPaise, false)}
          </td>
        </tr>
      `
      )
      .join('');

    const gstBreakdownHtml =
      invoice.totalTaxPaise > 0
        ? `
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #94A3B8; font-size: 11px; color: #475569;">
          <div style="display: flex; justify-content: space-between;">
            <span>CGST:</span><span>${formatRupees(invoice.cgstPaise)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>SGST:</span><span>${formatRupees(invoice.sgstPaise)}</span>
          </div>
          ${
            invoice.igstPaise > 0
              ? `<div style="display: flex; justify-content: space-between;">
                   <span>IGST:</span><span>${formatRupees(invoice.igstPaise)}</span>
                 </div>`
              : ''
          }
        </div>
      `
        : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt ${invoice.invoiceNumber}</title>
        <style>
          @page {
            size: ${isThermal ? '80mm auto' : 'A4'};
            margin: ${isThermal ? '4mm' : '15mm'};
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #181C1E;
            margin: 0;
            padding: ${isThermal ? '6px' : '20px'};
            width: ${isThermal ? '280px' : '100%'};
            margin: 0 auto;
          }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .flex-between { display: flex; justify-content: space-between; align-items: center; }
          .divider { border-top: 1px solid #CBD5E1; margin: 8px 0; }
          .divider-dashed { border-top: 1px dashed #94A3B8; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <h2 style="margin: 0; font-size: ${isThermal ? '18px' : '24px'}; color: #15324B;">
            ${business.name}
          </h2>
          <p style="margin: 2px 0; font-size: 12px; color: #475569;">${business.address}</p>
          <p style="margin: 2px 0; font-size: 12px; color: #475569;">Phone: ${business.phone}</p>
          ${business.isGstRegistered && business.gstin ? `<p style="margin: 2px 0; font-size: 11px; font-weight: bold;">GSTIN: ${business.gstin}</p>` : ''}
        </div>

        <div class="divider-dashed"></div>

        <div style="font-size: 12px; line-height: 1.5;">
          <div class="flex-between">
            <span class="bold">Bill No: ${invoice.invoiceNumber}</span>
            <span>${dateFormatted}</span>
          </div>
          ${
            invoice.customerName && invoice.customerName !== 'Walk-in Customer'
              ? `<div>Customer: <b>${invoice.customerName}</b> ${invoice.customerPhone ? `(${invoice.customerPhone})` : ''}</div>`
              : ''
          }
        </div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr style="border-bottom: 1.5px solid #15324B; font-size: 12px; text-transform: uppercase;">
              <th style="text-align: left; padding-bottom: 4px;">Item</th>
              <th style="text-align: center; padding-bottom: 4px;">Qty</th>
              <th style="text-align: right; padding-bottom: 4px;">Rate</th>
              <th style="text-align: right; padding-bottom: 4px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="divider-dashed"></div>

        <div style="font-size: 13px; line-height: 1.6;">
          <div class="flex-between">
            <span>Subtotal:</span>
            <span>${formatRupees(invoice.subtotalPaise)}</span>
          </div>
          ${
            invoice.discountPaise > 0
              ? `<div class="flex-between" style="color: #16A34A;">
                  <span>Discount:</span>
                  <span>-${formatRupees(invoice.discountPaise)}</span>
                </div>`
              : ''
          }
          ${gstBreakdownHtml}
          <div class="divider"></div>
          <div class="flex-between bold" style="font-size: ${isThermal ? '16px' : '18px'}; color: #15324B;">
            <span>TOTAL:</span>
            <span>${formatRupees(invoice.grandTotalPaise)}</span>
          </div>
          <div class="flex-between" style="font-size: 12px; margin-top: 4px;">
            <span>Payment Mode:</span>
            <span style="text-transform: uppercase; font-weight: 600;">${invoice.paymentMethod}</span>
          </div>
          <div class="flex-between" style="font-size: 12px;">
            <span>Paid:</span>
            <span>${formatRupees(invoice.paidAmountPaise)}</span>
          </div>
          ${
            invoice.balanceAmountPaise > 0
              ? `<div class="flex-between bold" style="font-size: 12px; color: #DC2626;">
                  <span>Due Balance:</span>
                  <span>${formatRupees(invoice.balanceAmountPaise)}</span>
                </div>`
              : ''
          }
        </div>

        <div class="divider-dashed"></div>

        <div class="text-center" style="margin-top: 12px; font-size: 11px; color: #64748B;">
          <p style="margin: 2px 0;">Thank you for your visit!</p>
          <p style="margin: 2px 0;">Powered by QuickBill App</p>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Generates PDF file on device
   */
  async createPdfFile(
    invoice: Invoice,
    business: Business,
    templateType: 'thermal' | 'a4' = 'thermal'
  ): Promise<string> {
    const html = this.generateReceiptHtml(invoice, business, templateType);
    const { uri } = await Print.printToFileAsync({
      html,
      width: templateType === 'thermal' ? 280 : undefined,
    });
    return uri;
  },

  /**
   * Shares PDF via WhatsApp or OS share sheet
   */
  async shareReceipt(
    invoice: Invoice,
    business: Business,
    templateType: 'thermal' | 'a4' = 'thermal'
  ): Promise<void> {
    const uri = await this.createPdfFile(invoice, business, templateType);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Receipt ${invoice.invoiceNumber}`,
      });
    }
  },

  /**
   * Directly prints receipt to connected printer
   */
  async printReceipt(
    invoice: Invoice,
    business: Business,
    templateType: 'thermal' | 'a4' = 'thermal'
  ): Promise<void> {
    const html = this.generateReceiptHtml(invoice, business, templateType);
    await Print.printAsync({
      html,
    });
  },
};

