import React from 'react';
import { Link } from 'react-router-dom';

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
          GoNet provides a comprehensive suite of tools to manage your workforce efficiently, from onboarding to analytics.
        </p>
        <div className="mt-8">
          <Link to="/auth" state={{ initialView: 'signup' }} className="bg-highlight text-white text-lg font-semibold px-8 py-3 rounded-md hover:bg-blue-600 transition-colors transform hover:scale-105">
            Get Started For Free
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <h2 className="text-4xl font-bold text-center mb-12 text-light">Why Choose GoNet?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;