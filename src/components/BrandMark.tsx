export default function BrandMark({ className = '' }: { className?: string }) {
  return <img className={className} src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" aria-hidden="true" width={36} height={36} />;
}
