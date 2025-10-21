import React from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import Logo from '../ui/Logo';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
  };

  return (
    <header className="bg-secondary/50 backdrop-blur-sm sticky top-0 z-50">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-white">
          <Logo className="h-10 w-auto" />
        </Link>
        <div className="hidden md:flex items-center space-x-8">
          <NavLink to="/" className={({ isActive }) => `hover:text-highlight transition-colors ${isActive ? 'text-highlight' : 'text-light'}`}>Home</NavLink>
          <button onClick={() => scrollToSection('features')} className="hover:text-highlight transition-colors text-light">Features</button>
          <button onClick={() => scrollToSection('contact')} className="hover:text-highlight transition-colors text-light">Contact</button>
        </div>
        <div className="flex items-center space-x-4">
          <Link to="/auth" state={{ initialView: 'login' }} className="text-light hover:text-highlight transition-colors">Login</Link>
          <Link to="/auth" state={{ initialView: 'signup' }} className="bg-highlight text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors">
            Sign Up
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default Header;