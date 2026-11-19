const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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

function getImageSize(buffer) {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xFF) break;
      const marker = buffer[offset + 1];
      if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
          type: 'jpeg'
        };
      }
      const len = buffer.readUInt16BE(offset + 2);
      offset += 2 + len;
    }
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
      type: 'png'
    };
  }
  return { width: 800, height: 600, type: 'jpeg' };
}

function calculateEmu(width, height) {
  const maxW = 5400000; // ~5.9 inches
  const maxH = 7200000; // ~7.8 inches (fits letter page)
  const aspect = width / height;

  let cx, cy;
  if (aspect >= 1) {
    cx = Math.min(maxW, Math.round(width * 3400));
    if (cx > maxW) cx = maxW;
    cy = Math.round(cx / aspect);
    if (cy > maxH) {
      cy = maxH;
      cx = Math.round(cy * aspect);
    }
  } else {
    cy = Math.min(maxH, Math.round(height * 3000));
    if (cy > maxH) cy = maxH;
    cx = Math.round(cy * aspect);
    if (cx > maxW) {
      cx = maxW;
      cy = Math.round(cx / aspect);
    }
  }
  return { cx, cy };
}

function convertMdToDocx(mdPath, outDocx) {
  const tempDir = path.join(__dirname, `../temp_docx_${Date.now()}`);

  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(path.join(tempDir, '_rels'), { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'word/_rels'), { recursive: true });

  // 1. _rels/.rels
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  fs.writeFileSync(path.join(tempDir, '_rels/.rels'), relsXml, 'utf8');

  // 2. word/styles.xml
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

  // 3. Parse Markdown
  const md = fs.readFileSync(mdPath, 'utf8');
  const lines = md.split(/\r?\n/);

  let bodyXml = '';
  let inTable = false;
  let tableRows = [];
  let inCodeBlock = false;
  let inMermaid = false;
  let codeBuffer = '';
  let mermaidCount = 0;
  const images = [];

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

    if (line.startsWith('```mermaid')) {
      inMermaid = true;
      inCodeBlock = true;
      codeBuffer = '';
      continue;
    }

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        if (inMermaid) {
          mermaidCount++;
          const hash = crypto.createHash('md5').update(codeBuffer.trim()).digest('hex');
          let imgFile = path.join(__dirname, `diagram_cache/${hash}.jpeg`);
          if (!fs.existsSync(imgFile)) {
            imgFile = path.join(__dirname, `diagram_cache/diag_${mermaidCount}.jpeg`);
          }

          if (fs.existsSync(imgFile)) {
            const buf = fs.readFileSync(imgFile);
            const size = getImageSize(buf);
            const emu = calculateEmu(size.width, size.height);
            const imgIdNum = images.length + 1;
            const rId = `rIdImg${imgIdNum}`;
            const filename = `image${imgIdNum}.jpeg`;
            images.push({ rId, filename, buffer: buf });

            bodyXml += `<w:p>
  <w:pPr>
    <w:jc w:val="center"/>
    <w:spacing w:before="240" w:after="80"/>
  </w:pPr>
  <w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="${emu.cx}" cy="${emu.cy}"/>
        <wp:effectExtent l="0" t="0" r="0" b="0"/>
        <wp:docPr id="${imgIdNum + 10}" name="Figure ${imgIdNum}"/>
        <wp:cNvGraphicFramePr>
          <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
        </wp:cNvGraphicFramePr>
        <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:nvPicPr>
                <pic:cNvPr id="${imgIdNum + 10}" name="Figure ${imgIdNum}"/>
                <pic:cNvPicPr/>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
                <a:stretch><a:fillRect/></a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="${emu.cx}" cy="${emu.cy}"/>
                </a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>
  </w:r>
</w:p>`;
            bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="240"/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="18"/><w:color w:val="64748B"/></w:rPr><w:t>Figure ${mermaidCount}: Visual Process Diagram</w:t></w:r></w:p>`;
          } else {
            // Fallback: render monospace code block if no image is available
            const codeRuns = codeBuffer.split('\n').map(l => `<w:t xml:space="preserve">${escapeXml(l)}</w:t>`).join('<w:br/>');
            bodyXml += `<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/><w:pBdr><w:left w:val="single" w:sz="12" w:space="8" w:color="94A3B8"/></w:pBdr><w:ind w:left="240"/><w:spacing w:before="80" w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/><w:color w:val="334155"/></w:rPr>${codeRuns}</w:r></w:p>`;
          }
          inMermaid = false;
        } else {
          // Regular code block
          const codeRuns = codeBuffer.split('\n').map(l => `<w:t xml:space="preserve">${escapeXml(l)}</w:t>`).join('<w:br/>');
          bodyXml += `<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/><w:pBdr><w:left w:val="single" w:sz="12" w:space="8" w:color="94A3B8"/></w:pBdr><w:ind w:left="240"/><w:spacing w:before="80" w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/><w:color w:val="334155"/></w:rPr>${codeRuns}</w:r></w:p>`;
        }
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

  // 4. [Content_Types].xml (including image extensions)
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
  fs.writeFileSync(path.join(tempDir, '[Content_Types].xml'), contentTypesXml, 'utf8');

  // 5. word/_rels/document.xml.rels
  let docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;
  images.forEach(img => {
    docRelsXml += `\n  <Relationship Id="${img.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${img.filename}"/>`;
  });
  docRelsXml += `\n</Relationships>`;
  fs.writeFileSync(path.join(tempDir, 'word/_rels/document.xml.rels'), docRelsXml, 'utf8');

  // 6. Write image files to word/media/
  if (images.length > 0) {
    const mediaDir = path.join(tempDir, 'word/media');
    fs.mkdirSync(mediaDir, { recursive: true });
    images.forEach(img => {
      fs.writeFileSync(path.join(mediaDir, img.filename), img.buffer);
    });
  }

  // 7. Write word/document.xml with full drawing namespaces
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document 
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  fs.writeFileSync(path.join(tempDir, 'word/document.xml'), documentXml, 'utf8');

  // 8. Zip
  let finalDocxPath = outDocx;
  if (fs.existsSync(outDocx)) {
    try {
      fs.unlinkSync(outDocx);
    } catch (e) {
      if (e.code === 'EBUSY') {
        const ext = path.extname(outDocx);
        const base = path.basename(outDocx, ext);
        finalDocxPath = path.join(path.dirname(outDocx), `${base}_with_Diagrams${ext}`);
        console.warn(`[Warning] ${path.basename(outDocx)} is currently open in Word. Generating ${path.basename(finalDocxPath)} instead.`);
        if (fs.existsSync(finalDocxPath)) {
          try { fs.unlinkSync(finalDocxPath); } catch (_) {}
        }
      } else {
        throw e;
      }
    }
  }

  const psScriptPath = path.join(__dirname, `zip_${Date.now()}.ps1`);
  const psScript = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory('${tempDir.replace(/\\/g, '\\\\')}', '${finalDocxPath.replace(/\\/g, '\\\\')}')
`;
  fs.writeFileSync(psScriptPath, psScript, 'utf8');

  try {
    execSync(`powershell -ExecutionPolicy Bypass -File "${psScriptPath}"`, { stdio: 'inherit' });
    console.log('DOCX created at:', finalDocxPath);
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
  },
  {
    md: path.join(__dirname, '../system-planning/eBPLS_Client_Frontend_Test_Document.md'),
    docx: path.join(__dirname, '../system-planning/eBPLS_Client_Frontend_Test_Document.docx')
  },
  {
    md: path.join(__dirname, '../system-planning/eBPLS_Client_Implementation_Plan_13_Revisions.md'),
    docx: path.join(__dirname, '../system-planning/eBPLS_Client_Implementation_Plan_13_Revisions.docx')
  },
  {
    md: path.join(__dirname, '../system-planning/eBPLS_13_Revisions_Technical_Implementation_Plan.md'),
    docx: path.join(__dirname, '../system-planning/eBPLS_13_Revisions_Technical_Implementation_Plan.docx')
  }
];

targets.forEach(t => {
  if (fs.existsSync(t.md)) {
    console.log(`Converting ${path.basename(t.md)} to DOCX...`);
    convertMdToDocx(t.md, t.docx);
  }
});
