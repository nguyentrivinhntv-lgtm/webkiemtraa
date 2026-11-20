/**
 * AI Explanation Service for QuizMaster
 * Supports:
 *  1. Groq Cloud API (Llama 3.1 8B / Llama 3.3 70B - Siêu tốc & miễn phí)
 *  2. Google Gemini API (Gemini 1.5 Flash / 2.0 Flash)
 *  3. Built-in Expert Pedagogical Rule Engine (Hệ thống phân tích tiếng Việt ngoại tuyến)
 */

// Danh sách các mô hình Groq chính thức còn đang hoạt động
const SAFE_GROQ_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile'
];

// Danh sách đen các model đã bị Groq khai tử (decommissioned)
const DECOMMISSIONED_GROQ_MODELS = [
  'llama-3.2-1b-preview',
  'llama-3.2-3b-preview',
  'llama-3.2-11b-vision-preview',
  'llama-3.2-90b-vision-preview',
  'llama-3.2-11b-text-preview',
  'llama-3.2-90b-text-preview',
  'llama3-8b-8192',
  'llama3-70b-8192',
  'mixtral-8x7b-32768',
  'gemma-7b-it',
  'gemma2-9b-it'
];

// Danh sách các model Google Gemini phổ biến
const SAFE_GEMINI_MODELS = [
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
  'gemini-pro'
];

/**
 * Chuyển đổi toàn bộ thông báo lỗi tiếng Anh từ Groq / Gemini sang Tiếng Việt
 */
function translateAiError(msg) {
  if (!msg) return 'Không thể kết nối đến máy chủ AI.';
  const lower = String(msg).toLowerCase();

  if (lower.includes('decommissioned') || lower.includes('no longer supported')) {
    return 'Mô hình này đã bị nhà cung cấp ngừng cung cấp (decommissioned).';
  }
  if (lower.includes('does not exist') || lower.includes('not found') || lower.includes('not supported') || lower.includes('not available')) {
    return 'Mô hình không tồn tại hoặc tài khoản của bạn chưa được cấp quyền sử dụng.';
  }
  if (lower.includes('terms acceptance') || lower.includes('accept the terms')) {
    return 'Tài khoản cần chấp thuận điều khoản dịch vụ (Terms of Service) trên trang quản trị Groq Console.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('quota') || lower.includes('resource_exhausted')) {
    return 'Đã vượt quá giới hạn lượt gọi hoặc dung lượng miễn phí (Rate Limit).';
  }
  if (lower.includes('invalid api key') || lower.includes('api_key_invalid') || lower.includes('unauthorized') || lower.includes('401')) {
    return 'Mã API Key không hợp lệ hoặc đã bị vô hiệu hóa.';
  }
  if (lower.includes('organization restricted') || lower.includes('access denied') || lower.includes('permission denied') || lower.includes('403')) {
    return 'Quyền truy cập bị từ chối bởi tổ chức hoặc tài khoản của bạn.';
  }

  return msg;
}

/**
 * Lấy danh sách mô hình chat đang hoạt động từ Groq
 */
async function fetchActiveGroqModels(apiKey) {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (res.status === 401) {
      throw new Error('API Key Groq không chính xác hoặc đã bị vô hiệu hóa.');
    }
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data.data)) return [];
    const skip = ['whisper', 'tts', 'guard', 'orpheus', 'embed', 'vision', 'scout'];
    return data.data
      .filter(m => {
        const id = m.id || '';
        if (m.active === false) return false;
        if (DECOMMISSIONED_GROQ_MODELS.includes(id)) return false;
        if (skip.some(s => id.includes(s))) return false;
        return true;
      })
      .map(m => m.id);
  } catch (err) {
    if (err.message && err.message.includes('API Key')) throw err;
    return [];
  }
}

/**
 * Lấy danh sách mô hình Google Gemini khả dụng
 */
