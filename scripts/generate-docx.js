const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function escapeXml(unsafe) {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderFormattedRuns(text) {
  const parts = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.substring(lastIndex, match.index), bold: false, italic: false });
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push({ text: token.slice(2, -2), bold: true, italic: false });
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push({ text: token.slice(1, -1), bold: false, italic: true });
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push({ text: token.slice(1, -1), bold: true, italic: false, code: true });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), bold: false, italic: false });
  }

  return parts.map(p => {
    let rPr = '<w:rPr>';
    if (p.bold) rPr += '<w:b/>';
    if (p.italic) rPr += '<w:i/>';
    if (p.code) rPr += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:color w:val="B91C1C"/>';
    rPr += '</w:rPr>';
    return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(p.text)}</w:t></w:r>`;
  }).join('');
}

function convertMdToDocx(mdPath, outDocx) {
  const tempDir = path.join(__dirname, `../temp_docx_${Date.now()}`);

  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(path.join(tempDir, '_rels'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'word/_rels'), { recursive: true });

  // 1. [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
  fs.writeFileSync(path.join(tempDir, '[Content_Types].xml'), contentTypesXml, 'utf8');

  // 2. _rels/.rels
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  fs.writeFileSync(path.join(tempDir, '_rels/.rels'), relsXml, 'utf8');

  // 3. word/_rels/document.xml.rels
  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  fs.writeFileSync(path.join(tempDir, 'word/_rels/document.xml.rels'), docRelsXml, 'utf8');

  // 4. word/styles.xml
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:color w:val="1F2937"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="140" w:line="260" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal" w:default="1">
    <w:name w:val="Normal"/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:pPr>
      <w:spacing w:before="240" w:after="180"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri Light" w:hAnsi="Calibri Light"/>
      <w:b/>
      <w:sz w:val="44"/>
      <w:color w:val="1E3A8A"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr>
      <w:spacing w:before="360" w:after="140"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri Light" w:hAnsi="Calibri Light"/>
      <w:b/>
      <w:sz w:val="32"/>
      <w:color w:val="1E40AF"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr>
      <w:spacing w:before="260" w:after="100"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:sz w:val="26"/>
      <w:color w:val="111827"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:pPr>
      <w:spacing w:before="180" w:after="80"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:sz w:val="22"/>
      <w:color w:val="374151"/>
    </w:rPr>
  </w:style>
</w:styles>`;
  fs.writeFileSync(path.join(tempDir, 'word/styles.xml'), stylesXml, 'utf8');

  // 5. Parse Markdown
  const md = fs.readFileSync(mdPath, 'utf8');
  const lines = md.split(/\r?\n/);

  let bodyXml = '';
  let inTable = false;
  let tableRows = [];
  let inCodeBlock = false;
  let codeBuffer = '';

  function flushTable() {
    if (!tableRows.length) return;
    let tblXml = '<w:tbl>';
    tblXml += '<w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders>';
    tblXml += '<w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>';
    tblXml += '<w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>';
    tblXml += '<w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>';
    tblXml += '<w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>';
    tblXml += '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>';
    tblXml += '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>';
    tblXml += '</w:tblBorders></w:tblPr>';

    tableRows.forEach((row, rowIndex) => {
      const isHeader = rowIndex === 0;
      tblXml += '<w:tr>';
      row.forEach(cell => {
        tblXml += '<w:tc><w:tcPr>';
        if (isHeader) {
          tblXml += '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>';
        }
        tblXml += '<w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="160" w:type="dxa"/><w:right w:w="160" w:type="dxa"/></w:tcMar>';
        tblXml += '</w:tcPr>';
        tblXml += `<w:p><w:pPr><w:spacing w:after="0" w:line="220" w:lineRule="auto"/></w:pPr>`;
        if (isHeader) {
          tblXml += `<w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>${escapeXml(cell)}</w:t></w:r>`;
        } else {
          tblXml += renderFormattedRuns(cell);
        }
        tblXml += '</w:p></w:tc>';
      });
      tblXml += '</w:tr>';
    });

    tblXml += '</w:tbl><w:p><w:pPr><w:spacing w:after="140"/></w:pPr></w:p>';
    bodyXml += tblXml;
    tableRows = [];
    inTable = false;
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // Close code block
        bodyXml += `<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/><w:pBdr><w:left w:val="single" w:sz="12" w:space="8" w:color="94A3B8"/></w:pBdr><w:ind w:left="240"/><w:spacing w:before="80" w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/><w:color w:val="334155"/></w:rPr><w:t xml:space="preserve">${escapeXml(codeBuffer)}</w:t></w:r></w:p>`;
        codeBuffer = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBuffer = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer += (codeBuffer ? '\n' : '') + rawLine;
      continue;
    }

    // Table handling
    if (line.startsWith('|') && line.endsWith('|')) {
      if (/^\|[\s\-:|]+\|$/.test(line)) {
        continue;
      }
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      tableRows.push(cells);
      inTable = true;
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (!line) continue;

    if (line.startsWith('# ')) {
      const text = line.substring(2);
      bodyXml += `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;
    } else if (line.startsWith('## ')) {
      const text = line.substring(3);
      bodyXml += `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;
    } else if (line.startsWith('### ')) {
      const text = line.substring(4);
      bodyXml += `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;
    } else if (line.startsWith('#### ')) {
      const text = line.substring(5);
      bodyXml += `<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;
    } else if (line === '---') {
      bodyXml += `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="1" w:color="CBD5E1"/></w:pBdr><w:spacing w:before="140" w:after="160"/></w:pPr></w:p>`;
    } else if (line.startsWith('> ')) {
      const text = line.substring(2);
      bodyXml += `<w:p><w:pPr><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="2563EB"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/><w:ind w:left="360"/><w:spacing w:before="100" w:after="120"/></w:pPr>${renderFormattedRuns(text)}</w:p>`;
    } else if (line.startsWith('* ') || line.startsWith('- ')) {
      const text = line.substring(2);
      bodyXml += `<w:p><w:pPr><w:ind w:left="480" w:hanging="240"/><w:spacing w:after="80"/></w:pPr><w:r><w:t>• </w:t></w:r>${renderFormattedRuns(text)}</w:p>`;
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+\.)\s/)[1];
      const text = line.replace(/^\d+\.\s/, '');
      bodyXml += `<w:p><w:pPr><w:spacing w:before="120" w:after="80"/><w:ind w:left="480" w:hanging="360"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="1E40AF"/></w:rPr><w:t>${num} </w:t></w:r>${renderFormattedRuns(text)}</w:p>`;
    } else if (rawLine.startsWith('    * ') || rawLine.startsWith('  * ') || rawLine.startsWith('    - ') || rawLine.startsWith('  - ')) {
      const text = rawLine.trim().substring(2);
      bodyXml += `<w:p><w:pPr><w:ind w:left="960" w:hanging="240"/><w:spacing w:after="60"/></w:pPr><w:r><w:t>– </w:t></w:r>${renderFormattedRuns(text)}</w:p>`;
    } else {
      bodyXml += `<w:p>${renderFormattedRuns(line)}</w:p>`;
    }
  }

  if (inTable) {
    flushTable();
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  fs.writeFileSync(path.join(tempDir, 'word/document.xml'), documentXml, 'utf8');

  // Zip
  if (fs.existsSync(outDocx)) {
    fs.unlinkSync(outDocx);
  }

  const psScriptPath = path.join(__dirname, `zip_${Date.now()}.ps1`);
  const psScript = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory('${tempDir.replace(/\\/g, '\\\\')}', '${outDocx.replace(/\\/g, '\\\\')}')
`;
  fs.writeFileSync(psScriptPath, psScript, 'utf8');

  try {
    execSync(`powershell -ExecutionPolicy Bypass -File "${psScriptPath}"`, { stdio: 'inherit' });
    console.log('DOCX created at:', outDocx);
  } catch (err) {
    console.error('Failed to create docx:', err);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
    if (fs.existsSync(psScriptPath)) fs.unlinkSync(psScriptPath);
  }
}

// Convert files
const targets = [
  {
    md: path.join(__dirname, '../system-planning/eBPLS_Suggested_Revisions_Proposal.md'),
    docx: path.join(__dirname, '../system-planning/eBPLS_Suggested_Revisions_Proposal.docx')
  },
  {
    md: path.join(__dirname, '../system-planning/eBPLS_Approved_Revisions_Main_Implementation_Plan.md'),
    docx: path.join(__dirname, '../system-planning/eBPLS_Approved_Revisions_Main_Implementation_Plan.docx')
  }
];

targets.forEach(t => {
  if (fs.existsSync(t.md)) {
    console.log(`Converting ${path.basename(t.md)} to DOCX...`);
    convertMdToDocx(t.md, t.docx);
  }
});
