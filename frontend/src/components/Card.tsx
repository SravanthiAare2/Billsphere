import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

function Card({ children, className = "" }: CardProps) {
  return <div className={`panel rounded-[24px] p-6 ${className}`}>{children}</div>;
}

export default Card;
