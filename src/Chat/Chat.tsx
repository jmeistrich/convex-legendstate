"use client";

import { Message } from "@/Chat/Message";
import { MessageList } from "@/Chat/MessageList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { syncedConvex } from "@/lib/convex";
import { observable } from "@legendapp/state";
import { observer, useObservable } from "@legendapp/state/react";
import { configureSynced } from "@legendapp/state/sync";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { ConvexClient } from "convex/browser";
import { FormEvent, useState } from "react";
import { api } from "../../convex/_generated/api";
import { v4 as uuidv4 } from "uuid";
import { useConvex } from "convex/react";

const generateId = () => uuidv4();

const sync = configureSynced(syncedConvex, {
  persist: {
    plugin: ObservablePersistLocalStorage,
    retrySync: true,
  },
  onError: (error) => {
    console.error("Sync error", error);
  },
});

// Observable in JS
const convex = new ConvexClient(import.meta.env.VITE_CONVEX_URL as string);
const obs$ = observable(() =>
  sync({
    convex,
    query: api.messages.list,
    create: api.messages.create,
    update: api.messages.update,
    persist: {
      name: "convexLS1",
    },
  }),
);

export const Chat = observer(function Chat({ viewer }: { viewer: string }) {
  const [newMessageText, setNewMessageText] = useState("");
  const convexClient = useConvex();
  const obs2$ = useObservable(() =>
    sync({
      convex: convexClient,
      query: api.messages.list,
      queryArgs: {}, // Optional
      create: api.messages.create,
      update: api.messages.update,
      delete: api.messages.remove,
      persist: {
        name: "convexLS2",
      },
      syncMode: "auto",
    }),
  );

  const messages = Object.values(obs$.get() || {});
  const messages2 = Object.values(obs2$.get() || {});
  messages2.sort((a, b) => b.localCreatedAt - a.localCreatedAt);
  console.log("messages", messages, messages2);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNewMessageText("");
    const localId = generateId();
    obs2$[localId].assign({
      localId,
      localCreatedAt: Date.now(),
      body: newMessageText,
      author: viewer,
    });
  };

  return (
    <>
      <MessageList messages={messages2}>
        {messages2?.map((message) => (
          <Message
            key={message.localId}
            author={message.author}
            viewer={viewer}
          >
            {message.body}
          </Message>
        ))}
      </MessageList>
      <div className="border-t">
        <form onSubmit={handleSubmit} className="container flex gap-2 py-4">
          <Input
            value={newMessageText}
            onChange={(event) => setNewMessageText(event.target.value)}
            placeholder="Write a message…"
          />
          <Button type="submit" disabled={newMessageText === ""}>
            Send
          </Button>
        </form>
      </div>
    </>
  );
});
