import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FaBolt, FaFire, FaClock, FaTrophy, FaArrowLeft,
  FaRedo, FaHome, FaCheck, FaTimes, FaStar
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { getSpeedChallengeApi } from '../services/api';

export default function ChallengePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [challengeData, setChallengeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    loadChallenge();
  }, [id]);

  const loadChallenge = async () => {
    setLoading(true);
    setGameOver(false);
    setCurrentIdx(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCorrectCount(0);
    setSelectedOpt(null);
    setRevealed(false);

    try {
      const res = await getSpeedChallengeApi(id);
      setChallengeData(res.data);
      setTimeLeft(res.data.timePerQuestion || 15);
    } catch (err) {
      toast.error('Lỗi tải thử thách: ' + (err.response?.data?.error || err.message));
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  // 15-second countdown timer per question
  useEffect(() => {
    if (loading || gameOver || revealed) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [loading, gameOver, revealed, currentIdx]);

  const handleTimeout = () => {
    setRevealed(true);
    setCombo(0); // Break combo on timeout
    toast.error('⏰ Hết thời gian cho câu hỏi này!');
    setTimeout(() => {
      nextQuestion();
    }, 1500);
  };

  const handleSelect = (optIndex) => {
    if (revealed || gameOver) return;
    clearInterval(timerRef.current);
    setSelectedOpt(optIndex);
    setRevealed(true);

    const currentQ = challengeData.questions[currentIdx];
    const isCorrect = optIndex === currentQ.correctAnswer;

    if (isCorrect) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
      setCorrectCount(prev => prev + 1);

      // Points: 100 base * combo multiplier (1.0 to 2.5) + remaining seconds bonus
      const multiplier = Math.min(2.5, 1 + (newCombo - 1) * 0.3);
      const points = Math.round(100 * multiplier) + (timeLeft * 10);
      setScore(prev => prev + points);
    } else {
      setCombo(0); // Reset combo
    }

    setTimeout(() => {
      nextQuestion();
    }, 1500);
  };

  const nextQuestion = () => {
    if (currentIdx < challengeData.questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOpt(null);
      setRevealed(false);
      setTimeLeft(challengeData.timePerQuestion || 15);
    } else {
      setGameOver(true);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner-custom"></div>
      </div>
    );
  }

  const currentQ = challengeData?.questions[currentIdx];
  const timePercent = Math.round((timeLeft / (challengeData?.timePerQuestion || 15)) * 100);

  return (
    <div className="container py-4 pb-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link to="/" className="text-secondary text-decoration-none small d-flex align-items-center gap-1 mb-1">
            <FaArrowLeft /> Về trang chủ
          </Link>
          <h3 className="fw-bold mb-0 d-flex align-items-center gap-2">
            ⚡ Thử Thách Tốc Độ (Speed Quiz)
          </h3>
          <p className="text-secondary small mb-0">{challengeData?.quizTitle}</p>
        </div>

        <div className="d-flex align-items-center gap-3">
          {/* Combo badge */}
          {combo >= 2 && (
            <div className="badge bg-warning text-dark px-3 py-2 fs-6 fw-bold shadow-sm fa-bounce">
              <FaFire className="text-danger me-1" /> COMBO x{combo}!
            </div>
          )}

          {/* Current score ticker */}
          <div className="card-custom py-1 px-3 border border-primary text-center">
            <span className="small text-secondary d-block" style={{ fontSize: '0.7rem' }}>ĐIỂM SỐ</span>
            <strong className="fs-5 text-primary fw-bold">{score}</strong>
          </div>
        </div>
      </div>

      {!gameOver && currentQ ? (
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-8">
            {/* Timer Countdown Bar */}
            <div className="card-custom p-3 mb-3 border shadow-sm">
              <div className="d-flex justify-content-between align-items-center mb-1 small fw-bold">
                <span className="text-secondary">
                  Câu {currentIdx + 1} / {challengeData.questions.length}
                </span>
                <span className={`d-flex align-items-center gap-1 ${timeLeft <= 5 ? 'text-danger fw-bold fa-beat' : 'text-primary'}`}>
                  <FaClock /> {timeLeft}s
                </span>
              </div>
              <div className="progress" style={{ height: '8px' }}>
                <div
                  className={`progress-bar ${timeLeft <= 5 ? 'bg-danger' : timeLeft <= 8 ? 'bg-warning' : 'bg-primary'}`}
                  style={{ width: `${timePercent}%`, transition: 'width 1s linear' }}
                ></div>
              </div>
            </div>

            {/* Question Card */}
            <div className="card-custom p-4 p-md-5 border shadow-sm mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                <span className="badge bg-primary bg-opacity-10 text-primary">
                  {currentQ.unit || `Câu ${currentIdx + 1}`}
                </span>
                <span className="small text-secondary">
                  ⚡ 15 giây mỗi câu
                </span>
              </div>

              <h4 className="fw-bold text-dark mb-4 lh-base" style={{ fontSize: '1.25rem' }}>
                {currentQ.question}
              </h4>

              {/* Options */}
              <div className="options-list">
                {currentQ.options?.map((opt, i) => {
                  const isSelected = selectedOpt === i;
                  const isCorrect = i === currentQ.correctAnswer;

                  let cls = 'option-btn py-3';
                  if (revealed) {
                    if (isCorrect) cls += ' correct';
                    else if (isSelected && !isCorrect) cls += ' wrong';
                  } else if (isSelected) {
                    cls += ' selected';
                  }

                  return (
                    <button
                      key={i}
                      type="button"
                      className={cls}
                      onClick={() => handleSelect(i)}
                      disabled={revealed}
                    >
                      <span className="option-label">{opt.label}</span>
                      <span className="flex-1 text-start">{opt.text}</span>

                      {revealed && isCorrect && (
                        <span className="badge bg-success text-white ms-auto">
                          <FaCheck className="me-1" /> Đúng!
                        </span>
                      )}
                      {revealed && isSelected && !isCorrect && (
                        <span className="badge bg-danger text-white ms-auto">
                          <FaTimes className="me-1" /> Sai
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Game Over High Score Screen */
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="card-custom p-5 text-center border shadow-lg">
              <div className="mb-3">
                <div className="d-inline-flex p-3 rounded-circle bg-warning bg-opacity-10 text-warning">
                  <FaTrophy size={56} className="fa-bounce" />
                </div>
              </div>

              <h3 className="fw-bold mb-1">Hoàn Thành Thử Thách Tốc Độ!</h3>
              <p className="text-secondary small mb-4">{challengeData?.quizTitle}</p>

              {/* Final Score Ring */}
              <div className="result-circle mb-3" style={{ width: 150, height: 150 }}>
                <div className="result-score" style={{ fontSize: '2.8rem' }}>{score}</div>
                <span className="text-secondary small fw-semibold">Điểm Thưởng</span>
              </div>

              {/* Summary Stats */}
              <div className="row g-2 mb-4">
                <div className="col-4">
                  <div className="p-2 rounded-3 bg-light border">
                    <span className="small text-secondary d-block">Đúng</span>
                    <strong className="text-success fs-5">{correctCount} / 10</strong>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 rounded-3 bg-light border">
                    <span className="small text-secondary d-block">Chuỗi Combo</span>
                    <strong className="text-warning fs-5">x{maxCombo}</strong>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 rounded-3 bg-light border">
                    <span className="small text-secondary d-block">Độ chính xác</span>
                    <strong className="text-primary fs-5">{correctCount * 10}%</strong>
                  </div>
                </div>
              </div>

              <div className="d-flex gap-2 justify-content-center">
                <button
                  type="button"
                  className="btn btn-outline-primary px-4 py-2"
                  onClick={loadChallenge}
                >
                  <FaRedo className="me-2" /> Thử Thách Lại
                </button>
                <Link to="/leaderboard" className="btn btn-primary-custom px-4 py-2">
                  <FaTrophy className="me-2" /> Xem Bảng Xếp Hạng
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
