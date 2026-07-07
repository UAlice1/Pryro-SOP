"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { timeAgo } from "@/lib/utils";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null };
  replies: Comment[];
}

export function SOPComments({ sopId, comments: init, onRefresh }: { sopId: string; comments: Comment[]; onRefresh: () => void }) {
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/sops/${sopId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) { setContent(""); onRefresh(); toast.success("Comment posted"); }
      else toast.error("Failed to post comment");
    } finally { setPosting(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handlePost} disabled={posting || !content.trim()}>
              <Send className="w-3.5 h-3.5 mr-1.5" /> Post Comment
            </Button>
          </div>
        </CardContent>
      </Card>

      {init.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No comments yet. Be the first to comment.</p>
      ) : (
        <div className="space-y-3">
          {init.map((comment) => (
            <Card key={comment.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarImage src={comment.author.image ?? ""} />
                    <AvatarFallback className="text-xs">{comment.author.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{comment.author.name}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