async function fetchActiveGeminiModels(apiKey) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`);
    if (res.status === 400 || res.status === 403) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || '';
      if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
        throw new Error('API Key Google Gemini không hợp lệ.');
      }
    }
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data.models)) return [];
    return data.models
      .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map(m => m.name.replace(/^models\//, ''));
  } catch (err) {
    if (err.message && err.message.includes('API Key')) throw err;
    return [];
  }
}

/**
 * Gọi Groq API để tạo lời giải thích (100% Tiếng Việt)
 */

/**
 * Làm sạch phản hồi AI: loại bỏ thẻ suy nghĩ <think> và các đoạn phân tích CoT tiếng Anh bị rò rỉ
 */
function cleanAiResponse(text) {
  if (!text) return '';
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Nếu mô hình in ra phần suy nghĩ (Chain of Thought) trước câu trả lời thực tế
  const firstHeader = cleaned.search(/(🎯|💡|1\.\s*🎯|1\.\s*\*\*Đáp án|\*\*🎯|\*\*Đáp án đúng)/);
  if (firstHeader > 0) {
    const preamble = cleaned.substring(0, firstHeader);
    if (
      preamble.includes('Topic:') ||
      preamble.includes('Constraint:') ||
      preamble.includes('Subject Category:') ||
      preamble.includes('Concept:') ||
      preamble.includes('Question:')
    ) {
      cleaned = cleaned.substring(firstHeader).trim();
    }
  }
  return cleaned;
}

async function callGroq({ prompt, apiKey }) {
  const key = apiKey.trim();
  let dynamicModels = [];
  try {
    dynamicModels = await fetchActiveGroqModels(key);
  } catch (err) {
    if (err.message && err.message.includes('API Key')) throw err;
  }

  const candidates = [
    ...SAFE_GROQ_MODELS.filter(m => dynamicModels.includes(m)),
    ...dynamicModels.filter(m => !SAFE_GROQ_MODELS.includes(m) && !DECOMMISSIONED_GROQ_MODELS.includes(m)),
    ...SAFE_GROQ_MODELS
  ];
  const candidateModels = Array.from(new Set(candidates));
  let lastError = null;

  for (const model of candidateModels) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'Bạn là chuyên gia giáo dục và khảo thí xuất sắc đa môn học (Pháp luật, Khoa học, Xã hội, Ngoại ngữ, v.v.). BẮT BUỘC TRẢ LỜI 100% BẰNG TIẾNG VIỆT. CHỈ TRẢ LỜI TRỰC TIẾP LỜI GIẢI THÍCH THEO CẤU TRÚC 3 PHẦN. TUYỆT ĐỐI KHÔNG IN RA SUY NGHĨ NỘI TÂM (CHAIN OF THOUGHT), KHÔNG PHÂN TÍCH BẰNG TIẾNG ANH, KHÔNG GIẢI THÍCH NGOÀI LỀ. TUYỆT ĐỐI KHÔNG DÙNG TIẾNG ANH ĐỂ GIẢI THÍCH (chỉ giữ nguyên các từ tiếng Anh khi trích dẫn đề bài hoặc từ vựng cần phân tích). Giải thích chi tiết, sư phạm, chuẩn xác.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 800
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return cleanAiResponse(content);
      } else {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || '';
        if (response.status === 401) {
          throw new Error('Groq API Key không hợp lệ hoặc đã hết hạn.');
        }
        lastError = new Error(translateAiError(errMsg) || `Lỗi Groq model ${model}`);
        continue;
      }
    } catch (err) {
      if (err.message && err.message.includes('không hợp lệ')) throw err;
      lastError = err;
    }
  }

  throw lastError || new Error('Không thể kết nối với các mô hình Groq.');
}

/**
 * Gọi Google Gemini API để tạo lời giải thích (100% Tiếng Việt)
 */
async function callGemini({ prompt, apiKey }) {
  const key = apiKey.trim();
  let dynamicModels = [];
  try {
    dynamicModels = await fetchActiveGeminiModels(key);
  } catch (err) {
    if (err.message && err.message.includes('API Key')) throw err;
  }

  const candidates = [
    ...SAFE_GEMINI_MODELS.filter(m => dynamicModels.length === 0 || dynamicModels.includes(m)),
    ...dynamicModels.filter(m => !SAFE_GEMINI_MODELS.includes(m))
  ];
  const modelsToTry = candidates.length > 0 ? Array.from(new Set(candidates)) : SAFE_GEMINI_MODELS;
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 800
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return cleanAiResponse(text);
      } else {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || `Lỗi Gemini (${response.status})`;
        if (errMsg.includes('not found') || errMsg.includes('not supported') || response.status === 404) {
          continue;
        }
        lastError = new Error(translateAiError(errMsg));
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Không thể kết nối với các mô hình Google Gemini.');
}

/**
 * Sinh lời giải thích AI chi tiết (100% Tiếng Việt)
 */
async function generateExplanation({
  question,
  options = [],
  correctAnswer = 0,
  studentAnswer = -1,
  unit = '',
  quizTitle = '',
  apiKey = '',
  provider = 'auto'
}) {
  const key = (apiKey && apiKey.trim()) || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || '';

  const subject = quizTitle || unit || 'Kiến thức chuyên môn bài thi';

  const prompt = `YÊU CẦU BẮT BUỘC:
