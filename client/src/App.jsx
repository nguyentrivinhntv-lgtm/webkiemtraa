import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import QuizPage from './pages/QuizPage';
import ResultPage from './pages/ResultPage';
import ReviewPage from './pages/ReviewPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import FlashcardPage from './pages/FlashcardPage';
import BookmarksPage from './pages/BookmarksPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import TeacherDashboardPage from './pages/TeacherDashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="app-wrapper">
            <Navbar />
            <main className="main-content">
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
                <Route path="/quiz/:id" element={<QuizPage />} />
                <Route path="/review/:id" element={<ReviewPage />} />
                <Route path="/flashcards/:id" element={<FlashcardPage />} />
                <Route path="/bookmarks" element={<BookmarksPage />} />
                <Route path="/result" element={<ResultPage />} />
              </Routes>
            </main>
            <ToastContainer position="top-right" autoClose={3000} />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
