import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { escapeHtml } from '../utils/html';
import { pdfService } from '../services/pdf.service';
import { Business, Invoice } from '../types';

const baseBusiness: Business = {
  id: 'b1',
  ownerId: 'u1',
  name: `Ravi's <Super> & "Mart"`,
  businessType: 'retail',
  ownerName: 'Ravi',
  phone: '9876543210',
  address: '10 <Main> & "Cross"',
  isGstRegistered: true,
  gstin: '33ABCDE1234F1Z5',
  currency: 'INR',
  taxInclusive: true,
  defaultTaxRate: 5,
  invoicePrefix: 'QB',
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
};

const baseInvoice: Invoice = {
  id: 'inv-1',
  businessId: 'b1',
  invoiceNumber: 'QB-2627-0001<x>',
  financialYear: '2026-2027',
  customerName: `Sita & "Ram" 'Co' <test>`,
  customerPhone: '9000000001',
  subtotalPaise: 10000,
  discountType: 'none',
  discountValue: 0,
  discountPaise: 0,
  cgstPaise: 250,
  sgstPaise: 250,
  igstPaise: 0,
  totalTaxPaise: 500,
  grandTotalPaise: 10500,
  paidAmountPaise: 10500,
  balanceAmountPaise: 0,
  paymentStatus: 'paid',
  paymentMethod: 'upi',
  isVoid: false,
  createdAt: '2026-11-26T10:00:00Z',
  items: [
    {
      productName: '<img src=x onerror=alert(1)>Tea & Biscuit',
      unit: 'packet',
      quantity: 2,
      unitPricePaise: 5000,
      subtotalPaise: 10000,
      taxRate: 5,
      cgstPaise: 250,
      sgstPaise: 250,
      igstPaise: 0,
      taxPaise: 500,
      discountPaise: 0,
      totalPaise: 10500,
    },
  ],
};

describe('escapeHtml & pdfService', () => {
  test('escapeHtml escapes &, <, >, ", \' and handles null/undefined cleanly', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(`& < > " '`)).toBe('&amp; &lt; &gt; &quot; &#39;');
  });

  test('generateReceiptHtml escapes all user-entered fields', () => {
    const html = pdfService.generateReceiptHtml(baseInvoice, baseBusiness, 'thermal');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;Tea &amp; Biscuit');
    expect(html).toContain('Ravi&#39;s &lt;Super&gt; &amp; &quot;Mart&quot;');
    expect(html).toContain('Sita &amp; &quot;Ram&quot; &#39;Co&#39; &lt;test&gt;');
    expect(html).toContain('QB-2627-0001&lt;x&gt;');
  });

  test('GST block appears only when totalTaxPaise > 0 and Due Balance only when > 0', () => {
    const withTaxAndDue = pdfService.generateReceiptHtml(
      { ...baseInvoice, totalTaxPaise: 500, balanceAmountPaise: 2000 },
      baseBusiness,
      'a4'
    );
    expect(withTaxAndDue).toContain('CGST:');
    expect(withTaxAndDue).toContain('SGST:');
    expect(withTaxAndDue).toContain('Due Balance:');
    expect(withTaxAndDue).toContain('size: A4');

    const noTaxNoDue = pdfService.generateReceiptHtml(
      { ...baseInvoice, totalTaxPaise: 0, cgstPaise: 0, sgstPaise: 0, balanceAmountPaise: 0 },
      { ...baseBusiness, isGstRegistered: false },
      'thermal'
    );
    expect(noTaxNoDue).not.toContain('CGST:');
    expect(noTaxNoDue).not.toContain('Due Balance:');
    expect(noTaxNoDue).toContain('size: 80mm auto');
  });

  test('createPdfFile, shareReceipt, printReceipt, sendWhatsAppReceipt invoke expo modules', async () => {
    const uri = await pdfService.createPdfFile(baseInvoice, baseBusiness, 'thermal');
    expect(Print.printToFileAsync).toHaveBeenCalled();
    expect(uri).toContain('QuickBill_QB-2627-0001_x_.pdf');

    await pdfService.shareReceipt(baseInvoice, baseBusiness, 'thermal');
    expect(Sharing.shareAsync).toHaveBeenCalled();

    await pdfService.sendWhatsAppReceipt(baseInvoice, baseBusiness, 'a4');
    expect(Sharing.shareAsync).toHaveBeenCalledTimes(2);

    await pdfService.printReceipt(baseInvoice, baseBusiness, 'thermal');
    expect(Print.printAsync).toHaveBeenCalled();
  });
});
