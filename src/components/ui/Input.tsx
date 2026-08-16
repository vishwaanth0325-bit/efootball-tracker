import React from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  id: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Input: React.FC<InputProps> = ({ label, id, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label htmlFor={id} className="form-label">{label}</label>}
      <input
        id={id}
        className={`form-input ${className}`}
        {...props}
      />
    </div>
  );
};
