interface Props {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'span';
}

export default function GlitchText({ children, className = '', as: Tag = 'span' }: Props) {
  return (
    <Tag className={`glitch font-mono ${className}`}>
      {children}
    </Tag>
  );
}
