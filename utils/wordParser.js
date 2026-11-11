const mammoth = require('mammoth');

/**
 * Parse a Word (.docx) file and extract quiz questions.
 * Handles both:
 *  1. Standard multiple-choice (with answer keys or bold answers)
 *  2. Reading comprehension (passages + ABCD + True/False with answer keys)
 *
 * @param {string} filePath - Absolute path to .docx file
 * @returns {Promise<Object>}
 */
async function parseWordFile(filePath) {
  // Convert docx using mammoth with proper options object
  const htmlResult = await mammoth.convertToHtml({ path: filePath });
  const html = htmlResult.value;

  const textResult = await mammoth.extractRawText({ path: filePath });
  const rawText = textResult.value;

  // Check if document has reading passages at start of line
  const isReading = /^[ \t]*(?:READING|PASSAGE|BÀI\s*ĐỌC)\s+\d+/im.test(rawText);

  if (isReading) {
    return parseReadingComprehension(rawText, html);
  } else {
    return parseMultipleChoice(rawText, html);
  }
}

/**
 * Parse standard multiple choice questions
 */
function parseMultipleChoice(rawText, html) {
  // Separate content from bottom Answer Key
  const ansKeyMatch = rawText.match(/(?:^[ \t]*ĐÁP\s*ÁN\b|^[ \t]*ANSWER\s*KEY\b|^[ \t]*HƯỚNG\s*DẪN\s*CHẤM\b|^[ \t]*KEY\b)/im);
  const contentText = ansKeyMatch ? rawText.substring(0, ansKeyMatch.index) : rawText;
  const keyText = ansKeyMatch ? rawText.substring(ansKeyMatch.index) : '';

  // Extract answer keys: 1. B, 2. C, 3. A...
  const keyMap = {};
  if (keyText) {
    const keyRegex = /(\d+)\s*[\.\:\-\)]\s*([A-D]|TRUE|FALSE|T|F)/gi;
    let km;
    while ((km = keyRegex.exec(keyText)) !== null) {
      keyMap[parseInt(km[1], 10)] = km[2].toUpperCase();
    }
  }

  // Parse bold elements from HTML in case answers are bolded
  const boldTexts = extractBoldTexts(html);

  const lines = contentText.split('\n').map(l => l.trim()).filter(Boolean);
  const questions = [];
  let currentQ = null;
  let currentUnit = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect Unit / Section header
    const unitMatch = line.match(/^(?:UNIT|Unit|Chương|Phần)\s*(\d+[^\n\r]*)/i);
    if (unitMatch) {
      currentUnit = line.trim();
      continue;
    }

    // Detect question: e.g. "1. Trinh ___ 20 years old." or "Câu 1. ..."
    const qMatch = line.match(/^(?:Câu|Question|câu)?\s*(\d+)\s*[\.\:\)]\s*(.+)/i);
    if (qMatch && !line.match(/^[A-D]\s*[\.\:\)]/i)) {
      if (currentQ && currentQ.options.length >= 2) {
        finalizeQuestion(currentQ, keyMap, boldTexts);
        questions.push(currentQ);
      }
      currentQ = {
        id: parseInt(qMatch[1], 10),
        unit: currentUnit,
        question: qMatch[2].trim(),
        options: [],
        correctAnswer: 0,
        type: 'multiple-choice'
      };
      continue;
    }

    // Detect option: A. am, B. is, C. are, D. be
    const optMatch = line.match(/^([A-D])\s*[\.\:\)]\s*(.+)/i);
    if (optMatch && currentQ) {
      currentQ.options.push({
        label: optMatch[1].toUpperCase(),
        text: optMatch[2].trim()
      });
      continue;
    }
  }

  if (currentQ && currentQ.options.length >= 2) {
    finalizeQuestion(currentQ, keyMap, boldTexts);
    questions.push(currentQ);
  }

  return {
    type: 'multiple-choice',
    title: extractDocumentTitle(rawText),
    totalQuestions: questions.length,
    questions
  };
}

