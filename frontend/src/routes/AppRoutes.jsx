import { Navigate, Route, Routes } from 'react-router'
import AdminPanelLayout from '../layouts/AdminPanelLayout.jsx'
import AuthLayout from '../layouts/AuthLayout.jsx'
import CookPanelLayout from '../layouts/CookPanelLayout.jsx'
import MainLayout from '../layouts/MainLayout.jsx'
import ModeratorPanelLayout from '../layouts/ModeratorPanelLayout.jsx'
import AdminCatalogsPage from '../pages/AdminCatalogsPage.jsx'
import AdminRecipesPage from '../pages/AdminRecipesPage.jsx'
import AdminUserDetailPage from '../pages/AdminUserDetailPage.jsx'
import AdminUsersPage from '../pages/AdminUsersPage.jsx'
import AuthorProfilePage from '../pages/AuthorProfilePage.jsx'
import AuthorsPage from '../pages/AuthorsPage.jsx'
import CookRecipePage from '../pages/CookRecipePage.jsx'
import CookRecipesPage from '../pages/CookRecipesPage.jsx'
import FavoritesPage from '../pages/FavoritesPage.jsx'
import ForgotPasswordPage from '../pages/ForgotPasswordPage.jsx'
import HomePage from '../pages/HomePage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import ModerationRecipeDetailPage from '../pages/ModerationRecipeDetailPage.jsx'
import ModerationRecipesPage from '../pages/ModerationRecipesPage.jsx'
import ModerationReportDetailPage from '../pages/ModerationReportDetailPage.jsx'
import ModerationReportsPage from '../pages/ModerationReportsPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import ProfilePage from '../pages/ProfilePage.jsx'
import RecipeDetailPage from '../pages/RecipeDetailPage.jsx'
import RecipesPage from '../pages/RecipesPage.jsx'
import RegisterPage from '../pages/RegisterPage.jsx'
import ResetPasswordPage from '../pages/ResetPasswordPage.jsx'
import TraditionsPage from '../pages/TraditionsPage.jsx'

export default function AppRoutes({ readResetFlow }) {
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
      <Route path="cocinero" element={<CookPanelLayout />}>
        <Route index element={<Navigate to="recetas" replace />} />
        <Route path="recetas" element={<CookRecipesPage />} />
        <Route path="recetas/nueva" element={<CookRecipePage mode="create" />} />
        <Route path="recetas/:id/editar" element={<CookRecipePage mode="edit" />} />
        <Route path="recetas/:id/vista-previa" element={<CookRecipePage mode="preview" />} />
      </Route>
      <Route path="moderador" element={<ModeratorPanelLayout />}>
        <Route index element={<Navigate to="recetas" replace />} />
        <Route path="recetas" element={<ModerationRecipesPage />} />
        <Route path="recetas/:id" element={<ModerationRecipeDetailPage />} />
        <Route path="reportes" element={<ModerationReportsPage />} />
        <Route path="reportes/:id" element={<ModerationReportDetailPage />} />
      </Route>
      <Route path="admin" element={<AdminPanelLayout />}>
        <Route index element={<Navigate to="usuarios" replace />} />
        <Route path="usuarios" element={<AdminUsersPage />} />
        <Route path="usuarios/:id" element={<AdminUserDetailPage />} />
        <Route path="catalogos" element={<AdminCatalogsPage />} />
        <Route path="recetas" element={<AdminRecipesPage />} />
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="registro" element={<RegisterPage />} />
        <Route path="recuperar-contrasena" element={<ForgotPasswordPage />} />
        <Route path="restablecer-contrasena" element={<ResetPasswordPage readResetFlow={readResetFlow} />} />
      </Route>
    </Routes>
  )
}
