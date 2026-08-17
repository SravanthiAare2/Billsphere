import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline';
};

export default function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-full font-semibold';
  const variants: Record<string, string> = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    outline: 'border border-gray-200 bg-transparent text-gray-800',
  };
  const classes = [base, variants[variant], className].filter(Boolean).join(' ');
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