/**
 * Determine correct answer for a question
 */
function finalizeQuestion(q, keyMap, boldTexts) {
  // 1. Try from bottom answer key
  if (keyMap && keyMap[q.id]) {
    const expectedLetter = keyMap[q.id];
    const idx = q.options.findIndex(opt => opt.label === expectedLetter);
    if (idx !== -1) {
      q.correctAnswer = idx;
      return;
    }
  }

  // 2. Try from bold formatting
  if (boldTexts && boldTexts.length > 0) {
    for (let i = 0; i < q.options.length; i++) {
      const opt = q.options[i];
      for (const b of boldTexts) {
        if (b.includes(opt.text) || opt.text.includes(b) || b.includes(`${opt.label}. ${opt.text}`)) {
          q.correctAnswer = i;
          return;
        }
      }
    }
  }

  // Fallback to option 0
  q.correctAnswer = 0;
}

/**
 * Parse Reading Comprehension documents
 */
function parseReadingComprehension(rawText, html) {
  const ansKeyMatch = rawText.match(/(?:^[ \t]*ANSWER\s*KEY\b|^[ \t]*ĐÁP\s*ÁN\b|^[ \t]*KEY\b)/im);
  const contentText = ansKeyMatch ? rawText.substring(0, ansKeyMatch.index) : rawText;
  const keyText = ansKeyMatch ? rawText.substring(ansKeyMatch.index) : '';

  // Parse per-reading answer keys
  // e.g. Reading 1 \n ABCD: A, B, B, B, A \n T/F: 1.T 2.F 3.T 4.T 5.T
  const readingKeys = {};
  if (keyText) {
    const rBlocks = keyText.split(/Reading\s*(\d+)/i);
    for (let i = 1; i < rBlocks.length; i += 2) {
      const rNum = parseInt(rBlocks[i], 10);
      const rContent = rBlocks[i + 1] || '';
      const abcdMatch = rContent.match(/ABCD:\s*([A-D,\s]+)/i);
      const tfMatch = rContent.match(/T\/F:\s*([^\n\r]+)/i);

      const abcd = abcdMatch
        ? abcdMatch[1].split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
        : [];

      const tf = [];
      if (tfMatch) {
        const tfRegex = /(\d+)\s*[\.\:\)]\s*([TF]|TRUE|FALSE)/gi;
        let m;
        while ((m = tfRegex.exec(tfMatch[1])) !== null) {
          tf[parseInt(m[1], 10) - 1] = m[2].toUpperCase().startsWith('T') ? 'TRUE' : 'FALSE';
        }
      }
      readingKeys[rNum] = { abcd, tf };
    }
  }

  // Parse passages
  const passages = [];
  const pParts = contentText.split(/^[ \t]*(?:READING|Passage|BÀI\s*ĐỌC)\s*(\d+)[ \t]*[–\-—:]?[ \t]*([^\n\r]*)/im);

  for (let i = 1; i < pParts.length; i += 3) {
    const pId = parseInt(pParts[i], 10);
    const pSubTitle = (pParts[i + 1] || '').trim();
    const pTitle = pSubTitle ? `Reading ${pId} – ${pSubTitle}` : `Reading ${pId}`;
    const pBody = pParts[i + 2] || '';

    // Separate passage text from sections
    const secAMatch = pBody.match(/(?:A\.\s*MULTIPLE\s*CHOICE|PHẦN\s*A)[^\n\r]*/i);
    const secBMatch = pBody.match(/(?:B\.\s*TRUE\s*\/\s*FALSE|PHẦN\s*B)[^\n\r]*/i);

    let passageText = '';
    let secAText = '';
    let secBText = '';

    if (secAMatch && secBMatch) {
      passageText = pBody.substring(0, secAMatch.index).trim();
      secAText = pBody.substring(secAMatch.index + secAMatch[0].length, secBMatch.index).trim();
      secBText = pBody.substring(secBMatch.index + secBMatch[0].length).trim();
    } else if (secAMatch) {
      passageText = pBody.substring(0, secAMatch.index).trim();
      secAText = pBody.substring(secAMatch.index + secAMatch[0].length).trim();
    } else {
      passageText = pBody.trim();
    }

    const questions = [];

    // Parse Multiple Choice section
    if (secAText) {
      const linesA = secAText.split('\n').map(l => l.trim()).filter(Boolean);
      let curQ = null;
      for (const line of linesA) {
        const qm = line.match(/^(\d+)\.\s*(.+)/);
        if (qm && !line.match(/^[A-D]\s*[\.\:\)]/i)) {
          if (curQ && curQ.options.length >= 2) questions.push(curQ);
          const qIndex = parseInt(qm[1], 10);
          const correctLetter = (readingKeys[pId]?.abcd || [])[qIndex - 1] || 'A';
          const correctIdx = ['A', 'B', 'C', 'D'].indexOf(correctLetter);
          curQ = {
            id: qIndex,
            question: qm[2].trim(),
            options: [],
            correctAnswer: correctIdx >= 0 ? correctIdx : 0,
            section: 'A. Multiple Choice',
            type: 'multiple-choice'
          };
          continue;
        }

        const optm = line.match(/^([A-D])\s*[\.\:\)]\s*(.+)/i);
        if (optm && curQ) {
          curQ.options.push({
            label: optm[1].toUpperCase(),
            text: optm[2].trim()
          });
        }
      }
      if (curQ && curQ.options.length >= 2) questions.push(curQ);
    }

    // Parse True/False section
    if (secBText) {
      const linesB = secBText.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of linesB) {
        const tfm = line.match(/^(\d+)\.\s*(.+?)(?:\s+(?:TRUE\s*\/\s*FALSE|ĐÚNG\s*\/\s*SAI))?$/i);
        if (tfm) {
          const qIndex = parseInt(tfm[1], 10);
          const qText = tfm[2].replace(/\s*(?:TRUE\s*\/\s*FALSE|ĐÚNG\s*\/\s*SAI)\s*$/i, '').trim();
          const correctTF = (readingKeys[pId]?.tf || [])[qIndex - 1] || 'TRUE';
          questions.push({
            id: qIndex + 5, // Offset for unique index within passage
            displayId: qIndex,
            question: qText,
            options: [
              { label: 'A', text: 'TRUE (Đúng)' },
              { label: 'B', text: 'FALSE (Sai)' }
            ],
            correctAnswer: correctTF === 'TRUE' ? 0 : 1,
            section: 'B. True / False',
            type: 'true-false'
          });
        }
      }
    }

    passages.push({
      id: pId,
      title: pTitle,
      text: passageText,
      questions
    });
  }

  const totalQuestions = passages.reduce((sum, p) => sum + p.questions.length, 0);

  return {
    type: 'reading-comprehension',
    title: extractDocumentTitle(rawText),
    totalQuestions,
    passages
  };
}

function extractBoldTexts(html) {
  const boldTexts = [];
  const boldPattern = /<strong>(.*?)<\/strong>|<b>(.*?)<\/b>/gi;
  let match;
  while ((match = boldPattern.exec(html)) !== null) {
    const text = (match[1] || match[2] || '').replace(/<[^>]*>/g, '').trim();
    if (text) boldTexts.push(text);
  }
  return boldTexts;
}

function extractDocumentTitle(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 5)) {
    if (line.length > 8 && !/^(ThS|Trường|Bộ câu hỏi|Based on|Hướng dẫn)/i.test(line)) {
      return line;
    }
  }
  return 'Bài kiểm tra trắc nghiệm';
}

function parseText(rawText) {
  const isReading = /^[ \t]*(?:READING|PASSAGE|BÀI\s*ĐỌC)\s+\d+/im.test(rawText);
  if (isReading) {
    return parseReadingComprehension(rawText, '');
  } else {
    return parseMultipleChoice(rawText, '');
  }
}

module.exports = { parseWordFile, parseText };
