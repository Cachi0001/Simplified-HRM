import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/ui/Logo';

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="bg-secondary p-6 rounded-lg shadow-lg hover:shadow-highlight/20 transform hover:-translate-y-2 transition-all duration-300">
    <div className="text-highlight mb-4">{icon}</div>
    <h3 className="text-xl font-bold mb-2 text-light">{title}</h3>
    <p className="text-gray-400">{description}</p>
  </div>
);

const HomePage: React.FC = () => {
  const features = [
    {
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
      title: 'Employee Management',
      description: 'Centralize all employee information from hire to retire. Keep track of profiles, documents, and performance.',
    },
    {
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      title: 'Leave Tracking',
      description: 'Automate leave requests and approvals. Get a clear overview of employee availability at all times.',
    },
    {
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      title: 'Performance Analytics',
      description: 'Gain valuable insights with powerful analytics and reporting tools. Make data-driven decisions for your workforce.',
    },
  ];

  return (
    <div className="container mx-auto px-6 py-12">
      {/* Hero Section */}
      <section className="text-center py-20">
        <h1 className="text-5xl md:text-6xl font-extrabold text-light leading-tight">
          Modern HR Management,<br /> <span className="text-highlight">Simplified</span>
        </h1>
        <p className="mt-6 text-lg text-gray-300 max-w-2xl mx-auto">
          Go3net provides a comprehensive suite of tools to manage your workforce efficiently, from onboarding to analytics.
        </p>
        <div className="mt-8">
          <Link to="/auth" state={{ initialView: 'signup' }} className="bg-highlight text-white text-lg font-semibold px-8 py-3 rounded-md hover:bg-blue-600 transition-colors transform hover:scale-105">
            Get Started For Free
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <h2 className="text-4xl font-bold text-center mb-12 text-light">Why Choose Go3net?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-secondary/30 rounded-lg">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <Logo className="h-16 w-auto mx-auto mb-4" />
            <h2 className="text-4xl font-bold text-light mb-4">Get In Touch</h2>
            <p className="text-gray-300 text-lg">Ready to transform your HR management? Contact us today.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Phone */}
            <div className="bg-secondary p-6 rounded-lg">
              <div className="text-highlight mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-light mb-2">Phone</h3>
              <a href="tel:+2348137367161" className="text-highlight hover:underline text-lg">
                +234 813 736 7161
              </a>
            </div>

            {/* Location */}
            <div className="bg-secondary p-6 rounded-lg">
              <div className="text-highlight mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-light mb-2">Location</h3>
              <p className="text-gray-300">
                5, Francis Aghedu Close<br />
                Berger, Lagos
              </p>
            </div>

            {/* Email */}
            <div className="bg-secondary p-6 rounded-lg">
              <div className="text-highlight mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-light mb-2">Email</h3>
              <a href="mailto:contact@gonet.com" className="text-highlight hover:underline">
                contact@gonet.com
              </a>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-400 mb-4">Or reach out to us directly</p>
            <Link
              to="/auth"
              className="bg-highlight text-white text-lg font-semibold px-8 py-3 rounded-md hover:bg-blue-600 transition-colors inline-block"
            >
              Start Your Journey
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;