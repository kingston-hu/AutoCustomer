"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Target,
  Mail,
  Megaphone,
  Brain,
  Workflow,
  Settings,
  ChevronLeft,
  ChevronRight,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";

const navGroups = [
  {
    label: "总览",
    items: [{ name: "仪表盘", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "获客",
    items: [
      { name: "开发者招募", href: "/developers", icon: Users },
      { name: "客户线索", href: "/leads", icon: Target },
    ],
  },
  {
    label: "运营",
    items: [
      { name: "营销活动", href: "/campaigns", icon: Megaphone },
      { name: "外联触达", href: "/outreach", icon: Mail },
      { name: "发信记录", href: "/mail-logs", icon: Mail },
    ],
  },
  {
    label: "智能",
    items: [
      { name: "AI 工作台", href: "/ai", icon: Brain },
      { name: "自动化", href: "/workflows", icon: Workflow },
    ],
  },
  {
    label: "系统",
    items: [{ name: "设置", href: "/settings", icon: Settings }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex flex-col border-r bg-card/80 backdrop-blur-xl transition-all duration-300 ease-in-out relative",
          collapsed ? "w-[68px]" : "w-[260px]"
        )}
      >
        {/* Logo — 品牌渐变 */}
        <div className="flex items-center gap-2.5 px-4 h-16 border-b bg-gradient-to-r from-violet-500/5 via-indigo-500/5 to-purple-500/5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-600 text-white font-bold shrink-0 shadow-md shadow-violet-500/25">
            <Rocket className="w-4.5 h-4.5" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg tracking-tight gradient-text whitespace-nowrap">
              AutoCustomer
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-2 px-3 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  if (collapsed) {
                    return (
                      <Tooltip key={item.name}>
                        <TooltipTrigger>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all duration-200",
                              isActive
                                ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-xl"
                            )}
                          >
                            <Icon className="w-[18px] h-[18px]" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-gradient-to-r from-violet-600/10 to-indigo-600/10 text-primary border border-primary/20"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-transparent"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-[18px] h-[18px] shrink-0",
                          isActive && "text-primary"
                        )}
                      />
                      <span className="truncate">{item.name}</span>
                      {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="border-t p-3 space-y-1">
          {/* Theme toggle */}
          <div className={cn("flex", collapsed ? "justify-center" : "")}>
            <ThemeToggle />
          </div>

          {/* Collapse Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "w-full text-muted-foreground hover:text-foreground transition-colors",
              !collapsed && "justify-start"
            )}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="ml-1">收起侧栏</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
