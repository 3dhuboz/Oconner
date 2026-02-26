import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PDFDocument } from 'pdf-lib';
import { format } from 'date-fns';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tenantName, propertyAddress, tenantEmail, propertyManagerEmail, proposedEntryDate, jobId } = req.body;

    if (!proposedEntryDate) {
      return res.status(400).json({ error: 'Proposed entry date is required' });
    }

    // Fetch the actual RTA Form 9 PDF directly from server (no CORS issue)
    const formUrl = 'https://www.rta.qld.gov.au/sites/default/files/2021-06/Form-9-Entry-notice.pdf';
    const pdfResponse = await fetch(formUrl);

    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch Form 9 PDF from RTA (status ${pdfResponse.status})`);
    }

    const existingPdfBytes = await pdfResponse.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    // Fill the actual Form 9 fields
    try {
      form.getTextField('Name/s of tenant/s').setText(tenantName || '');
      form.getTextField('Address1').setText(propertyAddress || '');
      form.getTextField('Address of rental property 4').setText(propertyAddress || '');

      form.getCheckBox('Other authorised person (secondary agent)').check();
      form.getTextField('Full name or trading name 1').setText('Wirez R Us (Contractor)');
      form.getTextField('Full name or trading name 2').setText('Wirez R Us Technician');

      const today = new Date();
      form.getTextField('Day 1').setText(format(today, 'EEEE'));
      form.getTextField('Date (dd/mm/yyyy)1').setText(format(today, 'dd/MM/yyyy'));
      form.getTextField('Method of issue 1').setText('Email');

      const entryDateObj = new Date(proposedEntryDate);
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
    } catch (e) {
      console.warn('Could not fill some form fields', e);
    }

    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Form9_${jobId || 'download'}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error: any) {
    console.error('Error generating Form 9:', error);
    res.status(500).json({ error: error.message || 'Failed to generate Form 9 PDF' });
  }
}
