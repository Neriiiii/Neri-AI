import { useState } from "react";
import {
  Plus,
  Trash2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import girlWithLaptop from "@/assets/girl-with-laptop.png";
import { useAuth } from "@/context/AuthContext";
import type { Conversation } from "@/types";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  nav: "chat" | "settings";
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onNavChange: (nav: "chat" | "settings") => void;
  onLogout: () => void;
}

export function Sidebar({
  conversations,
  activeId,
  nav,
  onSelect,
  onNew,
  onDelete,
  onNavChange,
  onLogout,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const { username } = useAuth();

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-3 gap-2 w-12 border-r border-border bg-sidebar shrink-0 h-full">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCollapsed(false)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNew}>
          <Plus className="h-4 w-4" />
        </Button>
        <Separator />
        {conversations.slice(0, 6).map((c) => (
          <Button
            key={c.id}
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              c.id === activeId && nav === "chat" && "bg-accent",
            )}
            onClick={() => {
              onSelect(c.id);
              onNavChange("chat");
            }}
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
        ))}
        <div className="flex-1" />
        <Separator />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", nav === "settings" && "bg-accent")}
              onClick={() => onNavChange("settings")}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Settings</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Logout</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // Group conversations by date
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: Record<string, Conversation[]> = {};
  for (const c of conversations) {
    const d = new Date(c.updatedAt).toDateString();
    const label =
      d === today ? "Today" : d === yesterday ? "Yesterday" : "Earlier";
    (groups[label] ??= []).push(c);
  }

  return (
    <>
      <div className="flex flex-col w-64 border-r border-border bg-sidebar shrink-0 h-full">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-3 shrink-0">
          <span className="text-sm font-semibold flex-1 flex items-center gap-1.5">
            <img
              src={girlWithLaptop}
              alt=""
              className="h-5 w-5 rounded-full object-cover"
            />
            Local AI
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCollapsed(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-2 pb-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 h-8 text-xs"
            onClick={onNew}
          >
            <Plus className="h-3.5 w-3.5" /> New chat
          </Button>
        </div>

        <Separator />

        {/* Conversation list */}
        <ScrollArea className="flex-1 px-2 py-2">
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6 px-2">
              No conversations yet.
              <br />
              Start chatting to save history.
            </p>
          )}

          {(["Today", "Yesterday", "Earlier"] as const).map((label) => {
            const items = groups[label];
            if (!items?.length) return null;
            return (
              <div key={label} className="mb-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-1">
                  {label}
                </p>
                <div className="space-y-0.5">
                  {items.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        "group flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer hover:bg-accent transition-colors",
                        conv.id === activeId && nav === "chat" && "bg-accent",
                      )}
                      onClick={() => {
                        onSelect(conv.id);
                        onNavChange("chat");
                      }}
                    >
                      <div className="flex-1 w-0 min-w-0">
                        <p className="text-xs truncate">{conv.title}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(conv);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </ScrollArea>

        <Separator />

        {/* Username display */}
        <div className="px-3 py-2 flex items-center gap-2 shrink-0">
          <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-xs font-medium truncate text-muted-foreground">
            {username}
          </span>
        </div>

        {/* Settings nav item */}
        <div className="px-2 py-1.5 shrink-0">
          <button
            onClick={() => onNavChange("settings")}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-xs font-medium transition-colors hover:bg-accent",
              nav === "settings" && "bg-accent text-foreground",
              nav !== "settings" && "text-muted-foreground",
            )}
          >
            <Settings className="h-3.5 w-3.5 shrink-0" />
            <span>Settings</span>
          </button>
        </div>

        {/* Bottom: logout */}
        <div className="px-2 py-1.5 shrink-0">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Delete   confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete conversation?</DialogTitle>
            <DialogDescription>
              "{deleteTarget?.title}" will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDelete(deleteTarget!.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
