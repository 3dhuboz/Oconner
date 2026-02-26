import fs from 'fs';
import { PDFDocument } from 'pdf-lib';

async function checkPdf() {
  const url = 'https://www.rta.qld.gov.au/sites/default/files/2021-06/Form-9-Entry-notice.pdf';
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer);
  const form = pdfDoc.getForm();
  
  const fields = form.getFields();
  fields.forEach(f => {
    try {
      if (f.constructor.name === 'PDFTextField') {
        form.getTextField(f.getName()).setText(f.getName());
      } else if (f.constructor.name === 'PDFCheckBox') {
        form.getCheckBox(f.getName()).check();
      }
    } catch (e) {}
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('test-form9.pdf', pdfBytes);
}

checkPdf().catch(console.error);
