/**
 * AI Explanation Service for QuizMaster
 * Supports Google Gemini API if GEMINI_API_KEY is configured,
 * with a built-in expert pedagogical heuristic engine as instant fallback.
 */

async function generateExplanation({ question, options = [], correctAnswer = 0, studentAnswer = -1, unit = '' }) {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey && geminiKey.trim()) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Bạn là trợ lý giáo viên tiếng Anh & khảo thí xuất sắc. Hãy giải thích ngắn gọn, súc tích và dễ hiểu cho câu trắc nghiệm sau bằng tiếng Việt:
Câu hỏi: ${question}
Các lựa chọn:
${options.map((opt, i) => `${opt.label || String.fromCharCode(65 + i)}. ${opt.text}`).join('\n')}
Đáp án đúng: ${options[correctAnswer]?.label || String.fromCharCode(65 + correctAnswer)}. ${options[correctAnswer]?.text || ''}
${studentAnswer !== -1 && studentAnswer !== correctAnswer ? `Học sinh đã chọn sai: ${options[studentAnswer]?.label || String.fromCharCode(65 + studentAnswer)}. ${options[studentAnswer]?.text || ''}` : ''}
Chủ điểm ngữ pháp / Unit: ${unit || 'Tổng hợp'}

Cấu trúc trả lời gồm 3 phần:
1. 🎯 Đáp án chính xác & Dịch nghĩa câu hỏi.
2. 💡 Phân tích ngữ pháp / từ vựng: Tại sao chọn đáp án này và tại sao các phương án khác chưa chính xác.
3. 📌 Mẹo ghi nhớ nhanh.`
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 500
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          return text.trim();
        }
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to expert rule engine:', err.message);
    }
  }

  // Built-in Expert Rule-based Explanation Engine
  return generateRuleBasedExplanation({ question, options, correctAnswer, studentAnswer, unit });
}

function generateRuleBasedExplanation({ question, options, correctAnswer, studentAnswer, unit }) {
  const correctOpt = options[correctAnswer] || { label: 'A', text: '' };
  const optLabels = ['A', 'B', 'C', 'D'];
  const correctLabel = correctOpt.label || optLabels[correctAnswer] || 'A';
  const correctText = correctOpt.text || '';

  const qLower = (question || '').toLowerCase();
  let analysis = '';
  let tip = '';

  // Grammar detection patterns
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
    analysis = `Đây là câu điều kiện (Conditional sentence). Cần xét thì ở mệnh đề If và mệnh đề chính (Type 1: If + HTĐ, will + V; Type 2: If + QKĐ, would + V; Type 3: If + QKHT, would have + V3). Lựa chọn **${correctLabel} (${correctText})** thỏa mãn quy tắc phối hợp thì.`;
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
  generateExplanation
};
