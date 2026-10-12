import { Icon } from "@/components/ui/icon";

export function Logo() {
  return (
    <div className="tm-logo flex items-center gap-3">
      <div className="tm-logo-mark">
        <Icon name="activity" width={23} height={23} />
      </div>
      <div>
        <span className="tm-logo-title">
          Team Monitor<span className="text-primary">.</span>
        </span>
        <span className="tm-logo-subtitle">ENGINEERING WORKSPACE</span>
      </div>
    </div>
  );
}
