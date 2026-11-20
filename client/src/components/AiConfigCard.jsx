import { useState, useEffect } from 'react';
import {
  FaRobot, FaKey, FaCheckCircle, FaExclamationTriangle,
  FaSpinner, FaEye, FaEyeSlash, FaExternalLinkAlt, FaTrash,
  FaBolt, FaGoogle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { testAiKeyApi } from '../services/api';

function AiConfigCard() {
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('auto'); // 'auto' | 'groq' | 'gemini'
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ai_api_key') || localStorage.getItem('gemini_api_key') || '';
    const savedProvider = localStorage.getItem('ai_provider') || 'auto';
    setApiKey(saved);
    setProvider(savedProvider);
    if (saved) setIsSaved(true);
  }, []);

  const detectedProvider = apiKey.startsWith('gsk_') ? 'groq' : apiKey.startsWith('AIza') ? 'gemini' : provider;

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      toast.warning('Vui lòng nhập API Key (Groq hoặc Gemini) để kiểm tra!');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await testAiKeyApi(apiKey.trim(), provider);
      setTestResult({
        success: true,
        message: res.data.message || 'Kết nối thành công!'
      });
      toast.success(res.data.message || '🎉 Kết nối API thành công!');
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.error || err.message
      });
      toast.error('❌ Kiểm tra thất bại: ' + (err.response?.data?.error || err.message));
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!apiKey.trim()) {
      handleClear();
      return;
    }

    const key = apiKey.trim();
    localStorage.setItem('ai_api_key', key);
    localStorage.setItem('gemini_api_key', key); // backward compatibility
    localStorage.setItem('ai_provider', provider);
    setIsSaved(true);

    const providerLabel = key.startsWith('gsk_') ? 'Groq Cloud (Llama 3.3)' : 'Google Gemini';
    toast.success(`💾 Đã lưu cấu hình ${providerLabel} thành công!`);
  };

  const handleClear = () => {
    localStorage.removeItem('ai_api_key');
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('ai_provider');
    setApiKey('');
    setIsSaved(false);
    setTestResult(null);
    toast.info('Đã xóa API Key. Hệ thống chuyển về bộ phân tích ngữ pháp tích hợp.');
  };

  return (
    <div className="card-custom p-4 border shadow-sm">
      <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom flex-wrap gap-2">
        <h5 className="fw-bold mb-0 d-flex align-items-center gap-2 text-dark">
          <FaRobot className="text-primary" /> Cấu Hình Trợ Lý AI (Groq & Gemini)
        </h5>
        {isSaved ? (
          <span className="badge bg-success bg-opacity-10 text-success border border-success d-flex align-items-center gap-1">
            <FaCheckCircle /> Đã kích hoạt API {detectedProvider === 'groq' ? '(Groq ⚡)' : '(Gemini ✨)'}
          </span>
        ) : (
          <span className="badge bg-secondary bg-opacity-10 text-secondary border">
            Bộ phân tích tích hợp (Offline)
          </span>
        )}
      </div>

      <p className="text-secondary small mb-3 lh-base">
        Hệ thống hỗ trợ <strong>Groq Cloud API (Llama 3.3 70B Siêu Tốc)</strong> và <strong>Google Gemini API</strong>. Cả 2 đều cung cấp gói miễn phí. Chỉ cần dán API Key vào đây, hệ thống sẽ tự động nhận diện và phân tích giải thích đáp án chi tiết.
      </p>

      {/* Provider Selector Pills */}
      <div className="mb-3">
        <label className="form-label small fw-bold text-dark mb-1">CHỌN NỀN TẢNG AI:</label>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className={`btn btn-sm ${provider === 'auto' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setProvider('auto')}
          >
            🔄 Tự động nhận diện
          </button>
          <button
            type="button"
            className={`btn btn-sm ${provider === 'groq' ? 'btn-warning text-dark fw-bold' : 'btn-outline-warning text-dark'}`}
            onClick={() => setProvider('groq')}
          >
            <FaBolt className="text-warning" /> Groq Cloud (Llama 3.3 70B)
          </button>
          <button
            type="button"
            className={`btn btn-sm ${provider === 'gemini' ? 'btn-info text-white fw-bold' : 'btn-outline-info'}`}
            onClick={() => setProvider('gemini')}
          >
            <FaGoogle /> Google Gemini
          </button>
        </div>
      </div>

      {/* API Key Input */}
      <div className="mb-3">
        <label className="form-label small fw-bold text-dark d-flex align-items-center gap-1">
          <FaKey className="text-secondary" />
          {provider === 'groq' || apiKey.startsWith('gsk_') ? 'Groq API Key (bắt đầu bằng gsk_...)' : 'Gemini / Groq API Key'}
        </label>
        <div className="input-group">
          <input
            type={showKey ? 'text' : 'password'}
            className="form-control"
            placeholder={provider === 'groq' ? 'gsk_...' : 'gsk_... hoặc AIzaSy...'}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setIsSaved(false);
              setTestResult(null);
            }}
          />
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setShowKey(prev => !prev)}
            title={showKey ? 'Ẩn API Key' : 'Hiện API Key'}
          >
            {showKey ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        {/* Free API Key Links */}
        <div className="d-flex flex-wrap gap-3 align-items-center mt-2 small">
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-warning fw-bold text-decoration-none d-inline-flex align-items-center gap-1"
            style={{ fontSize: '0.82rem' }}
          >
            ⚡ Lấy Groq API Key miễn phí (console.groq.com) <FaExternalLinkAlt size={10} />
          </a>
          <span className="text-muted">•</span>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-decoration-none d-inline-flex align-items-center gap-1"
            style={{ fontSize: '0.82rem' }}
          >
            ✨ Lấy Gemini API Key (Google AI Studio) <FaExternalLinkAlt size={10} />
          </a>
        </div>
      </div>

      {/* Test Result Alert */}
      {testResult && (
        <div className={`p-2 px-3 rounded-2 small mb-3 ${testResult.success ? 'bg-success bg-opacity-10 text-success border border-success' : 'bg-danger bg-opacity-10 text-danger border border-danger'}`}>
          {testResult.success ? <FaCheckCircle className="me-1" /> : <FaExclamationTriangle className="me-1" />}
          <strong>{testResult.message}</strong>
        </div>
      )}

      {/* Action Buttons */}
      <div className="d-flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary-custom btn-sm px-3 py-2 fw-semibold d-flex align-items-center gap-2"
          onClick={handleSave}
        >
          💾 Lưu Cấu Hình
        </button>

        <button
          type="button"
          className="btn btn-outline-info btn-sm px-3 py-2 fw-semibold d-flex align-items-center gap-2"
          disabled={testing || !apiKey.trim()}
          onClick={handleTestConnection}
        >
          {testing ? (
            <><FaSpinner className="fa-spin" /> Đang kiểm tra...</>
          ) : (
            <>🔍 Kiểm Tra Kết Nối</>
          )}
        </button>

        {isSaved && (
          <button
            type="button"
            className="btn btn-outline-danger btn-sm px-3 py-2 d-flex align-items-center gap-1 ms-auto"
            onClick={handleClear}
            title="Xóa khóa API đã lưu"
          >
            <FaTrash size={12} /> Xóa Key
          </button>
        )}
      </div>
    </div>
  );
}

export default AiConfigCard;
