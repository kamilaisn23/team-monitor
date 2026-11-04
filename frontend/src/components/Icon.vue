<script setup lang="ts">
import { computed } from "vue";
import {
  LayoutDashboard,
  Users,
  Layers3,
  GitBranch,
  ChartNoAxesCombined,
  Settings2,
  Search,
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Menu,
  SlidersHorizontal,
  LayoutGrid,
  List,
  RefreshCw,
  Download,
  Plus,
  Check,
  CircleAlert,
  Clock3,
  Zap,
  ShieldCheck,
  LogOut,
  FileText,
  Link,
  Ellipsis,
  CalendarDays,
  ExternalLink,
  Pencil,
  Trash2,
  Eye,
  CheckCheck,
  Target,
  CircleDot,
  PanelLeftClose,
  PanelLeftOpen,
  Bookmark,
  Info,
  Scale,
  BookOpen,
  Sparkles,
  NotebookPen,
  UserCheck,
  Save,
  Lock,
  TrendingUp,
  Database,
  MessageSquare,
  CheckCircle2,
} from "@lucide/vue";
const props = withDefaults(defineProps<{ name: string; size?: number }>(), {
  size: 20,
});
const icons: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  users: Users,
  teams: Layers3,
  branch: GitBranch,
  chart: ChartNoAxesCombined,
  settings: Settings2,
  search: Search,
  arrow: ArrowUpRight,
  right: ArrowRight,
  left: ArrowLeft,
  down: ChevronDown,
  previous: ChevronLeft,
  next: ChevronRight,
  close: X,
  menu: Menu,
  filter: SlidersHorizontal,
  grid: LayoutGrid,
  list: List,
  refresh: RefreshCw,
  download: Download,
  plus: Plus,
  check: Check,
  alert: CircleAlert,
  clock: Clock3,
  zap: Zap,
  shield: ShieldCheck,
  logout: LogOut,
  file: FileText,
  link: Link,
  more: Ellipsis,
  calendar: CalendarDays,
  external: ExternalLink,
  edit: Pencil,
  trash: Trash2,
  eye: Eye,
  done: CheckCheck,
  target: Target,
  dot: CircleDot,
  collapse: PanelLeftClose,
  expand: PanelLeftOpen,
  bookmark: Bookmark,
  info: Info,
  scale: Scale,
  book: BookOpen,
  sparkles: Sparkles,
  note: NotebookPen,
  usercheck: UserCheck,
  save: Save,
  lock: Lock,
  trending: TrendingUp,
  database: Database,
  message: MessageSquare,
  checkcircle: CheckCircle2,
};
const component = computed(() => icons[props.name] || LayoutDashboard);
</script>
<template>
  <svg
    v-if="name === 'github'"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.76-.24.76-.54v-2.1c-3.1.67-3.75-1.31-3.75-1.31-.5-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.12.08 1.72 1.16 1.72 1.16 1 1.71 2.62 1.22 3.26.93.1-.72.39-1.22.71-1.5-2.48-.28-5.08-1.24-5.08-5.53 0-1.22.44-2.22 1.15-3-.11-.28-.5-1.42.11-2.95 0 0 .94-.3 3.08 1.15a10.68 10.68 0 0 1 5.6 0c2.14-1.45 3.08-1.15 3.08-1.15.61 1.53.22 2.67.1 2.95a4.32 4.32 0 0 1 1.16 3c0 4.3-2.6 5.25-5.1 5.53.4.35.76 1.03.76 2.08v3.08c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z"
    /></svg
  ><component
    v-else
    :is="component"
    :size="size"
    :stroke-width="1.8"
    aria-hidden="true"
  />
</template>
