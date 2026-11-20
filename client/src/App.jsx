import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './App.css';

// Lazy-loaded pages to reduce initial bundle size and speed up page load
const HomePage = lazy(() => import('./pages/HomePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const QuizPage = lazy(() => import('./pages/QuizPage'));
const ResultPage = lazy(() => import('./pages/ResultPage'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const FlashcardPage = lazy(() => import('./pages/FlashcardPage'));
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'));
const StudentDashboardPage = lazy(() => import('./pages/StudentDashboardPage'));
const TeacherDashboardPage = lazy(() => import('./pages/TeacherDashboardPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const ChallengePage = lazy(() => import('./pages/ChallengePage'));
const ClassroomPage = lazy(() => import('./pages/ClassroomPage'));

function PageLoader() {
  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <div className="spinner-custom"></div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="app-wrapper">
            <PWAInstallPrompt />
            <Navbar />
            <main className="main-content">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route
                    path="/teacher"
                    element={
                      <ProtectedRoute requireTeacher={true}>
                        <TeacherDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/dashboard" element={<StudentDashboardPage />} />
                  <Route path="/classroom" element={<ClassroomPage />} />
                  <Route path="/quiz/:id" element={<QuizPage />} />
                  <Route path="/review/:id" element={<ReviewPage />} />
                  <Route path="/flashcards/:id" element={<FlashcardPage />} />
                  <Route path="/bookmarks" element={<BookmarksPage />} />
                  <Route path="/leaderboard" element={<LeaderboardPage />} />
                  <Route path="/challenge/:id" element={<ChallengePage />} />
                  <Route path="/result" element={<ResultPage />} />
                </Routes>
              </Suspense>
            </main>
            <ToastContainer position="top-right" autoClose={3000} />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
