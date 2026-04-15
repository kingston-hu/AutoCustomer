"use client";

import { BellRing, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function Header() {
  return (
    <header className="flex items-center justify-between h-16 px-6 border-b bg-card/60 backdrop-blur-xl sticky top-0 z-30">
      {/* Left: Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
        <Input
          placeholder="搜索开发者、线索、活动..."
          className="pl-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-lg h-9 text-sm"
        />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 ml-4">
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <BellRing className="w-[18px] h-[18px]" />
          <Badge
            variant="destructive"
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center p-0 text-[10px] rounded-full shadow-sm"
          >
            3
          </Badge>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className="h-8 w-8 cursor-pointer rounded-lg hover:bg-accent transition-colors">
              <AvatarFallback className="bg-gradient-to-br from-violet-500 via-indigo-500 to-purple-500 text-white text-xs font-bold shadow-sm shadow-violet-500/20">
                K
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-semibold">Kingston</span>
                <span className="text-xs text-muted-foreground font-normal mt-0.5">
                  kingston@example.com
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              个人资料
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">设置</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10">
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
