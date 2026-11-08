// =================================================================
// File: src/services/pdf.service.js
// Purpose: PDF generation engine using pdf-lib.
//          Generates Business Permit, E-Resibo, TOP, and Barangay
//          Clearance documents as downloadable PDF buffers.
// Policy:  All PDFs follow the Municipality of Liliw branding.
//          No external fonts required — uses pdf-lib standard fonts.
// =================================================================

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

// -----------------------------------------------------------------
// SHARED HELPERS
// -----------------------------------------------------------------

const COLORS = {
  black: rgb(0, 0, 0),
  darkGray: rgb(0.2, 0.2, 0.2),
  gray: rgb(0.4, 0.4, 0.4),
  lightGray: rgb(0.7, 0.7, 0.7),
  white: rgb(1, 1, 1),
  accent: rgb(0.1, 0.4, 0.2), // Dark green for government docs
  red: rgb(0.7, 0.1, 0.1),
};

const formatCurrency = (amount) => {
  return `PHP ${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Draws a centered header block for municipality documents.
 */
const drawMunicipalityHeader = (page, font, boldFont, yStart) => {
  const { width } = page.getSize();
  let y = yStart;

  page.drawText('Republic of the Philippines', { x: width / 2 - 80, y, size: 9, font, color: COLORS.gray });
  y -= 14;
  page.drawText('Province of Laguna', { x: width / 2 - 55, y, size: 9, font, color: COLORS.gray });
  y -= 14;
  page.drawText('MUNICIPALITY OF LILIW', { x: width / 2 - 75, y, size: 12, font: boldFont, color: COLORS.black });
  y -= 14;
  page.drawText('Office of the Municipal Mayor', { x: width / 2 - 72, y, size: 9, font, color: COLORS.gray });
  y -= 30;

  return y;
};

/**
 * Draws a labeled field row.
 */
const drawField = (page, font, boldFont, label, value, x, y, labelWidth = 140) => {
  page.drawText(label, { x, y, size: 9, font: boldFont, color: COLORS.darkGray });
  page.drawText(value || '—', { x: x + labelWidth, y, size: 9, font, color: COLORS.black });
  return y - 16;
};

// -----------------------------------------------------------------
// BUSINESS PERMIT PDF
// -----------------------------------------------------------------

/**
 * Generates a Business Permit PDF.
 * @param {object} data - { permitNo, applicationNo, businessName, tradeName, ownerName, address, activities, issuedAt, expiresAt, issuedBy }
 * @returns {Promise<Buffer>}
 */
const generatePermitPDF = async (data) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { width } = page.getSize();
  let y = 750;

  // Header
  y = drawMunicipalityHeader(page, font, boldFont, y);

  // Title
  page.drawText('BUSINESS PERMIT', { x: width / 2 - 65, y, size: 16, font: boldFont, color: COLORS.accent });
  y -= 30;

  // Permit Number
  page.drawText(`Permit No: ${data.permitNo}`, { x: width / 2 - 55, y, size: 10, font: boldFont, color: COLORS.darkGray });
  y -= 30;

  // Details
  const leftMargin = 60;
  y = drawField(page, font, boldFont, 'Application No:', data.applicationNo, leftMargin, y);
  y = drawField(page, font, boldFont, 'Business Name:', data.businessName, leftMargin, y);
  if (data.tradeName) {
    y = drawField(page, font, boldFont, 'Trade Name:', data.tradeName, leftMargin, y);
  }
  y = drawField(page, font, boldFont, 'Owner:', data.ownerName, leftMargin, y);
  y = drawField(page, font, boldFont, 'Address:', data.address, leftMargin, y);
  y -= 10;

  // Lines of Business
  page.drawText('Line(s) of Business:', { x: leftMargin, y, size: 9, font: boldFont, color: COLORS.darkGray });
  y -= 16;

  if (data.activities && data.activities.length > 0) {
    for (const activity of data.activities) {
      page.drawText(`•  ${activity}`, { x: leftMargin + 15, y, size: 9, font, color: COLORS.black });
      y -= 14;
    }
  } else {
    page.drawText('•  General Business', { x: leftMargin + 15, y, size: 9, font, color: COLORS.black });
    y -= 14;
  }

  y -= 20;

  // Validity
  y = drawField(page, font, boldFont, 'Date Issued:', formatDate(data.issuedAt), leftMargin, y);
  y = drawField(page, font, boldFont, 'Valid Until:', formatDate(data.expiresAt), leftMargin, y);
  y -= 30;

  // Issued By
  page.drawText('Issued by:', { x: leftMargin, y, size: 9, font, color: COLORS.gray });
  y -= 20;
  page.drawText(data.issuedBy || 'Municipal Mayor', { x: leftMargin, y, size: 11, font: boldFont, color: COLORS.black });
  y -= 14;
  page.drawText('Municipal Mayor', { x: leftMargin, y, size: 9, font, color: COLORS.gray });

  // Footer
  page.drawText('This permit is non-transferable and must be displayed conspicuously at the place of business.', {
    x: leftMargin, y: 50, size: 7, font, color: COLORS.lightGray,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

// -----------------------------------------------------------------
// E-RESIBO (OFFICIAL RECEIPT) PDF
// -----------------------------------------------------------------

/**
 * Generates an E-Resibo (Official Receipt) PDF.
 * @param {object} data - { orNumber, businessName, ownerName, applicationNo, paidAt, lineItems, totalAmount, tenderedType, amountTendered, changeAmount, cashierName }
 * @returns {Promise<Buffer>}
 */
const generateEResiboPDF = async (data) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([612, 792]);
  const { width } = page.getSize();
  let y = 750;

  // Header
  y = drawMunicipalityHeader(page, font, boldFont, y);

  // Title
  page.drawText('OFFICIAL RECEIPT (E-Resibo)', { x: width / 2 - 95, y, size: 14, font: boldFont, color: COLORS.accent });
  y -= 30;

  // OR Number
  page.drawText(`OR No: ${data.orNumber}`, { x: width / 2 - 45, y, size: 11, font: boldFont, color: COLORS.red });
  y -= 30;

  // Details
  const leftMargin = 60;
  y = drawField(page, font, boldFont, 'Business Name:', data.businessName, leftMargin, y);
  y = drawField(page, font, boldFont, 'Owner:', data.ownerName, leftMargin, y);
  y = drawField(page, font, boldFont, 'Application No:', data.applicationNo, leftMargin, y);
  y = drawField(page, font, boldFont, 'Date Paid:', formatDate(data.paidAt), leftMargin, y);
  y = drawField(page, font, boldFont, 'Payment Mode:', data.tenderedType || 'Cash', leftMargin, y);
  y -= 15;

  // Fee Breakdown Table Header
  page.drawText('PARTICULARS', { x: leftMargin, y, size: 8, font: boldFont, color: COLORS.gray });
  page.drawText('AMOUNT', { x: 420, y, size: 8, font: boldFont, color: COLORS.gray });
  y -= 4;
  page.drawLine({ start: { x: leftMargin, y }, end: { x: 530, y }, thickness: 0.5, color: COLORS.lightGray });
  y -= 14;

  // Line Items
  if (data.lineItems && data.lineItems.length > 0) {
    for (const item of data.lineItems) {
      page.drawText(item.name || `Fee Type #${item.fee_type_id}`, { x: leftMargin, y, size: 9, font, color: COLORS.black });
      page.drawText(formatCurrency(item.amount), { x: 420, y, size: 9, font, color: COLORS.black });
      y -= 14;
    }
  }

  // Total
  y -= 4;
  page.drawLine({ start: { x: leftMargin, y }, end: { x: 530, y }, thickness: 0.5, color: COLORS.lightGray });
  y -= 16;
  page.drawText('TOTAL:', { x: leftMargin, y, size: 10, font: boldFont, color: COLORS.black });
  page.drawText(formatCurrency(data.totalAmount), { x: 420, y, size: 10, font: boldFont, color: COLORS.black });
  y -= 20;

  // Payment details
  y = drawField(page, font, boldFont, 'Amount Tendered:', formatCurrency(data.amountTendered), leftMargin, y);
  y = drawField(page, font, boldFont, 'Change:', formatCurrency(data.changeAmount), leftMargin, y);
  y -= 30;

  // Cashier
  page.drawText('Received by:', { x: leftMargin, y, size: 9, font, color: COLORS.gray });
  y -= 18;
  page.drawText(data.cashierName || 'Treasury Officer', { x: leftMargin, y, size: 10, font: boldFont, color: COLORS.black });
  y -= 14;
  page.drawText('Municipal Treasurer\'s Office', { x: leftMargin, y, size: 9, font, color: COLORS.gray });

  // Footer
  page.drawText('This receipt is system-generated and is valid without signature.', {
    x: leftMargin, y: 50, size: 7, font, color: COLORS.lightGray,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

// -----------------------------------------------------------------
// TAX ORDER OF PAYMENT (TOP) PDF
// -----------------------------------------------------------------

/**
 * Generates a Tax Order of Payment (TOP) PDF.
 * @param {object} data - { applicationNo, businessName, ownerName, assessedAt, lineItems, totalAmount }
 * @returns {Promise<Buffer>}
 */
const generateTOPPDF = async (data) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([612, 792]);
  const { width } = page.getSize();
  let y = 750;

  // Header
  y = drawMunicipalityHeader(page, font, boldFont, y);

  // Title
  page.drawText('TAX ORDER OF PAYMENT', { x: width / 2 - 80, y, size: 14, font: boldFont, color: COLORS.accent });
  y -= 30;

  // Details
  const leftMargin = 60;
  y = drawField(page, font, boldFont, 'Application No:', data.applicationNo, leftMargin, y);
  y = drawField(page, font, boldFont, 'Business Name:', data.businessName, leftMargin, y);
  y = drawField(page, font, boldFont, 'Owner:', data.ownerName, leftMargin, y);
  y = drawField(page, font, boldFont, 'Date Assessed:', formatDate(data.assessedAt), leftMargin, y);
  y -= 15;

  // Fee Table Header
  page.drawText('FEE TYPE', { x: leftMargin, y, size: 8, font: boldFont, color: COLORS.gray });
  page.drawText('AMOUNT', { x: 420, y, size: 8, font: boldFont, color: COLORS.gray });
  y -= 4;
  page.drawLine({ start: { x: leftMargin, y }, end: { x: 530, y }, thickness: 0.5, color: COLORS.lightGray });
  y -= 14;

  // Line Items
  if (data.lineItems && data.lineItems.length > 0) {
    for (const item of data.lineItems) {
      page.drawText(item.name || `Fee #${item.fee_type_id}`, { x: leftMargin, y, size: 9, font, color: COLORS.black });
      page.drawText(formatCurrency(item.amount), { x: 420, y, size: 9, font, color: COLORS.black });
      y -= 14;
    }
  }

  // Total
  y -= 4;
  page.drawLine({ start: { x: leftMargin, y }, end: { x: 530, y }, thickness: 0.5, color: COLORS.lightGray });
  y -= 16;
  page.drawText('TOTAL AMOUNT DUE:', { x: leftMargin, y, size: 11, font: boldFont, color: COLORS.black });
  page.drawText(formatCurrency(data.totalAmount), { x: 420, y, size: 11, font: boldFont, color: COLORS.red });
  y -= 40;

  // Instructions
  page.drawText('INSTRUCTIONS:', { x: leftMargin, y, size: 9, font: boldFont, color: COLORS.darkGray });
  y -= 16;
  page.drawText('1. Present this Tax Order of Payment to the Municipal Treasurer\'s Office for over-the-counter payment.', { x: leftMargin + 10, y, size: 9, font, color: COLORS.black });
  y -= 14;
  page.drawText('2. Over-the-counter payments may be made in Cash or Manager\'s Check only.', { x: leftMargin + 10, y, size: 9, font, color: COLORS.black });
  y -= 14;
  page.drawText('3. Alternatively, if you do not want to pay over-the-counter, you can pay online via your Applicant Portal.', { x: leftMargin + 10, y, size: 9, font, color: COLORS.black });
  y -= 14;
  page.drawText('4. An Official Receipt (E-Resibo) will be issued upon payment.', { x: leftMargin + 10, y, size: 9, font, color: COLORS.black });

  // Footer
  page.drawText('This document is system-generated. Valid for the current assessment period only.', {
    x: leftMargin, y: 50, size: 7, font, color: COLORS.lightGray,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

// -----------------------------------------------------------------
// BARANGAY CLEARANCE PDF
// -----------------------------------------------------------------

/**
 * Generates a Barangay Clearance PDF.
 * @param {object} data - { clearanceId, businessName, ownerName, barangay, address, issuedAt, processedBy }
 * @returns {Promise<Buffer>}
 */
const generateBarangayClearancePDF = async (data) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([612, 792]);
  const { width } = page.getSize();
  let y = 750;

  // Header
  page.drawText('Republic of the Philippines', { x: width / 2 - 80, y, size: 9, font, color: COLORS.gray });
  y -= 14;
  page.drawText('Province of Laguna', { x: width / 2 - 55, y, size: 9, font, color: COLORS.gray });
  y -= 14;
  page.drawText('Municipality of Liliw', { x: width / 2 - 58, y, size: 9, font, color: COLORS.gray });
  y -= 14;
  page.drawText(`BARANGAY ${(data.barangay || 'POBLACION').toUpperCase()}`, { x: width / 2 - 60, y, size: 12, font: boldFont, color: COLORS.black });
  y -= 30;

  // Title
  page.drawText('BARANGAY BUSINESS CLEARANCE', { x: width / 2 - 105, y, size: 14, font: boldFont, color: COLORS.accent });
  y -= 40;

  // Body
  const leftMargin = 60;

  page.drawText('TO WHOM IT MAY CONCERN:', { x: leftMargin, y, size: 10, font: boldFont, color: COLORS.black });
  y -= 25;

  page.drawText('This is to certify that the business described below has been granted', { x: leftMargin, y, size: 10, font, color: COLORS.black });
  y -= 14;
  page.drawText('clearance to operate within the jurisdiction of this Barangay.', { x: leftMargin, y, size: 10, font, color: COLORS.black });
  y -= 30;

  y = drawField(page, font, boldFont, 'Business Name:', data.businessName, leftMargin, y);
  y = drawField(page, font, boldFont, 'Owner/Operator:', data.ownerName, leftMargin, y);
  y = drawField(page, font, boldFont, 'Business Address:', data.address || `${data.barangay}, Liliw, Laguna`, leftMargin, y);
  y -= 20;

  y = drawField(page, font, boldFont, 'Date Issued:', formatDate(data.issuedAt), leftMargin, y);
  y -= 40;

  // Signature
  page.drawText('Certified by:', { x: leftMargin, y, size: 9, font, color: COLORS.gray });
  y -= 25;
  page.drawText(data.processedBy || 'Barangay Captain', { x: leftMargin, y, size: 11, font: boldFont, color: COLORS.black });
  y -= 14;
  page.drawText('Punong Barangay', { x: leftMargin, y, size: 9, font, color: COLORS.gray });

  // Footer
  page.drawText('This clearance is valid for the current permit application period only.', {
    x: leftMargin, y: 50, size: 7, font, color: COLORS.lightGray,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};


/**
 * Generates the Joint Inspection List (JIL) PDF report for MHO and BFP.
 * @param {object} data - { dateGenerated, establishments, generatedBy }
 * @returns {Promise<Buffer>}
 */
const generateJointInspectionListPDF = async (data) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 792;
  const pageHeight = 612;
  const margin = 35;
  let page = pdfDoc.addPage([pageWidth, pageHeight]);

  let y = pageHeight - 35;

  page.drawText('Republic of the Philippines • Province of Laguna', {
    x: margin,
    y,
    size: 8,
    font,
    color: COLORS.gray,
  });
  y -= 12;

  page.drawText('MUNICIPALITY OF LILIW — JOINT INSPECTION TEAM', {
    x: margin,
    y,
    size: 14,
    font: boldFont,
    color: COLORS.black,
  });
  y -= 14;

  page.drawText('WEEKLY JOINT INSPECTION LIST (JIL) — BPLO • MHO (SANITARY) • BFP (FIRE SAFETY)', {
    x: margin,
    y,
    size: 9,
    font: boldFont,
    color: COLORS.accent,
  });
  y -= 14;

  const dateStr = formatDate(data.dateGenerated || new Date());
  page.drawText(`Generated on: ${dateStr} | Total Establishments: ${(data.establishments || []).length}`, {
    x: margin,
    y,
    size: 8,
    font,
    color: COLORS.darkGray,
  });
  y -= 20;

  const colDef = [
    { label: '#', width: 25, x: margin },
    { label: 'App No', width: 95, x: margin + 25 },
    { label: 'Business Name', width: 165, x: margin + 120 },
    { label: 'Address / Barangay', width: 145, x: margin + 285 },
    { label: 'Contact / Owner', width: 110, x: margin + 430 },
    { label: 'MHO Sanitary', width: 75, x: margin + 540 },
    { label: 'BFP Fire', width: 75, x: margin + 615 },
    { label: 'Status', width: 35, x: margin + 690 },
  ];

  page.drawRectangle({
    x: margin,
    y: y - 5,
    width: pageWidth - (margin * 2),
    height: 18,
    color: rgb(0.92, 0.94, 0.92),
  });

  colDef.forEach((col) => {
    page.drawText(col.label, {
      x: col.x + 3,
      y,
      size: 8,
      font: boldFont,
      color: COLORS.black,
    });
  });
  y -= 20;

  const establishments = data.establishments || [];

  if (establishments.length === 0) {
    page.drawText('No establishments scheduled for inspection this week.', {
      x: margin + 10,
      y,
      size: 9,
      font,
      color: COLORS.gray,
    });
    y -= 25;
  } else {
    establishments.forEach((est, index) => {
      if (y < 85) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - 40;

        page.drawRectangle({
          x: margin,
          y: y - 5,
          width: pageWidth - (margin * 2),
          height: 18,
          color: rgb(0.92, 0.94, 0.92),
        });

        colDef.forEach((col) => {
          page.drawText(col.label, {
            x: col.x + 3,
            y,
            size: 8,
            font: boldFont,
            color: COLORS.black,
          });
        });
        y -= 20;
      }

      if (index % 2 === 1) {
        page.drawRectangle({
          x: margin,
          y: y - 4,
          width: pageWidth - (margin * 2),
          height: 16,
          color: rgb(0.97, 0.97, 0.97),
        });
      }

      const rowY = y;
      const truncate = (str, max) => (!str ? '—' : str.length > max ? `${str.slice(0, max - 1)}…` : str);

      page.drawText(String(index + 1), { x: colDef[0].x + 3, y: rowY, size: 7.5, font, color: COLORS.darkGray });
      page.drawText(est.application_no || '—', { x: colDef[1].x + 3, y: rowY, size: 7.5, font: boldFont, color: COLORS.black });
      page.drawText(truncate(est.business_name, 30), { x: colDef[2].x + 3, y: rowY, size: 7.5, font: boldFont, color: COLORS.black });
      page.drawText(truncate(est.address || est.barangay, 28), { x: colDef[3].x + 3, y: rowY, size: 7.5, font, color: COLORS.darkGray });
      page.drawText(truncate(`${est.owner_name || ''} ${est.contact_no ? '• ' + est.contact_no : ''}`, 20), { x: colDef[4].x + 3, y: rowY, size: 7, font, color: COLORS.darkGray });

      const mhoText = est.sanitary_verified ? '[X] Passed' : '[  ] Pending';
      const bfpText = est.fire_verified ? '[X] Passed' : '[  ] Pending';
      page.drawText(mhoText, { x: colDef[5].x + 3, y: rowY, size: 7.5, font, color: est.sanitary_verified ? COLORS.accent : COLORS.gray });
      page.drawText(bfpText, { x: colDef[6].x + 3, y: rowY, size: 7.5, font, color: est.fire_verified ? COLORS.accent : COLORS.gray });
      page.drawText(truncate(est.status, 8), { x: colDef[7].x + 3, y: rowY, size: 7, font: boldFont, color: COLORS.darkGray });

      y -= 17;
    });
  }

  y = Math.min(y - 15, 65);
  const sigColWidth = (pageWidth - (margin * 2)) / 3;

  page.drawText('Prepared by:', { x: margin, y: y + 25, size: 7, font, color: COLORS.gray });
  page.drawText('BPLO INSPECTION OFFICER', { x: margin, y: y + 12, size: 8, font: boldFont, color: COLORS.black });
  page.drawText('Business Permit & Licensing Office', { x: margin, y: y + 2, size: 7, font, color: COLORS.gray });

  page.drawText('Inspected by:', { x: margin + sigColWidth, y: y + 25, size: 7, font, color: COLORS.gray });
  page.drawText('SANITARY INSPECTOR', { x: margin + sigColWidth, y: y + 12, size: 8, font: boldFont, color: COLORS.black });
  page.drawText('Municipal Health Office (MHO)', { x: margin + sigColWidth, y: y + 2, size: 7, font, color: COLORS.gray });

  page.drawText('Inspected by:', { x: margin + (sigColWidth * 2), y: y + 25, size: 7, font, color: COLORS.gray });
  page.drawText('FIRE SAFETY INSPECTOR', { x: margin + (sigColWidth * 2), y: y + 12, size: 8, font: boldFont, color: COLORS.black });
  page.drawText('Bureau of Fire Protection (BFP)', { x: margin + (sigColWidth * 2), y: y + 2, size: 7, font, color: COLORS.gray });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

module.exports = {
  generatePermitPDF,
  generateEResiboPDF,
  generateTOPPDF,
  generateBarangayClearancePDF,
  generateJointInspectionListPDF,
};

