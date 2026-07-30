import { MessageSquare } from "lucide-react";
import ChatInterface from "@/components/chat/chat-interface";

export default function ChatPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Ask AI</h1>
          <p className="text-sm text-muted-foreground">
            Ask questions about India&apos;s global development indicators
          </p>
        </div>
      </div>
      <ChatInterface />
    </main>
  );
}
