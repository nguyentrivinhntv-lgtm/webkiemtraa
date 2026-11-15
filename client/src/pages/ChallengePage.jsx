import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FaBolt, FaFire, FaClock, FaTrophy, FaArrowLeft,
  FaRedo, FaHome, FaCheck, FaTimes, FaStar, FaHeart
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { getChallengeApi } from '../services/api';

export default function ChallengePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [mode, setMode] = useState('speed'); // 'speed' | 'survival' | 'daily'
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
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    loadChallenge(mode);
  }, [id, mode]);

  const loadChallenge = async (chosenMode = mode) => {
    setLoading(true);
    setGameOver(false);
    setCurrentIdx(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCorrectCount(0);
    setLives(chosenMode === 'survival' ? 3 : 1);
    setSelectedOpt(null);
    setRevealed(false);

    try {
      const res = await getChallengeApi(id, chosenMode);
      setChallengeData(res.data);
      setTimeLeft(res.data.timePerQuestion || 15);
      if (chosenMode === 'survival') {
        setLives(3);
      }
    } catch (err) {
      toast.error('Lỗi tải thử thách: ' + (err.response?.data?.error || err.message));
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  // Countdown timer per question
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

    if (mode === 'survival') {
      const remainingLives = lives - 1;
      setLives(remainingLives);
      if (remainingLives <= 0) {
        setTimeout(() => setGameOver(true), 1200);
        return;
      }
    }

    setTimeout(() => {
      nextQuestion();
    }, 1400);
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

      // Points calculation
      const multiplier = Math.min(2.5, 1 + (newCombo - 1) * 0.3);
      const modeMultiplier = mode === 'daily' ? 2 : 1;
      const points = Math.round((100 * multiplier + timeLeft * 10) * modeMultiplier);
      setScore(prev => prev + points);
    } else {
      setCombo(0); // Reset combo
      if (mode === 'survival') {
        const remainingLives = lives - 1;
        setLives(remainingLives);
        if (remainingLives <= 0) {
          setTimeout(() => setGameOver(true), 1200);
          return;
        }
      }
    }

    setTimeout(() => {
      nextQuestion();
    }, 1400);
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
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <Link to="/" className="text-secondary text-decoration-none small d-flex align-items-center gap-1 mb-1">
            <FaArrowLeft /> Về trang chủ
          </Link>
          <h3 className="fw-bold mb-0 d-flex align-items-center gap-2">
            {mode === 'survival' ? '❤️ Thử Thách Sinh Tồn' : mode === 'daily' ? '🌟 Thử Thách Mỗi Ngày' : '⚡ Thử Thách Tốc Độ'}
          </h3>
          <p className="text-secondary small mb-0">{challengeData?.quizTitle}</p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className={`btn ${mode === 'speed' ? 'btn-primary' : 'btn-outline-secondary'} fw-semibold`}
              onClick={() => setMode('speed')}
            >
              ⚡ Tốc Độ
            </button>
            <button
              type="button"
              className={`btn ${mode === 'survival' ? 'btn-danger' : 'btn-outline-secondary'} fw-semibold`}
              onClick={() => setMode('survival')}
            >
              ❤️ Sinh Tồn
            </button>
            <button
              type="button"
              className={`btn ${mode === 'daily' ? 'btn-warning text-dark' : 'btn-outline-secondary'} fw-semibold`}
              onClick={() => setMode('daily')}
            >
              🌟 Hàng Ngày (2x)
            </button>
          </div>

          {/* Current Score Ticker */}
          <div className="card-custom py-1 px-3 border border-primary text-center">
            <span className="small text-secondary d-block" style={{ fontSize: '0.68rem' }}>ĐIỂM SỐ</span>
            <strong className="fs-5 text-primary fw-bold">{score}</strong>
          </div>
        </div>
      </div>

      {!gameOver && currentQ ? (
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-8">
            {/* Status Bar */}
            <div className="card-custom p-3 mb-3 border shadow-sm">
              <div className="d-flex justify-content-between align-items-center mb-2 small fw-bold">
                <div className="d-flex align-items-center gap-2">
                  <span className="text-secondary">
                    Câu {currentIdx + 1} / {challengeData.questions.length}
                  </span>
                  {mode === 'survival' && (
                    <div className="d-flex align-items-center gap-1 ms-2">
                      <span className="small text-secondary me-1">Mạng:</span>
                      {[...Array(3)].map((_, i) => (
                        <span key={i} className="fs-6">
                          {i < lives ? '❤️' : '🖤'}
                        </span>
                      ))}
                    </div>
                  )}
                  {combo >= 2 && (
                    <span className="badge bg-warning text-dark fa-bounce">
                      <FaFire className="text-danger me-1" /> x{combo}
                    </span>
                  )}
                </div>

                <span className={`d-flex align-items-center gap-1 ${timeLeft <= 5 ? 'text-danger fw-bold fa-beat' : 'text-primary'}`}>
                  <FaClock /> {timeLeft}s
                </span>
              </div>

              {/* Progress Line */}
              <div className="progress" style={{ height: '7px' }}>
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
                  {mode === 'survival' ? '❤️ 3 mạng, sai 3 lần là kết thúc' : mode === 'daily' ? '🌟 Nhân đôi điểm thưởng XP' : '⚡ 15 giây mỗi câu'}
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
            <div className="card-custom p-4 p-md-5 text-center border shadow-lg">
              <div className="mb-3">
                <div className="d-inline-flex p-3 rounded-circle bg-warning bg-opacity-10 text-warning">
                  <FaTrophy size={52} className="fa-bounce" />
                </div>
              </div>

              <h3 className="fw-bold mb-1">
                {mode === 'survival' ? 'Kết Thúc Thử Thách Sinh Tồn!' : mode === 'daily' ? 'Hoàn Thành Thử Thách Mỗi Ngày!' : 'Hoàn Thành Thử Thách Tốc Độ!'}
              </h3>
              <p className="text-secondary small mb-4">{challengeData?.quizTitle}</p>

              {/* Final Score Ring */}
              <div className="result-circle mb-3 mx-auto" style={{ width: 140, height: 140 }}>
                <div className="result-score" style={{ fontSize: '2.5rem' }}>{score}</div>
                <span className="text-secondary small fw-semibold">Điểm Thưởng</span>
              </div>

              {/* Summary Stats */}
              <div className="row g-2 mb-4 text-center">
                <div className="col-4">
                  <div className="p-2 rounded-3 bg-light border">
                    <span className="small text-secondary d-block" style={{ fontSize: '0.75rem' }}>Đúng</span>
                    <strong className="text-success fs-5">{correctCount}</strong>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 rounded-3 bg-light border">
                    <span className="small text-secondary d-block" style={{ fontSize: '0.75rem' }}>Combo Cao Nhất</span>
                    <strong className="text-warning fs-5">x{maxCombo}</strong>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 rounded-3 bg-light border">
                    <span className="small text-secondary d-block" style={{ fontSize: '0.75rem' }}>Độ Chính Xác</span>
                    <strong className="text-primary fs-5">
                      {challengeData?.questions?.length ? Math.round((correctCount / challengeData.questions.length) * 100) : 0}%
                    </strong>
                  </div>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 justify-content-center">
                <button
                  type="button"
                  className="btn btn-outline-primary px-3 py-2 fw-semibold"
                  onClick={() => loadChallenge(mode)}
                >
                  <FaRedo className="me-2" /> Chơi Lại
                </button>
                <Link to="/leaderboard" className="btn btn-primary-custom px-4 py-2 fw-bold">
                  <FaTrophy className="me-2" /> Bảng Vinh Danh
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
