import fs from 'fs';
import path from 'path';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 72;
const FONT_SIZE = 11;
const LINE_HEIGHT = 14;
const MAX_CHARS = 90;

function wrapLine(line, maxChars) {
  if (line.length <= maxChars) return [line];
  const words = line.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function escapePdfText(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildPdf(lines, outputPath) {
  const usableHeight = PAGE_HEIGHT - 2 * MARGIN;
  const linesPerPage = Math.floor(usableHeight / LINE_HEIGHT);
  const pages = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }

  const objects = [];
  const xrefPositions = [];
  let offset = 0;

  const addObject = (objStr) => {
    xrefPositions.push(offset);
    objects.push(objStr);
    offset += Buffer.byteLength(objStr, 'latin1');
  };

  const header = '%PDF-1.4\n';
  offset += Buffer.byteLength(header, 'latin1');

  addObject('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  const pageObjects = [];
  const contentObjects = [];
  let objIndex = 6;

  for (const pageLines of pages) {
    const contentStream = ['BT', `/F1 ${FONT_SIZE} Tf`, `${MARGIN} ${PAGE_HEIGHT - MARGIN} Td`];
    for (const line of pageLines) {
      contentStream.push(`(${escapePdfText(line)}) Tj`);
      contentStream.push(`0 ${-LINE_HEIGHT} Td`);
    }
    contentStream.push('ET');
    const contentData = contentStream.join('\n');
    const contentObj = `${objIndex} 0 obj\n<< /Length ${Buffer.byteLength(contentData, 'latin1')} >>\nstream\n${contentData}\nendstream\nendobj\n`;
    contentObjects.push(objIndex);
    addObject(contentObj);
    objIndex += 1;

    const pageObj =
      `${objIndex} 0 obj\n` +
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 5 0 R >> >> /Contents ${contentObjects[contentObjects.length - 1]} 0 R >>\n` +
      `endobj\n`;
    pageObjects.push(objIndex);
    addObject(pageObj);
    objIndex += 1;
  }

  const kids = pageObjects.map((pid) => `${pid} 0 R`).join(' ');
  addObject(`2 0 obj\n<< /Type /Pages /Count ${pageObjects.length} /Kids [${kids}] >>\nendobj\n`);
  addObject('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  const xrefOffset = offset;
  const xref = ['xref', `0 ${objects.length + 1}`, '0000000000 65535 f '];
  for (const pos of xrefPositions) {
    xref.push(`${pos.toString().padStart(10, '0')} 00000 n `);
  }
  const xrefData = `${xref.join('\n')}\n`;

  const trailer =
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`;

  fs.writeFileSync(outputPath, header, 'latin1');
  for (const obj of objects) {
    fs.appendFileSync(outputPath, obj, 'latin1');
  }
  fs.appendFileSync(outputPath, xrefData, 'latin1');
  fs.appendFileSync(outputPath, trailer, 'latin1');
}

function main() {
  const [, , inputFile, outputFile] = process.argv;
  if (!inputFile || !outputFile) {
    console.error('Usage: md_to_simple_pdf.mjs <input.md> <output.pdf>');
    process.exit(1);
  }
  const raw = fs.readFileSync(path.resolve(inputFile), 'utf8').split(/\r?\n/);
  const lines = [];
  for (const line of raw) {
    if (!line.trim()) {
      lines.push('');
      continue;
    }
    for (const wrapped of wrapLine(line, MAX_CHARS)) {
      lines.push(wrapped);
    }
  }
  buildPdf(lines, path.resolve(outputFile));
  console.log(`Wrote ${outputFile}`);
}

main();
