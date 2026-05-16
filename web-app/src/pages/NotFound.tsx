import React from 'react';
import { useNavigate } from 'react-router-dom';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6">
      <div className="space-y-2">
        <h1 className="text-8xl font-extrabold tracking-tighter text-primary">404</h1>
        <h2 className="text-3xl font-semibold tracking-tight">Page Not Found</h2>
        <p className="text-muted-foreground max-w-[500px] mx-auto">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
      </div>
      <button 
        onClick={() => navigate(-1)}
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        Go Back
      </button>
    </div>
  );
};
