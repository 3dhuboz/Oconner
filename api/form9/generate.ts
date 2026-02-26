import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';

async function tryFillTemplate(body: any): Promise<Uint8Array | null> {
  try {
    const templatePath = path.join(process.cwd(), 'api', 'form9', 'Form9-template.pdf');
    const fileBuffer = fs.readFileSync(templatePath);
    // Convert Node Buffer to Uint8Array for pdf-lib compatibility
    const uint8 = new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength);

    const pdfDoc = await PDFDocument.load(uint8);
    const form = pdfDoc.getForm();

    const { tenantName, propertyAddress, proposedEntryDate } = body;
    const today = new Date();
    const entryDateObj = new Date(proposedEntryDate);

    form.getTextField('Name/s of tenant/s').setText(tenantName || '');
    form.getTextField('Address1').setText(propertyAddress || '');
    form.getTextField('Address of rental property 4').setText(propertyAddress || '');
    form.getCheckBox('Other authorised person (secondary agent)').check();
    form.getTextField('Full name or trading name 1').setText('Wirez R Us (Contractor)');
    form.getTextField('Full name or trading name 2').setText('Wirez R Us Technician');
    form.getTextField('Day 1').setText(format(today, 'EEEE'));
    form.getTextField('Date (dd/mm/yyyy)1').setText(format(today, 'dd/MM/yyyy'));
    form.getTextField('Method of issue 1').setText('Email');
    form.getTextField('Day 2').setText(format(entryDateObj, 'EEEE'));
    form.getTextField('Date (dd/mm/yyyy) 2').setText(format(entryDateObj, 'dd/MM/yyyy'));

    const timeFrom = format(entryDateObj, 'hh:mm a');
    const timeTo = format(new Date(entryDateObj.getTime() + 2 * 3600 * 1000), 'hh:mm a');
    form.getTextField('Time of entry').setText(timeFrom);
    form.getTextField('Two hour period from').setText(timeFrom);
    form.getTextField('Two hour period to').setText(timeTo);
    form.getCheckBox('Checkbox3').check();
    form.getTextField('Print name').setText('Wirez R Us');
    form.getTextField('Date of signature (dd/mm/yyyy)').setText(format(today, 'dd/MM/yyyy'));

    return await pdfDoc.save();
  } catch (e: any) {
    console.error('[Form9] Template fill failed, falling back to generated PDF:', e.message);
    return null;
  }
}

async function generateFallbackPdf(body: any): Promise<Uint8Array> {
  const { tenantName, propertyAddress, proposedEntryDate, jobId } = body;
  const today = new Date();
  const entryDateObj = new Date(proposedEntryDate);
  const timeFrom = format(entryDateObj, 'hh:mm a');
  const timeTo = format(new Date(entryDateObj.getTime() + 2 * 3600 * 1000), 'hh:mm a');

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  let y = height - 50;
  const left = 50;
  const lineH = 18;

  // Header
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.08, 0.15, 0.33) });
  page.drawText('FORM 9 — Entry Notice', { x: left, y: height - 35, size: 22, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Residential Tenancies and Rooming Accommodation Act 2008 (s 192)', {
    x: left, y: height - 55, size: 9, font, color: rgb(0.8, 0.8, 0.8),
  });

  y = height - 110;

  const drawField = (label: string, value: string) => {
    page.drawText(label, { x: left, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 14;
    page.drawText(value || '—', { x: left, y, size: 11, font: fontBold, color: rgb(0, 0, 0) });
    y -= lineH + 4;
  };

  drawField('Tenant Name(s)', tenantName || 'N/A');
  drawField('Rental Property Address', propertyAddress || 'N/A');
  drawField('Notice Issued By', 'Wirez R Us (Contractor)');
  drawField('Date of Issue', format(today, 'EEEE, dd MMMM yyyy'));
  drawField('Method of Issue', 'Email');

  y -= 8;
  page.drawLine({ start: { x: left, y }, end: { x: width - left, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  y -= 20;

  page.drawText('ENTRY DETAILS', { x: left, y, size: 13, font: fontBold, color: rgb(0.08, 0.15, 0.33) });
  y -= lineH + 6;

  drawField('Day of Entry', format(entryDateObj, 'EEEE'));
  drawField('Date of Entry', format(entryDateObj, 'dd MMMM yyyy'));
  drawField('Entry Time Window', `${timeFrom} — ${timeTo} (2-hour period)`);
  drawField('Reason for Entry', 'Carry out routine repairs or maintenance (electrical)');

  y -= 8;
  page.drawLine({ start: { x: left, y }, end: { x: width - left, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  y -= 20;

  page.drawText('AUTHORISED PERSON', { x: left, y, size: 13, font: fontBold, color: rgb(0.08, 0.15, 0.33) });
  y -= lineH + 6;
  drawField('Name', 'Wirez R Us Technician');
  drawField('Organisation', 'Wirez R Us Electrical Services');

  y -= 8;
  page.drawLine({ start: { x: left, y }, end: { x: width - left, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  y -= 20;

  page.drawText('SIGNATURE', { x: left, y, size: 13, font: fontBold, color: rgb(0.08, 0.15, 0.33) });
  y -= lineH + 6;
  drawField('Signed by', 'Wirez R Us');
  drawField('Date of Signature', format(today, 'dd/MM/yyyy'));

  // Footer
  page.drawText(`Job Reference: ${jobId || 'N/A'}`, {
    x: left, y: 40, size: 8, font, color: rgb(0.6, 0.6, 0.6),
  });
  page.drawText('This notice is issued under the Residential Tenancies and Rooming Accommodation Act 2008 (Qld)', {
    x: left, y: 28, size: 7, font, color: rgb(0.6, 0.6, 0.6),
  });

  return await pdfDoc.save();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { proposedEntryDate, jobId } = req.body;

    if (!proposedEntryDate) {
      return res.status(400).json({ error: 'Proposed entry date is required' });
    }

    // Try filling the official RTA template first, fall back to generated PDF
    let pdfBytes = await tryFillTemplate(req.body);
    if (!pdfBytes) {
      pdfBytes = await generateFallbackPdf(req.body);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Form9_${jobId || 'download'}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error: any) {
    console.error('[Form9] Critical error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate Form 9 PDF' });
  }
}
