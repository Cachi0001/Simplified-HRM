
import React from 'react';
import Logo from '../ui/Logo';

const Footer: React.FC = () => {
  return (
    <footer id="contact" className="bg-secondary border-t border-accent/20">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col items-center text-center">
          <Logo className="h-12" />
          <p className="max-w-md mx-auto mt-4 text-gray-400">
            Go3net HR Management: Streamlining your HR processes with cutting-edge technology.
          </p>
          <div className="flex justify-center mt-6">
            <a href="#" className="mx-3 text-light hover:text-highlight" aria-label="Facebook">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.03998C6.48 2.03998 2 6.51998 2 12.04C2 17.56 6.48 22.04 12 22.04C17.52 22.04 22 17.56 22 12.04C22 6.51998 17.52 2.03998 12 2.03998ZM15.5 12.04H13.5V18.04H10.5V12.04H8.5V9.03998H10.5V7.03998C10.5 5.03998 11.5 4.03998 13.5 4.03998H15.5V7.03998H14.5C14.25 7.03998 14 7.28998 14 7.53998L13.99 8.03998H15.5L15 11.04H13.5V12.04H15.5Z" /></svg>
            </a>
            {/* Add more social icons as needed */}
          </div>
        </div>
        <hr className="my-6 border-accent/20" />
        <div className="text-center">
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} Go3net. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
