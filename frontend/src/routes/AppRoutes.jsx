import { Route, Routes } from 'react-router'
import AuthLayout from '../layouts/AuthLayout.jsx'
import MainLayout from '../layouts/MainLayout.jsx'
import AuthorProfilePage from '../pages/AuthorProfilePage.jsx'
import AuthorsPage from '../pages/AuthorsPage.jsx'
import FavoritesPage from '../pages/FavoritesPage.jsx'
import ForgotPasswordPage from '../pages/ForgotPasswordPage.jsx'
import HomePage from '../pages/HomePage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import ProfilePage from '../pages/ProfilePage.jsx'
import RecipeDetailPage from '../pages/RecipeDetailPage.jsx'
import RecipesPage from '../pages/RecipesPage.jsx'
import RegisterPage from '../pages/RegisterPage.jsx'
import TraditionsPage from '../pages/TraditionsPage.jsx'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="recetas" element={<RecipesPage />} />
        <Route path="recetas/:id" element={<RecipeDetailPage />} />
        <Route path="tradiciones" element={<TraditionsPage />} />
        <Route path="perfil" element={<ProfilePage />} />
        <Route path="autores" element={<AuthorsPage />} />
        <Route path="autores/:id" element={<AuthorProfilePage />} />
        <Route path="favoritos" element={<FavoritesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="registro" element={<RegisterPage />} />
        <Route path="recuperar-contrasena" element={<ForgotPasswordPage />} />
      </Route>
    </Routes>
  )
}