- TOÀN BỘ BÀI GIẢI PHẢI ĐƯỢC VIẾT 100% BẰNG TIẾNG VIỆT.
- CHỈ TRẢ LỜI TRỰC TIẾP LỜI GIẢI THEO CẤU TRÚC 3 PHẦN (KHÔNG IN RA SUY NGHĨ NỘI TÂM / CHAIN OF THOUGHT, KHÔNG DỊCH TIẾNG ANH).

Bạn là giáo viên chuyên môn giỏi, tận tâm và giàu kinh nghiệm luyện thi môn ${subject}. Hãy phân tích và giải thích cặn kẽ câu trắc nghiệm sau bằng tiếng Việt:

ĐỀ BÀI:
- Câu hỏi: ${question}
- Các lựa chọn:
${options.map((opt, i) => `  ${opt.label || String.fromCharCode(65 + i)}. ${opt.text}`).join('\n')}
- Đáp án chính xác: ${options[correctAnswer]?.label || String.fromCharCode(65 + correctAnswer)}. ${options[correctAnswer]?.text || ''}
${studentAnswer !== -1 && studentAnswer !== correctAnswer ? `- Học sinh đã chọn: ${options[studentAnswer]?.label || String.fromCharCode(65 + studentAnswer)}. ${options[studentAnswer]?.text || ''} (Đáp án này chưa chính xác)\n` : ''}- Môn thi / Chủ đề: ${subject}

