type BrandMarkProps = {
  size?: number;
  className?: string;
};

export function BrandMark({ size = 36, className }: BrandMarkProps) {
  return (
    <img
      src="/lovelydent-icon.png"
      alt="LovelyDent"
      width={size}
      height={size}
      className={className ?? "ws-brand-icon"}
    />
  );
}
