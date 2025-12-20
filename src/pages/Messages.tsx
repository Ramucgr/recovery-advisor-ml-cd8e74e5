import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Mail, MailOpen, Send, Reply, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO } from "date-fns";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_profile?: { full_name: string; email: string } | null;
  recipient_profile?: { full_name: string; email: string } | null;
}

export default function Messages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [filter, setFilter] = useState<"inbox" | "sent">("inbox");

  const [formData, setFormData] = useState({
    recipient_id: "",
    subject: "",
    content: "",
  });

  const loadMessages = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading messages:", error);
    } else {
      setMessages(data || []);
    }
  }, [user?.id]);

  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("id, full_name, email");
    setProfiles(data || []);
  };

  useEffect(() => {
    loadMessages();
    loadProfiles();
  }, [loadMessages]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as Message;
          if (newMessage.sender_id === user.id || newMessage.recipient_id === user.id) {
            setMessages((prev) => [newMessage, ...prev]);
            if (newMessage.recipient_id === user.id) {
              toast.info("New message received");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error("You must be logged in");
      return;
    }

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: formData.recipient_id,
      subject: formData.subject || null,
      content: formData.content,
    });

    if (error) {
      toast.error(`Failed to send message: ${error.message}`);
    } else {
      toast.success("Message sent");
      setIsOpen(false);
      loadMessages();
      setFormData({ recipient_id: "", subject: "", content: "" });
    }
  };

  const markAsRead = async (messageId: string) => {
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("id", messageId);
    loadMessages();
  };

  const getProfile = (id: string) => {
    return profiles.find((p) => p.id === id);
  };

  const filteredMessages = messages.filter((msg) => {
    if (filter === "inbox") return msg.recipient_id === user?.id;
    return msg.sender_id === user?.id;
  });

  const handleMessageClick = (msg: Message) => {
    setSelectedMessage(msg);
    if (!msg.is_read && msg.recipient_id === user?.id) {
      markAsRead(msg.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Messages</h1>
          <p className="text-muted-foreground">Communicate with athletes and team members</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Compose Message</DialogTitle>
              <DialogDescription>Send a message to a team member</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Recipient</Label>
                <Select value={formData.recipient_id} onValueChange={(v) => setFormData({ ...formData, recipient_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select recipient" /></SelectTrigger>
                  <SelectContent>
                    {profiles
                      .filter((p) => p.id !== user?.id)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.full_name} ({p.email})</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={5} required />
              </div>
              <Button type="submit" className="w-full gap-2">
                <Send className="h-4 w-4" />
                Send Message
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Message List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex gap-2">
              <Button
                variant={filter === "inbox" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setFilter("inbox")}
              >
                Inbox
              </Button>
              <Button
                variant={filter === "sent" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setFilter("sent")}
              >
                Sent
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {filteredMessages.length === 0 ? (
                <p className="text-muted-foreground text-sm p-4">No messages</p>
              ) : (
                <div className="divide-y divide-border">
                  {filteredMessages.map((msg) => {
                    const otherUserId = filter === "inbox" ? msg.sender_id : msg.recipient_id;
                    const otherProfile = getProfile(otherUserId);
                    
                    return (
                      <div
                        key={msg.id}
                        className={`p-4 cursor-pointer hover:bg-accent/50 ${selectedMessage?.id === msg.id ? "bg-accent" : ""} ${!msg.is_read && filter === "inbox" ? "bg-primary/5" : ""}`}
                        onClick={() => handleMessageClick(msg)}
                      >
                        <div className="flex items-start gap-3">
                          {!msg.is_read && filter === "inbox" ? (
                            <Mail className="h-4 w-4 text-primary mt-1" />
                          ) : (
                            <MailOpen className="h-4 w-4 text-muted-foreground mt-1" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium truncate">
                                {otherProfile?.full_name || "Unknown User"}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(msg.created_at), "MMM d")}
                              </span>
                            </div>
                            {msg.subject && (
                              <p className="text-sm text-foreground truncate">{msg.subject}</p>
                            )}
                            <p className="text-xs text-muted-foreground truncate">{msg.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Detail */}
        <Card className="lg:col-span-2">
          {selectedMessage ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedMessage.subject || "No Subject"}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <User className="h-3 w-3" />
                      {filter === "inbox" ? "From: " : "To: "}
                      {getProfile(filter === "inbox" ? selectedMessage.sender_id : selectedMessage.recipient_id)?.full_name || "Unknown"}
                    </CardDescription>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(parseISO(selectedMessage.created_at), "PPp")}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                </div>
                {filter === "inbox" && (
                  <div className="mt-6">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFormData({
                          recipient_id: selectedMessage.sender_id,
                          subject: `Re: ${selectedMessage.subject || ""}`,
                          content: "",
                        });
                        setIsOpen(true);
                      }}
                      className="gap-2"
                    >
                      <Reply className="h-4 w-4" />
                      Reply
                    </Button>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-[400px]">
              <p className="text-muted-foreground">Select a message to view</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}