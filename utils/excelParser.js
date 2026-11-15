const xlsx = require('xlsx');
const path = require('path');

/**
 * Normalize column header to facilitate flexible matching
 */
function normalizeHeader(str) {
  if (!str) return '';
  return str.toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Determine correct answer index (0 for A, 1 for B, 2 for C, 3 for D)
 */
function parseCorrectAnswer(val) {
  if (val === null || val === undefined) return 0;
  const s = val.toString().trim().toUpperCase();

  if (s === 'A' || s === '1' || s.startsWith('A.') || s.startsWith('A:')) return 0;
  if (s === 'B' || s === '2' || s.startsWith('B.') || s.startsWith('B:')) return 1;
  if (s === 'C' || s === '3' || s.startsWith('C.') || s.startsWith('C:')) return 2;
  if (s === 'D' || s === '4' || s.startsWith('D.') || s.startsWith('D:')) return 3;

  // Numeric 0-3
  const num = parseInt(s, 10);
  if (!isNaN(num) && num >= 0 && num <= 3) return num;

  return 0;
}

/**
 * Parse Excel file (.xlsx, .xls) containing quiz questions
 */
function parseExcelFile(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('File Excel rỗng, không tìm thấy bảng dữ liệu');
  }

  // Use the first sheet or one named "Questions" / "DeThi"
  const preferredName = sheetNames.find(n => /câu hỏi|de thi|questions|quiz/i.test(n)) || sheetNames[0];
  const worksheet = workbook.Sheets[preferredName];

  // Convert to JSON array of objects
  const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
  if (!rawRows || rawRows.length === 0) {
    throw new Error('Không có dòng dữ liệu nào trong bảng tính Excel');
  }

  // Find column keys
  const sample = rawRows[0];
  const keys = Object.keys(sample);

  let qKey = null;
  let optAKey = null;
  let optBKey = null;
  let optCKey = null;
  let optDKey = null;
  let correctKey = null;
  let expKey = null;
  let unitKey = null;

  for (const k of keys) {
    const norm = normalizeHeader(k);
    if (!qKey && (norm.includes('cauhoi') || norm.includes('question') || norm.includes('noidung') || norm === 'q' || norm === 'cau')) {
      qKey = k;
    } else if (!optAKey && (norm === 'a' || norm === 'opta' || norm.includes('dapana') || norm.includes('luachona') || norm === 'optiona')) {
      optAKey = k;
    } else if (!optBKey && (norm === 'b' || norm === 'optb' || norm.includes('dapanb') || norm.includes('luachonb') || norm === 'optionb')) {
      optBKey = k;
    } else if (!optCKey && (norm === 'c' || norm === 'optc' || norm.includes('dapanc') || norm.includes('luachonc') || norm === 'optionc')) {
      optCKey = k;
    } else if (!optDKey && (norm === 'd' || norm === 'optd' || norm.includes('dapand') || norm.includes('luachond') || norm === 'optiond')) {
      optDKey = k;
    } else if (!correctKey && (norm.includes('dapandung') || norm.includes('correct') || norm.includes('key') || norm.includes('dapan') || norm === 'ans')) {
      correctKey = k;
    } else if (!expKey && (norm.includes('giaithich') || norm.includes('explanation') || norm.includes('ghichu') || norm.includes('meo'))) {
      expKey = k;
    } else if (!unitKey && (norm.includes('unit') || norm.includes('chude') || norm.includes('phan') || norm.includes('topic') || norm.includes('section'))) {
      unitKey = k;
    }
  }

  // Fallback: If standard names were not matched, map by index
  if (!qKey && keys.length >= 5) {
    qKey = keys[0];
    optAKey = keys[1];
    optBKey = keys[2];
    optCKey = keys[3];
    optDKey = keys[4];
    if (keys.length >= 6) correctKey = keys[5];
    if (keys.length >= 7) expKey = keys[6];
    if (keys.length >= 8) unitKey = keys[7];
  }

  if (!qKey || !optAKey || !optBKey) {
    throw new Error('Cấu trúc file Excel không hợp lệ. Cần ít nhất các cột: Câu hỏi, A, B, C, D, Đáp án đúng');
  }

  const questions = [];
  let index = 1;

  for (const row of rawRows) {
    const qText = (row[qKey] || '').toString().trim();
    if (!qText) continue;

    const optA = (row[optAKey] || '').toString().trim();
    const optB = (row[optBKey] || '').toString().trim();
    const optC = optCKey ? (row[optCKey] || '').toString().trim() : '';
    const optD = optDKey ? (row[optDKey] || '').toString().trim() : '';

    if (!optA || !optB) continue; // Require at least 2 options

    const options = [
      { label: 'A', text: optA },
      { label: 'B', text: optB }
    ];
    if (optC) options.push({ label: 'C', text: optC });
    if (optD) options.push({ label: 'D', text: optD });

    const correctRaw = correctKey ? row[correctKey] : 'A';
    const correctAnswer = parseCorrectAnswer(correctRaw);

    const explanation = expKey ? (row[expKey] || '').toString().trim() : '';
    const unit = unitKey ? (row[unitKey] || '').toString().trim() : '';

    questions.push({
      id: index++,
      question: qText,
      options,
      correctAnswer: correctAnswer < options.length ? correctAnswer : 0,
      explanation,
      unit
    });
  }

  if (questions.length === 0) {
    throw new Error('Không trích xuất được câu hỏi nào từ file Excel. Vui lòng kiểm tra nội dung.');
  }

  const baseTitle = path.basename(filePath, path.extname(filePath))
    .replace(/^BangDiem_|^DeThi_|^Mau_/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();

  return {
    title: baseTitle || 'Đề thi trắc nghiệm (Excel)',
    type: 'multiple-choice',
    totalQuestions: questions.length,
    questions
  };
}

/**
 * Generate a sample Excel template buffer for teachers to download
 */
function generateExcelTemplate() {
  const sampleData = [
    {
      'Câu hỏi': 'She usually _____ to the library on Saturday afternoons.',
      'A': 'goes',
      'B': 'go',
      'C': 'going',
      'D': 'gone',
      'Đáp án đúng': 'A',
      'Giải thích': 'Chủ ngữ ngôi thứ ba số ít (She) đi với động từ thêm -es (goes) ở thì hiện tại đơn.',
      'Chủ đề': 'Unit 1: Present Simple'
    },
    {
      'Câu hỏi': 'If it rains tomorrow, we _____ the picnic.',
      'A': 'cancel',
      'B': 'will cancel',
      'C': 'cancelled',
      'D': 'would cancel',
      'Đáp án đúng': 'B',
      'Giải thích': 'Câu điều kiện loại 1 (Conditional Type 1): If + S + V(hiện tại đơn), S + will + V-nguyên mẫu.',
      'Chủ đề': 'Unit 2: Conditionals'
    },
    {
      'Câu hỏi': 'The Eiffel Tower is located in which European city?',
      'A': 'Rome',
      'B': 'Berlin',
      'C': 'Paris',
      'D': 'Madrid',
      'Đáp án đúng': 'C',
      'Giải thích': 'Tháp Eiffel là biểu tượng nổi tiếng thế giới nằm ở thủ đô Paris, nước Pháp.',
      'Chủ đề': 'General Knowledge'
    }
  ];

  const worksheet = xlsx.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 45 }, // Câu hỏi
    { wch: 15 }, // A
    { wch: 15 }, // B
    { wch: 15 }, // C
    { wch: 15 }, // D
    { wch: 14 }, // Đáp án đúng
    { wch: 40 }, // Giải thích
    { wch: 25 }  // Chủ đề
  ];

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Câu hỏi trắc nghiệm');

  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  parseExcelFile,
  generateExcelTemplate
};