HÃY TRÌNH BÀY LỜI GIẢI THEO CẤU TRÚC 3 PHẦN (100% TIẾNG VIỆT):
🎯 **Đáp án đúng:** ${options[correctAnswer]?.label || 'A'}. ${options[correctAnswer]?.text || ''} [Kèm giải nghĩa câu hỏi ngắn gọn bằng tiếng Việt]
💡 **Phân tích chi tiết:** [Phân tích kiến thức chuyên môn: Tại sao chọn đáp án này? Căn cứ vào quy định, bản chất hoặc lý thuyết nào? Vì sao các phương án khác chưa chính xác?]
📌 **Mẹo ghi nhớ nhanh:** [Từ khóa cốt lõi hoặc quy tắc ngắn gọn giúp ghi nhớ nhanh]`;

  if (key) {
    const isGroq = provider === 'groq' || (provider === 'auto' && (key.startsWith('gsk_') || process.env.GROQ_API_KEY === key));

    // 1. Thử Groq
    if (isGroq) {
      try {
        const text = await callGroq({ prompt, apiKey: key });
        if (text) return text;
      } catch (err) {
        console.warn('Groq API call failed:', err.message);
      }
    }

    // 2. Thử Gemini
    try {
      const text = await callGemini({ prompt, apiKey: key });
      if (text) return text;
    } catch (err) {
      console.warn('Gemini API call failed:', err.message);
    }
  }

  // 3. Fallback sang bộ quy tắc sư phạm tích hợp (100% tiếng Việt offline)
  return generateRuleBasedExplanation({ question, options, correctAnswer, studentAnswer, unit });
}

/**
 * Kiểm tra kết nối và tính hợp lệ của API Key (Groq hoặc Gemini)
 */
async function testApiKey(apiKey, provider = 'auto') {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Vui lòng nhập API Key!');
  }
  const key = apiKey.trim();
  const isGroq = provider === 'groq' || (provider === 'auto' && key.startsWith('gsk_'));

  if (isGroq) {
    let availableModels = [];

    // 1. Thăm dò models endpoint của Groq
    try {
      availableModels = await fetchActiveGroqModels(key);
    } catch (err) {
      if (err.message && err.message.includes('API Key')) {
        throw new Error(`Groq: ${translateAiError(err.message)}`);
      }
    }

    const candidates = [
      ...SAFE_GROQ_MODELS.filter(m => availableModels.includes(m)),
      ...availableModels.filter(m => !SAFE_GROQ_MODELS.includes(m) && !DECOMMISSIONED_GROQ_MODELS.includes(m)),
      ...SAFE_GROQ_MODELS
    ];
    const modelsToTry = Array.from(new Set(candidates));

    let workingModel = null;
    const attemptedErrors = [];

    for (const model of modelsToTry) {
      try {
        const testRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'Trả lời đúng 1 chữ: OK' }],
            max_tokens: 10
          })
        });

        if (testRes.ok) {
          workingModel = model;
          break;
        } else {
          const errData = await testRes.json().catch(() => ({}));
          const errMsg = errData.error?.message || `Mã ${testRes.status}`;
          if (testRes.status === 401) {
            throw new Error('API Key Groq không chính xác hoặc đã hết hạn.');
          }
          if (testRes.status === 429) {
            throw new Error(`Groq: Vượt quá giới hạn lượt gọi (Rate Limit): ${translateAiError(errMsg)}`);
          }
          attemptedErrors.push(`[${model}]: ${translateAiError(errMsg)}`);
        }
      } catch (err) {
        if (err.message && (err.message.includes('API Key') || err.message.includes('Rate Limit'))) {
          throw err;
        }
        attemptedErrors.push(`[${model}]: ${translateAiError(err.message)}`);
      }
    }

    if (workingModel) {
      return {
        success: true,
        provider: 'groq',
        model: `${workingModel} (Groq Cloud)`,
        message: `🎉 Kết nối Groq Cloud API thành công! Mô hình ${workingModel} phản hồi siêu tốc bằng Tiếng Việt.`
      };
    } else {
      const availableStr = availableModels.length > 0
        ? `Models có sẵn trên tài khoản: ${availableModels.join(', ')}`
        : 'Không lấy được danh sách model';
      const detailMsg = attemptedErrors.length > 0 ? attemptedErrors.join(' | ') : 'Không có phản hồi từ máy chủ';
      throw new Error(`Groq (${availableStr}): ${detailMsg}`);
    }
  } else {
    // Test Gemini
    let availableModels = [];
    try {
      availableModels = await fetchActiveGeminiModels(key);
    } catch (err) {
      if (err.message && err.message.includes('API Key')) {
        throw new Error(`Gemini: ${translateAiError(err.message)}`);
      }
    }

    const candidates = [
      ...SAFE_GEMINI_MODELS.filter(m => availableModels.length === 0 || availableModels.includes(m)),
      ...availableModels.filter(m => !SAFE_GEMINI_MODELS.includes(m))
    ];
    const modelsToTry = candidates.length > 0 ? Array.from(new Set(candidates)) : SAFE_GEMINI_MODELS;

    let workingModel = null;
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Trả lời đúng 1 chữ: OK' }] }],
              generationConfig: { maxOutputTokens: 10 }
            })
          }
        );

        if (response.ok) {
          workingModel = model;
          break;
        } else {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `Mã ${response.status}`;
          if (response.status === 400 && errMsg.includes('API_KEY_INVALID')) {
            throw new Error('API Key Google Gemini không chính xác.');
          }
          if (errMsg.includes('not found') || errMsg.includes('not supported') || response.status === 404) {
            continue;
          }
          lastError = new Error(translateAiError(errMsg));
        }
      } catch (err) {
        if (err.message && err.message.includes('API Key')) throw err;
        lastError = err;
      }
    }

    if (workingModel) {
      return {
        success: true,
        provider: 'gemini',
        model: `${workingModel} (Google Gemini)`,
        message: `🎉 Kết nối Google Gemini thành công! Mô hình ${workingModel} sẵn sàng hoạt động bằng Tiếng Việt.`
      };
    } else {
      throw new Error(`Gemini: ${lastError?.message || 'Không tìm thấy mô hình Gemini khả dụng cho API Key này.'}`);
    }
  }
}

/**
 * Bộ quy tắc sư phạm tích hợp (Offline Rule-Based) - 100% Tiếng Việt
 */
function generateRuleBasedExplanation({ question, options, correctAnswer, studentAnswer, unit }) {
  const correctOpt = options[correctAnswer] || { label: 'A', text: '' };
  const optLabels = ['A', 'B', 'C', 'D'];
  const correctLabel = correctOpt.label || optLabels[correctAnswer] || 'A';
  const correctText = correctOpt.text || '';

  const qLower = (question || '').toLowerCase();
  let analysis = '';
  let tip = '';

  if (qLower.includes('yesterday') || qLower.includes('ago') || qLower.includes('last year') || qLower.includes('last night') || qLower.includes('in 19') || qLower.includes('in 20')) {
    analysis = `Trong câu xuất hiện dấu hiệu thời gian quá khứ đơn (Past Simple). Động từ cần chia ở dạng V2/V-ed. Phương án **${correctLabel} (${correctText})** là dạng quá khứ chính xác của động từ cần điền.`;
    tip = `Ghi nhớ dấu hiệu Quá khứ đơn: *yesterday, ago, last + time, in + năm quá khứ*.`;
  } else if (qLower.includes('tomorrow') || qLower.includes('next week') || qLower.includes('next month') || qLower.includes('soon')) {
    analysis = `Câu có trạng từ chỉ tương lai (*tomorrow, next week*). Ta dùng thì Tương lai đơn (*will + V*) hoặc thì Hiện tại tiếp diễn chỉ kế hoạch. Do đó **${correctLabel} (${correctText})** là cấu trúc phù hợp.`;
    tip = `Dấu hiệu Tương lai: *tomorrow, next, in the future, soon*.`;
  } else if (qLower.includes('already') || qLower.includes('since') || qLower.includes('for 3') || qLower.includes('for two') || qLower.includes('just') || qLower.includes('yet')) {
    analysis = `Câu xuất hiện trạng từ nhận biết thì Hiện tại hoàn thành (Present Perfect: *have/has + V3/V-ed*). Phương án **${correctLabel} (${correctText})** đúng cấu trúc và hòa hợp chủ ngữ.`;
    tip = `Hiện tại hoàn thành: *since + mốc thời gian, for + khoảng thời gian, already, yet, just*.`;
  } else if (qLower.includes('if ') || qLower.startsWith('if')) {
    analysis = `Đây là câu điều kiện (Conditional sentence). Cần xét thì ở mệnh đề If và mệnh đề chính. Lựa chọn **${correctLabel} (${correctText})** thỏa mãn quy tắc phối hợp thì.`;
    tip = `Nhận diện loại câu điều kiện bằng cách nhìn vào mệnh đề đã cho sẵn thì.`;
  } else if (qLower.includes('more ') || qLower.includes(' than') || qLower.includes('the most') || qLower.includes('the best') || qLower.includes('as ... as')) {
    analysis = `Câu kiểm tra cấu trúc so sánh (Comparison). Phương án **${correctLabel} (${correctText})** tuân thủ đúng dạng so sánh hơn/so sánh nhất của tính từ/trạng từ.`;
    tip = `So sánh hơn: tính từ ngắn + *er than*, tính từ dài: *more + adj + than*. So sánh nhất: *the + est / the most + adj*.`;
  } else if (qLower.includes('preposition') || qLower.includes('interested') || qLower.includes('fond') || qLower.includes('good at') || qLower.includes('depend')) {
    analysis = `Câu kiểm tra cụm giới từ cố định (Collocation / Prepositional phrase). Giới từ đi kèm chính xác với ngữ cảnh câu là **${correctLabel} (${correctText})**.`;
    tip = `Học giới từ theo cụm: *interested in, good at, fond of, depend on, proud of*.`;
  } else if (qLower.includes('luật') || qLower.includes('pháp luật') || qLower.includes('văn bản') || qLower.includes('quy định') || qLower.includes('cơ quan') || qLower.includes('nhà nước') || qLower.includes('thẩm quyền') || qLower.includes('bắt buộc') || qLower.includes('quy chuẩn') || qLower.includes('hành chính') || qLower.includes('hình sự') || qLower.includes('dân sự')) {
    analysis = `Căn cứ theo lý luận và quy định của pháp luật hiện hành, phương án **${correctLabel} (${correctText})** phản ánh chính xác và đầy đủ nhất bản chất của nội dung được hỏi.`;
    tip = `Ghi nhớ các đặc điểm cốt lõi của pháp luật: Tính quy phạm phổ biến (bắt buộc chung), do Nhà nước ban hành/bảo đảm và được áp dụng nhiều lần.`;
  } else {
    analysis = `Xét theo kiến thức chuyên môn của câu hỏi, phương án **${correctLabel} (${correctText})** là đáp án chính xác và toàn diện nhất theo chuẩn kiến thức bài thi.`;
    tip = `Đọc kỹ câu hỏi và các phương án gây nhiễu để chọn đáp án bao quát nhất.`;
  }

  let studentNote = '';
  if (studentAnswer !== -1 && studentAnswer !== correctAnswer) {
    const wrongOpt = options[studentAnswer];
    const wrongLabel = wrongOpt?.label || optLabels[studentAnswer] || 'B';
    studentNote = `\n- ⚠️ **Lỗi thường gặp:** Bạn đã chọn **${wrongLabel}**, đây là phương án gây nhiễu vì sai dạng từ hoặc không phù hợp với chủ ngữ/thì của câu.`;
  }

  return `🎯 **Đáp án đúng:** **${correctLabel}. ${correctText}**

💡 **Phân tích chi tiết:**
${analysis}${studentNote}

📌 **Mẹo ghi nhớ:**
${tip}`;
}

module.exports = {
  generateExplanation,
  testApiKey,
  testGeminiApiKey: testApiKey
};
