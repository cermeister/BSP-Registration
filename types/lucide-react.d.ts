declare module "lucide-react" {
  export type LucideIcon = React.ComponentType<{
    size?: number | string;
    color?: string;
    strokeWidth?: number;
    className?: string;
    [key: string]: unknown;
  }>;

  export const BarChart3: LucideIcon;
  export const LogOut: LucideIcon;
  export const Plus: LucideIcon;
  export const Search: LucideIcon;
  export const Settings: LucideIcon;
  export const Users: LucideIcon;
  export const ClipboardList: LucideIcon;
}
