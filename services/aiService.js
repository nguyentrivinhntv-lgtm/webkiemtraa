/**
 * AI Explanation Service for QuizMaster
 * Supports:
 *  1. Groq Cloud API (Llama 3.1 8B / Llama 3.3 / Llama 3 70B - Super fast & free)
 *  2. Google Gemini API (Gemini 1.5 Flash)
 *  3. Built-in Expert Pedagogical Rule Engine (Offline fallback)
 */

const SAFE_GROQ_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'mixtral-8x7b-32768'
];

async function callGroq({ prompt, apiKey }) {
  let lastError = null;

  for (const model of SAFE_GROQ_MODELS) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'Bạn là trợ lý giáo viên tiếng Anh & khảo thí xuất sắc. Luôn trả lời bằng tiếng Việt một cách sư phạm, súc tích, dễ hiểu.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 600
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      } else {
        const errData = await response.json().catch(() => ({}));
        lastError = new Error(errData.error?.message || `Lỗi Groq model ${model}`);
        continue;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Không thể kết nối với các mô hình Groq Llama.');
}

async function callGemini({ prompt, apiKey }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 600
        }
      })
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Lỗi Gemini API (${response.status})`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
}

async function generateExplanation({
  question,
  options = [],
  correctAnswer = 0,
  studentAnswer = -1,
  unit = '',
  apiKey = '',
  provider = 'auto'
}) {
  const key = (apiKey && apiKey.trim()) || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || '';

  const prompt = `Bạn là trợ lý giáo viên tiếng Anh & khảo thí xuất sắc. Hãy giải thích ngắn gọn, súc tích và dễ hiểu cho câu trắc nghiệm sau bằng tiếng Việt:
Câu hỏi: ${question}
Các lựa chọn:
${options.map((opt, i) => `${opt.label || String.fromCharCode(65 + i)}. ${opt.text}`).join('\n')}
Đáp án đúng: ${options[correctAnswer]?.label || String.fromCharCode(65 + correctAnswer)}. ${options[correctAnswer]?.text || ''}
${studentAnswer !== -1 && studentAnswer !== correctAnswer ? `Học sinh đã chọn sai: ${options[studentAnswer]?.label || String.fromCharCode(65 + studentAnswer)}. ${options[studentAnswer]?.text || ''}` : ''}
Chủ điểm ngữ pháp / Unit: ${unit || 'Tổng hợp'}

Cấu trúc trả lời gồm 3 phần:
1. 🎯 Đáp án chính xác & Dịch nghĩa câu hỏi.
2. 💡 Phân tích ngữ pháp / từ vựng: Tại sao chọn đáp án này và tại sao các phương án khác chưa chính xác.
3. 📌 Mẹo ghi nhớ nhanh.`;

  if (key) {
    const isGroq = provider === 'groq' || (provider === 'auto' && (key.startsWith('gsk_') || process.env.GROQ_API_KEY === key));
    
    // 1. Try Groq
    if (isGroq) {
      try {
        const text = await callGroq({ prompt, apiKey: key });
        if (text) return text;
      } catch (err) {
        console.warn('Groq API call failed:', err.message);
      }
    }

    // 2. Try Gemini
    try {
      const text = await callGemini({ prompt, apiKey: key });
      if (text) return text;
    } catch (err) {
      console.warn('Gemini API call failed:', err.message);
    }
  }

  // 3. Fallback to built-in rule engine
  return generateRuleBasedExplanation({ question, options, correctAnswer, studentAnswer, unit });
}

/**
 * Verify if provided Groq or Gemini API Key is valid
 */
async function testApiKey(apiKey, provider = 'auto') {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Vui lòng nhập API Key!');
  }
  const key = apiKey.trim();
  const isGroq = provider === 'groq' || (provider === 'auto' && key.startsWith('gsk_'));

  if (isGroq) {
    let lastError = null;
    let workingModel = null;

    for (const model of SAFE_GROQ_MODELS) {
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
          lastError = new Error(errData.error?.message || `Lỗi với model ${model}`);
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (workingModel) {
      return {
        success: true,
        provider: 'groq',
        model: `${workingModel} (Groq Cloud)`,
        message: `🎉 Kết nối Groq Cloud API thành công! Mô hình ${workingModel} phản hồi siêu tốc.`
      };
    } else {
      throw new Error(`Groq: ${lastError?.message || 'Không thể xác thực API Key với Groq.'}`);
    }
  } else {
    // Test as Gemini
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Trả lời đúng 1 chữ: OK' }] }],
            generationConfig: { maxOutputTokens: 10 }
          })
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Lỗi xác thực Gemini API (Mã ${response.status})`);
      }

      return {
        success: true,
        provider: 'gemini',
        model: 'Gemini 1.5 Flash',
        message: '🎉 Kết nối Google Gemini thành công! API Key hoàn toàn hợp lệ.'
      };
    } catch (err) {
      throw new Error(`Gemini: ${err.message}`);
    }
  }
}

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
  } else {
    analysis = `Xét theo ngữ cảnh câu và ngữ pháp tiếng Anh, phương án **${correctLabel} (${correctText})** là đáp án chính xác nhất, đảm bảo tính liên kết từ vựng và cấu trúc ngữ pháp chuẩn xác.`;
    tip = `Đọc kỹ chủ ngữ và động từ chính trong câu để xác định thì và dạng từ (danh từ, động từ, tính từ) phù hợp.`;
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
