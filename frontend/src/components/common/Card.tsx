import React from 'react';

type Props = {
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export default function Card({ title, children, className = '' }: Props) {
  return (
    <div className={`panel panel-soft rounded-[20px] p-4 sm:p-6 ${className}`}>
      {title ? <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold">{title}</h3></div> : null}
      <div>{children}</div>
    </div>
  );
}
