import jsPDF from 'jspdf';
import { Book, ContentBlock, SpreadsheetData, TableData } from '../types';
import { formatChapterNumber } from './numbering';

/**
 * Export a book as a formatted PDF file
 */
export async function exportBookToPDF(book: Book): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  const config = book.numberingConfig || {
    numberingStyle: 'arabic',
    numberingPrefix: 'Chapter',
    numberingSuffix: '',
    chapterDesignStyle: 'classic',
    showChapterNumbersInTOC: true,
  };

  function checkPageBreak(neededHeight: number) {
    if (cursorY + neededHeight > pageHeight - margin - 10) {
      doc.addPage();
      cursorY = margin + 10;
      addRunningHeaderFooter();
    }
  }

  let currentPageNum = 1;

  function addRunningHeaderFooter() {
    currentPageNum++;
    const prevFont = doc.getFont();
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);

    // Running Header
    doc.text(book.title, margin, 12);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, 14, pageWidth - margin, 14);

    // Footer Page Number
    const pageStr = `- Page ${currentPageNum} -`;
    const pos = config.pageNumberPosition || 'bottom-center';
    if (pos === 'bottom-right') {
      doc.text(pageStr, pageWidth - margin, pageHeight - 10, { align: 'right' });
    } else if (pos === 'top-right') {
      doc.text(pageStr, pageWidth - margin, 12, { align: 'right' });
    } else {
      doc.text(pageStr, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    doc.setFont(prevFont.fontName, prevFont.fontStyle);
  }

  // ==========================================
  // PAGE 1: FRONT COVER
  // ==========================================
  const fc = book.coverFront;
  const coverBgColor = fc.bgColor || '#1e293b';
  doc.setFillColor(coverBgColor);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative Accent bar
  doc.setFillColor(255, 99, 33); // #ff6321
  doc.rect(margin, 30, 8, 120, 'F');

  let coverCursorY = 45;

  // Series Badge if present
  if (book.seriesConfig?.isSeries) {
    doc.setFillColor(255, 99, 33);
    doc.roundedRect(margin + 14, coverCursorY, 70, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`SEASON ${book.seriesConfig.seasonNumber || 1} • EPISODE ${book.seriesConfig.episodeNumber || 1}`, margin + 17, coverCursorY + 5.5);
    coverCursorY += 14;
  }

  // Cover Title
  doc.setTextColor(fc.titleColor || '#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  const titleLines = doc.splitTextToSize(book.title, contentWidth - 15);
  doc.text(titleLines, margin + 14, coverCursorY);

  coverCursorY += titleLines.length * 12;

  // Subtitle
  if (book.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(fc.subtitleColor || '#e2e8f0');
    const subLines = doc.splitTextToSize(book.subtitle, contentWidth - 15);
    doc.text(subLines, margin + 14, coverCursorY);
    coverCursorY += subLines.length * 8 + 10;
  }

  // Author
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(fc.authorColor || '#ff6321');
  doc.text(`By ${book.author}`, margin + 14, coverCursorY + 10);

  // Badge / Category
  if (book.category) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin + 14, pageHeight - 50, 60, 10, 2, 2, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(book.category, margin + 18, pageHeight - 43.5);
  }

  // Price & Publisher
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Digital Edition • ${book.price === 0 ? 'Free Access' : `$${book.price.toFixed(2)} ${book.currency}`}`, margin + 14, pageHeight - 30);

  // ==========================================
  // PAGE 2: FRONT MATTER, EXECUTIVE SUMMARY & LEGAL NOTES
  // ==========================================
  if (book.frontMatter && (book.frontMatter.executiveSummary || book.frontMatter.copyrightNotice || book.frontMatter.disclaimer || book.frontMatter.dedication)) {
    doc.addPage();
    cursorY = margin + 10;
    addRunningHeaderFooter();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('Preamble & Legal Notices', margin, cursorY);
    cursorY += 6;

    doc.setDrawColor(255, 99, 33);
    doc.setLineWidth(1);
    doc.line(margin, cursorY, margin + 40, cursorY);
    cursorY += 10;

    // Executive Summary
    if (book.frontMatter.executiveSummary) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 99, 33);
      doc.text('Executive Summary & Preamble', margin, cursorY);
      cursorY += 6;

      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      const execLines = doc.splitTextToSize(book.frontMatter.executiveSummary, contentWidth);
      doc.text(execLines, margin, cursorY);
      cursorY += execLines.length * 5 + 8;
    }

    // Series Previous Episode Recap
    if (book.seriesConfig?.isSeries && book.seriesConfig.previousEpisodeRecap) {
      checkPageBreak(30);
      doc.setFillColor(255, 247, 237);
      doc.setDrawColor(255, 153, 102);
      const recapLines = doc.splitTextToSize(book.seriesConfig.previousEpisodeRecap, contentWidth - 12);
      const recapBoxHeight = Math.max(22, recapLines.length * 4.5 + 12);

      doc.rect(margin, cursorY, contentWidth, recapBoxHeight, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(234, 88, 12);
      doc.text(`PREVIOUSLY ON ${book.seriesConfig.seriesName ? book.seriesConfig.seriesName.toUpperCase() : 'THE SERIES'}:`, margin + 6, cursorY + 6);

      doc.setFont('times', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(recapLines, margin + 6, cursorY + 12);

      cursorY += recapBoxHeight + 8;
    }

    // Copyright & ISBN
    if (book.frontMatter.copyrightNotice || book.frontMatter.isbnNumber || book.frontMatter.edition) {
      checkPageBreak(30);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, cursorY, contentWidth, 24, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      if (book.frontMatter.isbnNumber) {
        doc.text(`ISBN: ${book.frontMatter.isbnNumber}`, margin + 5, cursorY + 6);
      }
      if (book.frontMatter.edition) {
        doc.text(`Edition: ${book.frontMatter.edition}`, margin + 80, cursorY + 6);
      }

      if (book.frontMatter.copyrightNotice) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const copyLines = doc.splitTextToSize(book.frontMatter.copyrightNotice, contentWidth - 10);
        doc.text(copyLines.slice(0, 3), margin + 5, cursorY + 12);
      }
      cursorY += 28;
    }

    // Classification & Metadata Box in PDF
    if (book.category || book.genre || book.subGenre || book.targetAudience || (book.tags && book.tags.length > 0)) {
      checkPageBreak(25);
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin, cursorY, contentWidth, 22, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(234, 88, 12);
      doc.text('CLASSIFICATION & METADATA:', margin + 5, cursorY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);

      const classText = [
        book.category ? `Category: ${book.category}` : null,
        book.genre ? `Genre: ${book.genre}` : null,
        book.subGenre ? `Focus: ${book.subGenre}` : null,
        book.language ? `Lang: ${book.language}` : null,
      ].filter(Boolean).join('  •  ');

      doc.text(classText, margin + 5, cursorY + 12);

      if (book.tags && book.tags.length > 0) {
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Tags: ${book.tags.map((t) => `#${t}`).join(' ')}`, margin + 5, cursorY + 17);
      }

      cursorY += 26;
    }

    // About the Author & Contributors in PDF
    if (book.authorDetails?.bio || (book.contributors && book.contributors.length > 0)) {
      checkPageBreak(35);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 99, 33);
      doc.text('ABOUT THE AUTHOR & CONTRIBUTORS', margin, cursorY);
      cursorY += 7;

      if (book.authorDetails?.bio) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59);
        doc.text(`${book.author} (Author)`, margin, cursorY);
        cursorY += 5;

        doc.setFont('times', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        const bioLines = doc.splitTextToSize(book.authorDetails.bio, contentWidth);
        doc.text(bioLines, margin, cursorY);
        cursorY += bioLines.length * 4.5 + 6;
      }

      if (book.contributors && book.contributors.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text('Contributors & Editorial Staff:', margin, cursorY);
        cursorY += 5;

        for (const contrib of book.contributors) {
          checkPageBreak(12);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(30, 41, 59);
          doc.text(`• ${contrib.name} (${contrib.role})`, margin + 4, cursorY);
          cursorY += 4;

          if (contrib.bio) {
            doc.setFont('times', 'italic');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            const cBioLines = doc.splitTextToSize(contrib.bio, contentWidth - 10);
            doc.text(cBioLines, margin + 8, cursorY);
            cursorY += cBioLines.length * 3.8 + 2;
          }
        }
        cursorY += 4;
      }
    }

    // Disclaimer
    if (book.frontMatter.disclaimer) {
      checkPageBreak(20);
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(217, 119, 6);
      doc.rect(margin, cursorY, contentWidth, 18, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(146, 64, 14);
      doc.text('DISCLAIMER & TERMS OF USE:', margin + 5, cursorY + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const discLines = doc.splitTextToSize(book.frontMatter.disclaimer, contentWidth - 10);
      doc.text(discLines.slice(0, 2), margin + 5, cursorY + 10);
      cursorY += 22;
    }

    // Dedication
    if (book.frontMatter.dedication) {
      checkPageBreak(12);
      doc.setFont('times', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`"${book.frontMatter.dedication}"`, pageWidth / 2, cursorY, { align: 'center' });
      cursorY += 12;
    }
  }

  // ==========================================
  // PAGE 3: TABLE OF CONTENTS
  // ==========================================
  doc.addPage();
  cursorY = margin + 10;
  addRunningHeaderFooter();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(44, 44, 44);
  doc.text('Table of Contents', margin, cursorY);
  cursorY += 8;

  doc.setDrawColor(255, 99, 33);
  doc.setLineWidth(1);
  doc.line(margin, cursorY, margin + 40, cursorY);
  cursorY += 12;

  doc.setFontSize(11);
  book.chapters.forEach((chap, idx) => {
    checkPageBreak(10);
    const chapNumStr = formatChapterNumber(chap.chapterNumber, config);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 99, 33);
    doc.text(chapNumStr, margin, cursorY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(44, 44, 44);
    const titleText = chap.title;
    doc.text(titleText, margin + 35, cursorY);

    // Dotted leader line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.text(`Ch. ${idx + 1}`, pageWidth - margin - 10, cursorY, { align: 'right' });

    cursorY += 9;
  });

  cursorY += 15;

  // ==========================================
  // CHAPTER CONTENT PAGES
  // ==========================================
  for (const chapter of book.chapters) {
    doc.addPage();
    cursorY = margin + 10;
    addRunningHeaderFooter();

    const formattedNum = formatChapterNumber(chapter.chapterNumber, config);

    // Chapter Design Header Styles
    const style = config.chapterDesignStyle || 'classic';

    if (style === 'accounting' || style === 'bold') {
      // Bold Banner Header
      doc.setFillColor(44, 44, 44);
      doc.rect(margin, cursorY, contentWidth, 24, 'F');
      doc.setTextColor(255, 99, 33);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(formattedNum.toUpperCase(), margin + 6, cursorY + 8);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.text(chapter.title, margin + 6, cursorY + 17);
      cursorY += 32;
    } else if (style === 'tech_code') {
      // Tech Code Header
      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(255, 99, 33);
      doc.setLineWidth(1.5);
      doc.rect(margin, cursorY, contentWidth, 22, 'DF');
      doc.setTextColor(255, 99, 33);
      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.text(`// ${formattedNum}`, margin + 6, cursorY + 8);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.text(chapter.title, margin + 6, cursorY + 17);
      cursorY += 30;
    } else if (style === 'editorial') {
      // Editorial Centered Style
      doc.setTextColor(255, 99, 33);
      doc.setFont('times', 'italic');
      doc.setFontSize(13);
      doc.text(formattedNum, pageWidth / 2, cursorY, { align: 'center' });
      cursorY += 8;

      doc.setTextColor(30, 41, 59);
      doc.setFont('times', 'bold');
      doc.setFontSize(22);
      doc.text(chapter.title, pageWidth / 2, cursorY, { align: 'center' });
      cursorY += 10;

      doc.setDrawColor(255, 99, 33);
      doc.setLineWidth(0.8);
      doc.line(pageWidth / 2 - 20, cursorY, pageWidth / 2 + 20, cursorY);
      cursorY += 15;
    } else {
      // Classic / Minimal Default
      doc.setTextColor(255, 99, 33);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(formattedNum.toUpperCase(), margin, cursorY);
      cursorY += 6;

      doc.setTextColor(44, 44, 44);
      doc.setFontSize(20);
      doc.text(chapter.title, margin, cursorY);
      cursorY += 8;

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 12;
    }

    // Render Blocks inside Chapter
    for (const block of chapter.blocks) {
      checkPageBreak(15);

      if (block.type === 'heading') {
        const lvl = block.meta?.headingLevel || 'h2';
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(44, 44, 44);

        if (lvl === 'h1') doc.setFontSize(16);
        else if (lvl === 'h2') doc.setFontSize(14);
        else if (lvl === 'h3') doc.setFontSize(12);
        else doc.setFontSize(11);

        const lines = doc.splitTextToSize(block.content, contentWidth);
        doc.text(lines, margin, cursorY);
        cursorY += lines.length * 7 + 4;
      } 
      else if (block.type === 'paragraph') {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);

        const lines = doc.splitTextToSize(block.content, contentWidth);
        for (const line of lines) {
          checkPageBreak(6);
          doc.text(line, margin, cursorY);
          cursorY += 5.5;
        }
        cursorY += 3;
      }
      else if (block.type === 'quote') {
        checkPageBreak(20);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(255, 99, 33);
        doc.setLineWidth(1);

        const quoteLines = doc.splitTextToSize(`"${block.content}"`, contentWidth - 12);
        const boxHeight = quoteLines.length * 6 + 8;

        doc.rect(margin, cursorY, contentWidth, boxHeight, 'DF');
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text(quoteLines, margin + 6, cursorY + 6);

        cursorY += boxHeight + 6;
      }
      else if (block.type === 'code') {
        doc.setFont('courier', 'normal');
        doc.setFontSize(9);
        const codeLines = doc.splitTextToSize(block.content, contentWidth - 12);
        const boxHeight = Math.min(codeLines.length * 4.5 + 8, 120);

        checkPageBreak(boxHeight + 5);
        doc.setFillColor(30, 41, 59);
        doc.rect(margin, cursorY, contentWidth, boxHeight, 'F');

        doc.setTextColor(226, 232, 240);
        let codeY = cursorY + 6;
        for (let i = 0; i < codeLines.length && i < 22; i++) {
          doc.text(codeLines[i], margin + 6, codeY);
          codeY += 4.5;
        }

        cursorY += boxHeight + 6;
      }
      else if (block.type === 'latex') {
        checkPageBreak(16);
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, cursorY, contentWidth, 14, 'F');

        doc.setFont('courier', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(`[LaTeX Math]: ${block.content}`, margin + 6, cursorY + 9);

        cursorY += 18;
      }
      else if (block.type === 'table') {
        const tableData: TableData = block.meta?.tableData || {
          headers: ['Header 1', 'Header 2', 'Header 3'],
          rows: [['Data 1', 'Data 2', 'Data 3']],
        };

        const headers = tableData.headers || [];
        const rows = tableData.rows || [];
        const colCount = Math.max(headers.length, 1);
        const colWidth = contentWidth / colCount;

        checkPageBreak(headers.length > 0 ? 20 : 10);

        // Render Table Header
        if (headers.length > 0) {
          doc.setFillColor(255, 99, 33);
          doc.rect(margin, cursorY, contentWidth, 8, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(255, 255, 255);

          headers.forEach((h, i) => {
            doc.text(h, margin + i * colWidth + 3, cursorY + 5.5);
          });
          cursorY += 8;
        }

        // Render Table Rows
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(40, 40, 40);

        rows.forEach((row, rIdx) => {
          checkPageBreak(7);
          if (rIdx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, cursorY, contentWidth, 7, 'F');
          }
          doc.setDrawColor(226, 232, 240);
          doc.rect(margin, cursorY, contentWidth, 7, 'S');

          row.forEach((cellVal, cIdx) => {
            if (cIdx < colCount) {
              const cellText = String(cellVal || '');
              doc.text(cellText.substring(0, 25), margin + cIdx * colWidth + 3, cursorY + 5);
            }
          });
          cursorY += 7;
        });

        cursorY += 6;
      }
      else if (block.type === 'spreadsheet') {
        const sheetData: SpreadsheetData = block.meta?.spreadsheetData || {
          title: 'Financial Spreadsheet',
          columns: [
            { id: 'item', name: 'Line Item', type: 'text' },
            { id: 'amount', name: 'Amount ($)', type: 'currency', formula: 'sum' },
          ],
          rows: [
            { item: 'Gross Revenue', amount: 15000 },
            { item: 'Operating Costs', amount: -6200 },
          ],
          showTotalRow: true,
          currencySymbol: '$',
        };

        const cols = sheetData.columns || [];
        const rows = sheetData.rows || [];
        const colCount = Math.max(cols.length, 1);
        const colWidth = contentWidth / colCount;

        checkPageBreak(25);

        // Spreadsheet Title Bar
        if (sheetData.title) {
          doc.setFillColor(30, 41, 59);
          doc.rect(margin, cursorY, contentWidth, 7, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(255, 255, 255);
          doc.text(`📊 ${sheetData.title}`, margin + 4, cursorY + 5);
          cursorY += 7;
        }

        // Column Headers
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, cursorY, contentWidth, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);

        cols.forEach((col, idx) => {
          doc.text(col.name, margin + idx * colWidth + 3, cursorY + 5);
        });
        cursorY += 7;

        // Data Rows
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);

        rows.forEach((row, rIdx) => {
          checkPageBreak(6);
          if (rIdx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, cursorY, contentWidth, 6, 'F');
          }
          doc.setDrawColor(226, 232, 240);
          doc.rect(margin, cursorY, contentWidth, 6, 'S');

          cols.forEach((col, cIdx) => {
            const rawVal = row[col.id];
            let displayVal = String(rawVal !== undefined && rawVal !== null ? rawVal : '');
            if (col.type === 'currency' && typeof rawVal === 'number') {
              displayVal = `${sheetData.currencySymbol || '$'}${rawVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
            }
            doc.text(displayVal, margin + cIdx * colWidth + 3, cursorY + 4.2);
          });
          cursorY += 6;
        });

        // Summary Total Row
        if (sheetData.showTotalRow) {
          checkPageBreak(7);
          doc.setFillColor(254, 243, 199); // Amber highlight
          doc.rect(margin, cursorY, contentWidth, 7, 'F');
          doc.setDrawColor(217, 119, 6);
          doc.rect(margin, cursorY, contentWidth, 7, 'S');

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(146, 64, 14);

          cols.forEach((col, cIdx) => {
            if (cIdx === 0) {
              doc.text('TOTAL / SUMMARY', margin + 3, cursorY + 5);
            } else if (col.formula === 'sum') {
              const totalSum = rows.reduce((acc, r) => acc + (Number(r[col.id]) || 0), 0);
              const formattedSum = col.type === 'currency' 
                ? `${sheetData.currencySymbol || '$'}${totalSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                : totalSum.toString();
              doc.text(formattedSum, margin + cIdx * colWidth + 3, cursorY + 5);
            }
          });
          cursorY += 7;
        }

        cursorY += 6;
      }
      else if (block.type === 'image') {
        checkPageBreak(50);
        const figureLabel = block.meta?.figureLabel || 'Figure';
        const caption = block.meta?.caption || '';
        const imgWidthPercent = (block.meta?.imageWidthPercentage || 100) / 100;
        const imgWidth = contentWidth * imgWidthPercent;
        const imgX = margin + (contentWidth - imgWidth) / 2;

        let imageAdded = false;
        if (block.content && block.content.startsWith('data:image/')) {
          try {
            const format = block.content.includes('png') ? 'PNG' : 'JPEG';
            doc.addImage(block.content, format, imgX, cursorY, imgWidth, 45);
            cursorY += 47;
            imageAdded = true;
          } catch (e) {
            console.warn('Could not render base64 image in jsPDF:', e);
          }
        }

        if (!imageAdded) {
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(226, 232, 240);
          doc.rect(imgX, cursorY, imgWidth, 25, 'DF');
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text(`[Image Asset: ${block.content ? block.content.substring(0, 35) + '...' : 'Embedded Figure'}]`, pageWidth / 2, cursorY + 14, { align: 'center' });
          cursorY += 28;
        }

        // Figure Label & Caption
        if (figureLabel || caption) {
          checkPageBreak(10);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(255, 99, 33);
          const fullCaption = `${figureLabel ? figureLabel + ': ' : ''}${caption}`;
          doc.text(fullCaption, pageWidth / 2, cursorY, { align: 'center' });
          cursorY += 8;
        }
        cursorY += 4;
      }
      else if (block.type === 'divider') {
        checkPageBreak(8);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(margin + 20, cursorY, pageWidth - margin - 20, cursorY);
        cursorY += 8;
      }
    }
  }

  // Next Episode Teaser / What to Expect Box at the end of the book
  if (book.seriesConfig?.isSeries && (book.seriesConfig.nextEpisodeTeaser || book.seriesConfig.nextEpisodeTitle)) {
    checkPageBreak(35);
    cursorY += 10;
    doc.setFillColor(30, 41, 59);
    doc.setDrawColor(255, 99, 33);
    
    const teaserText = book.seriesConfig.nextEpisodeTeaser || '';
    const teaserLines = teaserText ? doc.splitTextToSize(teaserText, contentWidth - 16) : [];
    const teaserBoxHeight = Math.max(30, teaserLines.length * 4.5 + 20);

    doc.rect(margin, cursorY, contentWidth, teaserBoxHeight, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 99, 33);
    doc.text('COMING UP IN THE NEXT EPISODE:', margin + 8, cursorY + 7);

    if (book.seriesConfig.nextEpisodeReleaseDate) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(203, 213, 225);
      doc.text(`[${book.seriesConfig.nextEpisodeReleaseDate}]`, margin + contentWidth - 40, cursorY + 7);
    }

    if (book.seriesConfig.nextEpisodeTitle) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(`"${book.seriesConfig.nextEpisodeTitle}"`, margin + 8, cursorY + 13);
    }

    if (teaserLines.length > 0) {
      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(226, 232, 240);
      doc.text(teaserLines, margin + 8, cursorY + (book.seriesConfig.nextEpisodeTitle ? 19 : 14));
    }

    cursorY += teaserBoxHeight + 10;
  }

  // Save the compiled PDF
  const safeFilename = `${book.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Book.pdf`;
  doc.save(safeFilename);
}
