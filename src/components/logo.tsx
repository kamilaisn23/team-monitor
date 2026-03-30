export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm">
        TM
      </div>
      <span className="text-lg font-bold text-dark dark:text-white">Team Monitor</span>
    </div>
  );
}
