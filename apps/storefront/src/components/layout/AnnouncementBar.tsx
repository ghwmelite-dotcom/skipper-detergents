const MESSAGES = [
  'Free delivery on orders over GHS 200',
  'Same-day Accra dispatch before 12 PM',
  'Paystack-secured checkout · Card · Mobile Money',
];

export function AnnouncementBar() {
  return (
    <div
      role="banner"
      className="relative overflow-hidden bg-brand-navy text-brand-ivory text-[11px] md:text-[12px] py-[7px]"
    >
      <div className="hidden md:block container">
        <div className="flex items-center justify-center gap-6 tracking-wide">
          {MESSAGES.map((msg, i) => (
            <span key={i} className="inline-flex items-center gap-6 text-brand-ivory/85">
              {i > 0 && <span className="h-1 w-1 rounded-full bg-brand-cyan/70" aria-hidden="true" />}
              <span>{msg}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="md:hidden">
        <div className="flex w-max animate-marquee items-center gap-10 whitespace-nowrap px-6 tracking-wide">
          {[...MESSAGES, ...MESSAGES].map((msg, i) => (
            <span key={i} className="inline-flex items-center gap-10 text-brand-ivory/85">
              <span>{msg}</span>
              <span className="h-1 w-1 rounded-full bg-brand-cyan/70" aria-hidden="true" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
