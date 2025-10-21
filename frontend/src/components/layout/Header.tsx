import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import Logo from '../ui/Logo';
import { Menu, X } from 'lucide-react';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (sectionId: string) => {
    // If we're not on the homepage, navigate there first
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: sectionId } });
    } else {
      // If we're already on homepage, just scroll
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setIsMobileMenuOpen(false); // Close mobile menu after navigation
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  // Hide header on dashboard pages
  if (location.pathname === '/dashboard' || location.pathname === '/employee-dashboard') {
    return null;
  }

  return (
    <header className="bg-secondary/50 backdrop-blur-sm sticky top-0 z-50">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-white">
          <Logo className="h-10 w-auto" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <NavLink to="/" className={({ isActive }) => `hover:text-highlight transition-colors ${isActive ? 'text-highlight' : 'text-light'}`}>Home</NavLink>
          <button onClick={() => scrollToSection('features')} className="hover:text-highlight transition-colors text-light">Features</button>
          <button onClick={() => scrollToSection('contact')} className="hover:text-highlight transition-colors text-light">Contact</button>
        </div>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center space-x-4">
          <Link to="/auth" state={{ initialView: 'login' }} className="text-light hover:text-highlight transition-colors">Login</Link>
          <Link to="/auth" state={{ initialView: 'signup' }} className="bg-highlight text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors">
            Sign Up
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden text-light hover:text-highlight transition-colors p-2"
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </nav>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div ref={menuRef} className="md:hidden bg-secondary/90 backdrop-blur-sm border-t border-accent/20">
          <div className="container mx-auto px-6 py-4 space-y-4">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `block py-2 hover:text-highlight transition-colors ${isActive ? 'text-highlight' : 'text-light'}`
              }
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </NavLink>
            <button
              onClick={() => scrollToSection('features')}
              className="block w-full text-left py-2 hover:text-highlight transition-colors text-light"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="block w-full text-left py-2 hover:text-highlight transition-colors text-light"
            >
              Contact
            </button>

            {/* Mobile Auth Buttons */}
            <div className="pt-4 border-t border-accent/20 space-y-3">
              <Link
                to="/auth"
                state={{ initialView: 'login' }}
                className="block w-full text-center py-2 px-4 border border-accent text-light hover:text-highlight hover:border-highlight transition-colors rounded-md"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/auth"
                state={{ initialView: 'signup' }}
                className="block w-full text-center py-2 px-4 bg-highlight text-white hover:bg-blue-600 transition-colors rounded-md"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;