/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import Layout from './components/Layout';
import Home from './pages/Home';
import PageLoadingFallback from './components/PageLoadingFallback';

// Lazy load non-critical / secondary routes
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const CheckoutCallback = lazy(() => import('./pages/CheckoutCallback'));
const WishlistPage = lazy(() => import('./pages/Wishlist'));
const Profile = lazy(() => import('./pages/Profile'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForcedPasswordChange = lazy(() => import('./pages/ForcedPasswordChange'));
const Compare = lazy(() => import('./pages/Compare'));

// Static pages lazy
const About = lazy(() => import('./pages/static/About'));
const Contact = lazy(() => import('./pages/static/Contact'));
const Terms = lazy(() => import('./pages/static/Terms'));
const Privacy = lazy(() => import('./pages/static/Privacy'));
const FAQPage = lazy(() => import('./pages/static/FAQPage'));
const Blog = lazy(() => import('./pages/static/Blog'));
const Offers = lazy(() => import('./pages/static/Offers'));
const NewProducts = lazy(() => import('./pages/static/NewProducts'));
const Brands = lazy(() => import('./pages/static/Brands'));
const NotFound = lazy(() => import('./pages/static/NotFound'));

// Admin pages lazy
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminCoupons = lazy(() => import('./pages/admin/Coupons'));
const AdminMessages = lazy(() => import('./pages/admin/Messages'));
const AdminReviews = lazy(() => import('./pages/admin/Reviews'));
const AdminNewsletter = lazy(() => import('./pages/admin/Newsletter'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));

import { ToastProvider } from './contexts/ToastContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { CompareProvider } from './contexts/CompareContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <CompareProvider>
                <WishlistProvider>
                <BrowserRouter>
                  <ScrollToTop />
                  <Suspense fallback={<PageLoadingFallback />}>
                    <Routes>
                      <Route path="/" element={<Layout />}>
                        <Route index element={<Home />} />
                        <Route path="products" element={<Products />} />
                        <Route path="products/:id" element={<ProductDetail />} />
                        {/* Singular alias: ProductCard / HeaderSearch link to /product/:id */}
                        <Route path="product/:id" element={<ProductDetail />} />
                        <Route path="cart" element={<Cart />} />
                        <Route path="checkout" element={<Checkout />} />
                        <Route path="checkout/callback" element={<CheckoutCallback />} />
                        <Route path="wishlist" element={<WishlistPage />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="login" element={<Login />} />
                        <Route path="register" element={<Register />} />
                        <Route path="force-change-password" element={<ForcedPasswordChange />} />
                        <Route path="compare" element={<Compare />} />
                        
                        <Route path="about" element={<About />} />
                        <Route path="contact" element={<Contact />} />
                        <Route path="terms" element={<Terms />} />
                        <Route path="privacy" element={<Privacy />} />
                        <Route path="faq" element={<FAQPage />} />
                        <Route path="blog" element={<Blog />} />
                        <Route path="blog/:slug" element={<Blog />} />
                        <Route path="offers" element={<Offers />} />
                        <Route path="new-products" element={<NewProducts />} />
                        <Route path="brands" element={<Brands />} />
                        <Route path="*" element={<NotFound />} />
                      </Route>
                      <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<Dashboard />} />
                        <Route path="products" element={<AdminProducts />} />
                        <Route path="orders" element={<AdminOrders />} />
                        <Route path="reviews" element={<AdminReviews />} />
                        <Route path="users" element={<AdminUsers />} />
                        <Route path="coupons" element={<AdminCoupons />} />
                        <Route path="messages" element={<AdminMessages />} />
                        <Route path="newsletter" element={<AdminNewsletter />} />
                        <Route path="settings" element={<AdminSettings />} />
                      </Route>
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </WishlistProvider>
            </CompareProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </ErrorBoundary>
  );
}
